import { act, fireEvent, screen, userEvent, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo, Alert, StyleSheet, type AlertButton } from 'react-native';

import { refreshAppData } from '@/bootstrap/app-data';
import { getAppDatabase } from '@/bootstrap/database-readiness';
import { capabilitiesFor } from '@/core/access';
import { systemClock, today } from '@/core/calendar';
import { randomUuid, uuidGenerator } from '@/data/ids';
import { listCollectibles } from '@/data/repositories/collectible-repository';
import { listGoals } from '@/data/repositories/goal-repository';
import { createGoal, finishGoal } from '@/features/goals/application/goal-commands';
import { correctEntry, createEntry } from '@/features/ledger/application/ledger-commands';
import { readCurrencyOverview } from '@/features/settings/application/settings-queries';
import { colors } from '@/shared/theme';
import { setReduceMotionForTests } from '@/shared/ui/motion-preferences';

import { APP_DIR, chooseCurrency, freshAppDatabase, resetApp } from '../support/app-fixture';
import { playedHaptics } from '../support/expo-haptics-fake';
import { chooseGoalOption, goalOptionLabels } from '../support/goal-menu';
import { liveToasts } from '../support/sonner-native-fake';

// Phase 11 on the real routes (Jest, host SQLite, Reduce Motion on as in every UI test): the first
// saved 100% and its souvenir moment, Finish from Home's goal menu, the Collection list and the
// souvenir/goal detail with Reopen and the D74 deletion, the "Build another world" entry while Free's
// one goal is finished, and a reopened goal regressing while its souvenir stays complete. VoiceOver
// and the felt haptics are device checks (docs/evidence/PHASE_11.md).

const TODAY = today(systemClock);
const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions');

beforeEach(async () => {
  announce.mockClear();
  await freshAppDatabase('collection-ui');
  await chooseCurrency('EUR');
});

afterAll(async () => {
  await resetApp();
});

function deps() {
  return { db: getAppDatabase(), clock: systemClock, ids: uuidGenerator };
}

async function setupGoal(title: string, targetMinor: number) {
  const created = await createGoal(deps(), { operationId: randomUuid(), title, targetMinor, deadlineDate: null, themeId: 'island' });
  if (!created.ok) {
    throw new Error('goal setup failed');
  }
  return created.value.goalId;
}

async function seed(goalId: string, amountMinor: number) {
  const result = await createEntry(deps(), { operationId: randomUuid(), goalId, kind: 'deposit', amountMinor, entryDate: TODAY, note: null });
  if (!result.ok) {
    throw new Error('entry setup failed');
  }
  return result.value.entryId;
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

async function goals() {
  return getAppDatabase().read((r) => listGoals(r));
}

async function souvenirs() {
  return getAppDatabase().read((r) => listCollectibles(r));
}

async function depositThroughForm(amount: string) {
  await userEvent.press(screen.getByTestId('home-add-savings'));
  await userEvent.type(screen.getByTestId('entry-amount'), amount);
  await userEvent.press(screen.getByTestId('entry-save'));
  await waitFor(() => expect(screen).toHavePathname('/'));
}

describe('Collection (Phase 11)', () => {
  it('is empty until a goal reaches its target, and says how it fills', async () => {
    await setupGoal('Camera', 25_000);
    await renderRouter(APP_DIR, { initialUrl: '/collection' });
    // An undiscovered gallery (D98, V01): the faded empty Island, decorative.
    expect(screen.getByTestId('collection-empty')).toHaveTextContent(/Your gallery of worlds/);
    expect(screen.getByTestId('collection-empty')).toHaveTextContent(/leaves its finished world here as a souvenir\. It stays, even if you save less later\./);
    expect(screen.getByTestId('collection-empty-world', { includeHiddenElements: true })).toHaveStyle({ opacity: 0.55 });
  });

  it('first 100% → souvenir moment → Finish → Collection → Reopen → correction regresses the goal, the souvenir stays complete', async () => {
    const goalId = await setupGoal('Camera', 25_000);
    const firstEntry = await seed(goalId, 24_000);
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(goalOptionLabels()).not.toContain('Finish goal');

    // The deposit that first reaches the target: one souvenir, the goal stays active, one haptic.
    await depositThroughForm('10');
    await waitFor(() => expect(screen.getByTestId('unlock-banner')).toHaveAccessibleName('Your island is complete! Its souvenir is now in your Collection.'));
    expect(toastTitles()).toEqual(['Deposit saved']);
    expect(hapticTypes()).toEqual(['success']);
    expect(announce).toHaveBeenCalledWith('Your island is complete! Its souvenir is now in your Collection.', { queue: true });
    expect((await goals())[0]?.status).toBe('active');
    expect((await souvenirs()).map((souvenir) => [souvenir.goalId, souvenir.themeId, souvenir.themeVersion, souvenir.targetMinorAtAward])).toEqual([
      [goalId, 'island', 2, 25_000],
    ]);

    // Finish is offered at B ≥ T, next to Pause, and closes the goal.
    expect(goalOptionLabels()).toEqual(['History (2 entries)', 'Edit goal', 'Pause goal', 'Finish goal', 'New goal', 'Delete goal…']);
    await chooseGoalOption('Finish goal');
    await waitFor(() => expect(toastTitles()).toEqual(['Goal finished']));
    expect(hapticTypes()).toEqual(['success', 'success']);
    expect((await goals())[0]?.status).toBe('completed');

    // Free's one goal is finished: Home shows that finished world (D98, V04) and offers the "Build
    // another world" entry, not a form.
    expect(screen.getByTestId('home-empty')).toHaveTextContent(/Your world is finished/);
    expect(screen.getByTestId('home-empty')).toHaveTextContent(/Your finished island is kept in Collection\./);
    expect(
      within(screen.getByTestId('home-empty-world', { includeHiddenElements: true })).getByTestId('world-scene', { includeHiddenElements: true }),
    ).toHaveProp('accessibilityLabel', 'Island world, 10 of 10 milestones unlocked');
    expect(screen.getByTestId('home-closed-hint')).toHaveTextContent('Unlock Pro to build another world, or delete your finished goal in Collection to start over.');
    const anotherWorld = jest.spyOn(Alert, 'alert').mockImplementationOnce(() => undefined);
    await userEvent.press(screen.getByTestId('home-another-world'));
    expect(anotherWorld.mock.lastCall?.[0]).toBe('Build another world');
    expect(anotherWorld.mock.lastCall?.[1]).toMatch(/^You’ve already created your free savings goal\. Unlock Pro to create more goals and grow your collection of worlds\./);

    // Collection: a gallery with one featured finished world under "Completed worlds".
    await act(async () => {
      router.navigate('/collection');
    });
    expect(screen.getByTestId('collection-intro')).toHaveTextContent('Every world tells a story of something you achieved.');
    const completed = within(screen.getByTestId('collection-completed'));
    expect(completed.getByText('Completed worlds')).toBeOnTheScreen();
    expect(completed.getByText('Completed')).toBeOnTheScreen();
    expect(screen.getByTestId(`collection-card-${goalId}`)).toHaveAccessibleName(/^Camera, Completed\. Island · /);
    // Featured: the one card spans the gallery, its name is never cut.
    expect(StyleSheet.flatten(screen.getByTestId(`collection-card-${goalId}`).props.style).width).toBe('100%');
    expect(screen.getByTestId(`collection-card-title-${goalId}`).props.numberOfLines).toBeUndefined();
    expect(screen.queryByTestId('collection-open')).toBeNull();

    // The card's world floats slowly as a whole (D100), decorative; under Reduce Motion it rests.
    const cardWorld = screen.getByTestId(`collection-card-world-${goalId}`, { includeHiddenElements: true });
    expect(cardWorld.props.accessibilityElementsHidden).toBe(true);
    const [rest] = StyleSheet.flatten(cardWorld.props.style).transform as { translateY: number }[];
    expect(Math.abs(rest?.translateY ?? NaN)).toBe(0);
    // A thin gold frame marks a finished goal's card (D98, V02).
    expect(screen.getByTestId(`collection-card-${goalId}`)).toHaveStyle({ borderColor: colors.accentDecorative, borderWidth: 1 });

    // The detail: the souvenir then, the goal now, Reopen and Delete.
    await userEvent.press(screen.getByTestId(`collection-card-${goalId}`));
    // The burst waits until the finished world is drawn (Jest loads no images: fire each layer's load).
    expect(screen.queryByTestId('souvenir-sparkles', { includeHiddenElements: true })).toBeNull();
    await fireEvent(within(screen.getByTestId('souvenir-world')).getByTestId('world-scene-area', { includeHiddenElements: true }), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 300 } },
    });
    for (const layer of within(screen.getByTestId('souvenir-world')).queryAllByTestId(/^world-layer-/, { includeHiddenElements: true })) {
      await act(() => layer.props.onLoad({ nativeEvent: {} }));
    }
    // Reduce Motion (on in these tests): the finished world stands still, no sparkle burst.
    expect(screen.getByTestId('souvenir-sparkles', { includeHiddenElements: true }).children).toHaveLength(0);
    await act(async () => setReduceMotionForTests(false));
    // Motion allowed: one short burst of four sparkles over the finished world, decorative.
    expect(screen.getByTestId('souvenir-sparkles', { includeHiddenElements: true }).children).toHaveLength(4);
    expect(screen.getByTestId('souvenir-sparkles', { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
    await act(async () => setReduceMotionForTests(true));
    expect(screen).toHavePathname('/souvenir');
    expect(screen.getByTestId('souvenir-world')).toBeOnTheScreen();
    // Like Home: the souvenir's sky gradient fills the whole scene region (no framed card).
    const region = StyleSheet.flatten(within(screen.getByTestId('souvenir-world')).getByTestId('world-scene-region').props.style);
    expect(String(region.backgroundImage)).toMatch(/linear-gradient/);
    expect(StyleSheet.flatten(within(screen.getByTestId('souvenir-world')).getByTestId('world-scene').props.style).borderRadius).toBeUndefined();
    // The achievement: status, the saved amount, the world and the day it was completed; nothing
    // changed since, so no extra note.
    expect(screen.getByTestId('souvenir-status')).toHaveTextContent('Completed');
    expect(screen.getByTestId('souvenir-saved')).toHaveTextContent('€250.00');
    expect(screen.getByTestId('souvenir-completed-on')).toHaveTextContent(/^Island completed on /);
    expect(screen.getByTestId('souvenir-hero')).toHaveAccessibleName(/^Completed\. Saved €250\.00\. Island completed on /);
    expect(screen.queryByTestId('souvenir-since-then')).toBeNull();

    await userEvent.press(screen.getByTestId(`reopen-${goalId}`));
    await waitFor(() => expect(toastTitles()).toEqual(['Goal reopened']));
    expect(hapticTypes()).toEqual(['success', 'success', 'success']);
    expect((await goals())[0]?.status).toBe('active');
    // Reopened at 100%: active, never finished again by itself; the actions are gone.
    expect(screen.getByTestId('souvenir-status')).toHaveTextContent('Still open');
    expect(screen.queryByTestId(`reopen-${goalId}`)).toBeNull();

    // A correction 240 → 10 regresses the goal now; the souvenir stays complete.
    const corrected = await correctEntry(deps(), {
      operationId: randomUuid(),
      entryId: firstEntry,
      expectedRevision: 1,
      kind: 'deposit',
      amountMinor: 1_000,
      entryDate: TODAY,
      note: null,
    });
    expect(corrected.ok && corrected.value.balanceMinor).toBe(2_000);
    await act(() => refreshAppData());
    expect(screen.getByTestId('souvenir-saved')).toHaveTextContent('€20.00');
    expect(screen.getByTestId('souvenir-since-then')).toHaveTextContent('Its world on Home shows 0 of 10 milestones now; this souvenir stays complete.');
    expect(screen.getByTestId('souvenir-open-hint')).toHaveTextContent(/still open on Home/);
    expect(screen.getByTestId('souvenir-world')).toBeOnTheScreen();
    expect(await souvenirs()).toHaveLength(1);

    // In the gallery it moved to "Still growing".
    await act(async () => {
      router.back();
    });
    expect(within(screen.getByTestId('collection-open')).getByTestId(`collection-card-${goalId}`)).toHaveAccessibleName(/^Camera, Still open\./);
    expect(screen.queryByTestId('collection-completed')).toBeNull();
  });

  it('several finished worlds (Pro) form a two-column gallery; a narrow width falls back to one column; long names wrap', async () => {
    const pro = { ...deps(), capabilities: capabilitiesFor('pro') };
    const longTitle = 'A cozy cabin by the lake for the whole family to enjoy every summer';
    const ids: string[] = [];
    for (const title of ['Camera', longTitle, 'Bike']) {
      const created = await createGoal(pro, { operationId: randomUuid(), title, targetMinor: 10_000, deadlineDate: null, themeId: 'island' });
      if (!created.ok) {
        throw new Error('setup');
      }
      ids.push(created.value.goalId);
      await seed(created.value.goalId, 10_000);
      expect((await finishGoal(pro, { operationId: randomUuid(), goalId: created.value.goalId, expectedRevision: 1 })).ok).toBe(true);
    }
    await renderRouter(APP_DIR, { initialUrl: '/collection' });
    const grid = screen.getByTestId('collection-completed-grid');
    await fireEvent(grid, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 900 } } });
    // Two columns: (360 − 12 gap) / 2 = 174 pt each; compact titles stop at three lines, VoiceOver hears all.
    for (const id of ids) {
      expect(StyleSheet.flatten(screen.getByTestId(`collection-card-${id}`).props.style).width).toBe(174);
      expect(screen.getByTestId(`collection-card-title-${id}`).props.numberOfLines).toBe(3);
    }
    expect(screen.getByTestId(`collection-card-${ids[1]}`)).toHaveAccessibleName(new RegExp(`^${longTitle}, Completed\\.`));
    // Small completed cards keep the picture clear: no badge on them (the section and frame say it).
    expect(within(screen.getByTestId('collection-completed')).queryByText('Completed')).toBeNull();
    // Too narrow for two readable columns (largest text, slim split view): one column.
    await fireEvent(grid, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 900 } } });
    expect(StyleSheet.flatten(screen.getByTestId(`collection-card-${ids[0]}`).props.style).width).toBe(300);
  });

  it('Delete on a completed goal asks first, then removes goal, history and souvenir; the currency unlocks and Free can start over', async () => {
    const goalId = await setupGoal('Bike', 40_000);
    await seed(goalId, 40_000);
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await chooseGoalOption('Finish goal');
    await waitFor(() => expect(toastTitles()).toEqual(['Goal finished']));
    playedHaptics().length = 0;
    expect((await readCurrencyOverview(getAppDatabase())).locked).toBe(true);

    await act(async () => {
      router.navigate('/collection');
    });
    await userEvent.press(screen.getByTestId(`collection-card-${goalId}`));

    const cancel = answerNextAlert('Cancel');
    await userEvent.press(screen.getByTestId(`delete-${goalId}`));
    expect(cancel.mock.lastCall?.slice(0, 2)).toEqual([
      'Delete completed goal?',
      'This will permanently delete your savings history and the completed world from your Collection. This action cannot be undone.',
    ]);
    expect(await goals()).toHaveLength(1);

    answerNextAlert('Delete');
    await userEvent.press(screen.getByTestId(`delete-${goalId}`));
    await waitFor(() => expect(toastTitles()).toEqual(['Goal deleted']));
    expect(hapticTypes()).toEqual(['success']);
    expect(screen).toHavePathname('/collection');
    expect(screen.getByTestId('collection-empty')).toBeOnTheScreen();
    expect([await goals(), await souvenirs()]).toEqual([[], []]);
    expect((await readCurrencyOverview(getAppDatabase())).locked).toBe(false);

    await act(async () => {
      router.navigate('/');
    });
    expect(screen.getByTestId('home-new-goal')).toBeOnTheScreen();
  });

  it('Reopen refused by the Free goal limit plays the warning haptic and keeps the goal completed', async () => {
    const goalId = await setupGoal('Camera', 25_000);
    await seed(goalId, 25_000);
    expect((await finishGoal(deps(), { operationId: randomUuid(), goalId, expectedRevision: 1 })).ok).toBe(true);
    const second = await createGoal({ ...deps(), capabilities: capabilitiesFor('pro') }, {
      operationId: randomUuid(),
      title: 'Second',
      targetMinor: 1_000,
      deadlineDate: null,
      themeId: 'island',
    });
    expect(second.ok).toBe(true);
    await renderRouter(APP_DIR, { initialUrl: `/souvenir?goalId=${goalId}` });
    await userEvent.press(screen.getByTestId(`reopen-${goalId}`));
    await waitFor(() => expect(hapticTypes()).toEqual(['warning']));
    expect(toastTitles()).toEqual(['Goal not reopened']);
    expect((await goals()).find((goal) => goal.id === goalId)?.status).toBe('completed');
  });
});
