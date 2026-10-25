import type { Stage, ThemeId } from '@/core/progression';

import { unlockAt, type ManifestResult } from './manifest';
import { manifestFromExport } from './theme-export';
import { ISLAND_ASSETS, islandManifestJson } from './themes/island-assets';

// Bundled theme manifests by theme id. Registry access says which art exists; it never grants a
// theme (capabilities in @/core/access do). Garden art arrives in Phase 17; until then its scene
// shows the controlled fallback.

const LOADERS: Record<ThemeId, () => ManifestResult> = {
  island: () => manifestFromExport(islandManifestJson, { themeId: 'island', name: 'Island', assets: ISLAND_ASSETS }),
  garden: () => ({ ok: false, problems: ['Garden art is not bundled yet (Phase 17).'] }),
};

const cache = new Map<ThemeId, ManifestResult>();

// Parsed and validated once per process. A problem is reported in development only; the scene
// shows its fallback and the ledger is untouched.
export function themeManifest(themeId: ThemeId): ManifestResult {
  let result = cache.get(themeId);
  if (!result) {
    result = LOADERS[themeId]();
    cache.set(themeId, result);
    if (!result.ok && __DEV__ && themeId !== 'garden') {
      console.warn(`[worlds] ${themeId} manifest is invalid:\n${result.problems.join('\n')}`);
    }
  }
  return result;
}

// The name of the unlock at `stage` ("Small house"), or null when the theme has no valid art or
// the stage is the base.
export function stageName(themeId: ThemeId, stage: Stage): string | null {
  const result = themeManifest(themeId);
  return result.ok ? (unlockAt(result.manifest, stage)?.name ?? null) : null;
}
