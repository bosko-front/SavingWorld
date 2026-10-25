import type { CivilDate, DeadlineTiming, SavingsPlan } from '@/core/calendar';

// English copy for Home's savings plan (owner decision D84): a Deadline card and a Savings needed
// card. The numbers come from `savingsPlan` over the v1.2 `deadlineEstimate`; this module only
// words them. A suggested amount is a guide, not a schedule, a forecast or advice, and a passed
// deadline is stated without blame.

export type SavingsNeededCopy =
  // Money still to go: the remaining amount, at most one per-period amount ("€273.00 a week"), and
  // a short note when the deadline has passed.
  | { kind: 'saving'; amount: string; pace: string | null; note: string | null }
  // Nothing left to save.
  | { kind: 'complete' };

export type SavingsPlanCopy =
  // No deadline: Home shows no plan; the deadline is set in Edit goal.
  | { kind: 'none' }
  | {
      kind: 'plan';
      date: string;
      // "29 days left", "Tomorrow", "Today" or "Deadline passed".
      timeLeft: string;
      passed: boolean;
      // The Deadline card as VoiceOver reads it: "Deadline Nov 21, 2026, 29 days left".
      deadlineLabel: string;
      needed: SavingsNeededCopy;
      // How the suggested amount is worked out, shown on request; null when none is suggested.
      explanation: string | null;
    };

export type DeadlineFormatters = {
  amount: (minor: number) => string;
  date: (date: CivilDate) => string;
};

export const PACE_EXPLANATION_TITLE = 'How the amount is worked out';

export function timeLeftCopy(timing: DeadlineTiming): string {
  switch (timing.kind) {
    case 'passed':
      return 'Deadline passed';
    case 'today':
      return 'Today';
    case 'ahead':
      return timing.daysLeft === 1 ? 'Tomorrow' : `${timing.daysLeft} days left`;
  }
}

export function savingsPlanCopy(plan: SavingsPlan, format: DeadlineFormatters): SavingsPlanCopy {
  if (plan.kind === 'none') {
    return { kind: 'none' };
  }
  const date = format.date(plan.deadline);
  const timeLeft = timeLeftCopy(plan.timing);
  const spokenTime = plan.timing.kind === 'passed' ? 'passed' : plan.timing.kind === 'ahead' ? timeLeft.toLowerCase() : 'today';
  const base = {
    kind: 'plan' as const,
    date,
    timeLeft,
    passed: plan.timing.kind === 'passed',
    deadlineLabel: `Deadline ${date}, ${spokenTime}`,
  };
  if (plan.kind === 'complete') {
    return { ...base, needed: { kind: 'complete' }, explanation: null };
  }
  const remaining = format.amount(plan.remainingMinor);
  const { pace } = plan;
  const perPeriod = pace ? `${format.amount(pace.amountMinor)} a ${pace.period}` : null;
  const multiplier = pace?.period === 'month' ? 30 : 7;
  return {
    ...base,
    needed: {
      kind: 'saving',
      amount: remaining,
      pace: perPeriod,
      note: base.passed ? 'Choose a new date in Edit goal' : null,
    },
    explanation: pace
      ? `${remaining} is still to go over ${pace.days} days, counting today and the deadline. A ${pace.period} is ${remaining} ÷ ${pace.days} × ${multiplier}, rounded up and never more than what is left. It is a guide, not a plan.`
      : null,
  };
}
