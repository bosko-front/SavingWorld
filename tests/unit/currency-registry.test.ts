import { CURRENCY_REGISTRY, getCurrency, isSupportedCurrency, supportedCurrencies } from '@/core/money';

// The bundled registry against ISO 4217 List One published 2026-09-17 (docs/evidence/PHASE_04.md).

describe('currency registry', () => {
  it('records its source and version', () => {
    expect(CURRENCY_REGISTRY).toEqual({
      version: 1,
      source: 'ISO 4217 List One, SIX Group',
      published: '2026-09-17',
    });
    for (const metadata of supportedCurrencies()) {
      expect(metadata.registryVersion).toBe(CURRENCY_REGISTRY.version);
    }
  });

  it('lists 155 distinct savings currencies with 0, 2 or 3 decimals', () => {
    const all = supportedCurrencies();
    expect(all).toHaveLength(155);
    expect(new Set(all.map((c) => c.code)).size).toBe(155);
    for (const metadata of all) {
      expect(metadata.code).toMatch(/^[A-Z]{3}$/);
      expect([0, 2, 3]).toContain(metadata.exponent);
    }
  });

  it.each([
    ['JPY', 0],
    ['KRW', 0],
    ['CLP', 0],
    ['ISK', 0],
    ['XOF', 0],
    ['EUR', 2],
    ['USD', 2],
    ['GBP', 2],
    ['CHF', 2],
    ['RSD', 2],
    ['BAM', 2],
    ['HUF', 2],
    ['XCG', 2],
    ['KWD', 3],
    ['BHD', 3],
    ['JOD', 3],
    ['OMR', 3],
    ['TND', 3],
    ['IQD', 3],
    ['LYD', 3],
  ])('%s has %s decimals', (code, exponent) => {
    expect(getCurrency(code)?.exponent).toBe(exponent);
  });

  it.each([
    'CLF', // fund, 4 decimals
    'UYW', // fund, 4 decimals
    'USN', // fund
    'XAU', // gold
    'XDR', // SDR, no minor unit
    'XTS', // testing code
    'XXX', // no currency
    'HRK', // withdrawn when Croatia adopted the euro
    'BGN', // withdrawn when Bulgaria adopted the euro
    'ANG', // replaced by XCG
    'eur', // codes are exact upper case
    '',
  ])('does not support %j', (code) => {
    expect(isSupportedCurrency(code)).toBe(false);
    expect(getCurrency(code)).toBeUndefined();
  });
});
