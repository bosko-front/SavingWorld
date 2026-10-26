import { accessView, currentCapabilities, goalCommandDeps, ledgerCommandDeps, challengeCommandDeps, refreshAppData, useAppDataStore } from '@/bootstrap/app-data';
import { purchaseProFromApp, reconcileBilling } from '@/bootstrap/billing';
import { getAppDatabase, resetAppDatabaseForTests, setAppDatabaseDriverForTests, useDatabaseStore } from '@/bootstrap/database-readiness';
import { canChangeGoalTheme, capabilitiesFor } from '@/core/access';
import { systemClock, today } from '@/core/calendar';
import { CURRENT_THEME_VERSIONS, stageFor, type ThemeId } from '@/core/progression';
import { randomUuid } from '@/data/ids';
import { getGoal } from '@/data/repositories/goal-repository';
import { startChallenge } from '@/features/challenges/application/challenge-commands';
import { chooseKeptGoal } from '@/features/goals/application/goal-access';
import { changeGoalTheme, createGoal, finishGoal, pauseGoal, reopenGoal } from '@/features/goals/application/goal-commands';
import { createEntry } from '@/features/ledger/application/ledger-commands';

import { chooseCurrency, resetApp } from '../support/app-fixture';
import { fakeStore, refundStoreTransaction } from '../support/expo-iap-fake';
import { createNodeSqliteDriver, temporaryDirectory } from '../support/node-sqlite-driver';

// Phase 17 Change Theme at the command boundary (TEST_PLAN T15, T17, T19; R09, R11, R20, R21; owner
// decisions D74, D75): a switch is theme metadata only and keeps every amount, entry, quest and the
// souvenir; the stage is the same in both worlds at 0/10/50/100/over-100%; closed goals need Reopen;
// Free gets no Garden; a Garden goal after a verified loss may only be grown as an Island by the
// person; nothing switches a theme or removes data when rights change. Host SQLite (Jest); the native
// SQLite scenario T01 is in tests/native/goal-scenarios.ts (`npm run test:db`).

const TODAY = today(systemClock);
let directory = '';

beforeEach(async () => {
  await resetApp();
  directory = temporaryDirectory('themes');
  setAppDatabaseDriverForTests(createNodeSqliteDriver(directory));
  await useDatabaseStore.getState().open();
  await chooseCurrency();
  await refreshAppData();
});

afterEach(async () => {
  await resetApp();
});

async function restartApp() {
  await resetAppDatabaseForTests();
  useAppDataStore.setState({ state: { status: 'idle' } });
  setAppDatabaseDriverForTests(createNodeSqliteDriver(directory));
  await useDatabaseStore.getState().open();
  await refreshAppData();
}

async function mustGoal(title: string, targetMinor = 10_000, themeId: ThemeId = 'island'): Promise<string> {
  const created = await createGoal(goalCommandDeps(), { operationId: randomUuid(), title, targetMinor, deadlineDate: null, themeId });
  if (!created.ok) {
    throw new Error(`goal ${title}: ${JSON.stringify(created.error)}`);
  }
  await refreshAppData();
  return created.value.goalId;
}

async function mustDeposit(goalId: string, amountMinor: number) {
  const result = await createEntry(ledgerCommandDeps(), { operationId: randomUuid(), goalId, kind: 'deposit', amountMinor, entryDate: TODAY, note: null });
  if (!result.ok) {
    throw new Error(`deposit: ${JSON.stringify(result.error)}`);
  }
  await refreshAppData();
  return result.value;
}

async function goalRow(goalId: string) {
  const goal = await getAppDatabase().read((r) => getGoal(r, goalId));
  if (!goal) {
    throw new Error('goal missing');
  }
  return goal;
}

async function switchTo(goalId: string, themeId: ThemeId, operationId = randomUuid()) {
  const goal = await goalRow(goalId);
  const result = await changeGoalTheme(goalCommandDeps(), { operationId, goalId, expectedRevision: goal.revision, themeId });
  await refreshAppData();
  return result;
}

async function lifecycle(goalId: string) {
  return { operationId: randomUuid(), goalId, expectedRevision: (await goalRow(goalId)).revision };
}

function code(result: { ok: boolean; error?: unknown }): string | null {
  return result.ok ? null : ((result.error as { code: string }).code ?? null);
}

// Every savings table and the settings, minus the goal row's own theme/revision/updated time.
async function savingsData() {
  return getAppDatabase().read(async (r) => ({
    goals: (await r.all<Record<string, unknown>>('SELECT * FROM goals ORDER BY id')).map(({ theme_id: _theme, revision: _revision, updated_at_utc: _updated, ...rest }) => rest),
    entries: await r.all('SELECT * FROM ledger_entries ORDER BY id'),
    souvenirs: await r.all('SELECT * FROM collectibles ORDER BY goal_id'),
    attempts: await r.all('SELECT * FROM challenge_attempts ORDER BY id'),
    settings: await r.all("SELECT * FROM settings WHERE key <> 'selectedGoalId' ORDER BY key"),
  }));
}

async function allTables() {
  return getAppDatabase().read(async (r) => ({
    goals: await r.all('SELECT * FROM goals ORDER BY id'),
    entries: await r.all('SELECT * FROM ledger_entries ORDER BY id'),
    souvenirs: await r.all('SELECT * FROM collectibles ORDER BY goal_id'),
    attempts: await r.all('SELECT * FROM challenge_attempts ORDER BY id'),
  }));
}

async function buyPro() {
  expect((await purchaseProFromApp())?.outcome).toBe('purchased');
  expect(currentCapabilities().level).toBe('pro');
  await refreshAppData();
}

async function refundPro() {
  refundStoreTransaction(fakeStore.transactions[0]!.id);
  await reconcileBilling();
  expect(currentCapabilities().level).toBe('free');
  await refreshAppData();
}

function snapshotSummary(goalId: string) {
  const { state } = useAppDataStore.getState();
  if (state.status !== 'ready') {
    throw new Error('no snapshot');
  }
  return state.data.goals.goals.find((summary) => summary.goal.id === goalId)!;
}

describe('the theme rule (pure, D75)', () => {
  it('Pro may choose either world; Free may only move a Garden it cannot use to the Island, never the reverse', () => {
    const free = capabilitiesFor('free');
    const pro = capabilitiesFor('pro');
    expect([canChangeGoalTheme(pro, 'island', 'garden'), canChangeGoalTheme(pro, 'garden', 'island')]).toEqual([true, true]);
    expect([canChangeGoalTheme(free, 'island', 'garden'), canChangeGoalTheme(free, 'garden', 'island')]).toEqual([false, true]);
    expect([canChangeGoalTheme(free, 'island', 'island'), canChangeGoalTheme(free, 'garden', 'garden')]).toEqual([true, true]);
  });
});

describe('Pro switching on an open goal (R20)', () => {
  // 0%, 10%, 50%, 100% and 125% of a 10,000 target (one minor unit below 10% stays at the base).
  it.each([0, 999, 1_000, 5_000, 10_000, 12_500])('at %d saved keeps every value and shows the same stage in the other world', async (saved) => {
    await buyPro();
    const goalId = await mustGoal('Trip');
    if (saved > 0) {
      await mustDeposit(goalId, saved);
    }
    const before = await savingsData();
    const beforeGoal = await goalRow(goalId);
    const stage = stageFor(snapshotSummary(goalId).balanceMinor, beforeGoal.targetMinor);

    const toGarden = await switchTo(goalId, 'garden');
    expect(toGarden.ok && toGarden.value).toMatchObject({ replayed: false, revision: beforeGoal.revision + 1 });
    expect(await savingsData()).toEqual(before);
    const garden = snapshotSummary(goalId);
    expect(garden.goal.themeId).toBe('garden');
    expect([garden.balanceMinor, garden.goal.targetMinor, garden.goal.status]).toEqual([saved, 10_000, 'active']);
    expect(stageFor(garden.balanceMinor, garden.goal.targetMinor)).toBe(stage);

    expect((await switchTo(goalId, 'island')).ok).toBe(true);
    expect(await savingsData()).toEqual(before);
    expect(snapshotSummary(goalId).goal.themeId).toBe('island');
    // The theme survives a restart.
    expect((await switchTo(goalId, 'garden')).ok).toBe(true);
    await restartApp();
    expect(snapshotSummary(goalId).goal.themeId).toBe('garden');
    expect(stageFor(snapshotSummary(goalId).balanceMinor, 10_000)).toBe(stage);
  });

  it('keeps the souvenir on the theme and version it was earned with, and awards no second one', async () => {
    await buyPro();
    const goalId = await mustGoal('Garden goal', 10_000, 'garden');
    expect((await mustDeposit(goalId, 10_000)).souvenirAwarded).toBe(true);
    const souvenir = await getAppDatabase().read((r) => r.all('SELECT * FROM collectibles'));
    expect(souvenir).toEqual([expect.objectContaining({ goal_id: goalId, theme_id: 'garden', theme_version: CURRENT_THEME_VERSIONS.garden })]);
    expect((await switchTo(goalId, 'island')).ok).toBe(true);
    expect((await switchTo(goalId, 'garden')).ok).toBe(true);
    expect((await switchTo(goalId, 'island')).ok).toBe(true);
    // Another deposit at 100% on the Island: still the one Garden souvenir.
    expect((await mustDeposit(goalId, 500)).souvenirAwarded).toBe(false);
    expect(await getAppDatabase().read((r) => r.all('SELECT * FROM collectibles'))).toEqual(souvenir);
  });

  it('keeps a running quest and its frozen contract', async () => {
    await buyPro();
    const goalId = await mustGoal('Quest goal');
    await mustDeposit(goalId, 2_500);
    expect((await startChallenge(challengeCommandDeps(), { operationId: randomUuid(), goalId, ruleId: 'next_milestone' })).ok).toBe(true);
    const before = await savingsData();
    expect((await switchTo(goalId, 'garden')).ok).toBe(true);
    expect(await savingsData()).toEqual(before);
  });

  it('a paused goal changes its world and stays paused (reminders are not resumed)', async () => {
    await buyPro();
    const goalId = await mustGoal('Paused');
    expect((await pauseGoal(goalCommandDeps(), await lifecycle(goalId))).ok).toBe(true);
    expect((await switchTo(goalId, 'garden')).ok).toBe(true);
    expect((await goalRow(goalId)).status).toBe('paused');
  });

  it('a completed goal needs Reopen first; Reopen then allows the change', async () => {
    await buyPro();
    const goalId = await mustGoal('Done');
    await mustDeposit(goalId, 10_000);
    expect((await finishGoal(goalCommandDeps(), await lifecycle(goalId))).ok).toBe(true);
    const before = await allTables();
    expect(code(await switchTo(goalId, 'garden'))).toBe('goal_closed');
    expect(await allTables()).toEqual(before);
    expect((await reopenGoal(goalCommandDeps(), await lifecycle(goalId))).ok).toBe(true);
    expect((await switchTo(goalId, 'garden')).ok).toBe(true);
    // Reopen never finishes again on its own.
    expect((await goalRow(goalId)).status).toBe('active');
  });

  it('replays a committed change, refuses a stale screen and the same world again', async () => {
    await buyPro();
    const goalId = await mustGoal('Replay');
    const goal = await goalRow(goalId);
    const operationId = randomUuid();
    const first = await changeGoalTheme(goalCommandDeps(), { operationId, goalId, expectedRevision: goal.revision, themeId: 'garden' });
    const again = await changeGoalTheme(goalCommandDeps(), { operationId, goalId, expectedRevision: goal.revision, themeId: 'garden' });
    expect(first.ok && again.ok && [first.value.replayed, again.value.replayed, again.value.revision]).toEqual([false, true, goal.revision + 1]);
    // An outdated screen (old revision, new operation) is refused instead of applied twice.
    expect(code(await changeGoalTheme(goalCommandDeps(), { operationId: randomUuid(), goalId, expectedRevision: goal.revision, themeId: 'island' }))).toBe('stale_goal');
    expect(code(await switchTo(goalId, 'garden'))).toBe('theme_unchanged');
    expect(code(await changeGoalTheme(goalCommandDeps(), { operationId: randomUuid(), goalId, expectedRevision: goal.revision + 1, themeId: 'forest' as ThemeId }))).toBe('invalid_theme');
  });
});

describe('Free (R18, D122)', () => {
  it('never gets the Garden: not on Create, not by Change Theme, also from a stale screen or deep link', async () => {
    expect(code(await createGoal(goalCommandDeps(), { operationId: randomUuid(), title: 'G', targetMinor: 1_000, deadlineDate: null, themeId: 'garden' }))).toBe(
      'theme_unavailable',
    );
    const goalId = await mustGoal('Island');
    const before = await allTables();
    expect(code(await switchTo(goalId, 'garden'))).toBe('theme_unavailable');
    expect(await allTables()).toEqual(before);
  });

  it('gets the Garden right after a verified purchase', async () => {
    const goalId = await mustGoal('Island');
    await buyPro();
    expect((await switchTo(goalId, 'garden')).ok).toBe(true);
  });
});

describe('after a verified loss of Pro (D74, D75)', () => {
  it('a Garden goal stays unchanged until the person grows it as an Island; Garden comes back only with Pro', async () => {
    await buyPro();
    const goalId = await mustGoal('Garden', 10_000, 'garden');
    await mustDeposit(goalId, 6_000);
    await refundPro();

    // Nothing switched or changed on the loss.
    expect(snapshotSummary(goalId).goal.themeId).toBe('garden');
    expect(accessView((useAppDataStore.getState().state as { data: Parameters<typeof accessView>[0] }).data).use({ id: goalId, themeId: 'garden' })).toBe('theme_locked');
    const before = await savingsData();

    // The person's own choice: the Island, kept ledger/target/souvenir, the same stage.
    expect((await switchTo(goalId, 'island')).ok).toBe(true);
    expect(await savingsData()).toEqual(before);
    expect(stageFor(snapshotSummary(goalId).balanceMinor, 10_000)).toBe(6);
    expect((await mustDeposit(goalId, 1_000)).entryId).toBeTruthy();
    // Never back to the Garden without Pro.
    expect(code(await switchTo(goalId, 'garden'))).toBe('theme_unavailable');

    // Pro returns: Garden again, drawn from the current balance and target.
    fakeStore.failures = {};
    await buyPro();
    expect((await switchTo(goalId, 'garden')).ok).toBe(true);
    expect(stageFor(snapshotSummary(goalId).balanceMinor, snapshotSummary(goalId).goal.targetMinor)).toBe(7);
  });

  it('a read-only goal (not the kept one) changes no world', async () => {
    await buyPro();
    const kept = await mustGoal('Kept');
    const other = await mustGoal('Other', 10_000, 'garden');
    await refundPro();
    expect(code(await switchTo(other, 'island'))).toBe('goal_read_only');
    expect((await chooseKeptGoal({ db: getAppDatabase(), clock: systemClock, capabilities: currentCapabilities() }, kept)).ok).toBe(true);
    await refreshAppData();
    const before = await allTables();
    expect(code(await switchTo(other, 'island'))).toBe('goal_read_only');
    expect(await allTables()).toEqual(before);
  });

  it('no rights change switches a theme or removes data: loss, offline check, return (D75)', async () => {
    await buyPro();
    const island = await mustGoal('Island goal');
    const garden = await mustGoal('Garden goal', 10_000, 'garden');
    await mustDeposit(garden, 10_000);
    await mustDeposit(island, 3_000);
    const before = await allTables();
    await refundPro();
    expect(await allTables()).toEqual(before);
    fakeStore.failures = { init: 'network-error' };
    await reconcileBilling();
    expect(await allTables()).toEqual(before);
    fakeStore.failures = {};
    await buyPro();
    await restartApp();
    expect(await allTables()).toEqual(before);
  });
});
