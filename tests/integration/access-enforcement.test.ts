import {
  accessView,
  appClock,
  challengeCommandDeps,
  currentCapabilities,
  goalCommandDeps,
  ledgerCommandDeps,
  refreshAppData,
  useAppDataStore,
  type AccessView,
} from '@/bootstrap/app-data';
import { purchaseProFromApp, reconcileBilling, restorePurchasesFromApp } from '@/bootstrap/billing';
import { getAppDatabase, resetAppDatabaseForTests, setAppDatabaseDriverForTests, useDatabaseStore } from '@/bootstrap/database-readiness';
import { capabilitiesFor } from '@/core/access';
import { systemClock, today } from '@/core/calendar';
import type { ThemeId } from '@/core/progression';
import { randomUuid } from '@/data/ids';
import { getGoal } from '@/data/repositories/goal-repository';
import { readChallengeBoard } from '@/features/challenges/application/challenge-queries';
import { skipChallenge, startChallenge } from '@/features/challenges/application/challenge-commands';
import { chooseKeptGoal } from '@/features/goals/application/goal-access';
import { createGoal, deleteGoal, editGoal, finishGoal, pauseGoal, reopenGoal, resumeGoal } from '@/features/goals/application/goal-commands';
import { correctEntry, createEntry, deleteEntry } from '@/features/ledger/application/ledger-commands';

import { chooseCurrency, resetApp } from '../support/app-fixture';
import { addStoreTransaction, fakeStore, refundStoreTransaction } from '../support/expo-iap-fake';
import { createNodeSqliteDriver, temporaryDirectory } from '../support/node-sqlite-driver';

// Phase 16 capability matrix at the command boundary (TEST_PLAN T07, T14, T15; R05, R14, R15, R18,
// R21; owner decisions D74, D75). Every command gets the app's own capabilities (`*CommandDeps`),
// which come only from the stored StoreKit entitlement; purchases, refunds and offline checks run
// through the real billing queue and reconciler over the expo-iap fake. Host SQLite (Jest); the
// native SQLite run and the StoreKit device checks are recorded in docs/evidence/PHASE_16.md.

const TODAY = today(systemClock);

let directory = '';

beforeEach(async () => {
  await resetApp();
  directory = temporaryDirectory('access');
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

function access(): AccessView {
  const { state } = useAppDataStore.getState();
  if (state.status !== 'ready') {
    throw new Error('no snapshot');
  }
  return accessView(state.data);
}

async function newGoal(title: string, targetMinor = 10_000, themeId: ThemeId = 'island', operationId = randomUuid()) {
  return createGoal(goalCommandDeps(), { operationId, title, targetMinor, deadlineDate: null, themeId });
}

async function mustGoal(title: string, targetMinor = 10_000, themeId: ThemeId = 'island'): Promise<string> {
  const created = await newGoal(title, targetMinor, themeId);
  if (!created.ok) {
    throw new Error(`goal ${title}: ${JSON.stringify(created.error)}`);
  }
  await refreshAppData();
  return created.value.goalId;
}

function deposit(goalId: string, amountMinor: number) {
  return createEntry(ledgerCommandDeps(), { operationId: randomUuid(), goalId, kind: 'deposit', amountMinor, entryDate: TODAY, note: null });
}

async function mustDeposit(goalId: string, amountMinor: number) {
  const result = await deposit(goalId, amountMinor);
  if (!result.ok) {
    throw new Error(`deposit: ${JSON.stringify(result.error)}`);
  }
  await refreshAppData();
  return result.value;
}

async function revision(goalId: string): Promise<number> {
  return (await getAppDatabase().read((r) => getGoal(r, goalId)))?.revision ?? 0;
}

async function lifecycle(goalId: string) {
  return { operationId: randomUuid(), goalId, expectedRevision: await revision(goalId) };
}

async function edit(goalId: string, title: string, themeId: ThemeId = 'island') {
  return editGoal(goalCommandDeps(), { ...(await lifecycle(goalId)), title, targetMinor: 10_000, deadlineDate: null, themeId });
}

function code(result: { ok: boolean; error?: unknown }): string | null {
  return result.ok ? null : ((result.error as { code: string }).code ?? null);
}

// Every savings table, to prove a change of rights never touches them (D75).
async function savingsData() {
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
}

async function refundPro() {
  refundStoreTransaction(fakeStore.transactions[0]!.id);
  await reconcileBilling();
  expect(currentCapabilities().level).toBe('free');
}

describe('Free: one goal in total, in any status (R05, D74)', () => {
  it('refuses every second Create, also repeated with new operation IDs, until the goal is deleted', async () => {
    const firstOperation = randomUuid();
    const first = await newGoal('Bike', 10_000, 'island', firstOperation);
    expect(first.ok).toBe(true);
    await refreshAppData();
    expect(access().canCreate).toBe(false);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect(code(await newGoal(`Second ${attempt}`))).toBe('goal_limit');
    }
    // A retry of the committed first Create replays; it never counts as a new goal.
    const replay = await newGoal('Bike', 10_000, 'island', firstOperation);
    expect(replay.ok && replay.value.replayed).toBe(true);

    // Paused or finished, the goal still counts.
    const goalId = first.ok ? first.value.goalId : '';
    expect((await pauseGoal(goalCommandDeps(), await lifecycle(goalId))).ok).toBe(true);
    expect(code(await newGoal('Paused second'))).toBe('goal_limit');
    await mustDeposit(goalId, 10_000);
    expect((await finishGoal(goalCommandDeps(), await lifecycle(goalId))).ok).toBe(true);
    expect(code(await newGoal('Finished second'))).toBe('goal_limit');
    // Free still finishes, reopens and deletes its one goal (delete and start over).
    expect((await reopenGoal(goalCommandDeps(), await lifecycle(goalId))).ok).toBe(true);
    expect((await deleteGoal(goalCommandDeps(), await lifecycle(goalId))).ok).toBe(true);
    await refreshAppData();
    expect(access().canCreate).toBe(true);
    expect((await newGoal('Start over')).ok).toBe(true);
  });

  it('keeps Garden and theme switching for Pro (R18, R20)', async () => {
    expect(code(await newGoal('Garden', 10_000, 'garden'))).toBe('theme_unavailable');
    const goalId = await mustGoal('Island');
    expect(code(await edit(goalId, 'Island', 'garden'))).toBe('theme_unavailable');
  });
});

describe('Pro (R18)', () => {
  it('allows unlimited goals and Garden; the three fixed challenges are identical in Free and Pro (R14)', async () => {
    const freeGoal = await mustGoal('Free goal');
    const freeBoard = await readChallengeBoard(getAppDatabase(), freeGoal, appClock());
    expect(freeBoard?.offers.map((offer) => offer.ruleId)).toEqual(['first_step', 'next_milestone', 'weekly_step']);
    expect((await startChallenge(challengeCommandDeps(), { operationId: randomUuid(), goalId: freeGoal, ruleId: 'first_step' })).ok).toBe(true);
    const runningBoard = await readChallengeBoard(getAppDatabase(), freeGoal, appClock());

    // Buying Pro changes nothing about the quests: same catalog, same availability, same attempt.
    await buyPro();
    expect(await readChallengeBoard(getAppDatabase(), freeGoal, appClock())).toEqual(runningBoard);
    for (const title of ['Two', 'Three', 'Four', 'Five', 'Six']) {
      expect((await newGoal(title)).ok).toBe(true);
    }
    expect((await newGoal('Garden', 10_000, 'garden')).ok).toBe(true);
    expect((await edit(freeGoal, 'Free goal', 'garden')).ok).toBe(true);
    await refreshAppData();
    expect(access().needsKeptChoice).toBe(false);
    const pro = await mustGoal('Pro quests');
    expect((await startChallenge(challengeCommandDeps(), { operationId: randomUuid(), goalId: pro, ruleId: 'next_milestone' })).ok).toBe(true);
  });

  it('keeps verified rights through an offline check: every goal stays usable (R21)', async () => {
    await buyPro();
    const a = await mustGoal('A');
    const b = await mustGoal('B');
    fakeStore.failures = { init: 'network-error' };
    await reconcileBilling();
    expect(currentCapabilities().level).toBe('pro');
    await refreshAppData();
    expect([access().use({ id: a, themeId: 'island' }), access().use({ id: b, themeId: 'island' })]).toEqual(['usable', 'usable']);
    expect((await deposit(b, 500)).ok).toBe(true);
  });
});

describe('verified loss of Pro (D74, D75)', () => {
  it('changes nothing; every goal is read-only until the person keeps one; deleting stays possible; Pro returning restores all', async () => {
    await buyPro();
    const bike = await mustGoal('Bike');
    const camera = await mustGoal('Camera');
    const trip = await mustGoal('Trip');
    const bikeEntry = await mustDeposit(bike, 10_000);
    expect(bikeEntry.souvenirAwarded).toBe(true);
    expect((await finishGoal(goalCommandDeps(), await lifecycle(bike))).ok).toBe(true);
    const cameraEntry = await mustDeposit(camera, 2_000);
    const quest = await startChallenge(challengeCommandDeps(), { operationId: randomUuid(), goalId: camera, ruleId: 'next_milestone' });
    expect(quest.ok).toBe(true);
    await mustDeposit(trip, 1_000);
    const before = await savingsData();

    await refundPro();
    await refreshAppData();
    expect(await savingsData()).toEqual(before);
    expect(access().needsKeptChoice).toBe(true);
    expect(access().canCreate).toBe(false);

    // Until the person chooses, no goal accepts a change.
    for (const goalId of [camera, trip]) {
      expect(code(await deposit(goalId, 100))).toBe('goal_read_only');
      expect(code(await edit(goalId, 'Renamed'))).toBe('goal_read_only');
      expect(code(await pauseGoal(goalCommandDeps(), await lifecycle(goalId)))).toBe('goal_read_only');
      expect(code(await startChallenge(challengeCommandDeps(), { operationId: randomUuid(), goalId, ruleId: 'first_step' }))).toBe('goal_read_only');
    }
    expect(code(await correctEntry(ledgerCommandDeps(), { operationId: randomUuid(), entryId: cameraEntry.entryId, expectedRevision: 1, kind: 'deposit', amountMinor: 1, entryDate: TODAY, note: null }))).toBe('goal_read_only');
    expect(code(await deleteEntry(ledgerCommandDeps(), { operationId: randomUuid(), entryId: cameraEntry.entryId, expectedRevision: 1, confirmed: true }))).toBe('goal_read_only');
    expect(code(await reopenGoal(goalCommandDeps(), await lifecycle(bike)))).toBe('goal_limit');
    expect(code(await newGoal('Fourth'))).toBe('goal_limit');
    // Refused commands changed nothing.
    expect(await savingsData()).toEqual(before);
    // A running quest can still be skipped, so it never stays stuck.
    expect((await skipChallenge(challengeCommandDeps(), { operationId: randomUuid(), attemptId: quest.ok ? quest.value.attemptId : '' })).ok).toBe(true);

    // The person keeps the finished Bike: it may reopen and save again; the others stay read-only.
    expect((await chooseKeptGoal({ db: getAppDatabase(), clock: appClock(), capabilities: currentCapabilities() }, bike)).ok).toBe(true);
    await refreshAppData();
    expect(access().needsKeptChoice).toBe(false);
    expect(access().keptGoalId).toBe(bike);
    const again = await chooseKeptGoal({ db: getAppDatabase(), clock: appClock(), capabilities: currentCapabilities() }, camera);
    expect(!again.ok && again.error).toEqual({ code: 'already_chosen', keptGoalId: bike });
    expect((await reopenGoal(goalCommandDeps(), await lifecycle(bike))).ok).toBe(true);
    expect((await deposit(bike, 300)).ok).toBe(true);
    expect(code(await deposit(camera, 100))).toBe('goal_read_only');
    expect(code(await reopenGoal(goalCommandDeps(), await lifecycle(camera)))).toBe('invalid_transition');

    // Deleting is the person's own confirmed action and always allowed.
    expect((await deleteGoal(goalCommandDeps(), await lifecycle(trip))).ok).toBe(true);
    expect(code(await deposit(camera, 100))).toBe('goal_read_only');

    // The kept choice survives a cold restart.
    await restartApp();
    expect(currentCapabilities().level).toBe('free');
    expect(access().keptGoalId).toBe(bike);
    expect(access().use({ id: camera, themeId: 'island' })).toBe('read_only');

    // Pro returns (a new verified purchase found by Restore): every goal is usable again.
    addStoreTransaction();
    expect((await restorePurchasesFromApp())?.outcome).toBe('restored');
    await refreshAppData();
    expect(access().use({ id: camera, themeId: 'island' })).toBe('usable');
    expect((await deposit(camera, 100)).ok).toBe(true);
    expect((await newGoal('Fourth')).ok).toBe(true);
  });

  it('with one goal left after the loss, that goal simply stays usable', async () => {
    await buyPro();
    const a = await mustGoal('A');
    const b = await mustGoal('B');
    await refundPro();
    await refreshAppData();
    expect(access().needsKeptChoice).toBe(true);
    expect((await deleteGoal(goalCommandDeps(), await lifecycle(b))).ok).toBe(true);
    await refreshAppData();
    expect(access().needsKeptChoice).toBe(false);
    expect((await deposit(a, 100)).ok).toBe(true);
    const notNeeded = await chooseKeptGoal({ db: getAppDatabase(), clock: appClock(), capabilities: currentCapabilities() }, a);
    expect(!notNeeded.ok && notNeeded.error.code).toBe('not_needed');
  });

  it('keeps a Garden goal exactly as it is: no progress without Pro, status changes allowed, its souvenir stays (D75)', async () => {
    await buyPro();
    const garden = await mustGoal('Garden', 10_000, 'garden');
    expect((await mustDeposit(garden, 10_000)).souvenirAwarded).toBe(true);
    await refundPro();
    await refreshAppData();
    expect(access().use({ id: garden, themeId: 'garden' })).toBe('theme_locked');
    expect(code(await deposit(garden, 100))).toBe('theme_locked');
    expect(code(await edit(garden, 'Garden', 'garden'))).toBe('theme_locked');
    expect(code(await startChallenge(challengeCommandDeps(), { operationId: randomUuid(), goalId: garden, ruleId: 'first_step' }))).toBe('theme_locked');
    expect((await pauseGoal(goalCommandDeps(), await lifecycle(garden))).ok).toBe(true);
    expect((await resumeGoal(goalCommandDeps(), await lifecycle(garden))).ok).toBe(true);
    const stored = await getAppDatabase().read((r) => getGoal(r, garden));
    expect(stored?.themeId).toBe('garden');
    expect((await savingsData()).souvenirs).toEqual([expect.objectContaining({ goal_id: garden, theme_id: 'garden' })]);
    // Island is not switched in by anything automatic; the person's choice of Island comes in Phase 17.
    expect(capabilitiesFor('free').switchOpenGoalTheme).toBe(false);
  });
});
