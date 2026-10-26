import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { getAppDatabase } from '@/bootstrap/database-readiness';
import { deleteTestDatabase, expoSqliteDriver } from '@/data/db/expo-driver';
import { uuidSource } from '@/data/ids';
import { Screen } from '@/shared/layout';
import { spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Notice } from '@/shared/ui/notice';

import { DATABASE_SCENARIOS, restartSeedScenario, restartVerifyScenario } from '../../tests/native/database-scenarios';
import { CHALLENGE_SCENARIOS } from '../../tests/native/challenge-scenarios';
import { GOAL_SCENARIOS } from '../../tests/native/goal-scenarios';
import { INTL_SCENARIOS } from '../../tests/native/intl-scenarios';
import { LEDGER_SCENARIOS } from '../../tests/native/ledger-scenarios';
import { SOUVENIR_SCENARIOS } from '../../tests/native/souvenir-scenarios';
import { runScenarios, type Scenario, type ScenarioContext, type ScenarioResult } from '../../tests/native/scenario-harness';

// Development/test-only native database runner (docs/TEST_PLAN.md "Real iOS Expo SQLite suite").
// It runs tests/native scenarios on this device through the real expo-sqlite adapter, each in its
// own `dbtest-` database, and stores a machine-readable report in Documents/SQLite/dbtest-report.db,
// which `npm run test:db` reads from the simulator container. It never opens, changes or deletes
// the app database beyond reading its startup migration outcome.

export type DbTestSuite = 'all' | 'restart-verify';

const REPORT_DATABASE = 'dbtest-report.db';

type RunState =
  | { status: 'idle' }
  | { status: 'running'; runId: string; done: ScenarioResult[]; total: number }
  | { status: 'finished'; runId: string; results: ScenarioResult[]; reportError: string | null };

async function storeReport(runId: string, report: unknown): Promise<void> {
  const connection = await expoSqliteDriver.open(REPORT_DATABASE);
  try {
    await connection.exec(
      'CREATE TABLE IF NOT EXISTS reports (run_id TEXT PRIMARY KEY NOT NULL, created_at_utc TEXT NOT NULL, report_json TEXT NOT NULL)',
    );
    await connection.run('INSERT OR REPLACE INTO reports (run_id, created_at_utc, report_json) VALUES (?, ?, ?)', [
      runId,
      new Date().toISOString(),
      JSON.stringify(report),
    ]);
  } finally {
    await connection.close();
  }
}

// A linked run (from `npm run test:db`) also seeds the restart database that the next process
// verifies and deletes; a manual run does not, so it leaves no test database behind.
function scenariosFor(suite: DbTestSuite, runId: string, seedId: string | null, linked: boolean): Scenario[] {
  if (suite === 'restart-verify') {
    return seedId ? [restartVerifyScenario(seedId)] : [];
  }
  const all = [...DATABASE_SCENARIOS, ...GOAL_SCENARIOS, ...LEDGER_SCENARIOS, ...SOUVENIR_SCENARIOS, ...CHALLENGE_SCENARIOS, ...INTL_SCENARIOS];
  return linked ? [...all, restartSeedScenario(runId)] : all;
}

export function DbTestRunner({ runId, suite, seedId }: { runId: string | null; suite: DbTestSuite; seedId: string | null }) {
  const [state, setState] = useState<RunState>({ status: 'idle' });
  const started = useRef(new Set<string>());

  const start = (id: string, linked: boolean) => {
    if (started.current.has(id)) {
      return;
    }
    started.current.add(id);
    const scenarios = scenariosFor(suite, id, seedId, linked);
    let counter = 0;
    const context: ScenarioContext = {
      driver: expoSqliteDriver,
      databaseName: (label) => `dbtest-${label}-${id}-${(counter += 1)}.db`,
      deleteDatabase: deleteTestDatabase,
    };
    const startedAtUtc = new Date().toISOString();
    setState({ status: 'running', runId: id, done: [], total: scenarios.length });
    void (async () => {
      const results = await runScenarios(scenarios, context, Date.now, (result) =>
        setState((current) => (current.status === 'running' ? { ...current, done: [...current.done, result] } : current)),
      );
      const failed = results.filter((result) => result.status === 'fail').length;
      const appDatabase = getAppDatabase();
      const report = {
        runId: id,
        suite,
        seedId,
        startedAtUtc,
        finishedAtUtc: new Date().toISOString(),
        driver: expoSqliteDriver.name,
        platform: { os: Platform.OS, version: String(Platform.Version) },
        hermes: typeof (globalThis as { HermesInternal?: unknown }).HermesInternal === 'object',
        uuidSource: uuidSource(),
        appDatabase: { name: appDatabase.name, driver: appDatabase.driverName, migrationAtThisLaunch: appDatabase.migration },
        summary: { total: results.length, passed: results.length - failed, failed },
        results,
      };
      let reportError: string | null = null;
      try {
        await storeReport(id, report);
      } catch (error) {
        reportError = error instanceof Error ? error.message : String(error);
      }
      // One line per run for Metro logs; the stored report is the machine-readable record.
      console.log(`[db-tests] run ${id} (${suite}): ${results.length - failed}/${results.length} passed`);
      for (const result of results.filter((r) => r.status === 'fail')) {
        console.log(`[db-tests] FAIL ${result.id} ${result.title}: ${result.error}`);
      }
      setState({ status: 'finished', runId: id, results, reportError });
    })();
  };

  useEffect(() => {
    if (runId) {
      start(runId, true);
    }
    // `start` is stable in behavior (it ignores repeated IDs); only a new run ID starts a run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const results = state.status === 'finished' ? state.results : state.status === 'running' ? state.done : [];
  const failed = results.filter((result) => result.status === 'fail').length;

  return (
    <Screen testID="db-test-runner">
      <AppText role="title" accessibilityRole="header">
        Database tests
      </AppText>
      <AppText tone="secondary">
        Runs the database, goal and Intl scenarios on this device through expo-sqlite, in separate test databases. Your app data is not
        touched.
      </AppText>
      {state.status === 'idle' ? (
        <Button label="Run all scenarios" onPress={() => start(`manual${Date.now().toString(36)}`, false)} />
      ) : null}
      {state.status === 'running' ? (
        <AppText testID="db-test-progress">
          Running {state.runId}: {state.done.length} of {state.total}
        </AppText>
      ) : null}
      {state.status === 'finished' ? (
        <Notice
          testID="db-test-summary"
          tone={failed === 0 && !state.reportError ? 'success' : 'error'}
          title={`${results.length - failed} of ${results.length} passed`}
          message={state.reportError ? `Report not stored: ${state.reportError}` : `Run ${state.runId}`}
        />
      ) : null}
      {results.map((result) => (
        <Card key={result.id}>
          <View style={styles.row} accessible>
            <AppText role="headline" tone={result.status === 'pass' ? 'success' : 'error'}>
              {result.id} {result.status === 'pass' ? 'PASS' : 'FAIL'}
            </AppText>
            <AppText role="footnote">{result.title}</AppText>
            {result.error ? <AppText role="footnote" tone="error">{result.error}</AppText> : null}
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.xs / 2 },
});
