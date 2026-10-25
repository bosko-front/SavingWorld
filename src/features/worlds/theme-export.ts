import type { ThemeId } from '@/core/progression';

import { validateManifest, type AmbientKind, type AmbientMark, type ManifestResult, type Milestone, type Point, type SceneAsset, type SceneLayer, type SceneUnlock } from './manifest';

// Reads a layered art export (`island_manifest.json` from assets/worlds/island/scripts/export_layers.py,
// copied unchanged to assets/themes/<theme>/) into the typed manifest, then validates it. The JSON
// is treated as untrusted input: a re-export with a changed shape gives a list of problems and the
// scene fallback, never a crash.
//
// Mapping from the export: canvas → canvas; base (one image) → base.layers[0]; unlocks[i].layers →
// adds; `hides` (unlock ids) → removes, the layers of those unlocks, and the hidden unlock's
// `hiddenFromMilestone` must name the same milestone; z = the stacking order of the export (base,
// then milestone 1..10, parts in order).
//
// Ambient motion (Phase 10.5, D90): `ambient` (a list of cloud and water layers) → base.layers after
// the base image, z 1..n, always drawn below every unlock; a part's `ambient: { kind: 'sway', pivot }`
// → its mark. The export says only what a layer is; how it moves (amplitude, period, phase) comes
// from AMBIENT_PRESETS here, varied per layer so nothing moves in step.

type ExportOptions = {
  themeId: ThemeId;
  name: string;
  assets: Readonly<Record<string, SceneAsset>>;
};

// Room for parts per milestone in the z numbering; validated below.
const Z_STRIDE = 1000;

// How each kind of ambient layer moves (D90: calm, fine at 30 fps). Cloud amplitude is in canvas units
// (90 ≈ 22 pt on an iPhone Home); water is each flow layer's brightest opacity, and its period one full
// round of the flow layers (they share it, evenly out of phase, D93); sway is the largest lean in degrees
// (a skew from the trunk base). Tuned on the simulator with the owner, who found 0.7° and then 2.5° of
// tilt and the water sparkle too faint (D92, D93); the World inspector switches them off.
export const AMBIENT_PRESETS: Record<AmbientKind, { amplitude: number; periodMs: number }> = {
  cloud: { amplitude: 90, periodMs: 24000 },
  water: { amplitude: 1, periodMs: 2400 },
  sway: { amplitude: 5, periodMs: 4400 },
};

// Per-layer spread of the period, and a golden-ratio phase step, so clouds and trees drift apart. The
// water layers are one flow: same period, phases evenly spread in their export order (downstream).
const PERIOD_SPREAD = [1, 1.17, 0.88, 1.09, 0.94, 1.23, 0.83, 1.05, 0.97, 1.13];
const PHASE_STEP = 0.618034;

const AMBIENT_KINDS: readonly AmbientKind[] = ['cloud', 'water', 'sway'];

export function manifestFromExport(raw: unknown, { themeId, name, assets }: ExportOptions): ManifestResult {
  const problems: string[] = [];
  const read = new Reader(problems);
  const root = read.object(raw, 'manifest');
  if (!root) {
    return { ok: false, problems };
  }
  if (read.string(root.themeId, 'themeId') !== themeId) {
    problems.push(`themeId must be ${themeId}`);
  }
  const canvasRaw = read.object(root.canvas, 'canvas');
  const canvas = { width: read.number(canvasRaw?.width, 'canvas.width'), height: read.number(canvasRaw?.height, 'canvas.height') };

  const baseRaw = read.object(root.base, 'base');
  const baseBox = read.box(baseRaw, 'base');
  const base: { id: string; name: string; description: string; layers: SceneLayer[] } = {
    id: read.string(baseRaw?.id, 'base.id'),
    name: read.string(baseRaw?.name, 'base.name'),
    description: read.string(baseRaw?.description, 'base.description'),
    // The base has no anchor in the export; it is the ground itself, so use its bottom centre.
    layers: [
      {
        ...baseBox,
        id: read.string(baseRaw?.id, 'base.id'),
        file: read.string(baseRaw?.file, 'base.file'),
        anchor: { x: baseBox.x + baseBox.width / 2, y: baseBox.y + baseBox.height },
        z: 0,
        incidental: false,
        ambient: null,
      },
    ],
  };
  const counters = new Map<AmbientKind, number>();
  const waterCount = Array.isArray(root.ambient)
    ? root.ambient.filter((value: unknown) => (value as { ambient?: { kind?: unknown } } | null)?.ambient?.kind === 'water').length
    : 0;
  const mark = (value: unknown, where: string, box: { x: number; width: number }): AmbientMark | null => {
    if (value === undefined) {
      return null;
    }
    const raw = read.object(value, where);
    const kind = read.string(raw?.kind, `${where}.kind`) as AmbientKind;
    if (!AMBIENT_KINDS.includes(kind)) {
      problems.push(`${where}: unknown kind ${kind}`);
      return null;
    }
    const index = counters.get(kind) ?? 0;
    counters.set(kind, index + 1);
    const preset = AMBIENT_PRESETS[kind];
    const pivotRaw = raw?.pivot === undefined ? null : read.object(raw.pivot, `${where}.pivot`);
    const pivot: Point | null = pivotRaw ? { x: read.number(pivotRaw.x, `${where}.pivot.x`), y: read.number(pivotRaw.y, `${where}.pivot.y`) } : null;
    // A cloud drifts toward the middle of the canvas and back, so it stays in the sky the scene frames.
    const inward = box.x + box.width / 2 <= canvas.width / 2 ? 1 : -1;
    const water = kind === 'water';
    return {
      kind,
      amplitude: kind === 'cloud' ? preset.amplitude * inward : preset.amplitude,
      periodMs: water ? preset.periodMs : Math.round(preset.periodMs * PERIOD_SPREAD[index % PERIOD_SPREAD.length]!),
      phase: water ? index / Math.max(1, waterCount) : (index * PHASE_STEP) % 1,
      pivot,
    };
  };
  const ambientRaw = root.ambient === undefined ? [] : Array.isArray(root.ambient) ? root.ambient : (problems.push('ambient must be a list'), []);
  if (ambientRaw.length >= Z_STRIDE) {
    problems.push('ambient: too many layers');
  }
  ambientRaw.forEach((value: unknown, index: number) => {
    const at = `ambient[${index}]`;
    const layer = read.object(value, at);
    const box = read.box(layer, at);
    base.layers.push({
      ...box,
      id: read.string(layer?.id, `${at}.id`),
      file: read.string(layer?.file, `${at}.file`),
      // Clouds and water have no ground point; their centre stands in for the anchor.
      anchor: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      z: index + 1,
      incidental: false,
      ambient: mark(layer?.ambient, `${at}.ambient`, box) ?? (problems.push(`${at}: ambient layer without a kind`), null),
    });
  });

  const unlocksRaw = Array.isArray(root.unlocks) ? root.unlocks : (problems.push('unlocks must be a list'), []);
  const parsed = unlocksRaw.map((value: unknown, index: number) => {
    const where = `unlocks[${index}]`;
    const unlock = read.object(value, where);
    const layersRaw = Array.isArray(unlock?.layers) ? unlock.layers : (problems.push(`${where}.layers must be a list`), []);
    if (layersRaw.length >= Z_STRIDE) {
      problems.push(`${where}: too many layers`);
    }
    const milestone = read.number(unlock?.milestone, `${where}.milestone`);
    const adds: SceneLayer[] = layersRaw.map((layerValue: unknown, part: number) => {
      const at = `${where}.layers[${part}]`;
      const layer = read.object(layerValue, at);
      const anchor = read.object(layer?.anchor, `${at}.anchor`);
      const box = read.box(layer, at);
      return {
        ...box,
        id: read.string(layer?.id, `${at}.id`),
        file: read.string(layer?.file, `${at}.file`),
        anchor: { x: read.number(anchor?.x, `${at}.anchor.x`), y: read.number(anchor?.y, `${at}.anchor.y`) },
        z: milestone * Z_STRIDE + part,
        incidental: layer?.incidental === true,
        ambient: mark(layer?.ambient, `${at}.ambient`, box),
      };
    });
    const hides = Array.isArray(unlock?.hides) ? unlock.hides.map((id: unknown) => read.string(id, `${where}.hides`)) : [];
    const hiddenFrom = unlock?.hiddenFromMilestone;
    return {
      unlock: {
        milestone: milestone as Milestone,
        thresholdPercent: read.number(unlock?.thresholdPercent, `${where}.thresholdPercent`),
        id: read.string(unlock?.id, `${where}.id`),
        name: read.string(unlock?.name, `${where}.name`),
        description: read.string(unlock?.description, `${where}.description`),
        adds,
        removes: [] as string[],
      },
      hides,
      hiddenFrom: typeof hiddenFrom === 'number' ? hiddenFrom : null,
    };
  });

  // Replacement: `hides` names whole unlocks; both sides of the export must agree on it.
  const unlocks: SceneUnlock[] = parsed.map(({ unlock, hides }) => {
    const removes = hides.flatMap((hiddenId: string) => {
      const hidden = parsed.find((entry) => entry.unlock.id === hiddenId);
      if (!hidden) {
        problems.push(`unlock ${unlock.id}: hides unknown unlock ${hiddenId}`);
        return [];
      }
      if (hidden.hiddenFrom !== unlock.milestone) {
        problems.push(`unlock ${hiddenId}: hiddenFromMilestone must be ${unlock.milestone}`);
      }
      return hidden.unlock.adds.map((layer) => layer.id);
    });
    return { ...unlock, removes };
  });
  for (const { unlock, hiddenFrom } of parsed) {
    if (hiddenFrom !== null && !parsed.some((entry) => entry.unlock.milestone === hiddenFrom && entry.hides.includes(unlock.id))) {
      problems.push(`unlock ${unlock.id}: hiddenFromMilestone ${hiddenFrom} without a matching hides entry`);
    }
  }

  const manifest = {
    themeId,
    version: read.number(root.version, 'version'),
    name,
    canvas,
    base,
    unlocks,
    assets,
  };
  problems.push(...validateManifest(manifest));
  return problems.length > 0 ? { ok: false, problems } : { ok: true, manifest };
}

type Json = Record<string, unknown>;

// Small typed readers that record a problem and return a harmless value instead of throwing.
class Reader {
  constructor(private readonly problems: string[]) {}

  object(value: unknown, where: string): Json | null {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Json;
    }
    this.problems.push(`${where} must be an object`);
    return null;
  }

  string(value: unknown, where: string): string {
    if (typeof value === 'string') {
      return value;
    }
    this.problems.push(`${where} must be a string`);
    return '';
  }

  number(value: unknown, where: string): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    this.problems.push(`${where} must be a number`);
    return 0;
  }

  box(value: Json | null, where: string) {
    return {
      x: this.number(value?.x, `${where}.x`),
      y: this.number(value?.y, `${where}.y`),
      width: this.number(value?.width, `${where}.width`),
      height: this.number(value?.height, `${where}.height`),
    };
  }
}
