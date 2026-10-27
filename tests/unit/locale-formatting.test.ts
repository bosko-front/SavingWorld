import { civilDateFromParts } from '@/core/calendar';
import { formatMoney, getCurrency, parseAmount, separatorsForLocale, toDecimalString, type CurrencyMetadata } from '@/core/money';
import { formatCivilDate, formatClockTime } from '@/shared/i18n/locale';

// Phase 19: numbers and dates in other locales (the interface stays English). The stored minor units
// never change; only separators, symbol position and date order follow the locale.

const currency = (code: string) => getCurrency(code) as CurrencyMetadata;
const digits = (text: string) => text.replace(/[^0-9]/g, '');
// ICU versions differ in which no-break space they put between number and symbol or time and
// AM/PM; compare those as plain spaces.
const plain = (text: string) => text.replace(/[\u00a0\u202f]/g, ' ');
const LOCALES = ['en-US', 'de-DE', 'fr-FR', 'en-GB'] as const;

describe('money in several locales', () => {
  it('formats the same stored amount with each locale’s separators', () => {
    expect(plain(formatMoney(123450, currency('EUR'), { locale: 'en-US' }))).toBe('€1,234.50');
    expect(plain(formatMoney(123450, currency('EUR'), { locale: 'de-DE' }))).toBe('1.234,50 €');
    expect(plain(formatMoney(123450, currency('EUR'), { locale: 'fr-FR' }))).toBe('1 234,50 €');
    expect(plain(formatMoney(123450, currency('GBP'), { locale: 'en-GB' }))).toBe('£1,234.50');
  });

  it('shows exactly the registry exponent: 0, 2 and 3 decimals', () => {
    for (const locale of LOCALES) {
      const jpy = formatMoney(123456, currency('JPY'), { locale });
      const eur = formatMoney(123456, currency('EUR'), { locale });
      const kwd = formatMoney(123456, currency('KWD'), { locale });
      expect(digits(jpy)).toBe('123456');
      expect(digits(eur)).toBe('123456');
      expect(digits(kwd)).toBe('123456');
      expect(/[.,]\d+\D*$/.test(jpy.replace(/[\s  ]/g, '').replace(/\d{3}(?=\D*$)/, ''))).toBe(false);
      expect(/[.,](\d{2})\D*$/.exec(eur)?.[1]).toBe('56');
      expect(/[.,](\d{3})\D*$/.exec(kwd)?.[1]).toBe('456');
    }
  });

  it('puts an explicit sign on history amounts in every locale without relying on Intl signDisplay', () => {
    expect(plain(formatMoney(500, currency('EUR'), { locale: 'en-US', signDisplay: 'exceptZero' }))).toBe('+€5.00');
    expect(plain(formatMoney(-500, currency('EUR'), { locale: 'en-US', signDisplay: 'exceptZero' }))).toBe('-€5.00');
    expect(plain(formatMoney(500, currency('EUR'), { locale: 'de-DE', signDisplay: 'exceptZero' }))).toBe('+5,00 €');
    expect(plain(formatMoney(-500, currency('EUR'), { locale: 'de-DE', signDisplay: 'exceptZero' }))).toBe('-5,00 €');
    expect(plain(formatMoney(0, currency('EUR'), { locale: 'en-US', signDisplay: 'exceptZero' }))).toBe('€0.00');
    expect(plain(formatMoney(-500, currency('EUR'), { locale: 'en-US', signDisplay: 'never' }))).toBe('€5.00');
  });

  it('keeps the sign when the engine ignores signDisplay (Hermes on iOS)', () => {
    const RealNumberFormat = Intl.NumberFormat;
    const spy = jest.spyOn(Intl, 'NumberFormat').mockImplementation((locale, options) => {
      const { signDisplay: _ignored, ...rest } = options ?? {};
      return new RealNumberFormat(locale, rest);
    });
    try {
      expect(plain(formatMoney(500, currency('EUR'), { locale: 'en-US', signDisplay: 'exceptZero' }))).toBe('+€5.00');
    } finally {
      spy.mockRestore();
    }
  });

  it('reads typed text back to the same minor units in each locale', () => {
    for (const locale of LOCALES) {
      const separators = separatorsForLocale(locale);
      const typed = `1${separators.group}234${separators.decimal}50`;
      const parsed = parseAmount(typed, 2, separators);
      expect(parsed.ok && toDecimalString(parsed.value, 2)).toBe('1234.50');
    }
  });
});

describe('dates and times in several locales', () => {
  const date = civilDateFromParts({ year: 2026, month: 10, day: 23 });

  it('writes dates in English in the device language’s day/month order (D136)', () => {
    expect(formatCivilDate(date, 'en-US')).toBe('Oct 23, 2026');
    expect(formatCivilDate(date, 'en-GB')).toBe('23 Oct 2026');
    expect(formatCivilDate(date, 'de-DE')).toBe('23 Oct 2026');
    expect(formatCivilDate(date, 'fr-FR')).toBe('23 Oct 2026');
    expect(formatCivilDate(date, 'sr-Latn-RS')).toBe('23 Oct 2026');
    expect(formatCivilDate(date, 'ja-JP')).toBe('Oct 23, 2026');
    expect(formatCivilDate(date, 'not a tag')).toBe('Oct 23, 2026');
  });

  it('writes the reminder time in English, 12- or 24-hour as the device language does', () => {
    expect(plain(formatClockTime(18, 0, 'en-US'))).toBe('6:00 PM');
    expect(plain(formatClockTime(18, 0, 'en-GB'))).toBe('18:00');
    expect(plain(formatClockTime(18, 0, 'de-DE'))).toBe('18:00');
    expect(plain(formatClockTime(18, 0, 'ko-KR'))).toBe('6:00 PM');
  });
});
