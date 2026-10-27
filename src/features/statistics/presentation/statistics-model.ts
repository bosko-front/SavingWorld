import { civilDateParts, type CivilDate } from '@/core/calendar';
import { formatMoney, type CurrencyMetadata } from '@/core/money';
import { formatCivilDate } from '@/shared/i18n/locale';

import { DAILY_POINTS, type SavingsStatistics } from '../domain/savings-statistics';

// Words and drawing positions for the Statistics screen (Phase 18, DESIGN_SYSTEM "World-first design
// direction": "your savings at a glance"). Numbers in words first: the all-goal total as the headline,
// the month as two small values, the 30-day line with a sentence and a list of every day, and the
// completed-goal count. Withdrawals are neutral facts (no red, no "down"), and nothing here
// calculates money: every amount comes from `savingsStatistics` and is only formatted.

export const STATISTICS_COPY = {
  screenTitle: 'Savings insights',
  totalLabel: 'Saved across all your goals',
  monthHeader: 'This month',
  deposits: 'Deposits',
  withdrawals: 'Withdrawals',
  lineHeader: 'Last 30 days',
  lineLabel: 'Daily balance, all goals, last 30 days',
  changeTitle: 'Net change',
  changeCaption: 'Deposits minus withdrawals in these 30 days, all goals.',
  dailyToggle: 'Daily balances',
  completedTitle: 'Completed goals',
  completedDetail: 'Their finished worlds are in Collection.',
  completedNone: 'Finish a goal to keep its world in Collection.',
  emptyTitle: 'All your worlds, together',
  emptyMessage: 'Create a goal and record what you save. Every goal’s savings add up here, at a glance.',
  emptyButton: 'Create a goal',
  lockedTitle: 'Savings insights are part of Pro',
  lockedMessage: 'See your savings across all your goals at a glance: the total, this month and the last 30 days.',
  lockedButton: 'Explore Pro',
  loading: 'Loading your savings',
  failedTitle: 'Couldn’t load your savings',
  failedMessage: 'Nothing was changed. Try again.',
  retry: 'Try again',
  tooLargeTitle: 'These totals are too large to show',
  tooLargeMessage: 'Your goals together hold more than this screen can show exactly. Each goal’s own numbers are on Home.',
} as const;

export type DayRow = { date: CivilDate; label: string; amount: string };

export type ChartView = {
  // Oldest first: each day's exact end balance as text, and its drawing position.
  points: { value: number; title: string; detail: string }[];
  // Value range drawn, always including zero.
  domain: [number, number];
  // Labeled lines: the highest balance (when above zero), zero, and the lowest (when below zero).
  gridlines: { value: number; label: string }[];
  // The first day, the middle of the window and today.
  xLabels: { index: number; label: string }[];
};

export type StatisticsView = {
  total: string;
  month: { name: string; deposits: string; withdrawals: string; spoken: string };
  chart: ChartView;
  // Today's all-goal balance minus the balance before the 30 days: the window's deposits minus its
  // withdrawals. Not the same as this month's deposits.
  change: { amount: string; detail: string; spoken: string };
  // Every point of the line in words, newest first.
  days: DayRow[];
  completed: { count: string; detail: string; spoken: string };
};

export function statisticsView(statistics: SavingsStatistics, currency: CurrencyMetadata, locale: string): StatisticsView {
  const money = (minor: bigint) => formatMoney(minor, currency, { locale });
  // The net change always carries its sign ("+€10.00", "-€10.00"). Added here rather than through
  // Intl's signDisplay, which Hermes on iOS ignores (seen on the simulator).
  const signedMoney = (minor: bigint) => (minor > 0n ? `+${money(minor)}` : minor < 0n ? `-${money(-minor)}` : money(0n));
  const date = (value: CivilDate) => formatCivilDate(value, locale);
  const monthName = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: 'long' }).format(monthDate(statistics.month.start));
  const deposits = money(statistics.month.depositsMinor);
  const withdrawals = money(statistics.month.withdrawalsMinor);
  const first = statistics.daily[0];
  const last = statistics.daily.at(-1);
  if (statistics.daily.length !== DAILY_POINTS || !first || !last) {
    throw new RangeError(`the line needs ${DAILY_POINTS} points`);
  }
  const count = statistics.completedGoalCount;
  return {
    total: money(statistics.totalMinor),
    month: {
      name: monthName,
      deposits,
      withdrawals,
      spoken: `In ${monthName}: deposits ${deposits}, withdrawals ${withdrawals}.`,
    },
    chart: chartView(statistics, money, locale),
    change: changeView(statistics, money, signedMoney, date(first.date)),
    days: [...statistics.daily].reverse().map((point) => ({ date: point.date, label: date(point.date), amount: money(point.balanceMinor) })),
    completed: {
      count: String(count),
      detail: count === 0 ? STATISTICS_COPY.completedNone : STATISTICS_COPY.completedDetail,
      spoken: `${STATISTICS_COPY.completedTitle}, ${count}`,
    },
  };
}

// The chart's points and axes. Each point is a recorded end-of-day balance; nothing between days is
// drawn as a slope. Numbers become floats only for drawing (Number of an exact bigint up to 10^15).
export function chartView(statistics: SavingsStatistics, money: (minor: bigint) => string, locale: string): ChartView {
  const short = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: 'short', day: 'numeric' });
  const full = (value: CivilDate) => formatCivilDate(value, locale);
  const shortDate = (value: CivilDate) => short.format(utcDate(value));
  const balances = statistics.daily.map((point) => point.balanceMinor);
  const high = balances.reduce((max, b) => (b > max ? b : max), 0n);
  const low = balances.reduce((min, b) => (b < min ? b : min), 0n);
  const gridlines: { value: number; label: string }[] = [];
  if (high > 0n) {
    gridlines.push({ value: Number(high), label: money(high) });
  }
  gridlines.push({ value: 0, label: money(0n) });
  if (low < 0n) {
    gridlines.push({ value: Number(low), label: money(low) });
  }
  const last = statistics.daily.length - 1;
  const middle = Math.floor(last / 2);
  return {
    points: statistics.daily.map((point, index) => ({
      value: Number(point.balanceMinor),
      title: index === last ? `Today, ${full(point.date)}` : full(point.date),
      detail: money(point.balanceMinor),
    })),
    domain: high === low ? [0, 1] : [Number(low), Number(high)],
    gridlines,
    xLabels: [
      { index: 0, label: shortDate(statistics.daily[0]?.date ?? statistics.month.start) },
      { index: middle, label: shortDate(statistics.daily[middle]?.date ?? statistics.month.start) },
      { index: last, label: 'Today' },
    ],
  };
}

function changeView(statistics: SavingsStatistics, money: (minor: bigint) => string, signedMoney: (minor: bigint) => string, firstDate: string) {
  const today = statistics.daily.at(-1)?.balanceMinor ?? statistics.openingMinor;
  const change = today - statistics.openingMinor;
  const amount = signedMoney(change);
  return {
    amount,
    detail: `From ${money(statistics.openingMinor)} before ${firstDate} to ${money(today)} today.`,
    spoken: `${STATISTICS_COPY.changeTitle}, last 30 days: ${change > 0n ? 'plus ' : change < 0n ? 'minus ' : ''}${money(change < 0n ? -change : change)}. ${STATISTICS_COPY.changeCaption}`,
  };
}

function utcDate(date: CivilDate): number {
  const { year, month, day } = civilDateParts(date);
  return Date.UTC(year, month - 1, day);
}

function monthDate(date: CivilDate): number {
  const { year, month } = civilDateParts(date);
  return Date.UTC(year, month - 1, 1);
}
