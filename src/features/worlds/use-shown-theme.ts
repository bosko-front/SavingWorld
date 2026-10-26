import { useIsFocused } from 'expo-router';
import { useState } from 'react';

import type { ThemeId } from '@/core/progression';
import { useAppActive, useReduceMotion } from '@/shared/ui/motion-preferences';

// Which world Home draws after a theme change (Phase 17): the committed theme, but only once Home can
// be seen. While the picker sheet covers Home, or the app is in the background, the old world stays,
// so the change settles in front of the person as one brief crossfade when they come back (never a
// replay of milestones; the stage is the same in both worlds). Under Reduce Motion the new world
// replaces the old one at once. Presentation only: the committed goal keeps the new theme throughout.
export function useShownTheme(themeId: ThemeId): { themeId: ThemeId; crossfade: boolean } {
  const focused = useIsFocused();
  const active = useAppActive();
  const reduced = useReduceMotion();
  const [shown, setShown] = useState(themeId);
  if (shown !== themeId && focused && active) {
    setShown(themeId);
  }
  return { themeId: shown, crossfade: !reduced };
}
