import { act, fireEvent, screen, within } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { renderRouter } from 'expo-router/testing-library';

import { setAppClockForTests } from '@/bootstrap/app-data';
import { getAppDatabase } from '@/bootstrap/database-readiness';
import { resetLaunchSplashForTests } from '@/bootstrap/launch-splash';
import { capabilitiesFor } from '@/core/access';
import { systemClock, type Clock } from '@/core/calendar';
import { randomUuid, uuidGenerator } from '@/data/ids';
import { createGoal } from '@/features/goals/application/goal-commands';

import { APP_DIR, chooseCurrency, freshAppDatabase, resetApp } from '../support/app-fixture';

// D141: the native launch screen stays until the first screen is drawn. Home holds it until every
// layer of its world's current stage has loaded; onboarding releases it at once (the cap and the
// single hide are in tests/unit/launch-splash.test.ts). The native
// look of the hand-over is a simulator/device check (evidence/PHASE_19_5.md).

jest.mock('expo-splash-screen', () => ({
  ...jest.requireActual<object>('expo-splash-screen'),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

const hideAsync = jest.mocked(SplashScreen.hideAsync);
const zone = systemClock.timeZone();
let instant = new Date(2026, 9, 27, 12, 0).getTime();
const testClock: Clock = { nowMs: () => (instant += 1), timeZone: () => zone };

beforeAll(() => setAppClockForTests(testClock));

beforeEach(() => {
  hideAsync.mockClear();
});

afterEach(() => {
  resetLaunchSplashForTests();
});

afterAll(async () => {
  setAppClockForTests(systemClock);
  await resetApp();
});

it('keeps the splash on Home until the world of the current stage has loaded', async () => {
  await freshAppDatabase('launch-splash-home');
  await chooseCurrency('EUR');
  const created = await createGoal(
    { db: getAppDatabase(), clock: testClock, ids: uuidGenerator, capabilities: capabilitiesFor('free') },
    { operationId: randomUuid(), title: 'Boat', targetMinor: 10_000, deadlineDate: null, themeId: 'island' },
  );
  expect(created.ok).toBe(true);
  resetLaunchSplashForTests(60_000);

  await renderRouter(APP_DIR, { initialUrl: '/' });
  const home = within(await screen.findByTestId('home', { includeHiddenElements: true }));
  await fireEvent(home.getByTestId('world-scene-area', { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 300 } },
  });
  const layers = home.queryAllByTestId(/^world-layer-/, { includeHiddenElements: true });
  expect(layers.length).toBeGreaterThan(1);
  expect(hideAsync).not.toHaveBeenCalled();

  // Jest loads no images: fire expo-image's load callback on every layer, the last one draws the stage.
  for (const node of layers.slice(0, -1)) {
    await act(() => node.props.onLoad({ nativeEvent: {} }));
  }
  expect(hideAsync).not.toHaveBeenCalled();
  await act(() => layers[layers.length - 1]!.props.onLoad({ nativeEvent: {} }));
  expect(hideAsync).toHaveBeenCalledTimes(1);
});

it('releases the splash at once for onboarding, which has no world to wait for', async () => {
  await freshAppDatabase('launch-splash-onboarding');
  resetLaunchSplashForTests(60_000);

  await renderRouter(APP_DIR, { initialUrl: '/' });
  expect(await screen.findByTestId('onboarding', { includeHiddenElements: true })).toBeOnTheScreen();
  expect(hideAsync).toHaveBeenCalledTimes(1);
});
