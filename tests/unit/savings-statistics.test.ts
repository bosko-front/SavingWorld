import { addDays, parseCivilDate, type CivilDate } from '@/core/calendar';
import { getCurrency, MAX_FORMAT_MINOR, MAX_MINOR, type CurrencyMetadata } from '@/core/money';
import {
  DAILY_POINTS,
  presentable,
  savingsStatistics,
  statisticsPeriod,
  type DatedAmount,
  type StatisticsLedger,
} from '@/features/statistics/domain/savings-statistics';
import { STATISTICS_COPY, statisticsView } from '@/features/statistics/presentation/statistics-model';
import { chartGeometry, nearestIndex } from '@/shared/ui/line-chart';

// Phase 18 pure rules (R19, docs/DATA_MODEL.md "Four Pro statistics"). Expected values are written
// out by hand from each fixture; none is produced by the code under test.

function d(text: string): CivilDate {
  const parsed = parseCivilDate(text);
  if (!parsed.ok) {
    throw new Error(`bad date ${text}`);
  }
  return parsed.value;
}

function entry(date: string, signedAmountMinor: number): DatedAmount {
  return { entryDate: d(date), signedAmountMinor };
}

function ledger(partial: Partial<StatisticsLedger>): StatisticsLedger {
  return { goalCount: 1, completedGoalCount: 0, goalBalances: [], openingBalances: [], entries: [], ...partial };
}

const EUR = getCurrency('EUR') as CurrencyMetadata;

describe('statisticsPeriod', () => {
  it.each([
    // today, window start, month start, month end, read from
    ['2026-10-26', '2026-09-27', '2026-10-01', '2026-10-31', '2026-09-27'],
    ['2026-10-31', '2026-10-02', '2026-10-01', '2026-10-31', '2026-10-01'],
    ['2026-10-30', '2026-10-01', '2026-10-01', '2026-10-31', '2026-10-01'],
    ['2026-03-01', '2026-01-31', '2026-03-01', '2026-03-31', '2026-01-31'],
    ['2028-02-29', '2028-01-31', '2028-02-01', '2028-02-29', '2028-01-31'],
    ['2027-01-05', '2026-12-07', '2027-01-01', '2027-01-31', '2026-12-07'],
  ])('today %s', (today, windowStart, monthStart, monthEnd, readFrom) => {
    expect(statisticsPeriod(d(today))).toEqual({ today, windowStart, monthStart, monthEnd, readFrom });
  });
});

describe('savingsStatistics', () => {
  it('builds the four views from an opening balance, sparse days and the month boundary', () => {
    // Today 2026-10-26: line 27 Sep .. 26 Oct, October month. Opening (end of 26 Sep): 12,000 + 3,000.
    const period = statisticsPeriod(d('2026-10-26'));
    const stats = savingsStatistics(
      period,
      ledger({
        goalCount: 3,
        completedGoalCount: 1,
        goalBalances: [13_500, 3_000, 4_000],
        openingBalances: [12_000, 3_000],
        entries: [
          entry('2026-09-30', 2_000), // previous month, inside the line
          entry('2026-10-01', -1_500), // first day of the month
          entry('2026-10-01', 4_000),
          entry('2026-10-20', 500),
          entry('2026-10-20', -500),
          entry('2026-10-26', 1_000), // today
        ],
      }),
    );
    expect(stats.goalCount).toBe(3);
    expect(stats.totalMinor).toBe(20_500n);
    // With no entry dated after today, the line ends on the current total.
    expect(stats.daily.at(-1)?.balanceMinor).toBe(stats.totalMinor);
    expect(stats.month).toEqual({ start: '2026-10-01', end: '2026-10-31', depositsMinor: 5_500n, withdrawalsMinor: 2_000n });
    expect(stats.openingMinor).toBe(15_000n);
    expect(stats.completedGoalCount).toBe(1);
    expect(stats.daily).toHaveLength(DAILY_POINTS);
    const expected = new Map<string, bigint>([
      ['2026-09-27', 15_000n],
      ['2026-09-29', 15_000n],
      ['2026-09-30', 17_000n],
      ['2026-10-01', 19_500n],
      ['2026-10-19', 19_500n],
      ['2026-10-20', 19_500n],
      ['2026-10-25', 19_500n],
      ['2026-10-26', 20_500n],
    ]);
    for (const [date, balance] of expected) {
      expect(stats.daily.find((point) => point.date === date)?.balanceMinor).toBe(balance);
    }
    expect(stats.daily[0]?.date).toBe('2026-09-27');
    expect(stats.daily.at(-1)?.date).toBe('2026-10-26');
    // Consecutive dates, no gaps for days without activity.
    stats.daily.forEach((point, index) => expect(point.date).toBe(addDays(d('2026-09-27'), index)));
  });

  it('gives the same end-of-day balances whatever the order of one day’s entries', () => {
    const period = statisticsPeriod(d('2026-10-10'));
    const entries = [entry('2026-10-05', 7_000), entry('2026-10-05', -2_000), entry('2026-10-05', 1_000)];
    const a = savingsStatistics(period, ledger({ goalBalances: [6_000], entries }));
    const b = savingsStatistics(period, ledger({ goalBalances: [6_000], entries: [...entries].reverse() }));
    expect(a.daily).toEqual(b.daily);
    expect(a.daily.find((point) => point.date === '2026-10-05')?.balanceMinor).toBe(6_000n);
    expect(a.daily.find((point) => point.date === '2026-10-04')?.balanceMinor).toBe(0n);
    expect(a.month).toMatchObject({ depositsMinor: 8_000n, withdrawalsMinor: 2_000n });
  });

  it('counts the first days of the month that precede the line in the month and the opening balance', () => {
    // Today 31 Oct: the line starts 2 Oct; 1 Oct is in the month and in the opening balance.
    const stats = savingsStatistics(statisticsPeriod(d('2026-10-31')), ledger({ goalBalances: [9_000], openingBalances: [5_000], entries: [entry('2026-10-01', 4_000)] }));
    expect(stats.month).toMatchObject({ depositsMinor: 4_000n, withdrawalsMinor: 0n });
    expect(stats.openingMinor).toBe(9_000n);
    expect(stats.daily[0]).toEqual({ date: '2026-10-02', balanceMinor: 9_000n });
  });

  it('keeps an entry dated after today in the total and the month, never on the line', () => {
    const stats = savingsStatistics(statisticsPeriod(d('2026-10-20')), ledger({ goalBalances: [3_000], entries: [entry('2026-10-19', 2_000), entry('2026-10-22', 1_000)] }));
    expect(stats.totalMinor).toBe(3_000n);
    expect(stats.month.depositsMinor).toBe(3_000n);
    expect(stats.daily.at(-1)).toEqual({ date: '2026-10-20', balanceMinor: 2_000n });
  });

  it('sums beyond one goal’s ceiling exactly', () => {
    const balances = Array.from({ length: 5 }, () => MAX_MINOR);
    const stats = savingsStatistics(statisticsPeriod(d('2026-10-20')), ledger({ goalCount: 5, goalBalances: balances, openingBalances: balances }));
    expect(stats.totalMinor).toBe(5_000_000_000_000n);
    expect(stats.daily.at(-1)?.balanceMinor).toBe(5_000_000_000_000n);
    expect(presentable(stats)).toBe(true);
  });

  it('reports totals beyond the exact formatter as not presentable', () => {
    const count = MAX_FORMAT_MINOR / MAX_MINOR + 1;
    const balances = Array.from({ length: count }, () => MAX_MINOR);
    const stats = savingsStatistics(statisticsPeriod(d('2026-10-20')), ledger({ goalCount: count, goalBalances: balances }));
    expect(presentable(stats)).toBe(false);
  });

  it('rejects inconsistent input instead of guessing', () => {
    const period = statisticsPeriod(d('2026-10-20'));
    expect(() => savingsStatistics(period, ledger({ entries: [entry('2026-09-01', 100)] }))).toThrow(RangeError);
    expect(() => savingsStatistics(period, ledger({ goalCount: 1, completedGoalCount: 2 }))).toThrow(RangeError);
    expect(() => savingsStatistics(period, ledger({ goalBalances: [1.5] }))).toThrow(RangeError);
  });
});

describe('statistics view', () => {
  const period = statisticsPeriod(d('2026-10-26'));

  function view(partial: Partial<StatisticsLedger>) {
    return statisticsView(savingsStatistics(period, ledger(partial)), EUR, 'en-US');
  }

  it('words every value and lists each day newest first', () => {
    const v = view({ goalCount: 2, completedGoalCount: 2, goalBalances: [97_500], openingBalances: [12_000], entries: [entry('2026-10-01', 85_500), entry('2026-10-02', -500), entry('2026-10-26', 500)] });
    expect(v.total).toBe('€975.00');
    expect(v.month).toEqual({ name: 'October', deposits: '€860.00', withdrawals: '€5.00', spoken: 'In October: deposits €860.00, withdrawals €5.00.' });
    expect(v.days).toHaveLength(30);
    expect(v.days[0]).toEqual({ date: '2026-10-26', label: 'Oct 26, 2026', amount: '€975.00' });
    expect(v.days[29]).toEqual({ date: '2026-09-27', label: 'Sep 27, 2026', amount: '€120.00' });
    expect(v.completed).toEqual({ count: '2', detail: STATISTICS_COPY.completedDetail, spoken: 'Finished worlds, 2' });
  });

  it('gives the chart every recorded day, zero-based axes and date labels', () => {
    const v = view({ goalBalances: [97_500], openingBalances: [12_000], entries: [entry('2026-10-01', 85_500), entry('2026-10-02', -500), entry('2026-10-26', 500)] });
    expect(v.chart.points).toHaveLength(30);
    expect(v.chart.points[0]).toEqual({ value: 12_000, title: 'Sep 27, 2026', detail: '€120.00' });
    expect(v.chart.points[4]).toEqual({ value: 97_500, title: 'Oct 1, 2026', detail: '€975.00' });
    expect(v.chart.points[5]).toEqual({ value: 97_000, title: 'Oct 2, 2026', detail: '€970.00' });
    expect(v.chart.points[29]).toEqual({ value: 97_500, title: 'Today, Oct 26, 2026', detail: '€975.00' });
    expect(v.chart.domain).toEqual([0, 97_500]);
    expect(v.chart.gridlines).toEqual([
      { value: 97_500, label: '€975.00' },
      { value: 0, label: '€0.00' },
    ]);
    expect(v.chart.xLabels).toEqual([
      { index: 0, label: 'Sep 27' },
      { index: 14, label: 'Oct 11' },
      { index: 29, label: 'Today' },
    ]);
  });

  it('keeps flat, zero and negative series honest', () => {
    const flat = view({ goalBalances: [8_000], openingBalances: [8_000] });
    expect(flat.chart.points.every((point) => point.value === 8_000)).toBe(true);
    expect(flat.chart.domain).toEqual([0, 8_000]);
    const empty = view({ goalBalances: [] });
    expect(empty.chart.points.every((point) => point.value === 0)).toBe(true);
    expect(empty.chart.domain).toEqual([0, 1]);
    expect(empty.chart.gridlines).toEqual([{ value: 0, label: '€0.00' }]);
    expect(empty.completed.detail).toBe(STATISTICS_COPY.completedNone);
    // Not possible from a valid ledger, but the chart must still draw it truthfully.
    const negative = view({ goalBalances: [-2_000], openingBalances: [3_000], entries: [entry('2026-10-10', -5_000)] });
    expect(negative.chart.domain).toEqual([-2_000, 3_000]);
    expect(negative.chart.gridlines.map((line) => line.label)).toEqual(['€30.00', '€0.00', '-€20.00']);
  });

  it('separates the 30 days’ net change from the month’s deposits', () => {
    const up = view({ goalBalances: [97_500], openingBalances: [12_000], entries: [entry('2026-10-01', 85_500), entry('2026-10-02', -500), entry('2026-10-26', 500)] });
    expect(up.change.amount).toBe('+€855.00');
    expect(up.change.detail).toBe('From €120.00 before Sep 27, 2026 to €975.00 today.');
    expect(up.change.spoken).toBe(`Net change, last 30 days: plus €855.00. ${STATISTICS_COPY.changeCaption}`);
    expect(up.month.deposits).toBe('€860.00');
    // Opening balance counts: a deposit on the first day is part of the change.
    expect(view({ goalBalances: [6_000], openingBalances: [5_000], entries: [entry('2026-09-27', 1_000)] }).change.amount).toBe('+€10.00');
    const lower = view({ goalBalances: [5_000], openingBalances: [8_000], entries: [entry('2026-10-10', -3_000)] });
    expect(lower.change.amount).toBe('-€30.00');
    expect(view({ goalBalances: [8_000], openingBalances: [8_000] }).change.amount).toBe('€0.00');
  });

  it('never words a withdrawal as a loss or uses trading words', () => {
    const v = view({ goalBalances: [1_000], openingBalances: [9_000], entries: [entry('2026-10-03', -8_000)] });
    expect(JSON.stringify(v)).not.toMatch(/down|loss|lost|fell|drop|profit|gain/i);
  });
});

describe('step chart geometry', () => {
  const frame = { width: 300, height: 160, top: 20, bottom: 8, side: 8 };

  it('draws each value flat until the next point, with no slope between days', () => {
    const g = chartGeometry([0, 50, 50, 100], [0, 100], frame);
    expect(g.xs).toEqual([8, 102.66666666666667, 197.33333333333334, 292]);
    expect(g.ys).toEqual([152, 86, 86, 20]);
    expect(g.line).toBe('M8.0 152.0 H102.7 V86.0 H197.3 V86.0 H292.0 V20.0');
    // Only horizontal and vertical moves.
    expect(g.line).not.toMatch(/ L/);
    expect(g.area).toBe(`${g.line} V152.0 H8.0 Z`);
  });

  it('places zero on its own line when values go below it and clamps outside values', () => {
    const g = chartGeometry([-50, 0, 100, 200, Number.NaN], [-50, 100], frame);
    expect(g.y(0)).toBeCloseTo(152 - (50 / 150) * 132);
    expect(g.ys[0]).toBe(152);
    expect(g.ys[3]).toBe(20);
    expect(g.ys[4]).toBe(152);
    expect(g.area.endsWith(`V${g.y(0).toFixed(1)} H8.0 Z`)).toBe(true);
  });

  it('draws a flat or empty domain without dividing by zero', () => {
    const g = chartGeometry([0, 0, 0], [0, 0], frame);
    expect(g.ys.every((y) => Number.isFinite(y))).toBe(true);
  });

  it('finds the day nearest to a touch', () => {
    const xs = [8, 18, 28, 38];
    expect([nearestIndex(0, xs), nearestIndex(14, xs), nearestIndex(24, xs), nearestIndex(500, xs)]).toEqual([0, 1, 2, 3]);
  });
});
