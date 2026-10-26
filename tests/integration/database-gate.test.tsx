import { render, screen, userEvent } from '@testing-library/react-native';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DatabaseGate } from '@/bootstrap/database-gate';
import {
  APP_DATABASE_NAME,
  resetAppDatabaseForTests,
  setAppDatabaseDriverForTests,
  useDatabaseStore,
} from '@/bootstrap/database-readiness';
import type { SqlDriver } from '@/data/db/sql';

import { createNodeSqliteDriver, temporaryDirectory } from '../support/node-sqlite-driver';

// Startup gating and the retryable storage failure screen (Jest + host SQLite; the native open and
// migration path is in the iOS `npm run test:db` evidence). The failure screen never offers a reset.

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

function renderGate() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <DatabaseGate>
        <Text>App content</Text>
      </DatabaseGate>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  // The failure paths log a development warning by design; keep test output readable.
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(async () => {
  jest.restoreAllMocks();
  await resetAppDatabaseForTests();
});

it('renders nothing until the database is migrated, then the app', async () => {
  const driver = createNodeSqliteDriver(temporaryDirectory('gate-ok'));
  let release: () => void = () => undefined;
  const opened = new Promise<void>((resolve) => {
    release = resolve;
  });
  // Holds the first open until the "still opening" render has been checked.
  setAppDatabaseDriverForTests({
    name: 'held',
    open: async (name) => {
      await opened;
      return driver.open(name);
    },
  });
  await renderGate();
  expect(screen.queryByText('App content')).not.toBeOnTheScreen();
  expect(useDatabaseStore.getState().state.status).toBe('opening');
  release();
  expect(await screen.findByText('App content')).toBeOnTheScreen();
  const { state } = useDatabaseStore.getState();
  expect(state.status === 'ready' && state.db.migration.applied).toEqual([1, 2, 3, 4, 5]);
});

it('shows a retryable failure when opening fails, and opens on retry', async () => {
  const working = createNodeSqliteDriver(temporaryDirectory('gate-retry'));
  let failNext = true;
  const flaky: SqlDriver = {
    name: 'flaky',
    open: async (name) => {
      if (failNext) {
        failNext = false;
        throw new Error('disk I/O error');
      }
      return working.open(name);
    },
  };
  setAppDatabaseDriverForTests(flaky);
  await renderGate();
  expect(await screen.findByText('Your savings couldn’t be opened')).toBeOnTheScreen();
  expect(screen.getByText('Nothing was changed or deleted. Your goals and entries are still on this device.')).toBeOnTheScreen();
  expect(screen.getByLabelText('Data not opened. Error code: SW-DB-OPEN_FAILED')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /reset|delete|start over/i })).not.toBeOnTheScreen();

  await userEvent.press(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('App content')).toBeOnTheScreen();
});

it('refuses a newer schema without changing the file', async () => {
  const directory = temporaryDirectory('gate-newer');
  const file = path.join(directory, APP_DATABASE_NAME);
  const seeded = new DatabaseSync(file);
  seeded.exec(`CREATE TABLE migrations (version INTEGER PRIMARY KEY, name TEXT, checksum TEXT, applied_at_utc TEXT);
    INSERT INTO migrations VALUES (1, 'initial_ledger', 'f060530662e52157', '2026-10-23T08:00:00.000Z');
    INSERT INTO migrations VALUES (2, 'goal_deletion', '02eb49969587883c', '2026-10-23T08:00:00.000Z');
    INSERT INTO migrations VALUES (3, 'collectibles', '1d1c7826fd9f83de', '2026-10-25T08:00:00.000Z');
    INSERT INTO migrations VALUES (4, 'challenge_attempts', '4255b9a308e7cb0c', '2026-10-25T08:00:00.000Z');
    INSERT INTO migrations VALUES (5, 'entitlements', '84b68261720ce88d', '2026-10-26T08:00:00.000Z');
    INSERT INTO migrations VALUES (6, 'future', 'ffff', '2027-01-01T00:00:00.000Z');
    CREATE TABLE ledger_entries (id TEXT, signed_amount_minor INTEGER);
    INSERT INTO ledger_entries VALUES ('kept', 1234);`);
  const schemaBefore = seeded.prepare('SELECT type, name, sql FROM sqlite_schema ORDER BY name').all();
  seeded.close();

  setAppDatabaseDriverForTests(createNodeSqliteDriver(directory));
  await renderGate();
  expect(await screen.findByText('This data was saved by a newer version of Saving Worlds. Update the app to open it.')).toBeOnTheScreen();
  expect(screen.getByLabelText('Data not opened. Error code: SW-DB-NEWER_SCHEMA')).toBeOnTheScreen();

  const reread = new DatabaseSync(file);
  expect(reread.prepare('SELECT id, signed_amount_minor FROM ledger_entries').all()).toEqual([{ id: 'kept', signed_amount_minor: 1234 }]);
  expect(reread.prepare('SELECT max(version) AS v FROM migrations').get()).toEqual({ v: 6 });
  // Only the WAL journal-mode header flag may differ: opening configures the connection before it
  // reads the migration history. Schema and rows are unchanged.
  expect(reread.prepare('SELECT type, name, sql FROM sqlite_schema ORDER BY name').all()).toEqual(schemaBefore);
  reread.close();
  expect(fs.existsSync(file)).toBe(true);
});
