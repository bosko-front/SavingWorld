import { getLocales } from 'expo-localization';

import { civilDateParts, type CivilDate } from '@/core/calendar';
import { separatorsForLocale, type NumberSeparators } from '@/core/money';

// Device locale for number and date formatting (docs/UI_UX_GUIDELINES.md "Accessibility and
// localization"). The interface is English: numbers follow the person's region, dates and times
// follow only its order and clock style, in English words (D136). Read at the moment of formatting,
// so a region change applies on the next render.

const FALLBACK_LOCALE = 'en-US';

export function deviceLocale(): string {
  return getLocales()[0]?.languageTag ?? FALLBACK_LOCALE;
}

// Separators for typed amounts. They must match the decimal key of the iOS number keyboard, which
// follows the device region's number format (Settings › Language & Region), not the language tag:
// with English and region Serbia the key is "," while Intl for the tag may say ".". Typing "12,345"
// must then mean 12.345, never 12,345. The region's own separators therefore win; the tag still
// decides the grouping style (thousands or Indian).
export function deviceSeparators(): NumberSeparators {
  const locale = getLocales()[0];
  return regionSeparators(
    separatorsForLocale(locale?.languageTag ?? FALLBACK_LOCALE),
    locale?.decimalSeparator ?? null,
    locale?.digitGroupingSeparator ?? null,
  );
}

const DIGIT = /[0-9]/;

export function regionSeparators(base: NumberSeparators, decimal: string | null, group: string | null): NumberSeparators {
  if (!decimal || decimal.length !== 1 || DIGIT.test(decimal)) {
    return base;
  }
  const regionGroup = group && group !== decimal && !DIGIT.test(group) ? group : null;
  const fallbackGroup = base.group !== decimal ? base.group : '';
  return { decimal, group: regionGroup ?? fallbackGroup, grouping: base.grouping };
}

// The region's currency, used only to preselect a choice in onboarding.
export function deviceCurrencyCode(): string | null {
  return getLocales()[0]?.currencyCode ?? null;
}

// The interface is English, so dates read in English too ("23 Oct 2026", never "23. Okt. 2026"
// inside an English sentence; owner choice D136). Only the order follows the device: day first
// (en-GB style) where the device language writes the day before the month, otherwise month first
// (en-US). English tags keep their own style (en-GB, en-IN, en-AU…). Found by formatting a known date,
// which works on every engine (Hermes included) without formatToParts.
export function englishDateLocale(locale: string = deviceLocale()): string {
  if (/^en(-|$)/i.test(locale)) {
    return locale;
  }
  try {
    const text = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', day: 'numeric', month: 'numeric', numberingSystem: 'latn' }).format(
      Date.UTC(2026, 9, 23),
    );
    const day = text.indexOf('23');
    const month = text.indexOf('10');
    if (day >= 0 && month >= 0) {
      return day < month ? 'en-GB' : 'en-US';
    }
  } catch {
    // An unusable tag falls back below.
  }
  return FALLBACK_LOCALE;
}

// English time ("6:00 PM" or "18:00") in the device language's clock style (D136).
export function englishTimeLocale(locale: string = deviceLocale()): string {
  if (/^en(-|$)/i.test(locale)) {
    return locale;
  }
  try {
    const text = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', hour: 'numeric', numberingSystem: 'latn' }).format(Date.UTC(2026, 0, 4, 18));
    return text.includes('18') ? 'en-GB' : 'en-US';
  } catch {
    return FALLBACK_LOCALE;
  }
}

// "23 Oct 2026" style text for a civil date. Formatted in UTC from its own parts, so the device
// time zone can never move it to another day.
export function formatCivilDate(date: CivilDate, locale: string = deviceLocale()): string {
  const { year, month, day } = civilDateParts(date);
  return new Intl.DateTimeFormat(englishDateLocale(locale), { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(
    Date.UTC(year, month - 1, day),
  );
}

// "6:00 PM" or "18:00" for a wall-clock time, in the person's clock style. Formatted in UTC from
// its own parts, so no zone can move it.
export function formatClockTime(hour: number, minute: number, locale: string = deviceLocale()): string {
  return new Intl.DateTimeFormat(englishTimeLocale(locale), { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' }).format(
    Date.UTC(2026, 0, 4, hour, minute),
  );
}
