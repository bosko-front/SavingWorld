import { formatMoney, type CurrencyMetadata } from '@/core/money';
import { isFunded, progressPercent, remainingMinor } from '@/core/progression';
import type { GoalSummary } from '@/data/repositories/goal-repository';
import { deviceLocale } from '@/shared/i18n/locale';

// Display strings for one goal's numbers, from the shared money and progression rules. Formatting
// never changes a value; the percentage is floored, so 99.99% never reads as 100%.
export type GoalAmounts = {
  saved: string;
  target: string;
  remaining: string;
  percent: number;
  funded: boolean;
};

export function goalAmounts(summary: GoalSummary, currency: CurrencyMetadata, locale: string = deviceLocale()): GoalAmounts {
  const { balanceMinor } = summary;
  const { targetMinor } = summary.goal;
  return {
    saved: formatMoney(balanceMinor, currency, { locale }),
    target: formatMoney(targetMinor, currency, { locale }),
    remaining: formatMoney(remainingMinor(balanceMinor, targetMinor), currency, { locale }),
    percent: progressPercent(balanceMinor, targetMinor),
    funded: isFunded(balanceMinor, targetMinor),
  };
}
