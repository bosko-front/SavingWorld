import { ISO_4217_CURRENCIES, ISO_4217_PUBLISHED } from './iso-4217';

// Supported global currencies and their minor-unit exponents. The exponent decides how many
// decimals an amount may have: 0 for JPY, 2 for EUR, 3 for KWD. Never assume cents.
//
// AppSettings stores the code together with the exponent and this registry version, so a later
// registry change cannot silently reinterpret saved minor units (docs/DATA_MODEL.md).
export const CURRENCY_REGISTRY = {
  // Bump when the bundled list or any exponent changes, and record the change in DECISIONS.
  version: 1,
  source: 'ISO 4217 List One, SIX Group',
  published: ISO_4217_PUBLISHED,
} as const;

export type CurrencyExponent = 0 | 2 | 3;

export type CurrencyMetadata = {
  code: string;
  numericCode: number;
  exponent: CurrencyExponent;
  name: string;
  registryVersion: number;
};

const byCode: ReadonlyMap<string, CurrencyMetadata> = new Map(
  ISO_4217_CURRENCIES.map(([code, numericCode, exponent, name]) => [
    code,
    { code, numericCode, exponent, name, registryVersion: CURRENCY_REGISTRY.version },
  ]),
);

// Exact, case-sensitive lookup of an ISO alphabetic code. Unsupported codes (funds, metals, test
// codes, withdrawn currencies such as HRK) return undefined and must fail validation.
export function getCurrency(code: string): CurrencyMetadata | undefined {
  return byCode.get(code);
}

export function isSupportedCurrency(code: string): boolean {
  return byCode.has(code);
}

// Every supported currency, ordered by code.
export function supportedCurrencies(): CurrencyMetadata[] {
  return [...byCode.values()];
}
