import {
  ANOTHER_WORLD,
  KEEP_GOAL_COPY,
  PAYWALL_COPY,
  PRO_FEATURES,
  PRO_SETTINGS_COPY,
  productMessage,
  purchaseLine,
  READ_ONLY_COPY,
  restoreLine,
} from '@/features/billing/presentation/billing-copy';
import type { PurchaseOutcome, RestoreOutcome } from '@/features/billing/domain/entitlement';

// Phase 16 paywall copy (R18, R21, D74, D97): the owner's exact "Build another world" words, exactly
// the Release 1.0 Pro scope, a calm line for every purchase and restore result, and no promise the
// app does not keep (future themes, subscriptions, discounts, analytics, data recovery).

const PURCHASE_OUTCOMES: PurchaseOutcome[] = ['purchased', 'pending', 'cancelled', 'unverified', 'not_confirmed', 'offline', 'unavailable', 'failed'];
const RESTORE_OUTCOMES: RestoreOutcome[] = ['restored', 'nothing_to_restore', 'revoked', 'offline', 'cancelled', 'failed'];

function allText(): string {
  return JSON.stringify([ANOTHER_WORLD, PAYWALL_COPY.screenTitle, PAYWALL_COPY.intro, PRO_FEATURES, PRO_SETTINGS_COPY, READ_ONLY_COPY, KEEP_GOAL_COPY]);
}

describe('"Build another world" entry (D74)', () => {
  it('uses the owner’s exact words', () => {
    expect(ANOTHER_WORLD.title).toBe('Build another world');
    expect(ANOTHER_WORLD.message).toBe(
      'You’ve already created your free savings goal. Unlock Pro to create more goals and grow your collection of worlds.',
    );
    expect(ANOTHER_WORLD.button).toBe('Explore Pro');
    expect(ANOTHER_WORLD.footnote).toBe('One-time purchase. No subscription.');
    expect(PAYWALL_COPY.footnote).toBe('One-time purchase. No subscription.');
  });

  it('shows Garden as an extra Pro benefit and the free way forward', () => {
    expect(ANOTHER_WORLD.garden).toMatch(/Garden/);
    expect(ANOTHER_WORLD.startOver).toMatch(/delete your goal to start over/);
  });
});

describe('included features (R18)', () => {
  it('lists exactly unlimited goals, Garden, switching worlds and the statistics, in the owner-approved words (D125)', () => {
    expect(PRO_FEATURES.map((feature) => [feature.key, feature.title, feature.detail])).toEqual([
      ['goals', 'Unlimited goals', 'Build as many worlds as you like.'],
      ['garden', 'Unlock the Garden', 'Grow a beautiful new world.'],
      ['switch', 'Switch worlds', 'Choose Island or Garden for each goal.'],
      ['statistics', 'Savings insights', 'See your progress across all goals.'],
    ]);
    expect(PAYWALL_COPY.headline).toBe('Unlock more worlds');
    expect(PAYWALL_COPY.intro).toBe('Grow your Garden, save for unlimited goals, and enjoy your entire savings journey.');
  });

  it('does not sell the quests or the reminder, which are the same in Free', () => {
    expect(allText()).not.toMatch(/quest|challenge|reminder/i);
  });

  it('never promises future themes, subscriptions, discounts, analytics or data recovery', () => {
    const text = allText();
    expect(text).not.toMatch(/all (future )?themes|future themes|every theme/i);
    expect(text).not.toMatch(/subscribe|per month|per year|trial|discount|sale|% off|limited time|today only/i);
    // "Savings insights" is the owner's name for the four statistics (D125); nothing beyond them.
    expect(text).not.toMatch(/analytics|forecast|prediction/i);
    expect(text).not.toMatch(/backup|sync|cloud/i);
    // No price is written anywhere: it always comes from the store (D116).
    expect(text).not.toMatch(/[$€£]\s?\d|\d+[.,]\d\d/);
    expect(PAYWALL_COPY.buyWithPrice('7,99 €')).toBe('Unlock Pro for 7,99 €');
  });
});

describe('purchase and restore results', () => {
  it.each(PURCHASE_OUTCOMES)('purchase %s has a calm title and message', (outcome) => {
    const line = purchaseLine(outcome);
    expect(line.title.length).toBeGreaterThan(5);
    expect(line.message.length).toBeGreaterThan(10);
    expect(line.message).not.toMatch(/error|failed|transaction|StoreKit|JWS|receipt/i);
    // Only a confirmed purchase reads as success.
    expect(line.tone).toBe(outcome === 'purchased' ? 'success' : 'info');
  });

  it.each(RESTORE_OUTCOMES.filter((outcome) => outcome !== 'cancelled'))('restore %s has a calm title and message', (outcome) => {
    const line = restoreLine(outcome);
    expect(line?.title.length).toBeGreaterThan(5);
    expect(line?.tone).toBe(outcome === 'restored' ? 'success' : 'info');
  });

  it('shows nothing for a Restore the person cancelled (D127)', () => {
    expect(restoreLine('cancelled')).toBeNull();
  });

  it('says Restore is about Pro, not savings data', () => {
    expect(restoreLine('restored')?.message).toMatch(/savings on this iPhone are unchanged/);
    expect(restoreLine('nothing_to_restore')?.message).toMatch(/not savings data/);
    // The long explanation lives in Settings, not on the paywall (D125).
    expect(JSON.stringify(PAYWALL_COPY)).not.toMatch(/savings data/);
    expect(PRO_SETTINGS_COPY.footnote).toBe('Restore Purchases is on the Pro screen. It brings back Pro, not savings data.');
    expect(PRO_SETTINGS_COPY.infoMessage).toMatch(/can’t bring them back/);
  });

  it('explains every product state without a hard-coded price', () => {
    expect(productMessage({ kind: 'loading' })).toMatch(/App Store/);
    expect(productMessage({ kind: 'ready', displayPrice: '$7.99' })).toBeNull();
    expect(productMessage({ kind: 'not_offered' })).toMatch(/goals and savings work as before/);
    expect(productMessage({ kind: 'failed', code: 'network' })).toMatch(/connection/);
    expect(productMessage({ kind: 'failed', code: 'unknown' })).toMatch(/Try again/);
  });
});

describe('read-only after a lost entitlement (D74)', () => {
  it('is calm: a neutral badge, one sentence and no alarming words', () => {
    expect(READ_ONLY_COPY.badge).toBe('Read-only');
    for (const sentence of [READ_ONLY_COPY.sentence, READ_ONLY_COPY.gardenSentence, READ_ONLY_COPY.chooseMessage, KEEP_GOAL_COPY.intro]) {
      expect(sentence).not.toMatch(/lost|locked out|expired|warning|deleted|removed|!/i);
    }
    expect(READ_ONLY_COPY.sentence.split('. ').length).toBeLessThanOrEqual(2);
    expect(KEEP_GOAL_COPY.confirmMessage).toMatch(/other goals stay read-only until Pro returns/);
  });
});
