import { act, fireEvent, screen, userEvent, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo, Alert, type AlertButton } from 'react-native';

import { refreshAppData, setAppClockForTests, useAppDataStore } from '@/bootstrap/app-data';
import { getAppDatabase } from '@/bootstrap/database-readiness';
import { addDays, systemClock, today, type Clock } from '@/core/calendar';
import { randomUuid, uuidGenerator } from '@/data/ids';
import { listAttemptsForGoal } from '@/data/repositories/challenge-attempt-repository';
import { getGoal } from '@/data/repositories/goal-repository';
import { listEntriesForGoal } from '@/data/repositories/ledger-repository';
import { startChallenge } from '@/features/challenges/application/challenge-commands';
import { createGoal, editGoal, finishGoal, pauseGoal } from '@/features/goals/application/goal-commands';
import { correctEntry, createEntry, deleteEntry } from '@/features/ledger/application/ledger-commands';

import { APP_DIR, chooseCurrency, freshAppDatabase, resetApp } from '../support/app-fixture';
import { playedHaptics } from '../support/expo-haptics-fake';
import { liveToasts } from '../support/sonner-native-fake';

// Phase 13 on the real routes (Jest, host SQLite, Reduce Motion on as in every UI test): the three
// fixed quests as cards for Home's goal, their availability reasons, Start with the selection
// haptic, Add savings through the shared entry form (one entry, counted by the quest by itself),
// the one celebration of a completed quest with one success haptic, Skip, past quests with neutral
// results, a historical correction beside a different current quest, paused and closed goals, and
// the controls that must not exist. Timing, VoiceOver and felt haptics are simulator/device checks
// (docs/evidence/PHASE_13.md).

const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions');

// Every read of the clock moves on by a millisecond, as real taps do: an entry is always created
// strictly after the quest it should count for started (D103).
let instant = Date.now();
const testClock: Clock = { nowMs: () => (instant += 1), timeZone: systemClock.timeZone };
const TODAY = today(systemClock);

beforeAll(() => {
  setAppClockForTests(testClock);
});

beforeEach(async () => {
  announce.mockClear();
  await freshAppDatabase('challenges-ui');
  await chooseCurrency('EUR');
});

afterAll(async () => {
  setAppClockForTests(systemClock);
  await resetApp();
});

function deps() {
  return { db: getAppDatabase(), clock: testClock, ids: uuidGenerator };
}

async function setupGoal(targetMinor: number, deadlineDate: string | null = null, title = 'Camera') {
  const created = await createGoal(deps(), { operationId: randomUuid(), title, targetMinor, deadlineDate, themeId: 'island' });
  if (!created.ok) {
    throw new Error(`goal setup failed: ${JSON.stringify(created.error)}`);
  }
  return created.value.goalId;
}

async function seed(goalId: string, kind: 'deposit' | 'withdrawal', amountMinor: number) {
  const result = await createEntry(deps(), { operationId: randomUuid(), goalId, kind, amountMinor, entryDate: TODAY, note: null });
  if (!result.ok) {
    throw new Error(`entry setup failed: ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

async function attemptsOf(goalId: string) {
  return getAppDatabase().read((r) => listAttemptsForGoal(r, goalId));
}

async function entriesOf(goalId: string) {
  return getAppDatabase().read((r) => listEntriesForGoal(r, goalId));
}

function hapticTypes(): string[] {
  return playedHaptics().map((haptic) => (haptic.kind === 'notification' ? haptic.type : haptic.kind));
}

// Toasts and the celebration are each announced once, so this is what VoiceOver heard, in order.
function announced(): string[] {
  return announce.mock.calls.map(([message]) => message);
}

function liveToast(): { title: string; message?: string } | null {
  const last = liveToasts().at(-1);
  return last ? (last.jsx.props as { title: string; message?: string }) : null;
}

function answerNextAlert(label: string) {
  return jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _message, buttons?: AlertButton[]) => {
    buttons?.find((button) => button.text === label)?.onPress?.();
  });
}

async function openPastQuests() {
  if (screen.getByTestId('quest-history-toggle').props.accessibilityState?.expanded !== true) {
    await userEvent.press(screen.getByTestId('quest-history-toggle'));
  }
}

function nativeView(props: Record<string, unknown>) {
  const [first] = screen.container.queryAll(
    (node) => typeof node.type === 'string' && Object.entries(props).every(([key, value]) => node.props[key] === value),
  );
  if (!first) {
    throw new Error(`no native view with ${JSON.stringify(props)}`);
  }
  return first;
}

async function openChallenges() {
  await renderRouter(APP_DIR, { initialUrl: '/challenges' });
  await screen.findByTestId('challenges');
}

async function depositFromChallenges(goalId: string, amount: string) {
  await userEvent.press(screen.getByTestId('challenges-add-savings'));
  expect(screen).toHavePathname('/entry-form');
  expect(screen).toHaveSearchParams({ goalId, from: 'challenges' });
  await userEvent.type(screen.getByTestId('entry-amount'), amount);
  await userEvent.press(screen.getByTestId('entry-save'));
  await waitFor(() => expect(screen).toHavePathname('/challenges'));
}

// Words a quest screen must never offer (v1.2 sections 3 and 8): no editing, pausing, custom
// quests, reminders, scores or a paywall.
const ABSENT = /custom|edit (the )?(amount|quest|challenge)|pause quest|pause challenge|reminder|streak|points|\bXP\b|level|Unlock Pro|Explore Pro|failed/i;

function expectNoForbiddenControls() {
  expect(screen.queryByText(ABSENT)).toBeNull();
  expect(screen.queryByRole('switch')).toBeNull();
}

describe('Challenges (Phase 13)', () => {
  it('without a goal invites the first one with the empty Island and one action', async () => {
    await openChallenges();
    expect(screen.getByTestId('challenges-empty')).toHaveTextContent(/Quests grow with a goal/);
    expect(screen.getByTestId('challenges-empty')).toHaveTextContent(/three small quests help its world grow\./);
    expect(screen.getByTestId('challenges-empty-world', { includeHiddenElements: true })).toBeTruthy();
    await userEvent.press(screen.getByTestId('challenges-new-goal'));
    expect(screen).toHavePathname('/goal-form');
  });

  it('while Free’s one goal is finished shows that world and sends the person to Collection', async () => {
    const goalId = await setupGoal(5_000);
    await seed(goalId, 'deposit', 5_000);
    const goal = await getAppDatabase().read((r) => getGoal(r, goalId));
    const finished = await finishGoal(deps(), { operationId: randomUuid(), goalId, expectedRevision: goal?.revision ?? 0 });
    expect(finished.ok).toBe(true);
    await openChallenges();
    expect(screen.getByTestId('challenges-closed')).toHaveTextContent(/Your world is finished/);
    expect(screen.getByTestId('challenges-closed')).toHaveTextContent(/Reopen your goal in Collection to keep saving\./);
    expect(screen.queryByTestId('challenges-start')).toBeNull();
    await userEvent.press(screen.getByTestId('challenges-open-collection'));
    await waitFor(() => expect(screen).toHavePathname('/collection'));
  });

  it('shows the three quests with what each fixes, the Weekly reason without a deadline, and no forbidden control', async () => {
    await setupGoal(25_000);
    await openChallenges();
    expect(screen.getByTestId('challenges-goal')).toHaveAccessibleName('Camera. €0.00 of €250.00 saved.');
    const offers = within(screen.getByTestId('quest-offers'));
    // First step and Next milestone can start; First step is chosen first.
    expect(offers.getAllByRole('radio').map((radio) => radio.props.accessibilityState?.checked)).toEqual([true, false]);
    // Each quest has its identity line; the chosen one shows its short detail and Start inside it.
    expect(screen.getByTestId('quest-offer-first_step')).toHaveTextContent(/First step.*Begin your journey.*Record your first deposit.*Any amount counts · no deadline/);
    expect(within(screen.getByTestId('quest-offer-first_step')).getByTestId('challenges-start')).toHaveTextContent('Start First step');
    // Next milestone names the unlock from the Island manifest; its frozen amount is in its name for
    // VoiceOver and shows when it is chosen.
    expect(screen.getByTestId('quest-offer-next_milestone')).toHaveTextContent(/Unlock the next part.*Unlock the first tree/);
    expect(screen.getByTestId('quest-offer-next_milestone-choice')).toHaveAccessibleName(
      'Next milestone. Unlock the first tree. Save €25.00 more · no deadline. Shows a leafy tree.',
    );
    // D136: a still picture of the tree it unlocks replaces the generic tile; the other quests keep theirs.
    expect(screen.getByTestId('quest-preview-next_milestone', { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
    expect(screen.queryByTestId('quest-preview-first_step')).toBeNull();
    expect(screen.queryByTestId('quest-offer-next_milestone-detail')).toBeNull();
    expect(screen.getAllByTestId('challenges-start')).toHaveLength(1);
    expect(screen.getByTestId('quest-offer-weekly_step-reason')).toHaveTextContent('Add a deadline in Edit goal to plan weekly steps.');
    expect(screen.getByTestId('quest-offer-weekly_step')).not.toHaveProp('accessibilityRole', 'radio');
    expectNoForbiddenControls();
    // The full rules are one tap away instead of on every card.
    const rules = jest.spyOn(Alert, 'alert').mockImplementationOnce(() => undefined);
    await userEvent.press(screen.getByTestId('challenges-rules'));
    expect(rules.mock.lastCall?.[0]).toBe('How quests work');
    expect(rules.mock.lastCall?.[1]).toMatch(/They never add money\..*one quest at a time.*fixed when it starts.*Skipping is always fine/s);
  });

  it('choosing a quest plays the selection haptic; Start freezes it with no haptic and offers Add savings and Skip', async () => {
    const goalId = await setupGoal(25_000);
    await seed(goalId, 'deposit', 6_000);
    await openChallenges();
    // 60 of 250 is stage 2; the next threshold is 75.00, so 15.00 more for the Flowers and bushes.
    await userEvent.press(screen.getByTestId('quest-offer-next_milestone-choice'));
    expect(hapticTypes()).toEqual(['selection']);
    // Pressing the chosen quest again changes nothing and plays nothing.
    await userEvent.press(screen.getByTestId('quest-offer-next_milestone-choice'));
    expect(hapticTypes()).toEqual(['selection']);
    expect(screen.getByTestId('quest-offer-next_milestone-detail')).toHaveTextContent('Save €15.00 more · no deadline');
    expect(within(screen.getByTestId('quest-offer-next_milestone')).getByTestId('challenges-start')).toHaveTextContent('Start Next milestone');
    await userEvent.press(screen.getByTestId('challenges-start'));

    await screen.findByTestId('quest-current');
    expect(screen.getByTestId('quest-current-headline')).toHaveTextContent('Unlock the flowers and bushes');
    // The current quest's picture is its own labelled image (D136).
    expect(screen.getByTestId('quest-preview-next_milestone')).toHaveAccessibleName('Shows flowering bushes.');
    expect(screen.getByTestId('quest-current-progress')).toHaveAccessibleName('€0.00 of €15.00 saved, €15.00 to go');
    expect(screen.getByTestId('quest-current-bar')).toHaveAccessibilityValue({ now: 0, text: '0%' });
    expect(screen.getByTestId('quest-current-period')).toHaveTextContent('€15.00 to go · No deadline');
    // The active quest is its own card, marked In progress, and never offers Start.
    expect(screen.getByTestId('quest-current-badge')).toHaveTextContent('In progress');
    expect(screen.getByText('Finish or skip it to choose another.')).toBeTruthy();
    expect(screen.queryByTestId('challenges-start')).toBeNull();
    expect(screen.queryByTestId('quest-offers')).toBeNull();
    expect(liveToast()?.title).toBe('Quest started');
    expect(hapticTypes()).toEqual(['selection']);
    expect(screen.getByTestId('challenges-skip')).toBeTruthy();
    expectNoForbiddenControls();

    const [attempt] = await attemptsOf(goalId);
    expect([attempt?.ruleId, attempt?.targetMinor, attempt?.milestoneStage, attempt?.state]).toEqual(['next_milestone', 1_500, 3, 'active']);
    // Starting wrote no entry.
    expect(await entriesOf(goalId)).toHaveLength(1);
  });

  it('Add savings from Challenges books one entry; progress counts it; the completing deposit is celebrated once with one haptic', async () => {
    const goalId = await setupGoal(25_000);
    await seed(goalId, 'deposit', 6_000);
    await openChallenges();
    await userEvent.press(screen.getByTestId('quest-offer-next_milestone-choice'));
    await userEvent.press(screen.getByTestId('challenges-start'));
    await screen.findByTestId('quest-current');
    playedHaptics().length = 0;
    announce.mockClear();

    // A deposit that does not complete it: the form's own success haptic, progress from the entry.
    await depositFromChallenges(goalId, '10');
    await waitFor(() => expect(screen.getByTestId('quest-current-progress')).toHaveAccessibleName('€10.00 of €15.00 saved, €5.00 to go'));
    expect(hapticTypes()).toEqual(['success']);
    expect(screen.queryByTestId('quest-completed')).toBeNull();

    // The completing deposit: the card plays the one success haptic instead of the form.
    await depositFromChallenges(goalId, '5');
    await screen.findByTestId('quest-completed');
    expect(screen.getByTestId('quest-completed')).toHaveAccessibleName('Next milestone complete! You saved €15.00 toward the flowers and bushes.');
    expect(hapticTypes()).toEqual(['success', 'success']);
    expect(announced()).toEqual(['Deposit saved', 'Deposit saved', 'Next milestone complete! You saved €15.00 toward the flowers and bushes.']);
    const [completed] = await attemptsOf(goalId);
    expect([completed?.state, completed?.result]).toEqual(['historical', 'completed']);
    // Past quests start closed, with their count; one tap shows the whole history.
    expect(screen.getByTestId('quest-history-toggle')).toHaveAccessibleName('Past quests, 1');
    expect(screen.queryByTestId(`quest-history-${completed?.id}`)).toBeNull();
    await openPastQuests();
    expect(screen.getByTestId(`quest-history-${completed?.id}-result`)).toHaveTextContent('Completed');
    expect(screen.getByTestId(`quest-history-${completed?.id}`)).toHaveTextContent(/Next milestone: Flowers and bushes.*€15\.00 saved/);
    // Money moved exactly once per saved entry: 60 + 10 + 5.
    expect((await entriesOf(goalId)).map((entry) => entry.signedAmountMinor)).toEqual([6_000, 1_000, 500]);
    expect(screen.getByTestId('challenges-goal')).toHaveAccessibleName('Camera. €75.00 of €250.00 saved.');
    // The next quest can be chosen right away.
    expect(screen.getByTestId('quest-offers')).toBeTruthy();

    // Leaving and coming back does not replay it.
    await act(async () => {
      router.navigate('/');
    });
    await waitFor(() => expect(screen).toHavePathname('/'));
    await act(async () => {
      router.navigate('/challenges');
    });
    await waitFor(() => expect(screen).toHavePathname('/challenges'));
    expect(screen.queryByTestId('quest-completed')).toBeNull();
    expect(hapticTypes().filter((type) => type === 'success')).toHaveLength(2);
  });

  it('a cancelled or refused entry never completes the quest', async () => {
    const goalId = await setupGoal(25_000);
    await openChallenges();
    await userEvent.press(screen.getByTestId('challenges-start'));
    await screen.findByTestId('quest-current');
    expect(screen.getByTestId('quest-current-progress')).toHaveTextContent('Waiting for your first deposit');

    // Cancel: nothing saved, the quest still waits.
    await userEvent.press(screen.getByTestId('challenges-add-savings'));
    await userEvent.type(screen.getByTestId('entry-amount'), '20');
    await userEvent.press(screen.getByTestId('entry-cancel'));
    await waitFor(() => expect(screen).toHavePathname('/challenges'));
    expect(screen.getByTestId('quest-current-progress')).toHaveTextContent('Waiting for your first deposit');

    // A write that fails: the draft stays, nothing is completed; the retry with the same operation
    // ID commits once and completes it.
    await getAppDatabase().write((tx) =>
      tx.exec("CREATE TRIGGER test_fail_entry BEFORE INSERT ON ledger_entries BEGIN SELECT RAISE(ABORT, 'disk I/O error'); END"),
    );
    await userEvent.press(screen.getByTestId('challenges-add-savings'));
    await userEvent.type(screen.getByTestId('entry-amount'), '20');
    await userEvent.press(screen.getByTestId('entry-save'));
    expect(screen.getByTestId('entry-form-error')).toHaveTextContent(/Couldn’t save/);
    expect((await attemptsOf(goalId))[0]?.state).toBe('active');
    expect(screen.queryByTestId('quest-completed')).toBeNull();

    await getAppDatabase().write((tx) => tx.exec('DROP TRIGGER test_fail_entry'));
    await userEvent.press(screen.getByTestId('entry-save'));
    await waitFor(() => expect(screen).toHavePathname('/challenges'));
    await screen.findByTestId('quest-completed');
    expect(screen.getByTestId('quest-completed')).toHaveAccessibleName('First step complete! Your island has started to grow.');
    expect(await entriesOf(goalId)).toHaveLength(1);
    expect(hapticTypes()).toEqual(['success']);
  });

  it('a quest completed from Home is celebrated on the next visit to Challenges without a second haptic', async () => {
    const goalId = await setupGoal(25_000);
    const started = await startChallenge(deps(), { operationId: randomUuid(), goalId, ruleId: 'first_step' });
    expect(started.ok).toBe(true);
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await userEvent.press(await screen.findByTestId('home-add-savings'));
    await userEvent.type(screen.getByTestId('entry-amount'), '20');
    await userEvent.press(screen.getByTestId('entry-save'));
    await waitFor(() => expect(screen).toHavePathname('/'));
    // The deposit unlocks no stage (20 of 250), so the form plays its own success haptic.
    expect(hapticTypes()).toEqual(['success']);

    await act(async () => {
      router.navigate('/challenges');
    });
    await screen.findByTestId('quest-completed');
    expect(hapticTypes()).toEqual(['success']);
    expect(announced()).toContain('First step complete! Your island has started to grow.');
  });

  it('Skip asks first, keeps the quest as Skipped history with no haptic, and First step then explains it was had', async () => {
    const goalId = await setupGoal(25_000);
    await openChallenges();
    await userEvent.press(screen.getByTestId('challenges-start'));
    await screen.findByTestId('quest-current');

    // Cancelling the confirmation keeps it.
    answerNextAlert('Cancel');
    await userEvent.press(screen.getByTestId('challenges-skip'));
    expect((await attemptsOf(goalId))[0]?.state).toBe('active');

    answerNextAlert('Skip');
    await userEvent.press(screen.getByTestId('challenges-skip'));
    await screen.findByTestId('quest-offers');
    const [skipped] = await attemptsOf(goalId);
    expect([skipped?.state, skipped?.result]).toEqual(['historical', 'skipped']);
    expect(liveToast()?.title).toBe('Quest skipped');
    expect(hapticTypes()).toEqual([]);
    await openPastQuests();
    expect(screen.getByTestId(`quest-history-${skipped?.id}`)).toHaveTextContent(/First step.*Skipped/);
    expect(screen.getByTestId('quest-offer-first_step-reason')).toHaveTextContent('Each goal has one First step.');
    // Next milestone is now chosen and can start.
    expect(screen.getByTestId('challenges-start')).toHaveTextContent('Start Next milestone');
    expect(await entriesOf(goalId)).toHaveLength(0);
  });

  it('Weekly step shows its frozen amount and saved week, and once used it says when the next opens', async () => {
    // A deadline 29 days after today: D = 30, R = 100.00, so 23.34 a week (v1.2 section 7).
    await setupGoal(10_000, addDays(TODAY, 29));
    await openChallenges();
    expect(screen.getByTestId('quest-offer-weekly_step')).toHaveTextContent(/A step this week.*Save €23\.34 this week/);
    await userEvent.press(screen.getByTestId('quest-offer-weekly_step-choice'));
    // The saved Monday-to-Sunday week, in one short line.
    expect(screen.getByTestId('quest-offer-weekly_step-detail')).toHaveTextContent(/^.+ – .+$/);
    await userEvent.press(screen.getByTestId('challenges-start'));
    await screen.findByTestId('quest-current');
    expect(screen.getByTestId('quest-current-headline')).toHaveTextContent('Save €23.34 this week');
    expect(screen.getByTestId('quest-current-period')).toHaveTextContent(/^€23\.34 to go · Until Sunday, .+$/);

    answerNextAlert('Skip');
    await userEvent.press(screen.getByTestId('challenges-skip'));
    await screen.findByTestId('quest-offers');
    expect(screen.getByTestId('quest-offer-weekly_step-reason')).toHaveTextContent('Done for this week. A new one opens Monday.');
  });

  it('a stale Start is refused with the actual reason in an error toast, and the screen is read again', async () => {
    const goalId = await setupGoal(25_000);
    await openChallenges();
    // Another start commits behind the screen's back (as from a second device tap).
    expect((await startChallenge(deps(), { operationId: randomUuid(), goalId, ruleId: 'next_milestone' })).ok).toBe(true);
    await userEvent.press(screen.getByTestId('challenges-start'));
    await waitFor(() => expect(liveToast()?.title).toBe('Quest not started'));
    expect(liveToast()?.message).toBe('One quest at a time. Finish or skip your current quest first.');
    await screen.findByTestId('quest-current');
    expect(hapticTypes()).toEqual([]);
    expect(await attemptsOf(goalId)).toHaveLength(1);
  });

  it('a correction changes a past result while a different quest stays current, without a celebration', async () => {
    const goalId = await setupGoal(25_000);
    expect((await startChallenge(deps(), { operationId: randomUuid(), goalId, ruleId: 'first_step' })).ok).toBe(true);
    const deposit = await seed(goalId, 'deposit', 2_000);
    expect(deposit.completedAttemptId).not.toBeNull();
    expect((await startChallenge(deps(), { operationId: randomUuid(), goalId, ruleId: 'next_milestone' })).ok).toBe(true);
    await openChallenges();
    await openPastQuests();
    const firstStep = (await attemptsOf(goalId)).find((attempt) => attempt.ruleId === 'first_step');
    expect(screen.getByTestId(`quest-history-${firstStep?.id}-result`)).toHaveTextContent('Completed');
    expect(screen.getByTestId('quest-current-headline')).toHaveTextContent('Unlock the first tree');

    // Deleting the deposit that completed it: Not completed (worded "Ended"), still history; Next
    // milestone stays current.
    const removed = await deleteEntry(deps(), { operationId: randomUuid(), entryId: deposit.entryId, expectedRevision: deposit.entryRevision ?? 1, confirmed: true });
    expect(removed.ok && removed.value.completedAttemptId).toBeNull();
    await act(async () => {
      await refreshAppData();
    });
    await waitFor(() => expect(screen.getByTestId(`quest-history-${firstStep?.id}-result`)).toHaveTextContent('Ended'));
    expect(screen.getByTestId('quest-current-headline')).toHaveTextContent('Unlock the first tree');
    expect(screen.queryByTestId('quest-completed')).toBeNull();
    expect(hapticTypes()).toEqual([]);
  });

  it('progress stays right after a withdrawal from Challenges, a goal edit and reopening the app', async () => {
    const goalId = await setupGoal(25_000);
    await seed(goalId, 'deposit', 6_000);
    await openChallenges();
    await userEvent.press(screen.getByTestId('quest-offer-next_milestone-choice'));
    await userEvent.press(screen.getByTestId('challenges-start'));
    await screen.findByTestId('quest-current');
    await depositFromChallenges(goalId, '12');
    await waitFor(() => expect(screen.getByTestId('quest-current-progress')).toHaveAccessibleName('€12.00 of €15.00 saved, €3.00 to go'));

    // A withdrawal recorded from Challenges counts against the quest (net progress).
    await userEvent.press(screen.getByTestId('challenges-add-savings'));
    await fireEvent(nativeView({ label: 'Entry type' }), 'selectionChange', { nativeEvent: { selection: 'withdrawal' } });
    await userEvent.type(screen.getByTestId('entry-amount'), '5');
    await userEvent.press(screen.getByTestId('entry-save'));
    await waitFor(() => expect(screen).toHavePathname('/challenges'));
    await waitFor(() => expect(screen.getByTestId('quest-current-progress')).toHaveAccessibleName('€7.00 of €15.00 saved, €8.00 to go'));
    expect(screen.getByTestId('quest-current-bar')).toHaveAccessibilityValue({ now: 46, text: '46%' });

    // A goal edit (new target and deadline) never rewrites the started quest's frozen target.
    const goal = await getAppDatabase().read((r) => getGoal(r, goalId));
    const edited = await editGoal(deps(), {
      operationId: randomUuid(),
      goalId,
      expectedRevision: goal?.revision ?? 0,
      title: 'Camera',
      targetMinor: 40_000,
      deadlineDate: addDays(TODAY, 60),
      themeId: 'island',
    });
    expect(edited.ok).toBe(true);
    await act(async () => {
      await refreshAppData();
    });
    await waitFor(() => expect(screen.getByTestId('challenges-goal')).toHaveAccessibleName('Camera. €67.00 of €400.00 saved.'));
    expect(screen.getByTestId('quest-current-progress')).toHaveAccessibleName('€7.00 of €15.00 saved, €8.00 to go');
    expect(screen.getByTestId('quest-current-headline')).toHaveTextContent('Unlock the flowers and bushes');
    // The current quest's picture is its own labelled image (D136).
    expect(screen.getByTestId('quest-preview-next_milestone')).toHaveAccessibleName('Shows flowering bushes.');

    // Reopening the app: a fresh app tree and snapshot read the same progress from the database.
    useAppDataStore.setState({ state: { status: 'idle' } });
    await openChallenges();
    expect(screen.getByTestId('quest-current-progress')).toHaveAccessibleName('€7.00 of €15.00 saved, €8.00 to go');
    expect(screen.getByTestId('quest-current-headline')).toHaveTextContent('Unlock the flowers and bushes');
    // The current quest's picture is its own labelled image (D136).
    expect(screen.getByTestId('quest-preview-next_milestone')).toHaveAccessibleName('Shows flowering bushes.');
    expect((await entriesOf(goalId)).map((entry) => entry.signedAmountMinor)).toEqual([6_000, 1_200, -500]);
  });

  it('a paused goal keeps its quests and records savings without resuming', async () => {
    const goalId = await setupGoal(25_000);
    const goal = await getAppDatabase().read((r) => getGoal(r, goalId));
    expect((await pauseGoal(deps(), { operationId: randomUuid(), goalId, expectedRevision: goal?.revision ?? 0 })).ok).toBe(true);
    await openChallenges();
    expect(screen.getByTestId('challenges-paused')).toHaveTextContent(/Quests still count your savings\. Resume it on Home\./);
    await userEvent.press(screen.getByTestId('challenges-start'));
    await screen.findByTestId('quest-current');
    await depositFromChallenges(goalId, '3');
    await screen.findByTestId('quest-completed');
    expect((await getAppDatabase().read((r) => getGoal(r, goalId)))?.status).toBe('paused');
  });

  it('at the target nothing can start: the rest card says what to do next', async () => {
    const goalId = await setupGoal(5_000);
    expect((await startChallenge(deps(), { operationId: randomUuid(), goalId, ruleId: 'first_step' })).ok).toBe(true);
    await seed(goalId, 'deposit', 5_000);
    // Correcting the entry keeps the goal funded; the past First step stays Completed.
    const [entry] = await entriesOf(goalId);
    expect(
      (await correctEntry(deps(), { operationId: randomUuid(), entryId: entry?.id ?? '', expectedRevision: entry?.revision ?? 1, kind: 'deposit', amountMinor: 6_000, entryDate: TODAY, note: null })).ok,
    ).toBe(true);
    await openChallenges();
    // The finished Island is the hero, with the world's own words and one next step.
    expect(screen.getByTestId('challenges-rest')).toHaveTextContent(/Your island is complete!.*Every quest for this goal is done\. Finish it on Home when you’re ready\./);
    expect(screen.queryByTestId('challenges-goal')).toBeNull();
    await openPastQuests();
    expect(screen.getByTestId('quest-history')).toHaveTextContent(/First step.*Completed/);
    expect(screen.queryByTestId('challenges-start')).toBeNull();
    expect(screen.queryByTestId('challenges-add-savings')).toBeNull();
    await userEvent.press(screen.getByTestId('challenges-go-home'));
    await waitFor(() => expect(screen).toHavePathname('/'));
  });
});
