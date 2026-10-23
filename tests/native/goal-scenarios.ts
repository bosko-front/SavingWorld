import { capabilitiesFor } from '@/core/access';
import type { Clock } from '@/core/calendar';
import { getCurrency, type CurrencyMetadata } from '@/core/money';
import type { ThemeId } from '@/core/progression';
import { AppDatabase } from '@/data/db/database';
import { MIGRATIONS } from '@/data/db/migrations';
import { getGoal } from '@/data/repositories/goal-repository';
import {
  archiveGoal,
  createGoal,
  editGoal,
  finishGoal,
  pauseGoal,
  reopenGoal,
  resumeGoal,
  type GoalCommandDeps,
  type LifecycleInput,
} from '@/features/goals/application/goal-commands';
import { readGoalsOverview } from '@/features/goals/application/goal-queries';
import { selectGoal } from '@/features/goals/application/goal-selection';
import { deleteEntry } from '@/features/ledger/application/ledger-commands';
import { setGlobalCurrency } from '@/features/settings/application/currency-commands';
import { readCurrencyOverview } from '@/features/settings/application/settings-queries';

import {
  EUR,
  START,
  ZONE,
  count,
  deposit,
  expectError,
  mustCreate,
  withSession,
  type Harness,
} from './database-scenarios';
import { check, equal, type Scenario } from './scenario-harness';

// Phase 06 scenarios: goal lifecycle, Free slot, closed/paused edit guards, global currency lock
// and Home selection (docs/TEST_PLAN.md T07, T27). Same dual use as database-scenarios.ts: the iOS
// simulator through real Expo SQLite (`npm run test:db`, the evidence) and Jest on host SQLite.

const JPY = getCurrency('JPY') as CurrencyMetadata;
const KWD = getCurrency('KWD') as CurrencyMetadata;
const PRO = capabilitiesFor('pro');

// A clock that advances one second per reading and can jump forward by whole days.
function movableClock(startIso = START, timeZone = ZONE) {
  let t = Date.parse(startIso);
  const clock: Clock = { nowMs: () => (t += 1000), timeZone: () => timeZone };
  return { clock, advanceDays: (days: number) => (t += days * 86_400_000) };
}

async function revisionOf(h: Harness, goalId: string): Promise<number> {
  const goal = await h.db.read((r) => getGoal(r, goalId));
  check(goal, `goal ${goalId} missing`);
  return goal.revision;
}

async function statusOf(h: Harness, goalId: string): Promise<string | undefined> {
  return (await h.db.read((r) => getGoal(r, goalId)))?.status;
}

async function lifecycle(h: Harness, goalId: string): Promise<LifecycleInput> {
  return { operationId: h.op(), goalId, expectedRevision: await revisionOf(h, goalId) };
}

async function mustCreateGoal(h: Harness, deps: GoalCommandDeps, title: string, targetMinor = 50_000): Promise<string> {
  const created = await createGoal(deps, { operationId: h.op(), title, targetMinor, deadlineDate: null, themeId: 'island' });
  check(created.ok, `create ${title}: ${JSON.stringify(created)}`);
  return created.value.goalId;
}

function goalFields(title: string, targetMinor: number, deadlineDate: string | null = null) {
  return { title, targetMinor, deadlineDate, themeId: 'island' as ThemeId };
}

async function openCount(h: Harness): Promise<number> {
  const row = await h.db.read((r) => r.get<{ n: number }>("SELECT count(*) AS n FROM goals WHERE status IN ('active', 'paused')"));
  return Number(row?.n);
}

// Phase 11 owns the real collectibles table; until then a test database gets the planned shape so
// the currency lock can be proven against a souvenir that exists without any transaction.
async function addCollectibleFixture(h: Harness, goalId: string): Promise<void> {
  await h.db.write(async (tx) => {
    await tx.exec(
      `CREATE TABLE collectibles (
         goal_id TEXT PRIMARY KEY NOT NULL REFERENCES goals (id),
         theme_id TEXT NOT NULL,
         theme_version INTEGER NOT NULL,
         earned_at_utc TEXT NOT NULL
       ) STRICT`,
    );
    await tx.run('INSERT INTO collectibles (goal_id, theme_id, theme_version, earned_at_utc) VALUES (?, ?, ?, ?)', [
      goalId,
      'island',
      1,
      START,
    ]);
  });
}

export const GOAL_SCENARIOS: Scenario[] = [
  {
    id: 'G01',
    title: 'Lifecycle: paused takes the Free slot, Archive frees it, Reopen checks it and never auto-finishes',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('lifecycle');
        const deps = h.deps;
        const create = (title: string) =>
          createGoal(deps, { operationId: h.op(), ...goalFields(title, 10_000) });

        check((await pauseGoal(deps, await lifecycle(h, h.goalId))).ok, 'pause');
        equal(await statusOf(h, h.goalId), 'paused', 'paused');
        expectError(await create('Second'), 'open_goal_limit', 'paused goal still takes the Free slot');
        expectError(await pauseGoal(deps, await lifecycle(h, h.goalId)), 'invalid_transition', 'pause twice');
        check((await resumeGoal(deps, await lifecycle(h, h.goalId))).ok, 'resume');
        equal(await statusOf(h, h.goalId), 'active', 'resumed');

        // Finish needs B >= T; reaching it does not close the goal by itself.
        expectError(await finishGoal(deps, await lifecycle(h, h.goalId)), 'not_funded', 'finish below target');
        await mustCreate(h, 'deposit', 100_000, '2026-10-22');
        equal(await statusOf(h, h.goalId), 'active', '100% keeps the goal active');
        check((await finishGoal(deps, await lifecycle(h, h.goalId))).ok, 'finish at 100%');
        equal(await statusOf(h, h.goalId), 'completed', 'completed');
        expectError(await deposit(h, 1, '2026-10-22'), 'goal_closed', 'completed goal is read-only');

        // Finish released the slot; a new goal takes it, so Reopen is refused.
        const second = await create('Second');
        check(second.ok, 'finish frees the slot');
        expectError(await reopenGoal(deps, await lifecycle(h, h.goalId)), 'open_goal_limit', 'reopen at the limit');
        equal(await statusOf(h, h.goalId), 'completed', 'refused reopen changes nothing');

        // Archive frees it again; Reopen at >= 100% sets active and stays active.
        check((await archiveGoal(deps, await lifecycle(h, second.value.goalId))).ok, 'archive second');
        expectError(await archiveGoal(deps, await lifecycle(h, second.value.goalId)), 'invalid_transition', 'archive twice');
        check((await reopenGoal(deps, await lifecycle(h, h.goalId))).ok, 'reopen funded goal');
        equal(await statusOf(h, h.goalId), 'active', 'reopened at 100% stays active');
        check((await deposit(h, 1, '2026-10-22')).ok, 'reopened goal accepts entries');
        expectError(await reopenGoal(deps, await lifecycle(h, h.goalId)), 'invalid_transition', 'reopen an open goal');
        expectError(await resumeGoal(deps, await lifecycle(h, h.goalId)), 'invalid_transition', 'resume an active goal');

        // Stale revision, replay and a changed payload under the same operation ID.
        const stale = { operationId: h.op(), goalId: h.goalId, expectedRevision: 1 };
        const staleResult = await pauseGoal(deps, stale);
        expectError(staleResult, 'stale_goal', 'stale revision');
        const input = await lifecycle(h, h.goalId);
        const first = await pauseGoal(deps, input);
        const again = await pauseGoal(deps, input);
        check(first.ok && !first.value.replayed && again.ok && again.value.replayed, 'same operation ID replays');
        equal(again.ok && again.value.revision, first.ok && first.value.revision, 'replay returns the same revision');
        expectError(await archiveGoal(deps, input), 'operation_conflict', 'same ID for another command');
        const ledger = await h.db.read((r) => count(r, 'ledger_entries'));
        equal(ledger, 2, 'lifecycle commands never touch the ledger');
      }),
  },
  {
    id: 'G02',
    title: 'Concurrent Create and Reopen take the last Free slot at most once',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('concurrent');
        const deps = h.deps;
        const pro = { ...deps, capabilities: PRO };
        const other = await mustCreateGoal(h, pro, 'Pro-created second');
        check((await archiveGoal(deps, await lifecycle(h, h.goalId))).ok, 'archive first');
        check((await archiveGoal(deps, await lifecycle(h, other))).ok, 'archive second');
        equal(await openCount(h), 0, 'no open goal');

        const results = await Promise.all([
          createGoal(deps, { operationId: h.op(), ...goalFields('Racer A', 1_000) }),
          reopenGoal(deps, await lifecycle(h, h.goalId)),
          createGoal(deps, { operationId: h.op(), ...goalFields('Racer B', 1_000) }),
          reopenGoal(deps, await lifecycle(h, other)),
        ]);
        const winners = results.filter((result) => result.ok).length;
        const limited = results.filter((result) => !result.ok && (result.error as { code: string }).code === 'open_goal_limit').length;
        equal([winners, limited], [1, 3], 'one winner, three refused by the slot');
        equal(await openCount(h), 1, 'exactly one open goal');

        const pair = await Promise.all([
          reopenGoal(deps, await lifecycle(h, h.goalId)),
          reopenGoal(deps, await lifecycle(h, other)),
        ]);
        equal(pair.filter((result) => result.ok).length, 0, 'no reopen while the slot is taken');
        return { winners, limited };
      }),
  },
  {
    id: 'G03',
    title: 'Edit Goal: paused is editable, closed is read-only, deadlines and theme follow the rules',
    run: (context) =>
      withSession(context, async (s) => {
        const moving = movableClock();
        const h = await s.harness('edit', { clock: moving.clock });
        const deps = h.deps;
        const edit = async (fields: ReturnType<typeof goalFields>, d = deps) =>
          editGoal(d, { operationId: h.op(), goalId: h.goalId, expectedRevision: await revisionOf(h, h.goalId), ...fields });

        check((await edit(goalFields('Trip', 120_000, '2026-10-23'))).ok, 'deadline today');
        check((await pauseGoal(deps, await lifecycle(h, h.goalId))).ok, 'pause');
        const paused = await edit(goalFields('Trip to Kotor', 150_000, '2026-10-30'));
        check(paused.ok, 'paused goal can be edited');
        equal(await statusOf(h, h.goalId), 'paused', 'editing does not resume');
        const stored = await h.db.read((r) => getGoal(r, h.goalId));
        equal([stored?.title, stored?.targetMinor, stored?.deadlineDate], ['Trip to Kotor', 150_000, '2026-10-30'], 'edited fields');
        check((await deposit(h, 500, '2026-10-23')).ok, 'paused goal accepts entries');

        // The stored deadline expires naturally and may stay; a new past date may not.
        moving.advanceDays(10);
        check((await edit(goalFields('Kotor', 150_000, '2026-10-30'))).ok, 'unchanged expired deadline is kept');
        expectError(await edit(goalFields('Kotor', 150_000, '2026-10-31')), 'past_deadline', 'changed deadline in the past');
        check((await edit(goalFields('Kotor', 150_000, null))).ok, 'deadline removed');
        expectError(await edit(goalFields('Kotor', 150_000, '2026-10-30')), 'past_deadline', 'expired date cannot come back');
        check((await edit(goalFields('Kotor', 150_000, '2026-11-02'))).ok, 'deadline today after the jump');

        expectError(await edit(goalFields('x'.repeat(101), 150_000)), 'title_too_long', 'title 101 characters');
        check((await edit(goalFields('x'.repeat(100), 150_000))).ok, 'title 100 characters');
        expectError(await edit(goalFields('Kotor', 0)), 'invalid_target', 'target zero');
        expectError(await edit({ ...goalFields('Kotor', 150_000), themeId: 'garden' }), 'theme_unavailable', 'Free cannot switch theme');
        check((await edit({ ...goalFields('Kotor', 150_000), themeId: 'garden' }, { ...deps, capabilities: PRO })).ok, 'Pro switches theme');
        const staleEdit = await editGoal(deps, { operationId: h.op(), goalId: h.goalId, expectedRevision: 1, ...goalFields('Old', 1_000) });
        expectError(staleEdit, 'stale_goal', 'stale edit');

        check((await archiveGoal(deps, await lifecycle(h, h.goalId))).ok, 'archive');
        expectError(await edit(goalFields('Archived edit', 1_000)), 'goal_closed', 'archived goal is read-only');
        expectError(await deposit(h, 1, '2026-11-02'), 'goal_closed', 'no entries on an archived goal');
        const entries = await h.db.read((r) => count(r, 'ledger_entries'));
        equal(entries, 1, 'archive keeps the history');
      }),
  },
  {
    id: 'G04',
    title: 'Global currency: empty goals change without conversion; a transaction or souvenir locks it',
    run: (context) =>
      withSession(context, async (s) => {
        // Onboarding: first choice with nothing stored.
        const fresh = await s.harness('first-currency', { currency: false });
        const first = await setGlobalCurrency(fresh.deps, { operationId: fresh.op(), currencyCode: 'EUR' });
        check(first.ok && first.value.previousCurrencyCode === null, 'first choice');
        check((await mustCreateGoal(fresh, fresh.deps, 'After onboarding')) !== '', 'goal after onboarding');
        expectError(await setGlobalCurrency(fresh.deps, { operationId: fresh.op(), currencyCode: 'XTS' }), 'unsupported_currency', 'test code');

        const h = await s.harness('currency');
        const deps = h.deps;
        const pro = { ...deps, capabilities: PRO };
        const archived = await mustCreateGoal(h, pro, 'Archived empty goal', 2_500);
        check((await archiveGoal(deps, await lifecycle(h, archived))).ok, 'archive the second goal');
        const set = (code: string) => setGlobalCurrency(deps, { operationId: h.op(), currencyCode: code });
        const targets = async () =>
          h.db.read(async (r) => [(await getGoal(r, h.goalId))?.targetMinor, (await getGoal(r, archived))?.targetMinor]);

        // 1,000.00 EUR and 25.00 EUR keep their written amounts in JPY and KWD.
        const toJpy = await set('JPY');
        check(toJpy.ok && toJpy.value.previousCurrencyCode === 'EUR' && toJpy.value.goalCount === 2, 'EUR → JPY');
        equal(await targets(), [1_000, 25], 'JPY targets');
        check((await set('KWD')).ok, 'JPY → KWD');
        equal(await targets(), [1_000_000, 25_000], 'KWD targets');
        check((await set('EUR')).ok, 'KWD → EUR');
        equal(await targets(), [100_000, 2_500], 'back to EUR');

        // A target JPY cannot show exactly is reported, and nothing changes.
        const odd = await editGoal(deps, {
          operationId: h.op(),
          goalId: h.goalId,
          expectedRevision: await revisionOf(h, h.goalId),
          ...goalFields('Summer trip', 100_050),
        });
        check(odd.ok, 'target with cents');
        expectError(await set('JPY'), 'target_not_representable', 'cents in JPY');
        equal((await readCurrencyOverview(h.db)).currency, { status: 'set', currency: EUR }, 'currency unchanged');
        equal((await targets())[0], 100_050, 'target unchanged');

        // Any transaction, in any goal, locks the currency; deleting the last one unlocks it.
        const entry = await mustCreate(h, 'deposit', 1_000, '2026-10-22');
        const locked = await set('USD');
        expectError(locked, 'currency_locked', 'transaction locks');
        equal(!locked.ok && locked.error, { code: 'currency_locked', transactionCount: 1, souvenirCount: 0 }, 'lock details');
        equal((await readCurrencyOverview(h.db)).locked, true, 'overview shows the lock');
        const removed = await deleteEntry(deps, { operationId: h.op(), entryId: entry.entryId, expectedRevision: 1, confirmed: true });
        check(removed.ok, 'delete last transaction');
        check((await set('USD')).ok, 'unlocked after the last transaction is deleted');

        // A souvenir alone keeps it locked (boundary fixture until Phase 11 adds real storage).
        await addCollectibleFixture(h, archived);
        const souvenir = await set('EUR');
        equal(!souvenir.ok && souvenir.error, { code: 'currency_locked', transactionCount: 0, souvenirCount: 1 }, 'souvenir locks');

        // Replay and serialization with a racing deposit.
        const race = await s.harness('currency-race');
        const raceSet = { operationId: race.op(), currencyCode: 'JPY' };
        const [raced, money] = await Promise.all([
          setGlobalCurrency(race.deps, raceSet),
          deposit(race, 700, '2026-10-22'),
        ]);
        const overview = await readCurrencyOverview(race.db);
        if (raced.ok) {
          equal(overview.currency, { status: 'set', currency: JPY }, 'change committed before the deposit');
        } else {
          equal((raced.error as { code: string }).code, 'currency_locked', 'deposit committed first');
          equal(overview.currency, { status: 'set', currency: EUR }, 'currency kept');
        }
        check(money.ok, 'deposit committed in either order');
        const replay = await setGlobalCurrency(race.deps, raceSet);
        equal(replay.ok && replay.value.replayed, raced.ok, 'a committed change replays by operation ID');
        return { raceOrder: raced.ok ? 'currency first' : 'deposit first', kwd: KWD.exponent };
      }),
  },
  {
    id: 'G05',
    title: 'Home selection persists across a restart and falls back to the oldest open goal',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('selection');
        const pro = { ...h.deps, capabilities: PRO };
        const second = await mustCreateGoal(h, pro, 'Second');
        const third = await mustCreateGoal(h, pro, 'Third');
        equal((await readGoalsOverview(h.db)).selectedGoalId, h.goalId, 'no stored choice: oldest open goal');
        check((await selectGoal(h.deps, third)).ok, 'select third');
        equal((await readGoalsOverview(h.db)).selectedGoalId, third, 'stored choice');

        await h.db.close();
        const reopened = await AppDatabase.open({ driver: context.driver, name: h.name, migrations: MIGRATIONS, clock: h.clock });
        const after = await readGoalsOverview(reopened);
        equal(after.selectedGoalId, third, 'selection survives a restart');
        equal(after.goals.length, 3, 'goals survive a restart');

        const deps = { ...pro, db: reopened };
        const rev = (await reopened.read((r) => getGoal(r, third)))?.revision ?? 0;
        check((await archiveGoal(deps, { operationId: h.op(), goalId: third, expectedRevision: rev })).ok, 'archive the selected goal');
        equal((await readGoalsOverview(reopened)).selectedGoalId, h.goalId, 'closed selection falls back to the oldest open goal');
        expectError(await selectGoal(deps, third), 'goal_closed', 'cannot select a closed goal');
        expectError(await selectGoal(deps, 'missing-goal'), 'goal_not_found', 'unknown goal');
        check((await selectGoal(deps, second)).ok, 'select second');
        equal((await readGoalsOverview(reopened)).selectedGoalId, second, 'second selected');
        await reopened.close();
      }),
  },
  {
    id: 'G06',
    title: 'Currency and a zero-balance goal survive a restart; the schema still refuses goal deletion',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('zero-goal', { currency: false });
        check((await setGlobalCurrency(h.deps, { operationId: h.op(), currencyCode: 'KWD' })).ok, 'choose KWD');
        const goalId = await mustCreateGoal(h, h.deps, 'Zero balance', 1_250_000);
        await h.db.close();
        const reopened = await AppDatabase.open({ driver: context.driver, name: h.name, migrations: MIGRATIONS, clock: h.clock });
        try {
          const overview = await readCurrencyOverview(reopened);
          equal(overview.currency, { status: 'set', currency: KWD }, 'currency after restart');
          const goals = await readGoalsOverview(reopened);
          equal(
            goals.goals.map((g) => [g.goal.id, g.goal.title, g.goal.targetMinor, g.goal.status, g.balanceMinor, g.entryCount]),
            [[goalId, 'Zero balance', 1_250_000, 'active', 0, 0]],
            'zero-balance goal after restart',
          );
          equal(goals.selectedGoalId, goalId, 'selected after restart');
          let refused = false;
          try {
            await reopened.write((tx) => tx.run('DELETE FROM goals WHERE id = ?', [goalId]));
          } catch {
            refused = true;
          }
          check(refused, 'goal deletion is refused by the schema');
        } finally {
          await reopened.close();
        }
      }),
  },
];
