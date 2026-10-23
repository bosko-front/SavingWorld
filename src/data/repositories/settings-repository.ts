import { CURRENCY_REGISTRY, getCurrency, type CurrencyMetadata } from '@/core/money';
import { err, ok, type Result } from '@/core/result';

import type { SqlExecutor } from '../db/sql';

// Typed settings rows (docs/DATA_MODEL.md "settings"). Phase 05 defines the global currency key;
// later phases add their own typed keys (onboarding, selected goal, weekly reminder). The stored
// value keeps the code, its exponent and the registry version, so a later registry change can never
// silently reinterpret saved minor units: a mismatch is reported, not repaired.

export const SETTING_KEYS = { currency: 'currency' } as const;

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

// Low-level write inside a caller's transaction. The Settings currency change command with the
// zero-transactions/zero-souvenirs lock belongs to Phase 06; this only stores a validated value.
export async function writeCurrency(tx: SqlExecutor, currency: CurrencyMetadata, nowUtc: string): Promise<void> {
  await tx.run(
    `INSERT INTO settings (key, value_json, updated_at_utc) VALUES (?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET value_json = excluded.value_json, updated_at_utc = excluded.updated_at_utc`,
    [SETTING_KEYS.currency, encodeCurrency(currency), nowUtc],
  );
}
