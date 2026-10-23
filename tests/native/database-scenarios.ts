import { capabilitiesFor } from '@/core/access';
import { utcTimestamp, type Clock } from '@/core/calendar';
import { getCurrency, type CurrencyMetadata } from '@/core/money';
import { AppDatabase, type DatabaseTestHooks } from '@/data/db/database';
import type { Migration } from '@/data/db/migration-runner';
import { MIGRATIONS } from '@/data/db/migrations';
import type { SqlExecutor } from '@/data/db/sql';
import type { IdGenerator } from '@/data/ids';
import { updateGoalStatus } from '@/data/repositories/goal-repository';
import { getEntry } from '@/data/repositories/ledger-repository';
import { writeCurrency } from '@/data/repositories/settings-repository';
import { createGoal, type GoalCommandDeps } from '@/features/goals/application/goal-commands';
import {
  correctEntry,
  createEntry,
  deleteEntry,
  type EntryValuesInput,
  type LedgerCommandDeps,
} from '@/features/ledger/application/ledger-commands';
import { readGoalLedger } from '@/features/ledger/application/ledger-queries';

import { check, equal, rejects, type Scenario, type ScenarioContext } from './scenario-harness';

// Phase 05 database scenarios (docs/TEST_PLAN.md T04 and the Phase 05 prompt). The same file runs on
// the iOS simulator through the real Expo SQLite adapter (`npm run test:db`, the evidence) and in
// Jest on host SQLite (additional only). Every scenario uses its own `dbtest-` database and deletes
// it afterwards; none touches the app database.

const EUR = getCurrency('EUR') as CurrencyMetadata;
const START = '2026-10-23T08:00:00.000Z';
const ZONE = 'Europe/Belgrade';

// A clock that advances one second per reading, so createdAt is strictly increasing.
function steppingClock(startIso = START, timeZone = ZONE): Clock {
  let t = Date.parse(startIso);
  return { nowMs: () => (t += 1000), timeZone: () => timeZone };
}

function sequentialIds(prefix: string): IdGenerator {
  let n = 0;
  return { newId: () => `${prefix}-${String((n += 1)).padStart(4, '0')}` };
}

type Harness = {
  db: AppDatabase;
  clock: Clock;
  deps: LedgerCommandDeps & GoalCommandDeps;
  goalId: string;
  name: string;
  op: () => string;
  hooks: { failBeforeCommit: boolean };
};

type SetupOptions = { currency?: boolean; goal?: boolean; clock?: Clock; ids?: IdGenerator };

class Session {
  private readonly open: AppDatabase[] = [];
  private readonly names = new Set<string>();

  constructor(private readonly context: ScenarioContext) {}

  name(label: string): string {
    const name = this.context.databaseName(label);
    this.names.add(name);
    return name;
  }

  async openDb(name: string, migrations: readonly Migration[] = MIGRATIONS, clock = steppingClock(), testHooks?: DatabaseTestHooks) {
    const db = await AppDatabase.open({ driver: this.context.driver, name, migrations, clock, testHooks });
    this.open.push(db);
    return db;
  }

  async raw(name: string) {
    return this.context.driver.open(name);
  }

  async harness(label: string, options: SetupOptions = {}): Promise<Harness> {
    const name = this.name(label);
    const clock = options.clock ?? steppingClock();
    const hooks = { failBeforeCommit: false };
    const db = await this.openDb(name, MIGRATIONS, clock, {
      beforeCommit: async () => {
        if (hooks.failBeforeCommit) {
          throw new Error('Injected failure before COMMIT');
        }
      },
    });
    const ids = options.ids ?? sequentialIds(label);
    const deps = { db, clock, ids };
    let ops = 0;
    const op = () => `op-${label}-${(ops += 1)}`;
    if (options.currency !== false) {
      await db.write((tx) => writeCurrency(tx, EUR, utcTimestamp(clock)));
    }
    let goalId = '';
    if (options.goal !== false && options.currency !== false) {
      const created = await createGoal(deps, {
        operationId: op(),
        title: 'Summer trip',
        targetMinor: 100_000,
        deadlineDate: null,
        themeId: 'island',
      });
      check(created.ok, `goal setup failed: ${JSON.stringify(created)}`);
      goalId = created.value.goalId;
    }
    return { db, clock, deps, goalId, name, op, hooks };
  }

  async cleanup(): Promise<void> {
    for (const db of this.open) {
      await db.close();
    }
    for (const name of this.names) {
      await this.context.deleteDatabase(name);
    }
  }
}

async function withSession<T>(context: ScenarioContext, body: (session: Session) => Promise<T>): Promise<T> {
  const session = new Session(context);
  try {
    return await body(session);
  } finally {
    await session.cleanup();
  }
}

function values(kind: EntryValuesInput['kind'], amountMinor: number, entryDate: string, note: string | null = null) {
  return { kind, amountMinor, entryDate, note };
}

async function balanceOf(h: Harness): Promise<number> {
  const ledger = await readGoalLedger(h.db, h.goalId);
  check(ledger, 'goal ledger missing');
  return ledger.balanceMinor;
}

async function count(executor: SqlExecutor, table: string): Promise<number> {
  const row = await executor.get<{ n: number }>(`SELECT count(*) AS n FROM ${table}`);
  return Number(row?.n);
}

async function tableNames(executor: SqlExecutor): Promise<string[]> {
  const rows = await executor.all<{ name: string }>(
    "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\' ORDER BY name",
  );
  return rows.map((row) => row.name);
}

function expectError(result: { ok: boolean; error?: unknown }, code: string, label: string): void {
  check(!result.ok, `${label}: expected ${code}, got success`);
  const actual = (result.error as { code?: string } | undefined)?.code;
  equal(actual, code, label);
}

async function deposit(h: Harness, amount: number, date: string, note: string | null = null) {
  return createEntry(h.deps, { operationId: h.op(), goalId: h.goalId, ...values('deposit', amount, date, note) });
}

async function withdraw(h: Harness, amount: number, date: string) {
  return createEntry(h.deps, { operationId: h.op(), goalId: h.goalId, ...values('withdrawal', amount, date) });
}

async function mustCreate(h: Harness, kind: EntryValuesInput['kind'], amount: number, date: string, note: string | null = null) {
  const result = await createEntry(h.deps, { operationId: h.op(), goalId: h.goalId, ...values(kind, amount, date, note) });
  check(result.ok, `create ${kind} ${amount} ${date} failed: ${JSON.stringify(result)}`);
  return result.value;
}

const EXPECTED_TABLES = ['goals', 'ledger_entries', 'migrations', 'operation_receipts', 'settings'];

export const DATABASE_SCENARIOS: Scenario[] = [
  {
    id: 'S01',
    title: 'Fresh database: schema 1, WAL, foreign keys on both connections, integrity checks',
    run: (context) =>
      withSession(context, async (s) => {
        const db = await s.openDb(s.name('fresh'));
        equal(db.migration, { fromVersion: 0, toVersion: 1, applied: [1] }, 'migration outcome');
        const pragmas = await db.pragmas();
        equal(pragmas.writer.journalMode.toLowerCase(), 'wal', 'writer journal_mode');
        equal(pragmas.writer.foreignKeys, true, 'writer foreign_keys');
        equal(pragmas.reader.foreignKeys, true, 'reader foreign_keys');
        equal(pragmas.writer.synchronous, 2, 'writer synchronous FULL');
        const facts = await db.read(async (r) => {
          equal(await tableNames(r), EXPECTED_TABLES, 'tables (no audit/revision/balance tables)');
          const quick = await r.get<{ quick_check: string }>('PRAGMA quick_check');
          equal(quick?.quick_check, 'ok', 'quick_check');
          equal((await r.all('PRAGMA foreign_key_check')).length, 0, 'foreign_key_check');
          const version = await r.get<{ v: string }>('SELECT sqlite_version() AS v');
          const history = await r.all('SELECT version, name, checksum FROM migrations');
          const goalColumns = (await r.all<{ name: string }>('PRAGMA table_info(goals)')).map((c) => c.name);
          const entryColumns = (await r.all<{ name: string }>('PRAGMA table_info(ledger_entries)')).map((c) => c.name);
          check(!goalColumns.some((c) => /balance|currency|exponent/.test(c)), 'goals has no balance/currency column');
          check(!entryColumns.some((c) => /currency|previous|before|after/.test(c)), 'ledger has no currency/snapshot column');
          return { sqliteVersion: version?.v, history, goalColumns, entryColumns };
        });
        await rejects(db.read((r) => r.run("INSERT INTO settings VALUES ('x', '1', ?)", [START])), /readonly|read-only/i, 'reader is query_only');
        return { driver: context.driver.name, ...facts, pragmas };
      }),
  },
  {
    id: 'S02',
    title: 'Repeated startup keeps schema and data without re-running or resetting',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('repeat');
        await mustCreate(h, 'deposit', 5_000, '2026-10-20', 'first');
        await mustCreate(h, 'withdrawal', 1_250, '2026-10-21');
        await h.db.close();
        const firstAppliedAt = await (async () => {
          const raw = await s.raw(h.name);
          const row = await raw.get<{ applied_at_utc: string }>('SELECT applied_at_utc FROM migrations WHERE version = 1');
          await raw.close();
          return row?.applied_at_utc;
        })();
        for (let i = 0; i < 3; i += 1) {
          const db = await s.openDb(h.name);
          equal(db.migration, { fromVersion: 1, toVersion: 1, applied: [] }, `reopen ${i + 1} migration outcome`);
          const ledger = await readGoalLedger(db, h.goalId);
          equal(ledger?.balanceMinor, 3_750, `reopen ${i + 1} balance`);
          equal(ledger?.entries.map((e) => e.note), ['first', null], `reopen ${i + 1} notes`);
          const applied = await db.read((r) => r.all('SELECT version, applied_at_utc FROM migrations'));
          equal(applied, [{ version: 1, applied_at_utc: firstAppliedAt }], `reopen ${i + 1} history unchanged`);
          await db.close();
        }
      }),
  },
  {
    id: 'S03',
    title: 'Failed migration rolls back completely; prior data intact; later upgrade applies',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('migfail');
        await mustCreate(h, 'deposit', 9_999, '2026-10-22', 'keep me');
        await h.db.close();
        const broken: Migration = {
          version: 2,
          name: 'broken_upgrade',
          sql: 'CREATE TABLE upgrade_probe (id TEXT PRIMARY KEY) STRICT; UPDATE ledger_entries SET note = NULL; INSERT INTO missing_table VALUES (1);',
        };
        await rejects(s.openDb(h.name, [...MIGRATIONS, broken]), /migration_failed|Migration 2 failed/, 'broken migration');
        const db = await s.openDb(h.name);
        equal(db.migration.applied, [], 'still schema 1');
        const state = await db.read(async (r) => ({
          tables: await tableNames(r),
          notes: (await r.all<{ note: string | null }>('SELECT note FROM ledger_entries')).map((row) => row.note),
        }));
        equal(state.tables, EXPECTED_TABLES, 'no partial upgrade table');
        equal(state.notes, ['keep me'], 'data untouched by the failed migration');
        await db.close();
        const good: Migration = { version: 2, name: 'probe_upgrade', sql: 'CREATE TABLE upgrade_probe (id TEXT PRIMARY KEY) STRICT;' };
        const upgraded = await s.openDb(h.name, [...MIGRATIONS, good]);
        equal(upgraded.migration, { fromVersion: 1, toVersion: 2, applied: [2] }, 'upgrade outcome');
        equal((await readGoalLedger(upgraded, h.goalId))?.balanceMinor, 9_999, 'balance after upgrade');
      }),
  },
  {
    id: 'S04',
    title: 'Unknown newer schema, edited migration and foreign database fail safely without changes',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('newer');
        await mustCreate(h, 'deposit', 4_200, '2026-10-22');
        await h.db.close();
        const raw = await s.raw(h.name);
        await raw.run("INSERT INTO migrations VALUES (2, 'from_the_future', 'ffff', '2027-01-01T00:00:00.000Z')");
        await raw.close();
        await rejects(s.openDb(h.name), /newer_schema|newer than supported/, 'newer schema');
        const after = await s.raw(h.name);
        equal(await count(after, 'ledger_entries'), 1, 'entries kept after newer-schema refusal');
        equal(await count(after, 'migrations'), 2, 'history kept');
        await after.run('DELETE FROM migrations WHERE version = 2');
        await after.close();

        const edited: Migration = { ...MIGRATIONS[0]!, sql: `${MIGRATIONS[0]!.sql}\n-- edited` };
        await rejects(s.openDb(h.name, [edited]), /migration_history_mismatch|differs/, 'edited migration');

        const foreignName = s.name('foreign');
        const foreign = await s.raw(foreignName);
        await foreign.exec('CREATE TABLE notes (body TEXT); INSERT INTO notes VALUES (\'other app\');');
        await foreign.close();
        await rejects(s.openDb(foreignName), /unrecognized_database|no migration history/, 'foreign database');
        const check2 = await s.raw(foreignName);
        equal(await tableNames(check2), ['notes'], 'foreign database untouched');
        await check2.close();
      }),
  },
  {
    id: 'S05',
    title: 'Foreign keys, CHECK constraints and triggers defend the command invariants',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('constraints');
        const entry = await mustCreate(h, 'deposit', 1_000, '2026-10-22');
        const row = (sql: string, params: (string | number | null)[]) => h.db.write((tx) => tx.run(sql, params));
        const insert = 'INSERT INTO ledger_entries VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        await rejects(row(insert, ['x1', 'no-such-goal', 100, '2026-10-22', null, START, START, 1]), /FOREIGN KEY/i, 'FK goal');
        await rejects(row(insert, ['x2', h.goalId, 0, '2026-10-22', null, START, START, 1]), /CHECK/i, 'zero amount');
        await rejects(row(insert, ['x3', h.goalId, 1_000_000_000_001, '2026-10-22', null, START, START, 1]), /CHECK/i, 'amount ceiling');
        await rejects(row(insert, ['x4', h.goalId, 5, '22.10.2026', null, START, START, 1]), /CHECK/i, 'date format');
        await rejects(row(insert, ['x5', h.goalId, 5, '2026-10-22', '', START, START, 1]), /CHECK/i, 'empty note');
        await rejects(row(insert, [entry.entryId, h.goalId, 5, '2026-10-22', null, START, START, 1]), /UNIQUE|PRIMARY/i, 'duplicate id');
        await rejects(row('UPDATE ledger_entries SET created_at_utc = ?, revision = revision + 1 WHERE id = ?', ['2026-01-01T00:00:00.000Z', entry.entryId]), /immutable/, 'createdAt immutable');
        await rejects(row('UPDATE ledger_entries SET signed_amount_minor = 7 WHERE id = ?', [entry.entryId]), /revision/, 'revision step');
        await rejects(row('DELETE FROM goals WHERE id = ?', [h.goalId]), /never deleted/, 'no goal deletion');
        await rejects(row("UPDATE goals SET status = 'deleted', revision = revision + 1 WHERE id = ?", [h.goalId]), /CHECK/i, 'status values');
        await rejects(row('UPDATE goals SET target_minor = 0, revision = revision + 1 WHERE id = ?', [h.goalId]), /CHECK/i, 'target > 0');
        await rejects(row("UPDATE operation_receipts SET request_hash = 'x'", []), /immutable/, 'receipts immutable');
        await rejects(row("INSERT INTO settings VALUES ('currency', 'not json', ?)", [START]), /CHECK|UNIQUE/i, 'settings json');
        await rejects(row('INSERT INTO goals VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['g2', 'x', 5.5, null, 'island', 'active', START, START, 1]), /datatype|CHECK|cannot store/i, 'STRICT integer target');
        await h.db.write((tx) => updateGoalStatus(tx, h.goalId, 'archived', 1, START));
        await rejects(row('DELETE FROM ledger_entries WHERE id = ?', [entry.entryId]), /goal is closed/, 'closed goal trigger');
        const fkCheck = await h.db.read((r) => r.all('PRAGMA foreign_key_check'));
        equal(fkCheck.length, 0, 'foreign_key_check clean');
        equal(await h.db.read((r) => count(r, 'ledger_entries')), 1, 'only the valid entry exists');
      }),
  },
  {
    id: 'S06',
    title: 'v1.2 example: 0 + 50 − 20 = 30, withdrawal 31 rejected atomically',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('example');
        await mustCreate(h, 'deposit', 5_000, '2026-10-20');
        const w = await mustCreate(h, 'withdrawal', 2_000, '2026-10-21');
        equal([w.previousBalanceMinor, w.balanceMinor], [5_000, 3_000], 'balances after withdrawal');
        const rejected = await withdraw(h, 3_100, '2026-10-22');
        expectError(rejected, 'negative_balance', 'withdrawal 31');
        const counts = await h.db.read(async (r) => [await count(r, 'ledger_entries'), await count(r, 'operation_receipts')]);
        equal(counts, [2, 3], 'no entry or receipt for the rejected withdrawal');
        equal(await balanceOf(h), 3_000, 'balance unchanged');
      }),
  },
  {
    id: 'S07',
    title: 'Withdrawal dated before the first deposit is rejected even when the final total is positive',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('before-first');
        await mustCreate(h, 'deposit', 10_000, '2026-10-20');
        const early = await withdraw(h, 500, '2026-10-19');
        expectError(early, 'negative_running_balance', 'early withdrawal');
        check(!early.ok && 'date' in early.error && early.error.date === '2026-10-19', 'reports the date of the dip');
        const sameDay = await withdraw(h, 500, '2026-10-20');
        check(sameDay.ok, 'same-day withdrawal created after the deposit is allowed');
        equal(await balanceOf(h), 9_500, 'balance');
      }),
  },
  {
    id: 'S08',
    title: 'Deleting a deposit needed by a later withdrawal is rejected despite a later positive total',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('delete-needed');
        const first = await mustCreate(h, 'deposit', 5_000, '2026-10-01');
        await mustCreate(h, 'withdrawal', 4_000, '2026-10-05');
        await mustCreate(h, 'deposit', 10_000, '2026-10-10');
        const refused = await deleteEntry(h.deps, { operationId: h.op(), entryId: first.entryId, expectedRevision: 1, confirmed: true });
        expectError(refused, 'negative_running_balance', 'delete needed deposit');
        equal(await balanceOf(h), 11_000, 'balance unchanged');
        equal(await h.db.read((r) => count(r, 'ledger_entries')), 3, 'entry kept');

        const v12 = await s.harness('delete-initial');
        const initial = await mustCreate(v12, 'deposit', 5_000, '2026-10-20');
        await mustCreate(v12, 'withdrawal', 2_000, '2026-10-21');
        const refused2 = await deleteEntry(v12.deps, { operationId: v12.op(), entryId: initial.entryId, expectedRevision: 1, confirmed: true });
        expectError(refused2, 'negative_balance', 'v1.2: delete initial deposit while withdrawal 20 remains');
        const unconfirmed = await deleteEntry(v12.deps, { operationId: v12.op(), entryId: initial.entryId, expectedRevision: 1, confirmed: false });
        expectError(unconfirmed, 'confirmation_required', 'delete requires confirmation');
      }),
  },
  {
    id: 'S09',
    title: 'Corrections overwrite current values, keep createdAt, step the revision and revalidate history',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('correct');
        const d = await mustCreate(h, 'deposit', 5_000, '2026-10-10', 'salary');
        const w = await mustCreate(h, 'withdrawal', 3_000, '2026-10-12');
        const before = await h.db.read((r) => getEntry(r, d.entryId));
        const tooSmall = await correctEntry(h.deps, { operationId: h.op(), entryId: d.entryId, expectedRevision: 1, ...values('deposit', 2_000, '2026-10-10', 'salary') });
        expectError(tooSmall, 'negative_balance', 'correct deposit below later withdrawal');
        const moved = await correctEntry(h.deps, { operationId: h.op(), entryId: d.entryId, expectedRevision: 1, ...values('deposit', 5_000, '2026-10-13', 'salary') });
        expectError(moved, 'negative_running_balance', 'move deposit after withdrawal');
        const flipped = await correctEntry(h.deps, { operationId: h.op(), entryId: w.entryId, expectedRevision: 1, ...values('deposit', 3_000, '2026-10-12') });
        check(flipped.ok, 'withdrawal corrected to deposit');
        equal(flipped.value.balanceMinor, 8_000, 'balance after sign correction');
        const fixed = await correctEntry(h.deps, { operationId: h.op(), entryId: d.entryId, expectedRevision: 1, ...values('deposit', 4_500, '2026-10-09', 'salary (fixed)') });
        check(fixed.ok, 'correction saved');
        const after = await h.db.read((r) => getEntry(r, d.entryId));
        equal(after?.createdAtUtc, before?.createdAtUtc, 'createdAt immutable');
        equal([after?.revision, after?.signedAmountMinor, after?.entryDate, after?.note], [2, 4_500, '2026-10-09', 'salary (fixed)'], 'current values overwritten');
        check(after && before && after.updatedAtUtc > before.updatedAtUtc, 'updatedAt advanced');
        const tables = await h.db.read((r) => tableNames(r));
        equal(tables, EXPECTED_TABLES, 'no revision/audit table appeared');
        equal(await h.db.read((r) => count(r, 'ledger_entries')), 2, 'no previous-entry copies');
        equal(await balanceOf(h), 7_500, 'balance recomputed');
      }),
  },
  {
    id: 'S10',
    title: 'Future entry dates are rejected on create and correction, using the device-local date',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('future');
        expectError(await deposit(h, 100, '2026-10-24'), 'future_date', 'tomorrow');
        const today = await mustCreate(h, 'deposit', 100, '2026-10-23');
        expectError(
          await correctEntry(h.deps, { operationId: h.op(), entryId: today.entryId, expectedRevision: 1, ...values('deposit', 100, '2026-10-24') }),
          'future_date',
          'correct to tomorrow',
        );
        expectError(await deposit(h, 100, '2026-02-30'), 'invalid_date', 'impossible date');
        // 23:30 UTC on 23 Oct is already 24 Oct in Belgrade but still 23 Oct in Los Angeles.
        const late = await s.harness('future-zone-be', { clock: steppingClock('2026-10-23T23:30:00.000Z', 'Europe/Belgrade') });
        check((await deposit(late, 100, '2026-10-24')).ok, 'Belgrade local today accepted');
        const la = await s.harness('future-zone-la', { clock: steppingClock('2026-10-23T23:30:00.000Z', 'America/Los_Angeles') });
        expectError(await deposit(la, 100, '2026-10-24'), 'future_date', 'Los Angeles tomorrow');
        equal(await h.db.read((r) => count(r, 'ledger_entries')), 1, 'only the valid entry stored');
      }),
  },
  {
    id: 'S11',
    title: 'Stable operation IDs replay without duplicating; a changed payload is a conflict',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('idempotent');
        const input = { operationId: 'op-retry-1', goalId: h.goalId, ...values('deposit', 2_500, '2026-10-22', 'retry') };
        const first = await createEntry(h.deps, input);
        const second = await createEntry(h.deps, input);
        check(first.ok && second.ok, 'both calls succeed');
        equal([first.value.replayed, second.value.replayed], [false, true], 'second call is a replay');
        equal(second.value.entryId, first.value.entryId, 'same entry id');
        equal(await h.db.read((r) => count(r, 'ledger_entries')), 1, 'one entry');
        expectError(await createEntry(h.deps, { ...input, amountMinor: 2_600 }), 'operation_conflict', 'changed amount');
        expectError(await createEntry(h.deps, { ...input, note: 'other' }), 'operation_conflict', 'changed note');

        const fix = { operationId: 'op-retry-2', entryId: first.value.entryId, expectedRevision: 1, ...values('deposit', 3_000, '2026-10-22', 'retry') };
        const c1 = await correctEntry(h.deps, fix);
        const c2 = await correctEntry(h.deps, fix);
        check(c1.ok && c2.ok, 'correction and its retry succeed');
        equal([c2.value.replayed, c2.value.entryRevision, c2.value.balanceMinor], [true, 2, 3_000], 'correction replay result');
        expectError(await createEntry(h.deps, { ...input, operationId: 'op-retry-2' }), 'operation_conflict', 'same id, other command');

        const del = { operationId: 'op-retry-3', entryId: first.value.entryId, expectedRevision: 2, confirmed: true };
        const d1 = await deleteEntry(h.deps, del);
        const d2 = await deleteEntry(h.deps, del);
        check(d1.ok && d2.ok, 'delete and its retry succeed');
        equal([d2.value.replayed, d2.value.entryRevision, d2.value.balanceMinor], [true, null, 0], 'delete replay result');
        const receipts = await h.db.read((r) => r.all<{ result_json: string }>('SELECT result_json FROM operation_receipts'));
        check(receipts.every((row) => !/2500|3000|retry/.test(row.result_json)), 'receipts keep no amounts or notes');
      }),
  },
  {
    id: 'S12',
    title: 'Stale revisions and missing rows fail clearly',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('stale');
        const e = await mustCreate(h, 'deposit', 1_000, '2026-10-22');
        check((await correctEntry(h.deps, { operationId: h.op(), entryId: e.entryId, expectedRevision: 1, ...values('deposit', 1_100, '2026-10-22') })).ok, 'first edit');
        const stale = await correctEntry(h.deps, { operationId: h.op(), entryId: e.entryId, expectedRevision: 1, ...values('deposit', 900, '2026-10-22') });
        expectError(stale, 'stale_entry', 'second editor with old revision');
        check(!stale.ok && 'currentRevision' in stale.error && stale.error.currentRevision === 2, 'reports current revision');
        expectError(await deleteEntry(h.deps, { operationId: h.op(), entryId: e.entryId, expectedRevision: 1, confirmed: true }), 'stale_entry', 'stale delete');
        expectError(await deleteEntry(h.deps, { operationId: h.op(), entryId: 'missing-entry', expectedRevision: 1, confirmed: true }), 'entry_not_found', 'missing entry');
        expectError(await createEntry(h.deps, { operationId: h.op(), goalId: 'missing-goal', ...values('deposit', 1, '2026-10-22') }), 'goal_not_found', 'missing goal');
        equal((await h.db.read((r) => getEntry(r, e.entryId)))?.signedAmountMinor, 1_100, 'first edit kept');
      }),
  },
  {
    id: 'S13',
    title: 'Concurrent deposits, withdrawals and corrections serialize to an exact result',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('concurrent');
        const seed = await mustCreate(h, 'deposit', 5_000, '2026-10-20');
        const withdrawals = await Promise.all(Array.from({ length: 5 }, () => withdraw(h, 2_000, '2026-10-21')));
        equal(withdrawals.filter((r) => r.ok).length, 2, 'exactly two 20.00 withdrawals fit in 50.00');
        equal(withdrawals.filter((r) => !r.ok && r.error.code === 'negative_balance').length, 3, 'three rejected');
        const deposits = await Promise.all(Array.from({ length: 20 }, (_, i) => deposit(h, 100 + i, '2026-10-22')));
        check(deposits.every((r) => r.ok), 'all concurrent deposits committed');
        const expected = 5_000 - 4_000 + Array.from({ length: 20 }, (_, i) => 100 + i).reduce((a, b) => a + b, 0);
        equal(await balanceOf(h), expected, 'exact balance after concurrent writes');
        const edits = await Promise.all(
          [6_000, 7_000, 8_000].map((amount) =>
            correctEntry(h.deps, { operationId: h.op(), entryId: seed.entryId, expectedRevision: 1, ...values('deposit', amount, '2026-10-20') }),
          ),
        );
        equal(edits.filter((r) => r.ok).length, 1, 'one concurrent correction wins');
        equal(edits.filter((r) => !r.ok && r.error.code === 'stale_entry').length, 2, 'others are stale');
        const same = { operationId: 'op-same-concurrent', goalId: h.goalId, ...values('deposit', 1, '2026-10-22') };
        const twins = await Promise.all([createEntry(h.deps, same), createEntry(h.deps, same), createEntry(h.deps, same)]);
        equal(twins.map((r) => r.ok && r.value.replayed), [false, true, true], 'same operation ID concurrently: one write');
        const entries = await h.db.read((r) => count(r, 'ledger_entries'));
        equal(entries, 1 + 2 + 20 + 1, 'entry count');
      }),
  },
  {
    id: 'S14',
    title: 'Unicode and SQL-special notes round-trip exactly; invalid notes are rejected',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('unicode');
        const notes = [
          "Robert'); DROP TABLE ledger_entries;--",
          '100% _wild_ \\ "quoted" `tick` ; -- /* c */',
          'Ćevapi, đak, Šđžčć — Ђорђе',
          'Rücklage für Ostern 🏝️💰',
          'family 👨‍👩‍👧‍👦 ★ 日本語 العربية עברית',
          'line one\nline two\ttabbed',
        ];
        const created: string[] = [];
        for (const note of notes) {
          created.push((await mustCreate(h, 'deposit', 100, '2026-10-22', note)).entryId);
        }
        const combining = await mustCreate(h, 'deposit', 100, '2026-10-22', '  Café  ');
        const stored = await h.db.read(async (r) => {
          const rows = [];
          for (const id of created) {
            rows.push((await getEntry(r, id))?.note);
          }
          return { rows, combining: (await getEntry(r, combining.entryId))?.note, tables: await tableNames(r) };
        });
        equal(stored.rows, notes, 'notes stored byte-exact');
        equal(stored.combining, 'Café', 'NFC normalized and trimmed');
        equal(stored.tables, EXPECTED_TABLES, 'no table dropped');
        const lengths = await h.db.read((r) => r.get<{ l: number }>('SELECT length(note) AS l FROM ledger_entries WHERE id = ?', [created[3]!]));
        equal(lengths?.l, [...notes[3]!].length, 'SQLite length() counts code points like the validator');
        expectError(await deposit(h, 100, '2026-10-22', 'x'.repeat(501)), 'note_too_long', '501 characters');
        check((await deposit(h, 100, '2026-10-22', '🏝'.repeat(500))).ok, '500 astral characters accepted');
        expectError(await deposit(h, 100, '2026-10-22', 'bad \ud800 surrogate'), 'note_invalid', 'unpaired surrogate');
        expectError(await deposit(h, 100, '2026-10-22', 'bell\u0007'), 'note_invalid', 'control character');
        const blank = await mustCreate(h, 'deposit', 100, '2026-10-22', '   ');
        equal((await h.db.read((r) => getEntry(r, blank.entryId)))?.note, null, 'blank note stored as no note');
      }),
  },
  {
    id: 'S15',
    title: 'Forced mid-write failure rolls back entry and receipt; the same operation ID then succeeds',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('rollback');
        const e = await mustCreate(h, 'deposit', 7_000, '2026-10-20', 'original');
        h.hooks.failBeforeCommit = true;
        const input = { operationId: 'op-injected-1', goalId: h.goalId, ...values('deposit', 1_000, '2026-10-21') };
        expectError(await createEntry(h.deps, input), 'storage_failure', 'create during failure');
        expectError(
          await correctEntry(h.deps, { operationId: 'op-injected-2', entryId: e.entryId, expectedRevision: 1, ...values('deposit', 9_000, '2026-10-20', 'changed') }),
          'storage_failure',
          'correct during failure',
        );
        expectError(await deleteEntry(h.deps, { operationId: 'op-injected-3', entryId: e.entryId, expectedRevision: 1, confirmed: true }), 'storage_failure', 'delete during failure');
        h.hooks.failBeforeCommit = false;
        const state = await h.db.read(async (r) => ({
          entries: await count(r, 'ledger_entries'),
          receipts: await r.all<{ operation_id: string }>("SELECT operation_id FROM operation_receipts WHERE operation_id LIKE 'op-injected-%'"),
          entry: await getEntry(r, e.entryId),
        }));
        equal(state.entries, 1, 'no entry from the failed create');
        equal(state.receipts.length, 0, 'no receipts from failed commands');
        equal([state.entry?.signedAmountMinor, state.entry?.note, state.entry?.revision], [7_000, 'original', 1], 'entry unchanged');
        const retried = await createEntry(h.deps, input);
        check(retried.ok && !retried.value.replayed, 'retry with the same operation ID writes once');
        equal(await balanceOf(h), 8_000, 'balance after retry');
        await rejects(
          h.db.write(async (tx) => {
            await tx.run('UPDATE ledger_entries SET note = ?, revision = revision + 1 WHERE id = ?', ['mid', e.entryId]);
            throw new Error('crash between statements');
          }),
          /crash between statements/,
          'raw mid-write throw',
        );
        equal((await h.db.read((r) => getEntry(r, e.entryId)))?.note, 'original', 'raw write rolled back');
      }),
  },
  {
    id: 'S16',
    title: 'Readers see only committed data while a write transaction is open',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('isolation');
        let seenDuring = -1;
        await h.db.write(async (tx) => {
          await tx.run('INSERT INTO ledger_entries VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['iso-1', h.goalId, 500, '2026-10-22', null, START, START, 1]);
          seenDuring = await h.db.read((r) => count(r, 'ledger_entries'));
        });
        equal(seenDuring, 0, 'uncommitted entry invisible to the read connection');
        equal(await h.db.read((r) => count(r, 'ledger_entries')), 1, 'visible after commit');
      }),
  },
  {
    id: 'S17',
    title: 'Closed goals reject ledger changes; currency and goal rules gate creation',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('closed');
        const e = await mustCreate(h, 'deposit', 1_000, '2026-10-22');
        check(await h.db.write((tx) => updateGoalStatus(tx, h.goalId, 'completed', 1, START)), 'goal closed');
        expectError(await deposit(h, 1, '2026-10-22'), 'goal_closed', 'create on completed goal');
        expectError(await correctEntry(h.deps, { operationId: h.op(), entryId: e.entryId, expectedRevision: 1, ...values('deposit', 2, '2026-10-22') }), 'goal_closed', 'correct');
        expectError(await deleteEntry(h.deps, { operationId: h.op(), entryId: e.entryId, expectedRevision: 1, confirmed: true }), 'goal_closed', 'delete');
        check(await h.db.write((tx) => updateGoalStatus(tx, h.goalId, 'paused', 2, START)), 'goal paused');
        check((await deposit(h, 1, '2026-10-22')).ok, 'paused goal accepts entries');

        const none = await s.harness('no-currency', { currency: false });
        const goal = { operationId: none.op(), title: 'Bike', targetMinor: 1_000, deadlineDate: null, themeId: 'island' as const };
        expectError(await createGoal(none.deps, goal), 'currency_missing', 'goal without global currency');
        await none.db.write((tx) => tx.run("INSERT INTO settings VALUES ('currency', ?, ?)", ['{"code":"EUR","exponent":3,"registryVersion":1}', START]));
        expectError(await createGoal(none.deps, goal), 'currency_invalid', 'exponent mismatch is not reinterpreted');

        const free = await s.harness('free-limit');
        const second = { operationId: free.op(), title: 'Second', targetMinor: 500, deadlineDate: null, themeId: 'island' as const };
        expectError(await createGoal(free.deps, second), 'open_goal_limit', 'Free: second open goal');
        expectError(await createGoal(free.deps, { ...second, operationId: free.op(), targetMinor: 0 }), 'invalid_target', 'target zero');
        expectError(await createGoal(free.deps, { ...second, operationId: free.op(), deadlineDate: '2026-10-22' }), 'past_deadline', 'past deadline');
        expectError(await createGoal(free.deps, { ...second, operationId: free.op(), themeId: 'garden' }), 'theme_unavailable', 'Garden on Free');
        expectError(await createGoal(free.deps, { ...second, operationId: free.op(), title: '   ' }), 'title_empty', 'blank title');
        check(await free.db.write((tx) => updateGoalStatus(tx, free.goalId, 'archived', 1, START)), 'archive first goal');
        check((await createGoal(free.deps, second)).ok, 'archived goal frees the slot');
        const pro = { ...free.deps, capabilities: capabilitiesFor('pro') };
        check((await createGoal(pro, { ...second, operationId: free.op(), themeId: 'garden', deadlineDate: '2026-10-23' })).ok, 'Pro: more open goals and Garden');
      }),
  },
  {
    id: 'S18',
    title: 'Exact minor units at the 10^12 ceiling survive storage; the ceiling is enforced',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('ceiling');
        const big = await mustCreate(h, 'deposit', 999_999_999_999, '2026-10-20');
        expectError(await deposit(h, 2, '2026-10-21'), 'balance_limit', 'balance above 10^12');
        check((await deposit(h, 1, '2026-10-21')).ok, 'exactly 10^12');
        expectError(await deposit(h, 1_000_000_000_001, '2026-10-21'), 'invalid_amount', 'amount above ceiling');
        expectError(await deposit(h, 12.5, '2026-10-21'), 'invalid_amount', 'fractional minor units');
        expectError(await deposit(h, 0, '2026-10-21'), 'invalid_amount', 'zero amount');
        const read = await h.db.read((r) => getEntry(r, big.entryId));
        equal(read?.signedAmountMinor, 999_999_999_999, 'exact integer read back');
        equal(await balanceOf(h), 1_000_000_000_000, 'exact balance');
        const w = await mustCreate(h, 'withdrawal', 1_000_000_000_000, '2026-10-22');
        equal(w.balanceMinor, 0, 'full withdrawal to zero');
      }),
  },
  {
    id: 'S19',
    title: 'Same-date, same-createdAt entries are ordered by id',
    run: (context) =>
      withSession(context, async (s) => {
        // A frozen clock gives both entries the same createdAt; ids decide the order.
        const frozen: Clock = { nowMs: () => Date.parse(START), timeZone: () => ZONE };
        // Popped from the end: the goal, then the deposit (entry-b), then the withdrawal (entry-a).
        const ids = ['entry-a', 'entry-b', 'goal-1'];
        const h = await s.harness('tiebreak', { clock: frozen, ids: { newId: () => ids.pop() ?? 'extra' } });
        await mustCreate(h, 'deposit', 1_000, '2026-10-22');
        const w = await withdraw(h, 600, '2026-10-22');
        expectError(w, 'negative_running_balance', 'withdrawal entry-a sorts before deposit entry-b');
      }),
  },
];

// Process-restart pair: the seed suite writes a database and leaves it; after the app process is
// terminated and relaunched, the verify suite reopens it and checks every value.
const RESTART_NOTE = 'Ünïcødé ✓ survives restart';

export function restartDatabaseName(seedId: string): string {
  return `dbtest-restart-${seedId}.db`;
}

export function restartSeedScenario(seedId: string): Scenario {
  return {
    id: 'R1',
    title: 'Restart seed: write goal, entries and a correction, then leave the database closed',
    run: async (context) => {
      const clock = steppingClock();
      const db = await AppDatabase.open({ driver: context.driver, name: restartDatabaseName(seedId), migrations: MIGRATIONS, clock });
      const deps = { db, clock, ids: sequentialIds('restart') };
      await db.write((tx) => writeCurrency(tx, EUR, utcTimestamp(clock)));
      const goal = await createGoal(deps, { operationId: 'op-r-goal', title: 'Restart goal', targetMinor: 50_000, deadlineDate: null, themeId: 'island' });
      check(goal.ok, 'goal');
      const goalId = goal.value.goalId;
      const a = await createEntry(deps, { operationId: 'op-r-1', goalId, ...values('deposit', 12_000, '2026-10-01', RESTART_NOTE) });
      const b = await createEntry(deps, { operationId: 'op-r-2', goalId, ...values('withdrawal', 2_345, '2026-10-02') });
      check(a.ok && b.ok, 'entries');
      const c = await correctEntry(deps, { operationId: 'op-r-3', entryId: b.value.entryId, expectedRevision: 1, ...values('withdrawal', 2_000, '2026-10-03') });
      check(c.ok, 'correction');
      await db.close();
      return { database: restartDatabaseName(seedId), goalId, balanceMinor: 10_000 };
    },
  };
}

export function restartVerifyScenario(seedId: string): Scenario {
  return {
    id: 'R2',
    title: 'Restart verify: a new app process reads the same exact state without migrating again',
    run: async (context) => {
      const name = restartDatabaseName(seedId);
      const clock = steppingClock();
      const db = await AppDatabase.open({ driver: context.driver, name, migrations: MIGRATIONS, clock });
      try {
        equal(db.migration, { fromVersion: 1, toVersion: 1, applied: [] }, 'no re-migration');
        const state = await db.read(async (r) => ({
          currency: (await r.get<{ value_json: string }>("SELECT value_json FROM settings WHERE key = 'currency'"))?.value_json,
          goals: await r.all('SELECT id, title, target_minor, status, revision FROM goals'),
          entries: await r.all('SELECT signed_amount_minor, entry_date, note, revision FROM ledger_entries ORDER BY entry_date, created_at_utc, id'),
          receipts: await count(r, 'operation_receipts'),
        }));
        equal(state.currency, '{"code":"EUR","exponent":2,"registryVersion":1}', 'global currency');
        equal(state.goals, [{ id: 'restart-0001', title: 'Restart goal', target_minor: 50_000, status: 'active', revision: 1 }], 'goal');
        equal(
          state.entries,
          [
            { signed_amount_minor: 12_000, entry_date: '2026-10-01', note: RESTART_NOTE, revision: 1 },
            { signed_amount_minor: -2_000, entry_date: '2026-10-03', note: null, revision: 2 },
          ],
          'entries',
        );
        equal(state.receipts, 4, 'receipts');
        const replay = await createEntry({ db, clock, ids: sequentialIds('after') }, { operationId: 'op-r-1', goalId: 'restart-0001', ...values('deposit', 12_000, '2026-10-01', RESTART_NOTE) });
        check(replay.ok && replay.value.replayed && replay.value.balanceMinor === 10_000, 'receipt replays after restart');
        return { balanceMinor: 10_000 };
      } finally {
        await db.close();
        await context.deleteDatabase(name);
      }
    },
  };
}
