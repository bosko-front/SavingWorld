import type { CurrencyMetadata } from '@/core/money';

import type { SetCurrencyError } from '../application/currency-commands';

// English copy for the global currency choice and its lock (v1.2 section 3). Errors appear inline
// in Settings or onboarding, never as a toast.

export const CURRENCY_LOCK_EXPLANATION =
  'The currency is locked while any goal has a saved transaction or a souvenir. Every goal uses this one currency; amounts are never converted.';

export function noConversionMessage(from: CurrencyMetadata, to: CurrencyMetadata, goalCount: number): string {
  const goals =
    goalCount === 0
      ? 'You have no goals yet.'
      : goalCount === 1
        ? `Your goal keeps its target number and uses ${to.code} instead of ${from.code}.`
        : `Your ${goalCount} goals keep their target numbers and use ${to.code} instead of ${from.code}.`;
  return `Amounts are not converted: there is no exchange rate in Saving Worlds. ${goals}`;
}

export function currencyErrorMessage(
  error: SetCurrencyError,
  currency: CurrencyMetadata | null,
  goalTitle: (goalId: string) => string,
): string {
  switch (error.code) {
    case 'currency_locked':
      return 'A transaction or souvenir now exists, so the currency stays as it is. Every goal keeps using it.';
    case 'target_not_representable':
      return currency
        ? `“${goalTitle(error.goalId)}” has a target that ${currency.code} can’t show exactly (${currency.code} ${currency.exponent === 0 ? 'has no decimals' : `has ${currency.exponent} decimal places`}). Edit that goal’s target first.`
        : 'A goal target can’t be shown exactly in this currency. Edit that goal’s target first.';
    case 'target_too_large':
      return `“${goalTitle(error.goalId)}” would have a target above the largest amount the app supports. Edit that goal’s target first.`;
    case 'unsupported_currency':
      return 'This currency isn’t supported. Choose another one.';
    case 'operation_conflict':
    case 'invalid_operation_id':
      return 'This choice can’t be saved again. Leave this screen and try again.';
    case 'storage_failure':
      return 'Couldn’t save. Nothing was changed. Try again.';
  }
}
