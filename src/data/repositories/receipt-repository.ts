import { fnv1a64 } from '../db/hash';
import type { SqlExecutor } from '../db/sql';

import { rowReader } from './row-codec';

// Minimal replay receipts (docs/DATA_MODEL.md "operation_receipts"). A receipt is written in the same
// transaction as its command's effect and keeps only what a safe retry needs: the command kind, a
// fingerprint of the request and the resulting identifiers. It never stores amounts, notes or a
// previous entry version, and receipts are immutable.

export type ReceiptLookup<R> =
  | { kind: 'none' }
  | { kind: 'replay'; result: R }
  | { kind: 'conflict' };

// Stable fingerprint of a command request: kind plus its fields in a fixed order.
export function requestHash(commandKind: string, fields: readonly (string | number | boolean | null)[]): string {
  return fnv1a64(JSON.stringify([commandKind, ...fields]));
}

export async function lookupReceipt<R>(
  tx: SqlExecutor,
  operationId: string,
  commandKind: string,
  hash: string,
  decode: (value: unknown) => R | null,
): Promise<ReceiptLookup<R>> {
  const row = await tx.get('SELECT command_kind, request_hash, result_json FROM operation_receipts WHERE operation_id = ?', [
    operationId,
  ]);
  if (!row) {
    return { kind: 'none' };
  }
  const r = rowReader('operation_receipts', row);
  if (r.text('command_kind') !== commandKind || r.text('request_hash') !== hash) {
    return { kind: 'conflict' };
  }
  const result = decode(JSON.parse(r.text('result_json')));
  if (result === null) {
    throw new Error('Unreadable operation receipt result');
  }
  return { kind: 'replay', result };
}

export async function insertReceipt(
  tx: SqlExecutor,
  operationId: string,
  commandKind: string,
  hash: string,
  result: unknown,
  nowUtc: string,
): Promise<void> {
  await tx.run(
    'INSERT INTO operation_receipts (operation_id, command_kind, request_hash, result_json, created_at_utc) VALUES (?, ?, ?, ?, ?)',
    [operationId, commandKind, hash, JSON.stringify(result), nowUtc],
  );
}
