import { addDays, civilDateFromParts, civilDateParts, daysInMonth, type CivilDate } from '@/core/calendar';
import { MAX_FORMAT_MINOR, sumMinor } from '@/core/money';

// The four Pro statistics (v1.2 sections 4 and 7, R19, docs/DATA_MODEL.md "Four Pro statistics").
// Pure: the inputs are committed ledger values of every existing goal in the one global currency,
// read in one snapshot, and the civil date the app considers today. Sums run on BigInt; nothing is
// cached, so a correction, deletion, status change or a new date gives new values on the next read.
// A deleted goal's entries no longer exist (D74), and souvenirs never add money: they are not inputs.

// Today and the 29 calendar dates before it.
export const DAILY_POINTS = 30;

export type StatisticsPeriod = {
  today: CivilDate;
  // First date of the 30-day line.
  windowStart: CivilDate;
  // The local calendar month that contains today.
  monthStart: CivilDate;
  monthEnd: CivilDate;
  // Entries are read one by one from this date (the earlier of windowStart and monthStart); every
  // entry before it arrives as one opening sum per goal.
  readFrom: CivilDate;
};

export function statisticsPeriod(today: CivilDate): StatisticsPeriod {
  const { year, month } = civilDateParts(today);
  const windowStart = addDays(today, -(DAILY_POINTS - 1));
  const monthStart = civilDateFromParts({ year, month, day: 1 });
  const monthEnd = civilDateFromParts({ year, month, day: daysInMonth(year, month) });
  return { today, windowStart, monthStart, monthEnd, readFrom: windowStart < monthStart ? windowStart : monthStart };
}

export type DatedAmount = { entryDate: CivilDate; signedAmountMinor: number };

// Committed values from one read snapshot.
export type StatisticsLedger = {
  // Goals in any status (active, paused, completed).
  goalCount: number;
  // Goals whose current status is completed; the number of souvenirs plays no part (R19).
  completedGoalCount: number;
  // Each goal's current balance (every entry it has).
  goalBalances: readonly number[];
  // Each goal's sum of the entries dated before `period.readFrom`: its opening balance.
  openingBalances: readonly number[];
  // Every entry dated on or after `period.readFrom`, in any order.
  entries: readonly DatedAmount[];
};

export type DailyBalance = { date: CivilDate; balanceMinor: bigint };

export type SavingsStatistics = {
  goalCount: number;
  // 1. The sum of every existing goal's current balance.
  totalMinor: bigint;
  // 2. Gross deposits and gross withdrawals (both as positive amounts) dated in the current local
  // calendar month. Separate from the net total.
  month: { start: CivilDate; end: CivilDate; depositsMinor: bigint; withdrawalsMinor: bigint };
  // 3. The all-goal balance at the end of each date, oldest first: today and the 29 dates before.
  // The first point already includes every entry dated before the window.
  daily: DailyBalance[];
  // The all-goal balance at the end of the day before the window: the line's opening balance.
  openingMinor: bigint;
  // 4. Goals whose status is completed.
  completedGoalCount: number;
};

export function savingsStatistics(period: StatisticsPeriod, ledger: StatisticsLedger): SavingsStatistics {
  checkCount(ledger.goalCount);
  checkCount(ledger.completedGoalCount);
  if (ledger.completedGoalCount > ledger.goalCount) {
    throw new RangeError('more completed goals than goals');
  }

  const byDate = new Map<CivilDate, bigint>();
  let depositsMinor = 0n;
  let withdrawalsMinor = 0n;
  for (const entry of ledger.entries) {
    if (entry.entryDate < period.readFrom) {
      throw new RangeError('an entry before readFrom belongs in the opening balances');
    }
    const amount = sumMinor([entry.signedAmountMinor]);
    byDate.set(entry.entryDate, (byDate.get(entry.entryDate) ?? 0n) + amount);
    if (entry.entryDate >= period.monthStart && entry.entryDate <= period.monthEnd) {
      if (amount > 0n) {
        depositsMinor += amount;
      } else {
        withdrawalsMinor -= amount;
      }
    }
  }

  // Walk every date from readFrom through today, carrying the running all-goal balance. Entries
  // dated after today (the device clock moved back since they were saved) are in the total and the
  // month but on no point of the line, which ends today.
  let running = sumMinor(ledger.openingBalances);
  let openingMinor = running;
  const daily: DailyBalance[] = [];
  for (let date = period.readFrom; date <= period.today; date = addDays(date, 1)) {
    if (date === period.windowStart) {
      openingMinor = running;
    }
    running += byDate.get(date) ?? 0n;
    if (date >= period.windowStart) {
      daily.push({ date, balanceMinor: running });
    }
  }

  return {
    goalCount: ledger.goalCount,
    totalMinor: sumMinor(ledger.goalBalances),
    month: { start: period.monthStart, end: period.monthEnd, depositsMinor, withdrawalsMinor },
    daily,
    openingMinor,
    completedGoalCount: ledger.completedGoalCount,
  };
}

// Every amount fits the exact money formatter (`formatMoney` stays exact up to MAX_FORMAT_MINOR).
// All-goal sums may exceed a single goal's ceiling; beyond this bound the screen says so instead of
// showing a rounded number.
export function presentable(statistics: SavingsStatistics): boolean {
  const bound = BigInt(MAX_FORMAT_MINOR);
  const amounts = [
    statistics.totalMinor,
    statistics.openingMinor,
    statistics.month.depositsMinor,
    statistics.month.withdrawalsMinor,
    ...statistics.daily.map((point) => point.balanceMinor),
  ];
  return amounts.every((amount) => amount <= bound && amount >= -bound);
}

function checkCount(count: number): void {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError('a goal count must be a nonnegative integer');
  }
}
