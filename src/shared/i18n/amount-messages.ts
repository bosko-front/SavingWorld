import { formatMoney, MAX_MINOR, type AmountParseError, type CurrencyMetadata, type NumberSeparators } from '@/core/money';

// English messages for an amount the strict parser rejected (DECISIONS D50: forms explain every
// error code). They name the global currency's own rules and the separators the device keyboard
// types. `subject` words the empty/zero cases for the field: a goal target or a ledger entry.
export type AmountSubject = 'target' | 'entry';

export function amountMessage(
  error: AmountParseError,
  currency: CurrencyMetadata,
  separators: NumberSeparators,
  subject: AmountSubject,
): string {
  switch (error) {
    case 'empty':
      return subject === 'target' ? 'Enter a target amount.' : 'Enter an amount.';
    case 'signed':
      return subject === 'target'
        ? 'Enter the amount without a plus or minus sign.'
        : 'Enter the amount without a plus or minus sign. Choose Deposit or Withdrawal instead.';
    case 'invalid_character':
      return currency.exponent === 0
        ? 'Use digits only.'
        : `Use digits, with “${separators.decimal}” before the decimals.`;
    case 'malformed':
      return 'This amount looks incomplete. Check the digits around the decimal separator.';
    case 'malformed_grouping':
      return separators.group === ''
        ? 'Remove the digit grouping and enter the digits only.'
        : `Group digits in threes with “${separators.group}”, or leave the grouping out.`;
    case 'too_many_decimals':
      return currency.exponent === 0
        ? `${currency.code} amounts have no decimals.`
        : `${currency.code} amounts have at most ${currency.exponent} decimal places.`;
    case 'not_positive':
      return subject === 'target' ? 'Enter a target greater than zero.' : 'Enter an amount greater than zero.';
    case 'too_large':
      return `Enter at most ${formatMoney(MAX_MINOR, currency)}.`;
  }
}
