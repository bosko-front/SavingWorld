import type { Stage, ThemeId } from '@/core/progression';

import { unlockAt, type ManifestResult } from './manifest';
import { manifestFromExport } from './theme-export';
import { GARDEN_ASSETS, gardenManifestJson } from './themes/garden-assets';
import { ISLAND_ASSETS, islandManifestJson } from './themes/island-assets';

// Bundled theme manifests by theme id: the Island (Free) and, since Phase 17, the Garden (Pro).
// Registry access says which art exists; it never grants a theme (capabilities in @/core/access do):
// bundled Garden art is not a Garden right.

const LOADERS: Record<ThemeId, () => ManifestResult> = {
  island: () => manifestFromExport(islandManifestJson, { themeId: 'island', name: 'Island', assets: ISLAND_ASSETS }),
  garden: () => manifestFromExport(gardenManifestJson, { themeId: 'garden', name: 'Garden', assets: GARDEN_ASSETS }),
};

const cache = new Map<ThemeId, ManifestResult>();

// Parsed and validated once per process. A problem is reported in development only; the scene
// shows its fallback and the ledger is untouched.
export function themeManifest(themeId: ThemeId): ManifestResult {
  let result = cache.get(themeId);
  if (!result) {
    result = LOADERS[themeId]();
    cache.set(themeId, result);
    if (!result.ok && __DEV__) {
      console.warn(`[worlds] ${themeId} manifest is invalid:\n${result.problems.join('\n')}`);
    }
  }
  return result;
}

// The art of a theme at a stored version (a souvenir's theme and version, docs/ASSET_SPEC.md "Store
// only theme IDs and version references"). The bundled art serves the version it was exported as;
// an art revision must keep every version a souvenir may have stored. A version that is not bundled
// gets the scene's fallback, never another version's art presented as the old one.
export function themeManifestAt(themeId: ThemeId, version: number): ManifestResult {
  const result = themeManifest(themeId);
  if (!result.ok || result.manifest.version === version) {
    return result;
  }
  return { ok: false, problems: [`${themeId} art version ${version} is not bundled (bundled: ${result.manifest.version}).`] };
}

// The name of the unlock at `stage` ("Small house"), or null when the theme has no valid art or
// the stage is the base.
export function stageName(themeId: ThemeId, stage: Stage): string | null {
  const result = themeManifest(themeId);
  return result.ok ? (unlockAt(result.manifest, stage)?.name ?? null) : null;
}
