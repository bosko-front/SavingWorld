import {
  isoWeekday,
  parseCivilDate,
  startOfCivilDateMs,
  weekEndDate,
  weekStartDate,
  type CivilDate,
} from '@/core/calendar';
import { MAX_MINOR } from '@/core/money';
import type { ChallengeAttemptRecord, ChallengeRuleId } from '@/data/repositories/challenge-attempt-repository';
import {
  attemptProgress,
  availability,
  challengeBoard,
  countsForAttempt,
  planAttempt,
  settleAttempt,
  type ChallengeEntry,
  type ChallengeGoal,
  type RuleContext,
} from '@/features/challenges/domain/challenge-rules';

// Fixed challenge rules (v1.2 section 7, docs/DATA_MODEL.md "Three fixed challenge rules";
// TEST_PLAN T11, T12, T28). Expected values were worked out by hand from the v1.2 formulas and
// each zone's 2026 offsets: Belgrade leaves summer time on Sunday 25 October, New York on Sunday
// 1 November and enters it on Sunday 8 March, Santiago skips Sunday 6 September 00:00-01:00.

function date(text: string): CivilDate {
  const parsed = parseCivilDate(text);
  if (!parsed.ok) {
    throw new Error(`fixture date ${text} is invalid`);
  }
  return parsed.value;
}

const iso = (ms: number) => new Date(ms).toISOString();

const CHALLENGE_RULES: ChallengeRuleId[] = ['first_step', 'next_milestone', 'weekly_step'];

const goal = (overrides: Partial<ChallengeGoal> = {}): ChallengeGoal => ({
  status: 'active',
  targetMinor: 100_000,
  deadlineDate: null,
  ...overrides,
});

const context = (overrides: Partial<RuleContext> = {}): RuleContext => ({
  goal: goal(),
  balanceMinor: 0,
  attempts: [],
  today: date('2026-10-21'),
  ...overrides,
});

function plan(ruleId: ChallengeRuleId, ctx: RuleContext, startedAtUtc = '2026-10-21T08:00:00.000Z', timeZone = 'Europe/Belgrade') {
  const planned = planAttempt({ id: 'a1', goalId: 'g1', ruleId, startedAtUtc, timeZone }, ctx);
  if (!planned.ok) {
    throw new Error(`expected ${ruleId} to start, got ${planned.error}`);
  }
  return planned.value;
}

function weekly(overrides: Partial<ChallengeAttemptRecord> = {}): ChallengeAttemptRecord {
  return {
    id: 'w1',
    goalId: 'g1',
    ruleId: 'weekly_step',
    targetMinor: 1_000,
    milestoneStage: null,
    startedAtUtc: '2026-10-21T08:00:00.000Z',
    startDate: date('2026-10-21'),
    weekStartDate: date('2026-10-19'),
    periodEndDate: date('2026-10-25'),
    periodEndAtUtc: '2026-10-25T23:00:00.000Z',
    periodTimezone: 'Europe/Belgrade',
    state: 'active',
    result: null,
    historicalAtUtc: null,
    ...overrides,
  };
}

const record = (createdAtUtc: string, entryDate: string, signedAmountMinor: number): ChallengeEntry => ({
  createdAtUtc,
  entryDate: date(entryDate),
  signedAmountMinor,
});

describe('calendar weeks', () => {
  it.each([
    ['1970-01-01', 4],
    ['2000-01-01', 6],
    ['2024-02-29', 4],
    ['2026-10-19', 1],
    ['2026-10-21', 3],
    ['2026-10-25', 7],
    ['2026-10-26', 1],
  ])('%s is ISO weekday %i', (text, weekday) => {
    expect(isoWeekday(date(text))).toBe(weekday);
  });

  it.each([
    ['2026-10-19', '2026-10-19', '2026-10-25'],
    ['2026-10-25', '2026-10-19', '2026-10-25'],
    ['2026-10-26', '2026-10-26', '2026-11-01'],
    ['2026-12-31', '2026-12-28', '2027-01-03'],
    ['2028-03-01', '2028-02-28', '2028-03-05'],
  ])('%s belongs to the week %s to %s', (text, monday, sunday) => {
    expect([weekStartDate(date(text)), weekEndDate(date(text))]).toEqual([monday, sunday]);
  });

  it.each([
    ['2026-10-26', 'Europe/Belgrade', '2026-10-25T23:00:00.000Z'],
    ['2026-10-19', 'Europe/Belgrade', '2026-10-18T22:00:00.000Z'],
    ['2026-11-02', 'America/New_York', '2026-11-02T05:00:00.000Z'],
    ['2026-03-09', 'America/New_York', '2026-03-09T04:00:00.000Z'],
    // Midnight does not exist: the first local minute of the date is 01:00.
    ['2026-09-06', 'America/Santiago', '2026-09-06T04:00:00.000Z'],
    ['2026-10-26', 'Asia/Kathmandu', '2026-10-25T18:15:00.000Z'],
    ['2026-10-26', 'Pacific/Kiritimati', '2026-10-25T10:00:00.000Z'],
    ['2026-10-26', 'Pacific/Honolulu', '2026-10-26T10:00:00.000Z'],
    ['2026-10-26', 'UTC', '2026-10-26T00:00:00.000Z'],
  ])('%s begins in %s at %s', (text, zone, expected) => {
    expect(iso(startOfCivilDateMs(date(text), zone))).toBe(expected);
  });
});

describe('availability', () => {
  it('offers all three only where their conditions hold', () => {
    const ctx = context({ goal: goal({ deadlineDate: date('2026-11-19') }), balanceMinor: 5_000 });
    expect(availability('first_step', ctx)).toEqual({ available: true, preview: { ruleId: 'first_step' } });
    expect(availability('next_milestone', ctx)).toEqual({
      available: true,
      preview: { ruleId: 'next_milestone', targetMinor: 5_000, thresholdMinor: 10_000, milestoneStage: 1 },
    });
    // R = 95,000, D = 30: ceil(665,000 / 30) = 22,167.
    expect(availability('weekly_step', ctx)).toEqual({
      available: true,
      preview: { ruleId: 'weekly_step', targetMinor: 22_167, weekStartDate: '2026-10-19', periodEndDate: '2026-10-25' },
    });
  });

  it('refuses a completed goal and a second unfinished attempt first', () => {
    const closed = context({ goal: goal({ status: 'completed' }) });
    expect(availability('first_step', closed)).toEqual({ available: false, reason: 'goal_closed' });
    const busy = context({ attempts: [weekly()] });
    expect(CHALLENGE_RULES.map((rule) => availability(rule, busy))).toEqual(
      CHALLENGE_RULES.map(() => ({ available: false, reason: 'attempt_active' })),
    );
  });

  it('allows First step once per goal, whatever its result', () => {
    for (const result of ['completed', 'not_completed', 'skipped'] as const) {
      const used = weekly({ ruleId: 'first_step', targetMinor: null, state: 'historical', result, historicalAtUtc: '2026-10-22T00:00:00.000Z' });
      expect(availability('first_step', context({ attempts: [used] }))).toEqual({ available: false, reason: 'already_used' });
    }
  });

  it('allows Next milestone only below the target', () => {
    expect(availability('next_milestone', context({ balanceMinor: 100_000 }))).toEqual({ available: false, reason: 'target_reached' });
    expect(availability('next_milestone', context({ balanceMinor: 125_000 }))).toEqual({ available: false, reason: 'target_reached' });
  });

  it.each([
    [null, 0, 'no_deadline'],
    ['2026-10-20', 0, 'deadline_passed'],
    ['2026-11-19', 100_000, 'target_reached'],
    [null, 100_000, 'no_deadline'],
  ] as const)('refuses Weekly step with deadline %s and balance %i: %s', (deadline, balanceMinor, reason) => {
    const ctx = context({ goal: goal({ deadlineDate: deadline === null ? null : date(deadline) }), balanceMinor });
    expect(availability('weekly_step', ctx)).toEqual({ available: false, reason });
  });

  it('allows Weekly step once per calendar week, also after Skip, and again the next Monday', () => {
    const skipped = weekly({ state: 'historical', result: 'skipped', historicalAtUtc: '2026-10-22T09:00:00.000Z' });
    const ctx = (today: string) => context({ goal: goal({ deadlineDate: date('2026-11-19') }), attempts: [skipped], today: date(today) });
    expect(availability('weekly_step', ctx('2026-10-25'))).toEqual({ available: false, reason: 'used_this_week' });
    expect(availability('weekly_step', ctx('2026-10-26')).available).toBe(true);
  });

  it('uses the whole remaining amount when the deadline is today', () => {
    const ctx = context({ goal: goal({ deadlineDate: date('2026-10-21') }), balanceMinor: 40_000 });
    expect(availability('weekly_step', ctx)).toMatchObject({ available: true, preview: { targetMinor: 60_000 } });
  });
});

describe('Next milestone thresholds', () => {
  it.each([
    // T, B → threshold ceil(T × (floor(10B/T) + 1) / 10), frozen target, milestone
    [100_000, 0, 10_000, 10_000, 1],
    [100_000, 9_999, 10_000, 1, 1],
    [100_000, 10_000, 20_000, 10_000, 2],
    [100_000, 99_999, 100_000, 1, 10],
    [1, 0, 1, 1, 1],
    [3, 0, 1, 1, 1],
    [3, 1, 2, 1, 4],
    [3, 2, 3, 1, 7],
    [7, 1, 2, 1, 2],
    [7, 2, 3, 1, 3],
    [MAX_MINOR, 0, 100_000_000_000, 100_000_000_000, 1],
  ])('T=%i B=%i aims at %i: target %i for milestone %i', (targetMinor, balanceMinor, threshold, frozen, milestone) => {
    const planned = plan('next_milestone', context({ goal: goal({ targetMinor }), balanceMinor }));
    expect([planned.targetMinor, planned.milestoneStage, planned.periodEndDate, planned.periodEndAtUtc]).toEqual([
      frozen,
      milestone,
      null,
      null,
    ]);
    expect(balanceMinor + frozen).toBe(threshold);
  });
});

describe('Weekly step period', () => {
  const deadline = goal({ deadlineDate: date('2026-12-31') });

  it.each([
    // started (UTC), zone, saved start date, Monday, Sunday, end instant
    ['2026-10-21T08:00:00.000Z', 'Europe/Belgrade', '2026-10-21', '2026-10-19', '2026-10-25', '2026-10-25T23:00:00.000Z'],
    // Sunday 23:59 in Belgrade: one minute left in the week.
    ['2026-10-25T22:59:00.000Z', 'Europe/Belgrade', '2026-10-25', '2026-10-19', '2026-10-25', '2026-10-25T23:00:00.000Z'],
    // Monday 00:00 in Belgrade: a new week.
    ['2026-10-25T23:00:00.000Z', 'Europe/Belgrade', '2026-10-26', '2026-10-26', '2026-11-01', '2026-11-01T23:00:00.000Z'],
    ['2026-10-26T00:30:00.000Z', 'Asia/Tokyo', '2026-10-26', '2026-10-26', '2026-11-01', '2026-11-01T15:00:00.000Z'],
    ['2026-10-30T12:00:00.000Z', 'America/New_York', '2026-10-30', '2026-10-26', '2026-11-01', '2026-11-02T05:00:00.000Z'],
    ['2026-03-05T12:00:00.000Z', 'America/New_York', '2026-03-05', '2026-03-02', '2026-03-08', '2026-03-09T04:00:00.000Z'],
    ['2026-10-25T12:00:00.000Z', 'Asia/Kathmandu', '2026-10-25', '2026-10-19', '2026-10-25', '2026-10-25T18:15:00.000Z'],
  ])('started %s in %s keeps %s, %s to %s, ending %s', (startedAtUtc, zone, startDate, monday, sunday, end) => {
    const today = date(startDate);
    const planned = plan('weekly_step', context({ goal: deadline, today }), startedAtUtc, zone);
    expect([planned.startDate, planned.weekStartDate, planned.periodEndDate, planned.periodEndAtUtc, planned.periodTimezone]).toEqual([
      startDate,
      monday,
      sunday,
      end,
      zone,
    ]);
  });

  it('freezes the weekly estimate of the start day, midweek too, without raising it', () => {
    // R = 100,000; D = 21 Oct..31 Dec = 72 days: ceil(700,000 / 72) = 9,723, though only five days
    // of the week are left.
    const wednesday = plan('weekly_step', context({ goal: deadline, today: date('2026-10-21') }));
    expect(wednesday.targetMinor).toBe(9_723);
    const sunday = plan('weekly_step', context({ goal: deadline, today: date('2026-10-25') }), '2026-10-25T08:00:00.000Z');
    // D = 68: ceil(700,000 / 68) = 10,295.
    expect(sunday.targetMinor).toBe(10_295);
  });
});

describe('counting records', () => {
  const attempt = weekly();

  it.each([
    ['created at the start instant', record('2026-10-21T08:00:00.000Z', '2026-10-21', 500), false],
    ['created one millisecond after the start', record('2026-10-21T08:00:00.001Z', '2026-10-21', 500), true],
    ['dated the day before the start date', record('2026-10-22T08:00:00.000Z', '2026-10-20', 500), false],
    ['dated the saved Sunday', record('2026-10-25T12:00:00.000Z', '2026-10-25', 500), true],
    ['dated after the saved Sunday', record('2026-10-25T22:00:00.000Z', '2026-10-26', 500), false],
    ['created one millisecond before the week ended', record('2026-10-25T22:59:59.999Z', '2026-10-25', 500), true],
    ['created when the week ended, dated inside it', record('2026-10-25T23:00:00.000Z', '2026-10-25', 500), false],
    ['created days later with an earlier date', record('2026-10-28T08:00:00.000Z', '2026-10-22', 500), false],
  ])('%s', (_label, entry, counted) => {
    expect(countsForAttempt(attempt, entry)).toBe(counted);
  });

  it('stops counting records created after an attempt became historical', () => {
    const closed = weekly({ ruleId: 'first_step', targetMinor: null, periodEndDate: null, periodEndAtUtc: null, weekStartDate: null, state: 'historical', result: 'skipped', historicalAtUtc: '2026-10-22T08:00:00.000Z' });
    expect(countsForAttempt(closed, record('2026-10-22T08:00:00.000Z', '2026-10-22', 500))).toBe(true);
    expect(countsForAttempt(closed, record('2026-10-22T08:00:00.001Z', '2026-10-22', 500))).toBe(false);
  });

  it('nets deposits and withdrawals, never below zero, capped at the money limit', () => {
    const entries = [
      record('2026-10-21T09:00:00.000Z', '2026-10-21', 600),
      record('2026-10-21T10:00:00.000Z', '2026-10-21', -900),
    ];
    expect(attemptProgress(attempt, entries)).toEqual({ kind: 'amount', targetMinor: 1_000, progressMinor: 0, remainingMinor: 1_000, met: false });
    const more = [...entries, record('2026-10-22T09:00:00.000Z', '2026-10-22', 1_300)];
    expect(attemptProgress(attempt, more)).toEqual({ kind: 'amount', targetMinor: 1_000, progressMinor: 1_000, remainingMinor: 0, met: true });
    const huge = [record('2026-10-21T09:00:00.000Z', '2026-10-21', MAX_MINOR), record('2026-10-21T10:00:00.000Z', '2026-10-22', MAX_MINOR)];
    expect(attemptProgress(attempt, huge)).toMatchObject({ progressMinor: MAX_MINOR, met: true });
  });

  it('First step needs a counted positive deposit; a withdrawal is not one', () => {
    const first = weekly({ ruleId: 'first_step', targetMinor: null, periodEndDate: null, periodEndAtUtc: null, weekStartDate: null });
    expect(attemptProgress(first, [record('2026-10-21T09:00:00.000Z', '2026-10-21', -100)])).toEqual({ kind: 'first_deposit', met: false });
    expect(attemptProgress(first, [record('2026-10-30T09:00:00.000Z', '2026-10-30', 1)])).toEqual({ kind: 'first_deposit', met: true });
  });
});

describe('settling', () => {
  const met = [record('2026-10-22T09:00:00.000Z', '2026-10-22', 1_000)];

  it('completes an active attempt when it is met', () => {
    expect(settleAttempt(weekly(), met, '2026-10-22T09:00:00.000Z')).toEqual({
      state: 'historical',
      result: 'completed',
      historicalAtUtc: '2026-10-22T09:00:00.000Z',
    });
    expect(settleAttempt(weekly(), [], '2026-10-22T09:00:00.000Z')).toEqual({ state: 'active', result: null, historicalAtUtc: null });
  });

  it('ends a Weekly step at the saved end: Not completed, or Completed by records counted in time', () => {
    const after = '2026-10-26T07:00:00.000Z';
    expect(settleAttempt(weekly(), [], after)).toEqual({ state: 'historical', result: 'not_completed', historicalAtUtc: '2026-10-25T23:00:00.000Z' });
    expect(settleAttempt(weekly(), met, after)).toEqual({ state: 'historical', result: 'completed', historicalAtUtc: '2026-10-25T23:00:00.000Z' });
    const late = [record('2026-10-26T06:00:00.000Z', '2026-10-25', 5_000)];
    expect(settleAttempt(weekly(), late, after).result).toBe('not_completed');
  });

  it('corrects historical results without reactivating them; Skipped stays Skipped', () => {
    const completed = weekly({ state: 'historical', result: 'completed', historicalAtUtc: '2026-10-22T09:00:00.000Z' });
    expect(settleAttempt(completed, [], '2026-10-23T09:00:00.000Z')).toEqual({
      state: 'historical',
      result: 'not_completed',
      historicalAtUtc: '2026-10-22T09:00:00.000Z',
    });
    const skipped = weekly({ state: 'historical', result: 'skipped', historicalAtUtc: '2026-10-22T10:00:00.000Z' });
    expect(settleAttempt(skipped, met, '2026-10-23T09:00:00.000Z').result).toBe('skipped');
  });
});

describe('challenge board', () => {
  it('reads an ended week as history without a write, keeps the saved period while travelling and orders history newest first', () => {
    const first = weekly({ id: 'f1', ruleId: 'first_step', targetMinor: null, periodEndDate: null, periodEndAtUtc: null, weekStartDate: null, startedAtUtc: '2026-10-20T08:00:00.000Z', startDate: date('2026-10-20'), state: 'historical', result: 'skipped', historicalAtUtc: '2026-10-20T09:00:00.000Z' });
    const board = challengeBoard({
      goal: goal({ deadlineDate: date('2026-11-19') }),
      balanceMinor: 1_000,
      entries: [record('2026-10-22T09:00:00.000Z', '2026-10-22', 400)],
      attempts: [first, weekly()],
      // Honolulu on Sunday afternoon, already Monday in Belgrade.
      today: date('2026-10-25'),
      nowUtc: '2026-10-26T00:30:00.000Z',
    });
    expect(board.current).toBeNull();
    expect(board.history.map((view) => [view.id, view.result, view.historicalAtUtc])).toEqual([
      ['w1', 'not_completed', '2026-10-25T23:00:00.000Z'],
      ['f1', 'skipped', '2026-10-20T09:00:00.000Z'],
    ]);
    expect(board.history[0]).toMatchObject({
      periodEndDate: '2026-10-25',
      periodEndAtUtc: '2026-10-25T23:00:00.000Z',
      periodTimezone: 'Europe/Belgrade',
      progress: { kind: 'amount', targetMinor: 1_000, progressMinor: 400, remainingMinor: 600, met: false },
    });
    expect(board.offers.map((offer) => [offer.ruleId, offer.availability.available ? 'available' : offer.availability.reason])).toEqual([
      ['first_step', 'already_used'],
      ['next_milestone', 'available'],
      ['weekly_step', 'used_this_week'],
    ]);
  });

  it('shows the current attempt with its frozen milestone', () => {
    const next = weekly({ id: 'n1', ruleId: 'next_milestone', targetMinor: 5_000, milestoneStage: 3, periodEndDate: null, periodEndAtUtc: null, weekStartDate: null });
    const board = challengeBoard({
      goal: goal({ targetMinor: 200_000 }),
      balanceMinor: 27_000,
      entries: [record('2026-10-21T09:00:00.000Z', '2026-10-21', 2_000)],
      attempts: [next],
      today: date('2026-10-21'),
      nowUtc: '2026-10-21T10:00:00.000Z',
    });
    expect(board.current).toMatchObject({
      id: 'n1',
      state: 'active',
      milestoneStage: 3,
      progress: { kind: 'amount', targetMinor: 5_000, progressMinor: 2_000, remainingMinor: 3_000, met: false },
    });
    expect(board.history).toEqual([]);
  });
});
