import { act, fireEvent, screen, userEvent, waitFor, within } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo, AppState, StyleSheet, type AppStateStatus } from 'react-native';

import { refreshAppData, setAppClockForTests, useAppDataStore } from '@/bootstrap/app-data';
import { getAppDatabase, resetAppDatabaseForTests, useDatabaseStore } from '@/bootstrap/database-readiness';
import { capabilitiesFor } from '@/core/access';
import { systemClock, type Clock } from '@/core/calendar';
import { type Stage } from '@/core/progression';
import { randomUuid, uuidGenerator } from '@/data/ids';
import { createGoal, editGoal } from '@/features/goals/application/goal-commands';
import { createEntry } from '@/features/ledger/application/ledger-commands';
import { visibleLayers } from '@/features/worlds/manifest';
import { themeManifest } from '@/features/worlds/registry';
import { setReduceMotionForTests } from '@/shared/ui/motion-preferences';

import { APP_DIR, chooseCurrency, freshAppDatabase, resetApp } from '../support/app-fixture';
import { playedHaptics } from '../support/expo-haptics-fake';

// Phase 10 on the real Home route (Jest, host SQLite, real timers): the D73 unlock moment after a
// committed deposit (count-up to the committed amount, the new stage with its objects, one "New
// milestone unlocked!" message in the scene, one VoiceOver announcement, one milestone haptic and no
// success haptic from the form), multi-threshold coalescing, quiet regression, Reduce Motion,
// background and restart. Phase 11: the first 100% is the souvenir moment. Frames, smoothness and
// felt haptics are device checks (evidence/PHASE_10.md).

const zone = systemClock.timeZone();
let instant = new Date(2026, 9, 25, 12, 0).getTime();
const testClock: Clock = { nowMs: () => (instant += 1), timeZone: () => zone };
const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions');

// Long enough for the start pause, the count and the reveal of any transition.
const MOMENT = { timeout: 5_000 };
jest.setTimeout(20_000);

beforeAll(() => setAppClockForTests(testClock));

beforeEach(async () => {
  jest.mocked(AppState.addEventListener).mockClear();
  announce.mockClear();
  setReduceMotionForTests(false);
  await freshAppDatabase('world-motion');
  await chooseCurrency('EUR');
});

afterAll(async () => {
  setReduceMotionForTests(true);
  setAppClockForTests(systemClock);
  await resetApp();
});

function deps() {
  return { db: getAppDatabase(), clock: testClock, ids: uuidGenerator, capabilities: capabilitiesFor('free') };
}

async function setupGoal(targetMinor: number) {
  const created = await createGoal(deps(), { operationId: randomUuid(), title: 'Boat', targetMinor, deadlineDate: null, themeId: 'island' });
  if (!created.ok) {
    throw new Error('goal setup failed');
  }
  return created.value.goalId;
}

async function seed(goalId: string, kind: 'deposit' | 'withdrawal', amountMinor: number) {
  const result = await createEntry(deps(), { operationId: randomUuid(), goalId, kind, amountMinor, entryDate: '2026-10-25', note: null });
  if (!result.ok) {
    throw new Error('entry setup failed');
  }
}

function text(testID: string): string {
  const children = screen.getByTestId(testID).props.children as unknown;
  return Array.isArray(children) ? children.join('') : String(children);
}

function spokenStage(): string {
  return home().getByTestId('world-scene').props.accessibilityLabel as string;
}

function expectedLayers(stage: Stage): string[] {
  const result = themeManifest('island');
  return result.ok ? visibleLayers(result.manifest, stage).map((layer) => layer.id) : [];
}

// Jest loads no images: fire expo-image's load callback on every mounted layer.
// Home's scene only: since Phase 11 the Collection tab (mounted beside Home) draws souvenir worlds too.
function home() {
  return within(screen.getByTestId('home', { includeHiddenElements: true }));
}

async function loadLayers() {
  for (const node of home().queryAllByTestId(/^world-layer-/, { includeHiddenElements: true })) {
    await act(() => node.props.onLoad({ nativeEvent: {} }));
  }
}

// Layers of the complete stage on screen (mounted and not waiting).
function drawnLayers(): string[] {
  return home()
    .queryAllByTestId(/^world-layer-/, { includeHiddenElements: true })
    .filter((node) => StyleSheet.flatten(node.props.style).opacity !== 0)
    .map((node) => String(node.props.testID).replace('world-layer-', ''));
}

async function renderHome() {
  await renderRouter(APP_DIR, { initialUrl: '/' });
  await fireEvent(home().getByTestId('world-scene-area', { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 300 } },
  });
  await loadLayers();
}

async function depositThroughForm(amount: string) {
  await userEvent.press(screen.getByTestId('home-add-savings'));
  await userEvent.type(screen.getByTestId('entry-amount'), amount);
  await userEvent.press(screen.getByTestId('entry-save'));
  await waitFor(() => expect(screen).toHavePathname('/'));
}

// Lets the app run for `ms` of real time (longer than any transition would take).
async function pass(ms: number) {
  const until = Date.now() + ms;
  await waitFor(() => expect(Date.now()).toBeGreaterThanOrEqual(until), { timeout: ms + 1_000 });
}

function emitAppState(next: AppStateStatus) {
  jest
    .mocked(AppState.addEventListener)
    .mock.calls.filter(([event]) => event === 'change')
    .forEach(([, listener]) => (listener as (state: AppStateStatus) => void)(next));
}

describe('the milestone unlock moment (D73)', () => {
  it('55% → 62%: the amount counts up from the old value, the Island shows the pond with one message, one announcement and one haptic', async () => {
    const goalId = await setupGoal(100_000);
    await seed(goalId, 'deposit', 55_000);
    await renderHome();
    expect(text('home-saved')).toBe('€550.00');
    expect(spokenStage()).toBe('Island world, 5 of 10 milestones unlocked');

    await depositThroughForm('70');
    // Right after the sheet closes the numbers still start from what was shown; VoiceOver already
    // hears the committed amount.
    expect(text('home-saved')).toBe('€550.00');
    expect(screen.getByTestId('home-amount')).toHaveAccessibleName('Saved €620.00 of €1,000.00');
    // The new stage's layers are loading invisibly ahead of the reveal.
    await waitFor(() => expect(screen.queryAllByTestId('world-layer-pond_1', { includeHiddenElements: true })).toHaveLength(1), MOMENT);
    await loadLayers();

    await waitFor(() => expect(screen.getByTestId('unlock-banner')).toBeOnTheScreen(), MOMENT);
    expect(screen.getByTestId('unlock-banner')).toHaveAccessibleName('New milestone unlocked! Pond');
    expect(text('unlock-banner-title')).toBe('New milestone unlocked!');
    expect(text('home-saved')).toBe('€620.00');
    expect(text('home-percent')).toBe('62%');
    expect(spokenStage()).toBe('Island world, 6 of 10 milestones unlocked');
    expect(drawnLayers()).toEqual(expectedLayers(6));
    expect(announce).toHaveBeenCalledWith('New milestone unlocked! Pond.', { queue: true });
    expect(announce.mock.calls.filter(([message]) => /milestone/.test(message))).toHaveLength(1);
    // One action, one haptic: the milestone impact instead of the form's success notification.
    expect(playedHaptics()).toEqual([{ kind: 'impact', style: 'medium' }]);
    // The toast still confirms the saved deposit in words.
    expect(screen.getByText('Deposit saved')).toBeOnTheScreen();

    // A tap dismisses the message; the world stays.
    await userEvent.press(screen.getByTestId('unlock-banner'));
    expect(screen.queryByTestId('unlock-banner')).toBeNull();
    expect(drawnLayers()).toEqual(expectedLayers(6));
  });

  it('a deposit inside one interval only counts the amount and moves the bar: no message, the usual success haptic', async () => {
    const goalId = await setupGoal(100_000);
    await seed(goalId, 'deposit', 55_000);
    await renderHome();
    await depositThroughForm('30');
    await waitFor(() => expect(text('home-saved')).toBe('€580.00'), MOMENT);
    expect(text('home-percent')).toBe('58%');
    expect(screen.queryByTestId('unlock-banner')).toBeNull();
    expect(spokenStage()).toBe('Island world, 5 of 10 milestones unlocked');
    expect(playedHaptics()).toEqual([{ kind: 'notification', type: 'success' }]);
  });

  it('one deposit across several thresholds ends on the final stage with one message', async () => {
    const goalId = await setupGoal(100_000);
    await seed(goalId, 'deposit', 45_000);
    await renderHome();
    await depositThroughForm('200');
    // 45% → 65%: the bridge (50%) and the pond (60%).
    await waitFor(() => expect(screen.queryAllByTestId('world-layer-pond_1', { includeHiddenElements: true })).toHaveLength(1), MOMENT);
    await loadLayers();
    await waitFor(() => expect(screen.getByTestId('unlock-banner')).toHaveAccessibleName('2 milestones unlocked! Bridge and Pond'), MOMENT);
    expect(drawnLayers()).toEqual(expectedLayers(6));
    expect(text('home-saved')).toBe('€650.00');
    expect(playedHaptics()).toEqual([{ kind: 'impact', style: 'medium' }]);
  });

  it('a withdrawal from 100% to 90% settles quietly on stage 9: no message, no milestone haptic', async () => {
    const goalId = await setupGoal(100_000);
    await seed(goalId, 'deposit', 100_000);
    await renderHome();
    expect(drawnLayers()).toEqual(expectedLayers(10));
    await userEvent.press(screen.getByTestId('home-add-savings'));
    await fireEvent(
      screen.container.queryAll((node) => typeof node.type === 'string' && node.props.label === 'Entry type')[0]!,
      'selectionChange',
      { nativeEvent: { selection: 'withdrawal' } },
    );
    await userEvent.type(screen.getByTestId('entry-amount'), '100');
    await userEvent.press(screen.getByTestId('entry-save'));
    await waitFor(() => expect(screen).toHavePathname('/'));
    await waitFor(() => expect(spokenStage()).toBe('Island world, 9 of 10 milestones unlocked'), MOMENT);
    // The completed-island layers fade out and are gone once the transition ends.
    await waitFor(() => expect(drawnLayers()).toEqual(expectedLayers(9)), MOMENT);
    expect(text('home-saved')).toBe('€900.00');
    expect(screen.queryByTestId('unlock-banner')).toBeNull();
    expect(playedHaptics()).toEqual([{ kind: 'notification', type: 'success' }]);
  });

  it('a target edit that raises the stage is quiet too (no message, only the saved-goal haptic)', async () => {
    const goalId = await setupGoal(100_000);
    await seed(goalId, 'deposit', 30_000);
    await renderHome();
    const { state } = useAppDataStore.getState();
    const revision = state.status === 'ready' ? (state.data.goals.goals[0]?.goal.revision ?? 0) : 0;
    const edited = await editGoal(deps(), { operationId: randomUuid(), goalId, expectedRevision: revision, title: 'Boat', targetMinor: 50_000, deadlineDate: null, themeId: 'island' });
    expect(edited.ok).toBe(true);
    await act(() => refreshAppData());
    await waitFor(() => expect(spokenStage()).toBe('Island world, 6 of 10 milestones unlocked'), MOMENT);
    await loadLayers();
    await waitFor(() => expect(drawnLayers()).toEqual(expectedLayers(6)), MOMENT);
    expect(screen.queryByTestId('unlock-banner')).toBeNull();
    expect(playedHaptics()).toEqual([]);
  });
});

describe('the first 100%: the souvenir moment (Phase 11)', () => {
  it('the deposit that first reaches the target says the island is complete and its souvenir is in Collection, with one success haptic', async () => {
    const goalId = await setupGoal(100_000);
    await seed(goalId, 'deposit', 95_000);
    await renderHome();
    await depositThroughForm('50');
    // The count runs first; then the stage 10 layers load and the moment plays.
    await waitFor(() => expect(text('home-saved')).toBe('€1,000.00'), MOMENT);
    await loadLayers();
    await waitFor(() => expect(screen.getByTestId('unlock-banner')).toBeOnTheScreen(), MOMENT);
    expect(screen.getByTestId('unlock-banner')).toHaveAccessibleName('Your island is complete! Its souvenir is now in your Collection.');
    expect(spokenStage()).toBe('Island world, 10 of 10 milestones unlocked');
    expect(announce).toHaveBeenCalledWith('Your island is complete! Its souvenir is now in your Collection.', { queue: true });
    // The souvenir moment and the last unlock are one event: success instead of the milestone impact.
    expect(playedHaptics()).toEqual([{ kind: 'notification', type: 'success' }]);
    // Reaching 100% does not finish the goal.
    const { state } = useAppDataStore.getState();
    expect(state.status === 'ready' && state.data.goals.goals[0]?.goal.status).toBe('active');
    expect(state.status === 'ready' && state.data.goals.souvenirs.map((souvenir) => souvenir.goalId)).toEqual([goalId]);
  });

  it('crossing 100% again after a withdrawal is an ordinary unlock: the milestone message and impact, no second souvenir', async () => {
    const goalId = await setupGoal(100_000);
    await seed(goalId, 'deposit', 100_000);
    await seed(goalId, 'withdrawal', 5_000);
    await renderHome();
    await depositThroughForm('50');
    await loadLayers();
    await waitFor(() => expect(screen.getByTestId('unlock-banner')).toBeOnTheScreen(), MOMENT);
    expect(text('unlock-banner-title')).toBe('New milestone unlocked!');
    expect(playedHaptics()).toEqual([{ kind: 'impact', style: 'medium' }]);
    const { state } = useAppDataStore.getState();
    expect(state.status === 'ready' && state.data.goals.souvenirs).toHaveLength(1);
  });

  it('a lower target that earns the souvenir shows the message quietly, without a haptic from Home', async () => {
    const goalId = await setupGoal(100_000);
    await seed(goalId, 'deposit', 60_000);
    await renderHome();
    const edited = await editGoal(deps(), { operationId: randomUuid(), goalId, expectedRevision: 1, title: 'Boat', targetMinor: 60_000, deadlineDate: null, themeId: 'island' });
    expect(edited.ok).toBe(true);
    await act(() => refreshAppData());
    await loadLayers();
    await waitFor(() => expect(screen.getByTestId('unlock-banner')).toHaveAccessibleName('Your island is complete! Its souvenir is now in your Collection.'), MOMENT);
    expect(playedHaptics()).toEqual([]);
  });

  it('a relaunch with the souvenir already stored shows the complete island without the moment', async () => {
    const goalId = await setupGoal(100_000);
    await seed(goalId, 'deposit', 100_000);
    await renderHome();
    await pass(1_500);
    expect(spokenStage()).toBe('Island world, 10 of 10 milestones unlocked');
    expect(screen.queryByTestId('unlock-banner')).toBeNull();
    expect(playedHaptics()).toEqual([]);
    expect(announce).not.toHaveBeenCalled();
  });
});

describe('Reduce Motion, background and restart', () => {
  it('Reduce Motion: the final values, stage and message at once, with the same announcement and one haptic', async () => {
    setReduceMotionForTests(true);
    const goalId = await setupGoal(100_000);
    await seed(goalId, 'deposit', 55_000);
    await renderHome();
    await depositThroughForm('70');
    expect(text('home-saved')).toBe('€620.00');
    expect(text('home-percent')).toBe('62%');
    expect(spokenStage()).toBe('Island world, 6 of 10 milestones unlocked');
    expect(screen.getByTestId('unlock-banner')).toHaveAccessibleName('New milestone unlocked! Pond');
    expect(announce).toHaveBeenCalledWith('New milestone unlocked! Pond.', { queue: true });
    expect(playedHaptics()).toEqual([{ kind: 'impact', style: 'medium' }]);
    await loadLayers();
    expect(drawnLayers()).toEqual(expectedLayers(6));
  });

  it('going to the background during the moment ends it on the committed stage; resuming replays nothing', async () => {
    const goalId = await setupGoal(100_000);
    await seed(goalId, 'deposit', 75_000);
    await renderHome();
    await seed(goalId, 'deposit', 7_000);
    await act(() => refreshAppData());
    // Still waiting to start: background now.
    await act(async () => emitAppState('background'));
    expect(spokenStage()).toBe('Island world, 8 of 10 milestones unlocked');
    expect(text('home-saved')).toBe('€820.00');
    await loadLayers();
    // The small house was replaced, not kept: removed layers never come back.
    expect(drawnLayers()).toEqual(expectedLayers(8));
    expect(drawnLayers()).not.toContain('small_house_1');
    await act(async () => emitAppState('active'));
    await pass(2_000);
    expect(screen.queryByTestId('unlock-banner')).toBeNull();
    expect(playedHaptics()).toEqual([]);
    expect(announce).not.toHaveBeenCalled();
    expect(drawnLayers()).toEqual(expectedLayers(8));
  });

  it('after a restart Home opens directly on the saved stage, without replaying the deposit', async () => {
    const goalId = await setupGoal(100_000);
    await seed(goalId, 'deposit', 62_000);
    await renderHome();
    await resetAppDatabaseForTests();
    await useDatabaseStore.getState().open();
    await act(() => refreshAppData());
    await renderHome();
    expect(text('home-saved')).toBe('€620.00');
    expect(spokenStage()).toBe('Island world, 6 of 10 milestones unlocked');
    await pass(1_500);
    expect(screen.queryByTestId('unlock-banner')).toBeNull();
    expect(playedHaptics()).toEqual([]);
  });
});

describe('animated empty states (D69)', () => {
  it('the empty Home Island floats with sparkles, decorative and hidden from VoiceOver; Reduce Motion stills it', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });
    const picture = screen.getByTestId('home-empty-picture', { includeHiddenElements: true });
    expect(picture.props.accessibilityElementsHidden).toBe(true);
    expect(screen.queryByTestId('home-empty-picture')).toBeNull();
    expect(screen.getByTestId('home-empty-sparkles', { includeHiddenElements: true }).children.length).toBeGreaterThan(0);
    await act(async () => setReduceMotionForTests(true));
    expect(screen.getByTestId('home-empty-sparkles', { includeHiddenElements: true }).children).toHaveLength(0);
  });
});
