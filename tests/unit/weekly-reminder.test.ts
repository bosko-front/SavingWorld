import {
  isCurrentWeeklyRequest,
  planReconcile,
  reminderState,
  WEEKLY_REMINDER,
  type ReminderPermission,
  type ScheduledRequest,
} from '@/features/reminders/domain/weekly-reminder';

// Pure rules of the one global weekly reminder (v1.2 section 3, R17): when it is wanted, what the
// one OS request must look like, and what a reconciliation cancels or schedules.

const current: ScheduledRequest = {
  identifier: WEEKLY_REMINDER.identifier,
  weekly: { weekday: 1, hour: 18, minute: 0, repeats: true, timeZone: null },
  contentVersion: WEEKLY_REMINDER.contentVersion,
};

describe('the reminder schedule', () => {
  it('is Sunday (weekday 1 in the iOS numbering) at 18:00 with the approved generic text', () => {
    expect(WEEKLY_REMINDER).toMatchObject({ weekday: 1, hour: 18, minute: 0, contentVersion: 2 });
    expect(WEEKLY_REMINDER.title).toBe('A little progress goes a long way 🌱');
    expect(WEEKLY_REMINDER.body).toBe('Ready to grow your world? Check in on your savings this week.');
    // No amounts in the text.
    expect(`${WEEKLY_REMINDER.title} ${WEEKLY_REMINDER.body}`).not.toMatch(/\d/);
  });
});

describe('reminderState', () => {
  const base = { enabled: true, permission: 'authorized' as ReminderPermission, activeGoalCount: 1 };

  it('is off until the person opts in, whatever else holds', () => {
    expect(reminderState({ ...base, enabled: false })).toBe('off');
    expect(reminderState({ enabled: false, permission: 'undetermined', activeGoalCount: 0 })).toBe('off');
  });

  it('needs an answer from iOS before anything can be scheduled', () => {
    expect(reminderState({ ...base, permission: 'undetermined' })).toBe('needs_permission');
  });

  it('respects a denial', () => {
    expect(reminderState({ ...base, permission: 'denied' })).toBe('denied');
  });

  it.each(['authorized', 'provisional', 'ephemeral'] as const)('treats %s as permitted', (permission) => {
    expect(reminderState({ ...base, permission })).toBe('on');
  });

  it('rests with zero active goals and is on with one or several', () => {
    expect(reminderState({ ...base, activeGoalCount: 0 })).toBe('no_active_goal');
    expect(reminderState({ ...base, activeGoalCount: 1 })).toBe('on');
    expect(reminderState({ ...base, activeGoalCount: 5 })).toBe('on');
  });
});

describe('isCurrentWeeklyRequest', () => {
  it('accepts exactly the one current request', () => {
    expect(isCurrentWeeklyRequest(current)).toBe(true);
  });

  it.each<[string, ScheduledRequest]>([
    ['another identifier', { ...current, identifier: 'old-id' }],
    ['older text', { ...current, contentVersion: 0 }],
    ['no payload marker', { ...current, contentVersion: null }],
    ['a one-off trigger', { ...current, weekly: null }],
    ['a non-repeating trigger', { ...current, weekly: { ...current.weekly!, repeats: false } }],
    ['Monday', { ...current, weekly: { ...current.weekly!, weekday: 2 } }],
    ['19:00', { ...current, weekly: { ...current.weekly!, hour: 19 } }],
    ['18:30', { ...current, weekly: { ...current.weekly!, minute: 30 } }],
    ['a pinned time zone', { ...current, weekly: { ...current.weekly!, timeZone: 'Europe/Belgrade' } }],
  ])('rejects %s', (_label, request) => {
    expect(isCurrentWeeklyRequest(request)).toBe(false);
  });
});

describe('planReconcile', () => {
  it('schedules the one request when wanted and missing', () => {
    expect(planReconcile(true, [])).toEqual({ cancel: [], schedule: true });
  });

  it('does nothing when the one request is already there (repeat reconciliation never duplicates)', () => {
    expect(planReconcile(true, [current])).toEqual({ cancel: [], schedule: false });
  });

  it('does nothing with no request and none wanted', () => {
    expect(planReconcile(false, [])).toEqual({ cancel: [], schedule: false });
  });

  it('cancels the request when no longer wanted', () => {
    expect(planReconcile(false, [current])).toEqual({ cancel: [WEEKLY_REMINDER.identifier], schedule: false });
  });

  it('keeps the current request and cancels duplicates and orphans', () => {
    const orphan: ScheduledRequest = { identifier: 'interrupted-1', weekly: current.weekly, contentVersion: 1 };
    const oneOff: ScheduledRequest = { identifier: 'test-fire', weekly: null, contentVersion: null };
    expect(planReconcile(true, [orphan, current, oneOff, orphan])).toEqual({ cancel: ['interrupted-1', 'test-fire'], schedule: false });
  });

  it('replaces a request with older text or another time', () => {
    expect(planReconcile(true, [{ ...current, contentVersion: 0 }])).toEqual({ cancel: [WEEKLY_REMINDER.identifier], schedule: true });
    const pinned = { ...current, weekly: { ...current.weekly!, timeZone: 'Asia/Tokyo' } };
    expect(planReconcile(true, [pinned])).toEqual({ cancel: [WEEKLY_REMINDER.identifier], schedule: true });
  });

  it('never cancels the identifier it keeps', () => {
    const sameIdOther: ScheduledRequest = { ...current, weekly: null };
    expect(planReconcile(true, [current, sameIdOther])).toEqual({ cancel: [], schedule: false });
  });
});
