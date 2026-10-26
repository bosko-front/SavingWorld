import { act, screen, userEvent, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Alert, type AlertButton } from 'react-native';

import { currentCapabilities, refreshAppData } from '@/bootstrap/app-data';
import { reconcileBilling } from '@/bootstrap/billing';
import { getAppDatabase } from '@/bootstrap/database-readiness';
import { systemClock, today } from '@/core/calendar';
import { randomUuid, uuidGenerator } from '@/data/ids';
import { listGoals } from '@/data/repositories/goal-repository';
import { createGoal } from '@/features/goals/application/goal-commands';
import { createEntry } from '@/features/ledger/application/ledger-commands';

import { APP_DIR, chooseCurrency, freshAppDatabase, grantProForTests, resetApp } from '../support/app-fixture';
import { playedHaptics } from '../support/expo-haptics-fake';
import { addStoreTransaction, fakeStore, refundStoreTransaction } from '../support/expo-iap-fake';
import { chooseGoalOption, goalOptionLabels } from '../support/goal-menu';
import { liveToasts } from '../support/sonner-native-fake';

// Phase 16 journeys on the real routes (Jest, host SQLite, the expo-iap fake behind the real billing
// queue): the "Build another world" paywall entry and its return to Create, every purchase state in
// place, Restore from the paywall and Settings, deep links, and the read-only state after a verified
// loss of Pro (D74). StoreKit itself, VoiceOver and felt haptics are device checks
// (docs/evidence/PHASE_16.md).

const TODAY = today(systemClock);

afterAll(async () => {
  await resetApp();
});

beforeEach(async () => {
  await freshAppDatabase('paywall-ui');
  await chooseCurrency('EUR');
});

function deps() {
  return { db: getAppDatabase(), clock: systemClock, ids: uuidGenerator, capabilities: currentCapabilities() };
}

async function setupGoal(title: string, targetMinor = 10_000): Promise<string> {
  const created = await createGoal(deps(), { operationId: randomUuid(), title, targetMinor, deadlineDate: null, themeId: 'island' });
  if (!created.ok) {
    throw new Error(`goal setup failed: ${JSON.stringify(created.error)}`);
  }
  return created.value.goalId;
}

function hapticTypes(): string[] {
  return playedHaptics().map((haptic) => (haptic.kind === 'notification' ? haptic.type : haptic.kind));
}

function toastTitles(): string[] {
  return liveToasts().map((item) => String((item.jsx.props as { title: string }).title));
}

function answerNextAlert(label: string) {
  return jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _message, buttons?: AlertButton[]) => {
    buttons?.find((button) => button.text === label)?.onPress?.();
  });
}

async function openOffer() {
  await chooseGoalOption('New goal');
  expect(screen).toHavePathname('/goal-form');
  await userEvent.press(screen.getByTestId('paywall-explore'));
  await waitFor(() => expect(screen.getByTestId('paywall-buy')).toHaveTextContent('Unlock Pro for €4.99'));
}

describe('"Build another world" (D74)', () => {
  it('Free’s second Create shows the exact entry; buying Pro continues straight to Create', async () => {
    await setupGoal('Bike');
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await chooseGoalOption('New goal');
    expect(screen).toHavePathname('/goal-form');
    const entry = screen.getByTestId('paywall-another-world');
    expect(entry).toHaveTextContent(/^Build another world/);
    expect(entry).toHaveTextContent(/You’ve already created your free savings goal\. Unlock Pro to create more goals and grow your collection of worlds\./);
    expect(entry).toHaveTextContent(/Pro also adds the Garden/);
    expect(entry).toHaveTextContent(/One-time purchase\. No subscription\./);
    expect(entry).toHaveTextContent(/delete your goal to start over/);
    expect(screen.getByTestId('paywall-explore')).toHaveTextContent('Explore Pro');
    // The person's own world is the hero.
    expect(within(screen.getByTestId('paywall-world')).getByTestId('world-scene', { includeHiddenElements: true })).toBeTruthy();

    await userEvent.press(screen.getByTestId('paywall-explore'));
    await waitFor(() => expect(screen.getByTestId('paywall-buy')).toHaveTextContent('Unlock Pro for €4.99'));
    expect(screen.getByTestId('paywall-features')).toHaveTextContent(/Unlimited goals/);
    expect(screen.getByTestId('paywall-features')).toHaveTextContent(/Unlock the Garden/);
    expect(screen.getByTestId('paywall-features')).toHaveTextContent(/Switch worlds/);
    expect(screen.getByTestId('paywall-features')).toHaveTextContent(/Savings insights/);
    expect(screen.getByTestId('paywall-offer')).toHaveTextContent(/^Unlock more worlds/);
    // The purchase block is the pinned footer: Buy, the footnote right under it, then Restore and Not now.
    const purchase = within(screen.getByTestId('screen-footer-pinned')).getByTestId('paywall-purchase');
    expect(purchase).toHaveTextContent(/Unlock Pro for €4\.99One-time purchase\. No subscription\.Restore PurchasesNot now$/);
    expect(screen.getByTestId('paywall')).not.toHaveTextContent(/savings data/);

    await userEvent.press(screen.getByTestId('paywall-buy'));
    // The same sheet becomes Create Goal.
    await waitFor(() => expect(screen.getByTestId('goal-form-unlocked')).toHaveTextContent(/Pro is unlocked/));
    expect(screen).toHavePathname('/goal-form');
    expect(hapticTypes()).toEqual(['success']);
    expect(toastTitles()).toEqual([]);
    await userEvent.type(screen.getByTestId('goal-title'), 'Camera');
    await userEvent.type(screen.getByTestId('goal-target'), '300');
    await userEvent.press(screen.getByTestId('goal-save'));
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect((await getAppDatabase().read((r) => listGoals(r))).map((goal) => goal.title)).toEqual(['Bike', 'Camera']);
    expect(screen.getByTestId('home-switcher')).toBeOnTheScreen();
  });

  it('a deep link to Create at the Free limit shows the same entry, and Not now returns Home', async () => {
    const goalId = await setupGoal('Bike');
    await createEntry(deps(), { operationId: randomUuid(), goalId, kind: 'deposit', amountMinor: 10_000, entryDate: TODAY, note: null });
    await renderRouter(APP_DIR, { initialUrl: '/goal-form' });
    expect(screen.getByTestId('paywall-another-world')).toBeOnTheScreen();
    await userEvent.press(screen.getByTestId('paywall-close'));
    expect(screen).toHavePathname('/');
  });

  it.each([
    ['user-cancelled', 'Purchase cancelled'],
    ['deferred-payment', 'Waiting for approval'],
    ['network-error', 'You’re offline'],
    ['transaction-validation-failed', 'Pro isn’t unlocked yet'],
  ] as const)('a %s purchase is explained in place, unlocks nothing and never traps the person', async (result, title) => {
    await setupGoal('Bike');
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await openOffer();
    fakeStore.purchaseResult = result;
    await userEvent.press(screen.getByTestId('paywall-buy'));
    await waitFor(() => expect(screen.getByTestId('paywall-result')).toHaveTextContent(new RegExp(`^${title}`)));
    expect(currentCapabilities().level).toBe('free');
    expect(toastTitles()).toEqual([]);
    expect(hapticTypes()).toEqual([]);
    expect(screen.getByTestId('paywall-buy')).toBeEnabled();
    await userEvent.press(screen.getByTestId('paywall-close'));
    expect(screen).toHavePathname('/');
  });

  it('an unreachable App Store keeps Buy off and offers Try again', async () => {
    await setupGoal('Bike');
    fakeStore.failures = { fetch: 'network-error' };
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await chooseGoalOption('New goal');
    await userEvent.press(screen.getByTestId('paywall-explore'));
    await waitFor(() => expect(screen.getByTestId('paywall-product-state')).toHaveTextContent(/can’t be reached right now/));
    expect(screen.getByTestId('paywall-buy')).toBeDisabled();
    fakeStore.failures = {};
    await userEvent.press(screen.getByTestId('paywall-retry'));
    await waitFor(() => expect(screen.getByTestId('paywall-buy')).toHaveTextContent('Unlock Pro for €4.99'));
    expect(screen.getByTestId('paywall-buy')).toBeEnabled();
  });
});

describe('paywall deep link and Restore (R21)', () => {
  it('says Pro is active instead of offering a second purchase', async () => {
    await grantProForTests();
    await renderRouter(APP_DIR, { initialUrl: '/paywall' });
    expect(screen.getByTestId('paywall-offer')).toHaveTextContent(/Pro is active/);
    expect(screen.queryByTestId('paywall-buy')).toBeNull();
    expect(screen.getByTestId('paywall-done')).toBeOnTheScreen();
  });

  it('Settings has one Pro row and no second Restore; the Pro screen restores rights, not data (D126)', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/settings' });
    expect(screen.getByTestId('pro-settings')).toHaveTextContent(/Saving Worlds Pro/);
    expect(screen.queryByText('Restore Purchases')).toBeNull();
    expect(screen.getByTestId('pro-settings-footnote')).toHaveTextContent('Restore Purchases is on the Pro screen. It brings back Pro, not savings data.');

    await userEvent.press(screen.getByTestId('pro-settings-status'));
    await waitFor(() => expect(screen).toHavePathname('/paywall'));
    await userEvent.press(screen.getByTestId('paywall-restore'));
    await waitFor(() => expect(screen.getByTestId('paywall-result')).toHaveTextContent(/^No Pro purchase found/));
    expect(toastTitles()).toEqual([]);
    expect(hapticTypes()).toEqual([]);
  });

  it('Settings opens the paywall, whose Restore works the same way', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/settings' });
    await userEvent.press(screen.getByTestId('pro-settings-status'));
    await waitFor(() => expect(screen).toHavePathname('/paywall'));
    // A purchase made elsewhere with the same Apple Account, found by Restore.
    addStoreTransaction();
    await userEvent.press(screen.getByTestId('paywall-restore'));
    await waitFor(() => expect(screen.getByTestId('paywall-result')).toHaveTextContent(/^Pro is restored/));
    expect(screen.getByTestId('paywall-offer')).toHaveTextContent(/Pro is active/);
    expect(hapticTypes()).toEqual(['success']);
    expect(toastTitles()).toEqual([]);
    await userEvent.press(screen.getByTestId('paywall-done'));
    expect(screen).toHavePathname('/settings');
    // Settings now says Pro is active; its row still opens the Pro screen.
    expect(screen.getByTestId('pro-settings-status')).toHaveTextContent(/Active/);
  });
});

describe('after a verified loss of Pro (D74)', () => {
  async function lostProWithTwoGoals() {
    await grantProForTests();
    const first = await setupGoal('First');
    const second = await setupGoal('Second');
    refundStoreTransaction(fakeStore.transactions[0]!.id);
    await reconcileBilling();
    expect(currentCapabilities().level).toBe('free');
    return { first, second };
  }

  it('asks the person to keep one goal; the others stay visible, calm and read-only everywhere', async () => {
    const { first, second } = await lostProWithTwoGoals();
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(screen.getByTestId('home-keep-choice')).toHaveTextContent(/Choose the goal you keep saving in/);
    expect(screen.getByTestId('home-read-only')).toHaveTextContent('Read-only');
    expect(screen.queryByTestId('home-add-savings')).toBeNull();
    expect(goalOptionLabels()).toEqual(['History', 'New goal', 'Delete goal…']);

    await userEvent.press(screen.getByTestId('home-choose-goal'));
    expect(screen).toHavePathname('/keep-goal');
    const cancel = answerNextAlert('Cancel');
    await userEvent.press(screen.getByTestId(`keep-goal-${second}`));
    expect(cancel.mock.lastCall?.slice(0, 2)).toEqual([
      'Keep saving in “Second”?',
      'Your other goals stay read-only until Pro returns. You can’t switch to another goal without Pro.',
    ]);
    answerNextAlert('Keep this goal');
    await userEvent.press(screen.getByTestId(`keep-goal-${second}`));
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(toastTitles()).toEqual(['Saving in “Second”']);
    expect(hapticTypes()).toEqual(['success']);

    // Home shows the kept goal, usable; the other is listed as Read-only.
    expect(screen.getByTestId('home-goal-title')).toHaveTextContent('Second');
    expect(screen.getByTestId('home-add-savings')).toBeOnTheScreen();
    expect(screen.getByLabelText('Show First, Read-only')).toBeOnTheScreen();
    await userEvent.press(screen.getByLabelText('Show First, Read-only'));
    await waitFor(() => expect(screen.getByTestId('home-goal-title')).toHaveTextContent('First'));
    expect(screen.getByTestId('home-read-only-note')).toHaveTextContent(/^Kept just as it is until Pro returns\. Nothing here was changed\./);

    // Deep links to a read-only goal explain instead of offering a form.
    await act(async () => {
      router.navigate(`/entry-form?goalId=${first}`);
    });
    expect(screen.getByTestId('entry-form-unavailable')).toHaveTextContent(/Read-only/);
    await act(async () => {
      router.navigate(`/goal-form?goalId=${first}`);
    });
    expect(screen.getByTestId('goal-form-read-only')).toBeOnTheScreen();
    await act(async () => {
      router.navigate(`/history?goalId=${first}`);
    });
    await waitFor(() => expect(screen.getByTestId('history-read-only')).toBeOnTheScreen());
    expect(screen.queryByTestId('history-add')).toBeNull();
    await act(async () => {
      router.navigate('/challenges');
    });
    await waitFor(() => expect(screen.getByTestId('challenges-read-only')).toBeOnTheScreen());

    // Nothing was deleted or changed.
    expect((await getAppDatabase().read((r) => listGoals(r))).map((goal) => [goal.title, goal.status, goal.themeId]).sort()).toEqual([
      ['First', 'active', 'island'],
      ['Second', 'active', 'island'],
    ]);
  });

  it('a cold restart keeps the read-only state and the choice; Pro returning makes every goal usable', async () => {
    const { first } = await lostProWithTwoGoals();
    await renderRouter(APP_DIR, { initialUrl: '/keep-goal' });
    answerNextAlert('Keep this goal');
    await userEvent.press(screen.getByTestId(`keep-goal-${first}`));
    await waitFor(() => expect(screen).toHavePathname('/'));
    screen.unmount();

    await renderRouter(APP_DIR, { initialUrl: '/keep-goal' });
    expect(screen.getByTestId('keep-goal-settled')).toHaveTextContent(/You’re saving in “First”/);

    addStoreTransaction();
    await act(async () => {
      await reconcileBilling();
      await refreshAppData();
    });
    expect(currentCapabilities().level).toBe('pro');
    await waitFor(() => expect(screen.getByTestId('keep-goal-settled')).toHaveTextContent(/Every goal is in use/));
  });
});
