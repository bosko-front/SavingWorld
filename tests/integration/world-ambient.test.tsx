import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { getAnimatedStyle } from 'react-native-reanimated';

import { type Stage } from '@/core/progression';
import { ambientKindOn, AMBIENT_RELEASE_SWITCHES, resetAmbientSwitches, setAmbientSwitches } from '@/features/worlds/ambient';
import { visibleLayers, type SceneLayer } from '@/features/worlds/manifest';
import { AMBIENT_PRESETS } from '@/features/worlds/theme-export';
import { themeManifest } from '@/features/worlds/registry';
import { WorldScene } from '@/features/worlds/world-scene';
import { layerMotion, WORLD_MOTION, type SceneReveal } from '@/features/worlds/world-transition';

// Phase 10.5 Living Island (D90) on the real WorldScene with Reanimated's Jest timers: ambient values
// rest at 0 while the gate is closed, move while it is open, return to rest at once when it closes and
// start again from rest; the switches turn every effect or one effect off; a tree revealed by an unlock
// sways only after its pop; the scene still ends on the committed stage. Smoothness, energy and the
// look of the motion are simulator/device checks (evidence/PHASE_10_5.md, Phase 21).

jest.useFakeTimers();
// Reanimated steps every frame of the simulated time, which is slow on a busy machine.
jest.setTimeout(120_000);

// Reanimated's Jest helper; its published type is the web build's no-argument stub.
const animatedStyle = getAnimatedStyle as unknown as (node: ReturnType<typeof screen.getByTestId>) => { opacity?: number; transform?: Record<string, number | string>[] };

afterEach(() => {
  resetAmbientSwitches();
});

function manifest() {
  const result = themeManifest('island');
  if (!result.ok) {
    throw new Error('island manifest invalid');
  }
  return result.manifest;
}

function layersOfKind(kind: 'cloud' | 'water' | 'sway', stage: Stage = 10): SceneLayer[] {
  return visibleLayers(manifest(), stage).filter((layer) => layer.ambient?.kind === kind);
}

// The ambient value of a layer as drawn: cloud drift (pt), water opacity, tree lean (degrees of skew).
function ambientValue(layer: SceneLayer): number {
  const style = animatedStyle(screen.getByTestId(`world-ambient-${layer.id}`, { includeHiddenElements: true }));
  switch (layer.ambient!.kind) {
    case 'water':
      return style.opacity ?? 0;
    case 'cloud':
      return Number(style.transform?.[0]?.translateX ?? 0);
    case 'sway':
      return Number.parseFloat(String(style.transform?.[0]?.skewX ?? '0deg'));
  }
}

async function measure() {
  await fireEvent(screen.getByTestId('world-scene-area', { includeHiddenElements: true }), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 300 } } });
}

async function loadAll() {
  for (const node of screen.queryAllByTestId(/^world-layer-/, { includeHiddenElements: true })) {
    await act(() => node.props.onLoad({ nativeEvent: {} }));
  }
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

function drawn(): string[] {
  return screen.queryAllByTestId(/^world-layer-/, { includeHiddenElements: true }).map((node) => String(node.props.testID).replace('world-layer-', ''));
}

// Every drawn ambient layer at its rest pose: the approved, still picture. `tolerance` allows the
// first frame of a start, which leaves rest smoothly.
function expectAtRest(stage: Stage, tolerance = 0) {
  const ids = drawn();
  for (const layer of visibleLayers(manifest(), stage).filter((candidate) => candidate.ambient && ids.includes(candidate.id))) {
    expect({ id: layer.id, atRest: Math.abs(ambientValue(layer)) <= tolerance }).toEqual({ id: layer.id, atRest: true });
  }
}

// Layers drawn and not faded out (a replaced cabin stays mounted at opacity 0 after its crossfade).
function opaque(): string[] {
  return drawn().filter((id) => animatedStyle(screen.getByTestId(`world-box-${id}`, { includeHiddenElements: true })).opacity !== 0);
}

// Advances in steps and records whether every listed layer left its rest pose at some point.
async function movedWithin(layers: SceneLayer[], ms: number): Promise<Set<string>> {
  const moved = new Set<string>();
  for (let t = 0; t < ms; t += 500) {
    await advance(500);
    for (const layer of layers) {
      if (Math.abs(ambientValue(layer)) > 1e-6) {
        moved.add(layer.id);
      }
    }
  }
  return moved;
}

async function showStage(stage: Stage, ambient: boolean) {
  await render(<WorldScene themeId="island" stage={stage} ambient={ambient} />);
  await measure();
  await loadAll();
}

describe('Living Island gate', () => {
  it('stays exactly at rest while the gate is closed (another screen, background, Reduce Motion)', async () => {
    await showStage(10, false);
    await advance(20_000);
    expectAtRest(10);
  });

  it('moves clouds, water and trees while the gate is open, within their small ranges', async () => {
    await showStage(10, true);
    const all = [...layersOfKind('cloud'), ...layersOfKind('water'), ...layersOfKind('sway')];
    // The slowest start is cloud_2's phase delay (0.62 of 28 s).
    const moved = await movedWithin(all, 20_000);
    expect([...moved].sort()).toEqual(all.map((layer) => layer.id).sort());
    for (const layer of all) {
      const limit = layer.ambient!.kind === 'cloud' ? AMBIENT_PRESETS.cloud.amplitude * (400 / 1664) + 1e-6 : Math.abs(layer.ambient!.amplitude) + 1e-6;
      expect({ id: layer.id, within: Math.abs(ambientValue(layer)) <= limit }).toEqual({ id: layer.id, within: true });
    }
  });

  it('returns every value to rest at once when the gate closes, and starts again from rest', async () => {
    await showStage(10, true);
    await advance(8_000);
    expect(layersOfKind('sway').some((layer) => ambientValue(layer) !== 0)).toBe(true);
    await act(() => screen.rerender(<WorldScene themeId="island" stage={10} ambient={false} />));
    expectAtRest(10);
    await advance(5_000);
    expectAtRest(10);
    // Open again: the first frame is still (almost exactly) the rest pose, no jump, then it moves.
    await act(() => screen.rerender(<WorldScene themeId="island" stage={10} ambient />));
    expectAtRest(10, 0.01);
    const moved = await movedWithin(layersOfKind('sway'), 10_000);
    expect(moved.size).toBe(layersOfKind('sway').length);
  });
});

describe('Living Island switches', () => {
  it('the global switch gives the static Island: nothing moves and the water layers are not drawn', async () => {
    setAmbientSwitches({ ...AMBIENT_RELEASE_SWITCHES, enabled: false });
    await showStage(10, true);
    await advance(20_000);
    expectAtRest(10);
    const water = layersOfKind('water').map((layer) => layer.id);
    expect(drawn().filter((id) => water.includes(id))).toEqual([]);
    // Everything else is the approved stack, in order.
    expect(drawn()).toEqual(visibleLayers(manifest(), 10).map((layer) => layer.id).filter((id) => !water.includes(id)));
  });

  it('one effect off leaves the others moving', async () => {
    setAmbientSwitches({ ...AMBIENT_RELEASE_SWITCHES, clouds: false });
    await showStage(10, true);
    const moved = await movedWithin([...layersOfKind('cloud'), ...layersOfKind('sway')], 10_000);
    expect(layersOfKind('cloud').filter((layer) => moved.has(layer.id))).toEqual([]);
    expect(layersOfKind('sway').every((layer) => moved.has(layer.id))).toBe(true);
  });

  it('maps each kind to its switch', () => {
    const off = (key: 'clouds' | 'water' | 'trees') => ({ ...AMBIENT_RELEASE_SWITCHES, [key]: false });
    expect(ambientKindOn(AMBIENT_RELEASE_SWITCHES, 'cloud')).toBe(true);
    expect(ambientKindOn(off('clouds'), 'cloud')).toBe(false);
    expect(ambientKindOn(off('water'), 'water')).toBe(false);
    expect(ambientKindOn(off('trees'), 'sway')).toBe(false);
    expect(ambientKindOn(off('trees'), 'cloud')).toBe(true);
    expect(ambientKindOn({ ...AMBIENT_RELEASE_SWITCHES, enabled: false }, 'water')).toBe(false);
  });
});

describe('Living Island with the unlock moment (Phase 10)', () => {
  it('a tree revealed at 70% pops first and sways only after its pop; the scene ends on the committed stage', async () => {
    await showStage(6, true);
    const reveal: SceneReveal = { revision: 1, mode: 'unlock' };
    await act(() => screen.rerender(<WorldScene themeId="island" stage={7} ambient reveal={reveal} />));
    await loadAll();
    const newTrees = layersOfKind('sway', 7).filter((layer) => layer.id.startsWith('more_trees'));
    expect(newTrees).toHaveLength(8);
    // Until its own pop has ended (its stagger delay plus one pop), each new tree stays upright.
    const entrances = layerMotion(manifest(), 6, 7, 'unlock').entrances;
    const popEnd = (tree: SceneLayer) => (entrances.get(tree.id)?.delayMs ?? 0) + WORLD_MOTION.popMs;
    const last = Math.max(...newTrees.map(popEnd));
    for (let t = 100; t < last; t += 100) {
      await advance(100);
      for (const tree of newTrees.filter((candidate) => t < popEnd(candidate))) {
        expect({ id: tree.id, t, lean: ambientValue(tree) }).toEqual({ id: tree.id, t, lean: 0 });
      }
    }
    const moved = await movedWithin(newTrees, 10_000);
    expect(moved.size).toBe(newTrees.length);
    // Rapid change on: the scene settles on the committed stage, then the gate closes and all rests.
    await act(() => screen.rerender(<WorldScene themeId="island" stage={8} ambient reveal={{ revision: 2, mode: 'unlock' }} />));
    await loadAll();
    await advance(3_000);
    expect(opaque()).toEqual(visibleLayers(manifest(), 8).map((layer) => layer.id));
    await act(() => screen.rerender(<WorldScene themeId="island" stage={8} ambient={false} />));
    expectAtRest(8);
  });
});
