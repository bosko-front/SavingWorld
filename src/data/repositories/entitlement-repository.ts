import type { SqlExecutor, SqlRow } from '../db/sql';

import { CorruptRowError, rowReader } from './row-codec';

// Storage of the Pro entitlement snapshot and of processed store transactions (schema 5,
// docs/DATA_MODEL.md "entitlement_cache and purchase_events"). Only the billing reconciler writes
// here. Nothing in this module reads or writes goals, entries, souvenirs or theme choices.

export const ENTITLEMENT_TABLE = 'entitlement_cache';
export const PURCHASE_EVENTS_TABLE = 'purchase_events';

const STATUSES = ['verified', 'not_owned', 'revoked', 'unknown'] as const;

export type StoredEntitlementStatus = (typeof STATUSES)[number];

export type EntitlementRecord = {
  productId: string;
  status: StoredEntitlementStatus;
  transactionId: string | null;
  verifiedAtUtc: string | null;
  lastAttemptAtUtc: string;
  lastErrorCode: string | null;
  revision: number;
};

export type PurchaseEventRecord = {
  transactionId: string;
  productId: string;
  processedAtUtc: string;
  finishedAtUtc: string | null;
  revokedAtUtc: string | null;
};

const ENTITLEMENT_COLUMNS =
  'product_id, status, native_transaction_id, verified_at_utc, last_attempt_at_utc, last_error_code, revision';
const EVENT_COLUMNS = 'native_transaction_id, product_id, processed_at_utc, finished_at_utc, revoked_at_utc';

function decodeEntitlement(row: SqlRow): EntitlementRecord {
  const r = rowReader(ENTITLEMENT_TABLE, row);
  const revision = r.integer('revision');
  if (revision < 1) {
    throw new CorruptRowError(ENTITLEMENT_TABLE, 'revision');
  }
  return {
    productId: r.text('product_id'),
    status: r.oneOf('status', STATUSES),
    transactionId: r.optionalText('native_transaction_id'),
    verifiedAtUtc: r.optionalText('verified_at_utc'),
    lastAttemptAtUtc: r.text('last_attempt_at_utc'),
    lastErrorCode: r.optionalText('last_error_code'),
    revision,
  };
}

function decodeEvent(row: SqlRow): PurchaseEventRecord {
  const r = rowReader(PURCHASE_EVENTS_TABLE, row);
  return {
    transactionId: r.text('native_transaction_id'),
    productId: r.text('product_id'),
    processedAtUtc: r.text('processed_at_utc'),
    finishedAtUtc: r.optionalText('finished_at_utc'),
    revokedAtUtc: r.optionalText('revoked_at_utc'),
  };
}

export async function readEntitlement(executor: SqlExecutor, productId: string): Promise<EntitlementRecord | null> {
  const row = await executor.get(`SELECT ${ENTITLEMENT_COLUMNS} FROM ${ENTITLEMENT_TABLE} WHERE product_id = ?`, [productId]);
  return row ? decodeEntitlement(row) : null;
}

// Inserts the first snapshot (revision 1) or replaces the one at `record.revision - 1`. A stale
// revision changes nothing and returns false, so two overlapping checks cannot overwrite each other.
export async function writeEntitlement(tx: SqlExecutor, record: EntitlementRecord): Promise<boolean> {
  const params = [
    record.status,
    record.transactionId,
    record.verifiedAtUtc,
    record.lastAttemptAtUtc,
    record.lastErrorCode,
    record.revision,
  ];
  if (record.revision === 1) {
    const result = await tx.run(
      `INSERT INTO ${ENTITLEMENT_TABLE} (${ENTITLEMENT_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (product_id) DO NOTHING`,
      [record.productId, ...params],
    );
    return result.changes === 1;
  }
  const result = await tx.run(
    `UPDATE ${ENTITLEMENT_TABLE}
        SET status = ?, native_transaction_id = ?, verified_at_utc = ?, last_attempt_at_utc = ?,
            last_error_code = ?, revision = ?
      WHERE product_id = ? AND revision = ?`,
    [...params, record.productId, record.revision - 1],
  );
  return result.changes === 1;
}

export async function getPurchaseEvent(executor: SqlExecutor, transactionId: string): Promise<PurchaseEventRecord | null> {
  const row = await executor.get(`SELECT ${EVENT_COLUMNS} FROM ${PURCHASE_EVENTS_TABLE} WHERE native_transaction_id = ?`, [
    transactionId,
  ]);
  return row ? decodeEvent(row) : null;
}

// Records a verified transaction once. A replayed delivery keeps the first row (and its processing
// time); returns whether this call inserted it.
export async function recordPurchaseEvent(
  tx: SqlExecutor,
  event: { transactionId: string; productId: string; processedAtUtc: string; revokedAtUtc: string | null },
): Promise<boolean> {
  const inserted = await tx.run(
    `INSERT INTO ${PURCHASE_EVENTS_TABLE} (native_transaction_id, product_id, verification_state, processed_at_utc, revoked_at_utc)
     VALUES (?, ?, 'verified', ?, ?)
     ON CONFLICT (native_transaction_id) DO NOTHING`,
    [event.transactionId, event.productId, event.processedAtUtc, event.revokedAtUtc],
  );
  if (inserted.changes === 0 && event.revokedAtUtc !== null) {
    await markPurchaseEventRevoked(tx, event.transactionId, event.revokedAtUtc);
  }
  return inserted.changes === 1;
}

// A verified refund/revocation of a transaction processed earlier. The first revocation time is
// kept; a transaction never processed here (for example one restored on a new install) has no row.
export async function markPurchaseEventRevoked(tx: SqlExecutor, transactionId: string, revokedAtUtc: string): Promise<void> {
  await tx.run(
    `UPDATE ${PURCHASE_EVENTS_TABLE} SET revoked_at_utc = ? WHERE native_transaction_id = ? AND revoked_at_utc IS NULL`,
    [revokedAtUtc, transactionId],
  );
}

// After StoreKit finished the transaction. The first finish time is kept.
export async function markPurchaseEventFinished(tx: SqlExecutor, transactionId: string, finishedAtUtc: string): Promise<void> {
  await tx.run(
    `UPDATE ${PURCHASE_EVENTS_TABLE} SET finished_at_utc = ? WHERE native_transaction_id = ? AND finished_at_utc IS NULL`,
    [finishedAtUtc, transactionId],
  );
}

// Newest first (processing time, then ID).
export async function listPurchaseEvents(executor: SqlExecutor): Promise<PurchaseEventRecord[]> {
  const rows = await executor.all(
    `SELECT ${EVENT_COLUMNS} FROM ${PURCHASE_EVENTS_TABLE} ORDER BY processed_at_utc DESC, native_transaction_id DESC`,
  );
  return rows.map(decodeEvent);
}
