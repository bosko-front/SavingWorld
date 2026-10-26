import { MILESTONE_COUNT, type Stage, type ThemeId } from '@/core/progression';

// Theme manifest contract (docs/ASSET_SPEC.md "Planned manifest contract"). A theme is one base
// composition (stage 0) plus exactly ten unlocks; each unlock adds layers and may remove layers of
// an earlier unlock (Island: the 80% cottage replaces the 40% cabin). Pure TypeScript: no React,
// no image loading. The theme module supplies the static `require` map, and validation proves every
// layer points into it, so a stage number never becomes a file path.

// What Metro returns for a static `require` of an image: a number in the app, an object in Jest.
export type SceneAsset = number | object;

export type Point = { x: number; y: number };

export type Rect = { x: number; y: number; width: number; height: number };

// Ambient motion (Phase 10.5, D90; Garden kinds Phase 17, D124): what a layer does while Home is
// visible and the app is active. Clouds drift sideways and back, water flow layers fade in turn, trees
// sway around their trunk base; on the Garden koi glide in a small loop, lantern and greenhouse glows
// warm very slowly, a butterfly now and then takes a short flight and a petal now and then falls.
// Every value is 0 at rest, so a still scene is exactly the approved picture.
export type AmbientKind = 'cloud' | 'water' | 'sway' | 'koi' | 'glow' | 'butterfly' | 'petal';

export const AMBIENT_KINDS: readonly AmbientKind[] = ['cloud', 'water', 'sway', 'koi', 'glow', 'butterfly', 'petal'];

export type AmbientMark = {
  kind: AmbientKind;
  // cloud: the farthest drift in canvas units (the sign is the direction; it drifts out and back);
  // water and glow: the brightest opacity (0 at rest); sway: the largest lean in degrees either side (a
  // skew from the pivot, so the trunk base stays put and the crown moves sideways); koi: the radius of
  // its glide in canvas units; butterfly: how far one flight reaches, petal: how far one petal falls,
  // both in canvas units.
  amplitude: number;
  // One full cycle. Butterflies and petals fly or fall once per cycle and rest unseen in between.
  periodMs: number;
  // How far into a period the layer waits before it starts (0..1), so layers never move in step (water
  // layers, butterflies and petals share one period and take turns).
  phase: number;
  // sway: the point the tree turns around (where the trunk meets the ground); koi: the centre of its
  // glide (where it rests in the approved picture). Canvas units; null for every other kind.
  pivot: Point | null;
};

// Ranges a mark must stay in: calm motion only (D90, D124: koi within about 60 canvas units).
export const AMBIENT_LIMITS = {
  periodMs: { min: 2000, max: 120000 },
  amplitude: { cloud: 160, water: 1, sway: 8, koi: 60, glow: 1, butterfly: 120, petal: 200 },
} as const;

// Whether a kind is part of the approved still picture ('visible': it rests where the render shows it)
// or invisible at rest ('hidden': only motion shows it, and the layer is not drawn at all while its
// kind is switched off).
export const AMBIENT_REST: Readonly<Record<AmbientKind, 'visible' | 'hidden'>> = {
  cloud: 'visible',
  water: 'hidden',
  sway: 'visible',
  koi: 'visible',
  glow: 'hidden',
  butterfly: 'hidden',
  petal: 'hidden',
};

// Kinds that need a pivot (sway: the trunk base, koi: the glide centre).
const PIVOT_KINDS: readonly AmbientKind[] = ['sway', 'koi'];

export type SceneLayer = {
  // Stable id, unique within the manifest (Phase 10 animates layers by id).
  id: string;
  // Key into the manifest's static asset map.
  file: string;
  // Top-left position and size in logical canvas units.
  x: number;
  y: number;
  width: number;
  height: number;
  // Where the object meets the ground: the point a reveal grows from (Phase 10).
  anchor: Point;
  // Drawing order; larger draws on top. Unique within the manifest.
  z: number;
  // A side effect of another object (a shadow or outline shift) that shows without its own reveal.
  incidental: boolean;
  // Ambient motion of this layer, or null for a layer that never moves on its own.
  ambient: AmbientMark | null;
};

export type Milestone = Exclude<Stage, 0>;

export type SceneUnlock = {
  milestone: Milestone;
  thresholdPercent: number;
  id: string;
  // Short stage name, used by Home's next-milestone callout ("Next: Small house").
  name: string;
  // One sentence for VoiceOver describing what this unlock added.
  description: string;
  adds: readonly SceneLayer[];
  // Layer ids of earlier unlocks hidden from this milestone on (explicit replacement).
  removes: readonly string[];
};

export type ThemeManifest = {
  themeId: ThemeId;
  version: number;
  name: string;
  canvas: { width: number; height: number };
  base: { id: string; name: string; description: string; layers: readonly SceneLayer[] };
  unlocks: readonly SceneUnlock[];
  assets: Readonly<Record<string, SceneAsset>>;
};

export type ManifestResult = { ok: true; manifest: ThemeManifest } | { ok: false; problems: readonly string[] };

// Exports use the frozen 4:3 Blender frame (WORLD_SCENE_ASPECT); another shape means a broken export.
const CANVAS_ASPECT = { width: 4, height: 3 };

// Checks a manifest against the contract. Returns every problem found, not just the first.
export function validateManifest(manifest: ThemeManifest): string[] {
  const problems: string[] = [];
  const { canvas } = manifest;
  if (!(Number.isInteger(manifest.version) && manifest.version >= 1)) {
    problems.push(`version must be a positive integer, got ${manifest.version}`);
  }
  if (!manifest.name.trim()) {
    problems.push('theme name is empty');
  }
  if (!(canvas.width > 0 && canvas.height > 0) || canvas.width * CANVAS_ASPECT.height !== canvas.height * CANVAS_ASPECT.width) {
    problems.push(`canvas must be 4:3, got ${canvas.width}×${canvas.height}`);
  }

  const layerOwner = new Map<string, number>();
  const zValues = new Set<number>();
  const bounds = layerBounds(manifest);
  const checkLayer = (layer: SceneLayer, owner: number) => {
    const where = `layer ${layer.id || '(no id)'}`;
    if (!layer.id) {
      problems.push('a layer has no id');
    } else if (layerOwner.has(layer.id)) {
      problems.push(`${where}: duplicate id`);
    } else {
      layerOwner.set(layer.id, owner);
    }
    if (!Object.prototype.hasOwnProperty.call(manifest.assets, layer.file)) {
      problems.push(`${where}: missing asset ${layer.file}`);
    }
    if (!(layer.width > 0 && layer.height > 0)) {
      problems.push(`${where}: size must be positive`);
    }
    if (layer.x < 0 || layer.y < 0 || layer.x + layer.width > canvas.width || layer.y + layer.height > canvas.height) {
      problems.push(`${where}: outside the canvas`);
    }
    const { anchor } = layer;
    if (anchor.x < layer.x || anchor.x > layer.x + layer.width || anchor.y < layer.y || anchor.y > layer.y + layer.height) {
      problems.push(`${where}: anchor outside the layer`);
    }
    if (zValues.has(layer.z)) {
      problems.push(`${where}: duplicate z ${layer.z}`);
    }
    zValues.add(layer.z);
    if (layer.ambient) {
      problems.push(...ambientProblems(layer, owner, bounds).map((problem) => `${where}: ${problem}`));
    }
  };

  if (manifest.base.layers.length === 0) {
    problems.push('base has no layers');
  }
  manifest.base.layers.forEach((layer) => checkLayer(layer, 0));
  if (!manifest.base.description.trim()) {
    problems.push('base description is empty');
  }

  if (manifest.unlocks.length !== MILESTONE_COUNT) {
    problems.push(`expected ${MILESTONE_COUNT} unlocks, got ${manifest.unlocks.length}`);
  }
  const unlockIds = new Set<string>([manifest.base.id]);
  const removed = new Set<string>();
  manifest.unlocks.forEach((unlock, index) => {
    const where = `unlock ${unlock.id || index + 1}`;
    if (unlock.milestone !== index + 1) {
      problems.push(`${where}: milestone ${unlock.milestone} out of order`);
    }
    if (unlock.thresholdPercent !== (index + 1) * 10) {
      problems.push(`${where}: threshold ${unlock.thresholdPercent}% must be ${(index + 1) * 10}%`);
    }
    if (!unlock.id || unlockIds.has(unlock.id)) {
      problems.push(`${where}: missing or duplicate id`);
    }
    unlockIds.add(unlock.id);
    if (!unlock.name.trim() || !unlock.description.trim()) {
      problems.push(`${where}: name and description are required`);
    }
    if (unlock.adds.length === 0) {
      problems.push(`${where}: adds no layer`);
    }
    // Removals refer to layers that already exist when this unlock applies.
    for (const id of unlock.removes) {
      const owner = layerOwner.get(id);
      if (owner === undefined) {
        problems.push(`${where}: removes unknown or later layer ${id}`);
      } else if (owner === 0) {
        problems.push(`${where}: removes base layer ${id}`);
      } else if (removed.has(id)) {
        problems.push(`${where}: removes ${id} twice`);
      }
      removed.add(id);
    }
    unlock.adds.forEach((layer) => checkLayer(layer, index + 1));
  });
  return problems;
}

// What is wrong with a layer's ambient mark. Clouds belong to the base (always drawn); water belongs
// to the base (Island) or to the unlock that brings it (Garden: the 60% fountain); every other kind
// belongs to an unlock. A sway turns around a pivot inside its tree, a koi glides around a centre
// inside its layer. A cloud drifts only inside the art's bounds, so it never leaves the sky the scene
// frames.
function ambientProblems(layer: SceneLayer, owner: number, bounds: Rect): string[] {
  const mark = layer.ambient;
  if (!mark) {
    return [];
  }
  const problems: string[] = [];
  const { kind, amplitude, periodMs, phase, pivot } = mark;
  if (!AMBIENT_KINDS.includes(kind)) {
    return [`unknown ambient kind ${String(kind)}`];
  }
  const limit = AMBIENT_LIMITS.amplitude[kind];
  const size = Math.abs(amplitude);
  if (!(size > 0 && size <= limit) || (kind !== 'cloud' && amplitude < 0)) {
    problems.push(`${kind} amplitude ${amplitude} outside 0..${limit}`);
  }
  if (!(periodMs >= AMBIENT_LIMITS.periodMs.min && periodMs <= AMBIENT_LIMITS.periodMs.max)) {
    problems.push(`ambient period ${periodMs} ms outside ${AMBIENT_LIMITS.periodMs.min}..${AMBIENT_LIMITS.periodMs.max}`);
  }
  if (!(phase >= 0 && phase < 1)) {
    problems.push(`ambient phase ${phase} outside 0..1`);
  }
  if (kind === 'cloud') {
    if (owner !== 0) {
      problems.push('a cloud layer belongs to the base');
    }
  } else if (kind !== 'water' && owner === 0) {
    problems.push(`a ${kind} belongs to an unlock layer, not the base`);
  }
  if (layer.incidental) {
    problems.push(`an incidental layer cannot ${kind === 'sway' ? 'sway' : 'move'}`);
  }
  if (PIVOT_KINDS.includes(kind)) {
    if (!pivot || pivot.x < layer.x || pivot.x > layer.x + layer.width || pivot.y < layer.y || pivot.y > layer.y + layer.height) {
      problems.push(`${kind} pivot missing or outside the layer`);
    }
  } else if (pivot) {
    problems.push(`a ${kind} layer has no pivot`);
  }
  if (kind === 'cloud' && (layer.x + Math.min(0, amplitude) < bounds.x || layer.x + layer.width + Math.max(0, amplitude) > bounds.x + bounds.width)) {
    problems.push('cloud drifts outside the art');
  }
  return problems;
}

// The layers drawn at `stage`, bottom first: the base, then every unlock up to the stage, minus the
// layers a reached unlock removes. Stage comes from the shared stage function; nothing here knows
// about money.
export function visibleLayers(manifest: ThemeManifest, stage: Stage): SceneLayer[] {
  const reached = manifest.unlocks.filter((unlock) => unlock.milestone <= stage);
  const removed = new Set(reached.flatMap((unlock) => unlock.removes));
  return [...manifest.base.layers, ...reached.flatMap((unlock) => unlock.adds)]
    .filter((layer) => !removed.has(layer.id))
    .sort((a, b) => a.z - b.z);
}

// The unlock reached at `stage`, or null for the base.
export function unlockAt(manifest: ThemeManifest, stage: Stage): SceneUnlock | null {
  return stage === 0 ? null : (manifest.unlocks.find((unlock) => unlock.milestone === stage) ?? null);
}

// What the scene shows at `stage`, for VoiceOver: the base description at 0, the latest unlock's
// description afterwards (each describes what it added to the scene before it).
export function sceneDescription(manifest: ThemeManifest, stage: Stage): string {
  return unlockAt(manifest, stage)?.description ?? manifest.base.description;
}

// The part of the canvas the scene shows (owner review, D78/D80): the bounds of every layer of every
// stage plus `margin` canvas units, kept inside the canvas. The renders leave empty sky around the
// island; framing the art instead draws the world larger in the same space. One viewport for all
// stages, so the framing never moves when a milestone unlocks and nothing any stage draws is cut
// off. Its aspect ratio is the art's own (about 1.2 for the Island), not the canvas's.
export function sceneViewport(manifest: ThemeManifest, margin: number): Rect {
  const { canvas } = manifest;
  const art = layerBounds(manifest);
  const left = Math.max(0, art.x - margin);
  const top = Math.max(0, art.y - margin);
  const right = Math.min(canvas.width, art.x + art.width + margin);
  const bottom = Math.min(canvas.height, art.y + art.height + margin);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

// The bounds of every layer of every stage.
function layerBounds(manifest: ThemeManifest): Rect {
  const layers = [...manifest.base.layers, ...manifest.unlocks.flatMap((unlock) => unlock.adds)];
  if (layers.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const left = Math.min(...layers.map((layer) => layer.x));
  const top = Math.min(...layers.map((layer) => layer.y));
  const right = Math.max(...layers.map((layer) => layer.x + layer.width));
  const bottom = Math.max(...layers.map((layer) => layer.y + layer.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}
