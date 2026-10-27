import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

import { AppDatabase } from '@/data/db/database';
import { MIGRATIONS } from '@/data/db/migrations';

import { buildReleaseFixture, fixtureClock, RELEASE_FIXTURE } from '../native/release-fixture';
import { createNodeSqliteDriver, temporaryDirectory } from '../support/node-sqlite-driver';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { describeDigest, persistedDigest } = require('../../scripts/release/persisted-digest.js') as typeof import('../../scripts/release/persisted-digest.js');

// Phase 20: the synthetic fixture for the release-mode OTA drill, built through the real commands on
// host SQLite, and the redacted digest that scripts/ota-drill.mjs compares before and after every
// update, rollback and relaunch. Set RELEASE_FIXTURE_DIR to keep the file for `ota-drill seed`.

async function buildFixtureFile(): Promise<string> {
  const directory = process.env.RELEASE_FIXTURE_DIR ?? temporaryDirectory('release-fixture');
  const file = path.join(directory, 'saving-worlds.db');
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(file + suffix, { force: true });
  }
  const clock = fixtureClock();
  const db = await AppDatabase.open({ driver: createNodeSqliteDriver(directory), name: 'saving-worlds.db', migrations: MIGRATIONS, clock });
  await buildReleaseFixture(db, clock);
  await db.close();
  return file;
}

function digestOf(file: string) {
  const db = new DatabaseSync(file);
  try {
    return persistedDigest(db);
  } finally {
    db.close();
  }
}

describe('release drill fixture', () => {
  it('holds the independently worked ledger, receipts, souvenir and attempts, closed to one file', async () => {
    const file = await buildFixtureFile();
    expect(fs.existsSync(`${file}-wal`) && fs.statSync(`${file}-wal`).size > 0).toBe(false);
    const { summary } = digestOf(file);

    expect(summary.migrations.map((row) => row.version)).toEqual([1, 2, 3, 4, 5]);
    expect(summary.currency).toBe(RELEASE_FIXTURE.currency);
    expect(summary.goals).toHaveLength(1);
    expect(summary.goals[0]).toMatchObject({ status: 'active', themeId: 'island', targetMinor: 100_000, balanceMinor: 80_000, entries: 3 });
    expect(summary.entries.map((entry) => entry.signedMinor)).toEqual([...RELEASE_FIXTURE.entries]);
    expect(summary.entries.map((entry) => entry.hasNote)).toEqual([1, 0, 0]);
    expect(summary.receipts.reduce((total, row) => total + row.count, 0)).toBe(RELEASE_FIXTURE.receipts);
    expect(summary.collectibles).toEqual([expect.objectContaining(RELEASE_FIXTURE.souvenir)]);
    expect(summary.attempts.map(({ ruleId, state, result }) => ({ ruleId, state, result }))).toEqual(
      RELEASE_FIXTURE.attempts.map(({ ruleId, state, result }) => ({ ruleId, state, result })),
    );
    expect(summary.attempts.slice(1).map((attempt) => attempt.targetMinor)).toEqual([10_000, 10_000]);
    expect(summary.entitlements).toEqual([]);
    expect(summary.purchaseEvents).toEqual([]);
    expect(summary.missingTables).toEqual([]);
  });

  it('gives the same digest for the same state and a different one after any ledger change', async () => {
    const first = digestOf(await buildFixtureFile());
    const copyDir = temporaryDirectory('release-fixture-copy');
    const copy = path.join(copyDir, 'copy.db');
    const source = await buildFixtureFile();
    fs.copyFileSync(source, copy);
    // Random IDs differ between builds, so compare a copy of one file with itself, then change it.
    const before = digestOf(copy);
    expect(digestOf(copy)).toEqual(before);
    expect(describeDigest(before)).toMatch(/^ledger [0-9a-f]{12} · schema 5 · goals \[island:active:80000\/100000\] · entries 3 · receipts 9 · souvenirs 1 · attempts \[first_step=completed, next_milestone=completed, next_milestone=active\] · rights none$/);
    const db = new DatabaseSync(copy);
    db.exec('DROP TRIGGER IF EXISTS ledger_entries_no_update');
    db.prepare('UPDATE ledger_entries SET revision = revision + 1 WHERE rowid = (SELECT MIN(rowid) FROM ledger_entries)').run();
    db.close();
    const after = digestOf(copy);
    expect(after.sha256).not.toBe(before.sha256);
    expect(after.ledgerSha256).not.toBe(before.ledgerSha256);
    expect(first.summary.goals[0]?.balanceMinor).toBe(RELEASE_FIXTURE.balanceMinor);
  });
});
