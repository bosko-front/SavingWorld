import { currentCapabilities, refreshAppData, useAppDataStore } from '@/bootstrap/app-data';
import { purchaseProFromApp, reconcileBilling, restorePurchasesFromApp, setStoreGatewayForTests } from '@/bootstrap/billing';
import { getAppDatabase, resetAppDatabaseForTests, setAppDatabaseDriverForTests, useDatabaseStore } from '@/bootstrap/database-readiness';
import { capabilitiesFor } from '@/core/access';
import { systemClock, today } from '@/core/calendar';
import { randomUuid, uuidGenerator } from '@/data/ids';
import { listPurchaseEvents, readEntitlement } from '@/data/repositories/entitlement-repository';
import {
  processTransaction,
  purchasePro,
  reconcileEntitlement,
  restorePurchases,
  syncStoredEntitlement,
  type BillingDeps,
} from '@/features/billing/application/entitlement-reconciler';
import { PRO_PRODUCT_ID, UNCONFIRMED_LOSS } from '@/features/billing/domain/entitlement';
import { expoStoreGateway, type PurchaseGateway } from '@/features/billing/native/store-gateway';
import { createGoal } from '@/features/goals/application/goal-commands';
import { createEntry } from '@/features/ledger/application/ledger-commands';

import { chooseCurrency, resetApp } from '../support/app-fixture';
import { addStoreTransaction, emitStoreUpdate, fakeStore, refundStoreTransaction } from '../support/expo-iap-fake';
import { createNodeSqliteDriver, temporaryDirectory } from '../support/node-sqlite-driver';

// Phase 15 entitlement lifecycle on host SQLite, with the real store adapter over the expo-iap fake
// (Jest only; native StoreKit evidence is in docs/evidence/PHASE_15.md). Covers every purchase
// outcome, persistence across restart, duplicate deliveries, interrupted finishing, offline startup,
// refund/revocation without any change to savings data, and Restore after a reinstall.

const TODAY = today(systemClock);

function deps(gateway: PurchaseGateway = expoStoreGateway): BillingDeps {
  return { db: getAppDatabase(), clock: systemClock, gateway };
}

const stored = () => getAppDatabase().read((r) => readEntitlement(r, PRO_PRODUCT_ID));
const events = () => getAppDatabase().read((r) => listPurchaseEvents(r));

// Every savings table, to prove a change of rights never touches them.
async function savingsData() {
  return getAppDatabase().read(async (r) => ({
    goals: await r.all('SELECT * FROM goals ORDER BY id'),
    entries: await r.all('SELECT * FROM ledger_entries ORDER BY id'),
    souvenirs: await r.all('SELECT * FROM collectibles ORDER BY goal_id'),
    attempts: await r.all('SELECT * FROM challenge_attempts ORDER BY id'),
    settings: await r.all("SELECT key, value_json FROM settings WHERE key IN ('currency', 'selectedGoalId') ORDER BY key"),
  }));
}

async function addFundedGoals() {
  const goalDeps = { db: getAppDatabase(), clock: systemClock, ids: uuidGenerator, capabilities: capabilitiesFor('pro') };
  const ids: string[] = [];
  for (const title of ['Bike', 'Camera']) {
    const created = await createGoal(goalDeps, { operationId: randomUuid(), title, targetMinor: 10_000, deadlineDate: null, themeId: 'island' });
    if (!created.ok) {
      throw new Error(JSON.stringify(created.error));
    }
    ids.push(created.value.goalId);
  }
  const entry = await createEntry(
    { db: getAppDatabase(), clock: systemClock, ids: uuidGenerator },
    { operationId: randomUuid(), goalId: ids[0]!, kind: 'deposit', amountMinor: 10_000, entryDate: TODAY, note: 'all of it' },
  );
  expect(entry.ok).toBe(true);
  return ids;
}

// The database directory of the current test, reopened after a "restart".
let directory = '';

async function restartApp() {
  await resetAppDatabaseForTests();
  useAppDataStore.setState({ state: { status: 'idle' } });
  setAppDatabaseDriverForTests(createNodeSqliteDriver(directory));
  await useDatabaseStore.getState().open();
  await refreshAppData();
}

beforeEach(async () => {
  await resetApp();
  directory = temporaryDirectory('billing');
  setAppDatabaseDriverForTests(createNodeSqliteDriver(directory));
  await useDatabaseStore.getState().open();
  await chooseCurrency();
  await refreshAppData();
  setStoreGatewayForTests(expoStoreGateway);
});

afterEach(async () => {
  await resetApp();
});

describe('purchase', () => {
  it('a verified purchase is stored before StoreKit finishes it, and grants Pro', async () => {
    const result = await purchasePro(deps());
    expect(result.outcome).toBe('purchased');
    expect(await stored()).toMatchObject({ status: 'verified', transactionId: '2000000001', lastErrorCode: null, revision: 1 });
    const [event] = await events();
    expect(event).toMatchObject({ transactionId: '2000000001', productId: PRO_PRODUCT_ID, revokedAtUtc: null });
    expect(event?.finishedAtUtc).not.toBeNull();
    expect(fakeStore.transactions[0]?.finished).toBe(true);
    // The current-entitlement query (native verification) ran before the finish.
    expect(fakeStore.calls.indexOf('active')).toBeLessThan(fakeStore.calls.indexOf('finish'));
  });

  it.each([
    ['deferred-payment', 'pending'],
    ['user-cancelled', 'cancelled'],
    ['transaction-validation-failed', 'unverified'],
    ['network-error', 'offline'],
  ] as const)('a %s purchase result grants nothing (%s)', async (code, outcome) => {
    fakeStore.purchaseResult = code;
    const result = await purchasePro(deps());
    expect(result.outcome).toBe(outcome);
    expect(await stored()).toBeNull();
    expect(await events()).toEqual([]);
    expect(fakeStore.calls).not.toContain('finish');
  });

  it('a delivered transaction is not proof on its own: an unverified entitlement query grants nothing and leaves it unfinished', async () => {
    const delivered = addStoreTransaction();
    addStoreTransaction({ verified: false, productId: 'something.else' });
    const { record, finished } = await processTransaction(deps(), {
      transactionId: delivered.id,
      productId: PRO_PRODUCT_ID,
      purchasedAtMs: delivered.transactionDate,
      revokedAtMs: null,
    });
    expect(record).toMatchObject({ status: 'unknown', lastErrorCode: 'unverified' });
    expect(finished).toBe(false);
    expect(delivered.finished).toBe(false);
  });

  it('Ask to Buy: pending first, Pro only when StoreKit delivers the approved verified transaction', async () => {
    fakeStore.purchaseResult = 'deferred-payment';
    expect((await purchaseProFromApp())?.outcome).toBe('pending');
    expect(currentCapabilities().level).toBe('free');
    // The approval arrives later through Transaction.updates.
    const approved = addStoreTransaction();
    let processing: Promise<unknown> = Promise.resolve();
    const subscription = expoStoreGateway.subscribe({
      onTransaction: (transaction) => {
        processing = processTransaction(deps(), transaction);
      },
      onError: () => undefined,
    });
    emitStoreUpdate(approved);
    subscription();
    await processing;
    await reconcileBilling();
    expect((await stored())?.status).toBe('verified');
    expect(approved.finished).toBe(true);
    expect(currentCapabilities().level).toBe('pro');
  });
});

describe('persistence and replay', () => {
  it('rights survive a restart and are known before StoreKit answers (offline startup)', async () => {
    await purchaseProFromApp();
    expect(currentCapabilities().level).toBe('pro');
    fakeStore.failures = { init: 'network-error', active: 'network-error', all: 'network-error', pending: 'network-error' };
    await restartApp();
    // The snapshot read from SQLite alone already grants Pro.
    expect(currentCapabilities()).toEqual(capabilitiesFor('pro'));
    await reconcileBilling();
    expect(await stored()).toMatchObject({ status: 'verified', lastErrorCode: 'network' });
    expect(currentCapabilities().level).toBe('pro');
  });

  it('duplicate deliveries record the transaction once and finish it once more harmlessly', async () => {
    const transaction = addStoreTransaction();
    const value = { transactionId: transaction.id, productId: PRO_PRODUCT_ID, purchasedAtMs: transaction.transactionDate, revokedAtMs: null };
    const first = await processTransaction(deps(), value);
    const second = await processTransaction(deps(), value);
    const third = await processTransaction(deps(), value);
    expect([first.finished, second.finished, third.finished]).toEqual([true, true, true]);
    const rows = await events();
    expect(rows).toHaveLength(1);
    expect((await stored())?.status).toBe('verified');
  });

  it('an interrupted finish is completed from the stored record at the next launch', async () => {
    fakeStore.failures = { finish: 'network-error' };
    const result = await purchasePro(deps());
    // Rights were stored before the finish, which failed: the transaction stays unfinished.
    expect(result.outcome).toBe('purchased');
    expect(fakeStore.transactions[0]?.finished).toBe(false);
    expect((await events())[0]?.finishedAtUtc).toBeNull();

    fakeStore.failures = {};
    await restartApp();
    await syncStoredEntitlement(deps());
    expect(fakeStore.transactions[0]?.finished).toBe(true);
    expect((await events())[0]?.finishedAtUtc).not.toBeNull();
    expect(await events()).toHaveLength(1);
  });

  it('a transaction delivered while StoreKit cannot confirm it stays unfinished and is settled later', async () => {
    const transaction = addStoreTransaction();
    fakeStore.failures = { active: 'network-error' };
    const value = { transactionId: transaction.id, productId: PRO_PRODUCT_ID, purchasedAtMs: transaction.transactionDate, revokedAtMs: null };
    expect((await processTransaction(deps(), value)).finished).toBe(false);
    expect(transaction.finished).toBe(false);
    expect((await stored())?.status).toBe('unknown');
    fakeStore.failures = {};
    await syncStoredEntitlement(deps());
    expect(transaction.finished).toBe(true);
    expect((await stored())?.status).toBe('verified');
  });
});

describe('refund, revocation and loss', () => {
  it('a verified refund changes only the stored right; every goal, entry, souvenir and setting stays as it was', async () => {
    await purchaseProFromApp();
    await addFundedGoals();
    const before = await savingsData();
    expect(before.goals).toHaveLength(2);
    expect(before.souvenirs).toHaveLength(1);

    refundStoreTransaction(fakeStore.transactions[0]!.id);
    await reconcileBilling();

    expect(await stored()).toMatchObject({ status: 'revoked', transactionId: '2000000001' });
    expect((await events())[0]?.revokedAtUtc).not.toBeNull();
    expect(currentCapabilities().level).toBe('free');
    expect(await savingsData()).toEqual(before);
  });

  it('offline is not revocation: verified rights are kept through every failing check', async () => {
    await purchaseProFromApp();
    for (const failure of ['network-error', 'service-error', 'init-connection'] as const) {
      fakeStore.failures = { init: failure };
      await reconcileBilling();
      expect((await stored())?.status).toBe('verified');
    }
    expect(currentCapabilities().level).toBe('pro');
  });

  it('nothing found without a revocation keeps verified rights until Restore confirms the loss', async () => {
    await purchaseProFromApp();
    const before = await savingsData();
    // For example another Apple Account: StoreKit shows no transaction at all.
    fakeStore.transactions = [];
    await reconcileBilling();
    expect(await stored()).toMatchObject({ status: 'verified', lastErrorCode: UNCONFIRMED_LOSS });
    const restore = await restorePurchasesFromApp();
    expect(restore?.outcome).toBe('nothing_to_restore');
    expect(await stored()).toMatchObject({ status: 'not_owned', transactionId: null });
    expect(currentCapabilities().level).toBe('free');
    expect(await savingsData()).toEqual(before);
  });

  it('Pro returns after a revocation when StoreKit verifies a new purchase', async () => {
    await purchaseProFromApp();
    refundStoreTransaction(fakeStore.transactions[0]!.id);
    await reconcileBilling();
    expect((await stored())?.status).toBe('revoked');
    expect((await purchaseProFromApp())?.outcome).toBe('purchased');
    expect(await stored()).toMatchObject({ status: 'verified', transactionId: '2000000002' });
  });
});

describe('restore', () => {
  it('restores the Pro right on a new install and restores no savings data', async () => {
    // A purchase made before the app was deleted: finished long ago, only in the account history.
    addStoreTransaction({ finished: true });
    // The reinstall starts from an empty database: onboarding again, no goals.
    expect((await savingsData()).goals).toEqual([]);
    const result = await restorePurchases(deps());
    expect(result.outcome).toBe('restored');
    expect(result.record).toMatchObject({ status: 'verified', transactionId: '2000000001' });
    expect(fakeStore.calls).toContain('sync');
    const after = await savingsData();
    expect(after.goals).toEqual([]);
    expect(after.entries).toEqual([]);
    expect(after.souvenirs).toEqual([]);
  });

  it('a failed sync never confirms a loss and still reads the local cache', async () => {
    await purchaseProFromApp();
    fakeStore.failures = { sync: 'network-error' };
    const result = await restorePurchases(deps());
    expect(result.outcome).toBe('restored');
    fakeStore.transactions = [];
    const offline = await restorePurchases(deps());
    expect(offline.outcome).toBe('restored');
    expect((await stored())?.status).toBe('verified');
  });

  it('reports nothing to restore for an account without the purchase', async () => {
    const result = await restorePurchases(deps());
    expect(result.outcome).toBe('nothing_to_restore');
    expect(result.record.status).toBe('not_owned');
  });

  it('reports a cancelled sign-in as cancelled without changing anything', async () => {
    fakeStore.failures = { sync: 'user-cancelled' };
    const result = await restorePurchases(deps());
    expect(result.outcome).toBe('cancelled');
    expect(result.record.status).toBe('not_owned');
  });
});

describe('app wiring', () => {
  it('a background check stores the right once and refreshes capabilities', async () => {
    addStoreTransaction();
    expect(currentCapabilities().level).toBe('free');
    await reconcileBilling();
    expect(useAppDataStore.getState().state).toMatchObject({ status: 'ready', data: { entitlement: { status: 'verified' } } });
    expect(currentCapabilities().level).toBe('pro');
    expect(fakeStore.transactions[0]?.finished).toBe(true);
  });

  it('serializes overlapping operations so an older check never overwrites a newer one', async () => {
    addStoreTransaction();
    const runs = await Promise.all([reconcileBilling(), restorePurchasesFromApp(), reconcileBilling(), purchaseProFromApp()]);
    expect(runs.every((run) => run !== null)).toBe(true);
    const record = await stored();
    expect(record?.status).toBe('verified');
    expect(record?.revision).toBeGreaterThanOrEqual(4);
  });

  it('a store without the native module leaves the stored right untouched', async () => {
    await purchaseProFromApp();
    const missing: PurchaseGateway = {
      ...expoStoreGateway,
      checkEntitlement: async () => ({ kind: 'failed', code: 'unavailable' }),
      unfinished: async () => ({ ok: false, error: 'unavailable' }),
    };
    setStoreGatewayForTests(missing);
    await reconcileBilling();
    expect(await stored()).toMatchObject({ status: 'verified', lastErrorCode: 'unavailable' });
    await reconcileEntitlement(deps(missing), 'restore');
    expect((await stored())?.status).toBe('verified');
  });
});
