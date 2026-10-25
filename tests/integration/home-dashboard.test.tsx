import { act, fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Alert, AppState, type AppStateStatus } from 'react-native';

import { setAppClockForTests, useAppDataStore } from '@/bootstrap/app-data';
import { getAppDatabase } from '@/bootstrap/database-readiness';
import { capabilitiesFor } from '@/core/access';
import { systemClock, type CivilDate, type Clock } from '@/core/calendar';
import { randomUuid, uuidGenerator } from '@/data/ids';
import { listEntriesForGoal } from '@/data/repositories/ledger-repository';
import { createGoal } from '@/features/goals/application/goal-commands';
import { createEntry } from '@/features/ledger/application/ledger-commands';
import { civilDateToLocalDate } from '@/shared/i18n/local-date';

import { APP_DIR, chooseCurrency, freshAppDatabase, resetApp } from '../support/app-fixture';
import { playedHaptics } from '../support/expo-haptics-fake';
import { chooseGoalOption, goalOptionLabels } from '../support/goal-menu';

// Phase 08 Home dashboard on the real routes (Jest, host SQLite) with a test clock: numbers from the
// committed ledger, recalculated after deposits, withdrawals, corrections, target and deadline edits
// and after returning to the foreground on a new civil date; a failed read shows a retry instead of
// stale numbers. Native layout, text sizes and locales are simulator checks (evidence/PHASE_08.md).

// Local wall-clock instants in the test process's own zone, so the native date pickers (local Date
// parts) and the app clock agree. Every reading moves 1 ms forward, so entries keep their order.
const zone = systemClock.timeZone();
let instant = 0;
const testClock: Clock = { nowMs: () => (instant += 1), timeZone: () => zone };

function setLocalTime(year: number, month: number, day: number, hour: number, minute: number) {
  instant = new Date(year, month - 1, day, hour, minute).getTime();
}

beforeAll(() => {
  setAppClockForTests(testClock);
});

beforeEach(async () => {
  setLocalTime(2026, 10, 23, 12, 0);
  await freshAppDatabase('home-dashboard');
  await chooseCurrency('EUR');
});

afterAll(async () => {
  setAppClockForTests(systemClock);
  await resetApp();
});

function deps(level: 'free' | 'pro' = 'free') {
  return { db: getAppDatabase(), clock: testClock, ids: uuidGenerator, capabilities: capabilitiesFor(level) };
}

async function setupGoal(targetMinor: number, deadlineDate: string | null, title = 'Summer trip', level: 'free' | 'pro' = 'free') {
  const created = await createGoal(deps(level), { operationId: randomUuid(), title, targetMinor, deadlineDate, themeId: 'island' });
  if (!created.ok) {
    throw new Error(`goal setup failed: ${JSON.stringify(created.error)}`);
  }
  return created.value.goalId;
}

async function seedEntry(goalId: string, kind: 'deposit' | 'withdrawal', amountMinor: number, entryDate: string) {
  const result = await createEntry(deps(), { operationId: randomUuid(), goalId, kind, amountMinor, entryDate, note: null });
  if (!result.ok) {
    throw new Error(`entry setup failed: ${JSON.stringify(result.error)}`);
  }
  return result.value.entryId;
}

function nativeView(props: Record<string, unknown>) {
  const [first] = screen.container.queryAll(
    (node) => typeof node.type === 'string' && Object.entries(props).every(([key, value]) => node.props[key] === value),
  );
  if (!first) {
    throw new Error(`no native view with ${JSON.stringify(props)}`);
  }
  return first;
}

function text(testID: string): string {
  const children = screen.getByTestId(testID).props.children as unknown;
  return Array.isArray(children) ? children.join('') : String(children);
}

// What Home shows for the selected goal, read from the rendered text.
function home() {
  return {
    saved: text('home-saved'),
    target: text('home-target'),
    detail: text('home-remaining'),
    percent: screen.getByTestId('home-progress').props.accessibilityLabel as string,
    next: text('home-next-detail'),
    // The deadline card's header as VoiceOver reads it, or 'none' when Home offers to add one.
    deadline: screen.queryByTestId('home-deadline-header')
      ? (screen.getByTestId('home-deadline-header').props.accessibilityLabel as string)
      : screen.queryByTestId('home-add-deadline')
        ? 'none'
        : 'missing',
    pace: screen.queryByTestId('home-pace-weekly')
      ? `${String(screen.getByTestId('home-pace-weekly').props.accessibilityLabel)} ${String(screen.getByTestId('home-pace-monthly').props.accessibilityLabel)}`
      : null,
    // The world's spoken stage: "Island world, 2 of 10 milestones unlocked" → "2 of 10 …".
    world: (screen.getByTestId('world-scene').props.accessibilityLabel as string).replace(/^Island world, /, ''),
  };
}

async function addThroughForm(kind: 'deposit' | 'withdrawal', amount: string) {
  await userEvent.press(screen.getByTestId('home-add-savings'));
  expect(screen).toHavePathname('/entry-form');
  if (kind === 'withdrawal') {
    await fireEvent(nativeView({ label: 'Entry type' }), 'selectionChange', { nativeEvent: { selection: 'withdrawal' } });
  }
  await userEvent.type(screen.getByTestId('entry-amount'), amount);
  await userEvent.press(screen.getByTestId('entry-save'));
  await waitFor(() => expect(screen).toHavePathname('/'));
}

// The most recent AppState listener the app registered (the root navigator's foreground hook).
function emitAppState(next: AppStateStatus) {
  const calls = jest.mocked(AppState.addEventListener).mock.calls.filter(([event]) => event === 'change');
  const listener = calls.at(-1)?.[1] as ((state: AppStateStatus) => void) | undefined;
  if (!listener) {
    throw new Error('no AppState listener registered');
  }
  listener(next);
}

describe('Home dashboard numbers', () => {
  it('shows saved, target, remaining, percent, next milestone, the pace and the world stage from the ledger', async () => {
    // Deadline 21 Nov 2026: 30 days from 23 Oct, both included.
    const goalId = await setupGoal(150_000, '2026-11-21');
    await seedEntry(goalId, 'deposit', 45_000, '2026-10-20');
    await seedEntry(goalId, 'withdrawal', 12_000, '2026-10-22');
    await renderRouter(APP_DIR, { initialUrl: '/' });

    expect(home()).toEqual({
      saved: '€330.00',
      target: 'saved of €1,500.00',
      detail: '€1,170.00 to go',
      percent: '22%, €1,170.00 to go',
      next: '€120.00 more to reach 30%',
      deadline: 'Deadline Nov 21, 2026, 30 days left',
      // R = 117000, D = 30: ceil(117000 × 7 / 30) = 27300; min(R, ceil(117000 × 30 / 30)) = R.
      pace: '€273.00 per week or €1,170.00 per month',
      world: '2 of 10 milestones unlocked',
    });
    // The explanation is one tap away on the info button, not printed on Home.
    const alert = jest.spyOn(Alert, 'alert').mockImplementationOnce(() => undefined);
    await userEvent.press(screen.getByLabelText('How the pace is worked out'));
    expect(alert).toHaveBeenCalledWith(
      'How the pace is worked out',
      '€1,170.00 is still to go over 30 days, counting today and the deadline. Per week is €1,170.00 ÷ 30 × 7, per month is €1,170.00 ÷ 30 × 30, rounded up and never more than what is left. It is a guide, not a plan.',
    );
    expect(screen.getByTestId('world-scene')).toHaveAccessibleName('Island world, 2 of 10 milestones unlocked');
    // Add savings is the one primary action, a button in the column right under the progress; nothing
    // floats (D81).
    expect(screen.queryByTestId('floating-action-slot')).toBeNull();
    expect(screen.getByTestId('home-goal')).toContainElement(screen.getByTestId('home-add-savings'));
    expect(screen.getByTestId('home-add-savings')).toHaveAccessibleName('Add savings');
    // In reading order: progress, then Add savings, then the next milestone.
    expect(screen.queryAllByTestId(/^home-(progress|add-savings|next-milestone)$/).map((node) => node.props.testID)).toEqual([
      'home-progress',
      'home-add-savings',
      'home-next-milestone',
    ]);
    expect(goalOptionLabels()).toEqual(['History (2 entries)', 'Edit goal', 'Pause goal', 'New goal', 'Delete goal…']);
    // Home shows the world and progress, not administration (D73).
    expect(screen.queryByText('Free includes one open goal, active or paused. Archive this goal to start another one; it keeps all its records.')).toBeNull();
    expect(screen.queryByTestId('home-funded')).toBeNull();
  });

  it('a zero balance shows the base scene and no deadline means no estimate', async () => {
    await setupGoal(150_000, null);
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(home()).toMatchObject({
      saved: '€0.00',
      detail: '€1,500.00 to go',
      percent: '0%, €1,500.00 to go',
      next: '€150.00 more to reach 10%',
      deadline: 'none',
      pace: null,
      world: '0 of 10 milestones unlocked',
    });
  });
});

describe('recalculation after financial edits', () => {
  it('deposits, withdrawals and a correction update every number; overfunding stays numeric', async () => {
    const goalId = await setupGoal(150_000, '2026-11-21');
    await seedEntry(goalId, 'deposit', 33_000, '2026-10-20');
    await renderRouter(APP_DIR, { initialUrl: '/' });

    // Exactly complete.
    await addThroughForm('deposit', '1170');
    expect(home()).toMatchObject({
      saved: '€1,500.00',
      detail: '€0.00 to go',
      percent: '100%, €0.00 to go',
      next: 'Your world is complete.',
      deadline: 'Deadline Nov 21, 2026, target reached',
      pace: null,
      world: '10 of 10 milestones unlocked',
    });
    expect(screen.getByTestId('home-funded')).toHaveTextContent('Target reached');
    expect(screen.queryByTestId('home-overdue')).toBeNull();

    // Overfunded: 125%, the amount above the target, still ten unlocks.
    await addThroughForm('deposit', '375');
    expect(home()).toMatchObject({
      saved: '€1,875.00',
      detail: '€375.00 over target',
      percent: '125%, €375.00 over target',
      world: '10 of 10 milestones unlocked',
    });

    // A withdrawal takes the world back to stage 6 and brings the pace back.
    await addThroughForm('withdrawal', '975');
    expect(home()).toMatchObject({
      saved: '€900.00',
      detail: '€600.00 to go',
      percent: '60%, €600.00 to go',
      next: '€150.00 more to reach 70%',
      // R = 60000, D = 30: weekly ceil(420000 / 30) = 14000.
      pace: '€140.00 per week or €600.00 per month',
      world: '6 of 10 milestones unlocked',
    });
    expect(screen.queryByTestId('home-funded')).toBeNull();

    // Correct the withdrawal from 975 to 1,000 in History.
    const withdrawal = (await getAppDatabase().read((r) => listEntriesForGoal(r, goalId))).find((entry) => entry.signedAmountMinor < 0);
    await chooseGoalOption(/^History/);
    await userEvent.press(screen.getByTestId(`history-row-${withdrawal?.id}`));
    await userEvent.clear(screen.getByTestId('entry-amount'));
    await userEvent.type(screen.getByTestId('entry-amount'), '1000');
    await userEvent.press(screen.getByTestId('entry-save'));
    await waitFor(() => expect(screen).toHavePathname('/history'));
    await act(async () => {
      router.back();
    });
    expect(screen).toHavePathname('/');
    expect(home()).toMatchObject({
      saved: '€875.00',
      percent: '58%, €625.00 to go',
      // R = 62500, D = 30: weekly ceil(437500 / 30) = 14584.
      pace: '€145.84 per week or €625.00 per month',
      world: '5 of 10 milestones unlocked',
    });
  });

  it('target and deadline edits recalculate both paces; removing the deadline removes them', async () => {
    const goalId = await setupGoal(10_000, '2026-11-21');
    await seedEntry(goalId, 'deposit', 2_500, '2026-10-23');
    await renderRouter(APP_DIR, { initialUrl: '/' });
    // R = 7500, D = 30: weekly ceil(52500 / 30) = 1750.
    expect(home().pace).toBe('€17.50 per week or €75.00 per month');

    await chooseGoalOption('Edit goal');
    await userEvent.clear(screen.getByTestId('goal-target'));
    await userEvent.type(screen.getByTestId('goal-target'), '200');
    await userEvent.press(screen.getByTestId('goal-save'));
    await waitFor(() => expect(screen).toHavePathname('/'));
    // R = 17500, D = 30: weekly ceil(122500 / 30) = 4084; the target edit also moves the stage back.
    expect(home()).toMatchObject({ percent: '12%, €175.00 to go', pace: '€40.84 per week or €175.00 per month', world: '1 of 10 milestones unlocked' });

    await chooseGoalOption('Edit goal');
    // 23 Oct through 22 Dec 2026: 61 days. weekly ceil(122500 / 61) = 2009, monthly ceil(525000 / 61) = 8607.
    await fireEvent(nativeView({ title: 'Deadline' }), 'dateChange', {
      nativeEvent: { date: civilDateToLocalDate('2026-12-22' as CivilDate).toISOString() },
    });
    await userEvent.press(screen.getByTestId('goal-save'));
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(home()).toMatchObject({ deadline: 'Deadline Dec 22, 2026, 61 days left', pace: '€20.09 per week or €86.07 per month' });

    await chooseGoalOption('Edit goal');
    await userEvent.press(screen.getByTestId('deadline-remove'));
    await userEvent.press(screen.getByTestId('goal-save'));
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(home()).toMatchObject({ deadline: 'none', pace: null });
    // Without a deadline the card is a row that opens Edit goal to add one.
    await userEvent.press(screen.getByTestId('home-add-deadline'));
    expect(screen).toHavePathname('/goal-form');
  });
});

describe('civil date on returning to the foreground', () => {
  it('a deadline today becomes Overdue after midnight, read once when the app is active again', async () => {
    const goalId = await setupGoal(10_000, '2026-10-23');
    await seedEntry(goalId, 'deposit', 2_500, '2026-10-23');
    setLocalTime(2026, 10, 23, 23, 59);
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(home()).toMatchObject({ deadline: 'Deadline Oct 23, 2026, today', pace: '€75.00 per week or €75.00 per month' });
    expect(screen.queryByTestId('home-overdue')).toBeNull();

    // Same date: returning to the foreground does not re-read anything.
    const version = useAppDataStore.getState().version;
    await act(async () => {
      emitAppState('active');
    });
    expect(useAppDataStore.getState().version).toBe(version);

    // In the background past midnight, then active again.
    await act(async () => {
      emitAppState('background');
    });
    setLocalTime(2026, 10, 24, 0, 1);
    await act(async () => {
      emitAppState('active');
    });
    await waitFor(() => expect(screen.getByTestId('home-overdue')).toHaveTextContent('Overdue'));
    expect(useAppDataStore.getState().version).toBe(version + 1);
    expect(home()).toMatchObject({ deadline: 'Deadline Oct 23, 2026, overdue', pace: null, saved: '€25.00' });
    expect(screen.getByTestId('home-overdue-remaining')).toHaveAccessibleName('€75.00 still to go. Choose a new date in Edit goal.');
  });

  it('a funded goal past its deadline is never Overdue', async () => {
    const goalId = await setupGoal(10_000, '2026-10-23');
    await seedEntry(goalId, 'deposit', 10_000, '2026-10-23');
    setLocalTime(2026, 10, 30, 9, 0);
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(screen.queryByTestId('home-overdue')).toBeNull();
    expect(home()).toMatchObject({ deadline: 'Deadline Oct 23, 2026, target reached', pace: null });
    expect(screen.getByTestId('home-deadline-funded')).toHaveTextContent('Nothing more to save by this date.');
  });
});

describe('read failures', () => {
  it('a failed read after a commit shows a retry instead of stale numbers, keeps the navigator and recovers', async () => {
    const goalId = await setupGoal(10_000, null);
    await seedEntry(goalId, 'deposit', 2_000, '2026-10-23');
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(home().saved).toBe('€20.00');

    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const db = getAppDatabase();
    const read = jest.spyOn(db, 'read').mockRejectedValueOnce(new Error('disk I/O error'));
    await addThroughForm('deposit', '30');

    expect(screen.getByText('Couldn’t load your goals')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-saved')).toBeNull();
    // The deposit itself committed; only the read after it failed.
    expect((await db.read((r) => listEntriesForGoal(r, goalId))).map((entry) => entry.signedAmountMinor)).toEqual([2_000, 3_000]);
    // Still inside the tab navigator, on Home.
    expect(screen).toHavePathname('/');

    await userEvent.press(screen.getByTestId('home-retry'));
    await waitFor(() => expect(screen.getByTestId('home-saved')).toBeOnTheScreen());
    expect(home()).toMatchObject({ saved: '€50.00', percent: '50%, €50.00 to go' });
    read.mockRestore();
    warn.mockRestore();
  });
});

describe('goal switcher (Pro: more than one open goal)', () => {
  it('plays the selection haptic once when the shown goal changes', async () => {
    await setupGoal(10_000, null, 'First', 'pro');
    await setupGoal(20_000, null, 'Second', 'pro');
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(screen.getByTestId('home-goal-title')).toHaveTextContent('First');

    await userEvent.press(screen.getByLabelText('Show Second'));
    await waitFor(() => expect(screen.getByTestId('home-goal-title')).toHaveTextContent('Second'));
    expect(playedHaptics().map((haptic) => haptic.kind)).toEqual(['selection']);
    expect(home()).toMatchObject({ saved: '€0.00', target: 'saved of €200.00' });
  });
});
