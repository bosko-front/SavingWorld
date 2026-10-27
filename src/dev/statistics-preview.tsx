import { useAppDataStore } from '@/bootstrap/app-data';
import { addDays } from '@/core/calendar';
import { getCurrency, type CurrencyMetadata } from '@/core/money';
import { savingsStatistics, statisticsPeriod, type StatisticsLedger } from '@/features/statistics/domain/savings-statistics';
import { StatisticsGlance } from '@/features/statistics/presentation/statistics-screen';
import { statisticsView } from '@/features/statistics/presentation/statistics-model';
import { deviceLocale } from '@/shared/i18n/locale';

// Development-only: the Statistics screen's four views with fixture ledgers (never the person's data,
// never a capability override), so simulators without a Pro purchase can check layout, text sizes and
// the line. Uses the app's currency when one is set, otherwise EUR, and the snapshot's date.
export type StatisticsSample = 'rising' | 'flat' | 'lower' | 'large' | 'negative';

type Sample = Omit<StatisticsLedger, 'entries'> & {
  // [days before today, signed amount in minor units]
  steps: [number, number][];
};

const NEAR_CEILING = 900_000_000_000;

const SAMPLES: Record<StatisticsSample, Sample> = {
  rising: {
    goalCount: 3,
    completedGoalCount: 1,
    goalBalances: [97_500],
    openingBalances: [12_000],
    steps: [[26, 6_000], [21, 10_000], [21, -500], [14, 25_000], [9, -4_000], [6, 30_000], [2, 9_000], [0, 10_000]],
  },
  flat: { goalCount: 1, completedGoalCount: 0, goalBalances: [], openingBalances: [], steps: [] },
  lower: { goalCount: 2, completedGoalCount: 0, goalBalances: [41_000], openingBalances: [80_000], steps: [[18, -25_000], [5, -14_000]] },
  // Not possible from a valid ledger (balances never go below zero); only to check the chart draws it.
  negative: { goalCount: 1, completedGoalCount: 0, goalBalances: [-2_000], openingBalances: [3_000], steps: [[20, -4_000], [8, 1_500], [3, -2_500]] },
  // Long amounts for text-size checks: eight goals near one goal's ceiling.
  large: {
    goalCount: 14,
    completedGoalCount: 12,
    goalBalances: Array.from({ length: 8 }, () => NEAR_CEILING),
    openingBalances: Array.from({ length: 7 }, () => NEAR_CEILING),
    steps: [[20, NEAR_CEILING]],
  },
};

export function StatisticsPreview({ sample }: { sample: StatisticsSample }) {
  const data = useAppDataStore((store) => (store.state.status === 'ready' ? store.state.data : null));
  if (!data) {
    return null;
  }
  const currency = data.currency.currency.status === 'set' ? data.currency.currency.currency : (getCurrency('EUR') as CurrencyMetadata);
  const period = statisticsPeriod(data.today);
  const { steps, ...ledger } = SAMPLES[sample];
  const entries = steps.map(([daysBefore, signedAmountMinor]) => ({ entryDate: addDays(period.today, -daysBefore), signedAmountMinor }));
  return <StatisticsGlance view={statisticsView(savingsStatistics(period, { ...ledger, entries }), currency, deviceLocale())} />;
}
