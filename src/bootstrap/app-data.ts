import { useEffect, useState } from 'react';
import { create } from 'zustand';

import { capabilitiesFor, goalUse, hasGoalSlot, needsKeptGoalChoice, type Capabilities, type GoalUse } from '@/core/access';
import { systemClock, today, type CivilDate, type Clock } from '@/core/calendar';
import type { ThemeId } from '@/core/progression';
import { uuidGenerator } from '@/data/ids';
import { readStoredEntitlement } from '@/features/billing/application/entitlement-reconciler';
import { accessLevelFor, type EntitlementStatus } from '@/features/billing/domain/entitlement';
import { closeEndedAttempts, type ChallengeCommandDeps } from '@/features/challenges/application/challenge-commands';
import type { GoalCommandDeps } from '@/features/goals/application/goal-commands';
import { readGoalsOverview, type GoalsOverview } from '@/features/goals/application/goal-queries';
import type { LedgerCommandDeps } from '@/features/ledger/application/ledger-commands';
import type { CurrencyCommandDeps } from '@/features/settings/application/currency-commands';
import { readCurrencyOverview, type CurrencyOverview } from '@/features/settings/application/settings-queries';

import type { AppDatabase } from '@/data/db/database';

import { getAppDatabase } from './database-readiness';

// In-memory snapshot of committed data that screens render (docs/ARCHITECTURE.md "Zustand holds
// ... query snapshots"). SQLite stays the only durable truth: nothing here is persisted, and every
// command caller invalidates the snapshot with `refreshAppData()` after its commit. A screen never
// shows an uncommitted value.

// `today` is the device's civil date when the snapshot was read (Phase 08). Screens derive
// date-dependent values such as the deadline pace from it instead of reading the clock while
// rendering, so one snapshot never mixes two dates.
// `entitlement` is the stored Pro right (Phase 15): the last state StoreKit confirmed, read from
// SQLite with the rest, so the app opens with it offline and before StoreKit answers.
export type AppData = { currency: CurrencyOverview; goals: GoalsOverview; today: CivilDate; entitlement: { status: EntitlementStatus } };

export type AppDataState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: AppData }
  // `onboarded` remembers the last ready snapshot, so a read that fails after the app has opened
  // keeps the navigator (and the screen the person is on) and lets that screen offer a retry.
  // null when no snapshot was ever read.
  | { status: 'failed'; onboarded: boolean | null };

// The clock every screen, snapshot and command dependency uses. The device clock in the app;
// tests replace it to move across midnight, week and month boundaries.
let clock: Clock = systemClock;

// The stored entitlement from the last snapshot that was read, kept when a later read fails so a
// temporary storage error does not take rights away.
let lastEntitlementStatus: EntitlementStatus | null = null;

export function appClock(): Clock {
  return clock;
}

export function setAppClockForTests(testClock: Clock): void {
  clock = testClock;
}

type AppDataStore = {
  state: AppDataState;
  // Bumped after every successful refresh, so per-screen reads (`useCommittedRead`) re-run after
  // each commit together with the shared snapshot.
  version: number;
  refresh: () => Promise<void>;
};

export const useAppDataStore = create<AppDataStore>()((set, get) => ({
  state: { status: 'idle' },
  version: 0,
  refresh: async () => {
    const previous = get().state;
    // A retry after a later failed read stays in `failed` until it succeeds, so the navigator and
    // the current screen stay mounted.
    if (previous.status === 'idle' || (previous.status === 'failed' && previous.onboarded === null)) {
      set({ state: { status: 'loading' } });
    }
    try {
      const db = getAppDatabase();
      const todayDate = today(clock);
      const [currency, goals, stored] = await Promise.all([readCurrencyOverview(db), readGoalsOverview(db), readStoredEntitlement(db)]);
      const entitlement = { status: stored?.status ?? 'unknown' };
      lastEntitlementStatus = entitlement.status;
      set({ state: { status: 'ready', data: { currency, goals, today: todayDate, entitlement } }, version: get().version + 1 });
    } catch (error) {
      if (__DEV__) {
        // Development diagnostics only; messages come from SQLite or row decoders, never user data.
        console.warn(`[app-data] read failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      set({ state: { status: 'failed', onboarded: onboardedBefore(previous) } });
    }
  },
}));

function onboardedBefore(previous: AppDataState): boolean | null {
  if (previous.status === 'ready') {
    return previous.data.currency.currency.status !== 'missing';
  }
  return previous.status === 'failed' ? previous.onboarded : null;
}

export function refreshAppData(): Promise<void> {
  return useAppDataStore.getState().refresh();
}

// Foreground reconciliation (docs/ARCHITECTURE.md "Startup and offline behavior"): when the app
// returns to the foreground, re-read the civil date and time zone. Only a different date re-reads
// the committed data, once; nothing recomputes on a timer. Returns whether a refresh ran.
export async function reconcileCivilDate(): Promise<boolean> {
  const { state } = useAppDataStore.getState();
  if (state.status !== 'ready' || state.data.today === today(clock)) {
    return false;
  }
  await refreshAppData();
  return true;
}

// Foreground reconciliation for fixed challenges (Phase 12): a Weekly step whose saved week ended
// while the app was away is settled (Completed or Not completed) and the snapshot refreshed once.
// Screens already show such a week as ended, because the challenge board is settled for the
// current instant; this makes it durable. A failure leaves the attempt for the next command or
// foreground to settle. Returns whether anything changed.
export async function closeEndedChallengeAttempts(): Promise<boolean> {
  const result = await closeEndedAttempts({ db: getAppDatabase(), clock });
  if (!result.ok || result.value.goalsChanged === 0) {
    return false;
  }
  await refreshAppData();
  return true;
}

export type CommittedRead<T> = { status: 'loading' } | { status: 'ready'; value: T } | { status: 'failed' };

// A screen-specific read of committed data (for example one goal's History), re-run whenever
// `key` changes and after every `refreshAppData()`. The previous value stays on screen while the
// next read runs, so a commit never blanks a list or resets a form built from it.
export function useCommittedRead<T>(key: string, read: (db: AppDatabase) => Promise<T>): CommittedRead<T> {
  const version = useAppDataStore((store) => store.version);
  const [result, setResult] = useState<{ key: string; read: CommittedRead<T> }>({ key, read: { status: 'loading' } });

  useEffect(() => {
    let current = true;
    read(getAppDatabase())
      .then((value) => {
        if (current) {
          setResult({ key, read: { status: 'ready', value } });
        }
      })
      .catch((error: unknown) => {
        if (__DEV__) {
          // Development diagnostics only; messages come from SQLite or row decoders, never user data.
          console.warn(`[app-data] screen read failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        if (current) {
          setResult({ key, read: { status: 'failed' } });
        }
      });
    return () => {
      current = false;
    };
    // `read` is recreated on every render; the key and data version decide when to read again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);

  return result.key === key ? result.read : { status: 'loading' };
}

// What this person may do: Pro capabilities only while the stored entitlement is a verified
// StoreKit purchase (Phase 15), Free otherwise. There is no override or test switch. Commands get
// these through the `*CommandDeps` below and check them inside their transaction (Phase 16).
export function currentCapabilities(): Capabilities {
  return capabilitiesFor(accessLevelFor(lastEntitlementStatus));
}

// What screens show and offer for one committed snapshot (Phase 16): the same rules the commands
// enforce (`goalUse` in @/core/access), so a screen never offers an action its command refuses.
export type AccessView = {
  capabilities: Capabilities;
  // Create Goal has a free slot (Free: one goal in any status, D74).
  canCreate: boolean;
  // Pro is not active, several goals exist and the person has not chosen the goal they keep using.
  needsKeptChoice: boolean;
  keptGoalId: string | null;
  use: (goal: { id: string; themeId: ThemeId }) => GoalUse;
};

export function accessView(data: AppData): AccessView {
  const capabilities = capabilitiesFor(accessLevelFor(data.entitlement.status));
  const goalCount = data.goals.goals.length;
  const { keptGoalId } = data.goals;
  return {
    capabilities,
    canCreate: hasGoalSlot(capabilities, goalCount),
    needsKeptChoice: needsKeptGoalChoice(capabilities, goalCount, keptGoalId),
    keptGoalId,
    use: (goal) => goalUse(capabilities, { goalCount, keptGoalId, goalId: goal.id, themeId: goal.themeId }),
  };
}

// The access view of the current snapshot, or null before the first read.
export function useAccessView(): AccessView | null {
  const state = useAppDataStore((store) => store.state);
  return state.status === 'ready' ? accessView(state.data) : null;
}

// Jest only: forgets the stored entitlement of the previous test's database.
export function resetCapabilitiesForTests(): void {
  lastEntitlementStatus = null;
}

export function goalCommandDeps(): GoalCommandDeps {
  return { db: getAppDatabase(), clock, ids: uuidGenerator, capabilities: currentCapabilities() };
}

export function ledgerCommandDeps(): LedgerCommandDeps {
  return { db: getAppDatabase(), clock, ids: uuidGenerator, capabilities: currentCapabilities() };
}

export function currencyCommandDeps(): CurrencyCommandDeps {
  return { db: getAppDatabase(), clock };
}

export function challengeCommandDeps(): ChallengeCommandDeps {
  return { db: getAppDatabase(), clock, ids: uuidGenerator, capabilities: currentCapabilities() };
}
