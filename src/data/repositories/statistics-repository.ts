import type { CivilDate } from '@/core/calendar';

import type { SqlExecutor } from '../db/sql';

import { rowReader } from './row-codec';

// Aggregate reads for the four Pro statistics (Phase 18, docs/DATA_MODEL.md "Four Pro statistics").
// Every query reads current committed rows only: there is no snapshot table, a deleted goal's entries
// are gone (D74) and souvenirs are not read. SQLite sums stay per goal, because every chronological
// running balance of one goal is within 0..MAX_MINOR (candidate-history rule), so each per-goal sum is
// a checked stored-range amount; the all-goal sums are BigInt in the statistics domain.

// Goals in any status, and those whose current status is completed (never the souvenir count).
export async function readGoalCounts(executor: SqlExecutor): Promise<{ goalCount: number; completedGoalCount: number }> {
  const row = await executor.get(
    "SELECT count(*) AS goal_count, coalesce(sum(status = 'completed'), 0) AS completed_count FROM goals",
  );
  const r = rowReader('goals', row ?? {});
  return { goalCount: r.integer('goal_count'), completedGoalCount: r.integer('completed_count') };
}

// One sum per goal that has entries: every entry, or only those dated before `before`. A goal's
// sum before a date is its running balance at the end of the previous date.
export async function listGoalLedgerSums(executor: SqlExecutor, before: CivilDate | null = null): Promise<number[]> {
  const rows = await executor.all(
    before === null
      ? 'SELECT goal_id, sum(signed_amount_minor) AS amount FROM ledger_entries GROUP BY goal_id'
      : 'SELECT goal_id, sum(signed_amount_minor) AS amount FROM ledger_entries WHERE entry_date < ? GROUP BY goal_id',
    before === null ? [] : [before],
  );
  return rows.map((row) => rowReader('ledger_entries', row).minor('amount'));
}

// Every entry dated on or after `from`, across all goals, chronologically (date, createdAt, id).
export async function listDatedAmountsFrom(
  executor: SqlExecutor,
  from: CivilDate,
): Promise<{ entryDate: CivilDate; signedAmountMinor: number }[]> {
  const rows = await executor.all(
    'SELECT entry_date, signed_amount_minor FROM ledger_entries WHERE entry_date >= ? ORDER BY entry_date, created_at_utc, id',
    [from],
  );
  return rows.map((row) => {
    const r = rowReader('ledger_entries', row);
    return { entryDate: r.civilDate('entry_date'), signedAmountMinor: r.minor('signed_amount_minor') };
  });
}
