import { daysBetween, type CivilDate } from './civil-date';
import { deadlineEstimate, type DeadlineEstimate, type DeadlineEstimateInput } from './deadline-estimate';

// Home's savings plan (owner decision D84) on top of the unchanged v1.2 deadline pace: when the
// deadline is, how much is still needed, and at most one per-period amount that is honest to
// suggest. Pure, like the estimate.
//
// A weekly or monthly amount is suggested only when the time left spans at least two of those
// periods (D ≥ 14 days for a week, D ≥ 60 for a month; D counts today and the deadline as in
// v1.2). With less time the v1.2 pace collapses to (almost) the whole remaining amount, which would
// read like a recurring plan that cannot exist. The month is preferred when it fits, the week
// otherwise; the amounts themselves are exactly `deadlineEstimate`'s.

export type DeadlineTiming =
  // Calendar days from today to the deadline (tomorrow is 1).
  | { kind: 'ahead'; daysLeft: number }
  | { kind: 'today' }
  | { kind: 'passed' };

export type PacePeriod = 'week' | 'month';

export type SuggestedPace = { period: PacePeriod; amountMinor: number; days: number };

export type SavingsPlan =
  // No deadline: no plan.
  | { kind: 'none' }
  // Nothing left to save (B ≥ T), whatever the date.
  | { kind: 'complete'; deadline: CivilDate; timing: DeadlineTiming }
  // Money still to go; `pace` is null when no per-period amount is honest (too little time, the
  // deadline today, or passed).
  | { kind: 'saving'; deadline: CivilDate; timing: DeadlineTiming; remainingMinor: number; pace: SuggestedPace | null };

// A per-period amount needs at least this many whole periods ahead.
export const MIN_PACE_PERIODS = 2;

const PERIOD_DAYS: Record<PacePeriod, number> = { week: 7, month: 30 };

export function deadlineTiming(deadline: CivilDate, today: CivilDate): DeadlineTiming {
  const days = daysBetween(today, deadline);
  if (days < 0) {
    return { kind: 'passed' };
  }
  return days === 0 ? { kind: 'today' } : { kind: 'ahead', daysLeft: days };
}

export function savingsPlan(input: DeadlineEstimateInput): SavingsPlan {
  const estimate = deadlineEstimate(input);
  const { deadline, today } = input;
  if (estimate.kind === 'none' || deadline === null) {
    return { kind: 'none' };
  }
  const timing = deadlineTiming(deadline, today);
  switch (estimate.kind) {
    case 'funded':
      return { kind: 'complete', deadline, timing };
    case 'overdue':
      return { kind: 'saving', deadline, timing, remainingMinor: estimate.remainingMinor, pace: null };
    case 'pace':
      return { kind: 'saving', deadline, timing, remainingMinor: estimate.remainingMinor, pace: suggestedPace(estimate) };
  }
}

function suggestedPace(estimate: Extract<DeadlineEstimate, { kind: 'pace' }>): SuggestedPace | null {
  const { days } = estimate;
  if (days >= PERIOD_DAYS.month * MIN_PACE_PERIODS) {
    return { period: 'month', amountMinor: estimate.monthlyMinor, days };
  }
  if (days >= PERIOD_DAYS.week * MIN_PACE_PERIODS) {
    return { period: 'week', amountMinor: estimate.weeklyMinor, days };
  }
  return null;
}
