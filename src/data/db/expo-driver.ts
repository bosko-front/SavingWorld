import { deleteDatabaseAsync, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { SqlConnection, SqlDriver, SqlRow, SqlValue } from './sql';

// Production adapter over expo-sqlite (Documents/SQLite/<name> on iOS).
//
// Every open uses `useNewConnection`, so the write connection and the read connection are two real
// SQLite connections: a reader never sees another connection's uncommitted write. We deliberately
// do not use `withExclusiveTransactionAsync`: it opens a fresh connection per transaction and runs
// BEGIN before the task, so `PRAGMA foreign_keys` could never be enabled on it (the pragma is a
// no-op inside a transaction). AppDatabase owns its own serialized write connection instead.
function wrap(database: SQLiteDatabase): SqlConnection {
  const bind = (params: readonly SqlValue[] | undefined) => (params ?? []) as SqlValue[];
  return {
    run: async (sql, params) => {
      const result = await database.runAsync(sql, bind(params));
      return { changes: result.changes };
    },
    get: <T extends SqlRow>(sql: string, params?: readonly SqlValue[]) => database.getFirstAsync<T>(sql, bind(params)),
    all: <T extends SqlRow>(sql: string, params?: readonly SqlValue[]) => database.getAllAsync<T>(sql, bind(params)),
    exec: (sql) => database.execAsync(sql),
    close: () => database.closeAsync(),
  };
}

export const expoSqliteDriver: SqlDriver = {
  name: 'expo-sqlite',
  open: async (databaseName) => wrap(await openDatabaseAsync(databaseName, { useNewConnection: true })),
};

// Removes a database file and its -wal/-shm sidecars. Only the development test runner calls this,
// and only for its own `dbtest-` files; the app database is never deleted (docs/DATA_MODEL.md).
export async function deleteTestDatabase(databaseName: string): Promise<void> {
  if (!databaseName.startsWith('dbtest-')) {
    throw new Error('Only dbtest- databases may be deleted');
  }
  await deleteDatabaseAsync(databaseName);
}
