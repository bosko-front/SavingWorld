import type { ThemeId } from '@/core/progression';

// English copy for the world picker (Phase 17; DESIGN_SYSTEM "Theme picker", owner decisions D75,
// D97, D122). Calm and exact: a change keeps every amount, and the locked Garden after a lost Pro
// entitlement is explained kindly, in one or two short sentences, with the free way forward.

const THEME_NAMES: Record<ThemeId, string> = { island: 'Island', garden: 'Garden' };

export function themeName(themeId: ThemeId): string {
  return THEME_NAMES[themeId];
}

// "an Island" / "a Garden".
function withArticle(themeId: ThemeId): string {
  return themeId === 'island' ? 'an Island' : 'a Garden';
}

export const THEME_CARD_COPY = {
  current: 'chosen',
  pro: 'Pro',
  lockedLabel: 'part of Pro',
  lockedHint: 'Opens Saving Worlds Pro.',
} as const;

export const THEME_PICKER_COPY = {
  screenTitle: 'Choose a world',
  section: 'World',
  intro: 'Your savings, target and progress stay the same in either world.',
  changed: (themeId: ThemeId) => `Your goal now grows ${withArticle(themeId)}`,
  // A Garden goal without Pro (D75): kept as it is; the person may grow it as an Island themselves.
  lockedTitle: 'Your Garden is kept just as it is',
  lockedMessage: 'Without Pro it can’t grow further. To keep saving here, grow this goal as an Island. Your savings, target and souvenir stay the same.',
  confirmTitle: 'Grow this goal as an Island?',
  confirmMessage: 'Your savings, target and souvenir stay the same, and the Island shows the same progress. You can choose the Garden again with Pro.',
  confirmButton: 'Grow as an Island',
  cancel: 'Cancel',
  chooseButton: 'Choose a world',
} as const;
