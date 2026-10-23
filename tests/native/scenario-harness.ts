import type { SqlDriver } from '@/data/db/sql';

// Minimal scenario harness shared by the iOS native runner (src/dev/db-test-runner.tsx, real Expo
// SQLite) and Jest (host SQLite). It has no Jest dependency so the same scenarios bundle into the
// development app.

export type ScenarioContext = {
  driver: SqlDriver;
  // A fresh database name for this run, always prefixed `dbtest-`.
  databaseName(label: string): string;
  // Deletes a `dbtest-` database and its sidecar files.
  deleteDatabase(name: string): Promise<void>;
};

export type Scenario = {
  id: string;
  title: string;
  // Returns small facts worth recording in the evidence report (versions, counts).
  run(context: ScenarioContext): Promise<Record<string, unknown> | void>;
};

export type ScenarioResult = {
  id: string;
  title: string;
  status: 'pass' | 'fail';
  durationMs: number;
  error?: string;
  facts?: Record<string, unknown>;
};

export class ScenarioFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScenarioFailure';
  }
}

export function check(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new ScenarioFailure(message);
  }
}

function stable(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => (typeof v === 'bigint' ? `${v}n` : v));
}

export function equal<T>(actual: T, expected: T, label: string): void {
  if (stable(actual) !== stable(expected)) {
    throw new ScenarioFailure(`${label}: expected ${stable(expected)}, got ${stable(actual)}`);
  }
}

export async function rejects(promise: Promise<unknown>, pattern: RegExp, label: string): Promise<string> {
  try {
    await promise;
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    check(pattern.test(message), `${label}: error "${message}" does not match ${pattern}`);
    return message;
  }
  throw new ScenarioFailure(`${label}: expected a rejection`);
}

export async function runScenarios(
  scenarios: readonly Scenario[],
  context: ScenarioContext,
  now: () => number,
  onResult?: (result: ScenarioResult) => void,
): Promise<ScenarioResult[]> {
  const results: ScenarioResult[] = [];
  for (const scenario of scenarios) {
    const started = now();
    let result: ScenarioResult;
    try {
      const facts = await scenario.run(context);
      result = { id: scenario.id, title: scenario.title, status: 'pass', durationMs: now() - started, ...(facts ? { facts } : {}) };
    } catch (error) {
      result = {
        id: scenario.id,
        title: scenario.title,
        status: 'fail',
        durationMs: now() - started,
        error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      };
    }
    results.push(result);
    onResult?.(result);
  }
  return results;
}
