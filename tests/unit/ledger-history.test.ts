import type { CivilDate } from '@/core/calendar';
import { normalizeUserText } from '@/core/text';
import { fnv1a64 } from '@/data/db/hash';
import { migrationChecksum } from '@/data/db/migration-runner';
import { LATEST_SCHEMA_VERSION, MIGRATIONS } from '@/data/db/migrations';
import { decodeCurrency, encodeCurrency } from '@/data/repositories/settings-repository';
import { getCurrency } from '@/core/money';
import { validateCandidateHistory, type HistoryEntry } from '@/features/ledger/domain/candidate-history';

// Pure Phase 05 rules: the chronological candidate-history check (v1.2 section 3), text
// normalization, the currency setting codec and the immutability pin on shipped migrations.

let created = 0;
function entry(date: string, amount: number, id = `e${(created += 1)}`, createdAtUtc = `2026-10-23T08:00:${String(created).padStart(2, '0')}.000Z`): HistoryEntry {
  return { id, entryDate: date as CivilDate, createdAtUtc, signedAmountMinor: amount };
}

describe('validateCandidateHistory', () => {
  it('accepts the v1.2 example 0 + 50 − 20 = 30', () => {
    expect(validateCandidateHistory([entry('2026-10-20', 5_000), entry('2026-10-21', -2_000)])).toEqual({ ok: true, value: 3_000 });
  });

  it('rejects a withdrawal that exceeds the current balance', () => {
    const history = [entry('2026-10-20', 5_000), entry('2026-10-21', -2_000), entry('2026-10-22', -3_100)];
    expect(validateCandidateHistory(history)).toEqual({ ok: false, error: { code: 'negative_balance', balanceMinor: -100 } });
  });

  it('rejects a withdrawal before the first deposit even when the final total is positive', () => {
    const history = [entry('2026-10-20', 10_000), entry('2026-10-19', -500)];
    expect(validateCandidateHistory(history)).toEqual({ ok: false, error: { code: 'negative_running_balance', date: '2026-10-19' } });
  });

  it('rejects removing a deposit a later withdrawal needed, despite a later deposit', () => {
    const remaining = [entry('2026-10-05', -4_000), entry('2026-10-10', 10_000)];
    expect(validateCandidateHistory(remaining)).toEqual({ ok: false, error: { code: 'negative_running_balance', date: '2026-10-05' } });
  });

  it('orders same-day entries by createdAt, then id, regardless of input order', () => {
    const deposit = entry('2026-10-22', 1_000, 'b', '2026-10-22T10:00:00.000Z');
    const laterWithdrawal = entry('2026-10-22', -1_000, 'a', '2026-10-22T10:00:01.000Z');
    expect(validateCandidateHistory([laterWithdrawal, deposit])).toEqual({ ok: true, value: 0 });
    const tiedWithdrawal = entry('2026-10-22', -1_000, 'a', '2026-10-22T10:00:00.000Z');
    expect(validateCandidateHistory([deposit, tiedWithdrawal]).ok).toBe(false);
  });

  it('keeps every subtotal within the 10^12 ceiling', () => {
    const history = [entry('2026-10-01', 1_000_000_000_000), entry('2026-10-02', 1), entry('2026-10-03', -5)];
    expect(validateCandidateHistory(history)).toEqual({ ok: false, error: { code: 'balance_limit', date: '2026-10-02' } });
    expect(validateCandidateHistory([])).toEqual({ ok: true, value: 0 });
  });
});

describe('normalizeUserText', () => {
  const rules = { maxLength: 5, allowLineBreaks: false };

  it.each([
    ['  Café ', { ok: true, value: 'Café' }],
    ['🏝🏝🏝🏝🏝', { ok: true, value: '🏝🏝🏝🏝🏝' }],
    ['🏝🏝🏝🏝🏝🏝', { ok: false, error: 'too_long' }],
    ['   ', { ok: false, error: 'empty' }],
    ['a\nb', { ok: false, error: 'invalid_character' }],
    ['a\u0000', { ok: false, error: 'invalid_character' }],
    ['\ud800x', { ok: false, error: 'invalid_character' }],
    ["'; --", { ok: true, value: "'; --" }],
  ])('%j', (input, expected) => {
    expect(normalizeUserText(input, rules)).toEqual(expected);
  });

  it('allows line breaks and tabs in notes and normalizes CRLF', () => {
    expect(normalizeUserText('a\r\nb\tc', { maxLength: 10, allowLineBreaks: true })).toEqual({ ok: true, value: 'a\nb\tc' });
  });
});

describe('currency setting codec', () => {
  it('round-trips code, exponent and registry version', () => {
    const kwd = getCurrency('KWD');
    expect(kwd).toBeDefined();
    const encoded = encodeCurrency(kwd!);
    expect(JSON.parse(encoded)).toEqual({ code: 'KWD', exponent: 3, registryVersion: 1 });
    expect(decodeCurrency(encoded)).toEqual({ ok: true, value: kwd });
  });

  it.each([
    '{"code":"EUR","exponent":3,"registryVersion":1}',
    '{"code":"EUR","exponent":2,"registryVersion":2}',
    '{"code":"XTS","exponent":0,"registryVersion":1}',
    'not json',
    'null',
  ])('reports %s as invalid instead of reinterpreting it', (value) => {
    expect(decodeCurrency(value)).toEqual({ ok: false, error: 'invalid' });
  });
});

describe('shipped migrations', () => {
  it('are versions 1..n and every shipped schema is pinned', () => {
    expect(MIGRATIONS.map((migration) => migration.version)).toEqual([1, 2, 3, 4, 5]);
    expect(LATEST_SCHEMA_VERSION).toBe(5);
    // A released migration is never edited. If this fails, revert the edit and add a new migration.
    expect(migrationChecksum(MIGRATIONS[0]!)).toBe('f060530662e52157');
    expect(migrationChecksum(MIGRATIONS[1]!)).toBe('02eb49969587883c');
    expect(migrationChecksum(MIGRATIONS[2]!)).toBe('1d1c7826fd9f83de');
    expect(migrationChecksum(MIGRATIONS[3]!)).toBe('4255b9a308e7cb0c');
    expect(migrationChecksum(MIGRATIONS[4]!)).toBe('84b68261720ce88d');
  });

  it('hashes UTF-8 with FNV-1a 64', () => {
    expect(fnv1a64('')).toBe('cbf29ce484222325');
    expect(fnv1a64('a')).toBe('af63dc4c8601ec8c');
    expect(fnv1a64('é')).not.toBe(fnv1a64('é'));
  });
});
