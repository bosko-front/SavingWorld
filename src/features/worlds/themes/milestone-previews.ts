import type { Stage, ThemeId } from '@/core/progression';

import type { SceneAsset } from '../manifest';

// Milestone object previews (Phase 19, D136): one small still picture per unlock of each theme, the
// main object that milestone adds (the most recognizable one when it adds several). Built from the
// approved 2048 exports by scripts/make_milestone_previews.py from assets/worlds/milestone-previews.json
// (layers and canvas crop per milestone), 192 px at most (64 pt at 3x), transparent. The art is not
// changed; regenerate after a re-export, never edit these PNGs. `object` is the preview's spoken name.
//
// tests/unit/milestone-previews.test.ts checks this map against the spec and the files on disk.

export type MilestonePreview = { source: SceneAsset; object: string };

export type UnlockStage = Exclude<Stage, 0>;

export const MILESTONE_PREVIEWS: Readonly<Record<ThemeId, Readonly<Record<UnlockStage, MilestonePreview>>>> = {
  island: {
    1: { source: require('../../../../assets/themes/island/previews/island_preview_01.png'), object: 'a leafy tree' },
    2: { source: require('../../../../assets/themes/island/previews/island_preview_02.png'), object: 'a stone path with steps' },
    3: { source: require('../../../../assets/themes/island/previews/island_preview_03.png'), object: 'flowering bushes' },
    4: { source: require('../../../../assets/themes/island/previews/island_preview_04.png'), object: 'a small wooden cabin' },
    5: { source: require('../../../../assets/themes/island/previews/island_preview_05.png'), object: 'an arched wooden bridge' },
    6: { source: require('../../../../assets/themes/island/previews/island_preview_06.png'), object: 'a pond with lily pads' },
    7: { source: require('../../../../assets/themes/island/previews/island_preview_07.png'), object: 'a pine tree' },
    8: { source: require('../../../../assets/themes/island/previews/island_preview_08.png'), object: 'a cottage with a red roof' },
    9: { source: require('../../../../assets/themes/island/previews/island_preview_09.png'), object: 'a wooden bench' },
    10: { source: require('../../../../assets/themes/island/previews/island_preview_10.png'), object: 'a dock with a rowing boat' },
  },
  garden: {
    1: { source: require('../../../../assets/themes/garden/previews/garden_preview_01.png'), object: 'rows of seedlings and sunflowers' },
    2: { source: require('../../../../assets/themes/garden/previews/garden_preview_02.png'), object: 'a raised flower bed' },
    3: { source: require('../../../../assets/themes/garden/previews/garden_preview_03.png'), object: 'a patch of pink flowers' },
    4: { source: require('../../../../assets/themes/garden/previews/garden_preview_04.png'), object: 'a pink blossom tree' },
    5: { source: require('../../../../assets/themes/garden/previews/garden_preview_05.png'), object: 'a paved path with stairs' },
    6: { source: require('../../../../assets/themes/garden/previews/garden_preview_06.png'), object: 'a small fountain' },
    7: { source: require('../../../../assets/themes/garden/previews/garden_preview_07.png'), object: 'a bench and a birdbath' },
    8: { source: require('../../../../assets/themes/garden/previews/garden_preview_08.png'), object: 'a glass greenhouse' },
    9: { source: require('../../../../assets/themes/garden/previews/garden_preview_09.png'), object: 'a rose-covered pergola' },
    10: { source: require('../../../../assets/themes/garden/previews/garden_preview_10.png'), object: 'a small floating islet with a pine' },
  },
};

// The preview of the object a stage unlocks, or null for the base (stage 0), which unlocks nothing.
export function milestonePreview(themeId: ThemeId, stage: Stage): MilestonePreview | null {
  return stage === 0 ? null : (MILESTONE_PREVIEWS[themeId]?.[stage] ?? null);
}
