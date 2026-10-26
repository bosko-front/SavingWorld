import type { ThemeId } from '@/core/progression';

import {
  AMBIENT_KINDS,
  AMBIENT_REST,
  validateManifest,
  type AmbientKind,
  type AmbientMark,
  type ManifestResult,
  type Milestone,
  type Point,
  type SceneAsset,
  type SceneLayer,
  type SceneUnlock,
} from './manifest';

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
//
// Garden motion (Phase 17, D124): `ambientExtensions.layers` (optional) → layers added by the unlock
// of their `milestone`, drawn right after the parts of `drawAfterMilestone` (10 = above everything):
// z = drawAfterMilestone × 1000 + 900 + their order. Kinds water (owned by an unlock), koi (`center` →
// the glide pivot), glow, butterfly and petal. The export's `rest` must be the kind's own (koi visible,
// the others hidden), so a layer can never be drawn at rest when it is not part of the approved picture.

type ExportOptions = {
  themeId: ThemeId;
  name: string;
  assets: Readonly<Record<string, SceneAsset>>;
};

// Room for parts per milestone in the z numbering; validated below. Extension layers drawn after a
// milestone take the top of its range.
const Z_STRIDE = 1000;
const EXTENSION_Z = 900;

// How each kind of ambient layer moves (D90: calm, fine at 30 fps). Cloud amplitude is in canvas units
// (90 ≈ 22 pt on an iPhone Home); water is each flow layer's brightest opacity, and its period one full
// round of the flow layers (they share it, evenly out of phase, D93); sway is the largest lean in degrees
// (a skew from the trunk base). Tuned on the simulator with the owner, who found 0.7° and then 2.5° of
// tilt and the water sparkle too faint (D92, D93); the World inspector switches them off.
// Garden (Phase 17, D124): koi glide around their resting place with this radius in canvas units (about
// 9 pt on an iPhone Home, inside the "about 60 px" of the export's rule); a glow warms to this opacity
// and then breathes very slowly a little below it, never back to dark (no pulse); butterflies and petals
// share one period and take turns, so at most one butterfly flies and one petal falls at a time, each
// once per period, unseen in between.
export const AMBIENT_PRESETS: Record<AmbientKind, { amplitude: number; periodMs: number }> = {
  cloud: { amplitude: 90, periodMs: 24000 },
  water: { amplitude: 1, periodMs: 2400 },
  sway: { amplitude: 5, periodMs: 4400 },
  koi: { amplitude: 36, periodMs: 18000 },
  glow: { amplitude: 0.9, periodMs: 11000 },
  butterfly: { amplitude: 70, periodMs: 36000 },
  petal: { amplitude: 150, periodMs: 27000 },
};

// Kinds whose layers share one period and take turns (phases evenly spread in export order).
const TAKING_TURNS: readonly AmbientKind[] = ['water', 'butterfly', 'petal'];

// Per-layer spread of the period, and a golden-ratio phase step, so clouds, trees, koi and glows drift
// apart.
const PERIOD_SPREAD = [1, 1.17, 0.88, 1.09, 0.94, 1.23, 0.83, 1.05, 0.97, 1.13];
const PHASE_STEP = 0.618034;

const EXTENSION_KINDS: readonly AmbientKind[] = ['water', 'koi', 'glow', 'butterfly', 'petal'];

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
  const extensionsRaw = root.ambientExtensions === undefined ? null : read.object(root.ambientExtensions, 'ambientExtensions');
  const extensionLayers: unknown[] =
    extensionsRaw === null ? [] : Array.isArray(extensionsRaw.layers) ? extensionsRaw.layers : (problems.push('ambientExtensions.layers must be a list'), []);
  // How many layers of a kind take turns, over the base list and the extensions together.
  const kindOf = (value: unknown, nested: boolean): unknown => {
    const layer = value as { kind?: unknown; ambient?: { kind?: unknown } } | null;
    return nested ? layer?.ambient?.kind : layer?.kind;
  };
  const turnCount = (kind: AmbientKind) =>
    (Array.isArray(root.ambient) ? root.ambient.filter((value: unknown) => kindOf(value, true) === kind).length : 0) +
    extensionLayers.filter((value) => kindOf(value, false) === kind).length;
  const markOf = (kind: AmbientKind, pivot: Point | null, box: { x: number; width: number }): AmbientMark => {
    const index = counters.get(kind) ?? 0;
    counters.set(kind, index + 1);
    const preset = AMBIENT_PRESETS[kind];
    // A cloud drifts toward the middle of the canvas and back, so it stays in the sky the scene frames.
    const inward = box.x + box.width / 2 <= canvas.width / 2 ? 1 : -1;
    const turns = TAKING_TURNS.includes(kind);
    return {
      kind,
      amplitude: kind === 'cloud' ? preset.amplitude * inward : preset.amplitude,
      periodMs: turns ? preset.periodMs : Math.round(preset.periodMs * PERIOD_SPREAD[index % PERIOD_SPREAD.length]!),
      phase: turns ? index / Math.max(1, turnCount(kind)) : (index * PHASE_STEP) % 1,
      pivot,
    };
  };
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
    const pivotRaw = raw?.pivot === undefined ? null : read.object(raw.pivot, `${where}.pivot`);
    const pivot: Point | null = pivotRaw ? { x: read.number(pivotRaw.x, `${where}.pivot.x`), y: read.number(pivotRaw.y, `${where}.pivot.y`) } : null;
    return markOf(kind, pivot, box);
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
    if (layersRaw.length >= EXTENSION_Z) {
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

  // Garden motion layers (Phase 17): each joins the unlock of its milestone.
  if (extensionLayers.length >= Z_STRIDE - EXTENSION_Z) {
    problems.push('ambientExtensions: too many layers');
  }
  extensionLayers.forEach((value, index) => {
    const at = `ambientExtensions.layers[${index}]`;
    const layer = read.object(value, at);
    const box = read.box(layer, at);
    const kind = read.string(layer?.kind, `${at}.kind`) as AmbientKind;
    if (!EXTENSION_KINDS.includes(kind)) {
      problems.push(`${at}: unknown kind ${kind}`);
      return;
    }
    const milestone = read.number(layer?.milestone, `${at}.milestone`);
    const after = read.number(layer?.drawAfterMilestone, `${at}.drawAfterMilestone`);
    const owner = parsed.find((entry) => entry.unlock.milestone === milestone);
    if (!owner) {
      problems.push(`${at}: milestone ${milestone} is not an unlock`);
      return;
    }
    if (!(Number.isInteger(after) && after >= milestone && after <= parsed.length)) {
      problems.push(`${at}: drawAfterMilestone ${after} must be ${milestone}..${parsed.length}`);
      return;
    }
    const rest = read.string(layer?.rest, `${at}.rest`);
    if (rest !== AMBIENT_REST[kind]) {
      problems.push(`${at}: a ${kind} rests ${AMBIENT_REST[kind]}, not ${rest}`);
    }
    const centerRaw = layer?.center === undefined ? null : read.object(layer.center, `${at}.center`);
    const center: Point | null = centerRaw ? { x: read.number(centerRaw.x, `${at}.center.x`), y: read.number(centerRaw.y, `${at}.center.y`) } : null;
    owner.unlock.adds.push({
      ...box,
      id: read.string(layer?.id, `${at}.id`),
      file: read.string(layer?.file, `${at}.file`),
      // These have no ground point; the glide centre (koi) or the box centre stands in for the anchor.
      anchor: center ?? { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      z: after * Z_STRIDE + EXTENSION_Z + index,
      incidental: false,
      // Only a koi's centre is a pivot (it glides around it); a glow's centre is just where it shines.
      ambient: markOf(kind, kind === 'koi' ? center : null, box),
    });
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
