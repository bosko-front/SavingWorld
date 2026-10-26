import { act, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AppState, type AppStateStatus } from 'react-native';

import { setAppClockForTests, useAppDataStore } from '@/bootstrap/app-data';
import { getAppDatabase } from '@/bootstrap/database-readiness';
import { systemClock, type Clock } from '@/core/calendar';
import { randomUuid, uuidGenerator } from '@/data/ids';
import { getAttempt } from '@/data/repositories/challenge-attempt-repository';
import { startChallenge } from '@/features/challenges/application/challenge-commands';
import { createGoal } from '@/features/goals/application/goal-commands';

import { APP_DIR, chooseCurrency, freshAppDatabase, resetApp } from '../support/app-fixture';

// Phase 12 foreground reconciliation on the real app shell (Jest, host SQLite): a Weekly step
// whose saved week ended while the app was in the background is settled when the app is active
// again, and the committed snapshot refreshes once (not a second time for the new civil date). The
// saved week is the test process's own zone.

const zone = systemClock.timeZone();
let instant = 0;
const testClock: Clock = { nowMs: () => (instant += 1), timeZone: () => zone };

function setLocalTime(year: number, month: number, day: number, hour: number, minute: number) {
  instant = new Date(year, month - 1, day, hour, minute).getTime();
}

function emitAppState(next: AppStateStatus) {
  jest
    .mocked(AppState.addEventListener)
    .mock.calls.filter(([event]) => event === 'change')
    .forEach(([, listener]) => (listener as (state: AppStateStatus) => void)(next));
}

beforeAll(() => {
  setAppClockForTests(testClock);
});

beforeEach(async () => {
  jest.mocked(AppState.addEventListener).mockClear();
  // Wednesday 21 October 2026, local noon.
  setLocalTime(2026, 10, 21, 12, 0);
  await freshAppDatabase('challenge-foreground');
  await chooseCurrency('EUR');
});

afterAll(async () => {
  setAppClockForTests(systemClock);
  await resetApp();
});

it('settles an ended Weekly step on returning to the foreground and refreshes once', async () => {
  const deps = { db: getAppDatabase(), clock: testClock, ids: uuidGenerator };
  const goal = await createGoal(deps, { operationId: randomUuid(), title: 'Summer trip', targetMinor: 100_000, deadlineDate: '2026-11-19', themeId: 'island' });
  if (!goal.ok) {
    throw new Error('goal setup failed');
  }
  const started = await startChallenge(deps, { operationId: randomUuid(), goalId: goal.value.goalId, ruleId: 'weekly_step' });
  if (!started.ok) {
    throw new Error(`start failed: ${JSON.stringify(started.error)}`);
  }
  const attempt = () => getAppDatabase().read((r) => getAttempt(r, started.value.attemptId));
  expect((await attempt())?.periodEndDate).toBe('2026-10-25');

  await renderRouter(APP_DIR, { initialUrl: '/' });
  await screen.findByTestId('home-add-savings');

  // Sunday evening: the week is still running; nothing is written.
  setLocalTime(2026, 10, 25, 20, 0);
  await act(async () => {
    emitAppState('active');
  });
  expect((await attempt())?.state).toBe('active');
  const version = useAppDataStore.getState().version;

  // Monday 00:01 local: the saved week has ended.
  await act(async () => {
    emitAppState('background');
  });
  setLocalTime(2026, 10, 26, 0, 1);
  await act(async () => {
    emitAppState('active');
  });
  // The settle commits before the one refresh it triggers; the new civil date adds no second one.
  await waitFor(() => expect(useAppDataStore.getState().version).toBe(version + 1));
  const settled = await attempt();
  expect([settled?.state, settled?.result, settled?.historicalAtUtc]).toEqual(['historical', 'not_completed', settled?.periodEndAtUtc]);
  expect(useAppDataStore.getState().version).toBe(version + 1);
});
