import type { AccessLevel } from '@/core/access';

// Pure rules for the one lifetime Pro purchase (Phase 15, docs/ARCHITECTURE.md "Purchases and
// capabilities", DECISIONS D113, D115). No React, SQLite or native imports: the store adapter turns
// StoreKit answers into these plain values, the reconciler stores what these rules decide.
//
// Rights come only from StoreKit's own verification: the native layer passes on a transaction only
// when StoreKit reported it as `.verified`, and Pro is granted only after the current-entitlements
// query (also verified natively) confirms it. A purchase callback, a signed payload or a decoded JWS
// alone never grants anything. Pending (Ask to Buy), cancelled and unverified results grant nothing.

// The single Non-Consumable in App Store Connect (D113). Product IDs can never be reused.
export const PRO_PRODUCT_ID = 'com.bosko123.savingworlds.pro.lifetime';

// The last state StoreKit confirmed for a product. 'unknown' means nothing was ever confirmed.
export type EntitlementStatus = 'verified' | 'not_owned' | 'revoked' | 'unknown';

export const ENTITLEMENT_STATUSES: readonly EntitlementStatus[] = ['verified', 'not_owned', 'revoked', 'unknown'];

// A StoreKit transaction that StoreKit itself verified. Times are milliseconds since the epoch.
export type StoreTransaction = {
  transactionId: string;
  productId: string;
  purchasedAtMs: number;
  // Set when Apple refunded or revoked it (including Family Sharing removal).
  revokedAtMs: number | null;
};

// Short failure codes from the store adapter. Never an OS message, never a payload.
export type StoreErrorCode =
  | 'cancelled'
  | 'pending'
  | 'unverified'
  | 'network'
  | 'unavailable'
  | 'already_owned'
  | 'not_allowed'
  | 'unknown';

// What StoreKit says now about one product.
// - entitled: Transaction.currentEntitlements holds a verified transaction for it.
// - not_entitled: no current entitlement; `latest` is the newest verified transaction for the product
//   in the account's history (Transaction.all), which carries the revocation date of a refund.
// - failed: StoreKit could not be asked or refused to answer (offline, an unverified entry, ...).
export type EntitlementCheck =
  | { kind: 'entitled'; transaction: StoreTransaction }
  | { kind: 'not_entitled'; latest: StoreTransaction | null }
  | { kind: 'failed'; code: StoreErrorCode };

// Why the check ran. Only an explicit Restore, which completed a sync with the App Store account,
// may turn earlier verified rights into 'not_owned' when no revocation is visible (D115).
export type CheckSource = 'automatic' | 'purchase' | 'restore';

// The part of the stored snapshot the rules need (the full row is in the entitlement repository).
export type ConfirmedEntitlement = { status: EntitlementStatus; transactionId: string | null };

export type EntitlementDecision = {
  status: EntitlementStatus;
  transactionId: string | null;
  // StoreKit confirmed the right in this check (refreshes verified_at_utc).
  confirmedNow: boolean;
  errorCode: string | null;
};

// Recorded when a background check found neither a current entitlement nor a revocation while the
// stored rights were verified: possibly another Apple Account or a store cache that has not synced
// yet. Rights stay until a revocation or an explicit Restore says otherwise.
export const UNCONFIRMED_LOSS = 'entitlement_not_found';

// The one place that turns a StoreKit answer into the stored state.
export function decideEntitlement(previous: ConfirmedEntitlement | null, check: EntitlementCheck, source: CheckSource): EntitlementDecision {
  if (check.kind === 'failed') {
    // Unknown is not revocation: keep whatever was confirmed before.
    return {
      status: previous?.status ?? 'unknown',
      transactionId: previous?.transactionId ?? null,
      confirmedNow: false,
      errorCode: check.code,
    };
  }
  if (check.kind === 'entitled') {
    if (check.transaction.revokedAtMs !== null) {
      return { status: 'revoked', transactionId: check.transaction.transactionId, confirmedNow: false, errorCode: null };
    }
    return { status: 'verified', transactionId: check.transaction.transactionId, confirmedNow: true, errorCode: null };
  }
  if (check.latest !== null && check.latest.revokedAtMs !== null) {
    // A verified refund/revocation: the confirmed loss of D74/D75. Only the right changes.
    return { status: 'revoked', transactionId: check.latest.transactionId, confirmedNow: false, errorCode: null };
  }
  if (previous?.status === 'verified' && source !== 'restore') {
    return { status: 'verified', transactionId: previous.transactionId, confirmedNow: false, errorCode: UNCONFIRMED_LOSS };
  }
  return { status: 'not_owned', transactionId: null, confirmedNow: false, errorCode: null };
}

// Pro is exactly a verified, unrevoked lifetime purchase. Everything else is Free; capabilities map
// the level to unlimited goals, Garden, open-goal theme switching and the four statistics
// (`capabilitiesFor` in @/core/access). Fixed challenges and the reminder do not depend on it.
export function accessLevelFor(status: EntitlementStatus | null): AccessLevel {
  return status === 'verified' ? 'pro' : 'free';
}

// What a purchase attempt ended as, for the person and the tests.
export type PurchaseOutcome =
  // StoreKit verified it, current entitlements confirmed it and it was stored.
  | 'purchased'
  // Ask to Buy or another approval: no rights until StoreKit delivers a verified transaction.
  | 'pending'
  | 'cancelled'
  // StoreKit could not verify the transaction: no rights.
  | 'unverified'
  // The store delivered a transaction but current entitlements did not confirm it (yet).
  | 'not_confirmed'
  | 'offline'
  // The product is not available here (not loaded, not for sale, purchases not allowed).
  | 'unavailable'
  | 'failed';

export function purchaseOutcomeFor(code: StoreErrorCode): PurchaseOutcome {
  switch (code) {
    case 'cancelled':
      return 'cancelled';
    case 'pending':
      return 'pending';
    case 'unverified':
      return 'unverified';
    case 'network':
      return 'offline';
    case 'unavailable':
    case 'not_allowed':
      return 'unavailable';
    case 'already_owned':
      // Settled by a Restore-like check of current entitlements; on its own it grants nothing.
      return 'not_confirmed';
    case 'unknown':
      return 'failed';
  }
}

// What Restore Purchases ended as. Restore returns the Pro right only, never savings data.
export type RestoreOutcome = 'restored' | 'nothing_to_restore' | 'revoked' | 'offline' | 'cancelled' | 'failed';

export function restoreOutcomeFor(status: EntitlementStatus, syncError: StoreErrorCode | null): RestoreOutcome {
  if (syncError !== null) {
    return syncError === 'cancelled' ? 'cancelled' : syncError === 'network' ? 'offline' : 'failed';
  }
  if (status === 'verified') {
    return 'restored';
  }
  return status === 'revoked' ? 'revoked' : status === 'not_owned' ? 'nothing_to_restore' : 'failed';
}

// The newest transaction for a product: latest purchase time, then the larger StoreKit ID.
export function newestTransaction(transactions: readonly StoreTransaction[], productId: string): StoreTransaction | null {
  let newest: StoreTransaction | null = null;
  for (const transaction of transactions) {
    if (transaction.productId !== productId) {
      continue;
    }
    if (newest === null || compareTransactions(transaction, newest) > 0) {
      newest = transaction;
    }
  }
  return newest;
}

function compareTransactions(a: StoreTransaction, b: StoreTransaction): number {
  if (a.purchasedAtMs !== b.purchasedAtMs) {
    return a.purchasedAtMs - b.purchasedAtMs;
  }
  // StoreKit IDs are decimal digits; compare by length first so no precision is lost.
  if (a.transactionId.length !== b.transactionId.length) {
    return a.transactionId.length - b.transactionId.length;
  }
  return a.transactionId < b.transactionId ? -1 : a.transactionId > b.transactionId ? 1 : 0;
}

// Localized product metadata exactly as the storefront supplies it. The price is never computed or
// hard-coded here: the owner set US$7.99 in App Store Connect (D116), and every storefront shows its
// own localized price.
export type StoreProduct = {
  productId: string;
  displayName: string;
  description: string;
  displayPrice: string;
};
