import { act, fireEvent, screen, userEvent, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import fs from 'fs';
import path from 'path';
import { AccessibilityInfo, Alert, type AlertButton } from 'react-native';

import { setAppClockForTests } from '@/bootstrap/app-data';
import { getAppDatabase } from '@/bootstrap/database-readiness';
import { fixedClock, systemClock, today, type Clock } from '@/core/calendar';
import { randomUuid, uuidGenerator } from '@/data/ids';
import { listGoals } from '@/data/repositories/goal-repository';
import { createGoal, finishGoal } from '@/features/goals/application/goal-commands';
import { createEntry } from '@/features/ledger/application/ledger-commands';
import { readCurrencyOverview } from '@/features/settings/application/settings-queries';

import { APP_DIR, chooseCurrency, freshAppDatabase, resetApp } from '../support/app-fixture';
import { playedHaptics } from '../support/expo-haptics-fake';
import { chooseGoalOption, goalOptionLabels } from '../support/goal-menu';
import { liveToasts } from '../support/sonner-native-fake';

// Phase 06 screens on the real routes (Jest, host SQLite): onboarding, Create/Edit Goal, Home
// lifecycle actions, Collection Reopen and the Settings currency lock. Native controls (@expo/ui
// pickers) are driven through their native-event props; their real SwiftUI behavior and VoiceOver
// are checked on the simulator (docs/evidence/PHASE_06.md).

const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions');

beforeEach(() => {
  announce.mockClear();
});

afterAll(async () => {
  await resetApp();
});

async function goals() {
  return getAppDatabase().read((r) => listGoals(r));
}

// Host (native) element whose props match, for @expo/ui views that have no text or role in Jest.
function nativeByProps(props: Record<string, unknown>) {
  return screen.container.queryAll(
    (node) => typeof node.type === 'string' && Object.entries(props).every(([key, value]) => node.props[key] === value),
  );
}

function nativeView(props: Record<string, unknown>) {
  const [first] = nativeByProps(props);
  if (!first) {
    throw new Error(`no native view with ${JSON.stringify(props)}`);
  }
  return first;
}

// One entry per haptic played: 'success' / 'warning' notifications, or 'selection'.
function hapticTypes(): string[] {
  return playedHaptics().map((haptic) => (haptic.kind === 'notification' ? haptic.type : haptic.kind));
}

function toastTitles(): string[] {
  return liveToasts().map((item) => String((item.jsx.props as { title: string }).title));
}

// Presses the button with `label` in the next native alert.
function answerNextAlert(label: string) {
  jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _message, buttons?: AlertButton[]) => {
    buttons?.find((button) => button.text === label)?.onPress?.();
  });
}

async function createGoalThroughForm(title: string, target: string) {
  await userEvent.press(screen.getByTestId('home-new-goal'));
  expect(screen).toHavePathname('/goal-form');
  await userEvent.type(screen.getByTestId('goal-title'), title);
  await userEvent.type(screen.getByTestId('goal-target'), target);
  await userEvent.press(screen.getByTestId('goal-save'));
  await waitFor(() => expect(screen).toHavePathname('/'));
}

// The onboarding buttons ignore a press within 600 ms of a step change (double-tap guard, D132),
// timed on the app clock: `apart` makes every reading a second later, as a person's taps are;
// `rapid` a millisecond later, as a double tap is.
function onboardingClock(stepMs: number): Clock {
  let instant = Date.now();
  return { nowMs: () => (instant += stepMs), timeZone: () => systemClock.timeZone() };
}

describe('onboarding', () => {
  beforeEach(async () => {
    await freshAppDatabase('onboarding');
  });

  afterEach(() => {
    setAppClockForTests(systemClock);
  });

  it('walks three short steps, asks for the one global currency and then opens Home', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    setAppClockForTests(onboardingClock(1000));
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(screen).toHavePathname('/onboarding');

    // Step 1: the finished Island (D98, V09), decorative: the title says what it is.
    expect(screen.getByText('Welcome to Saving Worlds')).toBeOnTheScreen();
    expect(screen.getByText('Turn your savings goals into little worlds that grow with every step.')).toBeOnTheScreen();
    expect(screen.getByTestId('onboarding-steps').props.accessibilityLabel).toBe('Step 1 of 3');
    const onboardingWorld = within(screen.getByTestId('onboarding-world', { includeHiddenElements: true })).getByTestId('world-scene', {
      includeHiddenElements: true,
    });
    expect(onboardingWorld.props.accessible).toBe(false);
    expect(onboardingWorld.props.accessibilityLabel).toBe('Island world, 10 of 10 milestones unlocked');
    expect(screen.queryByTestId('onboarding-back')).toBeNull();
    expect(screen.getByTestId('onboarding-next-welcome')).toHaveTextContent('Next');
    await userEvent.press(screen.getByTestId('onboarding-next-welcome'));

    // Step 2: the person keeps their money; the full disclosure is one tap away.
    expect(screen.getByText('How it works')).toBeOnTheScreen();
    expect(screen.getByText('You keep your money wherever you like. Saving Worlds simply tracks what you set aside.')).toBeOnTheScreen();
    expect(screen.getByTestId('onboarding-progression').props.accessibilityLabel).toBe(
      'An island that grows from empty to complete as you record your savings. Set a goal, Record savings, Watch it grow.',
    );
    expect(screen.getByTestId('onboarding-steps').props.accessibilityLabel).toBe('Step 2 of 3');
    await userEvent.press(screen.getByTestId('onboarding-record-info'));
    expect(alert).toHaveBeenLastCalledWith(
      'A record, not a bank account',
      'Saving Worlds never holds, moves or checks your money. You record what you set aside yourself, and your records stay on this iPhone.',
    );
    await userEvent.press(screen.getByTestId('onboarding-next'));

    // Step 3: preselected from the device region (Jest locale en-US), then changed natively.
    expect(screen.getByText('Choose your currency')).toBeOnTheScreen();
    expect(screen.getByTestId('onboarding-currency-rule')).toHaveTextContent('Every goal uses it. You can change it until your first savings entry.');
    await userEvent.press(screen.getByTestId('onboarding-currency-rule-info'));
    expect(alert).toHaveBeenLastCalledWith('About your currency', expect.stringMatching(/Amounts are never converted/));
    expect(screen.getByTestId('onboarding-selected')).toHaveTextContent('Selected: USD – US Dollar');
    await fireEvent(nativeView({ label: 'Currency' }), 'selectionChange', { nativeEvent: { selection: 'JPY' } });
    expect(screen.getByTestId('onboarding-selected')).toHaveTextContent('Selected: JPY – Yen');

    // Back and forth keeps the choice; nothing is saved before Start building.
    await userEvent.press(screen.getByTestId('onboarding-back'));
    expect(screen.getByText('How it works')).toBeOnTheScreen();
    expect((await readCurrencyOverview(getAppDatabase())).currency.status).toBe('missing');
    await userEvent.press(screen.getByTestId('onboarding-next'));
    expect(screen.getByTestId('onboarding-selected')).toHaveTextContent('Selected: JPY – Yen');

    expect(screen.getByTestId('onboarding-continue')).toHaveTextContent('Get Started');
    await userEvent.press(screen.getByTestId('onboarding-continue'));
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(screen.getByText('Start your first goal')).toBeOnTheScreen();
    const overview = await readCurrencyOverview(getAppDatabase());
    expect(overview.currency).toMatchObject({ status: 'set', currency: { code: 'JPY' } });

    // Onboarding is no longer reachable once a currency exists.
    await act(async () => {
      router.navigate('/onboarding');
    });
    expect(screen).not.toHavePathname('/onboarding');
    alert.mockRestore();
  });

  it('ignores the second tap of a double tap, so the currency step is never skipped', async () => {
    setAppClockForTests(onboardingClock(1));
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await userEvent.press(screen.getByTestId('onboarding-next-welcome'));
    await userEvent.press(screen.getByTestId('onboarding-next'));
    expect(screen.getByText('How it works')).toBeOnTheScreen();
    expect((await readCurrencyOverview(getAppDatabase())).currency.status).toBe('missing');
  });
});

describe('before onboarding', () => {
  beforeEach(async () => {
    await freshAppDatabase('guard');
  });

  it.each(['/settings', '/goal-form', '/collection'])('a deep link to %s lands on onboarding', async (url) => {
    await renderRouter(APP_DIR, { initialUrl: url });
    expect(screen).toHavePathname('/onboarding');
  });
});

describe('Create and Edit Goal', () => {
  beforeEach(async () => {
    await freshAppDatabase('goal-form');
    await chooseCurrency('EUR');
  });

  it('keeps the input and explains an invalid target, then saves once and confirms with one toast', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await userEvent.press(screen.getByTestId('home-new-goal'));
    expect(screen).toHavePathname('/goal-form');
    // Currency is read-only information, never a goal field.
    expect(screen.getByLabelText('Target amount (EUR)')).toBeOnTheScreen();
    expect(nativeByProps({ label: 'Currency' })).toHaveLength(0);

    await userEvent.type(screen.getByTestId('goal-title'), 'Summer trip');
    await userEvent.type(screen.getByTestId('goal-target'), '12.345');
    await userEvent.press(screen.getByTestId('goal-save'));
    expect(screen.getByText('EUR amounts have at most 2 decimal places.')).toBeOnTheScreen();
    expect(screen.getByTestId('goal-title')).toHaveDisplayValue('Summer trip');
    expect(screen.getByTestId('goal-target')).toHaveDisplayValue('12.345');
    await userEvent.clear(screen.getByTestId('goal-target'));
    await userEvent.type(screen.getByTestId('goal-target'), '0');
    await userEvent.press(screen.getByTestId('goal-save'));
    expect(screen.getByText('Enter a target greater than zero.')).toBeOnTheScreen();
    expect(await goals()).toHaveLength(0);
    expect(liveToasts()).toHaveLength(0);

    await userEvent.clear(screen.getByTestId('goal-target'));
    await userEvent.type(screen.getByTestId('goal-target'), '1,250.50');
    await userEvent.press(screen.getByTestId('goal-save'));
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(screen.getByTestId('home-goal-title')).toHaveTextContent('Summer trip');
    expect(screen.getByTestId('home-saved')).toHaveTextContent('€0.00');
    expect(screen.getByTestId('home-progress')).toHaveTextContent(/^0%€1,250\.50 to go$/);
    expect(toastTitles()).toEqual(['Goal created']);
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('Goal created', { queue: true });
    const stored = await goals();
    expect(stored.map((goal) => [goal.title, goal.targetMinor, goal.status])).toEqual([['Summer trip', 125_050, 'active']]);
  });

  it('Cancel closes the form without saving anything', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await userEvent.press(screen.getByTestId('home-new-goal'));
    await userEvent.type(screen.getByTestId('goal-title'), 'Never saved');
    await userEvent.type(screen.getByTestId('goal-target'), '100');
    await userEvent.press(screen.getByTestId('goal-cancel'));
    expect(screen).toHavePathname('/');
    expect(await goals()).toHaveLength(0);
    expect(liveToasts()).toHaveLength(0);
    expect(announce).not.toHaveBeenCalled();
  });

  it('a write failure keeps every field, shows an inline error and no toast', async () => {
    await getAppDatabase().write((tx) =>
      tx.exec("CREATE TRIGGER test_fail_goal BEFORE INSERT ON goals BEGIN SELECT RAISE(ABORT, 'disk I/O error'); END"),
    );
    await renderRouter(APP_DIR, { initialUrl: '/goal-form' });
    await userEvent.type(screen.getByTestId('goal-title'), 'Bike');
    await userEvent.type(screen.getByTestId('goal-target'), '300');
    await userEvent.press(screen.getByTestId('goal-save'));
    expect(screen).toHavePathname('/goal-form');
    expect(screen.getByTestId('goal-form-error')).toHaveTextContent(/Couldn’t save. Nothing was changed. Try again./);
    expect(screen.getByTestId('goal-title')).toHaveDisplayValue('Bike');
    expect(screen.getByTestId('goal-target')).toHaveDisplayValue('300');
    expect(liveToasts()).toHaveLength(0);
    // No toast: only the inline error notice is spoken (Phase 19).
    expect(announce.mock.calls.map(([text]) => text)).toEqual(['Not saved. Couldn’t save. Nothing was changed. Try again.']);

    // The retry reuses the form's operation ID and succeeds once storage works again.
    await getAppDatabase().write((tx) => tx.exec('DROP TRIGGER test_fail_goal'));
    await userEvent.press(screen.getByTestId('goal-save'));
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(await goals()).toHaveLength(1);
    expect(toastTitles()).toEqual(['Goal created']);
  });

  it('deadline: today or later for a new date, an expired saved deadline may stay', async () => {
    // A goal whose deadline (10 Oct 2026) has passed: created "earlier" with a clock in the past.
    const earlier = fixedClock(Date.parse('2026-10-01T10:00:00.000Z'), 'UTC');
    const created = await createGoal(
      { db: getAppDatabase(), clock: earlier, ids: uuidGenerator },
      { operationId: randomUuid(), title: 'Old deadline', targetMinor: 10_000, deadlineDate: '2026-10-10', themeId: 'island' },
    );
    if (!created.ok) {
      throw new Error('setup');
    }
    await renderRouter(APP_DIR, { initialUrl: `/goal-form?goalId=${created.value.goalId}` });
    expect(screen.getByTestId('deadline-summary')).toHaveTextContent(/^Passed on Oct 10, 2026\. Keep it, pick a new date or remove it\.$/);

    // Moving it to another past date is refused inline, with the input kept.
    const picker = nativeView({ title: 'Deadline' });
    await fireEvent(picker, 'dateChange', { nativeEvent: { date: new Date(2026, 9, 11, 12).toISOString() } });
    await userEvent.press(screen.getByTestId('goal-save'));
    expect(screen.getByText('Choose today or a later date.')).toBeOnTheScreen();
    expect(screen.getByTestId('deadline-summary')).toHaveTextContent(/Oct 11, 2026/);

    // Back to the saved, expired date: allowed, because the deadline did not change.
    await fireEvent(picker, 'dateChange', { nativeEvent: { date: new Date(2026, 9, 10, 12).toISOString() } });
    await fireEvent.changeText(screen.getByTestId('goal-title'), 'Old deadline kept');
    await userEvent.press(screen.getByTestId('goal-save'));
    await waitFor(() => expect(toastTitles()).toEqual(['Goal saved']));
    expect((await goals()).map((goal) => [goal.title, goal.deadlineDate])).toEqual([['Old deadline kept', '2026-10-10']]);
  });

  it('a new deadline starts at today and can be removed', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/goal-form' });
    await userEvent.press(screen.getByTestId('deadline-add'));
    const picker = nativeView({ title: 'Deadline' });
    expect(picker.props.range.start.slice(0, 10)).toBe(today(systemClock));
    await userEvent.press(screen.getByTestId('deadline-remove'));
    expect(nativeByProps({ title: 'Deadline' })).toHaveLength(0);
    expect(screen.getByTestId('deadline-add')).toBeOnTheScreen();
  });
});

describe('Home lifecycle, Free goal limit and Collection', () => {
  beforeEach(async () => {
    await freshAppDatabase('lifecycle-ui');
    await chooseCurrency('EUR');
  });

  it('pause keeps the one Free goal, New goal explains Pro, Delete frees the place (D74)', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await createGoalThroughForm('Laptop', '900');
    // Goal administration lives in the ⋯ menu, not on Home (D73); Archive is gone (D74).
    expect(goalOptionLabels()).toEqual(['History', 'Edit goal', 'Change world', 'Pause goal', 'New goal', 'Delete goal…']);
    expect(screen.queryByTestId('home-new-goal')).not.toBeOnTheScreen();
    // New goal while Free's one goal exists opens the "Build another world" paywall entry (Phase 16)
    // instead of a form that would be refused; Not now returns to Home.
    await chooseGoalOption('New goal');
    expect(screen).toHavePathname('/goal-form');
    expect(screen.getByTestId('paywall-another-world')).toHaveTextContent(/You’ve already created your free savings goal\./);
    expect(screen.queryByTestId('goal-title')).toBeNull();
    await userEvent.press(screen.getByTestId('paywall-close'));
    expect(screen).toHavePathname('/');

    await chooseGoalOption('Pause goal');
    await waitFor(() => expect(screen.getByTestId('home-paused')).toBeOnTheScreen());
    expect(toastTitles()).toEqual(['Goal paused']);
    // Goal created, then Goal paused: one success haptic per committed write with a success toast (D68).
    expect(hapticTypes()).toEqual(['success', 'success']);
    expect(goalOptionLabels()).toContain('Resume goal');
    // A paused goal stays editable.
    await chooseGoalOption('Edit goal');
    expect(screen).toHavePathname('/goal-form');
    expect(screen.getByTestId('goal-title')).toHaveDisplayValue('Laptop');
    await userEvent.press(screen.getByTestId('goal-cancel'));

    // Delete asks first; Cancel keeps everything.
    answerNextAlert('Cancel');
    await chooseGoalOption('Delete goal…');
    expect(await goals()).toHaveLength(1);
    const confirm = jest.spyOn(Alert, 'alert');
    answerNextAlert('Delete');
    await chooseGoalOption('Delete goal…');
    expect(confirm.mock.calls.at(-1)?.slice(0, 2)).toEqual([
      'Delete “Laptop”?',
      'This permanently deletes the goal and its savings history. This action cannot be undone.',
    ]);
    await waitFor(() => expect(screen.getByText('Start your first goal')).toBeOnTheScreen());
    expect(toastTitles()).toEqual(['Goal deleted']);
    expect(hapticTypes()).toEqual(['success', 'success', 'success']);
    expect(await goals()).toEqual([]);

    // The place is free again.
    await createGoalThroughForm('Phone', '400');
    expect((await goals()).map((goal) => goal.title)).toEqual(['Phone']);
  });

  it('a completed goal in Collection: Reopen sets it active; Delete warns about the finished world', async () => {
    const created = await createGoal(
      { db: getAppDatabase(), clock: systemClock, ids: uuidGenerator },
      { operationId: randomUuid(), title: 'Camera', targetMinor: 25_000, deadlineDate: null, themeId: 'island' },
    );
    if (!created.ok) {
      throw new Error('setup');
    }
    const goalId = created.value.goalId;
    const ledgerDeps = { db: getAppDatabase(), clock: systemClock, ids: uuidGenerator };
    expect((await createEntry(ledgerDeps, { operationId: randomUuid(), goalId, kind: 'deposit', amountMinor: 25_000, entryDate: today(systemClock), note: null })).ok).toBe(true);
    expect((await finishGoal(ledgerDeps, { operationId: randomUuid(), goalId, expectedRevision: 1 })).ok).toBe(true);

    await renderRouter(APP_DIR, { initialUrl: '/' });
    // Free's one goal is finished: Home explains the two ways forward instead of a Create button.
    expect(screen.getByTestId('home-closed-hint')).toHaveTextContent(/Unlock Pro to build another world, or delete your finished goal in Collection to start over\./);
    expect(screen.queryByTestId('home-new-goal')).not.toBeOnTheScreen();
    expect(screen.getByTestId('home-another-world')).toHaveTextContent('Build another world');

    await act(async () => {
      router.navigate('/collection');
    });
    expect(screen.getByText('Completed')).toBeOnTheScreen();
    await userEvent.press(screen.getByTestId(`collection-card-${goalId}`));
    expect(screen).toHavePathname('/souvenir');
    const confirm = jest.spyOn(Alert, 'alert');
    answerNextAlert('Cancel');
    await userEvent.press(screen.getByTestId(`delete-${goalId}`));
    expect(confirm.mock.calls.at(-1)?.slice(0, 2)).toEqual([
      'Delete completed goal?',
      'This will permanently delete your savings history and the completed world from your Collection. This action cannot be undone.',
    ]);
    expect(await goals()).toHaveLength(1);

    await userEvent.press(screen.getByTestId(`reopen-${goalId}`));
    await waitFor(() => expect(toastTitles()).toEqual(['Goal reopened']));
    expect((await goals())[0]?.status).toBe('active');
    await act(async () => {
      router.navigate('/');
    });
    expect(screen.getByTestId('home-goal-title')).toHaveTextContent('Camera');
  });
});


describe('Settings currency', () => {
  beforeEach(async () => {
    await freshAppDatabase('currency-ui');
    await chooseCurrency('EUR');
  });

  it('changes the currency of empty goals after confirming no conversion', async () => {
    const created = await createGoal(
      { db: getAppDatabase(), clock: systemClock, ids: uuidGenerator },
      { operationId: randomUuid(), title: 'Holiday', targetMinor: 150_000, deadlineDate: null, themeId: 'island' },
    );
    expect(created.ok).toBe(true);
    await renderRouter(APP_DIR, { initialUrl: '/settings' });
    expect(screen.getByTestId('currency-current')).toHaveTextContent(/EUR – Euro/);
    // No disabled button at rest: Change appears once a different currency is picked.
    expect(screen.queryByTestId('currency-change')).not.toBeOnTheScreen();
    await fireEvent(nativeView({ label: 'Currency' }), 'selectionChange', { nativeEvent: { selection: 'JPY' } });

    const alert = jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _message, buttons?: AlertButton[]) => {
      buttons?.find((button) => button.text === 'Change')?.onPress?.();
    });
    await userEvent.press(screen.getByRole('button', { name: 'Change to JPY' }));
    expect(alert.mock.lastCall?.[0]).toBe('Change currency to JPY?');
    expect(alert.mock.lastCall?.[1]).toMatch(/Amounts are not converted.*Your goal keeps its target number and uses JPY instead of EUR./);
    await waitFor(() => expect(screen.getByTestId('currency-current')).toHaveTextContent(/JPY – Yen/));
    expect(toastTitles()).toEqual(['Currency changed to JPY']);
    expect(hapticTypes()).toEqual(['success']);
    expect((await goals()).map((goal) => goal.targetMinor)).toEqual([1_500]);
  });

  it('shows the lock while a transaction exists, with no currency picker', async () => {
    const created = await createGoal(
      { db: getAppDatabase(), clock: systemClock, ids: uuidGenerator },
      { operationId: randomUuid(), title: 'Holiday', targetMinor: 150_000, deadlineDate: null, themeId: 'island' },
    );
    if (!created.ok) {
      throw new Error('setup');
    }
    await createEntry(
      { db: getAppDatabase(), clock: systemClock, ids: uuidGenerator },
      { operationId: randomUuid(), goalId: created.value.goalId, kind: 'deposit', amountMinor: 1_000, entryDate: today(systemClock), note: null },
    );
    await renderRouter(APP_DIR, { initialUrl: '/settings' });
    expect(screen.getByTestId('currency-locked')).toHaveTextContent('Locked after your first saved entry.');
    // The full rule stays one tap away (D111).
    const info = jest.spyOn(Alert, 'alert').mockImplementationOnce(() => undefined);
    await userEvent.press(screen.getByRole('button', { name: 'About your currency' }));
    expect(info.mock.lastCall?.[1]).toMatch(/while no goal has a saved transaction or a souvenir.*never converted/);
    expect(nativeByProps({ label: 'Currency' })).toHaveLength(0);
    expect(screen.queryByTestId('currency-change')).not.toBeOnTheScreen();
  });
});

describe('route surface', () => {
  it('deletes goals only through the confirmed deleteGoal command, never a route (D74)', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else {
          files.push(path.relative(APP_DIR, full));
        }
      }
    };
    walk(APP_DIR);
    expect(files.filter((file) => /delete|remove/i.test(file))).toEqual([]);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const commands = Object.keys(require('@/features/goals/application/goal-commands') as object);
    expect(commands.filter((name) => /delete|remove/i.test(name))).toEqual(['deleteGoal']);
  });
});
