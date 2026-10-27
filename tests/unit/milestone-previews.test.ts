import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { THEME_IDS, type Stage } from '@/core/progression';
import { MILESTONE_PREVIEWS, milestonePreview } from '@/features/worlds/themes/milestone-previews';

// Milestone object previews (D136): every unlock of both themes has a small transparent picture made
// by scripts/make_milestone_previews.py from layers that really belong to that unlock.

const ROOT = join(__dirname, '..', '..');
const spec = JSON.parse(readFileSync(join(ROOT, 'assets/worlds/milestone-previews.json'), 'utf8')) as {
  size: number;
  themes: Record<string, Record<string, { object: string; layers: string[]; crop: [number, number, number, number] }>>;
};

function pngHeader(path: string) {
  const bytes = readFileSync(path);
  expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG');
  // IHDR: width, height, bit depth, colour type (6 = RGBA).
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), depth: bytes[24], colourType: bytes[25] };
}

describe('milestone previews', () => {
  it('covers all ten unlocks of every theme and nothing for the base', () => {
    for (const themeId of THEME_IDS) {
      expect(Object.keys(MILESTONE_PREVIEWS[themeId]).map(Number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(milestonePreview(themeId, 0)).toBeNull();
    }
  });

  it.each(THEME_IDS.flatMap((themeId) => ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const).map((stage: Stage) => [themeId, stage] as const)))(
    '%s %i: small transparent PNG from its own unlock, named like the spec',
    (themeId, stage) => {
      const entry = spec.themes[themeId]?.[String(stage)];
      expect(entry).toBeDefined();
      expect(milestonePreview(themeId, stage)?.object).toBe(entry?.object);

      const manifest = JSON.parse(readFileSync(join(ROOT, `assets/themes/${themeId}/${themeId}_manifest.json`), 'utf8')) as {
        unlocks: { milestone: number; layers: { id: string }[] }[];
      };
      const unlockLayers = manifest.unlocks.find((unlock) => unlock.milestone === stage)?.layers.map((layer) => layer.id) ?? [];
      for (const layer of entry?.layers ?? []) {
        expect(unlockLayers).toContain(layer);
      }

      const file = join(ROOT, `assets/themes/${themeId}/previews/${themeId}_preview_${String(stage).padStart(2, '0')}.png`);
      const header = pngHeader(file);
      expect(Math.max(header.width, header.height)).toBeLessThanOrEqual(spec.size);
      expect(Math.max(header.width, header.height)).toBeGreaterThanOrEqual(64);
      expect([header.depth, header.colourType]).toEqual([8, 6]);
      expect(statSync(file).size).toBeLessThan(80_000);
    },
  );
});
