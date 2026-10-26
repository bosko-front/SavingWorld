import { capabilitiesFor, FREE_CAPABILITIES, PRO_CAPABILITIES } from '@/core/access';
import {
  accessLevelFor,
  decideEntitlement,
  ENTITLEMENT_STATUSES,
  newestTransaction,
  PRO_PRODUCT_ID,
  purchaseOutcomeFor,
  restoreOutcomeFor,
  UNCONFIRMED_LOSS,
  type ConfirmedEntitlement,
  type EntitlementCheck,
  type StoreErrorCode,
  type StoreTransaction,
} from '@/features/billing/domain/entitlement';
import { storeErrorCode, toStoreTransaction } from '@/features/billing/native/store-gateway';

// Phase 15 entitlement rules (D115): every StoreKit answer and how it is stored, the purchase and
// restore outcomes, and the Pro capability mapping.

const T1: StoreTransaction = { transactionId: '2000000001', productId: PRO_PRODUCT_ID, purchasedAtMs: 1_000, revokedAtMs: null };
const REVOKED: StoreTransaction = { ...T1, revokedAtMs: 5_000 };

const verified: ConfirmedEntitlement = { status: 'verified', transactionId: T1.transactionId };
const revoked: ConfirmedEntitlement = { status: 'revoked', transactionId: T1.transactionId };
const notOwned: ConfirmedEntitlement = { status: 'not_owned', transactionId: null };

const entitled: EntitlementCheck = { kind: 'entitled', transaction: T1 };
const none: EntitlementCheck = { kind: 'not_entitled', latest: null };
const refunded: EntitlementCheck = { kind: 'not_entitled', latest: REVOKED };
const offline: EntitlementCheck = { kind: 'failed', code: 'network' };
const unverified: EntitlementCheck = { kind: 'failed', code: 'unverified' };

describe('decideEntitlement', () => {
  it('grants only a current verified entitlement, from any earlier state', () => {
    for (const previous of [null, verified, revoked, notOwned]) {
      for (const source of ['automatic', 'purchase', 'restore'] as const) {
        expect(decideEntitlement(previous, entitled, source)).toEqual({
          status: 'verified',
          transactionId: T1.transactionId,
          confirmedNow: true,
          errorCode: null,
        });
      }
    }
  });

  it('keeps the confirmed state when StoreKit cannot answer (offline is unknown, not revocation)', () => {
    expect(decideEntitlement(verified, offline, 'automatic')).toEqual({ status: 'verified', transactionId: T1.transactionId, confirmedNow: false, errorCode: 'network' });
    expect(decideEntitlement(verified, offline, 'restore').status).toBe('verified');
    expect(decideEntitlement(revoked, offline, 'automatic').status).toBe('revoked');
    expect(decideEntitlement(null, offline, 'automatic')).toEqual({ status: 'unknown', transactionId: null, confirmedNow: false, errorCode: 'network' });
  });

  it('never grants and never revokes on an unverified answer', () => {
    expect(decideEntitlement(null, unverified, 'purchase').status).toBe('unknown');
    expect(decideEntitlement(notOwned, unverified, 'purchase').status).toBe('not_owned');
    expect(decideEntitlement(verified, unverified, 'automatic')).toMatchObject({ status: 'verified', errorCode: 'unverified' });
  });

  it('treats a verified refund or revocation as the confirmed loss', () => {
    for (const source of ['automatic', 'purchase', 'restore'] as const) {
      expect(decideEntitlement(verified, refunded, source)).toEqual({ status: 'revoked', transactionId: T1.transactionId, confirmedNow: false, errorCode: null });
    }
    // Defensive: an entitlement that carries a revocation date is not a right.
    expect(decideEntitlement(verified, { kind: 'entitled', transaction: REVOKED }, 'automatic').status).toBe('revoked');
  });

  it('keeps verified rights when a background check finds nothing and no revocation; Restore confirms the loss', () => {
    expect(decideEntitlement(verified, none, 'automatic')).toEqual({ status: 'verified', transactionId: T1.transactionId, confirmedNow: false, errorCode: UNCONFIRMED_LOSS });
    expect(decideEntitlement(verified, none, 'purchase').status).toBe('verified');
    expect(decideEntitlement(verified, none, 'restore')).toEqual({ status: 'not_owned', transactionId: null, confirmedNow: false, errorCode: null });
  });

  it('records not owned when nothing was ever verified', () => {
    for (const previous of [null, notOwned, revoked]) {
      expect(decideEntitlement(previous, none, 'automatic').status).toBe('not_owned');
    }
  });
});

describe('capability mapping', () => {
  it('is Pro only for a verified entitlement', () => {
    expect(ENTITLEMENT_STATUSES.map((status) => [status, accessLevelFor(status)])).toEqual([
      ['verified', 'pro'],
      ['not_owned', 'free'],
      ['revoked', 'free'],
      ['unknown', 'free'],
    ]);
    expect(accessLevelFor(null)).toBe('free');
  });

  it('maps Pro to unlimited goals, Garden, open-goal switching and the four statistics; Free keeps one goal and Island', () => {
    expect(capabilitiesFor(accessLevelFor('verified'))).toBe(PRO_CAPABILITIES);
    expect(PRO_CAPABILITIES).toEqual({ level: 'pro', goalLimit: null, themes: { island: true, garden: true }, switchOpenGoalTheme: true, proStatistics: true });
    expect(capabilitiesFor(accessLevelFor('revoked'))).toBe(FREE_CAPABILITIES);
    expect(FREE_CAPABILITIES).toEqual({ level: 'free', goalLimit: 1, themes: { island: true, garden: false }, switchOpenGoalTheme: false, proStatistics: false });
  });

  it('has no challenge or reminder capability: they are identical in Free and Pro', () => {
    expect(Object.keys(PRO_CAPABILITIES).sort()).toEqual(['goalLimit', 'level', 'proStatistics', 'switchOpenGoalTheme', 'themes']);
  });

  it('keeps theme rights addressable one by one', () => {
    expect(Object.keys(PRO_CAPABILITIES.themes).sort()).toEqual(['garden', 'island']);
  });
});

describe('purchase and restore outcomes', () => {
  it.each<[StoreErrorCode, string]>([
    ['cancelled', 'cancelled'],
    ['pending', 'pending'],
    ['unverified', 'unverified'],
    ['network', 'offline'],
    ['unavailable', 'unavailable'],
    ['not_allowed', 'unavailable'],
    ['already_owned', 'not_confirmed'],
    ['unknown', 'failed'],
  ])('a %s store failure is the %s outcome, never purchased', (code, outcome) => {
    expect(purchaseOutcomeFor(code)).toBe(outcome);
  });

  it('restore reports what StoreKit confirmed', () => {
    expect(restoreOutcomeFor('verified', null)).toBe('restored');
    expect(restoreOutcomeFor('not_owned', null)).toBe('nothing_to_restore');
    expect(restoreOutcomeFor('revoked', null)).toBe('revoked');
    expect(restoreOutcomeFor('unknown', null)).toBe('failed');
    expect(restoreOutcomeFor('not_owned', 'network')).toBe('offline');
    expect(restoreOutcomeFor('not_owned', 'cancelled')).toBe('cancelled');
    expect(restoreOutcomeFor('verified', 'unknown')).toBe('failed');
  });
});

describe('newestTransaction', () => {
  it('picks the latest purchase of the product, then the larger StoreKit ID', () => {
    const a = { ...T1, transactionId: '9', purchasedAtMs: 10 };
    const b = { ...T1, transactionId: '10', purchasedAtMs: 10 };
    const c = { ...T1, transactionId: '8', purchasedAtMs: 5 };
    const other = { ...T1, productId: 'other', purchasedAtMs: 99 };
    expect(newestTransaction([a, b, c, other], PRO_PRODUCT_ID)).toBe(b);
    expect(newestTransaction([other], PRO_PRODUCT_ID)).toBeNull();
  });
});

describe('store adapter boundary', () => {
  const purchase = {
    id: '2000000001',
    transactionId: '2000000001',
    productId: PRO_PRODUCT_ID,
    transactionDate: 1_000,
    revocationDateIOS: null,
    purchaseState: 'purchased',
    purchaseToken: 'header.payload.signature',
  };

  it('accepts a purchased transaction and keeps no signed payload', () => {
    expect(toStoreTransaction(purchase)).toEqual(T1);
    expect(toStoreTransaction({ ...purchase, revocationDateIOS: 5_000 })).toEqual(REVOKED);
  });

  it.each([
    ['pending', { ...purchase, purchaseState: 'pending' }],
    ['unknown state', { ...purchase, purchaseState: 'unknown' }],
    ['non-numeric ID', { ...purchase, id: 'abc', transactionId: 'abc' }],
    ['missing product', { ...purchase, productId: '' }],
    ['bad date', { ...purchase, transactionDate: 'yesterday' }],
    ['bad revocation', { ...purchase, revocationDateIOS: 'soon' }],
    ['null', null],
    ['string', 'purchase'],
  ])('rejects %s', (_name, value) => {
    expect(toStoreTransaction(value)).toBeNull();
  });

  it.each([
    ['user-cancelled', 'cancelled'],
    ['deferred-payment', 'pending'],
    ['transaction-validation-failed', 'unverified'],
    ['network-error', 'network'],
    ['service-error', 'network'],
    ['sync-error', 'network'],
    ['init-connection', 'network'],
    ['sku-not-found', 'unavailable'],
    ['iap-not-available', 'unavailable'],
    ['user-error', 'not_allowed'],
    ['already-owned', 'already_owned'],
    ['something-new', 'unknown'],
  ])('maps the native %s error to %s', (code, expected) => {
    expect(storeErrorCode({ code, message: 'account details must not be kept' })).toBe(expected);
  });

  it('maps non-errors to unknown', () => {
    expect(storeErrorCode(new Error('x'))).toBe('unknown');
    expect(storeErrorCode(undefined)).toBe('unknown');
  });
});
