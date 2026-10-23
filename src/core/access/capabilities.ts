import type { ThemeId } from '../progression/theme-ids';

// What the app lets a person do, as plain input to commands and screens (v1.2 section 4 as changed
// by owner decision D74, docs/ARCHITECTURE.md "Purchases and capabilities"). Pro is a set of capabilities, not a global
// flag checked ad hoc. Everything not listed here is identical in Free and Pro: the ledger,
// history, corrections, deadline pace, Finish/Reopen, souvenirs, the three fixed challenges and
// the weekly reminder.

export type AccessLevel = 'free' | 'pro';

export type Capabilities = {
  level: AccessLevel;
  // Maximum number of goals in any status (active, paused, completed); null means unlimited. Free
  // keeps one goal and may delete it to start over (D74).
  goalLimit: number | null;
  // Themes a goal may use. Kept per theme so a later product could grant one theme on its own;
  // no such product exists in Release 1.0.
  themes: Readonly<Record<ThemeId, boolean>>;
  // Switching Island/Garden on an open goal.
  switchOpenGoalTheme: boolean;
  // The four Pro statistics on one screen.
  proStatistics: boolean;
};

export const FREE_CAPABILITIES: Capabilities = Object.freeze({
  level: 'free',
  goalLimit: 1,
  themes: Object.freeze({ island: true, garden: false }),
  switchOpenGoalTheme: false,
  proStatistics: false,
});

export const PRO_CAPABILITIES: Capabilities = Object.freeze({
  level: 'pro',
  goalLimit: null,
  themes: Object.freeze({ island: true, garden: true }),
  switchOpenGoalTheme: true,
  proStatistics: true,
});

// Production behavior until Phase 15 integrates verified StoreKit entitlements: Free. There is no
// override; only a verified entitlement may produce PRO_CAPABILITIES.
export const DEFAULT_ACCESS_LEVEL: AccessLevel = 'free';

export function capabilitiesFor(level: AccessLevel): Capabilities {
  return level === 'pro' ? PRO_CAPABILITIES : FREE_CAPABILITIES;
}

function checkCount(goalCount: number): void {
  if (!Number.isInteger(goalCount) || goalCount < 0) {
    throw new RangeError('goalCount must be a nonnegative integer');
  }
}

// Whether one more goal may be created, given how many goals exist now (any status).
export function hasGoalSlot(capabilities: Capabilities, goalCount: number): boolean {
  checkCount(goalCount);
  return capabilities.goalLimit === null || goalCount < capabilities.goalLimit;
}

// Whether the existing goals fit the limit. Reopen adds no goal, so it is allowed while this holds;
// after a lost Pro entitlement with several goals it does not (Phase 16 lets the person choose the
// one goal they keep using, D74).
export function withinGoalLimit(capabilities: Capabilities, goalCount: number): boolean {
  checkCount(goalCount);
  return capabilities.goalLimit === null || goalCount <= capabilities.goalLimit;
}

export function canUseTheme(capabilities: Capabilities, themeId: ThemeId): boolean {
  return capabilities.themes[themeId];
}
