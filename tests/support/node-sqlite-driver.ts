import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import os from 'os';
import path from 'path';

import type { SqlConnection, SqlDriver, SqlRow, SqlValue } from '@/data/db/sql';

// Host SQLite driver for Jest (Node's built-in node:sqlite). It runs the same SQL, migrations and
// commands as the app, which makes command/repository integration tests fast, but it is NOT the
// iOS Expo SQLite adapter: native evidence comes only from `npm run test:db` (tests/native).
// Each operation yields first (a microtask, so Jest fake timers cannot stall it), which lets
// concurrent calls interleave like async I/O.

const tick = () => Promise.resolve();

function plain<T>(row: unknown): T {
  return { ...(row as object) } as T;
}

export function createNodeSqliteDriver(directory: string): SqlDriver & { directory: string } {
  fs.mkdirSync(directory, { recursive: true });
  return {
    name: 'node:sqlite (host, Jest only)',
    directory,
    open: async (databaseName: string): Promise<SqlConnection> => {
      await tick();
      const database = new DatabaseSync(path.join(directory, databaseName));
      const params = (values: readonly SqlValue[] | undefined) => (values ?? []) as SqlValue[];
      return {
        run: async (sql, values) => {
          await tick();
          const result = database.prepare(sql).run(...params(values));
          return { changes: Number(result.changes) };
        },
        get: async <T extends SqlRow>(sql: string, values?: readonly SqlValue[]) => {
          await tick();
          const row = database.prepare(sql).get(...params(values));
          return row === undefined ? null : plain<T>(row);
        },
        all: async <T extends SqlRow>(sql: string, values?: readonly SqlValue[]) => {
          await tick();
          return database
            .prepare(sql)
            .all(...params(values))
            .map((row) => plain<T>(row));
        },
        exec: async (sql) => {
          await tick();
          database.exec(sql);
        },
        close: async () => {
          await tick();
          database.close();
        },
      };
    },
  };
}

export function temporaryDirectory(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `saving-worlds-${prefix}-`));
}
