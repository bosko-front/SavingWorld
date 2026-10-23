import { utcTimestamp, type Clock } from '@/core/calendar';

import { MigrationError, runMigrations, type Migration, type MigrationErrorCode, type MigrationOutcome } from './migration-runner';
import type { SqlConnection, SqlDriver, SqlExecutor } from './sql';

// One managed database (docs/ARCHITECTURE.md "Startup", docs/DATA_MODEL.md "Write invariants").
//
// - A dedicated write connection runs every mutation in `BEGIN EXCLUSIVE ... COMMIT`, one at a time
//   through a promise queue: the single serialized write path. The task receives the transaction
//   handle and must run all of its queries on it; the handle refuses use after the transaction ends.
// - A separate read connection (query_only) serves screens. In WAL mode it reads the last committed
//   state, so nothing uncommitted is ever shown as saved.
// - Both connections enable foreign keys. WAL and synchronous=FULL favour durability of each
//   committed financial write over raw speed.
// - Migrations run on the write path before the read connection opens or any feature reads data.

export type DatabaseOpenErrorCode = MigrationErrorCode | 'open_failed' | 'configuration_failed';

export class DatabaseOpenError extends Error {
  readonly code: DatabaseOpenErrorCode;

  constructor(code: DatabaseOpenErrorCode, message: string) {
    super(message);
    this.name = 'DatabaseOpenError';
    this.code = code;
  }
}

export type DatabaseTestHooks = {
  // Runs inside the exclusive transaction after the task, just before COMMIT. Throwing here forces
  // a rollback; the native runner uses it to inject a mid-write failure.
  beforeCommit?: (tx: SqlExecutor) => Promise<void>;
};

export type OpenDatabaseOptions = {
  driver: SqlDriver;
  name: string;
  migrations: readonly Migration[];
  clock: Clock;
  testHooks?: DatabaseTestHooks;
};

export type ConnectionPragmas = {
  journalMode: string;
  foreignKeys: boolean;
  synchronous: number;
};

const BUSY_TIMEOUT_MS = 5000;

// A handle that is valid only while its transaction (or read snapshot) is open.
function scopedExecutor(connection: SqlExecutor, isOpen: () => boolean): SqlExecutor {
  const guard = () => {
    if (!isOpen()) {
      throw new Error('Transaction handle used after its transaction ended');
    }
  };
  return {
    run: async (sql, params) => {
      guard();
      return connection.run(sql, params);
    },
    get: async (sql, params) => {
      guard();
      return connection.get(sql, params);
    },
    all: async (sql, params) => {
      guard();
      return connection.all(sql, params);
    },
    exec: async (sql) => {
      guard();
      return connection.exec(sql);
    },
  };
}

async function closeQuietly(connection: SqlConnection | null): Promise<void> {
  if (!connection) {
    return;
  }
  try {
    await connection.close();
  } catch {
    // Closing after a failed open is best effort; the original failure is what gets reported.
  }
}

async function readPragmas(connection: SqlExecutor): Promise<ConnectionPragmas> {
  const journal = await connection.get<{ journal_mode: string }>('PRAGMA journal_mode');
  const foreignKeys = await connection.get<{ foreign_keys: number }>('PRAGMA foreign_keys');
  const synchronous = await connection.get<{ synchronous: number }>('PRAGMA synchronous');
  return {
    journalMode: String(journal?.journal_mode ?? ''),
    foreignKeys: foreignKeys?.foreign_keys === 1,
    synchronous: Number(synchronous?.synchronous ?? -1),
  };
}

export class AppDatabase {
  readonly name: string;
  readonly driverName: string;
  readonly migration: MigrationOutcome;

  private readonly writer: SqlConnection;
  private readonly reader: SqlConnection;
  private readonly testHooks: DatabaseTestHooks | undefined;
  private writeQueue: Promise<unknown> = Promise.resolve();
  private readQueue: Promise<unknown> = Promise.resolve();
  private closed = false;

  private constructor(
    name: string,
    driverName: string,
    writer: SqlConnection,
    reader: SqlConnection,
    migration: MigrationOutcome,
    testHooks: DatabaseTestHooks | undefined,
  ) {
    this.name = name;
    this.driverName = driverName;
    this.writer = writer;
    this.reader = reader;
    this.migration = migration;
    this.testHooks = testHooks;
  }

  // Opens, configures and migrates. Throws DatabaseOpenError; never deletes or resets the file.
  static async open({ driver, name, migrations, clock, testHooks }: OpenDatabaseOptions): Promise<AppDatabase> {
    let writer: SqlConnection | null = null;
    let reader: SqlConnection | null = null;
    try {
      try {
        writer = await driver.open(name);
      } catch (error) {
        throw new DatabaseOpenError('open_failed', describe(error));
      }
      try {
        await writer.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
        await writer.exec('PRAGMA foreign_keys = ON');
        await writer.get('PRAGMA journal_mode = WAL');
        await writer.exec('PRAGMA synchronous = FULL');
        const pragmas = await readPragmas(writer);
        if (!pragmas.foreignKeys || pragmas.journalMode.toLowerCase() !== 'wal') {
          throw new Error(`unexpected pragmas ${JSON.stringify(pragmas)}`);
        }
      } catch (error) {
        throw new DatabaseOpenError('configuration_failed', describe(error));
      }

      const writeConnection = writer;
      const migration = await AppDatabase.exclusive(writeConnection, testHooks, (tx) =>
        runMigrations(tx, migrations, utcTimestamp(clock)),
      ).catch((error: unknown) => {
        if (error instanceof MigrationError) {
          throw new DatabaseOpenError(error.code, error.message);
        }
        throw new DatabaseOpenError('migration_failed', describe(error));
      });

      try {
        reader = await driver.open(name);
      } catch (error) {
        throw new DatabaseOpenError('open_failed', describe(error));
      }
      try {
        await reader.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
        await reader.exec('PRAGMA foreign_keys = ON');
        await reader.exec('PRAGMA query_only = ON');
      } catch (error) {
        throw new DatabaseOpenError('configuration_failed', describe(error));
      }
      return new AppDatabase(name, driver.name, writeConnection, reader, migration, testHooks);
    } catch (error) {
      await closeQuietly(reader);
      await closeQuietly(writer);
      throw error;
    }
  }

  private static async exclusive<T>(
    connection: SqlConnection,
    testHooks: DatabaseTestHooks | undefined,
    task: (tx: SqlExecutor) => Promise<T>,
  ): Promise<T> {
    let open = true;
    const tx = scopedExecutor(connection, () => open);
    await connection.exec('BEGIN EXCLUSIVE');
    try {
      const result = await task(tx);
      await testHooks?.beforeCommit?.(tx);
      await connection.exec('COMMIT');
      return result;
    } catch (error) {
      try {
        await connection.exec('ROLLBACK');
      } catch {
        // SQLite may already have rolled back (for example after an I/O error); keep the original.
      }
      throw error;
    } finally {
      open = false;
    }
  }

  // The one serialized write path. Every financial, lifecycle and settings mutation goes through it;
  // a rejected or thrown task rolls back everything it wrote.
  write<T>(task: (tx: SqlExecutor) => Promise<T>): Promise<T> {
    if (this.closed) {
      return Promise.reject(new Error('Database is closed'));
    }
    const run = this.writeQueue.then(() => AppDatabase.exclusive(this.writer, this.testHooks, task));
    this.writeQueue = run.catch(() => undefined);
    return run;
  }

  // A consistent read snapshot of committed data on the read connection.
  read<T>(task: (snapshot: SqlExecutor) => Promise<T>): Promise<T> {
    if (this.closed) {
      return Promise.reject(new Error('Database is closed'));
    }
    const run = this.readQueue.then(async () => {
      let open = true;
      const snapshot = scopedExecutor(this.reader, () => open);
      await this.reader.exec('BEGIN');
      try {
        return await task(snapshot);
      } finally {
        open = false;
        await this.reader.exec('COMMIT');
      }
    });
    this.readQueue = run.catch(() => undefined);
    return run;
  }

  async pragmas(): Promise<{ writer: ConnectionPragmas; reader: ConnectionPragmas }> {
    const writer = await this.write((tx) => readPragmas(tx));
    const reader = await this.read((snapshot) => readPragmas(snapshot));
    return { writer, reader };
  }

  // Waits for queued work, then closes both connections.
  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    await Promise.all([this.writeQueue, this.readQueue]);
    await closeQuietly(this.reader);
    await this.writer.close();
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
