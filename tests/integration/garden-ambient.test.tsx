import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { getAnimatedStyle } from 'react-native-reanimated';

import { type Stage } from '@/core/progression';
import { AMBIENT_RELEASE_SWITCHES, resetAmbientSwitches, setAmbientSwitches } from '@/features/worlds/ambient';
import { AMBIENT_REST, visibleLayers, type AmbientKind, type SceneLayer } from '@/features/worlds/manifest';
import { themeManifest } from '@/features/worlds/registry';
import { AMBIENT_EVENT_MS, WorldScene } from '@/features/worlds/world-scene';

// Phase 17 Garden motion (D124, D90) on the real WorldScene with Reanimated's Jest timers: every kind
// rests at 0 (koi where the render shows them; water, glows, butterflies and petals unseen), moves
// only while the gate is open, returns to rest at once when it closes, appears only from its milestone,
// and can be switched off per kind (an unseen kind is then not drawn at all). Butterflies fly one at a
// time and a petal falls one at a time. The look of the motion is a simulator check, frames and energy
// a Phase 21 physical-iPhone check (evidence/PHASE_17.md).

jest.useFakeTimers();
jest.setTimeout(180_000);

type Style = { opacity?: number; transform?: Record<string, number | string>[] };
const animatedStyle = getAnimatedStyle as unknown as (node: ReturnType<typeof screen.getByTestId>) => Style;

afterEach(() => {
  resetAmbientSwitches();
});

function manifest() {
  const result = themeManifest('garden');
  if (!result.ok) {
    throw new Error('garden manifest invalid');
  }
  return result.manifest;
}

function layersOfKind(kind: AmbientKind, stage: Stage = 10): SceneLayer[] {
  return visibleLayers(manifest(), stage).filter((layer) => layer.ambient?.kind === kind);
}

function styleOf(layer: SceneLayer): Style {
  return animatedStyle(screen.getByTestId(`world-ambient-${layer.id}`, { includeHiddenElements: true }));
}

function transformValue(style: Style, key: string): number {
  const entry = style.transform?.find((item) => key in item);
  return entry ? Number.parseFloat(String(entry[key])) : 0;
}

// How far a layer is from its rest pose: its opacity for unseen kinds, its offset for the others.
function departure(layer: SceneLayer): number {
  const style = styleOf(layer);
  switch (layer.ambient!.kind) {
    case 'koi':
      return Math.hypot(transformValue(style, 'translateX'), transformValue(style, 'translateY'));
    case 'cloud':
      return Math.abs(transformValue(style, 'translateX'));
    case 'sway':
      return Math.abs(transformValue(style, 'skewX'));
    default:
      return style.opacity ?? 0;
  }
}

async function showStage(stage: Stage, ambient: boolean) {
  await render(<WorldScene themeId="garden" stage={stage} ambient={ambient} />);
  await fireEvent(screen.getByTestId('world-scene-area', { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 300 } },
  });
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

const MOVING: AmbientKind[] = ['koi', 'glow', 'water', 'butterfly', 'petal'];

function expectAtRest(stage: Stage) {
  for (const layer of visibleLayers(manifest(), stage).filter((candidate) => candidate.ambient && drawn().includes(candidate.id))) {
    expect({ id: layer.id, departure: departure(layer) }).toEqual({ id: layer.id, departure: 0 });
  }
}

describe('Garden motion gate', () => {
  it('stays exactly at rest while the gate is closed: the still stack is the approved picture', async () => {
    await showStage(10, false);
    await advance(60_000);
    expectAtRest(10);
  });

  it('moves koi, glows, water, butterflies and petals while the gate is open, within their ranges', async () => {
    await showStage(10, true);
    const scale = 400 / 1696;
    const moved = new Set<string>();
    let butterfliesAtOnce = 0;
    let petalsAtOnce = 0;
    for (let t = 0; t < 60_000; t += 250) {
      await advance(250);
      for (const kind of MOVING) {
        for (const layer of layersOfKind(kind)) {
          const value = departure(layer);
          if (value > 1e-6) {
            moved.add(layer.id);
          }
          const limit = kind === 'koi' ? 60 * scale : 1;
          expect({ id: layer.id, within: value <= limit + 1e-6 }).toEqual({ id: layer.id, within: true });
        }
      }
      butterfliesAtOnce = Math.max(butterfliesAtOnce, layersOfKind('butterfly').filter((layer) => departure(layer) > 0).length);
      petalsAtOnce = Math.max(petalsAtOnce, layersOfKind('petal').filter((layer) => departure(layer) > 0).length);
    }
    expect([...moved].sort()).toEqual(MOVING.flatMap((kind) => layersOfKind(kind).map((layer) => layer.id)).sort());
    // One butterfly and one petal in the air at a time.
    expect([butterfliesAtOnce, petalsAtOnce]).toEqual([1, 1]);
  });

  it('a glow warms and then breathes below its warmest, never back to dark while it runs (no pulse)', async () => {
    await showStage(8, true);
    const glow = layersOfKind('glow', 8).find((layer) => layer.id === 'glow_lantern_1')!;
    await advance(glow.ambient!.periodMs);
    const seen: number[] = [];
    for (let t = 0; t < glow.ambient!.periodMs * 2; t += 250) {
      await advance(250);
      seen.push(departure(glow));
    }
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(glow.ambient!.amplitude * 0.7 - 1e-3);
    expect(Math.max(...seen)).toBeLessThanOrEqual(glow.ambient!.amplitude + 1e-6);
  });

  it('a butterfly flight and a petal fall are short and end unseen where they rest', async () => {
    await showStage(10, true);
    const butterfly = layersOfKind('butterfly')[0]!;
    // Lead, then one flight; afterwards it rests unseen until its next turn.
    await advance(1_500 + AMBIENT_EVENT_MS.butterfly / 2);
    expect(departure(butterfly)).toBeGreaterThan(0);
    await advance(AMBIENT_EVENT_MS.butterfly / 2 + 500);
    expect(departure(butterfly)).toBe(0);
    expect(transformValue(styleOf(butterfly), 'translateX')).toBe(0);
  });

  it('returns every value to rest at once when the gate closes', async () => {
    await showStage(10, true);
    await advance(7_000);
    await act(() => screen.rerender(<WorldScene themeId="garden" stage={10} ambient={false} />));
    expectAtRest(10);
    await advance(10_000);
    expectAtRest(10);
  });
});

describe('Garden motion milestones and switches', () => {
  it('draws each kind only from its milestone: butterflies 30%, petals 40%, water and koi 60%, glows 70% and 80%', async () => {
    const kindsAt = (stage: Stage) => [...new Set(visibleLayers(manifest(), stage).flatMap((layer) => (layer.ambient ? [layer.ambient.kind] : [])))].sort();
    expect(kindsAt(2)).toEqual(['cloud']);
    expect(kindsAt(3)).toEqual(['butterfly', 'cloud']);
    expect(kindsAt(4)).toEqual(['butterfly', 'cloud', 'petal', 'sway']);
    expect(kindsAt(6)).toEqual(['butterfly', 'cloud', 'koi', 'petal', 'sway', 'water']);
    expect(kindsAt(7)).toEqual(['butterfly', 'cloud', 'glow', 'koi', 'petal', 'sway', 'water']);
    await showStage(5, true);
    expect(drawn().filter((id) => /^(koi|water|glow)/.test(id))).toEqual([]);
  });

  it('with every effect off the scene is the still stack: koi drawn and still, unseen kinds not drawn', async () => {
    setAmbientSwitches({ ...AMBIENT_RELEASE_SWITCHES, enabled: false });
    await showStage(10, true);
    await advance(30_000);
    expectAtRest(10);
    const still = visibleLayers(manifest(), 10)
      .filter((layer) => !layer.ambient || AMBIENT_REST[layer.ambient.kind] === 'visible')
      .map((layer) => layer.id);
    expect(drawn()).toEqual(still);
    expect(still).toEqual(expect.arrayContaining(['koi_1', 'koi_2']));
  });

  it('one Garden effect off leaves the others moving; its unseen layers are not drawn', async () => {
    setAmbientSwitches({ ...AMBIENT_RELEASE_SWITCHES, glows: false, koi: false });
    await showStage(10, true);
    expect(drawn().filter((id) => id.startsWith('glow_'))).toEqual([]);
    const moved = new Set<string>();
    for (let t = 0; t < 30_000; t += 500) {
      await advance(500);
      for (const layer of [...layersOfKind('koi'), ...layersOfKind('water'), ...layersOfKind('sway')]) {
        if (departure(layer) > 1e-6) {
          moved.add(layer.id);
        }
      }
    }
    expect(layersOfKind('koi').filter((layer) => moved.has(layer.id))).toEqual([]);
    expect(layersOfKind('water').every((layer) => moved.has(layer.id))).toBe(true);
    expect(layersOfKind('sway').every((layer) => moved.has(layer.id))).toBe(true);
  });
});
