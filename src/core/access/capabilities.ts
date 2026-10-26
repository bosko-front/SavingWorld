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

// Production behavior without a verified StoreKit entitlement: Free. There is no override; only a
// verified entitlement may produce PRO_CAPABILITIES (Phase 15, `accessLevelFor` in billing).
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
// after a lost Pro entitlement with several goals it does not, except for the one goal the person
// chose to keep using (`canReopenGoal`, D74).
export function withinGoalLimit(capabilities: Capabilities, goalCount: number): boolean {
  checkCount(goalCount);
  return capabilities.goalLimit === null || goalCount <= capabilities.goalLimit;
}

export function canUseTheme(capabilities: Capabilities, themeId: ThemeId): boolean {
  return capabilities.themes[themeId];
}

// Whether an open goal's theme may change from `from` to `to` (v1.2 section 4, R20; D75). With Pro
// (the switching capability) any theme these capabilities include. Without it only one change exists:
// the person's own choice to grow a goal whose theme they can no longer use (a Garden goal after Pro
// was lost) as a theme they have (the Island), never the reverse. Keeping the same theme is always
// allowed. Nothing calls this on an entitlement change: themes change only by the person's command.
export function canChangeGoalTheme(capabilities: Capabilities, from: ThemeId, to: ThemeId): boolean {
  if (from === to) {
    return true;
  }
  if (!canUseTheme(capabilities, to)) {
    return false;
  }
  return capabilities.switchOpenGoalTheme || !canUseTheme(capabilities, from);
}

// What a person may do with one existing goal (Phase 16, owner decisions D74/D75):
// - usable: entries, corrections, edits, lifecycle changes and quests as its status allows;
// - read_only: Pro is not active and there are more goals than Free allows; every goal except the
//   one the person chose to keep using stays visible exactly as it is, with no new entries, entry
//   corrections, edits, status changes or quests, until Pro returns or the person deletes goals;
// - theme_locked: the goal uses a theme these capabilities do not include (a Garden goal without
//   Pro). Its world stays as it is and cannot progress; status changes are still allowed, and the
//   person may switch it to Island themselves (`canChangeGoalTheme`, Phase 17). Nothing ever switches
//   it automatically.
// Viewing, History, Collection and deleting the goal are never restricted. Nothing here changes data:
// it only decides which commands a goal accepts.
export type GoalUse = 'usable' | 'read_only' | 'theme_locked';

export type GoalUseContext = {
  // Every goal in any status, as counted by the goal limit.
  goalCount: number;
  // The goal the person chose to keep using after losing Pro, when it still exists; null otherwise.
  keptGoalId: string | null;
  goalId: string;
  themeId: ThemeId;
};

export function goalUse(capabilities: Capabilities, context: GoalUseContext): GoalUse {
  if (!withinGoalLimit(capabilities, context.goalCount) && context.keptGoalId !== context.goalId) {
    return 'read_only';
  }
  return canUseTheme(capabilities, context.themeId) ? 'usable' : 'theme_locked';
}

// More goals exist than these capabilities allow and the person has not yet chosen the one goal they
// keep using: until they choose, every goal is read-only (the choice is theirs, never automatic).
export function needsKeptGoalChoice(capabilities: Capabilities, goalCount: number, keptGoalId: string | null): boolean {
  return !withinGoalLimit(capabilities, goalCount) && keptGoalId === null;
}

// Reopen adds no goal: allowed within the limit, and for the kept goal after a lost entitlement.
export function canReopenGoal(capabilities: Capabilities, goalCount: number, keptGoalId: string | null, goalId: string): boolean {
  return withinGoalLimit(capabilities, goalCount) || keptGoalId === goalId;
}

// The one Pro statistics screen (Phase 18 builds it; its entry and route check this).
export function canOpenStatistics(capabilities: Capabilities): boolean {
  return capabilities.proStatistics;
}
