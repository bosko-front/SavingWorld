import type { CurrencyExponent, CurrencyMetadata } from './currency';
import { MAX_MINOR } from './minor-units';
import type { NumberSeparators } from './separators';

// Display of exact minor units. Formatting never changes a stored value: the digits shown are the
// digits stored, with exactly the currency's exponent as decimals (Intl's own currency digits are
// overridden, because CLDR and ISO 4217 disagree for some codes, for example IQD).

// Largest magnitude formatMoney accepts: any integer up to 10^15 has at most 15 significant
// digits, so dividing it by 10^exponent as a double and letting Intl round to `exponent` decimals
// reproduces the exact decimal digits. Single amounts stop at MAX_MINOR; all-goal statistics may
// go above it and stay exact up to this bound.
export const MAX_FORMAT_MINOR = 1_000_000_000_000_000;

// Exact plain decimal text: -123450 with exponent 2 → "-1234.50". No grouping or symbol; for
// tests, logs of non-financial fixtures and as the source of truth for formatted digits.
export function toDecimalString(minor: number | bigint, exponent: CurrencyExponent): string {
  const value = toBigInt(minor);
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().padStart(exponent + 1, '0');
  const integer = digits.slice(0, digits.length - exponent);
  const fraction = digits.slice(digits.length - exponent);
  return `${negative ? '-' : ''}${integer}${exponent > 0 ? `.${fraction}` : ''}`;
}

export type FormatMoneyOptions = {
  locale?: string;
  // 'exceptZero' shows "+€5.00" / "-€5.00" for history rows; colour alone never carries the sign.
  signDisplay?: 'auto' | 'exceptZero' | 'never';
};

// Localized currency text such as "€1,234.50", "1.234,50 €", "¥1,235", "KWD 1.250".
export function formatMoney(minor: number | bigint, currency: CurrencyMetadata, options: FormatMoneyOptions = {}): string {
  const value = toBigInt(minor);
  const bound = BigInt(MAX_FORMAT_MINOR);
  if (value > bound || value < -bound) {
    throw new RangeError(`cannot format more than ${MAX_FORMAT_MINOR} minor units exactly`);
  }
  const formatter = new Intl.NumberFormat(options.locale, {
    style: 'currency',
    currency: currency.code,
    numberingSystem: 'latn',
    minimumFractionDigits: currency.exponent,
    maximumFractionDigits: currency.exponent,
    signDisplay: options.signDisplay ?? 'auto',
  });
  return formatter.format(Number(value) / 10 ** currency.exponent);
}

// Text that prefills an amount field when editing an entry or target. It uses the locale decimal
// separator and no grouping, so parseAmount reads it back to the same minor units.
export function formatAmountInput(amountMinor: number, exponent: CurrencyExponent, separators: NumberSeparators): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || amountMinor > MAX_MINOR) {
    throw new RangeError('an input amount must be a positive stored amount');
  }
  return toDecimalString(amountMinor, exponent).replace('.', separators.decimal);
}

function toBigInt(minor: number | bigint): bigint {
  if (typeof minor === 'bigint') {
    return minor;
  }
  if (!Number.isSafeInteger(minor)) {
    throw new RangeError('minor units must be a safe integer');
  }
  return BigInt(minor);
}
