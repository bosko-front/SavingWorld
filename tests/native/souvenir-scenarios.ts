import { capabilitiesFor } from '@/core/access';
import { currentThemeVersion, stageFor } from '@/core/progression';
import { LATEST_SCHEMA_VERSION, MIGRATIONS } from '@/data/db/migrations';
import { getCollectible, listCollectibles } from '@/data/repositories/collectible-repository';
import { getGoal } from '@/data/repositories/goal-repository';
import {
  createGoal,
  deleteGoal,
  editGoal,
  finishGoal,
  pauseGoal,
  reopenGoal,
  type LifecycleInput,
} from '@/features/goals/application/goal-commands';
import { readGoalsOverview } from '@/features/goals/application/goal-queries';
import { correctEntry, createEntry, deleteEntry } from '@/features/ledger/application/ledger-commands';
import { setGlobalCurrency } from '@/features/settings/application/currency-commands';
import { readCurrencyOverview } from '@/features/settings/application/settings-queries';

import {
  balanceOf,
  count,
  expectError,
  mustCreate,
  START,
  steppingClock,
  values,
  withSession,
  type Harness,
} from './database-scenarios';
import { check, equal, rejects, type Scenario } from './scenario-harness';

// Phase 11 scenarios: the one permanent souvenir per goal, Finish/Reopen and the Collection's data
// (docs/TEST_PLAN.md T07, T09, T27; v1.2 section 10 "Završetak" and "Ispravka nakon završetka").
// Same dual use as database-scenarios.ts: the iOS simulator through real Expo SQLite (`npm run
// test:db`, the evidence) and Jest on host SQLite. The harness goal is "Summer trip", target
// €1,000.00 (100_000 minor), Island, Free.

const PRO = capabilitiesFor('pro');

async function revisionOf(h: Harness, goalId = h.goalId): Promise<number> {
  const goal = await h.db.read((r) => getGoal(r, goalId));
  check(goal, `goal ${goalId} missing`);
  return goal.revision;
}

async function lifecycle(h: Harness, goalId = h.goalId): Promise<LifecycleInput> {
  return { operationId: h.op(), goalId, expectedRevision: await revisionOf(h, goalId) };
}

async function statusOf(h: Harness, goalId = h.goalId): Promise<string | undefined> {
  return (await h.db.read((r) => getGoal(r, goalId)))?.status;
}

async function souvenirsOf(h: Harness): Promise<number> {
  return h.db.read((r) => count(r, 'collectibles'));
}

async function souvenir(h: Harness, goalId = h.goalId) {
  return h.db.read((r) => getCollectible(r, goalId));
}

async function editTarget(h: Harness, targetMinor: number, goalId = h.goalId, title = 'Summer trip') {
  return editGoal(h.deps, {
    operationId: h.op(),
    goalId,
    expectedRevision: await revisionOf(h, goalId),
    title,
    targetMinor,
    deadlineDate: null,
    themeId: 'island',
  });
}

// A real SQLite failure inside the award itself: a temporary trigger on the write connection makes
// the souvenir INSERT abort after the ledger or target write in the same transaction.
async function breakAward(h: Harness, broken: boolean): Promise<void> {
  await h.db.write((tx) =>
    tx.exec(
      broken
        ? `CREATE TEMP TRIGGER test_award_failure BEFORE INSERT ON main.collectibles
           BEGIN SELECT RAISE(ABORT, 'injected award failure'); END;`
        : 'DROP TRIGGER temp.test_award_failure;',
    ),
  );
}

export const SOUVENIR_SCENARIOS: Scenario[] = [
  {
    id: 'C01',
    title: 'First saved 100% stores one souvenir (Free) without changing the status; nothing duplicates or removes it',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('award');
        const first = await mustCreate(h, 'deposit', 60_000, '2026-10-20');
        check(!first.souvenirAwarded, '60% earns nothing');
        equal(await souvenirsOf(h), 0, 'no souvenir below target');

        const input = { operationId: h.op(), goalId: h.goalId, ...values('deposit', 40_000, '2026-10-21') };
        const crossed = await createEntry(h.deps, input);
        check(crossed.ok && crossed.value.souvenirAwarded && !crossed.value.replayed, 'the deposit to 100% earns it');
        equal(await statusOf(h), 'active', 'status stays active at 100%');
        const stored = await souvenir(h);
        check(stored, 'souvenir stored');
        equal(
          [stored.themeId, stored.themeVersion, stored.targetMinorAtAward],
          ['island', currentThemeVersion('island'), 100_000],
          'theme, art version and target then',
        );
        check(stored.earnedAtUtc > START, 'earned at the commit time');

        // A retry of the same operation replays: no second souvenir and no second first-award moment.
        const replay = await createEntry(h.deps, input);
        check(replay.ok && replay.value.replayed && !replay.value.souvenirAwarded, 'replay does not award again');

        // Withdrawal, re-crossing with separate operations, a correction of the first (mistaken)
        // entry and deleting the withdrawal: one souvenir, unchanged, all along.
        const out = await mustCreate(h, 'withdrawal', 30_000, '2026-10-22');
        equal([out.balanceMinor, out.souvenirAwarded], [70_000, false], 'withdrawal regresses the balance only');
        const again = await mustCreate(h, 'deposit', 30_000, '2026-10-22');
        equal([again.balanceMinor, again.souvenirAwarded], [100_000, false], 're-crossing 100% adds nothing');
        const mistake = await correctEntry(h.deps, {
          operationId: h.op(),
          entryId: first.entryId,
          expectedRevision: 1,
          ...values('deposit', 6_000, '2026-10-20'),
        });
        check(mistake.ok && !mistake.value.souvenirAwarded && mistake.value.balanceMinor === 46_000, 'initial mistake corrected');
        const deleted = await deleteEntry(h.deps, { operationId: h.op(), entryId: out.entryId, expectedRevision: 1, confirmed: true });
        check(deleted.ok && !deleted.value.souvenirAwarded, 'deleting the withdrawal adds nothing');
        equal(await souvenirsOf(h), 1, 'still exactly one souvenir');
        equal(await souvenir(h), stored, 'souvenir unchanged');

        // The database itself keeps it unique and permanent.
        await rejects(
          h.db.write((tx) =>
            tx.run('INSERT INTO collectibles VALUES (?, ?, ?, ?, ?)', [h.goalId, 'island', 2, 100_000, START]),
          ),
          /UNIQUE|PRIMARY KEY|constraint/i,
          'a second souvenir for the goal',
        );
        await rejects(
          h.db.write((tx) => tx.run('UPDATE collectibles SET theme_version = 3 WHERE goal_id = ?', [h.goalId])),
          /souvenirs are permanent/,
          'updating a souvenir',
        );

        // Paused goals earn it too, and stay paused.
        const p = await s.harness('award-paused');
        check((await pauseGoal(p.deps, await lifecycle(p))).ok, 'pause');
        const paused = await mustCreate(p, 'deposit', 100_000, '2026-10-22');
        check(paused.souvenirAwarded, 'paused goal earns its souvenir');
        equal(await statusOf(p), 'paused', 'status stays paused');
        return { souvenir: stored };
      }),
  },
  {
    id: 'C02',
    title: 'A failure between the ledger or target write and the award rolls back both; the retry awards once',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('award-fail');
        await mustCreate(h, 'deposit', 90_000, '2026-10-20');
        const input = { operationId: h.op(), goalId: h.goalId, ...values('deposit', 10_000, '2026-10-21') };

        await breakAward(h, true);
        const failed = await createEntry(h.deps, input);
        expectError(failed, 'storage_failure', 'award INSERT fails in SQLite');
        equal([await balanceOf(h), await souvenirsOf(h), await h.db.read((r) => count(r, 'ledger_entries'))], [90_000, 0, 1], 'deposit rolled back with the award');
        // A target edit that would award fails the same way and keeps the old target.
        expectError(await editTarget(h, 90_000), 'storage_failure', 'target edit with a failing award');
        equal((await h.db.read((r) => getGoal(r, h.goalId)))?.targetMinor, 100_000, 'target rolled back');
        await breakAward(h, false);

        // A failure after the award, just before COMMIT, also leaves nothing.
        h.hooks.failBeforeCommit = true;
        expectError(await createEntry(h.deps, input), 'storage_failure', 'failure before COMMIT');
        h.hooks.failBeforeCommit = false;
        equal([await balanceOf(h), await souvenirsOf(h)], [90_000, 0], 'nothing kept');

        // The same operation ID then commits once, with its souvenir.
        const retried = await createEntry(h.deps, input);
        check(retried.ok && !retried.value.replayed && retried.value.souvenirAwarded, 'retry commits and awards');
        const replay = await createEntry(h.deps, input);
        check(replay.ok && replay.value.replayed && !replay.value.souvenirAwarded, 'second retry replays');
        equal([await balanceOf(h), await souvenirsOf(h)], [100_000, 1], 'one deposit, one souvenir');
      }),
  },
  {
    id: 'C03',
    title: 'A target edit that first reaches B >= T awards with the saved target; later target and balance changes keep it',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('award-target');
        await mustCreate(h, 'deposit', 80_000, '2026-10-20');
        check((await editTarget(h, 90_000)).ok, 'target lowered, still short');
        equal(await souvenirsOf(h), 0, 'no souvenir at 89%');
        check((await editTarget(h, 80_000, h.goalId, 'Shorter trip')).ok, 'target lowered to the balance');
        const stored = await souvenir(h);
        check(stored, 'target edit earned the souvenir');
        equal(stored.targetMinorAtAward, 80_000, 'target then is the saved target');
        equal(await statusOf(h), 'active', 'still active');

        check((await editTarget(h, 200_000)).ok, 'target raised again');
        const goal = await h.db.read((r) => getGoal(r, h.goalId));
        equal(stageFor(await balanceOf(h), goal?.targetMinor ?? 1), 4, 'live stage regressed to 40%');
        equal(await souvenir(h), stored, 'souvenir kept with its target then');
        check((await editTarget(h, 80_000)).ok, 'back to the old target');
        equal(await souvenirsOf(h), 1, 'still one');
      }),
  },
  {
    id: 'C04',
    title: 'Finish/Reopen: the finished goal counts toward Free, Reopen stays active at 100%, correction 100 → 10 keeps the souvenir',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('finish');
        const deps = h.deps;
        const funding = await mustCreate(h, 'deposit', 100_000, '2026-10-20');
        check(funding.souvenirAwarded, 'souvenir at 100%');
        check((await finishGoal(deps, await lifecycle(h))).ok, 'finish');
        equal(await statusOf(h), 'completed', 'completed');

        // Read-only while completed: ledger, target and theme edits are refused.
        expectError(await createEntry(deps, { operationId: h.op(), goalId: h.goalId, ...values('deposit', 1, '2026-10-22') }), 'goal_closed', 'no entry');
        expectError(
          await correctEntry(deps, { operationId: h.op(), entryId: funding.entryId, expectedRevision: 1, ...values('deposit', 10_000, '2026-10-20') }),
          'goal_closed',
          'no correction',
        );
        expectError(await editTarget(h, 50_000), 'goal_closed', 'no target edit');
        expectError(await finishGoal(deps, await lifecycle(h)), 'invalid_transition', 'finish twice');

        // Still Free's one goal: Create is refused (Home answers with "Build another world").
        expectError(
          await createGoal(deps, { operationId: h.op(), title: 'Second', targetMinor: 1_000, deadlineDate: null, themeId: 'island' }),
          'goal_limit',
          'finished goal counts',
        );
        const counts = async () => {
          const overview = await readGoalsOverview(h.db);
          return [overview.goals.filter(({ goal }) => goal.status === 'completed').length, overview.souvenirs.length];
        };
        equal(await counts(), [1, 1], 'completed status and souvenir both counted');

        // Reopen within the limit: active, editable, never finished again by itself.
        check((await reopenGoal(deps, await lifecycle(h))).ok, 'reopen');
        equal(await statusOf(h), 'active', 'active at 100%');
        equal(await counts(), [0, 1], 'status count and souvenir count differ after Reopen');
        const corrected = await correctEntry(deps, {
          operationId: h.op(),
          entryId: funding.entryId,
          expectedRevision: 1,
          ...values('deposit', 10_000, '2026-10-20'),
        });
        check(corrected.ok && corrected.value.balanceMinor === 10_000 && !corrected.value.souvenirAwarded, 'correction 100 → 10');
        equal(stageFor(10_000, 100_000), 1, 'live scene regressed to the first unlock');
        equal(await souvenirsOf(h), 1, 'souvenir persists');
        expectError(await finishGoal(deps, await lifecycle(h)), 'not_funded', 'finish needs 100% again');

        // Back to 100% and Finish again: still one souvenir.
        const refund = await mustCreate(h, 'deposit', 90_000, '2026-10-22');
        check(!refund.souvenirAwarded, 're-crossing adds nothing');
        check((await finishGoal(deps, await lifecycle(h))).ok, 'finish again');
        check((await reopenGoal(deps, await lifecycle(h))).ok, 'reopen again');
        check((await finishGoal(deps, await lifecycle(h))).ok, 'and finish a third time');
        equal(await souvenirsOf(h), 1, 'repeated Finish never adds a souvenir');

        // Over the limit (two goals, as after losing Pro) Reopen is refused and changes nothing.
        const second = await createGoal({ ...deps, capabilities: PRO }, { operationId: h.op(), title: 'Second', targetMinor: 1_000, deadlineDate: null, themeId: 'island' });
        check(second.ok, 'Pro second goal');
        expectError(await reopenGoal(deps, await lifecycle(h)), 'goal_limit', 'reopen over the limit');
        equal([await statusOf(h), await souvenirsOf(h)], ['completed', 1], 'refused reopen changes nothing');
      }),
  },
  {
    id: 'C05',
    title: 'Deleting a completed goal removes goal, entries and souvenir together; the currency lock recounts and Free may create again',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('delete-souvenir');
        const deps = h.deps;
        const funding = await mustCreate(h, 'deposit', 100_000, '2026-10-20');
        check(funding.souvenirAwarded, 'souvenir');
        check((await finishGoal(deps, await lifecycle(h))).ok, 'finish');
        check((await reopenGoal(deps, await lifecycle(h))).ok, 'reopen');

        // After Reopen, deleting every transaction leaves the souvenir, which still locks the currency.
        const removed = await deleteEntry(deps, { operationId: h.op(), entryId: funding.entryId, expectedRevision: 1, confirmed: true });
        check(removed.ok && removed.value.balanceMinor === 0, 'only transaction deleted');
        const lock = await readCurrencyOverview(h.db);
        equal([lock.transactionCount, lock.souvenirCount, lock.locked], [0, 1, true], 'souvenir alone locks');
        expectError(await setGlobalCurrency(deps, { operationId: h.op(), currencyCode: 'JPY' }), 'currency_locked', 'currency locked');

        await mustCreate(h, 'deposit', 100_000, '2026-10-21');
        check((await finishGoal(deps, await lifecycle(h))).ok, 'finish');
        const tables = () =>
          h.db.read(async (r) => [await count(r, 'goals'), await count(r, 'ledger_entries'), await count(r, 'collectibles')]);
        equal(await tables(), [1, 1, 1], 'before deletion');

        // A failure inside the deletion keeps all three.
        h.hooks.failBeforeCommit = true;
        expectError(await deleteGoal(deps, await lifecycle(h)), 'storage_failure', 'injected failure');
        h.hooks.failBeforeCommit = false;
        equal(await tables(), [1, 1, 1], 'rolled back together');

        const input = await lifecycle(h);
        const deletedGoal = await deleteGoal(deps, input);
        check(deletedGoal.ok && !deletedGoal.value.replayed, 'confirmed deletion');
        equal(await tables(), [0, 0, 0], 'goal, entries and souvenir gone');
        const replay = await deleteGoal(deps, input);
        check(replay.ok && replay.value.replayed, 'receipt replays');
        equal((await readGoalsOverview(h.db)).souvenirs, [], 'Collection no longer shows it');
        equal((await readCurrencyOverview(h.db)).locked, false, 'currency lock recounts');
        check((await setGlobalCurrency(deps, { operationId: h.op(), currencyCode: 'JPY' })).ok, 'currency unlocked');
        const fresh = await createGoal(deps, { operationId: h.op(), title: 'New start', targetMinor: 5_000, deadlineDate: null, themeId: 'island' });
        check(fresh.ok, 'Free creates a new goal');
      }),
  },
  {
    id: 'C06',
    title: 'Schema 2 → 3: funded goals receive their souvenir once, others none; records unchanged',
    run: (context) =>
      withSession(context, async (s) => {
        const name = s.name('upgrade3');
        const old = await s.openDb(name, MIGRATIONS.slice(0, 2));
        await old.write(async (tx) => {
          await tx.run("INSERT INTO settings VALUES ('currency', ?, ?)", ['{"code":"EUR","exponent":2,"registryVersion":1}', START]);
          const goal = 'INSERT INTO goals VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
          await tx.run(goal, ['funded', 'Bike', 50_000, null, 'island', 'active', START, START, 1]);
          await tx.run(goal, ['done', 'Camera', 20_000, null, 'island', 'active', START, START, 1]);
          await tx.run(goal, ['short', 'Trip', 90_000, null, 'island', 'paused', START, START, 1]);
          const entry = 'INSERT INTO ledger_entries VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
          await tx.run(entry, ['e1', 'funded', 60_000, '2026-10-01', null, START, START, 1]);
          await tx.run(entry, ['e2', 'done', 20_000, '2026-10-01', null, START, START, 1]);
          await tx.run(entry, ['e3', 'short', 89_999, '2026-10-01', null, START, START, 1]);
          await tx.run("UPDATE goals SET status = 'completed', revision = 2 WHERE id = 'done'");
        });
        await old.close();

        const db = await s.openDb(name, MIGRATIONS, steppingClock());
        equal(
          db.migration,
          { fromVersion: 2, toVersion: LATEST_SCHEMA_VERSION, applied: MIGRATIONS.map((m) => m.version).filter((v) => v > 2) },
          'upgrade through schema 3',
        );
        const rows = await db.read((r) => listCollectibles(r));
        equal(
          rows.map((row) => [row.goalId, row.themeId, row.themeVersion, row.targetMinorAtAward]).sort(),
          [
            ['done', 'island', 2, 20_000],
            ['funded', 'island', 2, 50_000],
          ],
          'funded goals only',
        );
        const goals = await db.read((r) => r.all('SELECT id, status, revision FROM goals ORDER BY id'));
        equal(
          goals,
          [
            { id: 'done', status: 'completed', revision: 2 },
            { id: 'funded', status: 'active', revision: 1 },
            { id: 'short', status: 'paused', revision: 1 },
          ],
          'goals unchanged',
        );
        equal(await db.read((r) => count(r, 'ledger_entries')), 3, 'entries unchanged');
        equal((await db.read((r) => r.all('PRAGMA foreign_key_check'))).length, 0, 'foreign_key_check clean');
        // A later deposit on an upgraded funded goal finds the souvenir and adds none (three goals: a
        // Pro database, so the goal accepts entries, Phase 16).
        const more = await createEntry(
          { db, clock: steppingClock('2026-10-24T08:00:00.000Z'), ids: { newId: () => 'e4' }, capabilities: capabilitiesFor('pro') },
          { operationId: 'op-upgrade3-more', goalId: 'funded', ...values('deposit', 1_000, '2026-10-02') },
        );
        check(more.ok && !more.value.souvenirAwarded, 'no second souvenir after the upgrade');
      }),
  },
];
