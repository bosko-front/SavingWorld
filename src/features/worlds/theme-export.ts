import type { ThemeId } from '@/core/progression';

import { validateManifest, type ManifestResult, type Milestone, type SceneAsset, type SceneLayer, type SceneUnlock } from './manifest';

// Reads a layered art export (`island_manifest.json` from assets/worlds/island/scripts/export_layers.py,
// copied unchanged to assets/themes/<theme>/) into the typed manifest, then validates it. The JSON
// is treated as untrusted input: a re-export with a changed shape gives a list of problems and the
// scene fallback, never a crash.
//
// Mapping from the export: canvas → canvas; base (one image) → base.layers[0]; unlocks[i].layers →
// adds; `hides` (unlock ids) → removes, the layers of those unlocks, and the hidden unlock's
// `hiddenFromMilestone` must name the same milestone; z = the stacking order of the export (base,
// then milestone 1..10, parts in order).

type ExportOptions = {
  themeId: ThemeId;
  name: string;
  assets: Readonly<Record<string, SceneAsset>>;
};

// Room for parts per milestone in the z numbering; validated below.
const Z_STRIDE = 1000;

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
  const base = {
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
      },
    ],
  };

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
      return {
        ...read.box(layer, at),
        id: read.string(layer?.id, `${at}.id`),
        file: read.string(layer?.file, `${at}.file`),
        anchor: { x: read.number(anchor?.x, `${at}.anchor.x`), y: read.number(anchor?.y, `${at}.anchor.y`) },
        z: milestone * Z_STRIDE + part,
        incidental: layer?.incidental === true,
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
