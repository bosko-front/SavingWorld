import { err, ok, type Result } from '../result';

// Exact money arithmetic (docs/DATA_MODEL.md "Money and date types"). Amounts are integer minor
// units of the one global currency, stored as JavaScript numbers that are always safe integers.
// Sums, products and comparisons that could leave that range run on BigInt; a result goes back to
// a number only through a checked conversion. No float ever takes part in a financial value.

// Engineering ceiling for a single amount, a target and a goal's current balance.
export const MAX_MINOR = 1_000_000_000_000;
const MAX_MINOR_BIG = BigInt(MAX_MINOR);

export type EntryKind = 'deposit' | 'withdrawal';

// A stored or computed amount: a safe integer within ±MAX_MINOR. Signed, because ledger entries
// store withdrawals as negative values.
export function isMinorAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && Math.abs(value) <= MAX_MINOR;
}

// A target or a user-entered entry amount: 1..MAX_MINOR.
export function isPositiveMinorAmount(value: unknown): value is number {
  return isMinorAmount(value) && value > 0;
}

export function assertMinorAmount(value: number, label = 'amount'): void {
  if (!isMinorAmount(value)) {
    throw new RangeError(`${label} must be a safe integer within ±${MAX_MINOR} minor units`);
  }
}

export function assertPositiveMinorAmount(value: number, label = 'amount'): void {
  if (!isPositiveMinorAmount(value)) {
    throw new RangeError(`${label} must be a positive integer of at most ${MAX_MINOR} minor units`);
  }
}

// The stored signed value of an entry: the kind decides the sign, the entered amount is positive.
export function signedAmount(kind: EntryKind, amountMinor: number): number {
  assertPositiveMinorAmount(amountMinor);
  return kind === 'deposit' ? amountMinor : -amountMinor;
}

// Exact sum of stored amounts. Callers decide what range the total may have: a goal balance is
// checked with toMinorAmount, an all-goal statistic may legitimately exceed MAX_MINOR.
export function sumMinor(values: Iterable<number>): bigint {
  let total = 0n;
  for (const value of values) {
    assertMinorAmount(value);
    total += BigInt(value);
  }
  return total;
}

export type MinorRangeError = 'out_of_range';

// Checked conversion of an exact intermediate back to a storable amount.
export function toMinorAmount(value: bigint): Result<number, MinorRangeError> {
  if (value > MAX_MINOR_BIG || value < -MAX_MINOR_BIG) {
    return err('out_of_range');
  }
  return ok(Number(value));
}

// Checked a + b, for example a balance after one more entry.
export function addMinor(a: number, b: number): Result<number, MinorRangeError> {
  assertMinorAmount(a);
  assertMinorAmount(b);
  return toMinorAmount(BigInt(a) + BigInt(b));
}
