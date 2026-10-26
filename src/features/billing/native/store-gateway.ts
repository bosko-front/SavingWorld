import { err, ok, type Result } from '@/core/result';

import {
  newestTransaction,
  type EntitlementCheck,
  type StoreErrorCode,
  type StoreProduct,
  type StoreTransaction,
} from '../domain/entitlement';

// The PurchaseGateway (docs/ARCHITECTURE.md "Purchases and capabilities", D10, D115): the only module
// that talks to expo-iap (ESLint enforces it). It hides the package API behind plain values and
// validates everything that comes back from native code.
//
// What the pinned expo-iap 6.3.0 / OpenIAP Apple 4.0.5 does natively (reviewed source, evidence
// PHASE_15): every transaction it returns or emits passed StoreKit's `checkVerified` (an `.unverified`
// result becomes `transaction-validation-failed` and is never passed on); a pending purchase
// (Ask to Buy) rejects with `deferred-payment`; a cancelled one with `user-cancelled`; transactions
// are not finished unless the app calls finishTransaction (no automatic finishing is requested
// here); revoked transactions from Transaction.updates are skipped, so a refund is detected by
// querying Transaction.currentEntitlements (which drops refunded/revoked purchases) and
// Transaction.all (which keeps them with their revocation date). Both queries read StoreKit's local
// signed cache and work offline; AppStore.sync (Restore) needs the network and may ask the person
// to sign in.

export type StoreListener = {
  // A verified transaction delivered by Transaction.updates (purchases from another device, Ask to
  // Buy approvals, replays of unfinished transactions at launch).
  onTransaction: (transaction: StoreTransaction) => void;
  onError: (code: StoreErrorCode) => void;
};

export interface PurchaseGateway {
  // Localized metadata from the storefront; null when the store does not offer the product.
  loadProduct(productId: string): Promise<Result<StoreProduct | null, StoreErrorCode>>;
  // Current entitlement for the product, plus its newest historical transaction when not entitled.
  checkEntitlement(productId: string): Promise<EntitlementCheck>;
  // Shows the App Store purchase sheet. Resolves with the verified transaction or a failure code.
  purchase(productId: string): Promise<Result<StoreTransaction, StoreErrorCode>>;
  // AppStore.sync: Restore Purchases. Needs the network; may ask the person to sign in.
  sync(): Promise<Result<null, StoreErrorCode>>;
  // Verified transactions StoreKit still considers unfinished (to finish after an interruption).
  unfinished(): Promise<Result<StoreTransaction[], StoreErrorCode>>;
  finish(transactionId: string): Promise<Result<null, StoreErrorCode>>;
  subscribe(listener: StoreListener): () => void;
}

type ExpoIap = typeof import('expo-iap');

let iap: ExpoIap | null | undefined;

// Loaded on first use, not at import: a development build made before expo-iap was installed (or
// any build without the native module) must still open the app; the store then answers
// 'unavailable' and the stored entitlement stays as it is.
function loadIap(): ExpoIap | null {
  if (iap === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      iap = require('expo-iap') as ExpoIap;
    } catch {
      iap = null;
    }
  }
  return iap;
}

let connection: Promise<boolean> | null = null;

async function connected(module: ExpoIap): Promise<boolean> {
  connection ??= module.initConnection().catch(() => false);
  const ready = await connection;
  if (!ready) {
    // Try again on the next call (for example after the network returns).
    connection = null;
  }
  return ready;
}

// Short codes only; OS messages may contain account details and are never kept.
export function storeErrorCode(error: unknown): StoreErrorCode {
  const code = typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined;
  switch (code) {
    case 'user-cancelled':
      return 'cancelled';
    case 'deferred-payment':
    case 'pending':
      return 'pending';
    case 'transaction-validation-failed':
    case 'purchase-verification-failed':
      return 'unverified';
    case 'network-error':
    case 'remote-error':
    case 'service-error':
    case 'service-timeout':
    case 'service-disconnected':
    case 'connection-closed':
    case 'init-connection':
    case 'not-prepared':
    case 'sync-error':
    case 'interrupted':
      return 'network';
    case 'sku-not-found':
    case 'item-unavailable':
    case 'query-product':
    case 'empty-sku-list':
    case 'iap-not-available':
    case 'billing-unavailable':
    case 'feature-not-supported':
    case 'developer-error':
      return 'unavailable';
    case 'user-error':
    case 'activity-unavailable':
      return 'not_allowed';
    case 'already-owned':
    case 'duplicate-purchase':
      return 'already_owned';
    default:
      return 'unknown';
  }
}

const TRANSACTION_ID = /^[0-9]{1,64}$/;

// Validates one purchase object from native code. Only a purchased (not pending) verified
// transaction with a StoreKit ID becomes a StoreTransaction.
export function toStoreTransaction(value: unknown): StoreTransaction | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const purchase = value as Record<string, unknown>;
  const transactionId = typeof purchase.transactionId === 'string' ? purchase.transactionId : purchase.id;
  const { productId, transactionDate, revocationDateIOS, purchaseState } = purchase;
  if (
    typeof transactionId !== 'string' ||
    !TRANSACTION_ID.test(transactionId) ||
    typeof productId !== 'string' ||
    productId.length === 0 ||
    productId.length > 200 ||
    typeof transactionDate !== 'number' ||
    !Number.isFinite(transactionDate) ||
    purchaseState !== 'purchased'
  ) {
    return null;
  }
  let revokedAtMs: number | null = null;
  if (typeof revocationDateIOS === 'number' && Number.isFinite(revocationDateIOS)) {
    revokedAtMs = revocationDateIOS;
  } else if (revocationDateIOS !== null && revocationDateIOS !== undefined) {
    return null;
  }
  return { transactionId, productId, purchasedAtMs: transactionDate, revokedAtMs };
}

function toStoreProduct(value: unknown, productId: string): StoreProduct | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const product = value as Record<string, unknown>;
  const displayName = typeof product.displayNameIOS === 'string' ? product.displayNameIOS : product.title;
  const { id, description, displayPrice } = product;
  if (id !== productId || typeof displayName !== 'string' || typeof displayPrice !== 'string' || displayPrice.length === 0) {
    return null;
  }
  return { productId, displayName, description: typeof description === 'string' ? description : '', displayPrice };
}

function transactionsFrom(values: unknown): StoreTransaction[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.map(toStoreTransaction).filter((transaction): transaction is StoreTransaction => transaction !== null);
}

// Native purchase objects seen in this process, by transaction ID: finishTransaction takes the
// object StoreKit delivered.
const delivered = new Map<string, unknown>();

function remember(values: unknown): void {
  if (!Array.isArray(values)) {
    values = [values];
  }
  for (const value of values as unknown[]) {
    const transaction = toStoreTransaction(value);
    if (transaction) {
      delivered.set(transaction.transactionId, value);
    }
  }
}

export const expoStoreGateway: PurchaseGateway = {
  async loadProduct(productId) {
    const module = loadIap();
    if (!module || !(await connected(module))) {
      return err(module ? 'network' : 'unavailable');
    }
    try {
      const products = await module.fetchProducts({ skus: [productId], type: 'in-app' });
      const found = (Array.isArray(products) ? products : []).map((product) => toStoreProduct(product, productId));
      return ok(found.find((product) => product !== null) ?? null);
    } catch (error) {
      return err(storeErrorCode(error));
    }
  },

  async checkEntitlement(productId) {
    const module = loadIap();
    if (!module || !(await connected(module))) {
      return { kind: 'failed', code: module ? 'network' : 'unavailable' };
    }
    try {
      // Transaction.currentEntitlements: one unverified entry fails the whole query natively, which
      // is reported as a failure (unknown), never as "not owned".
      const active = await module.getAvailablePurchases({ onlyIncludeActiveItemsIOS: true, alsoPublishToEventListenerIOS: false });
      remember(active);
      const entitled = newestTransaction(
        transactionsFrom(active).filter((transaction) => transaction.revokedAtMs === null),
        productId,
      );
      if (entitled) {
        return { kind: 'entitled', transaction: entitled };
      }
      // Transaction.all keeps refunded/revoked purchases with their revocation date.
      const history = await module.getAvailablePurchases({ onlyIncludeActiveItemsIOS: false, alsoPublishToEventListenerIOS: false });
      return { kind: 'not_entitled', latest: newestTransaction(transactionsFrom(history), productId) };
    } catch (error) {
      return { kind: 'failed', code: storeErrorCode(error) };
    }
  },

  async purchase(productId) {
    const module = loadIap();
    if (!module || !(await connected(module))) {
      return err(module ? 'network' : 'unavailable');
    }
    try {
      const result = await module.requestPurchase({ request: { apple: { sku: productId } }, type: 'in-app' });
      remember(result);
      const transaction = transactionsFrom(Array.isArray(result) ? result : [result]).find((item) => item.productId === productId);
      return transaction ? ok(transaction) : err('unknown');
    } catch (error) {
      return err(storeErrorCode(error));
    }
  },

  async sync() {
    const module = loadIap();
    if (!module || !(await connected(module))) {
      return err(module ? 'network' : 'unavailable');
    }
    try {
      await module.syncIOS();
      return ok(null);
    } catch (error) {
      return err(storeErrorCode(error));
    }
  },

  async unfinished() {
    const module = loadIap();
    if (!module || !(await connected(module))) {
      return err(module ? 'network' : 'unavailable');
    }
    try {
      const pending = await module.getPendingTransactionsIOS();
      remember(pending);
      return ok(transactionsFrom(pending));
    } catch (error) {
      return err(storeErrorCode(error));
    }
  },

  async finish(transactionId) {
    const module = loadIap();
    if (!module || !(await connected(module))) {
      return err(module ? 'network' : 'unavailable');
    }
    try {
      let purchase = delivered.get(transactionId);
      if (purchase === undefined) {
        remember(await module.getPendingTransactionsIOS());
        purchase = delivered.get(transactionId);
      }
      if (purchase === undefined) {
        // Not unfinished any more (finished earlier, perhaps before an interruption): nothing to do.
        return ok(null);
      }
      await module.finishTransaction({ purchase: purchase as Parameters<ExpoIap['finishTransaction']>[0]['purchase'], isConsumable: false });
      delivered.delete(transactionId);
      return ok(null);
    } catch (error) {
      return err(storeErrorCode(error));
    }
  },

  subscribe(listener) {
    const module = loadIap();
    if (!module) {
      return () => undefined;
    }
    // Starting the connection starts StoreKit's Transaction.updates listener natively.
    void connected(module);
    const updates = module.purchaseUpdatedListener((purchase) => {
      const transaction = toStoreTransaction(purchase);
      if (transaction) {
        delivered.set(transaction.transactionId, purchase);
        listener.onTransaction(transaction);
      }
    });
    const errors = module.purchaseErrorListener((error) => listener.onError(storeErrorCode(error)));
    return () => {
      updates.remove();
      errors.remove();
    };
  },
};
