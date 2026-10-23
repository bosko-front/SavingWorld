import { utcTimestamp, type Clock } from '@/core/calendar';
import { getCurrency } from '@/core/money';
import { err, type Result } from '@/core/result';
import { checkOperationId, executeCommand, reject, type CommandFailure, type OperationIdError } from '@/data/command';
import type { AppDatabase } from '@/data/db/database';
import { countCollectibles } from '@/data/repositories/collectible-repository';
import { listGoals, updateGoalTarget } from '@/data/repositories/goal-repository';
import { countEntries } from '@/data/repositories/ledger-repository';
import { insertReceipt, lookupReceipt, requestHash } from '@/data/repositories/receipt-repository';
import { readCurrency, writeCurrency } from '@/data/repositories/settings-repository';

import { rescaleTarget } from '../domain/currency-change';

// The one global currency (v1.2 section 3, docs/DATA_MODEL.md "Global currency lock"). Onboarding
// sets it the first time; Settings is the only later editor. Both use this command. A change is
// allowed only while the whole database has zero transactions and zero souvenirs, checked inside
// the same serialized exclusive transaction as every ledger write, so a deposit can never slip in
// between the check and the change. The lock is not permanent: deleting the last transaction (with
// no souvenir) unlocks it again. Existing empty goals take the new currency with their targets
// rewritten to the same written amount (domain/currency-change.ts); nothing is converted.

export const CURRENCY_COMMAND_KINDS = { set: 'settings.set_currency' } as const;

export type CurrencyCommandDeps = { db: AppDatabase; clock: Clock };

export type SetCurrencyInput = { operationId: string; currencyCode: string };

export type SetCurrencyError = CommandFailure<
  | OperationIdError
  | { code: 'unsupported_currency' }
  | { code: 'operation_conflict' }
  | { code: 'currency_locked'; transactionCount: number; souvenirCount: number }
  | { code: 'target_not_representable'; goalId: string }
  | { code: 'target_too_large'; goalId: string }
>;

export type SetCurrencyResult = {
  operationId: string;
  replayed: boolean;
  currencyCode: string;
  // null when no valid currency was stored before (first choice in onboarding).
  previousCurrencyCode: string | null;
  // Goals whose targets now use the new currency (all of them are empty).
  goalCount: number;
};

type StoredCurrencyResult = { currencyCode: string; previousCurrencyCode: string | null; goalCount: number };

function decodeStoredResult(value: unknown): StoredCurrencyResult | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const { currencyCode, previousCurrencyCode, goalCount } = value as Partial<StoredCurrencyResult>;
  if (typeof currencyCode !== 'string' || !(previousCurrencyCode === null || typeof previousCurrencyCode === 'string')) {
    return null;
  }
  return typeof goalCount === 'number' && Number.isSafeInteger(goalCount) ? { currencyCode, previousCurrencyCode, goalCount } : null;
}

export async function setGlobalCurrency(
  deps: CurrencyCommandDeps,
  input: SetCurrencyInput,
): Promise<Result<SetCurrencyResult, SetCurrencyError>> {
  const operationError = checkOperationId(input.operationId);
  if (operationError) {
    return err(operationError);
  }
  const currency = getCurrency(input.currencyCode);
  if (!currency) {
    return err({ code: 'unsupported_currency' });
  }

  const kind = CURRENCY_COMMAND_KINDS.set;
  const hash = requestHash(kind, [currency.code, currency.exponent, currency.registryVersion]);
  return executeCommand(deps.db, async (tx) => {
    const receipt = await lookupReceipt(tx, input.operationId, kind, hash, decodeStoredResult);
    if (receipt.kind === 'conflict') {
      reject({ code: 'operation_conflict' });
    }
    if (receipt.kind === 'replay') {
      return { operationId: input.operationId, replayed: true, ...receipt.result };
    }
    const transactionCount = await countEntries(tx);
    const souvenirCount = await countCollectibles(tx);
    if (transactionCount > 0 || souvenirCount > 0) {
      reject({ code: 'currency_locked', transactionCount, souvenirCount });
    }

    const nowUtc = utcTimestamp(deps.clock);
    const previous = await readCurrency(tx);
    const goals = await listGoals(tx);
    // An unreadable or missing previous value gives no exponent to keep amounts by, so targets stay
    // as stored; with a valid one every goal is rewritten (all are empty, the lock guarantees it).
    if (previous.ok && previous.value.exponent !== currency.exponent) {
      for (const goal of goals) {
        const rescaled = rescaleTarget(goal.targetMinor, previous.value.exponent, currency.exponent);
        if (!rescaled.ok) {
          reject({
            code: rescaled.error === 'not_representable' ? 'target_not_representable' : 'target_too_large',
            goalId: goal.id,
          });
        }
        if (!(await updateGoalTarget(tx, goal.id, rescaled.value, goal.revision, nowUtc))) {
          throw new Error('Goal changed during the currency update');
        }
      }
    }
    await writeCurrency(tx, currency, nowUtc);
    const stored: StoredCurrencyResult = {
      currencyCode: currency.code,
      previousCurrencyCode: previous.ok ? previous.value.code : null,
      goalCount: goals.length,
    };
    await insertReceipt(tx, input.operationId, kind, hash, stored, nowUtc);
    return { operationId: input.operationId, replayed: false, ...stored };
  });
}
