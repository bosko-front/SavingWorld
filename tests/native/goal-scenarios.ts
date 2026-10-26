import { capabilitiesFor } from '@/core/access';
import type { Clock } from '@/core/calendar';
import { getCurrency, type CurrencyMetadata } from '@/core/money';
import type { ThemeId } from '@/core/progression';
import { AppDatabase } from '@/data/db/database';
import { LATEST_SCHEMA_VERSION, MIGRATIONS } from '@/data/db/migrations';
import { getGoal } from '@/data/repositories/goal-repository';
import {
  changeGoalTheme,
  createGoal,
  deleteGoal,
  editGoal,
  finishGoal,
  pauseGoal,
  reopenGoal,
  resumeGoal,
  type GoalCommandDeps,
  type LifecycleInput,
} from '@/features/goals/application/goal-commands';
import { startChallenge } from '@/features/challenges/application/challenge-commands';
import { readGoalsOverview } from '@/features/goals/application/goal-queries';
import { selectGoal } from '@/features/goals/application/goal-selection';
import { createEntry, deleteEntry } from '@/features/ledger/application/ledger-commands';
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
  steppingClock,
  values,
  withSession,
  type Harness,
} from './database-scenarios';
import { check, equal, type Scenario } from './scenario-harness';

// Phase 06 scenarios: goal lifecycle, Free goal limit, closed/paused edit guards, global currency
// lock and Home selection (docs/TEST_PLAN.md T07, T27), changed in Phase 08 by owner decision D74:
// no Archive, Free keeps one goal in any status, goals can be deleted (G07), schema 2 (G08). Phase
// 11 replaced the planned-shape souvenir fixture with real souvenirs (schema 3); Phase 12 added G09,
// deletion with challenge attempts (schema 4); Phase 17 added G10, Change Theme. Same dual use as database-scenarios.ts: the iOS
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

async function goalCount(h: Harness): Promise<number> {
  return h.db.read((r) => count(r, 'goals'));
}

export const GOAL_SCENARIOS: Scenario[] = [
  {
    id: 'G01',
    title: 'Lifecycle: Free keeps one goal in any status, Finish and Reopen follow the rules, no Archive (D74)',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('lifecycle');
        const deps = h.deps;
        const pro = { ...deps, capabilities: PRO };
        const create = (title: string) =>
          createGoal(deps, { operationId: h.op(), ...goalFields(title, 10_000) });

        check((await pauseGoal(deps, await lifecycle(h, h.goalId))).ok, 'pause');
        equal(await statusOf(h, h.goalId), 'paused', 'paused');
        expectError(await create('Second'), 'goal_limit', 'paused goal counts');
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

        // A finished goal still counts toward Free's one goal; Pro may add more.
        expectError(await create('Second'), 'goal_limit', 'completed goal still counts');
        const second = await mustCreateGoal(h, pro, 'Second');
        // With two goals (as after losing Pro) Free cannot reopen; within the limit it can.
        expectError(await reopenGoal(deps, await lifecycle(h, h.goalId)), 'goal_limit', 'reopen over the limit');
        equal(await statusOf(h, h.goalId), 'completed', 'refused reopen changes nothing');
        check((await deleteGoal(deps, await lifecycle(h, second))).ok, 'delete the second goal');
        equal(await goalCount(h), 1, 'one goal left');
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
        expectError(await finishGoal(deps, input), 'operation_conflict', 'same ID for another command');
        const ledger = await h.db.read((r) => count(r, 'ledger_entries'));
        equal(ledger, 2, 'lifecycle commands never touch the ledger');
      }),
  },
  {
    id: 'G02',
    title: 'Concurrent creates take Free\'s one goal at most once; concurrent deletes delete once',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('concurrent');
        const deps = h.deps;
        check((await deleteGoal(deps, await lifecycle(h, h.goalId))).ok, 'start with no goal');
        equal(await goalCount(h), 0, 'no goal');

        const results = await Promise.all(
          ['Racer A', 'Racer B', 'Racer C', 'Racer D'].map((title) => createGoal(deps, { operationId: h.op(), ...goalFields(title, 1_000) })),
        );
        const winners = results.filter((result) => result.ok).length;
        const limited = results.filter((result) => !result.ok && (result.error as { code: string }).code === 'goal_limit').length;
        equal([winners, limited], [1, 3], 'one winner, three refused by the limit');
        equal(await goalCount(h), 1, 'exactly one goal');

        const [winner] = await h.db.read((r) => r.all<{ id: string }>('SELECT id FROM goals'));
        check(winner, 'winner exists');
        const input = await lifecycle(h, winner.id);
        const pair = await Promise.all([
          deleteGoal(deps, input),
          deleteGoal(deps, { ...input, operationId: h.op() }),
        ]);
        equal(pair.filter((result) => result.ok).length, 1, 'one of two concurrent deletes succeeds');
        equal(await goalCount(h), 0, 'goal deleted once');
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
        // Without Pro a Garden goal is kept as it is (D75, Phase 16): no edit, no entry; nothing switches it.
        expectError(await edit({ ...goalFields('Kotor', 140_000), themeId: 'garden' }), 'theme_locked', 'Garden goal without Pro cannot change');
        expectError(await deposit(h, 1, '2026-11-02'), 'theme_locked', 'Garden goal without Pro cannot progress');
        equal((await h.db.read((r) => getGoal(r, h.goalId)))?.themeId, 'garden', 'theme kept');
        const staleEdit = await editGoal(deps, { operationId: h.op(), goalId: h.goalId, expectedRevision: 1, ...goalFields('Old', 1_000) });
        expectError(staleEdit, 'stale_goal', 'stale edit');

        // Lower the target to the balance, finish, and the goal is read-only.
        check((await edit({ ...goalFields('Kotor', 500, '2026-11-02'), themeId: 'garden' }, { ...deps, capabilities: PRO })).ok, 'target down to the balance');
        // A status change is still allowed on a Garden goal without Pro.
        check((await finishGoal(deps, await lifecycle(h, h.goalId))).ok, 'finish');
        expectError(await edit({ ...goalFields('Finished edit', 1_000), themeId: 'garden' }), 'goal_closed', 'completed goal is read-only');
        expectError(await deposit(h, 1, '2026-11-02'), 'goal_closed', 'no entries on a completed goal');
        const entries = await h.db.read((r) => count(r, 'ledger_entries'));
        equal(entries, 1, 'finishing keeps the history');
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

        // Two goals: a Pro person (Phase 16 makes a second goal read-only without Pro).
        const base = await s.harness('currency');
        const h = { ...base, deps: { ...base.deps, capabilities: PRO } };
        const deps = h.deps;
        const pro = deps;
        const second = await mustCreateGoal(h, pro, 'Paused empty goal', 2_500);
        check((await pauseGoal(deps, await lifecycle(h, second))).ok, 'pause the second goal');
        const set = (code: string) => setGlobalCurrency(deps, { operationId: h.op(), currencyCode: code });
        const targets = async () =>
          h.db.read(async (r) => [(await getGoal(r, h.goalId))?.targetMinor, (await getGoal(r, second))?.targetMinor]);

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

        // A souvenir alone keeps it locked (Phase 11: a real one, earned by the paused goal and kept
        // after its only transaction is deleted).
        const funded = await createEntry(deps, { operationId: h.op(), goalId: second, ...values('deposit', 2_500, '2026-10-22') });
        check(funded.ok && funded.value.souvenirAwarded, 'the paused goal earns its souvenir');
        const unfunded = await deleteEntry(deps, { operationId: h.op(), entryId: funded.value.entryId, expectedRevision: 1, confirmed: true });
        check(unfunded.ok && !unfunded.value.souvenirAwarded, 'its only transaction deleted');
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
        check((await deleteGoal(deps, { operationId: h.op(), goalId: third, expectedRevision: rev })).ok, 'delete the selected goal');
        equal((await readGoalsOverview(reopened)).selectedGoalId, h.goalId, 'deleted selection falls back to the oldest open goal');
        expectError(await selectGoal(deps, third), 'goal_not_found', 'cannot select a deleted goal');
        expectError(await selectGoal(deps, 'missing-goal'), 'goal_not_found', 'unknown goal');
        check((await selectGoal(deps, second)).ok, 'select second');
        equal((await readGoalsOverview(reopened)).selectedGoalId, second, 'second selected');
        await reopened.close();
      }),
  },
  {
    id: 'G06',
    title: 'Currency and a zero-balance goal survive a restart; the goal can then be deleted (D74)',
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
          const removed = await deleteGoal({ db: reopened, clock: h.clock }, { operationId: h.op(), goalId, expectedRevision: 1 });
          check(removed.ok, 'delete after restart');
          equal((await readGoalsOverview(reopened)).selectedGoalId, null, 'no goal left to show');
        } finally {
          await reopened.close();
        }
      }),
  },
  {
    id: 'G07',
    title: 'Delete Goal removes a completed goal with its entries and souvenir in one transaction (D74)',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('delete');
        const deps = h.deps;
        await mustCreate(h, 'deposit', 60_000, '2026-10-20');
        await mustCreate(h, 'deposit', 40_000, '2026-10-21');
        check((await finishGoal(deps, await lifecycle(h, h.goalId))).ok, 'finish');
        const totals = () =>
          h.db.read(async (r) => [await count(r, 'goals'), await count(r, 'ledger_entries'), await count(r, 'collectibles')]);

        expectError(await deleteGoal(deps, { operationId: h.op(), goalId: h.goalId, expectedRevision: 1 }), 'stale_goal', 'stale delete');
        equal(await totals(), [1, 2, 1], 'a refused delete changes nothing');
        expectError(await deleteGoal(deps, { operationId: '', goalId: h.goalId, expectedRevision: 2 }), 'invalid_operation_id', 'no operation ID');

        const input = await lifecycle(h, h.goalId);
        const first = await deleteGoal(deps, input);
        check(first.ok && !first.value.replayed, 'delete the completed goal');
        equal(await totals(), [0, 0, 0], 'goal, entries and souvenir are gone');
        const again = await deleteGoal(deps, input);
        check(again.ok && again.value.replayed, 'the same operation ID replays');
        expectError(await deleteGoal(deps, { ...input, operationId: h.op() }), 'goal_not_found', 'already deleted');
        equal((await h.db.read((r) => r.all('PRAGMA foreign_key_check'))).length, 0, 'foreign_key_check clean');

        // Nothing locks the currency any more.
        check((await setGlobalCurrency(deps, { operationId: h.op(), currencyCode: 'JPY' })).ok, 'currency unlocked');

        // A failure before COMMIT leaves everything in place.
        const kept = await s.harness('delete-fail');
        await mustCreate(kept, 'deposit', 1_000, '2026-10-22');
        kept.hooks.failBeforeCommit = true;
        const failed = await deleteGoal(kept.deps, await lifecycle(kept, kept.goalId));
        expectError(failed, 'storage_failure', 'injected failure');
        kept.hooks.failBeforeCommit = false;
        equal(await kept.db.read(async (r) => [await count(r, 'goals'), await count(r, 'ledger_entries')]), [1, 1], 'rolled back');
      }),
  },
  {
    id: 'G09',
    title: 'Delete Goal removes its challenge attempts with its entries and souvenir in one transaction (D74, Phase 12)',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('delete-challenges');
        const deps = h.deps;
        const start = (goalId: string, ruleId: 'first_step' | 'next_milestone') =>
          startChallenge(deps, { operationId: h.op(), goalId, ruleId });
        check((await start(h.goalId, 'next_milestone')).ok, 'start Next milestone');
        check((await mustCreate(h, 'deposit', 10_000, '2026-10-23')).completedAttemptId !== null, 'Next milestone completed');
        await mustCreate(h, 'deposit', 90_000, '2026-10-23');
        check((await start(h.goalId, 'first_step')).ok, 'start First step');
        check((await finishGoal(deps, await lifecycle(h, h.goalId))).ok, 'finish with a current attempt');
        const totals = () =>
          h.db.read(async (r) => [
            await count(r, 'goals'),
            await count(r, 'ledger_entries'),
            await count(r, 'collectibles'),
            await count(r, 'challenge_attempts'),
          ]);
        equal(await totals(), [1, 2, 1, 2], 'goal, entries, souvenir, a historical and a current attempt');

        h.hooks.failBeforeCommit = true;
        expectError(await deleteGoal(deps, await lifecycle(h, h.goalId)), 'storage_failure', 'injected failure');
        h.hooks.failBeforeCommit = false;
        equal(await totals(), [1, 2, 1, 2], 'rolled back together');

        const input = await lifecycle(h, h.goalId);
        const removed = await deleteGoal(deps, input);
        check(removed.ok && !removed.value.replayed, 'confirmed deletion');
        equal(await totals(), [0, 0, 0, 0], 'attempts are gone with the goal');
        equal((await h.db.read((r) => r.all('PRAGMA foreign_key_check'))).length, 0, 'foreign_key_check clean');
        const again = await deleteGoal(deps, input);
        check(again.ok && again.value.replayed, 'receipt replays');

        // A new goal starts with no history: First step is available again.
        const fresh = await mustCreateGoal(h, deps, 'New start');
        check((await start(fresh, 'first_step')).ok, 'First step on the new goal');
      }),
  },
  {
    id: 'G10',
    title: 'Change Theme is metadata only: ledger, target, quests and souvenir kept; closed, Free and read-only guards (Phase 17, D75)',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('theme');
        const pro = { ...h.deps, capabilities: PRO };
        const free = h.deps;
        const snapshot = () =>
          h.db.read(async (r) => ({
            goal: await r.all('SELECT id, title, target_minor, deadline_date, status, created_at_utc FROM goals'),
            entries: await r.all('SELECT * FROM ledger_entries ORDER BY id'),
            souvenirs: await r.all('SELECT * FROM collectibles'),
            attempts: await r.all('SELECT * FROM challenge_attempts ORDER BY id'),
          }));
        const themeOf = async () => (await h.db.read((r) => getGoal(r, h.goalId)))?.themeId;
        const change = async (deps: GoalCommandDeps, themeId: ThemeId, operationId = h.op()) =>
          changeGoalTheme(deps, { operationId, goalId: h.goalId, expectedRevision: await revisionOf(h, h.goalId), themeId });

        await mustCreate(h, 'deposit', 50_000, '2026-10-20');
        check((await startChallenge(h.deps, { operationId: h.op(), goalId: h.goalId, ruleId: 'next_milestone' })).ok, 'start a quest');
        const before = await snapshot();

        // Free: no Garden.
        expectError(await change(free, 'garden'), 'theme_unavailable', 'Free cannot choose the Garden');
        equal(await themeOf(), 'island', 'still the Island');

        // Pro: the Garden, then back, and a replay; nothing else moves.
        const input = { operationId: h.op(), goalId: h.goalId, expectedRevision: await revisionOf(h, h.goalId), themeId: 'garden' as ThemeId };
        const first = await changeGoalTheme(pro, input);
        check(first.ok && !first.value.replayed, 'Pro switches to the Garden');
        const replay = await changeGoalTheme(pro, input);
        check(replay.ok && replay.value.replayed, 'the same operation ID replays');
        equal(await snapshot(), before, 'ledger, target, quest and status unchanged');
        expectError(await change(pro, 'garden'), 'theme_unchanged', 'same world again');

        // A failure before COMMIT leaves the world as it was.
        h.hooks.failBeforeCommit = true;
        expectError(await change(pro, 'island'), 'storage_failure', 'injected failure');
        h.hooks.failBeforeCommit = false;
        equal(await themeOf(), 'garden', 'rolled back');

        // The first 100% on the Garden stores the Garden souvenir; switching keeps it, no second one.
        const toTarget = await createEntry(pro, { operationId: h.op(), goalId: h.goalId, ...values('deposit', 50_000, '2026-10-21') });
        check(toTarget.ok && toTarget.value.souvenirAwarded, 'deposit to 100% on the Garden');
        const souvenir = await h.db.read((r) => r.all('SELECT theme_id, theme_version FROM collectibles'));
        equal(souvenir, [{ theme_id: 'garden', theme_version: 1 }], 'Garden souvenir, version 1');
        check((await change(pro, 'island')).ok, 'switch at 100%');
        equal(await h.db.read((r) => r.all('SELECT theme_id, theme_version FROM collectibles')), souvenir, 'souvenir kept as earned');

        // A Garden goal without Pro may only become an Island (D75), never the reverse.
        check((await change(pro, 'garden')).ok, 'back to the Garden with Pro');
        check((await change(free, 'island')).ok, 'Free grows the Garden goal as an Island');
        expectError(await change(free, 'garden'), 'theme_unavailable', 'never back without Pro');

        // A completed goal needs Reopen first.
        check((await finishGoal(pro, await lifecycle(h, h.goalId))).ok, 'finish');
        expectError(await change(pro, 'garden'), 'goal_closed', 'closed goal');
        check((await reopenGoal(pro, await lifecycle(h, h.goalId))).ok, 'reopen');
        check((await change(pro, 'garden')).ok, 'open again: the Garden');
        equal(await statusOf(h, h.goalId), 'active', 'reopened goal stays active');
      }),
  },
  {
    id: 'G08',
    title: 'Schema 1 → 2: archived goals become paused with their records; goals become deletable',
    run: (context) =>
      withSession(context, async (s) => {
        const name = s.name('upgrade');
        const old = await s.openDb(name, MIGRATIONS.slice(0, 1));
        equal(old.migration, { fromVersion: 0, toVersion: 1, applied: [1] }, 'schema 1');
        await old.write(async (tx) => {
          await tx.run("INSERT INTO settings VALUES ('currency', ?, ?)", ['{"code":"EUR","exponent":2,"registryVersion":1}', START]);
          await tx.run('INSERT INTO goals VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['legacy-1', 'Old car', 500_000, null, 'island', 'active', START, START, 1]);
          await tx.run('INSERT INTO ledger_entries VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['legacy-e1', 'legacy-1', 12_345, '2026-10-01', 'kept', START, START, 1]);
          await tx.run("UPDATE goals SET status = 'archived', revision = revision + 1 WHERE id = 'legacy-1'");
        });
        await old.close();

        const db = await s.openDb(name, MIGRATIONS.slice(0, 2));
        equal(db.migration, { fromVersion: 1, toVersion: 2, applied: [2] }, 'upgrade to schema 2');
        const state = await db.read(async (r) => ({
          goal: await r.get('SELECT status, revision FROM goals WHERE id = ?', ['legacy-1']),
          entries: await r.all('SELECT id, signed_amount_minor, note FROM ledger_entries'),
          trigger: await r.get("SELECT name FROM sqlite_schema WHERE type = 'trigger' AND name = 'goals_no_delete'"),
        }));
        equal(state.goal, { status: 'paused', revision: 3 }, 'archived became paused');
        equal(state.entries, [{ id: 'legacy-e1', signed_amount_minor: 12_345, note: 'kept' }], 'records kept');
        equal(state.trigger, null, 'no-delete trigger dropped');
        await db.close();

        // The current app (schema 4) opens it and can delete the goal; it is below target, so the
        // schema 3 upgrade gives it no souvenir.
        const current = await s.openDb(name);
        equal(
          current.migration,
          { fromVersion: 2, toVersion: LATEST_SCHEMA_VERSION, applied: MIGRATIONS.map((m) => m.version).filter((v) => v > 2) },
          'upgrade to the current schema',
        );
        equal(await current.read((r) => count(r, 'collectibles')), 0, 'no souvenir below target');
        const removed = await deleteGoal({ db: current, clock: steppingClock() }, { operationId: 'op-upgrade-delete', goalId: 'legacy-1', expectedRevision: 3 });
        check(removed.ok, 'upgraded goal can be deleted');
      }),
  },
];
