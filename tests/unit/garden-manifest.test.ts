import fs from 'fs';
import path from 'path';

import { CURRENT_THEME_VERSIONS, stageFor, stageThresholdMinor, type Stage } from '@/core/progression';
import { AMBIENT_RELEASE_SWITCHES, ambientKindOn } from '@/features/worlds/ambient';
import { AMBIENT_LIMITS, AMBIENT_REST, sceneDescription, unlockAt, validateManifest, visibleLayers, type AmbientKind, type SceneLayer, type ThemeManifest } from '@/features/worlds/manifest';
import { stageName, themeManifest, themeManifestAt } from '@/features/worlds/registry';
import { AMBIENT_PRESETS, manifestFromExport } from '@/features/worlds/theme-export';
import { GARDEN_ASSETS, gardenManifestJson } from '@/features/worlds/themes/garden-assets';
import { AMBIENT_EVENT_MS } from '@/features/worlds/world-scene';

// Phase 17: the Garden manifest (export version 1, D120/D123/D124) through the same contract as the
// Island, the stage → layer mapping at every threshold, the 100% cap, the extended ambient contract
// (water owned by an unlock; koi, glow, butterfly, petal) and the still stack. The pixel comparison of
// the still stack with the approved renders is scripts/check-still-stack.py (Blender's Python), fed
// by the stack this file writes when STILL_STACK_OUT is set (evidence/PHASE_17.md).

const ROOT = path.resolve(__dirname, '../..');
const APP_ART = path.join(ROOT, 'assets/themes/garden');
const WORKSPACE_EXPORT = path.join(ROOT, 'assets/worlds/garden/export');

// The approved Garden sequence (PRODUCT_REQUIREMENTS, D119: 80% greenhouse and vegetable beds).
const GARDEN_NAMES = [
  'First seedlings',
  'Small flower bed',
  'More flowers',
  'Decorative tree',
  'Garden pathway',
  'Small fountain',
  'Bench and decorations',
  'Greenhouse and vegetable beds',
  'Final plants and ornaments',
  'Completed garden',
];

const STAGES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const satisfies readonly Stage[];

function garden(): ThemeManifest {
  const result = themeManifest('garden');
  if (!result.ok) {
    throw new Error(`garden manifest invalid:\n${result.problems.join('\n')}`);
  }
  return result.manifest;
}

const allLayers = () => [...garden().base.layers, ...garden().unlocks.flatMap((unlock) => unlock.adds)];

function exportCopy(): Record<string, any> {
  return JSON.parse(JSON.stringify(gardenManifestJson));
}

function problemsOf(raw: unknown): readonly string[] {
  const result = manifestFromExport(raw, { themeId: 'garden', name: 'Garden', assets: GARDEN_ASSETS });
  return result.ok ? [] : result.problems;
}

const kindOf = (layer: SceneLayer) => layer.ambient?.kind ?? null;

// The still picture at a stage: what the scene draws with every motion at rest, minus layers that are
// invisible at rest (they are drawn at opacity 0, or not at all with their switch off).
function stillStack(stage: Stage): SceneLayer[] {
  return visibleLayers(garden(), stage).filter((layer) => !layer.ambient || AMBIENT_REST[layer.ambient.kind] === 'visible');
}

describe('bundled Garden manifest', () => {
  it('is valid: version 1 (= CURRENT_THEME_VERSIONS.garden), 4:3, one base and ten unlocks at 10%..100% in the D119 order', () => {
    const manifest = garden();
    expect(validateManifest(manifest)).toEqual([]);
    expect(manifest).toMatchObject({ themeId: 'garden', version: 1, name: 'Garden', canvas: { width: 2048, height: 1536 } });
    expect(manifest.version).toBe(CURRENT_THEME_VERSIONS.garden);
    expect(manifest.base).toMatchObject({ id: 'empty_garden', name: 'Empty garden' });
    expect(manifest.unlocks.map((unlock) => unlock.thresholdPercent)).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    expect(manifest.unlocks.map((unlock) => unlock.name)).toEqual(GARDEN_NAMES);
    expect(manifest.unlocks.map((unlock) => stageName('garden', unlock.milestone))).toEqual(GARDEN_NAMES);
    for (const unlock of manifest.unlocks) {
      expect(unlock.description.length).toBeGreaterThan(10);
      expect(unlock.removes).toEqual([]);
    }
    // No gazebo anywhere (D119): the 80% unlock is the greenhouse.
    expect(JSON.stringify(gardenManifestJson)).not.toMatch(/gazebo/i);
  });

  it('has 51 contract layers plus 16 motion layers, unique ids and z values, all inside the canvas', () => {
    const all = allLayers();
    expect(all).toHaveLength(67);
    expect(all.filter((layer) => !['water', 'koi', 'glow', 'butterfly', 'petal'].includes(kindOf(layer) ?? ''))).toHaveLength(51);
    expect(new Set(all.map((layer) => layer.id)).size).toBe(all.length);
    expect(new Set(all.map((layer) => layer.z)).size).toBe(all.length);
  });

  it('maps every layer to a static asset, and the asset map to exactly the files on disk', () => {
    const files = fs.readdirSync(path.join(APP_ART, '1536')).filter((file) => file.endsWith('.png'));
    expect(Object.keys(GARDEN_ASSETS).sort()).toEqual(files.sort());
    expect(allLayers().map((layer) => layer.file).sort()).toEqual(files.sort());
  });

  it('ships the approved export unchanged (never hand-edited): same manifest and same 1536 PNG bytes', () => {
    const read = (dir: string, file: string) => fs.readFileSync(path.join(dir, file));
    expect(read(APP_ART, 'garden_manifest.json').equals(read(WORKSPACE_EXPORT, 'garden_manifest.json'))).toBe(true);
    const workspace = fs.readdirSync(path.join(WORKSPACE_EXPORT, '1536')).filter((file) => file.endsWith('.png'));
    expect(Object.keys(GARDEN_ASSETS).sort()).toEqual(workspace.sort());
    for (const file of workspace) {
      expect({ file, same: read(path.join(APP_ART, '1536'), file).equals(read(path.join(WORKSPACE_EXPORT, '1536'), file)) }).toEqual({ file, same: true });
    }
  });

  it('PNG sizes are 0.75 of the canvas boxes (the 1536 app resolution)', () => {
    for (const layer of allLayers()) {
      const header = fs.readFileSync(path.join(APP_ART, '1536', layer.file)).subarray(0, 24);
      expect({ id: layer.id, width: header.readUInt32BE(16), height: header.readUInt32BE(20) }).toEqual({
        id: layer.id,
        width: layer.width * 0.75,
        height: layer.height * 0.75,
      });
    }
  });

  it('keeps the decoded art inside the 32 MiB budget (ASSET_SPEC): 15.4 MiB contract + 4.8 MiB motion at 1536', () => {
    const mib = (layers: SceneLayer[]) => layers.reduce((sum, layer) => sum + layer.width * 0.75 * layer.height * 0.75 * 4, 0) / 2 ** 20;
    const motion = allLayers().filter((layer) => ['water', 'koi', 'glow', 'butterfly', 'petal'].includes(kindOf(layer) ?? ''));
    expect(mib(allLayers())).toBeLessThan(32);
    expect(Math.round(mib(motion) * 10) / 10).toBe(4.8);
    expect(Math.round((mib(allLayers()) - mib(motion)) * 10) / 10).toBe(15.4);
  });
});

describe('stored art versions', () => {
  it('a Garden souvenir earned today records version 1, and that version renders; another version gets the fallback', () => {
    expect(themeManifestAt('garden', CURRENT_THEME_VERSIONS.garden)).toBe(themeManifest('garden'));
    const missing = themeManifestAt('garden', 2);
    expect(missing.ok).toBe(false);
    expect(!missing.ok && missing.problems[0]).toMatch(/garden art version 2 is not bundled/);
  });
});

describe('stage → visible layers', () => {
  it('stage 0 is the empty garden with its two drifting clouds; nothing is ever removed (Garden items coexist)', () => {
    expect(visibleLayers(garden(), 0).map((layer) => layer.id)).toEqual(['empty_garden', 'cloud_1', 'cloud_2']);
    for (const stage of STAGES.slice(1)) {
      const before = new Set(visibleLayers(garden(), (stage - 1) as Stage).map((layer) => layer.id));
      const now = visibleLayers(garden(), stage).map((layer) => layer.id);
      expect({ stage, keepsEverything: [...before].every((id) => now.includes(id)) }).toEqual({ stage, keepsEverything: true });
      expect(now.length).toBeGreaterThan(before.size);
    }
  });

  it('describes every state for VoiceOver with the D119 objects', () => {
    expect(sceneDescription(garden(), 0)).toMatch(/empty floating garden/i);
    expect(sceneDescription(garden(), 6)).toMatch(/fountain/i);
    expect(sceneDescription(garden(), 8)).toMatch(/greenhouse/i);
    expect(sceneDescription(garden(), 10)).toMatch(/complete/i);
  });

  // A target that divides evenly and one that does not (thresholds round up, ceil(T × k / 10)).
  it.each([200_000, 1_003, 333_333])('one minor unit below, at and above each unlock, target %d; 125% stays at the completed garden', (target) => {
    const ids = (stage: Stage) => visibleLayers(garden(), stage).map((layer) => layer.id);
    for (let k = 1; k <= 10; k += 1) {
      const threshold = stageThresholdMinor(target, k as Stage);
      expect({ k, below: ids(stageFor(threshold - 1, target)) }).toEqual({ k, below: ids((k - 1) as Stage) });
      expect({ k, at: ids(stageFor(threshold, target)) }).toEqual({ k, at: ids(k as Stage) });
    }
    expect(stageFor(Math.round(target * 1.25), target)).toBe(10);
    // Regression: a withdrawal from 100% to 90% shows stage 9 again.
    expect(stageFor(stageThresholdMinor(target, 9), target)).toBe(9);
  });
});

describe('Garden motion (ambientExtensions, D124)', () => {
  const firstStage = (kind: AmbientKind) => {
    for (const stage of STAGES) {
      if (visibleLayers(garden(), stage).some((layer) => kindOf(layer) === kind)) {
        return stage;
      }
    }
    return null;
  };

  it('each kind appears from its milestone: butterflies 30%, petals 40%, water and koi 60%, lantern glows 70%, greenhouse glow 80%', () => {
    expect(firstStage('butterfly')).toBe(3);
    expect(firstStage('petal')).toBe(4);
    expect(firstStage('water')).toBe(6);
    expect(firstStage('koi')).toBe(6);
    expect(firstStage('glow')).toBe(7);
    const glows = (stage: Stage) => visibleLayers(garden(), stage).filter((layer) => kindOf(layer) === 'glow').map((layer) => layer.id);
    expect(glows(7)).toEqual(['glow_lantern_1', 'glow_lantern_2', 'glow_lantern_3', 'glow_lantern_4']);
    expect(glows(8)).toEqual([...glows(7), 'glow_greenhouse_lights']);
    expect(firstStage('cloud')).toBe(0);
    // Twelve swaying trees: the blossom tree at 40%, eleven trees at 90%.
    expect(allLayers().filter((layer) => kindOf(layer) === 'sway')).toHaveLength(12);
  });

  it('draws water and koi right after the 60% parts, glows after their milestone, butterflies and petals above everything', () => {
    const z = (id: string) => allLayers().find((layer) => layer.id === id)!.z;
    const maxZOf = (milestone: number) => Math.max(...garden().unlocks[milestone - 1]!.adds.filter((layer) => !layer.ambient || layer.ambient.kind === 'sway').map((layer) => layer.z));
    const minZOf = (milestone: number) => Math.min(...garden().unlocks[milestone - 1]!.adds.filter((layer) => !layer.ambient || layer.ambient.kind === 'sway').map((layer) => layer.z));
    for (const id of ['water_a', 'water_b', 'water_c', 'koi_1', 'koi_2']) {
      expect(z(id)).toBeGreaterThan(maxZOf(6));
      expect(z(id)).toBeLessThan(minZOf(7));
    }
    expect(z('glow_greenhouse_lights')).toBeGreaterThan(maxZOf(8));
    expect(z('glow_greenhouse_lights')).toBeLessThan(minZOf(9));
    for (const id of ['butterfly_1', 'petal_3']) {
      expect(z(id)).toBeGreaterThan(Math.max(...allLayers().filter((layer) => !['butterfly', 'petal'].includes(kindOf(layer) ?? '')).map((layer) => layer.z)));
    }
  });

  it('rests at 0 within its limits: koi visible (part of the picture), water, glows, butterflies and petals invisible', () => {
    const marked = allLayers().filter((layer) => layer.ambient);
    for (const layer of marked) {
      const mark = layer.ambient!;
      expect(Math.abs(mark.amplitude)).toBeLessThanOrEqual(AMBIENT_LIMITS.amplitude[mark.kind]);
      expect(mark.periodMs).toBeGreaterThanOrEqual(AMBIENT_LIMITS.periodMs.min);
      expect(mark.periodMs).toBeLessThanOrEqual(AMBIENT_LIMITS.periodMs.max);
    }
    expect(AMBIENT_REST).toMatchObject({ koi: 'visible', water: 'hidden', glow: 'hidden', butterfly: 'hidden', petal: 'hidden' });
    // Koi glide about their resting centre, well within the export's "about 60 px" (ellipse ≤ 1.1 × radius).
    for (const koi of marked.filter((layer) => kindOf(layer) === 'koi')) {
      expect(koi.ambient!.pivot).not.toBeNull();
      expect(koi.ambient!.amplitude * 1.1).toBeLessThanOrEqual(60);
    }
    // Water, butterflies and petals take turns on one shared period; one flight or fall fits its turn.
    for (const kind of ['water', 'butterfly', 'petal'] as const) {
      const marks = marked.filter((layer) => kindOf(layer) === kind).map((layer) => layer.ambient!);
      expect(new Set(marks.map((mark) => mark.periodMs))).toEqual(new Set([AMBIENT_PRESETS[kind].periodMs]));
      expect(marks.map((mark) => mark.phase)).toEqual([0, 1 / 3, 2 / 3]);
    }
    expect(AMBIENT_EVENT_MS.butterfly).toBeLessThan(AMBIENT_PRESETS.butterfly.periodMs / 3);
    expect(AMBIENT_EVENT_MS.petal).toBeLessThan(AMBIENT_PRESETS.petal.periodMs / 3);
  });

  it('every kind has a release switch, and with a kind switched off its hidden layers are not drawn at all', () => {
    for (const kind of ['cloud', 'water', 'sway', 'koi', 'glow', 'butterfly', 'petal'] as const) {
      expect(ambientKindOn(AMBIENT_RELEASE_SWITCHES, kind)).toBe(true);
      expect(ambientKindOn({ ...AMBIENT_RELEASE_SWITCHES, enabled: false }, kind)).toBe(false);
    }
  });

  it('the still stack is base, clouds, reached parts and, from 60%, the resting koi, in the export stacking order', () => {
    expect(stillStack(5).some((layer) => kindOf(layer) === 'koi')).toBe(false);
    expect(stillStack(6).filter((layer) => kindOf(layer) === 'koi').map((layer) => layer.id)).toEqual(['koi_1', 'koi_2']);
    expect(stillStack(10).some((layer) => ['water', 'glow', 'butterfly', 'petal'].includes(kindOf(layer) ?? ''))).toBe(false);
    expect(stillStack(10)).toHaveLength(51 + 2);
  });

  it('refuses an unknown kind, a rest that is not the kind’s own, a milestone that is not an unlock and too much motion', () => {
    const unknown = exportCopy();
    unknown.ambientExtensions.layers[0].kind = 'firefly';
    expect(problemsOf(unknown)).toEqual(['ambientExtensions.layers[0]: unknown kind firefly']);
    const rest = exportCopy();
    rest.ambientExtensions.layers[3].rest = 'hidden';
    expect(problemsOf(rest)).toEqual(['ambientExtensions.layers[3]: a koi rests visible, not hidden']);
    const restHidden = exportCopy();
    restHidden.ambientExtensions.layers[10].rest = 'visible';
    expect(problemsOf(restHidden)).toEqual(['ambientExtensions.layers[10]: a butterfly rests hidden, not visible']);
    const milestone = exportCopy();
    milestone.ambientExtensions.layers[0].milestone = 11;
    expect(problemsOf(milestone)).toEqual(['ambientExtensions.layers[0]: milestone 11 is not an unlock']);
    const order = exportCopy();
    order.ambientExtensions.layers[5].drawAfterMilestone = 6;
    expect(problemsOf(order)).toEqual(['ambientExtensions.layers[5]: drawAfterMilestone 6 must be 7..10']);
    const noCenter = exportCopy();
    delete noCenter.ambientExtensions.layers[3].center;
    expect(problemsOf(noCenter)).toEqual(['layer koi_1: koi pivot missing or outside the layer']);
    const notAList = exportCopy();
    notAList.ambientExtensions.layers = { kind: 'water' };
    expect(problemsOf(notAList)).toEqual(['ambientExtensions.layers must be a list']);
    // The Island export has no extensions and still parses (the key is optional).
    expect(themeManifest('island').ok).toBe(true);
  });

  it('validates the new kinds’ motion numbers and owners', () => {
    const manifest = garden();
    const koi = allLayers().find((layer) => layer.id === 'koi_1')!;
    const glow = allLayers().find((layer) => layer.id === 'glow_lantern_1')!;
    const withLayer = (changed: SceneLayer) =>
      validateManifest({ ...manifest, unlocks: manifest.unlocks.map((unlock) => ({ ...unlock, adds: unlock.adds.map((layer) => (layer.id === changed.id ? changed : layer)) })) });
    expect(withLayer({ ...koi, ambient: { ...koi.ambient!, amplitude: 61 } })).toEqual(['layer koi_1: koi amplitude 61 outside 0..60']);
    expect(withLayer({ ...glow, ambient: { ...glow.ambient!, amplitude: 1.5 } })).toEqual(['layer glow_lantern_1: glow amplitude 1.5 outside 0..1']);
    expect(withLayer({ ...glow, ambient: { ...glow.ambient!, pivot: { x: 779, y: 773 } } })).toEqual(['layer glow_lantern_1: a glow layer has no pivot']);
    const onBase = validateManifest({ ...manifest, base: { ...manifest.base, layers: [...manifest.base.layers, { ...glow, id: 'base_glow', z: -5 }] } });
    expect(onBase).toEqual(expect.arrayContaining(['layer base_glow: a glow belongs to an unlock layer, not the base']));
  });
});

// Not a check on its own: with STILL_STACK_OUT set it writes the still stack of every stage for the
// Blender pixel comparison (scripts/check-still-stack.py, evidence/PHASE_17.md).
const writeStack = process.env.STILL_STACK_OUT ? it : it.skip;
writeStack('writes the still stack of every stage', () => {
  const stages = STAGES.map((stage) => ({ stage, layers: stillStack(stage).map(({ id, file, x, y, width, height }) => ({ id, file, x, y, width, height })) }));
  fs.writeFileSync(process.env.STILL_STACK_OUT!, JSON.stringify({ themeId: 'garden', stages }, null, 1));
  expect(unlockAt(garden(), 10)?.name).toBe('Completed garden');
});
