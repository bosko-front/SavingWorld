// Stable theme identifiers stored on goals and souvenirs. Island is the Free theme, Garden the Pro
// theme (v1.2 section 4). Art, manifests and versions belong to the worlds feature (Phase 09/17);
// both themes use the same stage function.
export const THEME_IDS = ['island', 'garden'] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}
