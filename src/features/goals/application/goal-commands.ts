import { capabilitiesFor, canUseTheme, hasOpenGoalSlot, type Capabilities } from '@/core/access';
import { parseCivilDate, today, utcTimestamp, validateNewDeadline, type CivilDate, type Clock } from '@/core/calendar';
import { isPositiveMinorAmount } from '@/core/money';
import { isThemeId, type ThemeId } from '@/core/progression';
import { err, type Result } from '@/core/result';
import { normalizeUserText } from '@/core/text';
import { checkOperationId, executeCommand, reject, type CommandFailure, type OperationIdError } from '@/data/command';
import type { AppDatabase } from '@/data/db/database';
import { isEntityId, type IdGenerator } from '@/data/ids';
import { countOpenGoals, insertGoal, type GoalRecord } from '@/data/repositories/goal-repository';
import { insertReceipt, lookupReceipt, requestHash } from '@/data/repositories/receipt-repository';
import { readCurrency } from '@/data/repositories/settings-repository';

// Create Goal (v1.2 sections 2-3): free title, target > 0, optional deadline today or later and an
// available theme. No currency field: the goal uses the global Settings currency, which must exist.
// Every goal starts at zero (no opening balance) as active, after the open-slot check of the given
// capabilities inside the same exclusive transaction. Edit, Pause/Resume, Archive, Finish and
// Reopen are Phase 06 commands.

export const TITLE_MAX_LENGTH = 100;

export const GOAL_COMMAND_KINDS = { create: 'goal.create' } as const;

export type GoalCommandDeps = {
  db: AppDatabase;
  clock: Clock;
  ids: IdGenerator;
  // Free by default; only a verified entitlement (Phase 15) supplies Pro.
  capabilities?: Capabilities;
};

export type CreateGoalInput = {
  operationId: string;
  title: string;
  targetMinor: number;
  deadlineDate: string | null;
  themeId: ThemeId;
};

export type CreateGoalError = CommandFailure<
  | OperationIdError
  | { code: 'title_empty' }
  | { code: 'title_too_long' }
  | { code: 'title_invalid' }
  | { code: 'invalid_target' }
  | { code: 'invalid_deadline' }
  | { code: 'past_deadline' }
  | { code: 'invalid_theme' }
  | { code: 'theme_unavailable' }
  | { code: 'operation_conflict' }
  | { code: 'currency_missing' }
  | { code: 'currency_invalid' }
  | { code: 'open_goal_limit' }
>;

export type CreateGoalResult = { operationId: string; replayed: boolean; goalId: string; revision: number };

type StoredGoalResult = { goalId: string; revision: number };

function decodeStoredResult(value: unknown): StoredGoalResult | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const { goalId, revision } = value as Partial<StoredGoalResult>;
  return isEntityId(goalId) && typeof revision === 'number' && Number.isSafeInteger(revision) ? { goalId, revision } : null;
}

export async function createGoal(
  deps: GoalCommandDeps,
  input: CreateGoalInput,
): Promise<Result<CreateGoalResult, CreateGoalError>> {
  const operationError = checkOperationId(input.operationId);
  if (operationError) {
    return err(operationError);
  }
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
    if (!validateNewDeadline(parsed.value, today(deps.clock)).ok) {
      return err({ code: 'past_deadline' });
    }
    deadlineDate = parsed.value;
  }
  if (!isThemeId(input.themeId)) {
    return err({ code: 'invalid_theme' });
  }
  const capabilities = deps.capabilities ?? capabilitiesFor('free');
  if (!canUseTheme(capabilities, input.themeId)) {
    return err({ code: 'theme_unavailable' });
  }

  const kind = GOAL_COMMAND_KINDS.create;
  const hash = requestHash(kind, [title.value, input.targetMinor, deadlineDate, input.themeId]);
  return executeCommand(deps.db, async (tx) => {
    const receipt = await lookupReceipt(tx, input.operationId, kind, hash, decodeStoredResult);
    if (receipt.kind === 'conflict') {
      reject({ code: 'operation_conflict' });
    }
    if (receipt.kind === 'replay') {
      return { operationId: input.operationId, replayed: true, ...receipt.result };
    }
    const currency = await readCurrency(tx);
    if (!currency.ok) {
      reject({ code: currency.error === 'missing' ? 'currency_missing' : 'currency_invalid' });
    }
    if (!hasOpenGoalSlot(capabilities, await countOpenGoals(tx))) {
      reject({ code: 'open_goal_limit' });
    }
    const nowUtc = utcTimestamp(deps.clock);
    const goal: GoalRecord = {
      id: deps.ids.newId(),
      title: title.value,
      targetMinor: input.targetMinor,
      deadlineDate,
      themeId: input.themeId,
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
