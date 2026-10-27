import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

import { AppDatabase } from '@/data/db/database';
import { MIGRATIONS } from '@/data/db/migrations';

import { buildStoreFixture, STORE_FIXTURE, storeFixtureClock } from '../native/store-fixture';
import { createNodeSqliteDriver, temporaryDirectory } from '../support/node-sqlite-driver';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { persistedDigest } = require('../../scripts/release/persisted-digest.js') as typeof import('../../scripts/release/persisted-digest.js');

// Phase 22: the App Store screenshot fixture, built through the real commands on host SQLite. Set
// STORE_FIXTURE_DIR to keep the file for `node scripts/ota-drill.mjs seed --db <dir>/saving-worlds.db`
// on a throwaway simulator (store/screenshots/README.md).

async function buildFixtureFile(): Promise<string> {
  const directory = process.env.STORE_FIXTURE_DIR ?? temporaryDirectory('store-fixture');
  const file = path.join(directory, 'saving-worlds.db');
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(file + suffix, { force: true });
  }
  const clock = storeFixtureClock();
  const db = await AppDatabase.open({ driver: createNodeSqliteDriver(directory), name: 'saving-worlds.db', migrations: MIGRATIONS, clock });
  await buildStoreFixture(db, clock);
  await db.close();
  return file;
}

describe('store screenshot fixture', () => {
  it('holds the independently worked Free goal, ledger and next-milestone quest, closed to one file', async () => {
    const file = await buildFixtureFile();
    const db = new DatabaseSync(file);
    const { summary } = persistedDigest(db);
    db.close();

    expect(summary.currency).toBe(STORE_FIXTURE.currency);
    expect(summary.goals).toHaveLength(1);
    expect(summary.goals[0]).toMatchObject({
      status: 'active',
      themeId: 'island',
      targetMinor: STORE_FIXTURE.targetMinor,
      balanceMinor: STORE_FIXTURE.balanceMinor,
      entries: STORE_FIXTURE.entries.length,
    });
    expect(summary.entries.map((entry) => entry.signedMinor)).toEqual([...STORE_FIXTURE.entries]);
    expect(summary.collectibles).toEqual([]);
    expect(summary.attempts.map(({ ruleId, state, result, targetMinor }) => ({ ruleId, state, result, targetMinor }))).toEqual([
      { ruleId: 'next_milestone', state: 'active', result: null, targetMinor: STORE_FIXTURE.questTargetMinor },
    ]);
    expect(summary.entitlements).toEqual([]);
    expect(summary.purchaseEvents).toEqual([]);
  });
});
