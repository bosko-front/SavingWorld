// English copy for Collection (Phase 11, owner decisions D98, D101, D112): the gallery of finished
// worlds and one souvenir's detail. Status words and captions with values stay in
// `collection-model.ts`; this module holds the screens' fixed lines.

// The Collection tab: its undiscovered-gallery empty state, intro and sections.
export const COLLECTION_COPY = {
  emptyTitle: 'Your gallery of worlds',
  emptyMessage: 'Each goal that reaches its target leaves its finished world here as a souvenir. It stays, even if you save less later.',
  intro: 'Every world tells a story of something you achieved.',
  completedTitle: 'Completed worlds',
  openTitle: 'Still growing',
  openCaption: 'These worlds reached their target and their goals are still open. Finish one on Home when you’re done saving.',
  cardHint: 'Shows the souvenir and the goal now.',
} as const;

// One souvenir's detail: the missing-goal notice, the summary's facts and the two actions.
export const SOUVENIR_COPY = {
  notFoundTitle: 'Not in Collection',
  notFoundMessage: 'This goal was deleted or hasn’t reached its target yet.',
  saved: 'saved',
  earned: 'Earned',
  targetThen: 'Target when completed',
  targetNow: 'Target now',
  target: 'Target',
  reopenDetail: 'Edit it or record savings again.',
  readOnlyDetail: 'Read-only until Pro returns.',
  deleteHint: 'Asks before deleting the goal, its history and this souvenir.',
} as const;

// The summary's spoken amount: "Saved €100.00".
export function savedSentence(saved: string): string {
  return `Saved ${saved}`;
}

// Reopen's hint: "Makes Trip an open goal again."
export function reopenHint(title: string): string {
  return `Makes ${title} an open goal again.`;
}
