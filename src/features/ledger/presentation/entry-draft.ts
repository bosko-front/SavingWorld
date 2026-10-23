import type { CivilDate } from '@/core/calendar';
import { formatAmountInput, parseAmount, type AmountParseError, type CurrencyExponent, type EntryKind, type NumberSeparators } from '@/core/money';
import { err, ok, type Result } from '@/core/result';
import type { LedgerEntryRecord } from '@/data/repositories/ledger-repository';

import type { EntryValuesInput } from '../application/ledger-commands';

// The shared Add/Edit Entry draft (v1.2 section 2: deposit or withdrawal, positive amount, date and
// optional note) and its conversion to command input. Pure, so the form and the native database
// scenarios go through exactly the same parsing. The draft holds raw text; only `parseAmount`
// turns it into minor units, with the global currency's exponent and the device's separators.

export type EntryDraft = {
  kind: EntryKind;
  amountText: string;
  entryDate: CivilDate;
  noteText: string;
};

export function newEntryDraft(today: CivilDate): EntryDraft {
  return { kind: 'deposit', amountText: '', entryDate: today, noteText: '' };
}

// Prefill for editing: the stored sign becomes the kind, the magnitude the amount text, written
// so that parseAmount reads it back to the same minor units.
export function draftFromEntry(entry: LedgerEntryRecord, exponent: CurrencyExponent, separators: NumberSeparators): EntryDraft {
  const kind: EntryKind = entry.signedAmountMinor < 0 ? 'withdrawal' : 'deposit';
  return {
    kind,
    amountText: formatAmountInput(Math.abs(entry.signedAmountMinor), exponent, separators),
    entryDate: entry.entryDate,
    noteText: entry.note ?? '',
  };
}

// The amount is the only part checked here; the command validates the date (no future dates),
// the note and every balance rule against the saved ledger.
export function draftValues(
  draft: EntryDraft,
  exponent: CurrencyExponent,
  separators: NumberSeparators,
): Result<EntryValuesInput, AmountParseError> {
  const amount = parseAmount(draft.amountText, exponent, separators);
  if (!amount.ok) {
    return err(amount.error);
  }
  return ok({
    kind: draft.kind,
    amountMinor: amount.value,
    entryDate: draft.entryDate,
    note: draft.noteText === '' ? null : draft.noteText,
  });
}
