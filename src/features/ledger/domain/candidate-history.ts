import type { CivilDate } from '@/core/calendar';
import { MAX_MINOR, assertMinorAmount } from '@/core/money';
import { err, ok, type Result } from '@/core/result';

// Chronological balance rule (v1.2 section 3, docs/DATA_MODEL.md "Derived values"). A new entry, a
// correction or a deletion is checked against the goal's whole candidate history: entries ordered
// by entry date, then immutable createdAt, then id. Every running subtotal and the final balance
// must stay within 0..MAX_MINOR. A positive final total is not enough: a withdrawal dated before
// the first deposit, or deleting a deposit that a later withdrawal needed, is rejected even if a
// later deposit makes the end total positive. Sums run on BigInt.

export type HistoryEntry = {
  id: string;
  entryDate: CivilDate;
  createdAtUtc: string;
  signedAmountMinor: number;
};

export type HistoryViolation =
  // The final balance would be below zero.
  | { code: 'negative_balance'; balanceMinor: number }
  // The final balance is fine but the running balance dips below zero on `date`.
  | { code: 'negative_running_balance'; date: CivilDate }
  // A running balance would exceed the engineering ceiling.
  | { code: 'balance_limit'; date: CivilDate };

export function compareChronologically(a: HistoryEntry, b: HistoryEntry): number {
  if (a.entryDate !== b.entryDate) {
    return a.entryDate < b.entryDate ? -1 : 1;
  }
  if (a.createdAtUtc !== b.createdAtUtc) {
    return a.createdAtUtc < b.createdAtUtc ? -1 : 1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

// Validates a candidate history (any order) and returns its final balance.
export function validateCandidateHistory(entries: readonly HistoryEntry[]): Result<number, HistoryViolation> {
  const ordered = [...entries].sort(compareChronologically);
  const max = BigInt(MAX_MINOR);
  let running = 0n;
  let firstDip: CivilDate | null = null;
  for (const entry of ordered) {
    assertMinorAmount(entry.signedAmountMinor);
    running += BigInt(entry.signedAmountMinor);
    if (running > max) {
      return err({ code: 'balance_limit', date: entry.entryDate });
    }
    if (running < 0n && firstDip === null) {
      firstDip = entry.entryDate;
    }
  }
  if (running < 0n) {
    return err({ code: 'negative_balance', balanceMinor: Number(running) });
  }
  if (firstDip !== null) {
    return err({ code: 'negative_running_balance', date: firstDip });
  }
  return ok(Number(running));
}
