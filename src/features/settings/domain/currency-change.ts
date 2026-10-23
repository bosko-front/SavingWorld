import { MAX_MINOR, type CurrencyExponent } from '@/core/money';
import { err, ok, type Result } from '@/core/result';

// What a permitted global currency change does to existing goals (v1.2 section 3, DECISIONS D56).
// A change is only possible while no goal has a transaction, so only targets are affected. Nothing
// is converted: no exchange rate exists in the app. A target keeps the amount the person wrote, in
// the new currency's minor units: 1,000.00 EUR becomes 1,000 JPY or 1,000.000 KWD, never 100,000
// JPY. A target that the new currency cannot show exactly (1,000.50 EUR → JPY has no decimals) or
// that would pass the 10^12 ceiling is reported instead of rounded.

export type TargetRescaleError = 'not_representable' | 'too_large';

export function rescaleTarget(
  targetMinor: number,
  fromExponent: CurrencyExponent,
  toExponent: CurrencyExponent,
): Result<number, TargetRescaleError> {
  const target = BigInt(targetMinor);
  if (toExponent >= fromExponent) {
    const scaled = target * 10n ** BigInt(toExponent - fromExponent);
    return scaled > BigInt(MAX_MINOR) ? err('too_large') : ok(Number(scaled));
  }
  const divisor = 10n ** BigInt(fromExponent - toExponent);
  if (target % divisor !== 0n) {
    return err('not_representable');
  }
  return ok(Number(target / divisor));
}
