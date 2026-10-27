import type { CivilDate } from '@/core/calendar';

import type { SqlExecutor, SqlRow } from '../db/sql';

import { CorruptRowError, rowReader } from './row-codec';

// SQLite ledger adapter (docs/DATA_MODEL.md "ledger_entries"). An entry stores only its current
// values: a correction overwrites them (created_at_utc stays), a confirmed deletion removes the row.
// No revision table, no previous-entry snapshot. `revision` only protects against stale edits.
// Currency is global (settings); entries have no currency column.

export type LedgerEntryRecord = {
  id: string;
  goalId: string;
  signedAmountMinor: number;
  entryDate: CivilDate;
  note: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  revision: number;
};

const ENTRY_COLUMNS = 'id, goal_id, signed_amount_minor, entry_date, note, created_at_utc, updated_at_utc, revision';

// The chronological order used for every running-balance check (v1.2 section 3).
export const CHRONOLOGICAL_ORDER = 'entry_date, created_at_utc, id';

function decodeEntry(row: SqlRow): LedgerEntryRecord {
  const r = rowReader('ledger_entries', row);
  const signedAmountMinor = r.minor('signed_amount_minor');
  if (signedAmountMinor === 0) {
    throw new CorruptRowError('ledger_entries', 'signed_amount_minor');
  }
  return {
    id: r.text('id'),
    goalId: r.text('goal_id'),
    signedAmountMinor,
    entryDate: r.civilDate('entry_date'),
    note: r.optionalText('note'),
    createdAtUtc: r.text('created_at_utc'),
    updatedAtUtc: r.text('updated_at_utc'),
    revision: r.integer('revision'),
  };
}

export async function getEntry(executor: SqlExecutor, id: string): Promise<LedgerEntryRecord | null> {
  const row = await executor.get(`SELECT ${ENTRY_COLUMNS} FROM ledger_entries WHERE id = ?`, [id]);
  return row ? decodeEntry(row) : null;
}

// A goal's entries in chronological order (date, createdAt, id).
export async function listEntriesForGoal(executor: SqlExecutor, goalId: string): Promise<LedgerEntryRecord[]> {
  const rows = await executor.all(
    `SELECT ${ENTRY_COLUMNS} FROM ledger_entries WHERE goal_id = ? ORDER BY ${CHRONOLOGICAL_ORDER}`,
    [goalId],
  );
  return rows.map(decodeEntry);
}

// The newest `limit` entries of one goal, newest first: the exact reverse of the chronological order
// (Phase 21: History shows a bounded page instead of every row; the goal index serves the reverse
// scan).
export async function listNewestEntriesForGoal(executor: SqlExecutor, goalId: string, limit: number): Promise<LedgerEntryRecord[]> {
  const rows = await executor.all(
    `SELECT ${ENTRY_COLUMNS} FROM ledger_entries WHERE goal_id = ? ORDER BY entry_date DESC, created_at_utc DESC, id DESC LIMIT ?`,
    [goalId, limit],
  );
  return rows.map(decodeEntry);
}

// How many entries one goal has and their sum. Every chronological running balance of a goal stays
// within 0..MAX_MINOR (candidate-history rule), so the sum is a checked stored-range amount.
export async function goalLedgerTotals(executor: SqlExecutor, goalId: string): Promise<{ entryCount: number; sumMinor: number }> {
  const row = await executor.get(
    'SELECT count(*) AS entry_count, coalesce(sum(signed_amount_minor), 0) AS amount FROM ledger_entries WHERE goal_id = ?',
    [goalId],
  );
  const r = rowReader('ledger_entries', row ?? {});
  return { entryCount: r.integer('entry_count'), sumMinor: r.minor('amount') };
}

export async function countEntries(executor: SqlExecutor): Promise<number> {
  const row = await executor.get('SELECT count(*) AS count FROM ledger_entries');
  return rowReader('ledger_entries', row ?? {}).integer('count');
}

export async function insertEntry(tx: SqlExecutor, entry: LedgerEntryRecord): Promise<void> {
  await tx.run(`INSERT INTO ledger_entries (${ENTRY_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
    entry.id,
    entry.goalId,
    entry.signedAmountMinor,
    entry.entryDate,
    entry.note,
    entry.createdAtUtc,
    entry.updatedAtUtc,
    entry.revision,
  ]);
}

export type EntryCorrection = {
  signedAmountMinor: number;
  entryDate: CivilDate;
  note: string | null;
};

// Overwrites the current values when the row still has `expectedRevision`. created_at_utc and
// goal_id are not part of the statement (and the schema rejects changing them).
export async function updateEntry(
  tx: SqlExecutor,
  id: string,
  expectedRevision: number,
  correction: EntryCorrection,
  nowUtc: string,
): Promise<boolean> {
  const result = await tx.run(
    `UPDATE ledger_entries
        SET signed_amount_minor = ?, entry_date = ?, note = ?, updated_at_utc = ?, revision = revision + 1
      WHERE id = ? AND revision = ?`,
    [correction.signedAmountMinor, correction.entryDate, correction.note, nowUtc, id, expectedRevision],
  );
  return result.changes === 1;
}

export async function deleteEntry(tx: SqlExecutor, id: string, expectedRevision: number): Promise<boolean> {
  const result = await tx.run('DELETE FROM ledger_entries WHERE id = ? AND revision = ?', [id, expectedRevision]);
  return result.changes === 1;
}

// Every entry of one goal, inside the goal deletion transaction (owner decision D74). The schema's
// closed-goal triggers refuse this for a completed goal, so the command reopens the row first in the
// same transaction.
export async function deleteEntriesForGoal(tx: SqlExecutor, goalId: string): Promise<void> {
  await tx.run('DELETE FROM ledger_entries WHERE goal_id = ?', [goalId]);
}
