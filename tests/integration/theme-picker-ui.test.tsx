import { act, fireEvent, screen, userEvent, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Alert, type AlertButton } from 'react-native';

import { currentCapabilities, refreshAppData } from '@/bootstrap/app-data';
import { reconcileBilling } from '@/bootstrap/billing';
import { getAppDatabase } from '@/bootstrap/database-readiness';
import { systemClock, today } from '@/core/calendar';
import type { ThemeId } from '@/core/progression';
import { randomUuid, uuidGenerator } from '@/data/ids';
import { getGoal, listGoals } from '@/data/repositories/goal-repository';
import { createGoal, finishGoal } from '@/features/goals/application/goal-commands';
import { createEntry } from '@/features/ledger/application/ledger-commands';
import { THEME_CROSSFADE_MS } from '@/features/worlds/world-scene';
import { setReduceMotionForTests } from '@/shared/ui/motion-preferences';

import { APP_DIR, chooseCurrency, freshAppDatabase, grantProForTests, resetApp } from '../support/app-fixture';
import { playedHaptics } from '../support/expo-haptics-fake';
import { fakeStore, refundStoreTransaction } from '../support/expo-iap-fake';
import { chooseGoalOption } from '../support/goal-menu';
import { liveToasts } from '../support/sonner-native-fake';

// Phase 17 journeys on the real routes (Jest, host SQLite, the expo-iap fake behind the real billing
// queue): the world picker in Create (locked Garden card → paywall → back with the draft, a purchase
// makes it choosable), Change world from Home with the selection haptic, the shared toast and Home's
// crossfade, the kind Garden → Island path after a verified loss (D75), the compact Garden preview on
// the paywall (D121) and stale or closed deep links. VoiceOver, the felt haptic and the look of the
// crossfade are simulator/device checks (docs/evidence/PHASE_17.md).

// Several full-app journeys; slow when the machine is busy (simulators, Metro).
jest.setTimeout(60_000);

const TODAY = today(systemClock);

afterAll(async () => {
  await resetApp();
});

afterEach(() => {
  setReduceMotionForTests(true);
});

beforeEach(async () => {
  await freshAppDatabase('theme-picker-ui');
  await chooseCurrency('EUR');
});

function deps() {
  return { db: getAppDatabase(), clock: systemClock, ids: uuidGenerator, capabilities: currentCapabilities() };
}

async function setupGoal(title: string, saved = 0, themeId: ThemeId = 'island'): Promise<string> {
  const created = await createGoal(deps(), { operationId: randomUuid(), title, targetMinor: 10_000, deadlineDate: null, themeId });
  if (!created.ok) {
    throw new Error(`goal setup failed: ${JSON.stringify(created.error)}`);
  }
  if (saved > 0) {
    const entry = await createEntry(deps(), { operationId: randomUuid(), goalId: created.value.goalId, kind: 'deposit', amountMinor: saved, entryDate: TODAY, note: null });
    if (!entry.ok) {
      throw new Error('deposit failed');
    }
  }
  return created.value.goalId;
}

async function themeOf(goalId: string): Promise<ThemeId | undefined> {
  return (await getAppDatabase().read((r) => getGoal(r, goalId)))?.themeId;
}

function hapticTypes(): string[] {
  return playedHaptics().map((haptic) => (haptic.kind === 'notification' ? haptic.type : haptic.kind));
}

function toastTitles(): string[] {
  return liveToasts().map((item) => String((item.jsx.props as { title: string }).title));
}

function answerNextAlert(label: string) {
  return jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _message, buttons?: AlertButton[]) => {
    buttons?.find((button) => button.text === label)?.onPress?.();
  });
}

function card(themeId: ThemeId) {
  return screen.getByTestId(`theme-card-${themeId}`);
}

// Home's scene (Collection beside it draws worlds too).
function homeScene() {
  return within(screen.getByTestId('home', { includeHiddenElements: true })).getByTestId('world-scene', { includeHiddenElements: true });
}

// Jest has no layout: give Home's scene area a size so its layers mount.
async function measureHome() {
  const area = within(screen.getByTestId('home', { includeHiddenElements: true })).getByTestId('world-scene-area', { includeHiddenElements: true });
  await fireEvent(area, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 300 } } });
}

async function loadLayers(prefix = 'world-layer-') {
  for (const node of screen.queryAllByTestId(new RegExp(`^${prefix}`), { includeHiddenElements: true })) {
    await act(() => node.props.onLoad({ nativeEvent: {} }));
  }
}

describe('Create: the world picker (D122)', () => {
  it('Free sees Garden as a locked card; it opens the paywall and comes back with the draft; a purchase makes it choosable', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/goal-form' });
    await userEvent.type(screen.getByTestId('goal-title'), 'Camera');
    await userEvent.type(screen.getByTestId('goal-target'), '300');
    // Both worlds as picture cards: the Island chosen, the Garden locked with its Pro state announced.
    expect(card('island').props.accessibilityRole).toBe('radio');
    expect(card('island').props.accessibilityState).toMatchObject({ checked: true });
    expect(card('island').props.accessibilityLabel).toBe('Island, chosen');
    expect(card('garden').props.accessibilityRole).toBe('button');
    expect(card('garden').props.accessibilityLabel).toBe('Garden, part of Pro');
    expect(card('garden').props.accessibilityHint).toBe('Opens Saving Worlds Pro.');
    expect(screen.getByTestId('theme-card-garden-locked')).toHaveTextContent('Pro');
    expect(within(card('garden')).getByTestId('world-scene', { includeHiddenElements: true })).toBeTruthy();

    await userEvent.press(card('garden'));
    expect(screen).toHavePathname('/paywall');
    expect(hapticTypes()).toEqual([]);
    // Closing the paywall returns to the form with the draft and the choice unchanged.
    await act(() => router.back());
    expect(screen).toHavePathname('/goal-form');
    expect(screen.getByTestId('goal-title').props.value).toBe('Camera');
    expect(screen.getByTestId('goal-target').props.value).toBe('300');
    expect(card('island').props.accessibilityState).toMatchObject({ checked: true });

    // Buy Pro on the paywall the card opened; Done returns, and the Garden can be chosen right there.
    await userEvent.press(card('garden'));
    await waitFor(() => expect(screen.getByTestId('paywall-buy')).toHaveTextContent('Unlock Pro for €4.99'));
    await userEvent.press(screen.getByTestId('paywall-buy'));
    await waitFor(() => expect(screen.getByTestId('paywall-done')).toBeOnTheScreen());
    await userEvent.press(screen.getByTestId('paywall-done'));
    expect(screen).toHavePathname('/goal-form');
    expect(screen.getByTestId('goal-title').props.value).toBe('Camera');
    await waitFor(() => expect(card('garden').props.accessibilityRole).toBe('radio'));
    playedHaptics().splice(0);
    await userEvent.press(card('garden'));
    expect(card('garden').props.accessibilityState).toMatchObject({ checked: true });
    expect(hapticTypes()).toEqual(['selection']);
    await userEvent.press(screen.getByTestId('goal-save'));
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect((await getAppDatabase().read((r) => listGoals(r))).map((goal) => [goal.title, goal.themeId])).toEqual([['Camera', 'garden']]);
  });

  it('Pro chooses either world without a lock', async () => {
    await grantProForTests();
    await renderRouter(APP_DIR, { initialUrl: '/goal-form' });
    expect(card('garden').props.accessibilityRole).toBe('radio');
    expect(screen.queryByTestId('theme-card-garden-locked')).toBeNull();
  });
});

describe('Change world on an open goal (R20)', () => {
  it('Pro picks the Garden: selection haptic, the shared toast, Home crosses over to the same stage', async () => {
    setReduceMotionForTests(false);
    const goalId = await setupGoal('Trip', 5_000);
    await grantProForTests();
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await measureHome();
    await loadLayers();
    expect(screen.queryAllByTestId(/^world-layer-bridge_/, { includeHiddenElements: true }).length).toBeGreaterThan(0);
    expect(homeScene().props.accessibilityLabel).toBe('Island world, 5 of 10 milestones unlocked');

    await chooseGoalOption('Change world');
    expect(screen).toHavePathname('/theme-picker');
    expect(screen.getByTestId('theme-picker')).toHaveTextContent(/Your savings, target and progress stay the same in either world\./);
    expect(card('island').props.accessibilityState).toMatchObject({ checked: true });
    await userEvent.press(card('garden'));
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(await themeOf(goalId)).toBe('garden');
    expect(hapticTypes()).toEqual(['selection']);
    expect(toastTitles()).toEqual(['Your goal now grows a Garden']);

    // Home keeps the Island until the Garden's layers have loaded, then crosses over (never a replay).
    await waitFor(() => expect(homeScene().props.accessibilityLabel).toBe('Garden world, 5 of 10 milestones unlocked'));
    expect(screen.queryAllByTestId(/^world-outgoing-layer-/, { includeHiddenElements: true }).length).toBeGreaterThan(0);
    expect(screen.getByTestId('world-theme-incoming', { includeHiddenElements: true })).toBeTruthy();
    await loadLayers();
    await waitFor(() => expect(screen.queryAllByTestId(/^world-outgoing-layer-/, { includeHiddenElements: true })).toHaveLength(0), {
      timeout: THEME_CROSSFADE_MS + 1_000,
    });
    expect(screen.queryByTestId('unlock-banner')).toBeNull();
    // The numbers never moved.
    expect(screen.getByTestId('home-percent')).toHaveTextContent('50%');

    // A resize (rotation, fold, split view) only lays the scene out again: same world, same numbers.
    const area = within(screen.getByTestId('home', { includeHiddenElements: true })).getByTestId('world-scene-area', { includeHiddenElements: true });
    for (const [width, height] of [[700, 300], [320, 260], [400, 300]]) {
      await fireEvent(area, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height } } });
      expect(homeScene().props.accessibilityLabel).toBe('Garden world, 5 of 10 milestones unlocked');
      expect(screen.getByTestId('home-saved')).toHaveTextContent('€50.00');
    }
    expect(await themeOf(goalId)).toBe('garden');
    expect((await getAppDatabase().read((r) => r.all('SELECT signed_amount_minor FROM ledger_entries'))).length).toBe(1);
  });

  it('under Reduce Motion the new world replaces the old one at once once loaded', async () => {
    setReduceMotionForTests(true);
    const goalId = await setupGoal('Trip', 2_000);
    await grantProForTests();
    await renderRouter(APP_DIR, { initialUrl: `/theme-picker?goalId=${goalId}` });
    await userEvent.press(card('garden'));
    await waitFor(() => expect(screen).toHavePathname('/'));
    await measureHome();
    await loadLayers();
    await waitFor(() => expect(screen.queryAllByTestId(/^world-outgoing-layer-/, { includeHiddenElements: true })).toHaveLength(0));
    expect(homeScene().props.accessibilityLabel).toBe('Garden world, 2 of 10 milestones unlocked');
  });

  it('Edit goal shows the world as a row that opens the picker', async () => {
    const goalId = await setupGoal('Trip');
    await renderRouter(APP_DIR, { initialUrl: `/goal-form?goalId=${goalId}` });
    expect(screen.getByTestId('goal-theme')).toHaveTextContent(/WorldIsland/);
    await userEvent.press(screen.getByTestId('goal-theme'));
    expect(screen).toHavePathname('/theme-picker');
    // Free: the Garden card is locked and opens the paywall; nothing changes.
    await userEvent.press(card('garden'));
    expect(screen).toHavePathname('/paywall');
    expect(await themeOf(goalId)).toBe('island');
  });

  it('a closed goal, a stale link or an unknown goal cannot change a world', async () => {
    const goalId = await setupGoal('Done', 10_000);
    const goal = await getAppDatabase().read((r) => getGoal(r, goalId));
    expect((await finishGoal(deps(), { operationId: randomUuid(), goalId, expectedRevision: goal!.revision })).ok).toBe(true);
    await renderRouter(APP_DIR, { initialUrl: `/theme-picker?goalId=${goalId}` });
    expect(screen.getByTestId('theme-picker-unavailable')).toHaveTextContent(/Reopen the goal from Collection/);
    expect(screen.queryByTestId('theme-cards')).toBeNull();
    await act(() => router.replace('/theme-picker?goalId=not-a-goal'));
    expect(screen.getByTestId('theme-picker-unavailable')).toHaveTextContent(/Goal not found/);
  });
});

describe('a Garden goal after a verified loss of Pro (D75)', () => {
  it('is explained kindly; the person may grow it as an Island after a confirmation; nothing switched on its own', async () => {
    await grantProForTests();
    const goalId = await setupGoal('Garden', 6_000, 'garden');
    refundStoreTransaction(fakeStore.transactions[0]!.id);
    await reconcileBilling();
    await refreshAppData();
    expect(await themeOf(goalId)).toBe('garden');

    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(screen.getByTestId('home-read-only-note')).toHaveTextContent(/This Garden is kept just as it is\./);
    await userEvent.press(screen.getByTestId('home-choose-world'));
    expect(screen).toHavePathname('/theme-picker');
    expect(screen.getByTestId('theme-picker-locked')).toHaveTextContent(/Your Garden is kept just as it is/);
    // Their Garden is the chosen card, locked: it opens the paywall; the Island can be chosen.
    expect(card('garden').props.accessibilityLabel).toBe('Garden, chosen, part of Pro');
    expect(card('island').props.accessibilityRole).toBe('radio');

    // Cancel in the confirmation changes nothing.
    answerNextAlert('Cancel');
    await userEvent.press(card('island'));
    expect(await themeOf(goalId)).toBe('garden');

    const alert = answerNextAlert('Grow as an Island');
    await userEvent.press(card('island'));
    expect(alert).toHaveBeenCalledWith('Grow this goal as an Island?', expect.stringMatching(/savings, target and souvenir stay the same/), expect.any(Array));
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(await themeOf(goalId)).toBe('island');
    expect(toastTitles()).toEqual(['Your goal now grows an Island']);
    // Saving works again, on the Island, at the same progress.
    await waitFor(() => expect(screen.getByTestId('home-add-savings')).toBeOnTheScreen());
    expect(screen.getByTestId('home-percent')).toHaveTextContent('60%');
  });
});

describe('Pro paywall: compact Garden preview (D121)', () => {
  it('keeps the person’s world as the hero and shows the completed Garden beside “Unlock the Garden”, decorative', async () => {
    await setupGoal('Trip', 3_000);
    await renderRouter(APP_DIR, { initialUrl: '/paywall' });
    const hero = within(screen.getByTestId('paywall-world')).getByTestId('world-scene', { includeHiddenElements: true });
    expect(hero.props.accessibilityLabel).toBe('Island world, 3 of 10 milestones unlocked');
    const preview = screen.getByTestId('paywall-garden-preview');
    const garden = within(preview).getByTestId('world-scene', { includeHiddenElements: true });
    expect(garden.props.accessibilityLabel).toBe('Garden world, 10 of 10 milestones unlocked');
    expect(garden.props.accessibilityElementsHidden).toBe(true);
    // Inside the Garden feature, whose label says it in words.
    expect(within(screen.getByTestId('paywall-features')).getByTestId('paywall-garden-preview')).toBeTruthy();
    expect(screen.getByLabelText('Unlock the Garden. Grow a beautiful new world.')).toBeTruthy();
    // No gazebo (D119/D124).
    expect(screen.getByTestId('paywall')).not.toHaveTextContent(/gazebo/i);
  });
});
