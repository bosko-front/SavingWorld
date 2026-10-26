import { useEffect } from 'react';

import type { EntitlementRecord } from '@/data/repositories/entitlement-repository';
import {
  processTransaction,
  purchasePro,
  restorePurchases,
  syncStoredEntitlement,
  type BillingDeps,
  type PurchaseResult,
  type RestoreResult,
} from '@/features/billing/application/entitlement-reconciler';
import { PRO_PRODUCT_ID, type StoreErrorCode, type StoreProduct, type StoreTransaction } from '@/features/billing/domain/entitlement';
import { expoStoreGateway, type PurchaseGateway } from '@/features/billing/native/store-gateway';
import type { Result } from '@/core/result';

import { appClock, refreshAppData, useAppDataStore } from './app-data';
import { useDatabaseStore } from './database-readiness';

// App-side driver of the Pro entitlement (Phase 15). The stored snapshot is part of the committed
// app-data snapshot, so the app starts with the last confirmed rights without waiting for StoreKit
// (offline startup). StoreKit is then asked at launch, on every return to the foreground and for
// every verified transaction it delivers; Buy and Restore go through the same queue. One operation
// runs at a time, so an older check can never overwrite a newer one, and a transaction delivered
// while the purchase sheet is open is processed after the purchase itself. A change of the stored
// rights refreshes the app-data snapshot; a failure is retried by the next trigger and never blocks
// a screen or touches savings.

let gateway: PurchaseGateway = expoStoreGateway;

// Jest only: swaps the native store for a test double.
export function setStoreGatewayForTests(testGateway: PurchaseGateway): void {
  gateway = testGateway;
}

let queue: Promise<unknown> = Promise.resolve();

function deps(): BillingDeps | null {
  const database = useDatabaseStore.getState().state;
  return database.status === 'ready' ? { db: database.db, clock: appClock(), gateway } : null;
}

function storedStatus(): string | null {
  const { state } = useAppDataStore.getState();
  return state.status === 'ready' ? state.data.entitlement.status : null;
}

// Runs one billing operation after the previous one, then refreshes the committed snapshot when the
// stored status differs from what screens show. Returns null when the database is not open or the
// operation failed (nothing changed; the next trigger tries again).
function enqueue<T>(task: (billingDeps: BillingDeps) => Promise<T>, statusOf: (result: T) => string | null): Promise<T | null> {
  const run = queue.then(async () => {
    const billingDeps = deps();
    if (!billingDeps) {
      return null;
    }
    const result = await task(billingDeps);
    const after = statusOf(result);
    if (after !== null && after !== storedStatus()) {
      await refreshAppData();
    }
    return result;
  });
  queue = run.catch((error: unknown) => {
    if (__DEV__) {
      // Development diagnostics only; messages come from SQLite, never purchase payloads.
      console.warn(`[billing] ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  return run.catch(() => null);
}

// Launch, foreground and the Store lab: finish interrupted transactions and check the entitlement.
export function reconcileBilling(): Promise<EntitlementRecord | null> {
  return enqueue((billingDeps) => syncStoredEntitlement(billingDeps), (record) => record.status);
}

// Buy Pro (Phase 16 paywall; development Store lab until then).
export function purchaseProFromApp(): Promise<PurchaseResult | null> {
  return enqueue((billingDeps) => purchasePro(billingDeps), (result) => result.record?.status ?? null);
}

// Restore Purchases: restores the Pro right only, never savings data.
export function restorePurchasesFromApp(): Promise<RestoreResult | null> {
  return enqueue((billingDeps) => restorePurchases(billingDeps), (result) => result.record.status);
}

function processDelivered(transaction: StoreTransaction): void {
  void enqueue((billingDeps) => processTransaction(billingDeps, transaction), (result) => result.record.status);
}

// Localized product metadata straight from the storefront (never a hard-coded price, Q07).
export function loadProProduct(): Promise<Result<StoreProduct | null, StoreErrorCode>> {
  return gateway.loadProduct(PRO_PRODUCT_ID);
}

// Mounted once by the root navigator: listens for StoreKit transaction updates and checks the
// entitlement at launch. Foreground checks run from useForegroundReconciliation.
export function useBillingReconciliation(): void {
  useEffect(() => {
    const unsubscribe = gateway.subscribe({
      onTransaction: processDelivered,
      onError: (code) => {
        if (__DEV__) {
          console.warn(`[billing] store update failed (${code})`);
        }
      },
    });
    void reconcileBilling();
    return unsubscribe;
  }, []);
}
