// Stable theme identifiers stored on goals and souvenirs. Island is the Free theme, Garden the Pro
// theme (v1.2 section 4). Art, manifests and assets belong to the worlds feature (Phase 09/17);
// both themes use the same stage function.
export const THEME_IDS = ['island', 'garden'] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}

// The art version a souvenir earned today records (v1.2 "Collectible: themeVersion"). It must equal
// the version of the bundled manifest (tests/unit/world-manifest.test.ts checks Island); a later art
// revision raises it and keeps every stored version renderable (docs/ASSET_SPEC.md). Island is at
// version 2 since the Living Island export (D91, D94); Garden at version 1 since Phase 17 (D120, D123).
export const CURRENT_THEME_VERSIONS: Readonly<Record<ThemeId, number>> = Object.freeze({ island: 2, garden: 1 });

export function currentThemeVersion(themeId: ThemeId): number {
  return CURRENT_THEME_VERSIONS[themeId];
}
