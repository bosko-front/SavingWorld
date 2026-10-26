import { create } from 'zustand';

// The one "a quest was just completed" signal (Phase 13). The shared entry form notes it after a
// commit whose `LedgerMutationResult.completedAttemptId` is set (Phase 12, D103: null on a replay
// or a historical correction), and the Challenges tab celebrates it once in the quest's card the
// next time it is on screen, then forgets it. In memory only: a relaunch never replays it.
//
// `onChallenges` says the entry was saved from the Challenges tab, which is on screen again when
// the sheet closes: there the card plays the action's one success haptic (the form skips its own).
// From Home or History the form keeps its haptic and the card later celebrates silently.

export type CompletedQuest = { attemptId: string; goalId: string; onChallenges: boolean };

type CompletedQuestStore = { pending: CompletedQuest | null };

export const useCompletedQuestStore = create<CompletedQuestStore>()(() => ({ pending: null }));

export function noteCompletedQuest(quest: CompletedQuest): void {
  useCompletedQuestStore.setState({ pending: quest });
}

// The pending quest, cleared, when it belongs to `goalId`; otherwise null and it stays pending.
export function takeCompletedQuest(goalId: string): CompletedQuest | null {
  const { pending } = useCompletedQuestStore.getState();
  if (pending?.goalId !== goalId) {
    return null;
  }
  useCompletedQuestStore.setState({ pending: null });
  return pending;
}
