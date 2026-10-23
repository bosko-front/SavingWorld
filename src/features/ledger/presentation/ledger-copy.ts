import type { CivilDate } from '@/core/calendar';
import { formatMoney, MAX_MINOR, type CurrencyMetadata, type EntryKind } from '@/core/money';
import { formatCivilDate } from '@/shared/i18n/locale';

import { NOTE_MAX_LENGTH, type LedgerCommandError } from '../application/ledger-commands';

// English copy for the shared entry form and History. Every ledger command error code has a
// message that says what happened and what to do. Errors stay inline (next to the field or at the
// top of the form) with the draft as typed; they never use a toast.

export type EntryFormField = 'amount' | 'date' | 'note';

export type LedgerAction = 'create' | 'correct' | 'delete';

export type LedgerMessage = {
  field: EntryFormField | null;
  message: string;
  // A balance or date rule refused the submit (docs/DESIGN_SYSTEM.md "Haptics": one warning
  // haptic with the explanation). False for input format problems, stale screens and storage
  // failures, which get no haptic.
  ruleRejection: boolean;
};

export const ENTRY_SAVE_FAILED = 'Couldn’t save. Nothing was changed. Try again.';
export const ENTRY_DELETE_FAILED = 'Couldn’t delete. Nothing was changed. Try again.';

export const KIND_LABEL: Record<EntryKind, string> = { deposit: 'Deposit', withdrawal: 'Withdrawal' };

// Confirmation toasts, shown only after the write committed (DESIGN_SYSTEM "Transient feedback").
export function committedToastTitle(action: LedgerAction, kind: EntryKind): string {
  switch (action) {
    case 'create':
      return kind === 'deposit' ? 'Deposit saved' : 'Withdrawal saved';
    case 'correct':
      return 'Entry updated';
    case 'delete':
      return 'Entry deleted';
  }
}

type MessageContext = {
  currency: CurrencyMetadata;
  // The goal's saved balance before this submit.
  balanceMinor: number;
  locale?: string;
};

function dateText(date: CivilDate, locale: string | undefined): string {
  return locale ? formatCivilDate(date, locale) : formatCivilDate(date);
}

export function ledgerCommandMessage(action: LedgerAction, error: LedgerCommandError, context: MessageContext): LedgerMessage {
  const money = (minor: number) => formatMoney(minor, context.currency, context.locale ? { locale: context.locale } : {});
  const plain = (field: EntryFormField | null, message: string): LedgerMessage => ({ field, message, ruleRejection: false });
  const rule = (field: EntryFormField | null, message: string): LedgerMessage => ({ field, message, ruleRejection: true });

  switch (error.code) {
    case 'negative_balance':
      if (action === 'delete') {
        return rule(null, 'Deleting this entry would take the balance below zero. Change or delete a withdrawal first.');
      }
      return rule(
        'amount',
        action === 'create'
          ? `A withdrawal can’t be more than the saved balance (${money(context.balanceMinor)}).`
          : `With this change the balance would go below zero. The saved balance is ${money(context.balanceMinor)}.`,
      );
    case 'negative_running_balance': {
      const day = dateText(error.date, context.locale);
      if (action === 'delete') {
        return rule(
          null,
          `Deleting this entry would leave the balance below zero on ${day}, because a later withdrawal relies on it. Change or delete that withdrawal first.`,
        );
      }
      return rule(
        'date',
        `The balance would go below zero on ${day}. Entries count in date order, so a withdrawal needs enough savings recorded on or before its date. Choose a later date or a smaller amount.`,
      );
    }
    case 'balance_limit':
      return rule(
        action === 'delete' ? null : 'amount',
        `This would take the balance above ${money(MAX_MINOR)}, the most one goal can record.`,
      );
    case 'future_date':
      return rule('date', 'Choose today or an earlier date. Entries can’t be dated in the future.');
    case 'invalid_date':
      return plain('date', 'Choose a valid date.');
    case 'invalid_amount':
      return plain('amount', 'Enter an amount greater than zero.');
    case 'invalid_kind':
      return plain(null, 'Choose Deposit or Withdrawal.');
    case 'note_too_long':
      return plain('note', `Use ${NOTE_MAX_LENGTH} characters or fewer.`);
    case 'note_invalid':
      return plain('note', 'Remove unsupported characters from the note.');
    case 'goal_closed':
      return plain(null, 'This goal is closed. Reopen it from Collection to add or change entries.');
    case 'stale_entry':
      return plain(null, 'This entry changed after you opened it. Close this form and open it again.');
    case 'entry_not_found':
      return plain(null, 'This entry no longer exists. Close this form to see the current history.');
    case 'goal_not_found':
    case 'invalid_reference':
      return plain(null, 'This goal couldn’t be found. Close this form and try again.');
    case 'currency_missing':
      return plain(null, 'Choose a currency in Settings before recording savings.');
    case 'currency_invalid':
      return plain(null, 'The saved currency can’t be read, so nothing was saved. Your records are unchanged.');
    case 'operation_conflict':
    case 'invalid_operation_id':
    case 'confirmation_required':
      return plain(null, 'This form can’t be saved again. Close it and start over.');
    case 'storage_failure':
      return plain(null, action === 'delete' ? ENTRY_DELETE_FAILED : ENTRY_SAVE_FAILED);
  }
}
