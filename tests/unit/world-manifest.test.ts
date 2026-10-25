import fs from 'fs';
import path from 'path';

import { CURRENT_THEME_VERSIONS, stageFor, stageThresholdMinor, type Stage } from '@/core/progression';
import { AMBIENT_LIMITS, sceneDescription, sceneViewport, unlockAt, validateManifest, visibleLayers, type ThemeManifest } from '@/features/worlds/manifest';
import { stageName, themeManifest, themeManifestAt } from '@/features/worlds/registry';
import { AMBIENT_PRESETS, manifestFromExport } from '@/features/worlds/theme-export';
import { ISLAND_ASSETS, islandManifestJson } from '@/features/worlds/themes/island-assets';
import { worldCompleteCopy } from '@/features/worlds/world-copy';

// Phase 09: the Island manifest contract (docs/ASSET_SPEC.md), the stage → layer mapping at every
// threshold and the controlled refusal of broken exports. Phase 10.5: the ambient marks (version 2). Rendering is in
// tests/integration/world-scene.test.tsx.

const ROOT = path.resolve(__dirname, '../..');
const APP_ART = path.join(ROOT, 'assets/themes/island');
const WORKSPACE_EXPORT = path.join(ROOT, 'assets/worlds/island/export');

// The approved Island sequence (PRODUCT_REQUIREMENTS "Exact progression content").
const ISLAND_NAMES = [
  'First tree',
  'Path',
  'Flowers and bushes',
  'Small house',
  'Bridge',
  'Pond',
  'Additional trees',
  'Larger house and details',
  'Final decorations',
  'Completed island',
];

const STAGES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const satisfies readonly Stage[];

// Stage 0: the island without clouds, the three clouds and the three water flow layers (D90, D93).
const BASE_LAYERS = ['empty_island', 'cloud_1', 'cloud_2', 'cloud_3', 'water_a', 'water_b', 'water_c'];

function island(): ThemeManifest {
  const result = themeManifest('island');
  if (!result.ok) {
    throw new Error(`island manifest invalid:\n${result.problems.join('\n')}`);
  }
  return result.manifest;
}

function layerIds(stage: Stage): string[] {
  return visibleLayers(island(), stage).map((layer) => layer.id);
}

function layersOf(unlockId: string): string[] {
  return island()
    .unlocks.find((unlock) => unlock.id === unlockId)!
    .adds.map((layer) => layer.id);
}

// A deep copy of the bundled export to break in one place.
function exportCopy(): Record<string, any> {
  return JSON.parse(JSON.stringify(islandManifestJson));
}

function problemsOf(raw: unknown, assets = ISLAND_ASSETS): readonly string[] {
  const result = manifestFromExport(raw, { themeId: 'island', name: 'Island', assets });
  return result.ok ? [] : result.problems;
}

describe('bundled Island manifest', () => {
  it('is valid: version 2, a 4:3 canvas, one base and exactly ten unlocks at 10%..100% with the approved names', () => {
    const manifest = island();
    expect(validateManifest(manifest)).toEqual([]);
    expect(manifest).toMatchObject({ themeId: 'island', version: 2, name: 'Island', canvas: { width: 2048, height: 1536 } });
    expect(manifest.base).toMatchObject({ id: 'empty_island', name: 'Empty island' });
    expect(manifest.unlocks.map((unlock) => unlock.milestone)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(manifest.unlocks.map((unlock) => unlock.thresholdPercent)).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    expect(manifest.unlocks.map((unlock) => unlock.name)).toEqual(ISLAND_NAMES);
    for (const unlock of manifest.unlocks) {
      expect(unlock.description.length).toBeGreaterThan(10);
      expect(unlock.adds.length).toBeGreaterThan(0);
    }
  });

  it('has stable, unique layer ids and z values, every layer inside the canvas', () => {
    const manifest = island();
    const all = [...manifest.base.layers, ...manifest.unlocks.flatMap((unlock) => unlock.adds)];
    expect(all).toHaveLength(49);
    expect(new Set(all.map((layer) => layer.id)).size).toBe(all.length);
    expect(new Set(all.map((layer) => layer.z)).size).toBe(all.length);
    expect(layersOf('first_tree')).toEqual(['first_tree_1', 'first_tree_2', 'first_tree_3']);
    expect(layersOf('small_house')).toEqual(['small_house_1', 'small_house_2']);
  });

  it('declares the one replacement: the 80% cottage removes both 40% cabin layers', () => {
    const removals = island().unlocks.filter((unlock) => unlock.removes.length > 0);
    expect(removals.map((unlock) => [unlock.milestone, unlock.removes])).toEqual([[8, ['small_house_1', 'small_house_2']]]);
  });

  it('maps every layer to a static asset, and the asset map to exactly the files on disk', () => {
    const manifest = island();
    const files = fs.readdirSync(path.join(APP_ART, '1536')).filter((file) => file.endsWith('.png'));
    const referenced = [...manifest.base.layers, ...manifest.unlocks.flatMap((unlock) => unlock.adds)].map((layer) => layer.file);
    expect(Object.keys(ISLAND_ASSETS).sort()).toEqual(files.sort());
    expect(referenced.sort()).toEqual(files.sort());
  });

  it('ships the approved export unchanged (never hand-edited): same manifest and same 1536 PNG bytes', () => {
    const read = (dir: string, file: string) => fs.readFileSync(path.join(dir, file));
    expect(read(APP_ART, 'island_manifest.json').equals(read(WORKSPACE_EXPORT, 'island_manifest.json'))).toBe(true);
    for (const file of Object.keys(ISLAND_ASSETS)) {
      expect({ file, same: read(path.join(APP_ART, '1536'), file).equals(read(path.join(WORKSPACE_EXPORT, '1536'), file)) }).toEqual({ file, same: true });
    }
  });

  it('PNG sizes are 0.75 of the canvas boxes (the 1536 app resolution)', () => {
    // PNG header: width and height are big-endian at bytes 16 and 20.
    for (const layer of [...island().base.layers, ...island().unlocks.flatMap((unlock) => unlock.adds)]) {
      const header = fs.readFileSync(path.join(APP_ART, '1536', layer.file)).subarray(0, 24);
      expect({ id: layer.id, width: header.readUInt32BE(16), height: header.readUInt32BE(20) }).toEqual({
        id: layer.id,
        width: layer.width * 0.75,
        height: layer.height * 0.75,
      });
    }
  });
});

describe('stored art versions (Phase 11 souvenirs)', () => {
  it('a souvenir earned today records the bundled Island version, and that version renders', () => {
    const bundled = themeManifest('island');
    expect(bundled.ok && bundled.manifest.version).toBe(CURRENT_THEME_VERSIONS.island);
    expect(themeManifestAt('island', CURRENT_THEME_VERSIONS.island)).toBe(bundled);
  });

  it('a version that is not bundled gets the fallback, never another version presented as it', () => {
    const missing = themeManifestAt('island', 1);
    expect(missing.ok).toBe(false);
    expect(!missing.ok && missing.problems[0]).toMatch(/island art version 1 is not bundled/);
  });
});

describe('stage → visible layers', () => {
  it('stage 0 is the empty island with its clouds and water sparkle layers', () => {
    expect(layerIds(0)).toEqual(BASE_LAYERS);
  });

  it('each stage adds its own unlock on top of the previous stage; only stage 8 removes anything', () => {
    for (const stage of STAGES.slice(1)) {
      const before = layerIds((stage - 1) as Stage);
      const unlock = unlockAt(island(), stage)!;
      const removed = new Set(unlock.removes);
      expect({ stage, layers: layerIds(stage) }).toEqual({
        stage,
        layers: [...before.filter((id) => !removed.has(id)), ...unlock.adds.map((layer) => layer.id)],
      });
    }
  });

  it('the small cabin shows at 40%-79% and is hidden from 80% on, with the cottage in its place', () => {
    for (const stage of STAGES) {
      const ids = layerIds(stage);
      expect({ stage, cabin: ids.includes('small_house_1') || ids.includes('small_house_2') }).toEqual({ stage, cabin: stage >= 4 && stage < 8 });
      expect({ stage, cottage: ids.includes('larger_house_1') }).toEqual({ stage, cottage: stage >= 8 });
    }
  });

  it('layers are drawn base first, then milestones in order', () => {
    const z = visibleLayers(island(), 10).map((layer) => layer.z);
    expect(z).toEqual([...z].sort((a, b) => a - b));
    expect(layerIds(10).slice(0, BASE_LAYERS.length)).toEqual(BASE_LAYERS);
    expect(layerIds(10)).toHaveLength(47);
  });

  it('describes every stage for VoiceOver and names every unlock for the callout', () => {
    expect(sceneDescription(island(), 0)).toBe('An empty floating island with grassy terraces, a stream and a waterfall.');
    expect(sceneDescription(island(), 4)).toBe('A small wooden cabin stands on the upper terrace.');
    expect(STAGES.slice(1).map((stage) => stageName('island', stage))).toEqual(ISLAND_NAMES);
    expect(stageName('island', 0)).toBeNull();
    expect(stageName('garden', 1)).toBeNull();
  });
});

describe('scene viewport (D78/D80: the art framed tightly, not the whole canvas)', () => {
  it('is the bounds of every layer of every stage plus the margin, inside the canvas', () => {
    const manifest = island();
    const viewport = sceneViewport(manifest, 12);
    // Layers span x 208..1848 and y 44..1404.
    expect(viewport).toEqual({ x: 196, y: 32, width: 1664, height: 1384 });
    for (const layer of [...manifest.base.layers, ...manifest.unlocks.flatMap((unlock) => unlock.adds)]) {
      expect({ id: layer.id, inside: layer.x >= viewport.x && layer.y >= viewport.y && layer.x + layer.width <= viewport.x + viewport.width && layer.y + layer.height <= viewport.y + viewport.height }).toEqual({ id: layer.id, inside: true });
    }
    // The same width shows the art 2048 / 1664 ≈ 1.23 times larger than the whole canvas.
    expect(2048 / viewport.width).toBeCloseTo(1.23, 2);
  });

  it('never exceeds the canvas: a huge margin gives the whole canvas', () => {
    expect(sceneViewport(island(), 1000)).toEqual({ x: 0, y: 0, width: 2048, height: 1536 });
  });
});

describe('ambient marks (Phase 10.5, D90)', () => {
  const all = () => [...island().base.layers, ...island().unlocks.flatMap((unlock) => unlock.adds)];

  it('marks three drifting clouds and three water flow layers on the base, and nine swaying trees', () => {
    const marked = all().filter((layer) => layer.ambient);
    expect(marked.filter((layer) => layer.ambient!.kind === 'cloud').map((layer) => layer.id)).toEqual(['cloud_1', 'cloud_2', 'cloud_3']);
    expect(marked.filter((layer) => layer.ambient!.kind === 'water').map((layer) => layer.id)).toEqual(['water_a', 'water_b', 'water_c']);
    const trees = marked.filter((layer) => layer.ambient!.kind === 'sway');
    // The first tree (10%) and the eight trees of 70%; nothing else sways.
    expect(trees.map((layer) => layer.id.replace(/_\d+$/, ''))).toEqual(['first_tree', ...Array<string>(8).fill('more_trees')]);
    expect(island().base.layers[0]!.ambient).toBeNull();
    for (const tree of trees) {
      // The reveal grows the tree from the same trunk base it sways around.
      expect({ id: tree.id, anchor: tree.anchor, incidental: tree.incidental }).toEqual({ id: tree.id, anchor: tree.ambient!.pivot, incidental: false });
    }
  });

  it('draws ambient layers above the base and below every unlock', () => {
    const base = island().base.layers;
    expect(base.map((layer) => layer.z)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(Math.min(...island().unlocks.flatMap((unlock) => unlock.adds.map((layer) => layer.z)))).toBeGreaterThan(6);
  });

  it('moves slowly and a little, each layer on its own period and phase', () => {
    const marks = all().flatMap((layer) => (layer.ambient ? [{ id: layer.id, ...layer.ambient }] : []));
    for (const mark of marks) {
      expect(Math.abs(mark.amplitude)).toBeLessThanOrEqual(AMBIENT_LIMITS.amplitude[mark.kind]);
      expect(mark.periodMs).toBeGreaterThanOrEqual(AMBIENT_LIMITS.periodMs.min);
      expect(mark.phase).toBeGreaterThanOrEqual(0);
      expect(mark.phase).toBeLessThan(1);
    }
    const trees = marks.filter((mark) => mark.kind === 'sway');
    expect(trees.every((mark) => mark.amplitude === AMBIENT_PRESETS.sway.amplitude)).toBe(true);
    // Staggered: no two trees share a phase, and their periods differ.
    expect(new Set(trees.map((mark) => mark.phase)).size).toBe(trees.length);
    expect(new Set(trees.map((mark) => mark.periodMs)).size).toBeGreaterThan(5);
    // The water flow layers share one period and take turns evenly (a, b, c = further downstream).
    const water = marks.filter((mark) => mark.kind === 'water');
    expect(water.map((mark) => mark.periodMs)).toEqual([AMBIENT_PRESETS.water.periodMs, AMBIENT_PRESETS.water.periodMs, AMBIENT_PRESETS.water.periodMs]);
    expect(water.map((mark) => mark.phase)).toEqual([0, 1 / 3, 2 / 3]);
    // Clouds drift toward the middle (cloud_1 and cloud_2 are left of centre, cloud_3 right).
    expect(marks.filter((mark) => mark.kind === 'cloud').map((mark) => Math.sign(mark.amplitude))).toEqual([1, 1, -1]);
  });

  it('keeps the decoded art of one world inside the 32 MiB budget (ASSET_SPEC)', () => {
    // Every layer of every stage at the 1536 file size, RGBA: an upper bound, since Home decodes
    // each image at its displayed size.
    const bytes = all().reduce((sum, layer) => sum + layer.width * 0.75 * layer.height * 0.75 * 4, 0);
    expect(bytes / 2 ** 20).toBeLessThan(32);
    expect(Math.round(bytes / 2 ** 20)).toBe(14);
  });

  it('refuses a mark on the wrong layer, an unknown kind, too much motion or a pivot outside the tree', () => {
    const onBase = exportCopy();
    onBase.ambient[0].ambient = { kind: 'sway', pivot: { x: 300, y: 1000 } };
    expect(problemsOf(onBase)).toEqual(['layer cloud_1: a sway belongs to an unlock layer, not the base']);
    const cloudInUnlock = exportCopy();
    cloudInUnlock.unlocks[1].layers[0].ambient = { kind: 'cloud' };
    expect(problemsOf(cloudInUnlock)).toEqual(['layer path_1: a cloud layer belongs to the base']);
    const unknown = exportCopy();
    unknown.ambient[3].ambient = { kind: 'rain' };
    expect(problemsOf(unknown)).toEqual(expect.arrayContaining(['ambient[3].ambient: unknown kind rain']));
    const pivot = exportCopy();
    pivot.unlocks[0].layers[0].ambient.pivot = { x: 0, y: 0 };
    expect(problemsOf(pivot)).toEqual(['layer first_tree_1: sway pivot missing or outside the layer']);
    const notAList = exportCopy();
    notAList.ambient = { kind: 'cloud' };
    expect(problemsOf(notAList)).toEqual(['ambient must be a list']);
  });

  it('validates the motion numbers themselves', () => {
    const manifest = island();
    const cloud = manifest.base.layers[1]!;
    const tree = manifest.unlocks[0]!.adds.find((layer) => layer.ambient)!;
    const withLayer = (changed: typeof cloud, at: 'base' | 'tree') =>
      validateManifest({
        ...manifest,
        base: { ...manifest.base, layers: manifest.base.layers.map((layer) => (at === 'base' && layer.id === changed.id ? changed : layer)) },
        unlocks: manifest.unlocks.map((unlock) => ({ ...unlock, adds: unlock.adds.map((layer) => (at === 'tree' && layer.id === changed.id ? changed : layer)) })),
      });
    expect(withLayer({ ...tree, ambient: { ...tree.ambient!, amplitude: 9 } }, 'tree')).toEqual([`layer ${tree.id}: sway amplitude 9 outside 0..8`]);
    expect(withLayer({ ...tree, ambient: { ...tree.ambient!, periodMs: 500 } }, 'tree')).toEqual([`layer ${tree.id}: ambient period 500 ms outside 2000..120000`]);
    expect(withLayer({ ...tree, ambient: { ...tree.ambient!, phase: 1 } }, 'tree')).toEqual([`layer ${tree.id}: ambient phase 1 outside 0..1`]);
    // cloud_1 sits at the left edge of the art: drifting left would leave the framed sky.
    expect(withLayer({ ...cloud, ambient: { ...cloud.ambient!, amplitude: -40 } }, 'base')).toEqual(['layer cloud_1: cloud drifts outside the art']);
  });
});

describe('theme-aware completion copy (D83)', () => {
  it('names the island or the garden', () => {
    expect(worldCompleteCopy('island')).toEqual({ title: 'Your island is complete!', detail: 'You’ve unlocked every part of your world.' });
    expect(worldCompleteCopy('garden').title).toBe('Your garden is complete!');
  });
});

describe('thresholds: one minor unit below, at and above each unlock', () => {
  // A target that divides evenly and one that does not (thresholds round up, ceil(T × k / 10)).
  it.each([150_000, 1_003, 333_333])('target %d', (target) => {
    for (let k = 1; k <= 10; k += 1) {
      const threshold = stageThresholdMinor(target, k as Stage);
      const expected = (stage: number) => layerIds(stage as Stage);
      expect({ k, below: layerIds(stageFor(threshold - 1, target)) }).toEqual({ k, below: expected(k - 1) });
      expect({ k, at: layerIds(stageFor(threshold, target)) }).toEqual({ k, at: expected(k) });
      expect({ k, above: layerIds(stageFor(threshold + 1, target)) }).toEqual({ k, above: expected(k) });
    }
  });

  it('the €2,000 examples: 199.99 base, 200 first tree, 1,000 bridge, 1,800 final decorations, 2,000 and 2,100 complete', () => {
    const at = (balance: number) => stageFor(balance, 200_000);
    expect([at(19_999), at(20_000), at(100_000), at(180_000), at(200_000), at(210_000)]).toEqual([0, 1, 5, 9, 10, 10]);
    expect(layerIds(at(210_000))).toEqual(layerIds(10));
    // 9.99% stays on the base, 125% shows the complete island.
    expect(layerIds(at(19_980))).toEqual(BASE_LAYERS);
    expect(layerIds(at(250_000))).toEqual(layerIds(10));
  });
});

describe('broken exports are refused with reasons, never thrown', () => {
  it('not an object', () => {
    expect(problemsOf(null)).toEqual(['manifest must be an object']);
    expect(problemsOf('island')).toEqual(['manifest must be an object']);
  });

  it('a missing asset', () => {
    const { 'island_s05_p1.png': _bridge, ...assets } = ISLAND_ASSETS;
    expect(problemsOf(islandManifestJson, assets)).toEqual(['layer bridge_1: missing asset island_s05_p1.png']);
  });

  it('nine unlocks, a wrong threshold or milestones out of order', () => {
    const nine = exportCopy();
    nine.unlocks.pop();
    expect(problemsOf(nine)).toContain('expected 10 unlocks, got 9');
    const threshold = exportCopy();
    threshold.unlocks[2].thresholdPercent = 35;
    expect(problemsOf(threshold)).toEqual(['unlock flowers_bushes: threshold 35% must be 30%']);
    const order = exportCopy();
    [order.unlocks[0], order.unlocks[1]] = [order.unlocks[1], order.unlocks[0]];
    expect(problemsOf(order)).toEqual(
      expect.arrayContaining(['unlock path: milestone 2 out of order', 'unlock first_tree: milestone 1 out of order']),
    );
  });

  it('duplicate ids, a layer outside the canvas, an anchor outside its layer', () => {
    const duplicate = exportCopy();
    duplicate.unlocks[1].layers[0].id = 'first_tree_1';
    expect(problemsOf(duplicate)).toContain('layer first_tree_1: duplicate id');
    const outside = exportCopy();
    outside.unlocks[0].layers[0].x = 1900;
    expect(problemsOf(outside)).toEqual(expect.arrayContaining(['layer first_tree_1: outside the canvas']));
    const anchor = exportCopy();
    anchor.unlocks[0].layers[0].anchor = { x: 0, y: 0 };
    expect(problemsOf(anchor)).toEqual(['layer first_tree_1: anchor outside the layer']);
  });

  it('a replacement both sides do not agree on, or one pointing forward', () => {
    const oneSided = exportCopy();
    delete oneSided.unlocks[3].hiddenFromMilestone;
    expect(problemsOf(oneSided)).toEqual(['unlock small_house: hiddenFromMilestone must be 8']);
    const forward = exportCopy();
    forward.unlocks[3].hides = ['larger_house'];
    forward.unlocks[7].hiddenFromMilestone = 4;
    forward.unlocks[7].hides = [];
    delete forward.unlocks[3].hiddenFromMilestone;
    expect(problemsOf(forward)).toEqual(expect.arrayContaining(['unlock small_house: removes unknown or later layer larger_house_1']));
  });

  it('a canvas that is not 4:3, a wrong theme or a missing field', () => {
    const square = exportCopy();
    square.canvas.height = 2048;
    expect(problemsOf(square)).toContain('canvas must be 4:3, got 2048×2048');
    const garden = exportCopy();
    garden.themeId = 'garden';
    expect(problemsOf(garden)).toEqual(['themeId must be island']);
    const noName = exportCopy();
    delete noName.unlocks[4].name;
    expect(problemsOf(noName)).toEqual(expect.arrayContaining(['unlocks[4].name must be a string']));
  });

  it('Garden has no art yet, so its scene uses the fallback', () => {
    expect(themeManifest('garden').ok).toBe(false);
  });
});
