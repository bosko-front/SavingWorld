import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { StyleSheet } from 'react-native';

import { refreshAppData, setAppClockForTests, useAppDataStore } from '@/bootstrap/app-data';
import { getAppDatabase, resetAppDatabaseForTests, setAppDatabaseDriverForTests, useDatabaseStore } from '@/bootstrap/database-readiness';
import { capabilitiesFor } from '@/core/access';
import { systemClock, type Clock } from '@/core/calendar';
import { type Stage } from '@/core/progression';
import { randomUuid, uuidGenerator } from '@/data/ids';
import { createGoal } from '@/features/goals/application/goal-commands';
import { createEntry } from '@/features/ledger/application/ledger-commands';
import { sceneViewport, visibleLayers, type ManifestResult } from '@/features/worlds/manifest';
import { themeManifest } from '@/features/worlds/registry';
import { WorldScene } from '@/features/worlds/world-scene';
import { SceneInsetsContext } from '@/shared/layout/scene-insets';
import { colors } from '@/shared/theme';

import { APP_DIR, chooseCurrency, resetApp } from '../support/app-fixture';
import { createNodeSqliteDriver, temporaryDirectory } from '../support/node-sqlite-driver';

// Phase 09 renderer (Jest): the layers drawn at each stage, placed from the manifest into the
// measured box, the scene-only fallback for a broken manifest, a failed image or a throwing layer,
// and Home showing the stage the ledger gives, including regression and the same stage after a
// restart. Native drawing, alignment and memory are simulator/device checks (evidence/PHASE_09.md).

const zone = systemClock.timeZone();
let instant = new Date(2026, 9, 25, 12, 0).getTime();
const testClock: Clock = { nowMs: () => (instant += 1), timeZone: () => zone };

function shownLayers(): string[] {
  return screen.queryAllByTestId(/^world-layer-/, { includeHiddenElements: true }).map((node) => String(node.props.testID).replace('world-layer-', ''));
}

function expectedLayers(stage: Stage): string[] {
  const result = themeManifest('island');
  return result.ok ? visibleLayers(result.manifest, stage).map((layer) => layer.id) : [];
}

// Fires expo-image's load callback on every mounted layer (Jest has no native image loading), or
// on the layers given.
async function load(ids?: string[]) {
  for (const node of screen.queryAllByTestId(/^world-layer-/, { includeHiddenElements: true })) {
    const id = String(node.props.testID).replace('world-layer-', '');
    if (!ids || ids.includes(id)) {
      await act(() => node.props.onLoad({ nativeEvent: {} }));
    }
  }
}

// Layers drawn on screen: mounted and not waiting for the rest of their stage.
function visible(): string[] {
  return screen
    .queryAllByTestId(/^world-layer-/, { includeHiddenElements: true })
    .filter((node) => StyleSheet.flatten(node.props.style).opacity !== 0)
    .map((node) => String(node.props.testID).replace('world-layer-', ''));
}

async function measure(width: number, height: number) {
  await fireEvent(screen.getByTestId('world-scene-area', { includeHiddenElements: true }), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height } } });
}

describe('WorldScene', () => {
  it('draws nothing until measured, then the stage’s layers at their canvas positions in a 4:3 box', async () => {
    await render(<WorldScene themeId="island" stage={4} />);
    expect(shownLayers()).toEqual([]);
    // A wide region: the box takes the art's aspect (1664 / 1384) and is limited by the height.
    await measure(500, 300);
    const width = Math.round(300 * (1664 / 1384));
    expect(screen.getByTestId('world-scene')).toHaveStyle({ width, height: 300, borderRadius: 24 });
    expect(shownLayers()).toEqual(expectedLayers(4));
    // The box shows the art's viewport (every stage's layers plus 12 canvas units), not the whole
    // canvas. first_tree_1 (the tree itself since Phase 10.5) is at (796, 44), 320 × 280.
    const result = themeManifest('island');
    if (!result.ok) throw new Error('island invalid');
    const viewport = sceneViewport(result.manifest, 12);
    const scale = width / viewport.width;
    expect(screen.getByTestId('world-box-first_tree_1')).toHaveStyle({
      position: 'absolute',
      left: (796 - viewport.x) * scale,
      top: (44 - viewport.y) * scale,
      width: 320 * scale,
      height: 280 * scale,
    });
  });

  it('shows a stage only when every one of its layers has loaded: never piece by piece', async () => {
    await render(<WorldScene themeId="island" stage={4} />);
    await measure(400, 300);
    expect(visible()).toEqual([]);
    const [last, ...rest] = [...expectedLayers(4)].reverse();
    await load(rest);
    expect(visible()).toEqual([]);
    await load([last!]);
    expect(visible()).toEqual(expectedLayers(4));
  });

  it('a new stage waits invisibly while the previous complete stage stays; then it replaces it at once', async () => {
    const { rerender } = await render(<WorldScene themeId="island" stage={4} />);
    await measure(400, 300);
    await load();
    await rerender(<WorldScene themeId="island" stage={8} />);
    // Still the complete stage 4 (with the cabin); the stage 5-8 layers are mounted but hidden.
    expect(visible()).toEqual(expectedLayers(4));
    expect(shownLayers()).toEqual(expect.arrayContaining(['larger_house_1', 'small_house_1']));
    await load();
    expect(visible()).toEqual(expectedLayers(8));
    expect(shownLayers()).not.toContain('small_house_1');
    // Back to 7: the cabin remounts and has to load again before stage 7 shows.
    await rerender(<WorldScene themeId="island" stage={7} />);
    expect(visible()).toEqual(expectedLayers(8));
    await load(['small_house_1', 'small_house_2']);
    expect(visible()).toEqual(expectedLayers(7));
  });

  it('fill (Home, D80): the sky fills the whole region with no frame; the art sits inside the scene insets', async () => {
    await render(
      <SceneInsetsContext.Provider value={{ top: 68, right: 16, bottom: 0, left: 16 }}>
        <WorldScene themeId="island" stage={2} fill />
      </SceneInsetsContext.Provider>,
    );
    const region = screen.getByTestId('world-scene-region');
    expect(StyleSheet.flatten(region.props.style)).toMatchObject({
      paddingTop: 68,
      paddingLeft: 16,
      paddingRight: 16,
      backgroundImage: `linear-gradient(to bottom, ${colors.sceneSkyTop}, ${colors.sceneSkyBottom})`,
    });
    await fireEvent(screen.getByTestId('world-scene-area'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 343, height: 286 } } });
    const scene = StyleSheet.flatten(screen.getByTestId('world-scene').props.style);
    expect(scene.borderRadius).toBeUndefined();
    expect(scene.backgroundImage).toBeUndefined();
    expect(scene).toMatchObject({ width: 343, height: Math.round(343 / (1664 / 1384)) });
  });

  it('draws Home’s soft sky gradient behind the art by default (D79)', async () => {
    await render(<WorldScene themeId="island" stage={0} />);
    await measure(400, 300);
    expect(StyleSheet.flatten(screen.getByTestId('world-scene').props.style).backgroundImage).toBe(
      `linear-gradient(to bottom, ${colors.sceneSkyTop}, ${colors.sceneSkyBottom})`,
    );
  });

  it('is one labelled image with the stage description; its layers are hidden from VoiceOver', async () => {
    await render(<WorldScene themeId="island" stage={4} />);
    await measure(400, 300);
    const scene = screen.getByTestId('world-scene');
    expect(scene).toHaveAccessibleName('Island world, 4 of 10 milestones unlocked');
    expect(scene.props.accessibilityValue).toEqual({ text: 'A small wooden cabin stands on the upper terrace.' });
    expect(scene.props.accessibilityRole).toBe('image');
    expect(screen.getByTestId('world-layer-empty_island').props.accessible).toBe(false);
  });

  it('a relayout (Duo unfold) rescales the same stage without changing it', async () => {
    await render(<WorldScene themeId="island" stage={8} />);
    await measure(343, 257);
    const before = shownLayers();
    await measure(640, 480);
    expect(shownLayers()).toEqual(before);
    expect(screen.getByTestId('world-scene')).toHaveStyle({ width: Math.round(480 * (1664 / 1384)), height: 480 });
    expect(before).not.toContain('small_house_1');
    expect(before).toContain('larger_house_1');
  });

  it('an invalid manifest shows the fallback inside the region, with the stage still spoken', async () => {
    const broken: ManifestResult = { ok: false, problems: ['expected 10 unlocks, got 9'] };
    await render(<WorldScene themeId="island" stage={3} manifest={broken} />);
    await measure(400, 300);
    expect(shownLayers()).toEqual([]);
    expect(screen.getByTestId('world-scene-fallback')).toHaveTextContent(/Your world can’t be shown right now/);
    expect(screen.getByTestId('world-scene')).toHaveAccessibleName('Island world can’t be shown, 3 of 10 milestones unlocked');
    // Nothing to retry: the bundled data itself is wrong.
    expect(screen.queryByTestId('world-scene-retry')).toBeNull();
  });

  it('a layer that fails to load shows the fallback; Try again draws the art again', async () => {
    await render(<WorldScene themeId="island" stage={5} />);
    await measure(400, 300);
    await act(() => screen.getByTestId('world-layer-bridge_1').props.onError({ nativeEvent: { error: 'decode failed' } }));
    expect(shownLayers()).toEqual([]);
    expect(screen.getByTestId('world-scene-fallback')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('world-scene-retry'));
    expect(shownLayers()).toEqual(expectedLayers(5));
  });

  it('a layer that throws while rendering is contained by the scene', async () => {
    const result = themeManifest('island');
    if (!result.ok) throw new Error('island invalid');
    // An asset entry that throws when the layer reads it during render.
    const assets = { ...result.manifest.assets };
    Object.defineProperty(assets, 'island_s01_p1.png', {
      enumerable: true,
      get() {
        throw new Error('asset lookup failed');
      },
    });
    const throwing = { ok: true as const, manifest: { ...result.manifest, assets } };
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await render(<WorldScene themeId="island" stage={1} manifest={throwing} />);
    await measure(400, 300);
    expect(screen.getByTestId('world-scene-fallback')).toBeOnTheScreen();
    warn.mockRestore();
    error.mockRestore();
  });

  it('decorative: not an accessibility element (the empty state’s text says what it is)', async () => {
    await render(<WorldScene themeId="island" stage={0} decorative backdrop="none" />);
    await measure(320, 240);
    expect(screen.getByTestId('world-scene', { includeHiddenElements: true }).props.accessible).toBe(false);
    expect(shownLayers()).toEqual(expectedLayers(0));
  });
});

describe('Home shows the ledger’s stage', () => {
  let directory = '';

  async function openDatabase() {
    setAppDatabaseDriverForTests(createNodeSqliteDriver(directory));
    await useDatabaseStore.getState().open();
  }

  function deps() {
    return { db: getAppDatabase(), clock: testClock, ids: uuidGenerator, capabilities: capabilitiesFor('free') };
  }

  async function entry(goalId: string, kind: 'deposit' | 'withdrawal', amountMinor: number) {
    const result = await createEntry(deps(), { operationId: randomUuid(), goalId, kind, amountMinor, entryDate: '2026-10-25', note: null });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
  }

  function callout(): string {
    return screen.getByTestId('home-next-milestone').props.accessibilityLabel as string;
  }

  beforeAll(() => setAppClockForTests(testClock));
  afterAll(async () => {
    setAppClockForTests(systemClock);
    await resetApp();
  });

  beforeEach(async () => {
    await resetApp();
    directory = temporaryDirectory('world-scene');
    await openDatabase();
    await chooseCurrency('EUR');
  });

  it('deposit, withdrawal and a restart: the scene follows the current balance and stays after reopening', async () => {
    const created = await createGoal(deps(), { operationId: randomUuid(), title: 'Bike', targetMinor: 150_000, deadlineDate: null, themeId: 'island' });
    if (!created.ok) throw new Error('goal');
    const { goalId } = created.value;
    await entry(goalId, 'deposit', 60_000);
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await measure(343, 257);
    // €600 of €1,500 is 40%: the small house.
    expect(shownLayers()).toEqual(expectedLayers(4));
    expect(callout()).toBe('Next: Bridge. €150.00 more to reach 50%');

    // A withdrawal to €500 (33%) settles on stage 3; the cabin goes, nothing else changes.
    await entry(goalId, 'withdrawal', 10_000);
    await act(() => refreshAppData());
    expect(shownLayers()).toEqual(expectedLayers(3));
    expect(callout()).toBe('Next: Small house. €100.00 more to reach 40%');

    // Restart: close the database and open the same file again; the stage is derived again.
    screen.unmount();
    await resetAppDatabaseForTests();
    useAppDataStore.setState({ state: { status: 'idle' } });
    await openDatabase();
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await measure(343, 257);
    expect(shownLayers()).toEqual(expectedLayers(3));

    // 125%: the complete island and no next milestone; the overfunding stays numeric.
    await entry(goalId, 'deposit', 137_500);
    await act(() => refreshAppData());
    expect(shownLayers()).toEqual(expectedLayers(10));
    expect(callout()).toBe('Your island is complete! You’ve unlocked every part of your world.');
    expect(screen.getByTestId('home-remaining')).toHaveTextContent('€375.00 over target');
  });

  it('with no goal, Home’s empty state shows the empty island as a picture', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });
    // Decorative: inside the floating empty-state picture, hidden from VoiceOver (Phase 10, D69).
    expect(screen.getByTestId('home-empty-world', { includeHiddenElements: true })).toBeOnTheScreen();
    await measure(320, 240);
    expect(shownLayers()).toEqual(expectedLayers(0));
    expect(screen.getByTestId('world-scene', { includeHiddenElements: true }).props.accessible).toBe(false);
  });
});
