import fs from 'fs';
import path from 'path';

import { stageFor, stageThresholdMinor, type Stage } from '@/core/progression';
import { sceneDescription, sceneViewport, unlockAt, validateManifest, visibleLayers, type ThemeManifest } from '@/features/worlds/manifest';
import { stageName, themeManifest } from '@/features/worlds/registry';
import { manifestFromExport } from '@/features/worlds/theme-export';
import { ISLAND_ASSETS, islandManifestJson } from '@/features/worlds/themes/island-assets';

// Phase 09: the Island manifest contract (docs/ASSET_SPEC.md), the stage → layer mapping at every
// threshold and the controlled refusal of broken exports. Rendering is in
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
  it('is valid: version 1, a 4:3 canvas, one base and exactly ten unlocks at 10%..100% with the approved names', () => {
    const manifest = island();
    expect(validateManifest(manifest)).toEqual([]);
    expect(manifest).toMatchObject({ themeId: 'island', version: 1, name: 'Island', canvas: { width: 2048, height: 1536 } });
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
    expect(all).toHaveLength(33);
    expect(new Set(all.map((layer) => layer.id)).size).toBe(all.length);
    expect(new Set(all.map((layer) => layer.z)).size).toBe(all.length);
    expect(layersOf('first_tree')).toEqual(['first_tree_1', 'first_tree_2']);
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

describe('stage → visible layers', () => {
  it('stage 0 is the empty island only', () => {
    expect(layerIds(0)).toEqual(['empty_island']);
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
    expect(layerIds(10)[0]).toBe('empty_island');
    expect(layerIds(10)).toHaveLength(31);
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
    expect(layerIds(at(19_980))).toEqual(['empty_island']);
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
