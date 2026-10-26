import { getAppDatabase } from '@/bootstrap/database-readiness';
import { systemClock, today, type Clock } from '@/core/calendar';
import { randomUuid, uuidGenerator } from '@/data/ids';
import { getGoal } from '@/data/repositories/goal-repository';
import { readReminderRequest, writeReminderRequest } from '@/data/repositories/settings-repository';
import { capabilitiesFor } from '@/core/access';
import {
  changeGoalStatus,
  createGoal,
  deleteGoal,
  editGoal,
} from '@/features/goals/application/goal-commands';
import { createEntry } from '@/features/ledger/application/ledger-commands';
import { setWeeklyReminderEnabled } from '@/features/reminders/application/reminder-commands';
import { reconcileWeeklyReminder } from '@/features/reminders/application/reminder-reconciler';
import { WEEKLY_REMINDER } from '@/features/reminders/domain/weekly-reminder';
import { expoReminderGateway } from '@/features/reminders/native/notification-gateway';
import type { LifecycleAction } from '@/features/goals/domain/goal-lifecycle';

import { chooseCurrency, freshAppDatabase, resetApp } from '../support/app-fixture';
import {
  failNextFakeCall,
  fakeNotificationCalls,
  fakeScheduledRequests,
  IosAuthorizationStatus,
  seedFakeRequest,
  setFakePermission,
} from '../support/expo-notifications-fake';

// The reminder reconciler on host SQLite with the real adapter over the expo-notifications fake
// (Jest only): the committed intent, iOS permission and goal statuses decide whether exactly one
// weekly request exists; repeats, duplicates, orphans, failures and interrupted runs settle to the
// same single request. Real iOS scheduling and delivery: docs/evidence/PHASE_14.md.

let zone = 'Europe/Belgrade';
const clock: Clock = { nowMs: () => systemClock.nowMs(), timeZone: () => zone };
const TODAY = today(systemClock);

function deps() {
  return { db: getAppDatabase(), clock, gateway: expoReminderGateway };
}

function goalDeps() {
  return { db: getAppDatabase(), clock, ids: uuidGenerator, capabilities: capabilitiesFor('pro') };
}

async function addGoal(title = 'Bike') {
  const created = await createGoal(goalDeps(), { operationId: randomUuid(), title, targetMinor: 10_000, deadlineDate: null, themeId: 'island' });
  if (!created.ok) {
    throw new Error(`goal setup failed: ${JSON.stringify(created.error)}`);
  }
  return created.value.goalId;
}

async function revision(goalId: string) {
  const goal = await getAppDatabase().read((r) => getGoal(r, goalId));
  if (!goal) {
    throw new Error('goal missing');
  }
  return goal.revision;
}

async function lifecycle(action: LifecycleAction, goalId: string) {
  const result = await changeGoalStatus(goalDeps(), action, { operationId: randomUuid(), goalId, expectedRevision: await revision(goalId) });
  if (!result.ok) {
    throw new Error(`${action} failed: ${JSON.stringify(result.error)}`);
  }
}

async function optIn(enabled = true) {
  const result = await setWeeklyReminderEnabled({ db: getAppDatabase(), clock }, enabled);
  expect(result.ok).toBe(true);
}

const reconcile = () => reconcileWeeklyReminder(deps());
const requestIds = () => fakeScheduledRequests().map((request) => request.identifier);
const record = () => getAppDatabase().read((r) => readReminderRequest(r));

beforeEach(async () => {
  zone = 'Europe/Belgrade';
  await freshAppDatabase('reminder-reconcile');
  await chooseCurrency('EUR');
  setFakePermission(IosAuthorizationStatus.AUTHORIZED);
});

afterAll(async () => {
  await resetApp();
});

describe('opt-in and permission', () => {
  it('schedules nothing while the switch is off (default), even with an active goal and permission', async () => {
    await addGoal();
    const status = await reconcile();
    expect(status).toMatchObject({ enabled: false, state: 'off', scheduled: false, failed: false });
    expect(requestIds()).toEqual([]);
    // Nothing to do and nothing scheduled: no record is written either.
    expect(await record()).toBeNull();
  });

  it('schedules exactly one Sunday 18:00 request once opted in, permitted and with an active goal', async () => {
    await addGoal();
    await optIn();
    const status = await reconcile();
    expect(status).toMatchObject({ enabled: true, permission: 'authorized', activeGoalCount: 1, state: 'on', scheduled: true });
    expect(fakeScheduledRequests()).toEqual([
      {
        identifier: WEEKLY_REMINDER.identifier,
        content: {
          title: 'A little progress goes a long way 🌱',
          body: 'Ready to grow your world? Check in on your savings this week.',
          data: { kind: 'weekly-reminder', contentVersion: 2 },
          sound: 'default',
        },
        trigger: {
          type: 'calendar',
          repeats: true,
          dateComponents: expect.objectContaining({ weekday: 1, hour: 18, minute: 0, timeZone: null }),
        },
      },
    ]);
    expect(await record()).toMatchObject({ state: 'scheduled', desired: true, nativeId: WEEKLY_REMINDER.identifier, errorCode: null, timeZone: 'Europe/Belgrade' });
  });

  it('never asks for permission itself and schedules nothing while iOS has no answer', async () => {
    setFakePermission(IosAuthorizationStatus.NOT_DETERMINED);
    await addGoal();
    await optIn();
    expect(await reconcile()).toMatchObject({ state: 'needs_permission', scheduled: false });
    expect(fakeNotificationCalls()).not.toContain('requestPermissionsAsync');
    expect(requestIds()).toEqual([]);
  });

  it('keeps the intent but schedules nothing when iOS denies notifications, and cancels a request left from before', async () => {
    await addGoal();
    await optIn();
    await reconcile();
    expect(requestIds()).toEqual([WEEKLY_REMINDER.identifier]);
    setFakePermission(IosAuthorizationStatus.DENIED);
    expect(await reconcile()).toMatchObject({ enabled: true, state: 'denied', scheduled: false });
    expect(requestIds()).toEqual([]);
    // Allowed again in iOS Settings: the next reconciliation (foreground) restores the one request.
    setFakePermission(IosAuthorizationStatus.AUTHORIZED);
    expect(await reconcile()).toMatchObject({ state: 'on', scheduled: true });
    expect(requestIds()).toEqual([WEEKLY_REMINDER.identifier]);
  });

  it('schedules with provisional (quiet) permission', async () => {
    setFakePermission(IosAuthorizationStatus.PROVISIONAL);
    await addGoal();
    await optIn();
    expect(await reconcile()).toMatchObject({ permission: 'provisional', state: 'on', scheduled: true });
  });

  it('cancels the request when the person turns the switch off', async () => {
    await addGoal();
    await optIn();
    await reconcile();
    await optIn(false);
    expect(await reconcile()).toMatchObject({ state: 'off', scheduled: false });
    expect(requestIds()).toEqual([]);
    expect(await record()).toMatchObject({ state: 'none', desired: false, nativeId: null });
  });
});

describe('goal statuses', () => {
  beforeEach(async () => {
    await optIn();
  });

  it('has no request with zero goals, one with one active goal and still one with several', async () => {
    expect(await reconcile()).toMatchObject({ activeGoalCount: 0, state: 'no_active_goal', scheduled: false });
    expect(requestIds()).toEqual([]);
    await addGoal('Bike');
    await reconcile();
    await addGoal('Camera');
    await addGoal('Trip');
    expect(await reconcile()).toMatchObject({ activeGoalCount: 3, scheduled: true });
    expect(requestIds()).toEqual([WEEKLY_REMINDER.identifier]);
  });

  it('pausing the only active goal removes it; editing and saving into the paused goal does not bring it back; Resume does', async () => {
    const goalId = await addGoal();
    await reconcile();
    await lifecycle('pause', goalId);
    expect(await reconcile()).toMatchObject({ activeGoalCount: 0, state: 'no_active_goal', scheduled: false });
    expect(requestIds()).toEqual([]);

    const edited = await editGoal(goalDeps(), {
      operationId: randomUuid(),
      goalId,
      expectedRevision: await revision(goalId),
      title: 'Bike, edited',
      targetMinor: 12_000,
      deadlineDate: null,
      themeId: 'island',
    });
    expect(edited.ok).toBe(true);
    const deposit = await createEntry(
      { db: getAppDatabase(), clock, ids: uuidGenerator },
      { operationId: randomUuid(), goalId, kind: 'deposit', amountMinor: 500, entryDate: TODAY, note: null },
    );
    expect(deposit.ok).toBe(true);
    expect((await getAppDatabase().read((r) => getGoal(r, goalId)))?.status).toBe('paused');
    expect(await reconcile()).toMatchObject({ activeGoalCount: 0, scheduled: false });
    expect(requestIds()).toEqual([]);

    await lifecycle('resume', goalId);
    expect(await reconcile()).toMatchObject({ activeGoalCount: 1, scheduled: true });
    expect(requestIds()).toEqual([WEEKLY_REMINDER.identifier]);
  });

  it('Finish of the last active goal removes it and Reopen brings it back', async () => {
    const goalId = await addGoal();
    await createEntry(
      { db: getAppDatabase(), clock, ids: uuidGenerator },
      { operationId: randomUuid(), goalId, kind: 'deposit', amountMinor: 10_000, entryDate: TODAY, note: null },
    );
    await reconcile();
    await lifecycle('finish', goalId);
    expect(await reconcile()).toMatchObject({ activeGoalCount: 0, scheduled: false });
    expect(requestIds()).toEqual([]);
    await lifecycle('reopen', goalId);
    expect(await reconcile()).toMatchObject({ activeGoalCount: 1, scheduled: true });
  });

  it('only paused and completed goals give no request; deleting the last active goal removes it', async () => {
    const paused = await addGoal('Paused');
    await lifecycle('pause', paused);
    const active = await addGoal('Active');
    expect(await reconcile()).toMatchObject({ activeGoalCount: 1, scheduled: true });
    const removed = await deleteGoal(goalDeps(), { operationId: randomUuid(), goalId: active, expectedRevision: await revision(active) });
    expect(removed.ok).toBe(true);
    expect(await reconcile()).toMatchObject({ activeGoalCount: 0, state: 'no_active_goal', scheduled: false });
    expect(requestIds()).toEqual([]);
  });
});

describe('repeats, duplicates, failures and interruptions', () => {
  beforeEach(async () => {
    await addGoal();
    await optIn();
  });

  it('repeat reconciliation never schedules a second time or rewrites the record', async () => {
    await reconcile();
    const first = await record();
    const scheduleCalls = () => fakeNotificationCalls().filter((call) => call === 'scheduleNotificationAsync').length;
    expect(scheduleCalls()).toBe(1);
    await reconcile();
    await reconcile();
    expect(scheduleCalls()).toBe(1);
    expect(requestIds()).toEqual([WEEKLY_REMINDER.identifier]);
    expect(await record()).toEqual(first);
  });

  it('cancels duplicates and orphans left by earlier runs and keeps one current request', async () => {
    const orphanTrigger = { type: 'calendar', repeats: true, dateComponents: { weekday: 1, hour: 18, minute: 0, timeZone: null } };
    seedFakeRequest({ identifier: 'interrupted-copy', content: { title: null, body: 'old', data: { kind: 'weekly-reminder', contentVersion: 1 }, sound: null }, trigger: orphanTrigger });
    seedFakeRequest({ identifier: 'older-version', content: { title: null, body: 'old', data: {}, sound: null }, trigger: orphanTrigger });
    seedFakeRequest({
      identifier: WEEKLY_REMINDER.identifier,
      content: { title: null, body: 'old text', data: { kind: 'weekly-reminder', contentVersion: 0 }, sound: null },
      trigger: orphanTrigger,
    });
    expect(await reconcile()).toMatchObject({ scheduled: true, failed: false });
    expect(requestIds()).toEqual([WEEKLY_REMINDER.identifier]);
    expect(fakeScheduledRequests()[0]?.content.body).toBe(WEEKLY_REMINDER.body);
  });

  it('replaces a request that still carries the earlier V08 text (content version 1) with the approved copy', async () => {
    seedFakeRequest({
      identifier: WEEKLY_REMINDER.identifier,
      content: { title: null, body: 'Your world is ready for this week’s savings.', data: { kind: 'weekly-reminder', contentVersion: 1 }, sound: 'default' },
      trigger: { type: 'calendar', repeats: true, dateComponents: { weekday: 1, hour: 18, minute: 0, timeZone: null } },
    });
    expect(await reconcile()).toMatchObject({ scheduled: true, failed: false });
    expect(fakeScheduledRequests()).toHaveLength(1);
    expect(fakeScheduledRequests()[0]?.content).toMatchObject({
      title: 'A little progress goes a long way 🌱',
      body: 'Ready to grow your world? Check in on your savings this week.',
      data: { contentVersion: 2 },
    });
  });

  it.each(['getPermissionsAsync', 'getAllScheduledNotificationsAsync', 'scheduleNotificationAsync'] as const)(
    'records a failed %s step without touching savings, and the next run recovers',
    async (call) => {
      failNextFakeCall(call);
      expect(await reconcile()).toMatchObject({ scheduled: false, failed: true });
      expect(await record()).toMatchObject({ state: 'failed', errorCode: expect.stringMatching(/^(permission|list|schedule)$/) });
      expect(await reconcile()).toMatchObject({ scheduled: true, failed: false });
      expect(requestIds()).toEqual([WEEKLY_REMINDER.identifier]);
      expect(await record()).toMatchObject({ state: 'scheduled', errorCode: null });
    },
  );

  it('a failed cancel leaves the record failed; the retry finishes it', async () => {
    await reconcile();
    await optIn(false);
    failNextFakeCall('cancelScheduledNotificationAsync');
    expect(await reconcile()).toMatchObject({ failed: true });
    expect(await record()).toMatchObject({ state: 'failed', desired: false, errorCode: 'cancel' });
    expect(await reconcile()).toMatchObject({ failed: false, scheduled: false });
    expect(requestIds()).toEqual([]);
  });

  it('finishes a reconciliation that was interrupted after its pending record (process killed mid-way)', async () => {
    // The killed run had written `pending` and scheduled a copy under an identifier from an older
    // build before dying; the intent is committed.
    await getAppDatabase().write((tx) =>
      writeReminderRequest(tx, {
        state: 'pending',
        desired: true,
        nativeId: null,
        contentVersion: WEEKLY_REMINDER.contentVersion,
        revision: 4,
        errorCode: null,
        timeZone: 'Europe/Belgrade',
        updatedAtUtc: '2026-10-25T10:00:00.000Z',
      }),
    );
    seedFakeRequest({
      identifier: 'interrupted-copy',
      content: { title: null, body: 'x', data: {}, sound: null },
      trigger: { type: 'calendar', repeats: true, dateComponents: { weekday: 1, hour: 18, minute: 0, timeZone: null } },
    });
    expect(await reconcile()).toMatchObject({ scheduled: true, failed: false });
    expect(requestIds()).toEqual([WEEKLY_REMINDER.identifier]);
    // The run continues from the same pending record and then records its outcome.
    expect(await record()).toMatchObject({ state: 'scheduled', revision: 5 });
  });

  it('finishes a pending record when the OS work had already completed', async () => {
    await reconcile();
    const done = await record();
    await getAppDatabase().write((tx) => writeReminderRequest(tx, { ...done!, state: 'pending', nativeId: null }));
    const calls = fakeNotificationCalls().length;
    expect(await reconcile()).toMatchObject({ scheduled: true });
    // Only the reads: no cancel or schedule was needed.
    expect(fakeNotificationCalls().slice(calls)).toEqual(['getPermissionsAsync', 'getAllScheduledNotificationsAsync']);
    expect(await record()).toMatchObject({ state: 'scheduled', nativeId: WEEKLY_REMINDER.identifier });
  });

  it('a time-zone change keeps the same floating request and never adds a second one', async () => {
    await reconcile();
    zone = 'America/New_York';
    expect(await reconcile()).toMatchObject({ scheduled: true });
    expect(requestIds()).toEqual([WEEKLY_REMINDER.identifier]);
    expect(fakeNotificationCalls().filter((call) => call === 'scheduleNotificationAsync')).toHaveLength(1);
  });

  it('stores no goal title, amount or note in the request or its record', async () => {
    await reconcile();
    const stored = JSON.stringify({ requests: fakeScheduledRequests(), record: await record() });
    expect(stored).not.toMatch(/Bike|10000|100\.00/);
  });
});
