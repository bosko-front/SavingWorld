import { capabilitiesFor, canUseTheme, hasGoalSlot, withinGoalLimit, type Capabilities } from '@/core/access';
import { parseCivilDate, today, utcTimestamp, validateNewDeadline, type CivilDate, type Clock } from '@/core/calendar';
import { isPositiveMinorAmount, sumMinor } from '@/core/money';
import { isThemeId, type ThemeId } from '@/core/progression';
import { err, ok, type Result } from '@/core/result';
import { normalizeUserText } from '@/core/text';
import { checkOperationId, executeCommand, reject, type CommandFailure, type OperationIdError } from '@/data/command';
import type { AppDatabase } from '@/data/db/database';
import type { SqlExecutor } from '@/data/db/sql';
import { isEntityId, type IdGenerator } from '@/data/ids';
import { deleteCollectiblesForGoal } from '@/data/repositories/collectible-repository';
import {
  countGoals,
  deleteGoalRow,
  getGoal,
  insertGoal,
  isOpenStatus,
  updateGoalDetails,
  updateGoalStatus,
  type GoalRecord,
  type GoalStatus,
} from '@/data/repositories/goal-repository';
import { deleteEntriesForGoal, listEntriesForGoal } from '@/data/repositories/ledger-repository';
import { insertReceipt, lookupReceipt, requestHash } from '@/data/repositories/receipt-repository';
import { readCurrency } from '@/data/repositories/settings-repository';

import { lifecycleTarget, needsFunding, needsGoalLimit, type LifecycleAction } from '../domain/goal-lifecycle';

// Goal commands (v1.2 sections 2-3, docs/DATA_MODEL.md "goals"). Each one validates its input, then
// runs on the single serialized exclusive write path with a stable operation ID, a row revision
// check where it changes an existing goal, and an identifiers-only receipt.
//
// - Create Goal: free title, target > 0, optional deadline today or later, an available theme. No
//   currency field: the goal uses the global Settings currency, which must exist. Every goal starts
//   at zero (no opening balance) as active, after the goal-limit check (Free: one goal in any
//   status, D74) in the same transaction.
// - Edit Goal: the same fields on an open (active or paused) goal only. A changed deadline must be
//   today or later; an unchanged one may already have passed. Changing the theme of an open goal
//   is a Pro capability (Phase 17 adds Garden).
// - Lifecycle: Pause, Resume, Finish (only when B ≥ T) and Reopen (within the goal limit, never an
//   automatic Finish). Archive was removed (D74).
// - Delete Goal (D74): any goal, after the screen's confirmation; removes its entries, its souvenir
//   and the goal in one transaction. Nothing keeps a copy.

export const TITLE_MAX_LENGTH = 100;

export const GOAL_COMMAND_KINDS = {
  create: 'goal.create',
  edit: 'goal.edit',
  pause: 'goal.pause',
  resume: 'goal.resume',
  finish: 'goal.finish',
  reopen: 'goal.reopen',
  delete: 'goal.delete',
} as const satisfies Record<'create' | 'edit' | 'delete' | LifecycleAction, string>;

export type GoalCommandDeps = {
  db: AppDatabase;
  clock: Clock;
  ids: IdGenerator;
  // Free by default; only a verified entitlement (Phase 15) supplies Pro.
  capabilities?: Capabilities;
};

// The editable fields shared by Create and Edit.
export type GoalFieldsInput = {
  title: string;
  // Positive minor units from parseAmount with the global currency's exponent.
  targetMinor: number;
  // Local civil date YYYY-MM-DD or null for no deadline.
  deadlineDate: string | null;
  themeId: ThemeId;
};

export type CreateGoalInput = GoalFieldsInput & { operationId: string };

export type EditGoalInput = GoalFieldsInput & {
  operationId: string;
  goalId: string;
  // The goal revision the person was looking at when they opened the form.
  expectedRevision: number;
};

export type LifecycleInput = { operationId: string; goalId: string; expectedRevision: number };

export type GoalFieldError =
  | { code: 'title_empty' }
  | { code: 'title_too_long' }
  | { code: 'title_invalid' }
  | { code: 'invalid_target' }
  | { code: 'invalid_deadline' }
  | { code: 'past_deadline' }
  | { code: 'invalid_theme' }
  | { code: 'theme_unavailable' };

export type CreateGoalError = CommandFailure<
  | OperationIdError
  | GoalFieldError
  | { code: 'operation_conflict' }
  | { code: 'currency_missing' }
  | { code: 'currency_invalid' }
  | { code: 'goal_limit' }
>;

export type ExistingGoalError =
  | { code: 'invalid_reference' }
  | { code: 'operation_conflict' }
  | { code: 'goal_not_found' }
  | { code: 'stale_goal'; currentRevision: number };

export type EditGoalError = CommandFailure<
  | OperationIdError
  | GoalFieldError
  | ExistingGoalError
  | { code: 'currency_missing' }
  | { code: 'currency_invalid' }
  | { code: 'goal_closed' }
>;

export type LifecycleError = CommandFailure<
  | OperationIdError
  | ExistingGoalError
  | { code: 'invalid_transition'; status: GoalStatus }
  | { code: 'goal_limit' }
  | { code: 'not_funded' }
>;

export type DeleteGoalInput = LifecycleInput;

export type DeleteGoalError = CommandFailure<OperationIdError | ExistingGoalError>;

export type GoalCommandResult = { operationId: string; replayed: boolean; goalId: string; revision: number };

export type CreateGoalResult = GoalCommandResult;

type StoredGoalResult = { goalId: string; revision: number };

function decodeStoredResult(value: unknown): StoredGoalResult | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const { goalId, revision } = value as Partial<StoredGoalResult>;
  return isEntityId(goalId) && typeof revision === 'number' && Number.isSafeInteger(revision) ? { goalId, revision } : null;
}

type ValidFields = { title: string; targetMinor: number; deadlineDate: CivilDate | null; themeId: ThemeId };

// Field checks that need no stored data. Deadline "today or later" depends on whether the date
// changed, so the caller decides that with `today`.
function validateFields(input: GoalFieldsInput): Result<ValidFields, GoalFieldError> {
  const title = normalizeUserText(input.title, { maxLength: TITLE_MAX_LENGTH, allowLineBreaks: false });
  if (!title.ok) {
    const code = title.error === 'empty' ? 'title_empty' : title.error === 'too_long' ? 'title_too_long' : 'title_invalid';
    return err({ code });
  }
  if (!isPositiveMinorAmount(input.targetMinor)) {
    return err({ code: 'invalid_target' });
  }
  let deadlineDate: CivilDate | null = null;
  if (input.deadlineDate !== null) {
    const parsed = parseCivilDate(input.deadlineDate);
    if (!parsed.ok) {
      return err({ code: 'invalid_deadline' });
    }
    deadlineDate = parsed.value;
  }
  if (!isThemeId(input.themeId)) {
    return err({ code: 'invalid_theme' });
  }
  return ok({ title: title.value, targetMinor: input.targetMinor, deadlineDate, themeId: input.themeId });
}

function isRevision(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 1;
}

async function replayGoalReceipt(
  tx: SqlExecutor,
  operationId: string,
  kind: string,
  hash: string,
): Promise<GoalCommandResult | null> {
  const receipt = await lookupReceipt(tx, operationId, kind, hash, decodeStoredResult);
  if (receipt.kind === 'conflict') {
    reject({ code: 'operation_conflict' });
  }
  return receipt.kind === 'replay' ? { operationId, replayed: true, ...receipt.result } : null;
}

async function requireCurrency(tx: SqlExecutor): Promise<void> {
  const currency = await readCurrency(tx);
  if (!currency.ok) {
    reject({ code: currency.error === 'missing' ? 'currency_missing' : 'currency_invalid' });
  }
}

async function requireCurrentGoal(tx: SqlExecutor, goalId: string, expectedRevision: number): Promise<GoalRecord> {
  const goal = await getGoal(tx, goalId);
  if (!goal) {
    reject({ code: 'goal_not_found' });
  }
  if (goal.revision !== expectedRevision) {
    reject({ code: 'stale_goal', currentRevision: goal.revision });
  }
  return goal;
}

async function goalBalance(tx: SqlExecutor, goalId: string): Promise<bigint> {
  const entries = await listEntriesForGoal(tx, goalId);
  return sumMinor(entries.map((entry) => entry.signedAmountMinor));
}

export async function createGoal(
  deps: GoalCommandDeps,
  input: CreateGoalInput,
): Promise<Result<CreateGoalResult, CreateGoalError>> {
  const operationError = checkOperationId(input.operationId);
  if (operationError) {
    return err(operationError);
  }
  const fields = validateFields(input);
  if (!fields.ok) {
    return fields;
  }
  const { title, targetMinor, deadlineDate, themeId } = fields.value;
  if (deadlineDate !== null && !validateNewDeadline(deadlineDate, today(deps.clock)).ok) {
    return err({ code: 'past_deadline' });
  }
  const capabilities = deps.capabilities ?? capabilitiesFor('free');
  if (!canUseTheme(capabilities, themeId)) {
    return err({ code: 'theme_unavailable' });
  }

  const kind = GOAL_COMMAND_KINDS.create;
  const hash = requestHash(kind, [title, targetMinor, deadlineDate, themeId]);
  return executeCommand(deps.db, async (tx) => {
    const replay = await replayGoalReceipt(tx, input.operationId, kind, hash);
    if (replay) {
      return replay;
    }
    await requireCurrency(tx);
    if (!hasGoalSlot(capabilities, await countGoals(tx))) {
      reject({ code: 'goal_limit' });
    }
    const nowUtc = utcTimestamp(deps.clock);
    const goal: GoalRecord = {
      id: deps.ids.newId(),
      title,
      targetMinor,
      deadlineDate,
      themeId,
      status: 'active',
      createdAtUtc: nowUtc,
      updatedAtUtc: nowUtc,
      revision: 1,
    };
    await insertGoal(tx, goal);
    const stored: StoredGoalResult = { goalId: goal.id, revision: goal.revision };
    await insertReceipt(tx, input.operationId, kind, hash, stored, nowUtc);
    return { operationId: input.operationId, replayed: false, ...stored };
  });
}

export async function editGoal(
  deps: GoalCommandDeps,
  input: EditGoalInput,
): Promise<Result<GoalCommandResult, EditGoalError>> {
  const operationError = checkOperationId(input.operationId);
  if (operationError) {
    return err(operationError);
  }
  if (!isEntityId(input.goalId) || !isRevision(input.expectedRevision)) {
    return err({ code: 'invalid_reference' });
  }
  const fields = validateFields(input);
  if (!fields.ok) {
    return fields;
  }
  const details = fields.value;
  const todayDate = today(deps.clock);
  const capabilities = deps.capabilities ?? capabilitiesFor('free');

  const kind = GOAL_COMMAND_KINDS.edit;
  const hash = requestHash(kind, [
    input.goalId,
    input.expectedRevision,
    details.title,
    details.targetMinor,
    details.deadlineDate,
    details.themeId,
  ]);
  return executeCommand(deps.db, async (tx) => {
    const replay = await replayGoalReceipt(tx, input.operationId, kind, hash);
    if (replay) {
      return replay;
    }
    await requireCurrency(tx);
    const goal = await requireCurrentGoal(tx, input.goalId, input.expectedRevision);
    // The closed-goal guard covers every field, not only the buttons that lead here.
    if (!isOpenStatus(goal.status)) {
      reject({ code: 'goal_closed' });
    }
    // An existing deadline may expire naturally; only a new or changed date must be today or later.
    if (
      details.deadlineDate !== null &&
      details.deadlineDate !== goal.deadlineDate &&
      !validateNewDeadline(details.deadlineDate, todayDate).ok
    ) {
      reject({ code: 'past_deadline' });
    }
    if (details.themeId !== goal.themeId && !(capabilities.switchOpenGoalTheme && canUseTheme(capabilities, details.themeId))) {
      reject({ code: 'theme_unavailable' });
    }
    // Phase 11: a target edit that first makes B >= T awards the souvenir in this same transaction.
    const nowUtc = utcTimestamp(deps.clock);
    if (!(await updateGoalDetails(tx, goal.id, details, input.expectedRevision, nowUtc))) {
      reject({ code: 'stale_goal', currentRevision: goal.revision });
    }
    const stored: StoredGoalResult = { goalId: goal.id, revision: input.expectedRevision + 1 };
    await insertReceipt(tx, input.operationId, kind, hash, stored, nowUtc);
    return { operationId: input.operationId, replayed: false, ...stored };
  });
}

// One revision-checked status transition. The goal limit (Reopen) and the funding rule (Finish) are
// checked against current data inside the same exclusive transaction.
export async function changeGoalStatus(
  deps: GoalCommandDeps,
  action: LifecycleAction,
  input: LifecycleInput,
): Promise<Result<GoalCommandResult, LifecycleError>> {
  const operationError = checkOperationId(input.operationId);
  if (operationError) {
    return err(operationError);
  }
  if (!isEntityId(input.goalId) || !isRevision(input.expectedRevision)) {
    return err({ code: 'invalid_reference' });
  }
  const capabilities = deps.capabilities ?? capabilitiesFor('free');

  const kind = GOAL_COMMAND_KINDS[action];
  const hash = requestHash(kind, [input.goalId, input.expectedRevision]);
  return executeCommand(deps.db, async (tx) => {
    const replay = await replayGoalReceipt(tx, input.operationId, kind, hash);
    if (replay) {
      return replay;
    }
    const goal = await requireCurrentGoal(tx, input.goalId, input.expectedRevision);
    const next = lifecycleTarget(action, goal.status);
    if (next === null) {
      reject({ code: 'invalid_transition', status: goal.status });
    }
    if (needsGoalLimit(action) && !withinGoalLimit(capabilities, await countGoals(tx))) {
      reject({ code: 'goal_limit' });
    }
    if (needsFunding(action) && (await goalBalance(tx, goal.id)) < BigInt(goal.targetMinor)) {
      reject({ code: 'not_funded' });
    }
    const nowUtc = utcTimestamp(deps.clock);
    if (!(await updateGoalStatus(tx, goal.id, next, input.expectedRevision, nowUtc))) {
      reject({ code: 'stale_goal', currentRevision: goal.revision });
    }
    const stored: StoredGoalResult = { goalId: goal.id, revision: input.expectedRevision + 1 };
    await insertReceipt(tx, input.operationId, kind, hash, stored, nowUtc);
    return { operationId: input.operationId, replayed: false, ...stored };
  });
}

export const pauseGoal = (deps: GoalCommandDeps, input: LifecycleInput) => changeGoalStatus(deps, 'pause', input);
export const resumeGoal = (deps: GoalCommandDeps, input: LifecycleInput) => changeGoalStatus(deps, 'resume', input);
// Guarded Finish for Phase 11: open goal with B >= T. Phase 11 adds its UI and haptic.
export const finishGoal = (deps: GoalCommandDeps, input: LifecycleInput) => changeGoalStatus(deps, 'finish', input);
export const reopenGoal = (deps: GoalCommandDeps, input: LifecycleInput) => changeGoalStatus(deps, 'reopen', input);

// Deletes a goal with all of its entries and its souvenir (owner decision D74), after the screen's
// native confirmation. Revision-checked, so a goal that changed after the person confirmed is not
// deleted; a retry with the same operation ID replays the receipt. Schema 1's triggers refuse ledger
// changes on a completed goal, so a completed goal is first set back to paused in this same
// transaction: the whole deletion commits together or not at all.
export async function deleteGoal(
  deps: Pick<GoalCommandDeps, 'db' | 'clock'>,
  input: DeleteGoalInput,
): Promise<Result<GoalCommandResult, DeleteGoalError>> {
  const operationError = checkOperationId(input.operationId);
  if (operationError) {
    return err(operationError);
  }
  if (!isEntityId(input.goalId) || !isRevision(input.expectedRevision)) {
    return err({ code: 'invalid_reference' });
  }
  const kind = GOAL_COMMAND_KINDS.delete;
  const hash = requestHash(kind, [input.goalId, input.expectedRevision]);
  return executeCommand(deps.db, async (tx) => {
    const replay = await replayGoalReceipt(tx, input.operationId, kind, hash);
    if (replay) {
      return replay;
    }
    const goal = await requireCurrentGoal(tx, input.goalId, input.expectedRevision);
    const nowUtc = utcTimestamp(deps.clock);
    let revision = goal.revision;
    if (!isOpenStatus(goal.status)) {
      if (!(await updateGoalStatus(tx, goal.id, 'paused', revision, nowUtc))) {
        reject({ code: 'stale_goal', currentRevision: goal.revision });
      }
      revision += 1;
    }
    await deleteEntriesForGoal(tx, goal.id);
    await deleteCollectiblesForGoal(tx, goal.id);
    if (!(await deleteGoalRow(tx, goal.id, revision))) {
      reject({ code: 'stale_goal', currentRevision: goal.revision });
    }
    const stored: StoredGoalResult = { goalId: goal.id, revision: input.expectedRevision };
    await insertReceipt(tx, input.operationId, kind, hash, stored, nowUtc);
    return { operationId: input.operationId, replayed: false, ...stored };
  });
}
