import * as Haptics from 'expo-haptics';

// Semantic haptics (docs/DESIGN_SYSTEM.md "Haptics", DECISIONS D42). Screens call these four
// helpers, never expo-haptics directly (ESLint enforces it). A haptic confirms a moment the person
// caused and is never the only feedback: the screen, a toast or an inline message says the same in
// words. iOS applies the System Haptics setting itself, so there is no in-app toggle.
//
// Calls are fire-and-forget. A missing or failing haptics engine must never block or fail a flow,
// so both a synchronous throw and a rejected promise are swallowed here on purpose.

function fire(play: () => Promise<void>): void {
  try {
    play().catch(() => undefined);
  } catch {
    // No haptics engine on this device or build; the visible feedback is unaffected.
  }
}

// After a committed deposit, withdrawal, entry edit or entry delete (with its toast); after Finish;
// when a visible challenge attempt becomes Completed.
function success(): void {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

// Once per submit that a rule rejected (negative running balance, future date, Free open-goal
// limit), together with the inline explanation. Never for failed storage I/O.
function warning(): void {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

// Once per committed stage unlock, coalesced across thresholds (Phase 10). The first 100% uses
// success instead.
function milestone(): void {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

// Custom selection controls only (goal switcher, theme picker, challenge type). Native @expo/ui
// pickers and switches already give system feedback.
function selection(): void {
  fire(() => Haptics.selectionAsync());
}

export const haptics = { success, warning, milestone, selection } as const;
