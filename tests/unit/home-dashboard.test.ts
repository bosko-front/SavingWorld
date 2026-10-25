import { civilDateAt, deadlineTiming, fixedClock, savingsPlan, today, type CivilDate } from '@/core/calendar';
import { getCurrency, type CurrencyMetadata } from '@/core/money';
import type { GoalSummary } from '@/data/repositories/goal-repository';
import { homeDashboard } from '@/features/goals/presentation/home-dashboard';
import { savingsPlanCopy } from '@/shared/i18n/deadline-messages';

// Home dashboard view model (Phase 08) with independently calculated expectations: saved, target,
// remaining, floored percent, stage, next milestone and the v1.2 deadline pace with the inclusive
// day count D. Dates come from fixed clocks in explicit time zones (TEST_PLAN T02, T06, T08).

function currency(code: string): CurrencyMetadata {
  const metadata = getCurrency(code);
  if (!metadata) {
    throw new Error(`${code} missing from the registry`);
  }
  return metadata;
}

const EUR = currency('EUR');
const JPY = currency('JPY');
const KWD = currency('KWD');

function summary(balanceMinor: number, targetMinor: number, deadlineDate: string | null = null): GoalSummary {
  return {
    goal: {
      id: '00000000-0000-4000-8000-000000000001',
      title: 'Summer trip',
      targetMinor,
      deadlineDate: deadlineDate as CivilDate | null,
      themeId: 'island',
      status: 'active',
      createdAtUtc: '2026-10-01T08:00:00.000Z',
      updatedAtUtc: '2026-10-01T08:00:00.000Z',
      revision: 1,
    },
    balanceMinor,
    entryCount: balanceMinor > 0 ? 1 : 0,
  };
}

const TODAY = '2026-10-23' as CivilDate;

// Intl separates some currency codes and symbols with a no-break space; compare with plain spaces.
function plainSpaces<T>(value: T): T {
  return JSON.parse(JSON.stringify(value).replace(/[\u00a0\u202f]/g, ' ')) as T;
}

function dashboard(balanceMinor: number, targetMinor: number, deadline: string | null = null, todayDate: CivilDate = TODAY) {
  return homeDashboard(summary(balanceMinor, targetMinor, deadline), EUR, todayDate, 'en-US');
}

describe('dashboard numbers match the ledger balance', () => {
  it('zero balance: base scene, nothing saved, the first milestone 10% away', () => {
    const view = dashboard(0, 150_000);
    expect(view.amounts).toEqual({
      saved: '€0.00',
      target: '€1,500.00',
      remaining: '€1,500.00',
      percent: 0,
      funded: false,
      over: null,
    });
    expect(view.stage).toBe(0);
    expect(view.fraction).toBe(0);
    expect(view.next).toEqual({ kind: 'next', percent: 10, name: 'First tree', toNext: '€150.00' });
  });

  it('partial: €330.00 of €1,500.00 is 22%, stage 2, €120.00 more to reach 30%', () => {
    const view = dashboard(33_000, 150_000);
    expect(view.amounts).toMatchObject({ saved: '€330.00', remaining: '€1,170.00', percent: 22, funded: false, over: null });
    expect(view.stage).toBe(2);
    expect(view.next).toEqual({ kind: 'next', percent: 30, name: 'Flowers and bushes', toNext: '€120.00' });
  });

  it('one minor unit short is 99%, stage 9 and never "Target reached"', () => {
    const view = dashboard(149_999, 150_000);
    expect(view.amounts).toMatchObject({ remaining: '€0.01', percent: 99, funded: false, over: null });
    expect(view.stage).toBe(9);
    expect(view.fraction).toBeLessThan(1);
    expect(view.next).toEqual({ kind: 'next', percent: 100, name: 'Completed island', toNext: '€0.01' });
  });

  it('exactly complete: 100%, stage 10, nothing to go, no next milestone', () => {
    const view = dashboard(150_000, 150_000);
    expect(view.amounts).toMatchObject({ remaining: '€0.00', percent: 100, funded: true, over: null });
    expect(view.stage).toBe(10);
    expect(view.fraction).toBe(1);
    expect(view.next).toEqual({ kind: 'complete', title: 'Your island is complete!', detail: 'You’ve unlocked every part of your world.' });
  });

  it('overfunded: 125% and €375.00 over the target, the scene stays at its tenth unlock', () => {
    const view = dashboard(187_500, 150_000);
    expect(view.amounts).toMatchObject({ saved: '€1,875.00', remaining: '€0.00', percent: 125, funded: true, over: '€375.00' });
    expect(view.stage).toBe(10);
    expect(view.fraction).toBe(1);
    expect(view.next).toEqual({ kind: 'complete', title: 'Your island is complete!', detail: 'You’ve unlocked every part of your world.' });
  });

  it('follows the v1.2 €2,000 example', () => {
    expect(dashboard(19_999, 200_000).stage).toBe(0);
    expect(dashboard(20_000, 200_000).stage).toBe(1);
    expect(dashboard(100_000, 200_000).stage).toBe(5);
    expect(dashboard(180_000, 200_000).stage).toBe(9);
    expect(dashboard(210_000, 200_000)).toMatchObject({
      stage: 10,
      amounts: { saved: '€2,100.00', remaining: '€0.00', percent: 105, over: '€100.00' },
    });
  });

  it('uses the global currency exponent: 0 and 3 decimals', () => {
    expect(homeDashboard(summary(3_300, 15_000), JPY, TODAY, 'en-US').amounts).toMatchObject({
      saved: '¥3,300',
      remaining: '¥11,700',
      percent: 22,
    });
    expect(plainSpaces(homeDashboard(summary(1, 3, '2026-10-29'), KWD, TODAY, 'en-US'))).toMatchObject({
      amounts: { saved: 'KWD 0.001', remaining: 'KWD 0.002', percent: 33 },
      next: { kind: 'next', percent: 40, name: 'Small house', toNext: 'KWD 0.001' },
      // R = 2, D = 7: weekly ceil(14 / 7) = 2, monthly min(2, ceil(60 / 7)) = 2.
      estimate: { kind: 'pace', days: 7, weeklyMinor: 2, monthlyMinor: 2 },
    });
  });

  it('formats with an alternate number locale without changing a value', () => {
    const view = plainSpaces(homeDashboard(summary(33_000, 150_000, '2026-11-21'), EUR, TODAY, 'de-DE'));
    expect(view.amounts).toMatchObject({ saved: '330,00 €', target: '1.500,00 €', remaining: '1.170,00 €', percent: 22 });
    // R = 117000, D = 30 (29 days left): weekly ceil(819000 / 30) = 27300.
    expect(view.planCopy).toMatchObject({ kind: 'plan', date: '21. Nov. 2026', timeLeft: '29 days left', needed: { amount: '1.170,00 €', pace: '273,00 € a week' } });
  });
});

describe('savings plan (v1.2 pace, D84 cards)', () => {
  it('R = 100.00 and D = 30 keeps the v1.2 paces and suggests 23.34 a week, with the explanation', () => {
    // 23 Oct through 21 Nov 2026, both included: 9 + 21 = 30 days; 29 days from today.
    const view = dashboard(0, 10_000, '2026-11-21');
    expect(view.estimate).toEqual({ kind: 'pace', remainingMinor: 10_000, days: 30, weeklyMinor: 2_334, monthlyMinor: 10_000 });
    expect(view.plan).toEqual({
      kind: 'saving',
      deadline: '2026-11-21',
      timing: { kind: 'ahead', daysLeft: 29 },
      remainingMinor: 10_000,
      pace: { period: 'week', amountMinor: 2_334, days: 30 },
    });
    expect(view.planCopy).toEqual({
      kind: 'plan',
      date: 'Nov 21, 2026',
      timeLeft: '29 days left',
      passed: false,
      deadlineLabel: 'Deadline Nov 21, 2026, 29 days left',
      needed: { kind: 'saving', amount: '€100.00', pace: '€23.34 a week', note: null },
      explanation:
        '€100.00 is still to go over 30 days, counting today and the deadline. A week is €100.00 ÷ 30 × 7, rounded up and never more than what is left. It is a guide, not a plan.',
    });
  });

  it('two months or more suggests a monthly amount instead', () => {
    // 23 Oct through 22 Dec: 61 days; monthly ceil(600000 / 61) = 9837.
    const view = dashboard(0, 20_000, '2026-12-22');
    expect(view.plan).toMatchObject({ pace: { period: 'month', amountMinor: 9_837, days: 61 } });
    expect(view.planCopy).toMatchObject({ timeLeft: '60 days left', needed: { pace: '€98.37 a month' } });
  });

  it('suggests no per-period amount with less than two weeks left: it would be the whole remainder', () => {
    // D = 13 (12 days left): the v1.2 weekly pace is ceil(7500 × 7 / 13) = 4039, more than half of R.
    const view = dashboard(2_500, 10_000, '2026-11-04');
    expect(view.estimate).toMatchObject({ kind: 'pace', days: 13 });
    expect(view.plan).toMatchObject({ kind: 'saving', remainingMinor: 7_500, pace: null });
    expect(view.planCopy).toMatchObject({ timeLeft: '12 days left', needed: { amount: '€75.00', pace: null, note: null }, explanation: null });
    // D = 14 is the first day with a weekly amount.
    expect(dashboard(2_500, 10_000, '2026-11-05').plan).toMatchObject({ pace: { period: 'week', days: 14 } });
  });

  it('a deadline today: the remaining amount, no per-period amount, no division by zero', () => {
    const view = dashboard(2_500, 10_000, TODAY);
    expect(view.estimate).toEqual({ kind: 'pace', remainingMinor: 7_500, days: 1, weeklyMinor: 7_500, monthlyMinor: 7_500 });
    expect(view.planCopy).toEqual({
      kind: 'plan',
      date: 'Oct 23, 2026',
      timeLeft: 'Today',
      passed: false,
      deadlineLabel: 'Deadline Oct 23, 2026, today',
      needed: { kind: 'saving', amount: '€75.00', pace: null, note: null },
      explanation: null,
    });
    expect(dashboard(2_500, 10_000, '2026-10-24').planCopy).toMatchObject({ timeLeft: 'Tomorrow' });
  });

  it('a passed deadline with money to go: "Deadline passed", the remaining amount and how to move on', () => {
    const view = dashboard(2_500, 10_000, '2026-10-22');
    expect(view.estimate).toEqual({ kind: 'overdue', remainingMinor: 7_500 });
    expect(view.planCopy).toEqual({
      kind: 'plan',
      date: 'Oct 22, 2026',
      timeLeft: 'Deadline passed',
      passed: true,
      deadlineLabel: 'Deadline Oct 22, 2026, passed',
      needed: { kind: 'saving', amount: '€75.00', pace: null, note: 'Choose a new date in Edit goal' },
      explanation: null,
    });
  });

  it('nothing left to save shows the completed state, before, on or after the deadline', () => {
    for (const [deadline, timeLeft] of [['2026-10-01', 'Deadline passed'], [TODAY, 'Today'], ['2027-06-30', '250 days left']] as const) {
      const view = dashboard(10_000, 10_000, deadline);
      expect(view.estimate).toEqual({ kind: 'funded', weeklyMinor: 0, monthlyMinor: 0 });
      expect(view.planCopy).toMatchObject({ kind: 'plan', timeLeft, needed: { kind: 'complete' }, explanation: null });
    }
    expect(dashboard(12_000, 10_000, '2026-10-01').plan.kind).toBe('complete');
  });

  it('no deadline means no plan', () => {
    const view = dashboard(2_500, 10_000, null);
    expect(view.estimate).toEqual({ kind: 'none' });
    expect(view.plan).toEqual({ kind: 'none' });
    expect(view.planCopy).toEqual({ kind: 'none' });
  });

  it('target and deadline edits change the v1.2 paces', () => {
    expect(dashboard(0, 10_000, '2026-11-21').estimate).toMatchObject({ weeklyMinor: 2_334, monthlyMinor: 10_000 });
    expect(dashboard(0, 20_000, '2026-11-21').estimate).toMatchObject({ weeklyMinor: 4_667, monthlyMinor: 20_000 });
    expect(dashboard(0, 20_000, '2026-12-22').estimate).toMatchObject({ days: 61, weeklyMinor: 2_296, monthlyMinor: 9_837 });
  });

  it('deadlineTiming counts calendar days from today', () => {
    const t = (date: string) => deadlineTiming(date as CivilDate, TODAY);
    expect([t('2026-10-22'), t(TODAY), t('2026-10-24'), t('2026-10-25')]).toEqual([
      { kind: 'passed' },
      { kind: 'today' },
      { kind: 'ahead', daysLeft: 1 },
      { kind: 'ahead', daysLeft: 2 },
    ]);
  });

  it('wording of an explicit plan, independent of the dashboard', () => {
    const plan = savingsPlan({ balanceMinor: 0, targetMinor: 100, deadline: '2026-10-25' as CivilDate, today: TODAY });
    expect(savingsPlanCopy(plan, { amount: (minor) => String(minor), date: (date) => date })).toMatchObject({ timeLeft: '2 days left', needed: { amount: '100', pace: null } });
  });
});

describe('clock boundaries', () => {
  // Instants are UTC; the civil date comes from the clock's zone, exactly as the app reads it.
  const at = (iso: string, zone: string) => today(fixedClock(Date.parse(iso), zone));

  it('today → overdue at local midnight, not at UTC midnight', () => {
    // Belgrade is UTC+2 on 23 Oct 2026 (summer time ends 25 Oct).
    const before = at('2026-10-23T21:59:59.999Z', 'Europe/Belgrade');
    const after = at('2026-10-23T22:00:00.000Z', 'Europe/Belgrade');
    expect([before, after]).toEqual(['2026-10-23', '2026-10-24']);
    expect(dashboard(0, 10_000, '2026-10-23', before).planCopy).toMatchObject({ kind: 'plan', timeLeft: 'Today' });
    expect(dashboard(0, 10_000, '2026-10-23', after).planCopy).toMatchObject({ kind: 'plan', timeLeft: 'Deadline passed', date: 'Oct 23, 2026' });
  });

  it('the same instant can be a different day in another zone', () => {
    const instant = '2026-10-23T11:30:00.000Z';
    expect(at(instant, 'Pacific/Kiritimati')).toBe('2026-10-24');
    expect(at(instant, 'Pacific/Pago_Pago')).toBe('2026-10-23');
    expect(dashboard(0, 10_000, '2026-10-23', at(instant, 'Pacific/Kiritimati')).estimate.kind).toBe('overdue');
    expect(dashboard(0, 10_000, '2026-10-23', at(instant, 'Pacific/Pago_Pago')).estimate.kind).toBe('pace');
  });

  it('Sunday → Monday shortens D by one, on the day summer time ends', () => {
    // Sunday 25 Oct 2026 has 25 hours in Belgrade; 23:30 local is 22:30 UTC.
    const sunday = at('2026-10-25T22:30:00.000Z', 'Europe/Belgrade');
    const monday = at('2026-10-25T23:30:00.000Z', 'Europe/Belgrade');
    expect([sunday, monday]).toEqual(['2026-10-25', '2026-10-26']);
    // Deadline Sunday 1 Nov: D = 8 on Sunday (ceil(70000 / 8) = 8750), D = 7 on Monday (= R).
    expect(dashboard(0, 10_000, '2026-11-01', sunday).estimate).toMatchObject({ days: 8, weeklyMinor: 8_750, monthlyMinor: 10_000 });
    expect(dashboard(0, 10_000, '2026-11-01', monday).estimate).toMatchObject({ days: 7, weeklyMinor: 10_000, monthlyMinor: 10_000 });
  });

  it('month and leap-day boundaries count calendar days, not 30-day months', () => {
    // 31 Jan through 28 Feb 2026: D = 29; weekly ceil(70000 / 29) = 2414, monthly min(R, ceil(300000 / 29)) = R.
    expect(dashboard(0, 10_000, '2026-02-28', '2026-01-31' as CivilDate).estimate).toMatchObject({
      days: 29,
      weeklyMinor: 2_414,
      monthlyMinor: 10_000,
    });
    // 28 Feb through 1 Mar 2028 includes 29 Feb: D = 3; weekly = min(R, ceil(70000 / 3)) = R.
    expect(dashboard(0, 10_000, '2028-03-01', '2028-02-28' as CivilDate).estimate).toMatchObject({ days: 3, weeklyMinor: 10_000 });
    // 1 Jan through 31 Dec 2028 (leap year): D = 366; weekly ceil(70000 / 366) = 192, monthly ceil(300000 / 366) = 820.
    expect(dashboard(0, 10_000, '2028-12-31', '2028-01-01' as CivilDate).estimate).toMatchObject({
      days: 366,
      weeklyMinor: 192,
      monthlyMinor: 820,
    });
  });

  it('reads the civil date at the instant it is asked, in the zone of that moment', () => {
    expect(civilDateAt(Date.parse('2026-12-31T23:30:00.000Z'), 'UTC')).toBe('2026-12-31');
    expect(civilDateAt(Date.parse('2026-12-31T23:30:00.000Z'), 'Europe/Belgrade')).toBe('2027-01-01');
  });
});
