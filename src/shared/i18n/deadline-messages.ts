import type { CivilDate, DeadlineEstimate } from '@/core/calendar';

// English copy for the optional deadline and its two alternative paces (v1.2 section 7,
// docs/DATA_MODEL.md "Exact deadline estimate"), shaped for Home's deadline card (DECISIONS D72):
// short values instead of sentences, with the explanation of the calculation kept for an info
// button. The numbers come from `deadlineEstimate`; this module only words them. The paces are a
// guide, not a schedule, a forecast or advice, and an expired deadline is stated without blame.

export type DeadlineCopy =
  // No deadline: no estimate. Home offers to add one.
  | { kind: 'none' }
  // Deadline today or later with money to go: two alternative paces.
  | {
      kind: 'pace';
      date: string;
      // "30 days left", or "Today" when D = 1.
      timeLeft: string;
      weekly: string;
      monthly: string;
      // How the paces are worked out, shown on request.
      explanation: string;
    }
  // Deadline passed with money to go: Overdue and the remaining amount, no pace.
  | { kind: 'overdue'; date: string; remaining: string }
  // Nothing left to save: the paces are zero and never Overdue.
  | { kind: 'funded'; date: string };

export type DeadlineFormatters = {
  amount: (minor: number) => string;
  date: (date: CivilDate) => string;
};

export const PACE_EXPLANATION_TITLE = 'How the pace is worked out';

export function deadlineCopy(estimate: DeadlineEstimate, deadline: CivilDate | null, format: DeadlineFormatters): DeadlineCopy {
  if (estimate.kind === 'none' || deadline === null) {
    return { kind: 'none' };
  }
  const date = format.date(deadline);
  switch (estimate.kind) {
    case 'funded':
      return { kind: 'funded', date };
    case 'overdue':
      return { kind: 'overdue', date, remaining: format.amount(estimate.remainingMinor) };
    case 'pace': {
      const remaining = format.amount(estimate.remainingMinor);
      const today = estimate.days === 1;
      return {
        kind: 'pace',
        date,
        timeLeft: today ? 'Today' : `${estimate.days} days left`,
        weekly: format.amount(estimate.weeklyMinor),
        monthly: format.amount(estimate.monthlyMinor),
        explanation: today
          ? `The deadline is today, so both amounts are the full ${remaining} still to go.`
          : `${remaining} is still to go over ${estimate.days} days, counting today and the deadline. Per week is ${remaining} ÷ ${estimate.days} × 7, per month is ${remaining} ÷ ${estimate.days} × 30, rounded up and never more than what is left. It is a guide, not a plan.`,
      };
    }
  }
}
