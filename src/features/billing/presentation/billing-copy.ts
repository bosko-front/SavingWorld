import type { IconName } from '@/shared/ui/icon';
import type { TileColor } from '@/shared/ui/icon-tile';

import type { PurchaseOutcome, RestoreOutcome, StoreErrorCode } from '../domain/entitlement';

// English copy for the Pro paywall, Restore Purchases and the read-only state after a lost
// entitlement (Phase 16; DESIGN_SYSTEM "World-first design direction", D97). Calm and exact: it names
// only what Pro includes in Release 1.0 (R18), never future themes, subscriptions, discounts or
// pressure, and every purchase result is a short in-place line, never a toast. The headline, intro and
// feature wording are the owner-approved sale copy (D125, Q07); the price always comes from the store.

// The "Build another world" entry when Free tries to create a second goal (owner decision D74,
// exact wording). Garden is shown as an extra Pro benefit.
export const ANOTHER_WORLD = {
  title: 'Build another world',
  message: 'You’ve already created your free savings goal. Unlock Pro to create more goals and grow your collection of worlds.',
  button: 'Explore Pro',
  footnote: 'One-time purchase. No subscription.',
  garden: 'Pro also adds the Garden, a second world to grow.',
  startOver: 'Or delete your goal to start over with a new one.',
} as const;

export type ProFeature = { key: string; icon: IconName; color: TileColor; title: string; detail: string };

// Exactly the R18 scope: unlimited goals, Garden, open-goal Island/Garden switching and the four
// statistics. The three fixed quests and the weekly reminder are the same in Free and Pro, so they
// are not listed.
export const PRO_FEATURES: readonly ProFeature[] = [
  { key: 'goals', icon: 'goals', color: 'green', title: 'Unlimited goals', detail: 'Build as many worlds as you like.' },
  { key: 'garden', icon: 'milestone', color: 'green', title: 'Unlock the Garden', detail: 'Grow a beautiful new world.' },
  { key: 'switch', icon: 'switchWorld', color: 'honey', title: 'Switch worlds', detail: 'Choose Island or Garden for each goal.' },
  { key: 'statistics', icon: 'statistics', color: 'blue', title: 'Savings insights', detail: 'See your progress across all goals.' },
];

export const PAYWALL_COPY = {
  screenTitle: 'Saving Worlds Pro',
  headline: 'Unlock more worlds',
  intro: 'Grow your Garden, save for unlimited goals, and enjoy your entire savings journey.',
  featuresHeader: 'Pro includes',
  footnote: ANOTHER_WORLD.footnote,
  buy: 'Unlock Pro',
  buyWithPrice: (price: string) => `Unlock Pro for ${price}`,
  restore: 'Restore Purchases',
  notNow: 'Not now',
  done: 'Done',
  retry: 'Try again',
  activeTitle: 'Pro is active',
  activeMessage: 'Thank you for supporting Saving Worlds. Everything below is unlocked on this iPhone.',
} as const;

export type ProductState =
  | { kind: 'loading' }
  | { kind: 'ready'; displayPrice: string }
  // The storefront did not return the product (not for sale here, or not configured).
  | { kind: 'not_offered' }
  | { kind: 'failed'; code: StoreErrorCode };

// The line shown while the price is not on the Buy button.
export function productMessage(state: ProductState): string | null {
  switch (state.kind) {
    case 'loading':
      return 'Getting the price from the App Store…';
    case 'ready':
      return null;
    case 'not_offered':
      return 'Pro isn’t offered in this App Store right now. Your goals and savings work as before.';
    case 'failed':
      return state.code === 'network'
        ? 'The App Store can’t be reached right now. Check your connection and try again.'
        : 'The App Store isn’t available right now. Try again in a moment.';
  }
}

export type ResultLine = { tone: 'success' | 'info'; title: string; message: string };

// What a purchase attempt ended as, in calm words. Only `purchased` unlocks anything; nothing here
// claims a charge or a refund the app cannot know about.
export function purchaseLine(outcome: PurchaseOutcome): ResultLine {
  switch (outcome) {
    case 'purchased':
      return { tone: 'success', title: 'Pro is unlocked', message: 'Thank you! Everything in Pro is ready on this iPhone.' };
    case 'pending':
      return {
        tone: 'info',
        title: 'Waiting for approval',
        message: 'Pro unlocks as soon as the purchase is approved. You can keep using the app in the meantime.',
      };
    case 'cancelled':
      return { tone: 'info', title: 'Purchase cancelled', message: 'Nothing was bought. You can come back to Pro any time.' };
    case 'unverified':
      return {
        tone: 'info',
        title: 'Pro isn’t unlocked yet',
        message: 'The App Store couldn’t confirm this purchase. Try Restore Purchases in a moment.',
      };
    case 'not_confirmed':
      return {
        tone: 'info',
        title: 'Pro isn’t unlocked yet',
        message: 'The App Store hasn’t confirmed the purchase yet. Try Restore Purchases in a moment.',
      };
    case 'offline':
      return { tone: 'info', title: 'You’re offline', message: 'The App Store can’t be reached. Check your connection and try again.' };
    case 'unavailable':
      return { tone: 'info', title: 'Purchases aren’t available', message: 'This iPhone can’t make purchases right now.' };
    case 'failed':
      return { tone: 'info', title: 'The purchase didn’t finish', message: 'Nothing changed. Try again in a moment.' };
  }
}

// What Restore Purchases ended as. It returns the Pro right only, never savings data. A Restore the
// person cancelled in the App Store sheet shows nothing (owner decision D127): only a result or a
// problem gets a line.
export function restoreLine(outcome: RestoreOutcome): ResultLine | null {
  switch (outcome) {
    case 'restored':
      return { tone: 'success', title: 'Pro is restored', message: 'Your goals and savings on this iPhone are unchanged.' };
    case 'nothing_to_restore':
      return {
        tone: 'info',
        title: 'No Pro purchase found',
        message: 'This Apple Account has no Pro purchase to restore. Restore brings back Pro, not savings data.',
      };
    case 'revoked':
      return {
        tone: 'info',
        title: 'Pro isn’t active',
        message: 'The App Store shows this purchase as refunded or no longer shared with you. Your savings are unchanged.',
      };
    case 'offline':
      return { tone: 'info', title: 'You’re offline', message: 'The App Store can’t be reached. Check your connection and try again.' };
    case 'cancelled':
      return null;
    case 'failed':
      return { tone: 'info', title: 'Restore didn’t finish', message: 'Nothing changed. Try again in a moment.' };
  }
}

// The read-only state after a lost entitlement (D74): a neutral badge and one sentence, never
// alarming, and the choice of the goal to keep using.
export const READ_ONLY_COPY = {
  badge: 'Read-only',
  sentence: 'Kept just as it is until Pro returns. Nothing here was changed.',
  gardenSentence: 'This Garden is kept just as it is. With Pro it can keep growing.',
  chooseTitle: 'Choose the goal you keep saving in',
  chooseMessage:
    'Pro isn’t active on this iPhone, and all your goals and savings are still here. Pick one goal to keep using; the others stay read-only until Pro returns.',
  chooseButton: 'Choose a goal',
  explorePro: 'Explore Pro',
} as const;

// The screen where the person picks the goal they keep using.
export const KEEP_GOAL_COPY = {
  screenTitle: 'Keep one goal',
  intro:
    'Without Pro, Saving Worlds keeps one goal in use. Choose it here. Your other goals stay visible exactly as they are, read-only, until Pro returns or you delete them.',
  confirmTitle: (title: string) => `Keep saving in “${title}”?`,
  confirmMessage: 'Your other goals stay read-only until Pro returns. You can’t switch to another goal without Pro.',
  confirmButton: 'Keep this goal',
  done: (title: string) => `Saving in “${title}”`,
  notNeededTitle: 'Every goal is in use',
  notNeededMessage: 'There’s nothing to choose right now.',
  chosenTitle: 'Your goal is chosen',
  chosenMessage: (title: string) => `You’re saving in “${title}”. Your other goals stay read-only until Pro returns.`,
  failed: 'Couldn’t save your choice. Nothing was changed. Try again.',
} as const;

// Settings' Pro section (Phase 16): one row to the Pro screen, where Restore Purchases lives (D126),
// and the line that Restore returns the Pro right, not savings history (v1.2 section 3, R23).
export const PRO_SETTINGS_COPY = {
  section: 'Pro',
  title: 'Saving Worlds Pro',
  active: 'Active',
  inactiveDetail: 'More goals, the Garden and your savings at a glance',
  footnote: 'Restore Purchases is on the Pro screen. It brings back Pro, not savings data.',
  infoTitle: 'About Restore Purchases',
  infoMessage:
    'Restore Purchases asks the App Store which purchases belong to your Apple Account and turns Pro back on for this iPhone. It may ask you to sign in. Your goals and savings are stored only on this iPhone, so Restore can’t bring them back after the app was deleted or on a new iPhone.',
} as const;
