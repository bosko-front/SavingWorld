import { createContext, useContext } from 'react';

import type { Insets } from './metrics';

// Insets inside the scene region that the scene's content (the world art) must stay clear of. A
// full-bleed scene region (AdaptiveGoalLayout `sceneBleed`, owner decision D80) reaches under the
// transparent navigation bar and the status bar and to the window's side edges; its backdrop may
// fill all of it, its art may not. Everywhere else the region is already safe and the insets are 0.
export const NO_SCENE_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

export const SceneInsetsContext = createContext<Insets>(NO_SCENE_INSETS);

export function useSceneInsets(): Insets {
  return useContext(SceneInsetsContext);
}
