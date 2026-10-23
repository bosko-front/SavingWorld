import { deadlineEstimate, type CivilDate, type DeadlineEstimate } from '@/core/calendar';
import { formatMoney, type CurrencyMetadata } from '@/core/money';
import { MILESTONE_COUNT, nextThresholdMinor, sceneFeedback, type Stage } from '@/core/progression';
import type { GoalSummary } from '@/data/repositories/goal-repository';
import { deadlineCopy, type DeadlineCopy } from '@/shared/i18n/deadline-messages';
import { deviceLocale, formatCivilDate } from '@/shared/i18n/locale';

import { goalAmounts, type GoalAmounts } from './goal-amounts';

// Home dashboard view model (Phase 08): every number on Home for the selected goal, derived from
// one committed snapshot (the balance recomputed from the ledger, the goal's target and deadline)
// and the civil date that snapshot was read on. Pure: no clock, no database, no layout.

export type NextMilestone =
  // The next of the ten unlocks: its percentage and the amount still needed to reach it.
  | { kind: 'next'; percent: number; toNext: string }
  // All ten unlocked (B ≥ T). Overfunding never adds an eleventh.
  | { kind: 'complete' };

export type HomeDashboard = {
  amounts: GoalAmounts;
  // Scene stage 0-10 from the shared stage function.
  stage: Stage;
  // Visual position of the progress bar, from sceneFeedback(); never decides a value.
  fraction: number;
  next: NextMilestone;
  estimate: DeadlineEstimate;
  deadline: DeadlineCopy;
};

export function homeDashboard(
  summary: GoalSummary,
  currency: CurrencyMetadata,
  today: CivilDate,
  locale: string = deviceLocale(),
): HomeDashboard {
  const { balanceMinor } = summary;
  const { targetMinor, deadlineDate } = summary.goal;
  const feedback = sceneFeedback(balanceMinor, targetMinor);
  const amount = (minor: number) => formatMoney(minor, currency, { locale });
  const threshold = nextThresholdMinor(balanceMinor, targetMinor);
  const estimate = deadlineEstimate({ balanceMinor, targetMinor, deadline: deadlineDate, today });
  return {
    amounts: goalAmounts(summary, currency, locale),
    stage: feedback.stage,
    fraction: feedback.overall,
    next:
      threshold === null
        ? { kind: 'complete' }
        : { kind: 'next', percent: ((feedback.stage + 1) * 100) / MILESTONE_COUNT, toNext: amount(threshold - balanceMinor) },
    estimate,
    deadline: deadlineCopy(estimate, deadlineDate, { amount, date: (date) => formatCivilDate(date, locale) }),
  };
}
