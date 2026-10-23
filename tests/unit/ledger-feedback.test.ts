import * as Haptics from 'expo-haptics';

import { getCurrency, separatorsForLocale, type CurrencyMetadata } from '@/core/money';
import type { LedgerEntryRecord } from '@/data/repositories/ledger-repository';
import type { LedgerCommandError } from '@/features/ledger/application/ledger-commands';
import { newestFirst } from '@/features/ledger/application/ledger-queries';
import { draftFromEntry, draftValues } from '@/features/ledger/presentation/entry-draft';
import { committedToastTitle, ledgerCommandMessage } from '@/features/ledger/presentation/ledger-copy';
import { haptics } from '@/shared/ui/haptics';

import { playedHaptics, resetFakeHaptics } from '../support/expo-haptics-fake';

const EUR = getCurrency('EUR') as CurrencyMetadata;
const JPY = getCurrency('JPY') as CurrencyMetadata;
const KWD = getCurrency('KWD') as CurrencyMetadata;
const context = { currency: EUR, balanceMinor: 3_000, locale: 'en-US' };

function entry(signedAmountMinor: number, note: string | null = null): LedgerEntryRecord {
  return {
    id: 'e1',
    goalId: 'g1',
    signedAmountMinor,
    entryDate: '2026-10-20' as LedgerEntryRecord['entryDate'],
    note,
    createdAtUtc: '2026-10-20T10:00:00.000Z',
    updatedAtUtc: '2026-10-20T10:00:00.000Z',
    revision: 1,
  };
}

describe('haptics helper', () => {
  beforeEach(() => resetFakeHaptics());

  it('maps the four semantic helpers to the documented iOS feedback', () => {
    haptics.success();
    haptics.warning();
    haptics.milestone();
    haptics.selection();
    expect(playedHaptics()).toEqual([
      { kind: 'notification', type: 'success' },
      { kind: 'notification', type: 'warning' },
      { kind: 'impact', style: 'medium' },
      { kind: 'selection' },
    ]);
  });

  it('never throws or rejects when the haptics engine fails', async () => {
    const throwing = jest.spyOn(Haptics, 'notificationAsync').mockImplementationOnce(() => {
      throw new Error('no engine');
    });
    expect(() => haptics.success()).not.toThrow();
    jest.spyOn(Haptics, 'notificationAsync').mockImplementationOnce(() => Promise.reject(new Error('no engine')));
    expect(() => haptics.warning()).not.toThrow();
    await Promise.resolve();
    throwing.mockRestore();
  });
});

describe('ledger feedback copy', () => {
  it('names each committed write in its confirmation toast', () => {
    expect([
      committedToastTitle('create', 'deposit'),
      committedToastTitle('create', 'withdrawal'),
      committedToastTitle('correct', 'withdrawal'),
      committedToastTitle('delete', 'deposit'),
    ]).toEqual(['Deposit saved', 'Withdrawal saved', 'Entry updated', 'Entry deleted']);
  });

  it('flags balance and date rules as rule rejections, never input, stale or storage problems', () => {
    const rules: LedgerCommandError[] = [
      { code: 'negative_balance', balanceMinor: -100 },
      { code: 'negative_running_balance', date: '2026-10-05' as never },
      { code: 'balance_limit', date: '2026-10-05' as never },
      { code: 'future_date' },
    ];
    const others: LedgerCommandError[] = [
      { code: 'storage_failure', message: 'disk I/O error' },
      { code: 'stale_entry', currentRevision: 2 },
      { code: 'goal_closed' },
      { code: 'note_too_long' },
      { code: 'operation_conflict' },
    ];
    expect(rules.map((error) => ledgerCommandMessage('create', error, context).ruleRejection)).toEqual([true, true, true, true]);
    expect(others.map((error) => ledgerCommandMessage('create', error, context).ruleRejection)).toEqual([false, false, false, false, false]);
  });

  it('explains a chronological rejection with its date and the action taken', () => {
    const dip: LedgerCommandError = { code: 'negative_running_balance', date: '2026-10-05' as never };
    expect(ledgerCommandMessage('correct', dip, context)).toMatchObject({ field: 'date', message: expect.stringContaining('below zero on Oct 5, 2026') });
    expect(ledgerCommandMessage('delete', dip, context)).toMatchObject({
      field: null,
      message: expect.stringContaining('because a later withdrawal relies on it'),
    });
    expect(ledgerCommandMessage('create', { code: 'negative_balance', balanceMinor: -100 }, context).message).toBe(
      'A withdrawal can’t be more than the saved balance (€30.00).',
    );
    expect(ledgerCommandMessage('delete', { code: 'storage_failure', message: 'x' }, context).message).toBe(
      'Couldn’t delete. Nothing was changed. Try again.',
    );
  });
});

describe('entry draft', () => {
  it.each([
    [EUR, 'en-US', -2_050, '20.50'],
    [EUR, 'de-DE', 123_456, '1234,56'],
    [JPY, 'en-US', 1_500, '1500'],
    [KWD, 'en-US', -1_250, '1.250'],
  ] as const)('prefills %s in %s and parses it back exactly', (currency, locale, signed, text) => {
    const separators = separatorsForLocale(locale);
    const draft = draftFromEntry(entry(signed, 'note'), currency.exponent, separators);
    expect([draft.kind, draft.amountText, draft.noteText]).toEqual([signed < 0 ? 'withdrawal' : 'deposit', text, 'note']);
    const values = draftValues(draft, currency.exponent, separators);
    expect(values).toEqual({ ok: true, value: { kind: draft.kind, amountMinor: Math.abs(signed), entryDate: '2026-10-20', note: 'note' } });
  });

  it('sends an empty note as no note and keeps parse errors typed', () => {
    const separators = separatorsForLocale('en-US');
    const base = { kind: 'deposit' as const, entryDate: '2026-10-20' as LedgerEntryRecord['entryDate'], noteText: '' };
    expect(draftValues({ ...base, amountText: '5' }, 2, separators)).toMatchObject({ ok: true, value: { note: null } });
    expect(draftValues({ ...base, amountText: '0' }, 2, separators)).toEqual({ ok: false, error: 'not_positive' });
    expect(draftValues({ ...base, amountText: '-5' }, 2, separators)).toEqual({ ok: false, error: 'signed' });
  });

  it('History shows the exact reverse of the validation order', () => {
    const a = { ...entry(100), id: 'a' };
    const b = { ...entry(-50), id: 'b' };
    expect(newestFirst([a, b]).map((e) => e.id)).toEqual(['b', 'a']);
  });
});
