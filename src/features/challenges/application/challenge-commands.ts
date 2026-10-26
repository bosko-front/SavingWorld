import { capabilitiesFor, type Capabilities } from '@/core/access';
import { today, utcTimestamp, type Clock } from '@/core/calendar';
import { sumMinor, toMinorAmount } from '@/core/money';
import { err, type Result } from '@/core/result';
import { checkOperationId, executeCommand, reject, type CommandFailure, type OperationIdError } from '@/data/command';
import type { AppDatabase } from '@/data/db/database';
import type { SqlExecutor } from '@/data/db/sql';
import { isEntityId, type IdGenerator } from '@/data/ids';
import {
  CHALLENGE_RULE_IDS,
  getAttempt,
  insertAttempt,
  listAttemptsForGoal,
  listGoalsWithEndedWeeks,
  updateAttemptOutcome,
  type ChallengeRuleId,
} from '@/data/repositories/challenge-attempt-repository';
import { getGoal, isOpenStatus, type GoalRecord } from '@/data/repositories/goal-repository';
import { listEntriesForGoal } from '@/data/repositories/ledger-repository';
import { insertReceipt, lookupReceipt, requestHash } from '@/data/repositories/receipt-repository';
import { requireUsableGoal, type GoalAccessError } from '@/features/goals/application/goal-access';

import {
  outcomeChanged,
  planAttempt,
  settleAttempt,
  settledAttempts,
  type ChallengeEntry,
  type UnavailableReason,
} from '../domain/challenge-rules';

// Fixed challenge commands (v1.2 section 7, docs/DATA_MODEL.md "challenge_attempts"). Each runs on
// the serialized exclusive write path. Before deciding anything it settles the goal's attempts for
// the current instant (a week that ended becomes Not completed or Completed), so a decision never
// rests on a stale active attempt.
//
// - Start: the goal must exist and be open; the rule must be available (one unfinished attempt per
//   goal, First step once per goal, Next milestone below the target, Weekly step with a deadline
//   today or later, R > 0 and once per calendar week). The frozen target, milestone and saved week
//   come from the goal's committed values at this moment. A goal that is read-only after a lost Pro
//   entitlement, or a Garden goal without Pro, starts no quest (Phase 16): it could not progress.
//   The three quests themselves are identical in Free and Pro. Stable operation ID and receipt, so
//   a retry or a second tap never starts two.
// - Skip: the current attempt becomes historical Skipped; its history stays. Allowed on a read-only
//   goal too, so a quest never stays stuck. Stable operation ID.
// - Close ended weeks: the foreground reconciliation settles every Weekly step whose saved week has
//   ended. Idempotent; it writes nothing when nothing ended.
// - `reconcileGoalAttempts` runs inside each ledger create, correction and deletion, in the same
//   transaction as the entry change: results commit or roll back with it.
// No command creates, copies or links a ledger entry.

export const CHALLENGE_COMMAND_KINDS = {
  start: 'challenge.start',
  skip: 'challenge.skip',
} as const;

export type ChallengeCommandDeps = {
  db: AppDatabase;
  clock: Clock;
  ids: IdGenerator;
  // Free by default; the app passes the capabilities of the committed snapshot (Phase 16).
  capabilities?: Capabilities;
};

export type StartChallengeInput = { operationId: string; goalId: string; ruleId: ChallengeRuleId };

export type SkipChallengeInput = { operationId: string; attemptId: string };

export type ChallengeInputError = OperationIdError | { code: 'invalid_reference' } | { code: 'invalid_rule' };

export type ChallengeRuleError =
  | { code: 'operation_conflict' }
  | { code: 'goal_not_found' }
  | { code: 'goal_closed' }
  | GoalAccessError
  | { code: 'challenge_unavailable'; reason: UnavailableReason }
  | { code: 'attempt_not_found' }
  // The attempt already ended (Completed, Not completed or Skipped) before the skip arrived.
  | { code: 'attempt_not_active' };

export type ChallengeCommandError = CommandFailure<ChallengeInputError | ChallengeRuleError>;

export type ChallengeCommandResult = {
  operationId: string;
  // True when this operation ID had already committed; nothing new was written.
  replayed: boolean;
  goalId: string;
  attemptId: string;
};

type StoredChallengeResult = { goalId: string; attemptId: string };

function decodeStoredResult(value: unknown): StoredChallengeResult | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const { goalId, attemptId } = value as Partial<StoredChallengeResult>;
  return isEntityId(goalId) && isEntityId(attemptId) ? { goalId, attemptId } : null;
}

async function replayChallengeReceipt(
  tx: SqlExecutor,
  operationId: string,
  kind: string,
  hash: string,
): Promise<ChallengeCommandResult | null> {
  const receipt = await lookupReceipt(tx, operationId, kind, hash, decodeStoredResult);
  if (receipt.kind === 'conflict') {
    reject<ChallengeRuleError>({ code: 'operation_conflict' });
  }
  return receipt.kind === 'replay' ? { operationId, replayed: true, ...receipt.result } : null;
}

function checkedBalance(entries: readonly ChallengeEntry[]): number {
  const total = toMinorAmount(sumMinor(entries.map((entry) => entry.signedAmountMinor)));
  if (!total.ok) {
    throw new Error('Stored goal balance is out of range');
  }
  return total.value;
}

export type GoalAttemptsReconciliation = {
  // The attempt this change completed (active → Completed), if any. Phase 13 celebrates it once; a
  // historical result changed by a correction is never reported here.
  completedAttemptId: string | null;
};

// Recalculates every attempt of the goal from its saved entries (already including this
// transaction's change) and writes the outcomes that changed. Historical attempts stay historical.
export async function reconcileGoalAttempts(
  tx: SqlExecutor,
  goalId: string,
  entries: readonly ChallengeEntry[],
  nowUtc: string,
): Promise<GoalAttemptsReconciliation> {
  let completedAttemptId: string | null = null;
  for (const attempt of await listAttemptsForGoal(tx, goalId)) {
    const outcome = settleAttempt(attempt, entries, nowUtc);
    if (!outcomeChanged(attempt, outcome)) {
      continue;
    }
    await updateAttemptOutcome(tx, attempt.id, outcome);
    if (attempt.state === 'active' && outcome.result === 'completed') {
      completedAttemptId = attempt.id;
    }
  }
  return { completedAttemptId };
}

async function requireOpenGoal(tx: SqlExecutor, goalId: string): Promise<GoalRecord> {
  const goal = await getGoal(tx, goalId);
  if (!goal) {
    reject<ChallengeRuleError>({ code: 'goal_not_found' });
  }
  if (!isOpenStatus(goal.status)) {
    reject<ChallengeRuleError>({ code: 'goal_closed' });
  }
  return goal;
}

function isRuleId(value: unknown): value is ChallengeRuleId {
  return (CHALLENGE_RULE_IDS as readonly unknown[]).includes(value);
}

export async function startChallenge(
  deps: ChallengeCommandDeps,
  input: StartChallengeInput,
): Promise<Result<ChallengeCommandResult, ChallengeCommandError>> {
  const operationError = checkOperationId(input.operationId);
  if (operationError) {
    return err(operationError);
  }
  if (!isEntityId(input.goalId)) {
    return err({ code: 'invalid_reference' });
  }
  if (!isRuleId(input.ruleId)) {
    return err({ code: 'invalid_rule' });
  }
  const kind = CHALLENGE_COMMAND_KINDS.start;
  const hash = requestHash(kind, [input.goalId, input.ruleId]);

  return executeCommand(deps.db, async (tx) => {
    const replay = await replayChallengeReceipt(tx, input.operationId, kind, hash);
    if (replay) {
      return replay;
    }
    const goal = await requireOpenGoal(tx, input.goalId);
    await requireUsableGoal(tx, deps.capabilities ?? capabilitiesFor('free'), goal);
    // One reading of the clock for the whole decision: the same instant and zone give startedAt,
    // today and the saved week.
    const nowMs = deps.clock.nowMs();
    const timeZone = deps.clock.timeZone();
    const fixed: Clock = { nowMs: () => nowMs, timeZone: () => timeZone };
    const nowUtc = utcTimestamp(fixed);
    const entries = await listEntriesForGoal(tx, goal.id);
    await reconcileGoalAttempts(tx, goal.id, entries, nowUtc);
    const attempts = settledAttempts(await listAttemptsForGoal(tx, goal.id), entries, nowUtc);

    const planned = planAttempt(
      { id: deps.ids.newId(), goalId: goal.id, ruleId: input.ruleId, startedAtUtc: nowUtc, timeZone },
      { goal, balanceMinor: checkedBalance(entries), attempts, today: today(fixed) },
    );
    if (!planned.ok) {
      reject<ChallengeRuleError>({ code: 'challenge_unavailable', reason: planned.error });
    }
    await insertAttempt(tx, planned.value);
    const stored: StoredChallengeResult = { goalId: goal.id, attemptId: planned.value.id };
    await insertReceipt(tx, input.operationId, kind, hash, stored, nowUtc);
    return { operationId: input.operationId, replayed: false, ...stored };
  });
}

export async function skipChallenge(
  deps: Pick<ChallengeCommandDeps, 'db' | 'clock'>,
  input: SkipChallengeInput,
): Promise<Result<ChallengeCommandResult, ChallengeCommandError>> {
  const operationError = checkOperationId(input.operationId);
  if (operationError) {
    return err(operationError);
  }
  if (!isEntityId(input.attemptId)) {
    return err({ code: 'invalid_reference' });
  }
  const kind = CHALLENGE_COMMAND_KINDS.skip;
  const hash = requestHash(kind, [input.attemptId]);

  return executeCommand(deps.db, async (tx) => {
    const replay = await replayChallengeReceipt(tx, input.operationId, kind, hash);
    if (replay) {
      return replay;
    }
    const found = await getAttempt(tx, input.attemptId);
    if (!found) {
      reject<ChallengeRuleError>({ code: 'attempt_not_found' });
    }
    await requireOpenGoal(tx, found.goalId);
    const nowUtc = utcTimestamp(deps.clock);
    // A week that ended, or a target met, before the skip keeps that result.
    await reconcileGoalAttempts(tx, found.goalId, await listEntriesForGoal(tx, found.goalId), nowUtc);
    const attempt = await getAttempt(tx, input.attemptId);
    if (attempt?.state !== 'active') {
      reject<ChallengeRuleError>({ code: 'attempt_not_active' });
    }
    await updateAttemptOutcome(tx, attempt.id, { state: 'historical', result: 'skipped', historicalAtUtc: nowUtc });
    const stored: StoredChallengeResult = { goalId: attempt.goalId, attemptId: attempt.id };
    await insertReceipt(tx, input.operationId, kind, hash, stored, nowUtc);
    return { operationId: input.operationId, replayed: false, ...stored };
  });
}

// Settles every Weekly step whose saved week ended, on any goal (also a completed one, whose
// attempt can no longer change but should not stay current). Returns how many goals changed.
export async function closeEndedAttempts(
  deps: Pick<ChallengeCommandDeps, 'db' | 'clock'>,
): Promise<Result<{ goalsChanged: number }, CommandFailure<never>>> {
  const nowUtc = utcTimestamp(deps.clock);
  const ended = await deps.db.read((snapshot) => listGoalsWithEndedWeeks(snapshot, nowUtc));
  if (ended.length === 0) {
    return { ok: true, value: { goalsChanged: 0 } };
  }
  return executeCommand(deps.db, async (tx) => {
    let goalsChanged = 0;
    for (const goalId of await listGoalsWithEndedWeeks(tx, nowUtc)) {
      await reconcileGoalAttempts(tx, goalId, await listEntriesForGoal(tx, goalId), nowUtc);
      goalsChanged += 1;
    }
    return { goalsChanged };
  });
}
