import { MILESTONE_COUNT, type Stage, type ThemeId } from '@/core/progression';

// English copy that names the person's world by its theme (owner decision D83), so Garden (Phase 17)
// reads "Your garden is complete!" without another string.

const WORLD_NOUNS: Record<ThemeId, string> = { island: 'island', garden: 'garden' };

// "island" / "garden", for copy that names the person's world.
export function worldNoun(themeId: ThemeId): string {
  return WORLD_NOUNS[themeId];
}

export type WorldCompleteCopy = { title: string; detail: string };

// Home's milestone card once every unlock is reached (B ≥ T, stage 10).
export function worldCompleteCopy(themeId: ThemeId): WorldCompleteCopy {
  return { title: `Your ${WORLD_NOUNS[themeId]} is complete!`, detail: 'You’ve unlocked every part of your world.' };
}

const SCENE_NAMES: Record<ThemeId, string> = { island: 'Island', garden: 'Garden' };

// The scene's spoken name: "Island world, 4 of 10 milestones unlocked", or that it can't be shown.
export function sceneLabel(themeId: ThemeId, stage: Stage, shown: boolean): string {
  const unlocked = `${stage} of ${MILESTONE_COUNT} milestones unlocked`;
  return shown ? `${SCENE_NAMES[themeId]} world, ${unlocked}` : `${SCENE_NAMES[themeId]} world can’t be shown, ${unlocked}`;
}

// The scene region's fallback when the art can't be drawn (its savings are never affected).
export const SCENE_FALLBACK_COPY = {
  title: 'Your world can’t be shown right now',
  message: 'Your savings are safe and up to date.',
} as const;

// The fallback's one spoken element: the scene's name, then its message.
export function sceneFallbackLabel(sceneName: string): string {
  return `${sceneName}. ${SCENE_FALLBACK_COPY.title}. ${SCENE_FALLBACK_COPY.message}`;
}

// Home's in-scene unlock message.
export const UNLOCK_BANNER_COPY = {
  dismissHint: 'Dismisses the message.',
} as const;

// The Next milestone quest's small picture of the object it unlocks (D136): "Shows a pond with lily pads."
export function milestonePreviewLabel(object: string): string {
  return `Shows ${object}.`;
}
