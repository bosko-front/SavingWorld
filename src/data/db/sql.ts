// The SQLite boundary (docs/ARCHITECTURE.md "Boundaries"). Repositories and commands talk to this
// small interface; the Expo adapter (expo-driver.ts) is the production implementation and the only
// one that counts as native SQLite evidence. Jest uses a host adapter in tests/support.
//
// Values are bound as parameters, never concatenated into SQL. Amounts are INTEGER columns read
// back as JavaScript numbers; every reader validates them at the row decoder.

export type SqlValue = string | number | null;

export type SqlRow = Record<string, unknown>;

export type SqlRunResult = { changes: number };

export interface SqlExecutor {
  run(sql: string, params?: readonly SqlValue[]): Promise<SqlRunResult>;
  get<T extends SqlRow = SqlRow>(sql: string, params?: readonly SqlValue[]): Promise<T | null>;
  all<T extends SqlRow = SqlRow>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  // Static, trusted SQL only (schema, PRAGMA, BEGIN/COMMIT). Never pass user data here.
  exec(sql: string): Promise<void>;
}

export interface SqlConnection extends SqlExecutor {
  close(): Promise<void>;
}

export interface SqlDriver {
  // Short identifier recorded in diagnostics and test reports, e.g. 'expo-sqlite'.
  readonly name: string;
  // Opens a new, separate connection to the named database file (created when missing).
  open(databaseName: string): Promise<SqlConnection>;
}
