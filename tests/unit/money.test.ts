import {
  addMinor,
  DEFAULT_SEPARATORS,
  formatAmountInput,
  formatMoney,
  getCurrency,
  MAX_FORMAT_MINOR,
  MAX_MINOR,
  parseAmount,
  separatorsForLocale,
  signedAmount,
  sumMinor,
  toDecimalString,
  toMinorAmount,
  type CurrencyMetadata,
  type NumberSeparators,
} from '@/core/money';

// Expected minor units are written out by hand for each case (TEST_PLAN T01).

function currency(code: string): CurrencyMetadata {
  const metadata = getCurrency(code);
  if (!metadata) {
    throw new Error(`fixture currency ${code} missing from the registry`);
  }
  return metadata;
}

const EUR = currency('EUR');
const JPY = currency('JPY');
const KWD = currency('KWD');
const IQD = currency('IQD');

const EN: NumberSeparators = { decimal: '.', group: ',', grouping: 'thousands' };
const DE: NumberSeparators = { decimal: ',', group: '.', grouping: 'thousands' };
const FR: NumberSeparators = { decimal: ',', group: ' ', grouping: 'thousands' };
const CH: NumberSeparators = { decimal: '.', group: '’', grouping: 'thousands' };
const IN: NumberSeparators = { decimal: '.', group: ',', grouping: 'indian' };

describe('locale separators', () => {
  it.each([
    ['en-US', EN],
    ['de-DE', DE],
    ['fr-FR', FR],
    ['de-CH', CH],
    ['en-IN', IN],
    ['es-ES', DE],
  ])('reads %s', (locale, expected) => {
    expect(separatorsForLocale(locale)).toEqual(expected);
  });

  it('falls back to the default for an invalid locale tag', () => {
    expect(separatorsForLocale('not a locale!!')).toEqual(DEFAULT_SEPARATORS);
  });
});

describe('parseAmount', () => {
  it.each([
    // [text, separators, currency, expected minor units]
    ['12.34', EN, EUR, 1234],
    ['0.10', EN, EUR, 10],
    ['0.1', EN, EUR, 10],
    ['0.01', EN, EUR, 1],
    ['7', EN, EUR, 700],
    ['  7 ', EN, EUR, 700],
    ['1,234.50', EN, EUR, 123450],
    ['1,234,567.89', EN, EUR, 123456789],
    ['007.50', EN, EUR, 750],
    ['10000000000.00', EN, EUR, MAX_MINOR],
    ['10,000,000,000', EN, EUR, MAX_MINOR],
    ['1.234,56', DE, EUR, 123456],
    ['1234,56', DE, EUR, 123456],
    ['12,5', DE, EUR, 1250],
    ['1.000', DE, EUR, 100000],
    ['1 234,56', FR, EUR, 123456],
    ['1 234,56', FR, EUR, 123456],
    ['1 234,56', FR, EUR, 123456],
    ["1'234.50", CH, EUR, 123450],
    ['1’234.50', CH, EUR, 123450],
    ['1,23,456.78', IN, EUR, 12345678],
    ['12,345', IN, EUR, 1234500],
    // Zero decimals: yen has no minor unit below 1.
    ['1000', EN, JPY, 1000],
    ['1,000', EN, JPY, 1000],
    ['1.000', DE, JPY, 1000],
    ['1000000000000', EN, JPY, MAX_MINOR],
    // Three decimals: 1 fils is 0.001 KWD.
    ['1.250', EN, KWD, 1250],
    ['1.25', EN, KWD, 1250],
    ['0.001', EN, KWD, 1],
    ['1000000000.000', EN, KWD, MAX_MINOR],
    ['1,5', DE, KWD, 1500],
  ])('reads %j (%#) exactly', (text, separators, money, expected) => {
    expect(parseAmount(text, money.exponent, separators)).toEqual({ ok: true, value: expected });
  });

  it.each([
    ['', EN, EUR, 'empty'],
    ['   ', EN, EUR, 'empty'],
    ['-5', EN, EUR, 'signed'],
    ['+5', EN, EUR, 'signed'],
    ['−5', EN, EUR, 'signed'],
    // Exponent notation and non-finite values
    ['1e3', EN, EUR, 'invalid_character'],
    ['1E3', EN, EUR, 'invalid_character'],
    ['1.5e2', EN, EUR, 'invalid_character'],
    ['Infinity', EN, EUR, 'invalid_character'],
    ['-Infinity', EN, EUR, 'signed'],
    ['NaN', EN, EUR, 'invalid_character'],
    ['0x10', EN, EUR, 'invalid_character'],
    ['€5', EN, EUR, 'invalid_character'],
    ['5 EUR', EN, EUR, 'invalid_character'],
    ['1 234', EN, EUR, 'invalid_character'],
    ['١٢', EN, EUR, 'invalid_character'],
    ['１２', EN, EUR, 'invalid_character'],
    ['1 234.56', FR, EUR, 'invalid_character'],
    ['1,234.50', CH, EUR, 'invalid_character'],
    // Structure
    ['1.2.3', EN, EUR, 'malformed'],
    ['12.', EN, EUR, 'malformed'],
    ['.5', EN, EUR, 'malformed'],
    ['12,', DE, EUR, 'malformed'],
    // Grouping that does not match the locale
    ['1,5', EN, EUR, 'malformed_grouping'],
    ['1,23', EN, EUR, 'malformed_grouping'],
    ['1,2345', EN, EUR, 'malformed_grouping'],
    ['1234,567', EN, EUR, 'malformed_grouping'],
    [',123', EN, EUR, 'malformed_grouping'],
    ['1,,234', EN, EUR, 'malformed_grouping'],
    ['1,234,', EN, EUR, 'malformed_grouping'],
    ['1.234,5', EN, EUR, 'malformed_grouping'],
    ['12.5', DE, EUR, 'malformed_grouping'],
    ['1,234.56', DE, EUR, 'malformed_grouping'],
    ['1,234,567', IN, EUR, 'malformed_grouping'],
    ['123,456', IN, EUR, 'malformed_grouping'],
    ['1,00', EN, JPY, 'malformed_grouping'],
    // Extra decimals are rejected, never rounded, even when they are zeros
    ['12.345', EN, EUR, 'too_many_decimals'],
    ['12.340', EN, EUR, 'too_many_decimals'],
    ['1000.0', EN, JPY, 'too_many_decimals'],
    ['1.5', EN, JPY, 'too_many_decimals'],
    ['1,000', DE, JPY, 'too_many_decimals'],
    ['1.2505', EN, KWD, 'too_many_decimals'],
    // Positive amounts only
    ['0', EN, EUR, 'not_positive'],
    ['0.00', EN, EUR, 'not_positive'],
    ['000', EN, JPY, 'not_positive'],
    // Storage ceiling
    ['10000000000.01', EN, EUR, 'too_large'],
    ['1000000000001', EN, JPY, 'too_large'],
    ['1000000000.001', EN, KWD, 'too_large'],
    ['99999999999999999999999', EN, EUR, 'too_large'],
  ])('rejects %j (%#)', (text, separators, money, expected) => {
    expect(parseAmount(text, money.exponent, separators)).toEqual({ ok: false, error: expected });
  });

  it('gives the same answer every time for the same text', () => {
    const first = parseAmount('1.234,5', 2, EN);
    expect(first).toEqual({ ok: false, error: 'malformed_grouping' });
    expect(parseAmount('1.234,5', 2, EN)).toEqual(first);
  });
});

describe('checked sums', () => {
  it('adds 0.10 and 0.20 to exactly 0.30', () => {
    const a = parseAmount('0.10', EUR.exponent, EN);
    const b = parseAmount('0.20', EUR.exponent, EN);
    if (!a.ok || !b.ok) {
      throw new Error('fixture amounts must parse');
    }
    expect(sumMinor([a.value, b.value])).toBe(30n);
  });

  it('derives a balance from signed entries: 0 + 50 - 20 = 30', () => {
    const entries = [signedAmount('deposit', 5000), signedAmount('withdrawal', 2000)];
    expect(entries).toEqual([5000, -2000]);
    expect(sumMinor(entries)).toBe(3000n);
  });

  it('sums beyond the storage ceiling exactly and refuses to store the result', () => {
    const total = sumMinor([MAX_MINOR, MAX_MINOR, MAX_MINOR]);
    expect(total).toBe(3_000_000_000_000n);
    expect(toMinorAmount(total)).toEqual({ ok: false, error: 'out_of_range' });
    expect(toMinorAmount(BigInt(MAX_MINOR))).toEqual({ ok: true, value: MAX_MINOR });
    expect(toMinorAmount(-BigInt(MAX_MINOR) - 1n)).toEqual({ ok: false, error: 'out_of_range' });
  });

  it('checks a single addition against the ceiling', () => {
    expect(addMinor(MAX_MINOR, 1)).toEqual({ ok: false, error: 'out_of_range' });
    expect(addMinor(MAX_MINOR, -1)).toEqual({ ok: true, value: MAX_MINOR - 1 });
    expect(addMinor(-MAX_MINOR, -1)).toEqual({ ok: false, error: 'out_of_range' });
  });

  it('rejects values that are not stored amounts', () => {
    expect(() => sumMinor([0.1])).toThrow(RangeError);
    expect(() => sumMinor([Number.NaN])).toThrow(RangeError);
    expect(() => sumMinor([Number.POSITIVE_INFINITY])).toThrow(RangeError);
    expect(() => sumMinor([MAX_MINOR + 1])).toThrow(RangeError);
    expect(() => signedAmount('deposit', 0)).toThrow(RangeError);
    expect(() => signedAmount('withdrawal', -5)).toThrow(RangeError);
  });
});

describe('formatting', () => {
  it.each([
    [123450, 2, '1234.50'],
    [-5, 2, '-0.05'],
    [0, 2, '0.00'],
    [7, 0, '7'],
    [1, 3, '0.001'],
    [-1250, 3, '-1.250'],
    [MAX_MINOR, 2, '10000000000.00'],
    [10n ** 15n, 3, '1000000000000.000'],
  ] as const)('writes %s with exponent %s as %s', (minor, exponent, expected) => {
    expect(toDecimalString(minor, exponent)).toBe(expected);
  });

  it('uses the currency exponent, not Intl defaults', () => {
    expect(formatMoney(123450, EUR, { locale: 'en-US' })).toBe('€1,234.50');
    expect(formatMoney(123450, EUR, { locale: 'de-DE' })).toBe('1.234,50 €');
    expect(formatMoney(123456, JPY, { locale: 'en-US' })).toBe('¥123,456');
    expect(formatMoney(1250, KWD, { locale: 'en-US' })).toBe('KWD 1.250');
    // CLDR shows IQD with 0 decimals; ISO 4217 (and the stored minor units) use 3.
    expect(formatMoney(1234, IQD, { locale: 'en-US' })).toBe('IQD 1.234');
  });

  it('shows an explicit sign for history rows', () => {
    expect(formatMoney(500, EUR, { locale: 'en-US', signDisplay: 'exceptZero' })).toBe('+€5.00');
    expect(formatMoney(-500, EUR, { locale: 'en-US', signDisplay: 'exceptZero' })).toBe('-€5.00');
  });

  it('never changes the stored digits, up to the formatting bound', () => {
    // Deterministic pseudo-random values plus edge values for every exponent.
    let seed = 20261023;
    const next = () => {
      // Park-Miller generator: every product stays below 2^53.
      seed = (seed * 48271) % 2147483647;
      return seed;
    };
    const values = [1, 9, 10, 99, 101, 999_999, 1_000_001, 2_334, MAX_MINOR - 1, MAX_MINOR, MAX_FORMAT_MINOR - 1, MAX_FORMAT_MINOR];
    for (let i = 0; i < 400; i += 1) {
      values.push((next() * 466_000 + next()) % MAX_FORMAT_MINOR);
    }
    for (const money of [JPY, EUR, KWD]) {
      for (const value of values) {
        for (const signed of [value, -value]) {
          const shown = formatMoney(signed, money, { locale: 'en-US' }).replace(/[^\d]/g, '');
          const exact = toDecimalString(signed, money.exponent).replace(/[^\d]/g, '');
          expect(shown).toBe(exact);
        }
      }
    }
  });

  it('refuses values it could not show exactly', () => {
    expect(() => formatMoney(10n ** 15n + 1n, EUR)).toThrow(RangeError);
    expect(() => formatMoney(0.5, EUR)).toThrow(RangeError);
    expect(() => formatMoney(Number.MAX_SAFE_INTEGER + 2, EUR)).toThrow(RangeError);
  });

  it('prefills edit fields with text that parses back to the same amount', () => {
    const amounts = [1, 5, 10, 99, 100, 2_334, 123_456, MAX_MINOR];
    for (const separators of [EN, DE, FR, CH, IN]) {
      for (const money of [JPY, EUR, KWD]) {
        for (const amount of amounts) {
          const text = formatAmountInput(amount, money.exponent, separators);
          expect(parseAmount(text, money.exponent, separators)).toEqual({ ok: true, value: amount });
        }
      }
    }
    expect(formatAmountInput(123450, 2, DE)).toBe('1234,50');
    expect(() => formatAmountInput(0, 2, EN)).toThrow(RangeError);
  });
});
