import { CURRENCY_REGISTRY, getCurrency, type CurrencyMetadata } from '@/core/money';
import { err, ok, type Result } from '@/core/result';

import type { SqlExecutor } from '../db/sql';

// Typed settings rows (docs/DATA_MODEL.md "settings"). Phase 05 defines the global currency key,
// Phase 06 the selected goal, Phase 14 the weekly reminder opt-in and its OS request record, Phase 16
// the goal kept usable after a lost Pro entitlement. The stored
// value keeps the code, its exponent and the registry version, so a later registry change can never
// silently reinterpret saved minor units: a mismatch is reported, not repaired.

export const SETTING_KEYS = {
  currency: 'currency',
  selectedGoalId: 'selectedGoalId',
  weeklyReminderEnabled: 'weeklyReminderEnabled',
  weeklyReminderRequest: 'weeklyReminderRequest',
  keptGoalId: 'keptGoalId',
} as const;

type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

async function readSettingJson(executor: SqlExecutor, key: SettingKey): Promise<unknown> {
  const row = await executor.get<{ value_json: unknown }>('SELECT value_json FROM settings WHERE key = ?', [key]);
  if (!row || typeof row.value_json !== 'string') {
    return undefined;
  }
  try {
    return JSON.parse(row.value_json) as unknown;
  } catch {
    return undefined;
  }
}

async function writeSettingJson(tx: SqlExecutor, key: SettingKey, value: unknown, nowUtc: string): Promise<void> {
  await tx.run(
    `INSERT INTO settings (key, value_json, updated_at_utc) VALUES (?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET value_json = excluded.value_json, updated_at_utc = excluded.updated_at_utc`,
    [key, JSON.stringify(value), nowUtc],
  );
}

export type StoredCurrency = { code: string; exponent: number; registryVersion: number };

export type CurrencySettingError = 'missing' | 'invalid';

export function encodeCurrency(currency: CurrencyMetadata): string {
  const value: StoredCurrency = {
    code: currency.code,
    exponent: currency.exponent,
    registryVersion: currency.registryVersion,
  };
  return JSON.stringify(value);
}

export function decodeCurrency(valueJson: string): Result<CurrencyMetadata, 'invalid'> {
  let value: unknown;
  try {
    value = JSON.parse(valueJson);
  } catch {
    return err('invalid');
  }
  if (typeof value !== 'object' || value === null) {
    return err('invalid');
  }
  const { code, exponent, registryVersion } = value as Partial<StoredCurrency>;
  if (typeof code !== 'string' || registryVersion !== CURRENCY_REGISTRY.version) {
    return err('invalid');
  }
  const metadata = getCurrency(code);
  if (!metadata || metadata.exponent !== exponent) {
    return err('invalid');
  }
  return ok(metadata);
}

export async function readCurrency(executor: SqlExecutor): Promise<Result<CurrencyMetadata, CurrencySettingError>> {
  const row = await executor.get<{ value_json: unknown }>('SELECT value_json FROM settings WHERE key = ?', [
    SETTING_KEYS.currency,
  ]);
  if (!row) {
    return err('missing');
  }
  return typeof row.value_json === 'string' ? decodeCurrency(row.value_json) : err('invalid');
}

// Low-level write inside a caller's transaction. The lock (zero transactions, zero souvenirs) is
// checked by the currency command in src/features/settings; this only stores a validated value.
export async function writeCurrency(tx: SqlExecutor, currency: CurrencyMetadata, nowUtc: string): Promise<void> {
  await tx.run(
    `INSERT INTO settings (key, value_json, updated_at_utc) VALUES (?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET value_json = excluded.value_json, updated_at_utc = excluded.updated_at_utc`,
    [SETTING_KEYS.currency, encodeCurrency(currency), nowUtc],
  );
}

// Home's selected goal, a durable preference (docs/ARCHITECTURE.md "Startup"). The value is only a
// hint: readers fall back to an available open goal when it is missing, invalid or closed.
export async function readSelectedGoalId(executor: SqlExecutor): Promise<string | null> {
  const value = await readSettingJson(executor, SETTING_KEYS.selectedGoalId);
  return typeof value === 'string' ? value : null;
}

export async function writeSelectedGoalId(tx: SqlExecutor, goalId: string, nowUtc: string): Promise<void> {
  await writeSettingJson(tx, SETTING_KEYS.selectedGoalId, goalId, nowUtc);
}

// The goal the person chose to keep using after losing Pro with several goals (Phase 16, D74). Only
// the person's own choice writes it; nothing clears or replaces it automatically. Readers treat an ID
// that names no existing goal as no choice.
export async function readKeptGoalId(executor: SqlExecutor): Promise<string | null> {
  const value = await readSettingJson(executor, SETTING_KEYS.keptGoalId);
  return typeof value === 'string' ? value : null;
}

export async function writeKeptGoalId(tx: SqlExecutor, goalId: string, nowUtc: string): Promise<void> {
  await writeSettingJson(tx, SETTING_KEYS.keptGoalId, goalId, nowUtc);
}

// The single global weekly reminder opt-in (v1.2 AppSettings.weeklyReminderEnabled). Off unless the
// person turned it on: a missing or unreadable value reads as off, so nothing is ever scheduled
// that the person did not ask for.
export async function readWeeklyReminderEnabled(executor: SqlExecutor): Promise<boolean> {
  return (await readSettingJson(executor, SETTING_KEYS.weeklyReminderEnabled)) === true;
}

export async function writeWeeklyReminderEnabled(tx: SqlExecutor, enabled: boolean, nowUtc: string): Promise<void> {
  await writeSettingJson(tx, SETTING_KEYS.weeklyReminderEnabled, enabled, nowUtc);
}

// The durable record of the one logical OS request (docs/DATA_MODEL.md "reminder intent"). The
// reconciler writes `pending` with what it is about to do before any OS call and the outcome after
// it, so an attempt cut short by termination is visible and simply finished by the next
// reconciliation. It never holds goal, amount or schedule-editing data; the identifier is the one
// fixed request identifier and `timeZone` the device zone at that reconciliation (evidence only:
// the OS request itself floats with the device zone).
export type ReminderRequestState = 'pending' | 'scheduled' | 'none' | 'failed';

export type ReminderRequestRecord = {
  state: ReminderRequestState;
  // Whether the reminder was wanted (opt-in, permission and an active goal) at that reconciliation.
  desired: boolean;
  // The OS request identifier while scheduled; null otherwise.
  nativeId: string | null;
  contentVersion: number;
  // Increases with every recorded reconciliation that changed or failed.
  revision: number;
  // A short adapter step code (never an OS message or user data) when state is failed.
  errorCode: string | null;
  timeZone: string;
  updatedAtUtc: string;
};

const REQUEST_STATES: readonly ReminderRequestState[] = ['pending', 'scheduled', 'none', 'failed'];

export function decodeReminderRequest(value: unknown): ReminderRequestRecord | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Partial<Record<keyof ReminderRequestRecord, unknown>>;
  const { state, desired, nativeId, contentVersion, revision, errorCode, timeZone, updatedAtUtc } = record;
  if (
    !REQUEST_STATES.includes(state as ReminderRequestState) ||
    typeof desired !== 'boolean' ||
    !(nativeId === null || typeof nativeId === 'string') ||
    !Number.isSafeInteger(contentVersion) ||
    !Number.isSafeInteger(revision) ||
    !(errorCode === null || typeof errorCode === 'string') ||
    typeof timeZone !== 'string' ||
    typeof updatedAtUtc !== 'string'
  ) {
    return null;
  }
  return {
    state: state as ReminderRequestState,
    desired,
    nativeId,
    contentVersion: contentVersion as number,
    revision: revision as number,
    errorCode,
    timeZone,
    updatedAtUtc,
  };
}

// An unreadable record reads as none: the next reconciliation rebuilds it from the OS state.
export async function readReminderRequest(executor: SqlExecutor): Promise<ReminderRequestRecord | null> {
  return decodeReminderRequest(await readSettingJson(executor, SETTING_KEYS.weeklyReminderRequest));
}

export async function writeReminderRequest(tx: SqlExecutor, record: ReminderRequestRecord): Promise<void> {
  await writeSettingJson(tx, SETTING_KEYS.weeklyReminderRequest, record, record.updatedAtUtc);
}
