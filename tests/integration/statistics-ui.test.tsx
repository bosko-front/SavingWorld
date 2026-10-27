import { act, fireEvent, screen, userEvent, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';

import { currentCapabilities, reconcileCivilDate, refreshAppData, setAppClockForTests } from '@/bootstrap/app-data';
import { reconcileBilling } from '@/bootstrap/billing';
import { getAppDatabase } from '@/bootstrap/database-readiness';
import { systemClock, type Clock } from '@/core/calendar';
import { randomUuid, uuidGenerator } from '@/data/ids';
import { getGoal } from '@/data/repositories/goal-repository';
import { createGoal, finishGoal, reopenGoal } from '@/features/goals/application/goal-commands';
import { correctEntry, createEntry, deleteEntry } from '@/features/ledger/application/ledger-commands';

import { APP_DIR, chooseCurrency, freshAppDatabase, grantProForTests, resetApp } from '../support/app-fixture';
import { fakeStore, refundStoreTransaction } from '../support/expo-iap-fake';
import { chooseGoalOption, goalOptionLabels } from '../support/goal-menu';

// Phase 18 Statistics on the real routes (Jest, host SQLite, Pro bought through the real billing path
// over the fake store): the Pro-only entries, the locked deep link, the four views in words, the text
// alternative of the line, recalculation after commits and on a new day or month, and the empty,
// locked-after-loss states. Expected numbers are written out from the saved entries. VoiceOver itself,
// Dynamic Type and Duo reflow are simulator/device checks (docs/evidence/PHASE_18.md).

// Local wall-clock instants in the test process's own zone; every reading moves 1 ms forward.
const zone = systemClock.timeZone();
let instant = 0;
const testClock: Clock = { nowMs: () => (instant += 1), timeZone: () => zone };

function setLocalTime(year: number, month: number, day: number, hour = 12) {
  instant = new Date(year, month - 1, day, hour, 0).getTime();
}

beforeAll(() => {
  setAppClockForTests(testClock);
});

beforeEach(async () => {
  setLocalTime(2026, 10, 26);
  await freshAppDatabase('statistics-ui');
  await chooseCurrency('EUR');
});

afterAll(async () => {
  setAppClockForTests(systemClock);
  await resetApp();
});

function deps() {
  return { db: getAppDatabase(), clock: testClock, ids: uuidGenerator, capabilities: currentCapabilities() };
}

async function setupGoal(title: string, targetMinor: number): Promise<string> {
  const created = await createGoal(deps(), { operationId: randomUuid(), title, targetMinor, deadlineDate: null, themeId: 'island' });
  if (!created.ok) {
    throw new Error(`goal setup failed: ${JSON.stringify(created.error)}`);
  }
  return created.value.goalId;
}

async function seed(goalId: string, kind: 'deposit' | 'withdrawal', amountMinor: number, entryDate: string) {
  const result = await createEntry(deps(), { operationId: randomUuid(), goalId, kind, amountMinor, entryDate, note: null });
  if (!result.ok) {
    throw new Error(`entry setup failed: ${JSON.stringify(result.error)}`);
  }
  return result.value.entryId;
}

async function lifecycle(goalId: string, command: typeof finishGoal) {
  const goal = await getAppDatabase().read((r) => getGoal(r, goalId));
  const result = await command(deps(), { operationId: randomUuid(), goalId, expectedRevision: goal?.revision ?? 0 });
  if (!result.ok) {
    throw new Error(`lifecycle failed: ${JSON.stringify(result.error)}`);
  }
}

// A command committed elsewhere in the app, which refreshes the snapshot as every caller does.
async function committed(work: () => Promise<unknown>) {
  await act(async () => {
    await work();
    await refreshAppData();
  });
}

function label(testID: string): string {
  return screen.getByTestId(testID).props.accessibilityLabel as string;
}

// Pro with three goals. Trip: 120.00 before the line, +60.00 on 30 Sep, +10.00 and -5.00 on 1 Oct,
// +20.00 today → 205.00. Bike: 50.00 on 15 Oct, finished. Camera: none yet.
async function proWithGoals() {
  await grantProForTests();
  const trip = await setupGoal('Trip', 100_000);
  const before = await seed(trip, 'deposit', 12_000, '2026-09-01');
  await seed(trip, 'deposit', 6_000, '2026-09-30');
  await seed(trip, 'deposit', 1_000, '2026-10-01');
  const out = await seed(trip, 'withdrawal', 500, '2026-10-01');
  await seed(trip, 'deposit', 2_000, '2026-10-26');
  const bike = await setupGoal('Bike', 5_000);
  await seed(bike, 'deposit', 5_000, '2026-10-15');
  await lifecycle(bike, finishGoal);
  const camera = await setupGoal('Camera', 30_000);
  return { trip, bike, camera, before, out };
}

describe('Statistics entry and Pro guard', () => {
  it('Free sees no entry; a deep link shows the invitation to Pro and reads nothing', async () => {
    await setupGoal('Trip', 10_000);
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(goalOptionLabels()).not.toContain('Savings insights');

    await act(() => router.push('/settings'));
    expect(screen.queryByTestId('pro-settings-statistics')).toBeNull();

    await act(() => router.push('/statistics'));
    expect(await screen.findByTestId('statistics-locked')).toHaveTextContent(/Savings insights are part of Pro/);
    expect(screen.queryByTestId('statistics-total')).toBeNull();
    await userEvent.press(screen.getByTestId('statistics-explore-pro'));
    expect(screen).toHavePathname('/paywall');
  });

  it('Pro opens it from Home’s goal options and from Settings', async () => {
    await proWithGoals();
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(goalOptionLabels()).toContain('Savings insights');
    await chooseGoalOption('Savings insights');
    expect(screen).toHavePathname('/statistics');
    expect(await screen.findByTestId('statistics-total')).toBeTruthy();

    await act(() => router.push('/settings'));
    await userEvent.press(screen.getByTestId('pro-settings-statistics'));
    expect(screen).toHavePathname('/statistics');
  });
});

describe('the four views', () => {
  it('shows the total, the month, the line in words and the completed count', async () => {
    await proWithGoals();
    await renderRouter(APP_DIR, { initialUrl: '/statistics' });
    await screen.findByTestId('statistics-total');

    expect(label('statistics-total')).toBe('Saved across all your goals: €255.00');
    expect(label('statistics-month')).toBe('In October: deposits €80.00, withdrawals €5.00.');
    expect(screen.getByTestId('statistics-deposits-amount')).toHaveTextContent('€80.00');
    expect(screen.getByTestId('statistics-withdrawals-amount')).toHaveTextContent('€5.00');
    // 27 Sep: only the 120.00 from before the line; today: every goal.
    // The 30 days' net change, apart from the month's deposits: 255.00 today minus 120.00 before.
    expect(screen.getByTestId('statistics-change-amount')).toHaveTextContent('+€135.00');
    expect(screen.getByTestId('statistics-change-detail')).toHaveTextContent('From €120.00 before Sep 27, 2026 to €255.00 today.');

    // The chart: today first; VoiceOver steps through the days; a tap picks the nearest day.
    const plot = screen.getByTestId('statistics-line-plot');
    expect(plot.props.accessibilityRole).toBe('adjustable');
    expect(plot.props.accessibilityLabel).toBe('Daily balance, all goals, last 30 days');
    expect(plot.props.accessibilityValue).toEqual({ text: 'Today, Oct 26, 2026, €255.00' });
    await fireEvent(plot, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(screen.getByTestId('statistics-line-plot').props.accessibilityValue).toEqual({ text: 'Oct 25, 2026, €235.00' });
    await fireEvent(plot, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 180 } } });
    await fireEvent(screen.getByTestId('statistics-line-plot'), 'responderGrant', { nativeEvent: { locationX: 0 } });
    expect(screen.getByTestId('statistics-line-readout', { includeHiddenElements: true })).toHaveTextContent(/Sep 27, 2026.*€120\.00/);
    expect(label('statistics-completed-row')).toBe('Completed goals, 1');

    // The text alternative: every day, newest first, closed at first.
    expect(screen.queryByTestId('statistics-daily')).toBeNull();
    await userEvent.press(screen.getByTestId('statistics-daily-toggle'));
    const rows = within(screen.getByTestId('statistics-daily'));
    expect(screen.getByTestId('statistics-daily-toggle').props.accessibilityState).toMatchObject({ expanded: true });
    expect(screen.getByTestId('statistics-day-2026-10-26')).toHaveTextContent(/Oct 26, 2026.*€255\.00/);
    expect(screen.getByTestId('statistics-day-2026-10-15')).toHaveTextContent(/€235\.00/);
    expect(screen.getByTestId('statistics-day-2026-10-14')).toHaveTextContent(/€185\.00/);
    expect(screen.getByTestId('statistics-day-2026-10-01')).toHaveTextContent(/€185\.00/);
    expect(screen.getByTestId('statistics-day-2026-09-30')).toHaveTextContent(/€180\.00/);
    expect(screen.getByTestId('statistics-day-2026-09-27')).toHaveTextContent(/€120\.00/);
    expect(rows.getAllByText(/^[A-Z][a-z]{2} \d{1,2}, 2026$/)).toHaveLength(30);

    await userEvent.press(screen.getByTestId('statistics-completed-row'));
    expect(screen).toHavePathname('/collection');
  });

  it('recalculates after a backdated correction, a deletion, Reopen and Finish', async () => {
    const { bike, before, out } = await proWithGoals();
    await renderRouter(APP_DIR, { initialUrl: '/statistics' });
    await screen.findByTestId('statistics-total');

    // The 1 Sep deposit moves to 3 Oct: out of the opening balance, into the line and the month.
    await committed(() =>
      correctEntry(deps(), { operationId: randomUuid(), entryId: before, expectedRevision: 1, kind: 'deposit', amountMinor: 12_000, entryDate: '2026-10-03', note: null }),
    );
    // Valid because the 1 Oct withdrawal still follows 60.00 + 10.00. Opening is now 0.
    await waitFor(() => expect(label('statistics-month')).toBe('In October: deposits €200.00, withdrawals €5.00.'));
    expect(screen.getByTestId('statistics-change-detail')).toHaveTextContent('From €0.00 before Sep 27, 2026 to €255.00 today.');

    await committed(() => deleteEntry(deps(), { operationId: randomUuid(), entryId: out, expectedRevision: 1, confirmed: true }));
    await waitFor(() => expect(label('statistics-total')).toBe('Saved across all your goals: €260.00'));
    expect(label('statistics-month')).toBe('In October: deposits €200.00, withdrawals €0.00.');

    // Reopen keeps Bike's souvenir but it is no longer completed; Finish counts it again.
    await committed(() => lifecycle(bike, reopenGoal));
    await waitFor(() => expect(label('statistics-completed-row')).toBe('Completed goals, 0'));
    expect(screen.getByTestId('statistics-completed-row')).toHaveTextContent(/Finish a goal to keep its world in Collection\./);
    expect(label('statistics-total')).toBe('Saved across all your goals: €260.00');
    await committed(() => lifecycle(bike, finishGoal));
    await waitFor(() => expect(label('statistics-completed-row')).toBe('Completed goals, 1'));
  });

  it('moves to a new day and a new month when the civil date changes', async () => {
    await proWithGoals();
    await renderRouter(APP_DIR, { initialUrl: '/statistics' });
    await screen.findByTestId('statistics-total');

    setLocalTime(2026, 11, 1, 9);
    await act(async () => {
      await reconcileCivilDate();
    });
    await waitFor(() => expect(label('statistics-month')).toBe('In November: deposits €0.00, withdrawals €0.00.'));
    // The line now runs 3 Oct .. 1 Nov and opens with everything saved before it.
    expect(screen.getByTestId('statistics-change-amount')).toHaveTextContent('+€70.00');
    expect(screen.getByTestId('statistics-change-detail')).toHaveTextContent('From €185.00 before Oct 3, 2026 to €255.00 today.');
    expect(label('statistics-total')).toBe('Saved across all your goals: €255.00');
  });
});

describe('empty and lost states', () => {
  it('Pro without goals is invited to create one', async () => {
    await grantProForTests();
    await renderRouter(APP_DIR, { initialUrl: '/statistics' });
    expect(await screen.findByTestId('statistics-empty')).toHaveTextContent(/All your worlds, together/);
    expect(screen.getByTestId('statistics-empty')).not.toHaveTextContent(/will appear/);
    await userEvent.press(screen.getByTestId('statistics-new-goal'));
    expect(screen).toHavePathname('/goal-form');
  });

  it('a verified loss of Pro while the screen is open shows the invitation instead of numbers', async () => {
    await proWithGoals();
    await renderRouter(APP_DIR, { initialUrl: '/statistics' });
    await screen.findByTestId('statistics-total');
    await act(async () => {
      refundStoreTransaction(fakeStore.transactions[0]!.id);
      await reconcileBilling();
    });
    expect(await screen.findByTestId('statistics-locked')).toBeTruthy();
    expect(screen.queryByTestId('statistics-total')).toBeNull();
  });
});
