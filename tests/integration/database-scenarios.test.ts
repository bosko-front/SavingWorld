import fs from 'fs';
import path from 'path';

import {
  DATABASE_SCENARIOS,
  restartSeedScenario,
  restartVerifyScenario,
} from '../native/database-scenarios';
import { GOAL_SCENARIOS } from '../native/goal-scenarios';
import { INTL_SCENARIOS } from '../native/intl-scenarios';
import { runScenarios, type ScenarioContext } from '../native/scenario-harness';
import { createNodeSqliteDriver, temporaryDirectory } from '../support/node-sqlite-driver';

// The Phase 05 database scenarios on host SQLite (node:sqlite). This checks the SQL, migrations and
// commands quickly in CI, but it is additional to — not a substitute for — the iOS Expo SQLite run
// recorded by `npm run test:db` (docs/evidence/PHASE_05.md).
const driver = createNodeSqliteDriver(temporaryDirectory('scenarios'));
let counter = 0;
const context: ScenarioContext = {
  driver,
  databaseName: (label) => `dbtest-${label}-${(counter += 1)}.db`,
  deleteDatabase: async (name) => {
    for (const suffix of ['', '-wal', '-shm', '-journal']) {
      fs.rmSync(path.join(driver.directory, `${name}${suffix}`), { force: true });
    }
  },
};

describe('database scenarios on host SQLite (Jest, additional to the native run)', () => {
  it.each([...DATABASE_SCENARIOS, ...GOAL_SCENARIOS, ...INTL_SCENARIOS].map((scenario) => [scenario.id, scenario] as const))('%s', async (_id, scenario) => {
    const [result] = await runScenarios([scenario], context, () => 0);
    expect(result?.error).toBeUndefined();
    expect(result?.status).toBe('pass');
  });

  it('R1/R2 restart pair reopens the same exact state', async () => {
    const results = await runScenarios([restartSeedScenario('jest'), restartVerifyScenario('jest')], context, () => 0);
    expect(results.map((result) => result.error)).toEqual([undefined, undefined]);
  });
});
