import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Alert, AppState, Linking, type AppStateStatus } from 'react-native';

import { refreshAppData } from '@/bootstrap/app-data';
import { getAppDatabase } from '@/bootstrap/database-readiness';
import { useReminderStore } from '@/bootstrap/reminders';
import { systemClock } from '@/core/calendar';
import { randomUuid, uuidGenerator } from '@/data/ids';
import { readWeeklyReminderEnabled } from '@/data/repositories/settings-repository';
import { changeGoalStatus, createGoal } from '@/features/goals/application/goal-commands';
import { WEEKLY_REMINDER } from '@/features/reminders/domain/weekly-reminder';

import { APP_DIR, chooseCurrency, freshAppDatabase, resetApp } from '../support/app-fixture';
import { playedHaptics } from '../support/expo-haptics-fake';
import {
  emitFakeTap,
  fakeDialogsShown,
  fakeNotificationCalls,
  fakeNotificationHandler,
  fakeScheduledRequests,
  getLastNotificationResponse,
  IosAuthorizationStatus,
  setFakeDialogAnswer,
  setFakeLaunchTap,
  setFakePermission,
} from '../support/expo-notifications-fake';
import { liveToasts } from '../support/sonner-native-fake';

// Phase 14 on the real routes (Jest, host SQLite, expo-notifications fake): the Settings switch,
// the permission dialog only after opting in, denial with the iOS Settings path, reconciliation
// after goal commands and on foreground, and the tap that opens Home. Real delivery and taps on a
// device: docs/evidence/PHASE_14.md.

const requestIds = () => fakeScheduledRequests().map((request) => request.identifier);
const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);

function goalDeps() {
  return { db: getAppDatabase(), clock: systemClock, ids: uuidGenerator };
}

async function addGoal() {
  const created = await createGoal(goalDeps(), { operationId: randomUuid(), title: 'Bike', targetMinor: 10_000, deadlineDate: null, themeId: 'island' });
  if (!created.ok) {
    throw new Error('goal setup failed');
  }
  return created.value;
}

async function toggle(on: boolean) {
  await act(async () => {
    fireEvent(screen.getByTestId('reminder-switch'), 'valueChange', on);
  });
}

function emitAppState(next: AppStateStatus) {
  jest
    .mocked(AppState.addEventListener)
    .mock.calls.filter(([event]) => event === 'change')
    .forEach(([, listener]) => (listener as (state: AppStateStatus) => void)(next));
}

beforeEach(async () => {
  openSettings.mockClear();
  jest.mocked(AppState.addEventListener).mockClear();
  await freshAppDatabase('reminder-ui');
  await chooseCurrency('EUR');
});

afterAll(async () => {
  await resetApp();
});

describe('Settings layout (D110)', () => {
  it('groups Preferences, Reminders and About, with the version and no build diagnostics outside development', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/settings' });
    await waitFor(() => expect(useReminderStore.getState().status).not.toBeNull());
    const headers = screen.getAllByRole('header').map((header) => header.props.children);
    expect(headers).toEqual(expect.arrayContaining(['Preferences', 'Reminders', 'About']));
    expect(headers.indexOf('Preferences')).toBeLessThan(headers.indexOf('Reminders'));
    expect(headers.indexOf('Reminders')).toBeLessThan(headers.indexOf('About'));
    expect(screen.getByTestId('currency-current')).toHaveTextContent(/Currency.*EUR – Euro/);
    expect(screen.getByLabelText('Weekly reminder, Sundays at 6:00 PM')).toBeOnTheScreen();
    expect(screen.getByTestId('settings-about')).toHaveTextContent(/Saving Worlds/);
    expect(screen.getByTestId('settings-version')).toHaveTextContent(/Version/);
    // Runtime, channel and update appear only in the development-only section (Jest runs as __DEV__).
    const about = screen.getByTestId('settings-about');
    expect(about).not.toHaveTextContent(/Runtime|Channel|Update/);
    expect(screen.getByTestId('settings-development')).toHaveTextContent(/Runtime/);
  });

  it('hides the tab bar while Settings is open and shows it again after Back (D111)', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });
    // The native tab host (react-native-screens) receives NativeTabs' `hidden` as `tabBarHidden`.
    const tabBarHidden = () => screen.container.queryAll((node) => node.props.tabBarHidden !== undefined)[0]?.props.tabBarHidden;
    expect(tabBarHidden()).toBe(false);
    await act(async () => {
      router.push('/settings');
    });
    expect(screen).toHavePathname('/settings');
    expect(tabBarHidden()).toBe(true);
    await act(async () => {
      router.back();
    });
    expect(screen).toHavePathname('/');
    expect(tabBarHidden()).toBe(false);
  });
});

describe('Settings switch', () => {
  it('starts off, asks iOS only after the person turns it on and schedules the one request', async () => {
    await addGoal();
    await renderRouter(APP_DIR, { initialUrl: '/settings' });
    await waitFor(() => expect(useReminderStore.getState().status).not.toBeNull());
    expect(screen.getByTestId('reminder-switch')).toHaveProp('value', false);
    expect(screen.getByTestId('reminder-explanation')).toHaveTextContent('A gentle nudge to add this week’s savings.');
    // The permission and privacy details are behind the info button (D111).
    const info = jest.spyOn(Alert, 'alert').mockImplementationOnce(() => undefined);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'About the weekly reminder' }));
    });
    expect(info.mock.lastCall?.[1]).toMatch(/Sunday at 6:00 PM.*iOS asks once.*never shows amounts or goal names/);
    // Launch and the first read did not ask for permission.
    expect(fakeDialogsShown()).toBe(0);
    expect(fakeNotificationCalls()).not.toContain('requestPermissionsAsync');

    await toggle(true);
    await waitFor(() => expect(screen.getByTestId('reminder-switch')).toHaveProp('value', true));
    expect(fakeDialogsShown()).toBe(1);
    expect(requestIds()).toEqual([WEEKLY_REMINDER.identifier]);
    expect(await getAppDatabase().read((r) => readWeeklyReminderEnabled(r))).toBe(true);
    expect(screen.getByText('Reminder turned on')).toBeOnTheScreen();
    expect(playedHaptics()).toEqual([{ kind: 'notification', type: 'success' }]);
    expect(screen.getByTestId('reminder-explanation')).toHaveTextContent('On. It arrives on this iPhone’s time.');

    await toggle(false);
    await waitFor(() => expect(screen.getByTestId('reminder-switch')).toHaveProp('value', false));
    expect(requestIds()).toEqual([]);
    expect(screen.getByText('Reminder turned off')).toBeOnTheScreen();
    // The second time no dialog: iOS already has an answer.
    await toggle(true);
    await waitFor(() => expect(requestIds()).toEqual([WEEKLY_REMINDER.identifier]));
    expect(fakeDialogsShown()).toBe(1);
  });

  it('after a denial keeps the choice, explains it, offers iOS Settings and leaves saving usable', async () => {
    setFakeDialogAnswer(IosAuthorizationStatus.DENIED);
    await addGoal();
    await renderRouter(APP_DIR, { initialUrl: '/settings' });
    await waitFor(() => expect(useReminderStore.getState().status).not.toBeNull());

    await toggle(true);
    await screen.findByTestId('reminder-denied');
    expect(screen.getByTestId('reminder-switch')).toHaveProp('value', true);
    expect(requestIds()).toEqual([]);
    expect(liveToasts()).toHaveLength(0);
    expect(playedHaptics()).toEqual([]);
    await act(async () => {
      fireEvent.press(screen.getByTestId('reminder-open-settings'));
    });
    expect(openSettings).toHaveBeenCalledTimes(1);

    // Allowed in iOS Settings; back in the app the foreground reconciliation schedules it.
    setFakePermission(IosAuthorizationStatus.AUTHORIZED);
    await act(async () => {
      emitAppState('active');
    });
    await waitFor(() => expect(requestIds()).toEqual([WEEKLY_REMINDER.identifier]));
    await waitFor(() => expect(screen.queryByTestId('reminder-denied')).toBeNull());
  });

  it('explains the resting state while no goal is active', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/settings' });
    await waitFor(() => expect(useReminderStore.getState().status).not.toBeNull());
    setFakeDialogAnswer(IosAuthorizationStatus.AUTHORIZED);
    await toggle(true);
    await waitFor(() => expect(screen.getByTestId('reminder-explanation')).toHaveTextContent('Resting until a goal is active.'));
    expect(requestIds()).toEqual([]);
  });
});

describe('reconciliation after commits', () => {
  it('follows Pause and Resume through the committed refresh', async () => {
    setFakePermission(IosAuthorizationStatus.AUTHORIZED);
    await renderRouter(APP_DIR, { initialUrl: '/settings' });
    await waitFor(() => expect(useReminderStore.getState().status).not.toBeNull());
    await toggle(true);
    expect(requestIds()).toEqual([]);

    const goal = await addGoal();
    await act(() => refreshAppData());
    await waitFor(() => expect(requestIds()).toEqual([WEEKLY_REMINDER.identifier]));

    const paused = await changeGoalStatus(goalDeps(), 'pause', { operationId: randomUuid(), goalId: goal.goalId, expectedRevision: goal.revision });
    expect(paused.ok).toBe(true);
    await act(() => refreshAppData());
    await waitFor(() => expect(requestIds()).toEqual([]));

    const resumed = await changeGoalStatus(goalDeps(), 'resume', { operationId: randomUuid(), goalId: goal.goalId, expectedRevision: goal.revision + 1 });
    expect(resumed.ok).toBe(true);
    await act(() => refreshAppData());
    await waitFor(() => expect(requestIds()).toEqual([WEEKLY_REMINDER.identifier]));
    expect(fakeScheduledRequests()).toHaveLength(1);
  });
});

describe('notification presentation and taps', () => {
  it('shows the reminder only in Notification Center while the app is open', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await waitFor(() => expect(fakeNotificationHandler()).not.toBeNull());
    const handler = fakeNotificationHandler() as { handleNotification: () => Promise<Record<string, boolean>> };
    await expect(handler.handleNotification()).resolves.toEqual({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false });
  });

  it('a tap while the app runs opens Home from another screen', async () => {
    await addGoal();
    await renderRouter(APP_DIR, { initialUrl: '/collection' });
    expect(screen).toHavePathname('/collection');
    await act(async () => {
      emitFakeTap(WEEKLY_REMINDER.identifier, { kind: 'weekly-reminder', contentVersion: 1 });
    });
    await waitFor(() => expect(screen).toHavePathname('/'));
  });

  it('a tap never closes an open entry form with its draft', async () => {
    const goal = await addGoal();
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await act(async () => {
      router.push(`/entry-form?goalId=${goal.goalId}`);
    });
    await waitFor(() => expect(screen).toHavePathname('/entry-form'));
    await act(async () => {
      emitFakeTap(WEEKLY_REMINDER.identifier, { kind: 'weekly-reminder', contentVersion: 1 });
    });
    expect(screen).toHavePathname('/entry-form');
  });

  it('ignores taps on anything that is not the reminder', async () => {
    await addGoal();
    await renderRouter(APP_DIR, { initialUrl: '/collection' });
    await act(async () => {
      emitFakeTap('something-else');
    });
    expect(screen).toHavePathname('/collection');
  });

  it('takes a tap that launched the app once', async () => {
    await addGoal();
    setFakeLaunchTap(WEEKLY_REMINDER.identifier, { kind: 'weekly-reminder', contentVersion: 1 });
    await renderRouter(APP_DIR, { initialUrl: '/collection' });
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(getLastNotificationResponse()).toBeNull();
  });
});
