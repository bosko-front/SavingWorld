import { create } from 'zustand';

import { capabilitiesFor, DEFAULT_ACCESS_LEVEL, type Capabilities } from '@/core/access';
import { systemClock } from '@/core/calendar';
import { uuidGenerator } from '@/data/ids';
import type { GoalCommandDeps } from '@/features/goals/application/goal-commands';
import { readGoalsOverview, type GoalsOverview } from '@/features/goals/application/goal-queries';
import type { CurrencyCommandDeps } from '@/features/settings/application/currency-commands';
import { readCurrencyOverview, type CurrencyOverview } from '@/features/settings/application/settings-queries';

import { getAppDatabase } from './database-readiness';

// In-memory snapshot of committed data that screens render (docs/ARCHITECTURE.md "Zustand holds
// ... query snapshots"). SQLite stays the only durable truth: nothing here is persisted, and every
// command caller invalidates the snapshot with `refreshAppData()` after its commit. A screen never
// shows an uncommitted value.

export type AppData = { currency: CurrencyOverview; goals: GoalsOverview };

export type AppDataState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: AppData }
  | { status: 'failed' };

type AppDataStore = { state: AppDataState; refresh: () => Promise<void> };

export const useAppDataStore = create<AppDataStore>()((set, get) => ({
  state: { status: 'idle' },
  refresh: async () => {
    if (get().state.status !== 'ready') {
      set({ state: { status: 'loading' } });
    }
    try {
      const db = getAppDatabase();
      const [currency, goals] = await Promise.all([readCurrencyOverview(db), readGoalsOverview(db)]);
      set({ state: { status: 'ready', data: { currency, goals } } });
    } catch (error) {
      if (__DEV__) {
        // Development diagnostics only; messages come from SQLite or row decoders, never user data.
        console.warn(`[app-data] read failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      set({ state: { status: 'failed' } });
    }
  },
}));

export function refreshAppData(): Promise<void> {
  return useAppDataStore.getState().refresh();
}

// What this person may do. Free until Phase 15 supplies a verified StoreKit entitlement; there is
// no override.
export function currentCapabilities(): Capabilities {
  return capabilitiesFor(DEFAULT_ACCESS_LEVEL);
}

export function goalCommandDeps(): GoalCommandDeps {
  return { db: getAppDatabase(), clock: systemClock, ids: uuidGenerator, capabilities: currentCapabilities() };
}

export function currencyCommandDeps(): CurrencyCommandDeps {
  return { db: getAppDatabase(), clock: systemClock };
}
