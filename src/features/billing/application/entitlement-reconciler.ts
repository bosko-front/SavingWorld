import { utcTimestamp, utcTimestampAt, type Clock } from '@/core/calendar';
import type { AppDatabase } from '@/data/db/database';
import type { SqlExecutor } from '@/data/db/sql';
import {
  markPurchaseEventFinished,
  markPurchaseEventRevoked,
  readEntitlement,
  recordPurchaseEvent,
  writeEntitlement,
  type EntitlementRecord,
} from '@/data/repositories/entitlement-repository';

import {
  decideEntitlement,
  PRO_PRODUCT_ID,
  purchaseOutcomeFor,
  restoreOutcomeFor,
  type CheckSource,
  type EntitlementCheck,
  type PurchaseOutcome,
  type RestoreOutcome,
  type StoreTransaction,
} from '../domain/entitlement';
import type { PurchaseGateway } from '../native/store-gateway';

// Keeps the stored Pro entitlement in line with StoreKit (Phase 15, D115). Runs at launch, on every
// return to the foreground, for every verified transaction StoreKit delivers, and for Buy/Restore.
//
// Order for a delivered transaction (purchase, Transaction.updates, an unfinished replay):
//   1. ask StoreKit for the current entitlement (verified natively; the delivery alone is not proof);
//   2. in one exclusive SQLite transaction, record the transaction once by its StoreKit ID and store
//      the decided entitlement snapshot;
//   3. only after that commit, finish the transaction with StoreKit, then record the finish time.
// A process killed after 2 leaves the transaction unfinished: StoreKit delivers it again at the next
// launch, step 2 finds its row (nothing is counted twice) and step 3 finishes it. A failed or
// offline check never finishes anything and never replaces the confirmed state.
//
// Nothing here reads or writes goals, entries, souvenirs or theme choices: a refund or revocation
// changes the stored right only (D74, D75). Phase 16 decides what a Free person may still edit.

export type BillingDeps = { db: AppDatabase; clock: Clock; gateway: PurchaseGateway };

const PRODUCT_ID = PRO_PRODUCT_ID;

export async function readStoredEntitlement(db: AppDatabase): Promise<EntitlementRecord | null> {
  return db.read((snapshot) => readEntitlement(snapshot, PRODUCT_ID));
}

// Step 2 above, also used on its own for checks without a delivered transaction.
async function storeDecision(
  tx: SqlExecutor,
  clock: Clock,
  check: EntitlementCheck,
  source: CheckSource,
  delivered: StoreTransaction | null,
): Promise<EntitlementRecord> {
  const now = utcTimestamp(clock);
  if (delivered) {
    await recordPurchaseEvent(tx, {
      transactionId: delivered.transactionId,
      productId: delivered.productId,
      processedAtUtc: now,
      revokedAtUtc: delivered.revokedAtMs === null ? null : utcTimestampAt(delivered.revokedAtMs),
    });
  }
  const current = await readEntitlement(tx, PRODUCT_ID);
  const decision = decideEntitlement(current, check, source);
  if (decision.status === 'revoked' && check.kind === 'not_entitled' && check.latest?.revokedAtMs != null) {
    await markPurchaseEventRevoked(tx, check.latest.transactionId, utcTimestampAt(check.latest.revokedAtMs));
  }
  const next: EntitlementRecord = {
    productId: PRODUCT_ID,
    status: decision.status,
    transactionId: decision.transactionId,
    verifiedAtUtc: decision.confirmedNow ? now : (current?.verifiedAtUtc ?? null),
    lastAttemptAtUtc: now,
    lastErrorCode: decision.errorCode,
    revision: (current?.revision ?? 0) + 1,
  };
  if (!(await writeEntitlement(tx, next))) {
    throw new Error('Entitlement snapshot changed during the write');
  }
  return next;
}

// One StoreKit check of the current entitlement, stored. Returns the stored snapshot.
export async function reconcileEntitlement(deps: BillingDeps, source: CheckSource): Promise<EntitlementRecord> {
  const check = await deps.gateway.checkEntitlement(PRODUCT_ID);
  return deps.db.write((tx) => storeDecision(tx, deps.clock, check, source, null));
}

export type ProcessedTransaction = { record: EntitlementRecord; finished: boolean };

// Steps 1-3 for one verified transaction StoreKit delivered.
export async function processTransaction(deps: BillingDeps, transaction: StoreTransaction): Promise<ProcessedTransaction> {
  if (transaction.productId !== PRODUCT_ID) {
    // No other product exists (D113); a stray delivery is left to StoreKit untouched.
    const record = await readStoredEntitlement(deps.db);
    if (!record) {
      return { record: await reconcileEntitlement(deps, 'automatic'), finished: false };
    }
    return { record, finished: false };
  }
  const check = await deps.gateway.checkEntitlement(PRODUCT_ID);
  const record = await deps.db.write((tx) => storeDecision(tx, deps.clock, check, 'purchase', transaction));
  // Finish only once the stored state reflects this transaction: a confirmed right, or a confirmed
  // refund/revocation. An offline or inconclusive check leaves it for StoreKit to deliver again.
  const settled = check.kind !== 'failed' && (record.status === 'verified' || record.status === 'revoked' || transaction.revokedAtMs !== null);
  if (!settled) {
    return { record, finished: false };
  }
  const finish = await deps.gateway.finish(transaction.transactionId);
  if (!finish.ok) {
    return { record, finished: false };
  }
  await deps.db.write((tx) => markPurchaseEventFinished(tx, transaction.transactionId, utcTimestamp(deps.clock)));
  return { record, finished: true };
}

// Launch and foreground: finish what an interruption left unfinished, then check the entitlement.
// Uses StoreKit's local signed cache only; never shows a sign-in prompt.
export async function syncStoredEntitlement(deps: BillingDeps): Promise<EntitlementRecord> {
  const unfinished = await deps.gateway.unfinished();
  if (unfinished.ok) {
    for (const transaction of unfinished.value) {
      if (transaction.productId === PRODUCT_ID) {
        await processTransaction(deps, transaction);
      }
    }
  }
  return reconcileEntitlement(deps, 'automatic');
}

export type PurchaseResult = { outcome: PurchaseOutcome; record: EntitlementRecord | null };

// Buy Pro. 'purchased' only after StoreKit's current entitlements confirmed the verified
// transaction and the snapshot was stored.
export async function purchasePro(deps: BillingDeps): Promise<PurchaseResult> {
  const result = await deps.gateway.purchase(PRODUCT_ID);
  if (!result.ok) {
    if (result.error === 'already_owned') {
      const record = await reconcileEntitlement(deps, 'purchase');
      return { outcome: record.status === 'verified' ? 'purchased' : 'not_confirmed', record };
    }
    return { outcome: purchaseOutcomeFor(result.error), record: await readStoredEntitlement(deps.db) };
  }
  const { record } = await processTransaction(deps, result.value);
  return { outcome: record.status === 'verified' ? 'purchased' : 'not_confirmed', record };
}

export type RestoreResult = { outcome: RestoreOutcome; record: EntitlementRecord };

// Restore Purchases: sync with the App Store account, finish anything unfinished, then check. It
// restores the Pro right only; savings data is never part of it (v1.2 section 3, R21, R23).
export async function restorePurchases(deps: BillingDeps): Promise<RestoreResult> {
  const sync = await deps.gateway.sync();
  if (!sync.ok) {
    // The local cache may still hold the purchase; a failed sync never confirms a loss.
    const record = await syncStoredEntitlement(deps);
    return { outcome: record.status === 'verified' ? 'restored' : restoreOutcomeFor(record.status, sync.error), record };
  }
  const unfinished = await deps.gateway.unfinished();
  if (unfinished.ok) {
    for (const transaction of unfinished.value) {
      if (transaction.productId === PRODUCT_ID) {
        await processTransaction(deps, transaction);
      }
    }
  }
  const record = await reconcileEntitlement(deps, 'restore');
  return { outcome: restoreOutcomeFor(record.status, null), record };
}
