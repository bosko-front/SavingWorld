import { parseCivilDate, today, utcTimestamp, validateEntryDate, type CivilDate, type Clock } from '@/core/calendar';
import { isPositiveMinorAmount, signedAmount, sumMinor, toMinorAmount, type EntryKind } from '@/core/money';
import { err, type Result } from '@/core/result';
import { normalizeUserText } from '@/core/text';
import { checkOperationId, executeCommand, reject, type CommandFailure, type OperationIdError } from '@/data/command';
import type { AppDatabase } from '@/data/db/database';
import type { SqlExecutor } from '@/data/db/sql';
import { isEntityId, type IdGenerator } from '@/data/ids';
import { getGoal, isOpenStatus, type GoalRecord } from '@/data/repositories/goal-repository';
import {
  deleteEntry as deleteEntryRow,
  getEntry,
  insertEntry,
  listEntriesForGoal,
  updateEntry,
  type LedgerEntryRecord,
} from '@/data/repositories/ledger-repository';
import { insertReceipt, lookupReceipt, requestHash } from '@/data/repositories/receipt-repository';
import { readCurrency } from '@/data/repositories/settings-repository';
import { awardSouvenirIfFirstFunded } from '@/features/collection/application/souvenir-award';

import { validateCandidateHistory, type HistoryEntry, type HistoryViolation } from '../domain/candidate-history';

// Create, correct and confirmed-delete commands for ledger entries (v1.2 section 3,
// docs/ARCHITECTURE.md "Financial mutation flow"). Each one:
// 1. validates input outside the transaction: positive amount + kind, a real civil date that is not
//    in the future (today read once from the Clock), a normalized optional note;
// 2. in one exclusive transaction: replays a receipt for a repeated operation ID (or rejects a
//    different payload), requires the global currency, an open goal and the expected row revision,
//    validates the goal's whole candidate history in date/createdAt/id order, writes the current
//    values, stores the goal's one souvenir when this change first leaves B >= T (Phase 11) and a
//    minimal receipt;
// 3. returns the recomputed balance only after COMMIT.
// Nothing keeps a previous entry version: a correction overwrites, a deletion removes.

export const NOTE_MAX_LENGTH = 500;

export const LEDGER_COMMAND_KINDS = {
  create: 'ledger.create_entry',
  correct: 'ledger.correct_entry',
  delete: 'ledger.delete_entry',
} as const;

export type LedgerCommandDeps = { db: AppDatabase; clock: Clock; ids: IdGenerator };

export type EntryValuesInput = {
  kind: EntryKind;
  // Positive minor units from parseAmount; the kind decides the stored sign.
  amountMinor: number;
  // Local civil date YYYY-MM-DD; defaults to today in the form (Phase 07), never in the future.
  entryDate: string;
  note: string | null;
};

export type CreateEntryInput = EntryValuesInput & { operationId: string; goalId: string };

export type CorrectEntryInput = EntryValuesInput & {
  operationId: string;
  entryId: string;
  // The revision the person was looking at when they started editing.
  expectedRevision: number;
};

export type DeleteEntryInput = {
  operationId: string;
  entryId: string;
  expectedRevision: number;
  // Set only after the native confirmation was accepted.
  confirmed: boolean;
};

export type EntryInputError =
  | OperationIdError
  | { code: 'invalid_kind' }
  | { code: 'invalid_amount' }
  | { code: 'invalid_date' }
  | { code: 'future_date' }
  | { code: 'note_too_long' }
  | { code: 'note_invalid' }
  | { code: 'invalid_reference' }
  | { code: 'confirmation_required' };

export type LedgerRuleError =
  | { code: 'operation_conflict' }
  | { code: 'currency_missing' }
  | { code: 'currency_invalid' }
  | { code: 'goal_not_found' }
  | { code: 'goal_closed' }
  | { code: 'entry_not_found' }
  | { code: 'stale_entry'; currentRevision: number }
  | HistoryViolation;

export type LedgerCommandError = CommandFailure<EntryInputError | LedgerRuleError>;

export type LedgerMutationResult = {
  operationId: string;
  // True when this operation ID had already committed; nothing new was written.
  replayed: boolean;
  goalId: string;
  entryId: string;
  // Revision of the saved entry, or null after a deletion.
  entryRevision: number | null;
  // Goal balance recomputed from the saved ledger after this commit.
  balanceMinor: number;
  // Balance before this mutation; null for a replay.
  previousBalanceMinor: number | null;
  // True when this commit stored the goal's souvenir (the first saved B >= T). Always false for a
  // replay, so a retry never repeats the first-award moment.
  souvenirAwarded: boolean;
};

// What a receipt keeps: identifiers and outcome only.
type StoredLedgerResult = { goalId: string; entryId: string; entryRevision: number | null };

function decodeStoredResult(value: unknown): StoredLedgerResult | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const { goalId, entryId, entryRevision } = value as Partial<StoredLedgerResult>;
  if (!isEntityId(goalId) || !isEntityId(entryId)) {
    return null;
  }
  if (entryRevision !== null && !(typeof entryRevision === 'number' && Number.isSafeInteger(entryRevision))) {
    return null;
  }
  return { goalId, entryId, entryRevision: entryRevision ?? null };
}

type ValidEntryValues = { signedAmountMinor: number; entryDate: CivilDate; note: string | null };

function validateValues(input: EntryValuesInput, clock: Clock): Result<ValidEntryValues, EntryInputError> {
  if (input.kind !== 'deposit' && input.kind !== 'withdrawal') {
    return err({ code: 'invalid_kind' });
  }
  if (!isPositiveMinorAmount(input.amountMinor)) {
    return err({ code: 'invalid_amount' });
  }
  const parsed = parseCivilDate(input.entryDate);
  if (!parsed.ok) {
    return err({ code: 'invalid_date' });
  }
  if (!validateEntryDate(parsed.value, today(clock)).ok) {
    return err({ code: 'future_date' });
  }
  let note: string | null = null;
  if (input.note !== null) {
    const normalized = normalizeUserText(input.note, { maxLength: NOTE_MAX_LENGTH, allowLineBreaks: true });
    if (normalized.ok) {
      note = normalized.value;
    } else if (normalized.error === 'too_long') {
      return err({ code: 'note_too_long' });
    } else if (normalized.error === 'invalid_character') {
      return err({ code: 'note_invalid' });
    }
    // 'empty': a blank note is no note.
  }
  return { ok: true, value: { signedAmountMinor: signedAmount(input.kind, input.amountMinor), entryDate: parsed.value, note } };
}

function isRevision(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 1;
}

async function goalBalance(tx: SqlExecutor, goalId: string): Promise<number> {
  const entries = await listEntriesForGoal(tx, goalId);
  return checkedBalance(entries);
}

function checkedBalance(entries: readonly LedgerEntryRecord[]): number {
  const total = toMinorAmount(sumMinor(entries.map((entry) => entry.signedAmountMinor)));
  if (!total.ok) {
    throw new Error('Stored goal balance is out of range');
  }
  return total.value;
}

async function replayOrContinue(
  tx: SqlExecutor,
  operationId: string,
  kind: string,
  hash: string,
): Promise<LedgerMutationResult | null> {
  const receipt = await lookupReceipt(tx, operationId, kind, hash, decodeStoredResult);
  if (receipt.kind === 'conflict') {
    reject<LedgerRuleError>({ code: 'operation_conflict' });
  }
  if (receipt.kind === 'replay') {
    return {
      operationId,
      replayed: true,
      ...receipt.result,
      balanceMinor: await goalBalance(tx, receipt.result.goalId),
      previousBalanceMinor: null,
      souvenirAwarded: false,
    };
  }
  return null;
}

async function requireCurrency(tx: SqlExecutor): Promise<void> {
  const currency = await readCurrency(tx);
  if (!currency.ok) {
    reject<LedgerRuleError>({ code: currency.error === 'missing' ? 'currency_missing' : 'currency_invalid' });
  }
}

async function requireOpenGoal(tx: SqlExecutor, goalId: string): Promise<GoalRecord> {
  const goal = await getGoal(tx, goalId);
  if (!goal) {
    reject<LedgerRuleError>({ code: 'goal_not_found' });
  }
  if (!isOpenStatus(goal.status)) {
    reject<LedgerRuleError>({ code: 'goal_closed' });
  }
  return goal;
}

async function requireCurrentEntry(
  tx: SqlExecutor,
  entryId: string,
  expectedRevision: number,
): Promise<{ entry: LedgerEntryRecord; goal: GoalRecord }> {
  const entry = await getEntry(tx, entryId);
  if (!entry) {
    reject<LedgerRuleError>({ code: 'entry_not_found' });
  }
  const goal = await requireOpenGoal(tx, entry.goalId);
  if (entry.revision !== expectedRevision) {
    reject<LedgerRuleError>({ code: 'stale_entry', currentRevision: entry.revision });
  }
  return { entry, goal };
}

function requireValidHistory(candidate: readonly HistoryEntry[]): number {
  const checked = validateCandidateHistory(candidate);
  if (!checked.ok) {
    reject<LedgerRuleError>(checked.error);
  }
  return checked.value;
}

export async function createEntry(
  deps: LedgerCommandDeps,
  input: CreateEntryInput,
): Promise<Result<LedgerMutationResult, LedgerCommandError>> {
  const operationError = checkOperationId(input.operationId);
  if (operationError) {
    return err(operationError);
  }
  if (!isEntityId(input.goalId)) {
    return err({ code: 'invalid_reference' });
  }
  const values = validateValues(input, deps.clock);
  if (!values.ok) {
    return values;
  }
  const { signedAmountMinor, entryDate, note } = values.value;
  const kind = LEDGER_COMMAND_KINDS.create;
  const hash = requestHash(kind, [input.goalId, signedAmountMinor, entryDate, note]);

  return executeCommand(deps.db, async (tx) => {
    const replay = await replayOrContinue(tx, input.operationId, kind, hash);
    if (replay) {
      return replay;
    }
    await requireCurrency(tx);
    const goal = await requireOpenGoal(tx, input.goalId);

    const nowUtc = utcTimestamp(deps.clock);
    const existing = await listEntriesForGoal(tx, input.goalId);
    const previousBalanceMinor = checkedBalance(existing);
    const entry: LedgerEntryRecord = {
      id: deps.ids.newId(),
      goalId: input.goalId,
      signedAmountMinor,
      entryDate,
      note,
      createdAtUtc: nowUtc,
      updatedAtUtc: nowUtc,
      revision: 1,
    };
    const balanceMinor = requireValidHistory([...existing, entry]);
    await insertEntry(tx, entry);
    const souvenirAwarded = await awardSouvenirIfFirstFunded(tx, goal, balanceMinor, nowUtc);
    const stored: StoredLedgerResult = { goalId: entry.goalId, entryId: entry.id, entryRevision: entry.revision };
    await insertReceipt(tx, input.operationId, kind, hash, stored, nowUtc);
    return { operationId: input.operationId, replayed: false, ...stored, balanceMinor, previousBalanceMinor, souvenirAwarded };
  });
}

export async function correctEntry(
  deps: LedgerCommandDeps,
  input: CorrectEntryInput,
): Promise<Result<LedgerMutationResult, LedgerCommandError>> {
  const operationError = checkOperationId(input.operationId);
  if (operationError) {
    return err(operationError);
  }
  if (!isEntityId(input.entryId) || !isRevision(input.expectedRevision)) {
    return err({ code: 'invalid_reference' });
  }
  const values = validateValues(input, deps.clock);
  if (!values.ok) {
    return values;
  }
  const { signedAmountMinor, entryDate, note } = values.value;
  const kind = LEDGER_COMMAND_KINDS.correct;
  const hash = requestHash(kind, [input.entryId, input.expectedRevision, signedAmountMinor, entryDate, note]);

  return executeCommand(deps.db, async (tx) => {
    const replay = await replayOrContinue(tx, input.operationId, kind, hash);
    if (replay) {
      return replay;
    }
    await requireCurrency(tx);
    const { entry: current, goal } = await requireCurrentEntry(tx, input.entryId, input.expectedRevision);

    const existing = await listEntriesForGoal(tx, current.goalId);
    const previousBalanceMinor = checkedBalance(existing);
    // createdAt and id stay, so the entry keeps its tie-break position among same-day entries.
    const candidate = existing.map((entry) =>
      entry.id === current.id ? { ...entry, signedAmountMinor, entryDate, note } : entry,
    );
    const balanceMinor = requireValidHistory(candidate);
    const nowUtc = utcTimestamp(deps.clock);
    if (!(await updateEntry(tx, current.id, input.expectedRevision, { signedAmountMinor, entryDate, note }, nowUtc))) {
      reject<LedgerRuleError>({ code: 'stale_entry', currentRevision: current.revision });
    }
    const souvenirAwarded = await awardSouvenirIfFirstFunded(tx, goal, balanceMinor, nowUtc);
    const stored: StoredLedgerResult = {
      goalId: current.goalId,
      entryId: current.id,
      entryRevision: input.expectedRevision + 1,
    };
    await insertReceipt(tx, input.operationId, kind, hash, stored, nowUtc);
    return { operationId: input.operationId, replayed: false, ...stored, balanceMinor, previousBalanceMinor, souvenirAwarded };
  });
}

export async function deleteEntry(
  deps: LedgerCommandDeps,
  input: DeleteEntryInput,
): Promise<Result<LedgerMutationResult, LedgerCommandError>> {
  const operationError = checkOperationId(input.operationId);
  if (operationError) {
    return err(operationError);
  }
  if (!isEntityId(input.entryId) || !isRevision(input.expectedRevision)) {
    return err({ code: 'invalid_reference' });
  }
  if (input.confirmed !== true) {
    return err({ code: 'confirmation_required' });
  }
  const kind = LEDGER_COMMAND_KINDS.delete;
  const hash = requestHash(kind, [input.entryId, input.expectedRevision]);

  return executeCommand(deps.db, async (tx) => {
    const replay = await replayOrContinue(tx, input.operationId, kind, hash);
    if (replay) {
      return replay;
    }
    await requireCurrency(tx);
    const { entry: current, goal } = await requireCurrentEntry(tx, input.entryId, input.expectedRevision);

    const existing = await listEntriesForGoal(tx, current.goalId);
    const previousBalanceMinor = checkedBalance(existing);
    const balanceMinor = requireValidHistory(existing.filter((entry) => entry.id !== current.id));
    if (!(await deleteEntryRow(tx, current.id, input.expectedRevision))) {
      reject<LedgerRuleError>({ code: 'stale_entry', currentRevision: current.revision });
    }
    // Deleting a withdrawal raises the balance, so it can be the first B >= T too.
    const nowUtc = utcTimestamp(deps.clock);
    const souvenirAwarded = await awardSouvenirIfFirstFunded(tx, goal, balanceMinor, nowUtc);
    const stored: StoredLedgerResult = { goalId: current.goalId, entryId: current.id, entryRevision: null };
    await insertReceipt(tx, input.operationId, kind, hash, stored, nowUtc);
    return { operationId: input.operationId, replayed: false, ...stored, balanceMinor, previousBalanceMinor, souvenirAwarded };
  });
}
