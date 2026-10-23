import { remainingMinor } from '../progression/stage';

import { compareCivilDates, inclusiveDayCount, type CivilDate } from './civil-date';

// The optional deadline pace (v1.2 section 7, docs/DATA_MODEL.md "Exact deadline estimate").
// R = max(0, T − B); D = calendar days from today through the deadline, both included, so D ≥ 1
// for an unexpired deadline:
//
//   weekly  = min(R, ceil(R × 7 / D))
//   monthly = min(R, ceil(R × 30 / D))
//
// Rounded up to the minor unit. Two alternative approximate paces, not a schedule of deposits,
// a forecast or advice; nothing here creates or plans an entry.

export type DeadlineEstimate =
  // No deadline: no estimate.
  | { kind: 'none' }
  // R = 0, with any deadline (past or future): zero pace and never Overdue.
  | { kind: 'funded'; weeklyMinor: 0; monthlyMinor: 0 }
  // Deadline before today and R > 0: show Overdue and the remaining amount, no division.
  | { kind: 'overdue'; remainingMinor: number }
  // Deadline today or later and R > 0.
  | { kind: 'pace'; remainingMinor: number; days: number; weeklyMinor: number; monthlyMinor: number };

export type DeadlineEstimateInput = {
  balanceMinor: number;
  targetMinor: number;
  deadline: CivilDate | null;
  // Today's civil date from the injected clock, read once by the caller.
  today: CivilDate;
};

export function deadlineEstimate({ balanceMinor, targetMinor, deadline, today }: DeadlineEstimateInput): DeadlineEstimate {
  const remaining = remainingMinor(balanceMinor, targetMinor);
  if (deadline === null) {
    return { kind: 'none' };
  }
  if (remaining === 0) {
    return { kind: 'funded', weeklyMinor: 0, monthlyMinor: 0 };
  }
  if (compareCivilDates(deadline, today) < 0) {
    return { kind: 'overdue', remainingMinor: remaining };
  }
  const days = inclusiveDayCount(today, deadline);
  return {
    kind: 'pace',
    remainingMinor: remaining,
    days,
    weeklyMinor: paceMinor(remaining, 7, days),
    monthlyMinor: paceMinor(remaining, 30, days),
  };
}

// min(R, ceil(R × periodDays / D)) on BigInt.
function paceMinor(remaining: number, periodDays: number, days: number): number {
  const r = BigInt(remaining);
  const d = BigInt(days);
  const pace = (r * BigInt(periodDays) + d - 1n) / d;
  return Number(pace < r ? pace : r);
}
