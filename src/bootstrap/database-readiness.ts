import { create } from 'zustand';

import { systemClock } from '@/core/calendar';
import { AppDatabase, DatabaseOpenError, type DatabaseOpenErrorCode } from '@/data/db/database';
import { expoSqliteDriver } from '@/data/db/expo-driver';
import { MIGRATIONS } from '@/data/db/migrations';
import type { SqlDriver } from '@/data/db/sql';

// Startup database readiness (docs/ARCHITECTURE.md "Startup and offline behavior"). The app opens
// one managed database and migrates it before any screen renders; until then no feature can read or
// write. A failure becomes a retryable recovery state with a redacted code. Nothing here deletes,
// resets or replaces the database file, whatever the error.

export const APP_DATABASE_NAME = 'saving-worlds.db';

export type DatabaseFailureCode = DatabaseOpenErrorCode | 'unknown';

export type DatabaseState =
  | { status: 'idle' }
  | { status: 'opening'; previousFailure: DatabaseFailureCode | null }
  | { status: 'ready'; db: AppDatabase }
  | { status: 'failed'; code: DatabaseFailureCode };

type DatabaseStore = {
  state: DatabaseState;
  // Opens (or retries) the app database. Concurrent calls share one attempt.
  open: () => Promise<void>;
};

let driver: SqlDriver = expoSqliteDriver;
let attempt: Promise<void> | null = null;

// Jest only: swaps the native driver for a host SQLite driver. Never called by app code.
export function setAppDatabaseDriverForTests(testDriver: SqlDriver): void {
  driver = testDriver;
}

export const useDatabaseStore = create<DatabaseStore>()((set, get) => ({
  state: { status: 'idle' },
  open: () => {
    const current = get().state;
    if (current.status === 'ready') {
      return Promise.resolve();
    }
    if (attempt) {
      return attempt;
    }
    set({ state: { status: 'opening', previousFailure: current.status === 'failed' ? current.code : null } });
    attempt = AppDatabase.open({ driver, name: APP_DATABASE_NAME, migrations: MIGRATIONS, clock: systemClock })
      .then((db) => set({ state: { status: 'ready', db } }))
      .catch((error: unknown) => {
        const code: DatabaseFailureCode = error instanceof DatabaseOpenError ? error.code : 'unknown';
        if (__DEV__) {
          // Development diagnostics only; messages come from SQLite/migrations, never user data.
          console.warn(`[database] open failed (${code}): ${error instanceof Error ? error.message : String(error)}`);
        }
        set({ state: { status: 'failed', code } });
      })
      .finally(() => {
        attempt = null;
      });
    return attempt;
  },
}));

// The open database for commands and queries. Screens render only after readiness, so a call
// before then is a programming error.
export function getAppDatabase(): AppDatabase {
  const { state } = useDatabaseStore.getState();
  if (state.status !== 'ready') {
    throw new Error('The app database is not open yet');
  }
  return state.db;
}

// Jest only: closes and forgets the open database between tests.
export async function resetAppDatabaseForTests(): Promise<void> {
  await attempt;
  const { state } = useDatabaseStore.getState();
  if (state.status === 'ready') {
    await state.db.close();
  }
  useDatabaseStore.setState({ state: { status: 'idle' } });
}
