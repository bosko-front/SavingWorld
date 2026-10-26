// Jest stand-in for expo-iap (Phase 15). It imitates what the reviewed native layer does with
// StoreKit, as plain data the tests control: only verified transactions are ever returned (an
// "unverified" entry makes the query reject with transaction-validation-failed), currentEntitlements
// leaves out refunded/revoked purchases, Transaction.all keeps them, pending and cancelled purchases
// reject, and nothing is finished unless finishTransaction is called. It proves our adapter and
// reconciler logic only, never StoreKit itself (docs/TEST_PLAN.md).

type Listener<T> = (value: T) => void;

export type FakeTransaction = {
  id: string;
  productId: string;
  transactionDate: number;
  revocationDateIOS: number | null;
  finished: boolean;
  // false imitates a StoreKit `.unverified` result.
  verified: boolean;
};

type FakeError = { code: string; message: string };

type Operation = 'init' | 'fetch' | 'active' | 'all' | 'purchase' | 'sync' | 'pending' | 'finish';

type FakeState = {
  products: { id: string; displayNameIOS: string; title: string; description: string; displayPrice: string }[];
  transactions: FakeTransaction[];
  // Outcome of the next requestPurchase: a new verified transaction, or an error code.
  purchaseResult: 'success' | 'deferred-payment' | 'user-cancelled' | 'transaction-validation-failed' | 'network-error';
  failures: Partial<Record<Operation, string>>;
  calls: string[];
  nextId: number;
  nowMs: number;
};

const updateListeners = new Set<Listener<unknown>>();
const errorListeners = new Set<Listener<FakeError>>();

function initialState(): FakeState {
  return {
    products: [
      {
        id: 'com.bosko123.savingworlds.pro.lifetime',
        displayNameIOS: 'Saving Worlds Pro',
        title: 'Saving Worlds Pro',
        description: 'Unlimited goals, Garden and Pro statistics',
        displayPrice: '€4.99',
      },
    ],
    transactions: [],
    purchaseResult: 'success',
    failures: {},
    calls: [],
    nextId: 2000000001,
    nowMs: Date.UTC(2026, 9, 26, 12, 0, 0),
  };
}

export let fakeStore: FakeState = initialState();

export function resetFakeStore(): void {
  fakeStore = initialState();
  updateListeners.clear();
  errorListeners.clear();
}

function fail(code: string): never {
  throw { code, message: `fake ${code}` };
}

function guard(operation: Operation): void {
  fakeStore.calls.push(operation);
  const code = fakeStore.failures[operation];
  if (code) {
    fail(code);
  }
}

function asPurchase(transaction: FakeTransaction) {
  return {
    id: transaction.id,
    transactionId: transaction.id,
    productId: transaction.productId,
    transactionDate: transaction.transactionDate,
    revocationDateIOS: transaction.revocationDateIOS,
    purchaseState: 'purchased',
    platform: 'ios',
    store: 'apple',
    quantity: 1,
    isAutoRenewing: false,
    purchaseToken: `jws-${transaction.id}`,
  };
}

function verifiedOnly(transactions: FakeTransaction[]) {
  if (transactions.some((transaction) => !transaction.verified)) {
    fail('transaction-validation-failed');
  }
  return transactions.map(asPurchase);
}

// Test controls ------------------------------------------------------------------------------

// A verified purchase made outside the app's purchase call (another device, Ask to Buy approval).
export function addStoreTransaction(overrides: Partial<FakeTransaction> = {}): FakeTransaction {
  const transaction: FakeTransaction = {
    id: String(fakeStore.nextId++),
    productId: 'com.bosko123.savingworlds.pro.lifetime',
    transactionDate: (fakeStore.nowMs += 1000),
    revocationDateIOS: null,
    finished: false,
    verified: true,
    ...overrides,
  };
  fakeStore.transactions.push(transaction);
  return transaction;
}

export function refundStoreTransaction(id: string): void {
  const transaction = fakeStore.transactions.find((item) => item.id === id);
  if (!transaction) {
    throw new Error(`no fake transaction ${id}`);
  }
  transaction.revocationDateIOS = (fakeStore.nowMs += 1000);
}

// Delivers a transaction through Transaction.updates. Like the native listener, a revoked one is
// skipped.
export function emitStoreUpdate(transaction: FakeTransaction): void {
  if (transaction.revocationDateIOS !== null || !transaction.verified) {
    return;
  }
  for (const listener of updateListeners) {
    listener(asPurchase(transaction));
  }
}

// expo-iap API --------------------------------------------------------------------------------

export async function initConnection(): Promise<boolean> {
  guard('init');
  return true;
}

export async function fetchProducts({ skus }: { skus: string[]; type?: string }) {
  guard('fetch');
  return fakeStore.products.filter((product) => skus.includes(product.id)).map((product) => ({ ...product, platform: 'ios', type: 'in-app' }));
}

export async function getAvailablePurchases(options?: { onlyIncludeActiveItemsIOS?: boolean }) {
  const onlyActive = options?.onlyIncludeActiveItemsIOS ?? true;
  guard(onlyActive ? 'active' : 'all');
  const transactions = onlyActive
    ? fakeStore.transactions.filter((transaction) => transaction.revocationDateIOS === null)
    : fakeStore.transactions;
  return verifiedOnly(transactions);
}

export async function requestPurchase({ request }: { request: { apple?: { sku: string } }; type: string }) {
  guard('purchase');
  const sku = request.apple?.sku ?? '';
  if (fakeStore.purchaseResult !== 'success') {
    fail(fakeStore.purchaseResult);
  }
  if (!fakeStore.products.some((product) => product.id === sku)) {
    fail('sku-not-found');
  }
  const transaction = addStoreTransaction({ productId: sku });
  const purchase = asPurchase(transaction);
  // The native module also emits a successful purchase on the update listener.
  for (const listener of updateListeners) {
    listener(purchase);
  }
  return purchase;
}

export async function syncIOS(): Promise<boolean> {
  guard('sync');
  return true;
}

export async function getPendingTransactionsIOS() {
  guard('pending');
  return verifiedOnly(fakeStore.transactions.filter((transaction) => !transaction.finished));
}

export async function finishTransaction({ purchase }: { purchase: { id: string }; isConsumable?: boolean }): Promise<void> {
  guard('finish');
  const transaction = fakeStore.transactions.find((item) => item.id === purchase.id);
  if (transaction) {
    transaction.finished = true;
  }
}

export function purchaseUpdatedListener(listener: Listener<unknown>) {
  updateListeners.add(listener);
  return { remove: () => updateListeners.delete(listener) };
}

export function purchaseErrorListener(listener: Listener<FakeError>) {
  errorListeners.add(listener);
  return { remove: () => errorListeners.delete(listener) };
}
