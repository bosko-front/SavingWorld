import type { CivilDate } from '@/core/calendar';
import { isPositiveMinorAmount } from '@/core/money';

import type { SqlExecutor, SqlRow } from '../db/sql';

import { CorruptRowError, rowReader } from './row-codec';

// SQLite adapter for fixed challenge attempts (docs/DATA_MODEL.md "challenge_attempts", schema 4).
// An attempt keeps its frozen contract and its outcome only. Its progress is never stored: the
// challenge engine recalculates it from the goal's saved entries, so no entry is linked, copied or
// booked twice. Only the engine's outcome update and the D74 goal deletion change rows here.

export const CHALLENGE_ATTEMPTS_TABLE = 'challenge_attempts';

// The fixed catalog of v1.2 section 7, in its order. There is no custom rule.
export const CHALLENGE_RULE_IDS = ['first_step', 'next_milestone', 'weekly_step'] as const;
export type ChallengeRuleId = (typeof CHALLENGE_RULE_IDS)[number];

export const ATTEMPT_STATES = ['active', 'historical'] as const;
export type AttemptState = (typeof ATTEMPT_STATES)[number];

export const ATTEMPT_RESULTS = ['completed', 'not_completed', 'skipped'] as const;
export type AttemptResult = (typeof ATTEMPT_RESULTS)[number];

export type ChallengeAttemptRecord = {
  id: string;
  goalId: string;
  ruleId: ChallengeRuleId;
  // Frozen at start: the net amount Next milestone and Weekly step need; null for First step.
  targetMinor: number | null;
  // Next milestone only: the stage (1..10) it aims at, frozen at start.
  milestoneStage: number | null;
  startedAtUtc: string;
  // The local civil date at start, in `periodTimezone`.
  startDate: CivilDate;
  // Weekly step only: the saved week's Monday and Sunday, and the instant that Sunday ends in
  // `periodTimezone`. Travel or a zone change never moves them.
  weekStartDate: CivilDate | null;
  periodEndDate: CivilDate | null;
  periodEndAtUtc: string | null;
  periodTimezone: string;
  state: AttemptState;
  // null while active.
  result: AttemptResult | null;
  // When the attempt stopped being the current one; null while active.
  historicalAtUtc: string | null;
};

export type AttemptOutcome = Pick<ChallengeAttemptRecord, 'state' | 'result' | 'historicalAtUtc'>;

const COLUMNS =
  'id, goal_id, rule_id, target_minor, milestone_stage, started_at_utc, start_date, week_start_date, period_end_date, ' +
  'period_end_at_utc, period_timezone, state, result, historical_at_utc';

function decodeAttempt(row: SqlRow): ChallengeAttemptRecord {
  const r = rowReader(CHALLENGE_ATTEMPTS_TABLE, row);
  const targetMinor = row.target_minor === null ? null : r.minor('target_minor');
  if (targetMinor !== null && !isPositiveMinorAmount(targetMinor)) {
    throw new CorruptRowError(CHALLENGE_ATTEMPTS_TABLE, 'target_minor');
  }
  const milestoneStage = row.milestone_stage === null ? null : r.integer('milestone_stage');
  if (milestoneStage !== null && (milestoneStage < 1 || milestoneStage > 10)) {
    throw new CorruptRowError(CHALLENGE_ATTEMPTS_TABLE, 'milestone_stage');
  }
  const state = r.oneOf('state', ATTEMPT_STATES);
  const result = row.result === null ? null : r.oneOf('result', ATTEMPT_RESULTS);
  const historicalAtUtc = r.optionalText('historical_at_utc');
  if ((state === 'active') !== (result === null) || (state === 'active') !== (historicalAtUtc === null)) {
    throw new CorruptRowError(CHALLENGE_ATTEMPTS_TABLE, 'state');
  }
  return {
    id: r.text('id'),
    goalId: r.text('goal_id'),
    ruleId: r.oneOf('rule_id', CHALLENGE_RULE_IDS),
    targetMinor,
    milestoneStage,
    startedAtUtc: r.text('started_at_utc'),
    startDate: r.civilDate('start_date'),
    weekStartDate: r.optionalCivilDate('week_start_date'),
    periodEndDate: r.optionalCivilDate('period_end_date'),
    periodEndAtUtc: r.optionalText('period_end_at_utc'),
    periodTimezone: r.text('period_timezone'),
    state,
    result,
    historicalAtUtc,
  };
}

// A goal's attempts, oldest first (started time, then id).
export async function listAttemptsForGoal(executor: SqlExecutor, goalId: string): Promise<ChallengeAttemptRecord[]> {
  const rows = await executor.all(
    `SELECT ${COLUMNS} FROM ${CHALLENGE_ATTEMPTS_TABLE} WHERE goal_id = ? ORDER BY started_at_utc, id`,
    [goalId],
  );
  return rows.map(decodeAttempt);
}

export async function getAttempt(executor: SqlExecutor, id: string): Promise<ChallengeAttemptRecord | null> {
  const row = await executor.get(`SELECT ${COLUMNS} FROM ${CHALLENGE_ATTEMPTS_TABLE} WHERE id = ?`, [id]);
  return row ? decodeAttempt(row) : null;
}

// Goals whose current Weekly step week ended at or before `nowUtc` and is still marked active.
export async function listGoalsWithEndedWeeks(executor: SqlExecutor, nowUtc: string): Promise<string[]> {
  const rows = await executor.all<{ goal_id: string }>(
    `SELECT goal_id FROM ${CHALLENGE_ATTEMPTS_TABLE}
      WHERE state = 'active' AND period_end_at_utc IS NOT NULL AND period_end_at_utc <= ?
      ORDER BY goal_id`,
    [nowUtc],
  );
  return rows.map((row) => rowReader(CHALLENGE_ATTEMPTS_TABLE, row).text('goal_id'));
}

export async function insertAttempt(tx: SqlExecutor, attempt: ChallengeAttemptRecord): Promise<void> {
  await tx.run(`INSERT INTO ${CHALLENGE_ATTEMPTS_TABLE} (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    attempt.id,
    attempt.goalId,
    attempt.ruleId,
    attempt.targetMinor,
    attempt.milestoneStage,
    attempt.startedAtUtc,
    attempt.startDate,
    attempt.weekStartDate,
    attempt.periodEndDate,
    attempt.periodEndAtUtc,
    attempt.periodTimezone,
    attempt.state,
    attempt.result,
    attempt.historicalAtUtc,
  ]);
}

// Writes a recalculated outcome. The schema refuses a historical attempt becoming active again,
// a changed end time and any change to or from skipped.
export async function updateAttemptOutcome(tx: SqlExecutor, id: string, outcome: AttemptOutcome): Promise<void> {
  const { changes } = await tx.run(
    `UPDATE ${CHALLENGE_ATTEMPTS_TABLE} SET state = ?, result = ?, historical_at_utc = ? WHERE id = ?`,
    [outcome.state, outcome.result, outcome.historicalAtUtc, id],
  );
  if (changes !== 1) {
    throw new Error('Challenge attempt disappeared inside its transaction');
  }
}

// Only inside the goal deletion transaction (owner decision D74), before the goal row.
export async function deleteAttemptsForGoal(tx: SqlExecutor, goalId: string): Promise<void> {
  await tx.run(`DELETE FROM ${CHALLENGE_ATTEMPTS_TABLE} WHERE goal_id = ?`, [goalId]);
}
