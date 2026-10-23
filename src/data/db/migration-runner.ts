import { fnv1a64 } from './hash';
import type { SqlExecutor } from './sql';

// Versioned, transactional schema migrations (docs/DATA_MODEL.md "migrations"). The runner is called
// by AppDatabase inside one exclusive write transaction: every pending migration and its history row
// commit together or roll back together, so a failure leaves the previous valid schema and data. An
// unknown newer schema, an edited migration or a database this app did not create fails safely and
// is never modified, reset or deleted.

export type Migration = {
  version: number;
  name: string;
  sql: string;
};

export type MigrationErrorCode =
  // The database was written by a newer app version; this build cannot read it.
  | 'newer_schema'
  // Recorded history differs from the bundled migrations (edited, missing or renamed version).
  | 'migration_history_mismatch'
  // Tables exist but no migration history: not a Saving Worlds database.
  | 'unrecognized_database'
  // A pending migration or its integrity check failed and was rolled back.
  | 'migration_failed';

export class MigrationError extends Error {
  readonly code: MigrationErrorCode;
  readonly version: number | null;

  constructor(code: MigrationErrorCode, message: string, version: number | null = null) {
    super(message);
    this.name = 'MigrationError';
    this.code = code;
    this.version = version;
  }
}

export type MigrationOutcome = {
  fromVersion: number;
  toVersion: number;
  applied: number[];
};

const HISTORY_TABLE_SQL = `
CREATE TABLE migrations (
  version INTEGER PRIMARY KEY NOT NULL CHECK (version >= 1),
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at_utc TEXT NOT NULL
) STRICT;`;

export function migrationChecksum(migration: Migration): string {
  return fnv1a64(migration.sql);
}

function assertWellFormed(migrations: readonly Migration[]): void {
  migrations.forEach((migration, index) => {
    if (migration.version !== index + 1 || !/^[a-z0-9_]+$/.test(migration.name)) {
      throw new Error(`Migration list must be versions 1..n with snake_case names (index ${index})`);
    }
  });
}

type HistoryRow = { version: number; name: string; checksum: string };

function isHistoryRow(row: Record<string, unknown>): row is HistoryRow {
  return (
    typeof row.version === 'number' &&
    Number.isSafeInteger(row.version) &&
    typeof row.name === 'string' &&
    typeof row.checksum === 'string'
  );
}

export async function runMigrations(
  tx: SqlExecutor,
  migrations: readonly Migration[],
  appliedAtUtc: string,
): Promise<MigrationOutcome> {
  assertWellFormed(migrations);
  const latest = migrations.length;

  const tables = await tx.all<{ name: string }>(
    "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\'",
  );
  const hasHistory = tables.some((table) => table.name === 'migrations');
  if (!hasHistory && tables.length > 0) {
    throw new MigrationError('unrecognized_database', 'Database has tables but no migration history');
  }
  if (!hasHistory) {
    await tx.exec(HISTORY_TABLE_SQL);
  }

  const rows = await tx.all('SELECT version, name, checksum FROM migrations ORDER BY version');
  if (!rows.every(isHistoryRow)) {
    throw new MigrationError('migration_history_mismatch', 'Migration history has malformed rows');
  }
  const history = rows as HistoryRow[];
  const current = history.length === 0 ? 0 : (history[history.length - 1]?.version ?? 0);
  if (current > latest) {
    throw new MigrationError('newer_schema', `Schema ${current} is newer than supported ${latest}`, current);
  }
  history.forEach((row, index) => {
    const known = migrations[index];
    if (!known || row.version !== known.version || row.name !== known.name || row.checksum !== migrationChecksum(known)) {
      throw new MigrationError('migration_history_mismatch', `Recorded migration ${row.version} differs`, row.version);
    }
  });

  const pending = migrations.slice(current);
  for (const migration of pending) {
    try {
      await tx.exec(migration.sql);
      await tx.run('INSERT INTO migrations (version, name, checksum, applied_at_utc) VALUES (?, ?, ?, ?)', [
        migration.version,
        migration.name,
        migrationChecksum(migration),
        appliedAtUtc,
      ]);
    } catch (error) {
      throw new MigrationError(
        'migration_failed',
        `Migration ${migration.version} failed: ${error instanceof Error ? error.message : String(error)}`,
        migration.version,
      );
    }
  }
  if (pending.length > 0) {
    const violations = await tx.all('PRAGMA foreign_key_check');
    if (violations.length > 0) {
      throw new MigrationError('migration_failed', 'Foreign key check failed after migration', latest);
    }
  }
  return { fromVersion: current, toVersion: latest, applied: pending.map((migration) => migration.version) };
}
