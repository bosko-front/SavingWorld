import type { CivilDate } from '@/core/calendar';
import { THEME_IDS, type ThemeId } from '@/core/progression';

import type { SqlExecutor, SqlRow } from '../db/sql';

import { CorruptRowError, rowReader } from './row-codec';

// SQLite goal adapter (docs/DATA_MODEL.md "goals"). Goals start at zero and have no balance,
// currency or exponent column: the balance is always recomputed from ledger_entries. A goal is
// deleted only by the confirmed `deleteGoal` command (D74), after its entries and souvenir.

// Archive was removed by owner decision D74. Schema 1's CHECK still accepts the legacy 'archived'
// value, but migration 2 converted any such row and no code writes it, so reading one is corruption.
export const GOAL_STATUSES = ['active', 'paused', 'completed'] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

// active and paused are open: they accept entries. completed is closed and read-only until Reopen.
export const OPEN_GOAL_STATUSES: readonly GoalStatus[] = ['active', 'paused'];

export function isOpenStatus(status: GoalStatus): boolean {
  return OPEN_GOAL_STATUSES.includes(status);
}

export type GoalRecord = {
  id: string;
  title: string;
  targetMinor: number;
  deadlineDate: CivilDate | null;
  themeId: ThemeId;
  status: GoalStatus;
  createdAtUtc: string;
  updatedAtUtc: string;
  revision: number;
};

export type GoalSummary = { goal: GoalRecord; balanceMinor: number; entryCount: number };

const GOAL_COLUMNS = 'id, title, target_minor, deadline_date, theme_id, status, created_at_utc, updated_at_utc, revision';

function decodeGoal(row: SqlRow): GoalRecord {
  const r = rowReader('goals', row);
  const targetMinor = r.minor('target_minor');
  if (targetMinor <= 0) {
    throw new CorruptRowError('goals', 'target_minor');
  }
  return {
    id: r.text('id'),
    title: r.text('title'),
    targetMinor,
    deadlineDate: r.optionalCivilDate('deadline_date'),
    themeId: r.oneOf('theme_id', THEME_IDS),
    status: r.oneOf('status', GOAL_STATUSES),
    createdAtUtc: r.text('created_at_utc'),
    updatedAtUtc: r.text('updated_at_utc'),
    revision: r.integer('revision'),
  };
}

export async function insertGoal(tx: SqlExecutor, goal: GoalRecord): Promise<void> {
  await tx.run(
    `INSERT INTO goals (${GOAL_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      goal.id,
      goal.title,
      goal.targetMinor,
      goal.deadlineDate,
      goal.themeId,
      goal.status,
      goal.createdAtUtc,
      goal.updatedAtUtc,
      goal.revision,
    ],
  );
}

export async function getGoal(executor: SqlExecutor, id: string): Promise<GoalRecord | null> {
  const row = await executor.get(`SELECT ${GOAL_COLUMNS} FROM goals WHERE id = ?`, [id]);
  return row ? decodeGoal(row) : null;
}

// Every goal in any status: the number the Free goal limit counts (D74).
export async function countGoals(executor: SqlExecutor): Promise<number> {
  const row = await executor.get<{ count: unknown }>('SELECT count(*) AS count FROM goals');
  return rowReader('goals', row ?? {}).integer('count');
}

// Removes the goal row inside the caller's transaction; its ledger entries and souvenir must be
// deleted first (foreign keys). Returns false when the row is missing or changed since
// `expectedRevision`.
export async function deleteGoalRow(tx: SqlExecutor, id: string, expectedRevision: number): Promise<boolean> {
  const result = await tx.run('DELETE FROM goals WHERE id = ? AND revision = ?', [id, expectedRevision]);
  return result.changes === 1;
}

// Every goal with its balance recomputed from the ledger, oldest first.
export async function listGoalSummaries(executor: SqlExecutor): Promise<GoalSummary[]> {
  const rows = await executor.all(
    `SELECT g.id, g.title, g.target_minor, g.deadline_date, g.theme_id, g.status, g.created_at_utc,
            g.updated_at_utc, g.revision,
            coalesce(sum(e.signed_amount_minor), 0) AS balance_minor, count(e.id) AS entry_count
       FROM goals g LEFT JOIN ledger_entries e ON e.goal_id = g.id
      GROUP BY g.id
      ORDER BY g.created_at_utc, g.id`,
  );
  return rows.map((row) => {
    const r = rowReader('goals', row);
    return { goal: decodeGoal(row), balanceMinor: r.minor('balance_minor'), entryCount: r.integer('entry_count') };
  });
}

// Revision-checked status change inside the caller's transaction. Returns false when the row is
// missing or was changed since `expectedRevision` was read. Lifecycle rules (Pause/Resume, Finish,
// Reopen with the goal-limit check) are Phase 06 commands built on this.
export async function updateGoalStatus(
  tx: SqlExecutor,
  id: string,
  status: GoalStatus,
  expectedRevision: number,
  nowUtc: string,
): Promise<boolean> {
  const result = await tx.run(
    'UPDATE goals SET status = ?, updated_at_utc = ?, revision = revision + 1 WHERE id = ? AND revision = ?',
    [status, nowUtc, id, expectedRevision],
  );
  return result.changes === 1;
}

export type GoalDetails = {
  title: string;
  targetMinor: number;
  deadlineDate: CivilDate | null;
  themeId: ThemeId;
};

// Revision-checked Edit Goal write inside the caller's transaction. Returns false when the row is
// missing or changed since `expectedRevision`. The command applies the open-goal guard first.
export async function updateGoalDetails(
  tx: SqlExecutor,
  id: string,
  details: GoalDetails,
  expectedRevision: number,
  nowUtc: string,
): Promise<boolean> {
  const result = await tx.run(
    `UPDATE goals SET title = ?, target_minor = ?, deadline_date = ?, theme_id = ?, updated_at_utc = ?, revision = revision + 1
      WHERE id = ? AND revision = ?`,
    [details.title, details.targetMinor, details.deadlineDate, details.themeId, nowUtc, id, expectedRevision],
  );
  return result.changes === 1;
}

// Every goal row, oldest first (created_at, id).
export async function listGoals(executor: SqlExecutor): Promise<GoalRecord[]> {
  const rows = await executor.all(`SELECT ${GOAL_COLUMNS} FROM goals ORDER BY created_at_utc, id`);
  return rows.map(decodeGoal);
}

// Target rewrite used only by the global currency change, which runs while no goal has a
// transaction (docs/DATA_MODEL.md "Global currency lock"). Closed goals are included: the target
// is reinterpreted for the new currency, not edited by the person.
export async function updateGoalTarget(
  tx: SqlExecutor,
  id: string,
  targetMinor: number,
  expectedRevision: number,
  nowUtc: string,
): Promise<boolean> {
  const result = await tx.run(
    'UPDATE goals SET target_minor = ?, updated_at_utc = ?, revision = revision + 1 WHERE id = ? AND revision = ?',
    [targetMinor, nowUtc, id, expectedRevision],
  );
  return result.changes === 1;
}
