import { addDays, deadlineEstimate, fixedClock, parseCivilDate, today, type CivilDate } from '@/core/calendar';
import { formatMoney, getCurrency, MAX_MINOR } from '@/core/money';

// v1.2 section 7 deadline pace (TEST_PLAN T08). Expected values are calculated by hand:
// weekly = min(R, ceil(R × 7 / D)), monthly = min(R, ceil(R × 30 / D)), D inclusive.

function date(text: string): CivilDate {
  const parsed = parseCivilDate(text);
  if (!parsed.ok) {
    throw new Error(`fixture date ${text} is invalid`);
  }
  return parsed.value;
}

const TODAY = date('2026-10-23');

describe('deadline estimate', () => {
  it('gives 23.34 weekly and 100.00 monthly for 100.00 remaining over 30 days', () => {
    const estimate = deadlineEstimate({ balanceMinor: 0, targetMinor: 10_000, deadline: date('2026-11-21'), today: TODAY });
    expect(estimate).toEqual({ kind: 'pace', remainingMinor: 10_000, days: 30, weeklyMinor: 2_334, monthlyMinor: 10_000 });

    const eur = getCurrency('EUR');
    if (!eur || estimate.kind !== 'pace') {
      throw new Error('fixture must produce a pace');
    }
    expect(formatMoney(estimate.weeklyMinor, eur, { locale: 'en-US' })).toBe('€23.34');
    expect(formatMoney(estimate.monthlyMinor, eur, { locale: 'en-US' })).toBe('€100.00');
  });

  it('uses only the day count, never month ends or contribution dates', () => {
    // 30 inclusive days that cross a short February give the same pace as any other 30 days.
    const acrossFebruary = deadlineEstimate({
      balanceMinor: 0,
      targetMinor: 10_000,
      deadline: date('2026-03-01'),
      today: date('2026-01-31'),
    });
    expect(acrossFebruary).toEqual({ kind: 'pace', remainingMinor: 10_000, days: 30, weeklyMinor: 2_334, monthlyMinor: 10_000 });
  });

  it('gives the remaining amount for both paces when the deadline is today', () => {
    expect(deadlineEstimate({ balanceMinor: 2_500, targetMinor: 10_000, deadline: TODAY, today: TODAY })).toEqual({
      kind: 'pace',
      remainingMinor: 7_500,
      days: 1,
      weeklyMinor: 7_500,
      monthlyMinor: 7_500,
    });
  });

  it('gives no estimate without a deadline, whatever the balance', () => {
    expect(deadlineEstimate({ balanceMinor: 0, targetMinor: 10_000, deadline: null, today: TODAY })).toEqual({ kind: 'none' });
    expect(deadlineEstimate({ balanceMinor: 10_000, targetMinor: 10_000, deadline: null, today: TODAY })).toEqual({ kind: 'none' });
  });

  it('shows Overdue with the remaining amount after the deadline, without dividing', () => {
    expect(deadlineEstimate({ balanceMinor: 4_000, targetMinor: 10_000, deadline: date('2026-10-22'), today: TODAY })).toEqual({
      kind: 'overdue',
      remainingMinor: 6_000,
    });
  });

  it('gives zero and no Overdue when nothing remains', () => {
    const funded = { kind: 'funded', weeklyMinor: 0, monthlyMinor: 0 };
    expect(deadlineEstimate({ balanceMinor: 10_000, targetMinor: 10_000, deadline: date('2026-10-01'), today: TODAY })).toEqual(funded);
    expect(deadlineEstimate({ balanceMinor: 10_500, targetMinor: 10_000, deadline: date('2026-12-01'), today: TODAY })).toEqual(funded);
    expect(deadlineEstimate({ balanceMinor: 10_000, targetMinor: 10_000, deadline: TODAY, today: TODAY })).toEqual(funded);
  });

  it.each([
    // [today, deadline, remaining, D, weekly, monthly]
    ['2028-02-01', '2028-02-29', 2_900, 29, 700, 2_900], // leap day deadline
    ['2027-02-01', '2027-02-28', 2_900, 28, 725, 2_900],
    ['2028-02-29', '2029-02-28', 100_000, 366, 1_913, 8_197], // 700000/366 = 1912.6, 3000000/366 = 8196.7
    ['2026-01-01', '2026-12-31', 100_000, 365, 1_918, 8_220], // 1917.8, 8219.2
    ['2026-10-23', '2026-10-24', 1, 2, 1, 1], // ceil(3.5) capped at R
    ['2026-10-23', '2026-10-29', 1_000, 7, 1_000, 1_000],
    ['2026-10-23', '2026-10-30', 1_000, 8, 875, 1_000],
    ['2026-10-23', '2026-11-21', 1_000, 30, 234, 1_000], // JPY 1000, 233.3 rounded up
    ['2026-10-23', '2026-11-21', 100_000, 30, 23_334, 100_000], // KWD 100.000 → 23.334
    ['2026-10-23', '2026-12-21', 10_001, 60, 1_167, 5_001], // 1166.8, 5000.5
    ['2026-10-23', '2026-11-21', MAX_MINOR, 30, 233_333_333_334, MAX_MINOR], // exact at the ceiling
  ])('from %s to %s with %d remaining: D=%d, weekly %d, monthly %d', (from, to, remaining, days, weekly, monthly) => {
    expect(deadlineEstimate({ balanceMinor: 0, targetMinor: remaining, deadline: date(to), today: date(from) })).toEqual({
      kind: 'pace',
      remainingMinor: remaining,
      days,
      weeklyMinor: weekly,
      monthlyMinor: monthly,
    });
  });

  it('counts D from the civil date the injected clock reads, across DST and travel', () => {
    const deadline = date('2026-04-04');
    // Belgrade spring-forward day: 00:30 CET and 23:30 CEST on 29 March are the same civil day.
    for (const instant of ['2026-03-28T23:30:00Z', '2026-03-29T21:30:00Z']) {
      const local = today(fixedClock(Date.parse(instant), 'Europe/Belgrade'));
      expect(local).toBe('2026-03-29');
      expect(deadlineEstimate({ balanceMinor: 0, targetMinor: 7_000, deadline, today: local })).toMatchObject({ days: 7, weeklyMinor: 7_000 });
    }

    // One instant, two zones: the traveller's date and therefore D follow the device zone.
    const instant = Date.parse('2026-10-22T23:30:00Z');
    const goalDeadline = date('2026-10-30');
    const inBelgrade = today(fixedClock(instant, 'Europe/Belgrade'));
    const inLosAngeles = today(fixedClock(instant, 'America/Los_Angeles'));
    expect(inLosAngeles).toBe(addDays(inBelgrade, -1));
    expect(deadlineEstimate({ balanceMinor: 0, targetMinor: 900, deadline: goalDeadline, today: inBelgrade })).toMatchObject({ days: 8, weeklyMinor: 788 });
    expect(deadlineEstimate({ balanceMinor: 0, targetMinor: 900, deadline: goalDeadline, today: inLosAngeles })).toMatchObject({ days: 9, weeklyMinor: 700 });
  });
});
