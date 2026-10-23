// Locale number separators for amount text. The parser takes them as explicit input, so its
// behavior is fixed by (text, separators, exponent) and testable for any locale; only this helper
// asks Intl what a locale uses.

export type DigitGrouping = 'thousands' | 'indian';

export type NumberSeparators = {
  decimal: string;
  // Empty when the locale writes large numbers without grouping.
  group: string;
  // 1,234,567 (thousands) or 12,34,567 (Indian lakh/crore grouping).
  grouping: DigitGrouping;
};

export const DEFAULT_SEPARATORS: NumberSeparators = { decimal: '.', group: ',', grouping: 'thousands' };

// Separators for a BCP 47 locale such as 'en-US', 'de-DE', 'fr-FR', 'de-CH' or 'en-IN'. Uses
// Latin digits whatever the locale's native numbering system, matching formatMoney. Falls back to
// DEFAULT_SEPARATORS if the engine returns a shape this parser does not understand.
export function separatorsForLocale(locale: string): NumberSeparators {
  let sample: string;
  try {
    sample = new Intl.NumberFormat(locale, {
      numberingSystem: 'latn',
      useGrouping: true,
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(1234567.5);
  } catch {
    // An invalid locale tag is a caller error at a device boundary; keep amount entry usable.
    return DEFAULT_SEPARATORS;
  }

  const indian = separatorsFrom(/^12(\D)34\1(?:567)(\D)5$/.exec(sample), 'indian');
  return indian ?? separatorsFrom(/^1(\D?)234\1(?:567)(\D)5$/.exec(sample), 'thousands') ?? DEFAULT_SEPARATORS;
}

function separatorsFrom(match: RegExpExecArray | null, grouping: DigitGrouping): NumberSeparators | null {
  const group = match?.[1];
  const decimal = match?.[2];
  if (group === undefined || decimal === undefined || group === decimal) {
    return null;
  }
  return { decimal, group, grouping };
}
