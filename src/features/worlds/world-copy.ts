import type { ThemeId } from '@/core/progression';

// English copy that names the person's world by its theme (owner decision D83), so Garden (Phase 17)
// reads "Your garden is complete!" without another string.

const WORLD_NOUNS: Record<ThemeId, string> = { island: 'island', garden: 'garden' };

export type WorldCompleteCopy = { title: string; detail: string };

// Home's milestone card once every unlock is reached (B ≥ T, stage 10).
export function worldCompleteCopy(themeId: ThemeId): WorldCompleteCopy {
  return { title: `Your ${WORLD_NOUNS[themeId]} is complete!`, detail: 'You’ve unlocked every part of your world.' };
}
