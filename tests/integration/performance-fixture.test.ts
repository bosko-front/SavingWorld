import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

import { getCurrency, type CurrencyMetadata } from '@/core/money';
import { AppDatabase } from '@/data/db/database';
import { MIGRATIONS } from '@/data/db/migrations';

import { performanceFixtureClock, seedPerformanceFixture, type FixtureShape } from '../native/performance-scenarios';
import { createNodeSqliteDriver, temporaryDirectory } from '../support/node-sqlite-driver';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { persistedDigest } = require('../../scripts/release/persisted-digest.js') as typeof import('../../scripts/release/persisted-digest.js');

// Phase 21: app database files for the simulator UI measurements (docs/evidence/PHASE_21.md),
// built through the same seeding as the native PF scenarios and closed to one file. Set
// PERF_FIXTURE_DIR to keep them for `node scripts/ota-drill.mjs seed --db <dir>/<name>/saving-worlds.db`.
// Synthetic data only; no entitlement rows (Pro is never seeded).
const EUR = getCurrency('EUR') as CurrencyMetadata;

const SHAPES: Record<string, FixtureShape> = {
  // Free: one goal with 10,000 entries over three years and a year of weekly quests.
  'ui-free-10k': { label: 'uifree', currency: EUR, perGoal: [10_000], weeklyQuests: true, souvenirs: 0, finished: 0 },
  // Thirteen goals, twelve souvenirs, nine finished (a Pro person's Collection; without a stored
  // right the app shows the lost-Pro state, which still lists every souvenir).
  'ui-collection': {
    label: 'uicoll',
    currency: EUR,
    perGoal: [2_000, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300],
    weeklyQuests: false,
    souvenirs: 12,
    finished: 9,
  },
};

async function buildFile(name: string, shape: FixtureShape): Promise<string> {
  const root = process.env.PERF_FIXTURE_DIR ?? temporaryDirectory('perf-fixture');
  const directory = path.join(root, name);
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, 'saving-worlds.db');
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(file + suffix, { force: true });
  }
  const clock = performanceFixtureClock();
  const db = await AppDatabase.open({ driver: createNodeSqliteDriver(directory), name: 'saving-worlds.db', migrations: MIGRATIONS, clock });
  await seedPerformanceFixture(db, clock, shape);
  await db.close();
  return file;
}

describe('performance fixture files', () => {
  it('writes the Free 10,000-entry app database', async () => {
    const file = await buildFile('ui-free-10k', SHAPES['ui-free-10k'] as FixtureShape);
    const db = new DatabaseSync(file);
    const { summary } = persistedDigest(db);
    db.close();
    expect(summary.goals).toHaveLength(1);
    expect(summary.goals[0]).toMatchObject({ status: 'active', entries: 10_000 });
    expect(summary.attempts).toHaveLength(52);
    expect(summary.collectibles).toEqual([]);
    expect(summary.entitlements).toEqual([]);
  }, 300_000);

  it('writes the thirteen-goal Collection app database', async () => {
    const file = await buildFile('ui-collection', SHAPES['ui-collection'] as FixtureShape);
    const db = new DatabaseSync(file);
    const { summary } = persistedDigest(db);
    db.close();
    expect(summary.goals).toHaveLength(13);
    expect(summary.collectibles).toHaveLength(12);
    expect(summary.goals.filter((goal) => goal.status === 'completed')).toHaveLength(9);
    expect(summary.entitlements).toEqual([]);
  }, 300_000);
});
