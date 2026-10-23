import { useEffect, useState } from 'react';
import { create } from 'zustand';

import { capabilitiesFor, DEFAULT_ACCESS_LEVEL, type Capabilities } from '@/core/access';
import { systemClock } from '@/core/calendar';
import { uuidGenerator } from '@/data/ids';
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

export type AppData = { currency: CurrencyOverview; goals: GoalsOverview };

export type AppDataState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: AppData }
  | { status: 'failed' };

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
    if (get().state.status !== 'ready') {
      set({ state: { status: 'loading' } });
    }
    try {
      const db = getAppDatabase();
      const [currency, goals] = await Promise.all([readCurrencyOverview(db), readGoalsOverview(db)]);
      set({ state: { status: 'ready', data: { currency, goals } }, version: get().version + 1 });
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

// What this person may do. Free until Phase 15 supplies a verified StoreKit entitlement; there is
// no override.
export function currentCapabilities(): Capabilities {
  return capabilitiesFor(DEFAULT_ACCESS_LEVEL);
}

export function goalCommandDeps(): GoalCommandDeps {
  return { db: getAppDatabase(), clock: systemClock, ids: uuidGenerator, capabilities: currentCapabilities() };
}

export function ledgerCommandDeps(): LedgerCommandDeps {
  return { db: getAppDatabase(), clock: systemClock, ids: uuidGenerator };
}

export function currencyCommandDeps(): CurrencyCommandDeps {
  return { db: getAppDatabase(), clock: systemClock };
}
