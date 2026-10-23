import type { ThemeId } from '../progression/theme-ids';

// What the app lets a person do, as plain input to commands and screens (v1.2 section 4,
// docs/ARCHITECTURE.md "Purchases and capabilities"). Pro is a set of capabilities, not a global
// flag checked ad hoc. Everything not listed here is identical in Free and Pro: the ledger,
// history, corrections, deadline pace, Finish/Reopen, souvenirs, the three fixed challenges and
// the weekly reminder.

export type AccessLevel = 'free' | 'pro';

export type Capabilities = {
  level: AccessLevel;
  // Maximum number of open goals (active + paused); null means unlimited.
  openGoalLimit: number | null;
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
  openGoalLimit: 1,
  themes: Object.freeze({ island: true, garden: false }),
  switchOpenGoalTheme: false,
  proStatistics: false,
});

export const PRO_CAPABILITIES: Capabilities = Object.freeze({
  level: 'pro',
  openGoalLimit: null,
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

// Whether one more goal may become open (create or Reopen), given how many are open now.
export function hasOpenGoalSlot(capabilities: Capabilities, openGoalCount: number): boolean {
  if (!Number.isInteger(openGoalCount) || openGoalCount < 0) {
    throw new RangeError('openGoalCount must be a nonnegative integer');
  }
  return capabilities.openGoalLimit === null || openGoalCount < capabilities.openGoalLimit;
}

export function canUseTheme(capabilities: Capabilities, themeId: ThemeId): boolean {
  return capabilities.themes[themeId];
}
