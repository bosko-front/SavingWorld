import path from 'path';

import { useAppDataStore } from '@/bootstrap/app-data';
import { useReminderStore } from '@/bootstrap/reminders';
import {
  getAppDatabase,
  resetAppDatabaseForTests,
  setAppDatabaseDriverForTests,
  useDatabaseStore,
} from '@/bootstrap/database-readiness';
import { systemClock } from '@/core/calendar';
import { randomUuid } from '@/data/ids';
import { setGlobalCurrency } from '@/features/settings/application/currency-commands';

import { resetFakeHaptics } from './expo-haptics-fake';
import { resetFakeNotifications } from './expo-notifications-fake';
import { createNodeSqliteDriver, temporaryDirectory } from './node-sqlite-driver';
import { resetFakeToasts } from './sonner-native-fake';

// Helpers for tests that render the real app routes on host SQLite (Jest only).

export const APP_DIR = path.resolve(__dirname, '../../src/app');

// A brand-new, empty app database for the next render (no currency, no goals).
export async function freshAppDatabase(label: string): Promise<void> {
  await resetApp();
  setAppDatabaseDriverForTests(createNodeSqliteDriver(temporaryDirectory(label)));
  await useDatabaseStore.getState().open();
  if (useDatabaseStore.getState().state.status !== 'ready') {
    throw new Error('test app database did not open');
  }
}

// Completes onboarding directly through the command, as the onboarding screen would.
export async function chooseCurrency(code = 'EUR'): Promise<void> {
  const result = await setGlobalCurrency({ db: getAppDatabase(), clock: systemClock }, { operationId: randomUuid(), currencyCode: code });
  if (!result.ok) {
    throw new Error(`currency setup failed: ${JSON.stringify(result.error)}`);
  }
  useAppDataStore.setState({ state: { status: 'idle' } });
}

export async function resetApp(): Promise<void> {
  await resetAppDatabaseForTests();
  useAppDataStore.setState({ state: { status: 'idle' } });
  resetFakeToasts();
  resetFakeHaptics();
  resetFakeNotifications();
  useReminderStore.setState({ status: null });
}
