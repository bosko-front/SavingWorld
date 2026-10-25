import { deadlineEstimate, savingsPlan, type CivilDate, type DeadlineEstimate, type SavingsPlan } from '@/core/calendar';
import { formatMoney, type CurrencyMetadata } from '@/core/money';
import { MILESTONE_COUNT, nextThresholdMinor, sceneFeedback, type Stage } from '@/core/progression';
import type { GoalSummary } from '@/data/repositories/goal-repository';
import { stageName } from '@/features/worlds/registry';
import { worldCompleteCopy } from '@/features/worlds/world-copy';
import { savingsPlanCopy, type SavingsPlanCopy } from '@/shared/i18n/deadline-messages';
import { deviceLocale, formatCivilDate } from '@/shared/i18n/locale';

import { goalAmounts, type GoalAmounts } from './goal-amounts';

// Home dashboard view model (Phase 08): every number on Home for the selected goal, derived from
// one committed snapshot (the balance recomputed from the ledger, the goal's target and deadline)
// and the civil date that snapshot was read on. Pure: no clock, no database, no layout.

export type NextMilestone =
  // The next of the ten unlocks: its percentage, its name from the theme manifest ("Small house";
  // null when the theme has no art) and the amount still needed to reach it.
  | { kind: 'next'; percent: number; name: string | null; toNext: string }
  // All ten unlocked (B ≥ T). Overfunding never adds an eleventh. The copy names the theme's world
  // ("Your island is complete!", D83).
  | { kind: 'complete'; title: string; detail: string };

export type HomeDashboard = {
  amounts: GoalAmounts;
  // Formats any amount of this goal's currency the way `amounts` are (Phase 10: the saved amount
  // while it counts up).
  format: (minor: number) => string;
  // Scene stage 0-10 from the shared stage function.
  stage: Stage;
  // Visual position of the progress bar, from sceneFeedback(); never decides a value.
  fraction: number;
  next: NextMilestone;
  // The v1.2 pace, and Home's savings plan built on it (D84): its numbers and its two cards' copy.
  estimate: DeadlineEstimate;
  plan: SavingsPlan;
  planCopy: SavingsPlanCopy;
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
  const deadlineInput = { balanceMinor, targetMinor, deadline: deadlineDate, today };
  const estimate = deadlineEstimate(deadlineInput);
  const plan = savingsPlan(deadlineInput);
  return {
    amounts: goalAmounts(summary, currency, locale),
    format: amount,
    stage: feedback.stage,
    fraction: feedback.overall,
    next:
      threshold === null
        ? { kind: 'complete', ...worldCompleteCopy(summary.goal.themeId) }
        : {
            kind: 'next',
            percent: ((feedback.stage + 1) * 100) / MILESTONE_COUNT,
            name: stageName(summary.goal.themeId, (feedback.stage + 1) as Stage),
            toNext: amount(threshold - balanceMinor),
          },
    estimate,
    plan,
    planCopy: savingsPlanCopy(plan, { amount, date: (date) => formatCivilDate(date, locale) }),
  };
}
