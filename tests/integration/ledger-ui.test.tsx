import { act, fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo, Alert, Dimensions, type AlertButton } from 'react-native';

import { getAppDatabase } from '@/bootstrap/database-readiness';
import { addDays, systemClock, today, type Clock } from '@/core/calendar';
import { randomUuid, uuidGenerator } from '@/data/ids';
import { getGoal } from '@/data/repositories/goal-repository';
import { listEntriesForGoal } from '@/data/repositories/ledger-repository';
import { capabilitiesFor } from '@/core/access';
import { createGoal, finishGoal, pauseGoal, reopenGoal } from '@/features/goals/application/goal-commands';
import { correctEntry, createEntry } from '@/features/ledger/application/ledger-commands';
import { civilDateToLocalDate } from '@/shared/i18n/local-date';

import { APP_DIR, chooseCurrency, freshAppDatabase, resetApp } from '../support/app-fixture';
import { playedHaptics } from '../support/expo-haptics-fake';
import { chooseGoalOption, goalOptionLabels } from '../support/goal-menu';
import { liveToasts } from '../support/sonner-native-fake';

// Phase 07 screens on the real routes (Jest, host SQLite): the shared Add/Edit Entry form from Home
// and History, confirmed deletion, chronological rejections, write failures and the feedback rule
// "exactly one toast and one success haptic per committed write, none for a rejected or failed one".
// Native pickers are driven through their native-event props; their SwiftUI behavior, the real
// haptics engine and VoiceOver are simulator/device checks (docs/evidence/PHASE_07.md).

const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions');

const TODAY = today(systemClock);

beforeEach(() => {
  announce.mockClear();
});

afterAll(async () => {
  await resetApp();
});

function deps() {
  return { db: getAppDatabase(), clock: systemClock, ids: uuidGenerator };
}

async function setupGoal(title = 'Summer trip', targetMinor = 100_000): Promise<string> {
  const created = await createGoal(deps(), { operationId: randomUuid(), title, targetMinor, deadlineDate: null, themeId: 'island' });
  if (!created.ok) {
    throw new Error(`goal setup failed: ${JSON.stringify(created.error)}`);
  }
  return created.value.goalId;
}

// Seeded entries get strictly increasing createdAt, as entries typed by a person always do (the
// test clock may be frozen); with equal timestamps the random id would decide same-day order.
let seedStep = 0;
const seedClock: Clock = { nowMs: () => systemClock.nowMs() + (seedStep += 1), timeZone: systemClock.timeZone };

async function seedEntry(goalId: string, kind: 'deposit' | 'withdrawal', amountMinor: number, entryDate: string) {
  const result = await createEntry({ ...deps(), clock: seedClock }, { operationId: randomUuid(), goalId, kind, amountMinor, entryDate, note: null });
  if (!result.ok) {
    throw new Error(`entry setup failed: ${JSON.stringify(result.error)}`);
  }
  return result.value.entryId;
}

async function entriesOf(goalId: string) {
  return getAppDatabase().read((r) => listEntriesForGoal(r, goalId));
}

async function statusOf(goalId: string) {
  return (await getAppDatabase().read((r) => getGoal(r, goalId)))?.status;
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

// The host element's click handler (Pressability turns it into onPress), so a test can press twice
// within one act, as two taps in the same frame would.
function pressHandler(testID: string): () => void {
  const handler = screen.getByTestId(testID).props.onClick as ((event: unknown) => void) | undefined;
  if (typeof handler !== 'function') {
    throw new Error(`no click handler on ${testID}`);
  }
  return () => handler({ nativeEvent: {}, persist: () => undefined });
}

async function chooseKind(kind: 'deposit' | 'withdrawal') {
  await fireEvent(nativeView({ label: 'Entry type' }), 'selectionChange', { nativeEvent: { selection: kind } });
}

async function chooseDate(date: string) {
  await fireEvent(nativeView({ title: 'Date' }), 'dateChange', {
    nativeEvent: { date: civilDateToLocalDate(date as typeof TODAY).toISOString() },
  });
}

// Every toast is announced exactly once, so the announcement count is the number of toasts shown.
function toastsShown(): string[] {
  return announce.mock.calls.map(([title]) => title);
}

function hapticTypes(): string[] {
  return playedHaptics().map((haptic) => (haptic.kind === 'notification' ? haptic.type : haptic.kind));
}

function answerNextAlert(label: string) {
  return jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _message, buttons?: AlertButton[]) => {
    buttons?.find((button) => button.text === label)?.onPress?.();
  });
}

async function addThroughForm(kind: 'deposit' | 'withdrawal', amount: string) {
  await userEvent.press(screen.getByTestId('home-add-savings'));
  expect(screen).toHavePathname('/entry-form');
  if (kind === 'withdrawal') {
    await chooseKind('withdrawal');
  }
  await userEvent.type(screen.getByTestId('entry-amount'), amount);
  await userEvent.press(screen.getByTestId('entry-save'));
}

describe('Add savings from Home', () => {
  beforeEach(async () => {
    await freshAppDatabase('ledger-add');
    await chooseCurrency('EUR');
  });

  it('50 − 20 = 30 with one toast and one success haptic each; withdrawal 31 is refused inline with the draft kept', async () => {
    const goalId = await setupGoal();
    await renderRouter(APP_DIR, { initialUrl: '/' });

    await addThroughForm('deposit', '50');
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(screen.getByTestId('home-saved')).toHaveTextContent('€50.00');
    expect(toastsShown()).toEqual(['Deposit saved']);
    expect(hapticTypes()).toEqual(['success']);

    await addThroughForm('withdrawal', '20');
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(screen.getByTestId('home-saved')).toHaveTextContent('€30.00');
    expect(toastsShown()).toEqual(['Deposit saved', 'Withdrawal saved']);
    expect(hapticTypes()).toEqual(['success', 'success']);

    await addThroughForm('withdrawal', '31');
    expect(screen).toHavePathname('/entry-form');
    expect(screen.getByText('A withdrawal can’t be more than the saved balance (€30.00).')).toBeOnTheScreen();
    expect(screen.getByTestId('entry-amount')).toHaveDisplayValue('31');
    expect(nativeView({ label: 'Entry type' }).props.selection).toBe('withdrawal');
    expect(toastsShown()).toHaveLength(2);
    expect(hapticTypes()).toEqual(['success', 'success', 'warning']);
    expect((await entriesOf(goalId)).map((entry) => entry.signedAmountMinor)).toEqual([5_000, -2_000]);

    await userEvent.press(screen.getByTestId('entry-cancel'));
    expect(screen.getByTestId('home-saved')).toHaveTextContent('€30.00');
    expect(goalOptionLabels()).toContain('History (2 entries)');
  });

  it('explains zero and malformed amounts without a haptic, and defaults to a deposit dated today', async () => {
    await setupGoal();
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await userEvent.press(screen.getByTestId('home-add-savings'));
    expect(nativeView({ label: 'Entry type' }).props.selection).toBe('deposit');
    const picker = nativeView({ title: 'Date' });
    expect(picker.props.selection.slice(0, 10)).toBe(TODAY);
    expect(picker.props.range.end.slice(0, 10)).toBe(TODAY);
    expect(screen.getByLabelText('Amount (EUR)')).toBeOnTheScreen();
    expect(screen.getByLabelText('Note (optional)')).toBeOnTheScreen();

    await userEvent.press(screen.getByTestId('entry-save'));
    expect(screen.getByText('Enter an amount.')).toBeOnTheScreen();
    await userEvent.type(screen.getByTestId('entry-amount'), '0');
    await userEvent.press(screen.getByTestId('entry-save'));
    expect(screen.getByText('Enter an amount greater than zero.')).toBeOnTheScreen();
    await userEvent.clear(screen.getByTestId('entry-amount'));
    await userEvent.type(screen.getByTestId('entry-amount'), '12.345');
    await userEvent.press(screen.getByTestId('entry-save'));
    expect(screen.getByText('EUR amounts have at most 2 decimal places.')).toBeOnTheScreen();
    expect(hapticTypes()).toEqual([]);
    expect(toastsShown()).toEqual([]);
  });

  it('a future date (time zone moved while open) is refused with one warning haptic', async () => {
    const goalId = await setupGoal();
    await renderRouter(APP_DIR, { initialUrl: `/entry-form?goalId=${goalId}` });
    await userEvent.type(screen.getByTestId('entry-amount'), '5');
    await chooseDate(addDays(TODAY, 1));
    await userEvent.press(screen.getByTestId('entry-save'));
    expect(screen.getByTestId('entry-date-error')).toHaveTextContent(/Choose today or an earlier date/);
    expect(hapticTypes()).toEqual(['warning']);
    expect(toastsShown()).toEqual([]);
    expect(await entriesOf(goalId)).toHaveLength(0);
  });

  it('a write failure keeps the draft, shows an inline error and no toast or haptic; the retry commits once', async () => {
    const goalId = await setupGoal();
    await getAppDatabase().write((tx) =>
      tx.exec("CREATE TRIGGER test_fail_entry BEFORE INSERT ON ledger_entries BEGIN SELECT RAISE(ABORT, 'disk I/O error'); END"),
    );
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await addThroughForm('deposit', '40');
    expect(screen).toHavePathname('/entry-form');
    expect(screen.getByTestId('entry-form-error')).toHaveTextContent(/Couldn’t save. Nothing was changed. Try again./);
    expect(screen.getByTestId('entry-amount')).toHaveDisplayValue('40');
    // No toast: only the inline error notice is spoken (Phase 19).
    expect(toastsShown()).toEqual(['Not saved. Couldn’t save. Nothing was changed. Try again.']);
    announce.mockClear();
    expect(hapticTypes()).toEqual([]);

    await getAppDatabase().write((tx) => tx.exec('DROP TRIGGER test_fail_entry'));
    await userEvent.press(screen.getByTestId('entry-save'));
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(await entriesOf(goalId)).toHaveLength(1);
    expect(toastsShown()).toEqual(['Deposit saved']);
    expect(hapticTypes()).toEqual(['success']);
  });

  it('a double tap on Save writes once', async () => {
    const goalId = await setupGoal();
    await renderRouter(APP_DIR, { initialUrl: `/entry-form?goalId=${goalId}` });
    await userEvent.type(screen.getByTestId('entry-amount'), '15');
    // Two presses in the same frame, before the first write has finished or the button re-rendered
    // as loading: the form's in-flight guard must drop the second.
    const onPress = pressHandler('entry-save');
    await act(async () => {
      onPress();
      onPress();
    });
    await waitFor(() => expect(toastsShown()).toEqual(['Deposit saved']));
    expect(await entriesOf(goalId)).toHaveLength(1);
    expect(hapticTypes()).toEqual(['success']);
  });

  it('keeps the draft through window and text-size changes without writing, then saves it once', async () => {
    const goalId = await setupGoal();
    await renderRouter(APP_DIR, { initialUrl: `/entry-form?goalId=${goalId}` });
    await chooseKind('withdrawal');
    await chooseKind('deposit');
    await userEvent.type(screen.getByTestId('entry-amount'), '12.50');
    await userEvent.type(screen.getByTestId('entry-note'), 'Coins jar');
    await chooseDate(addDays(TODAY, -2));
    // Narrow outer display, wide inner display, split view, short landscape, largest text.
    for (const [width, height, fontScale] of [
      [466, 678, 1],
      [669, 951, 1],
      [334, 951, 1],
      [951, 669, 1],
      [678, 300, 3.1],
      [440, 956, 1],
    ] as const) {
      await act(async () => {
        Dimensions.set({ window: { width, height, scale: 3, fontScale }, screen: { width, height, scale: 3, fontScale } });
      });
    }
    expect(screen.getByTestId('entry-amount')).toHaveDisplayValue('12.50');
    expect(screen.getByTestId('entry-note')).toHaveDisplayValue('Coins jar');
    expect(nativeView({ label: 'Entry type' }).props.selection).toBe('deposit');
    expect(nativeView({ title: 'Date' }).props.selection.slice(0, 10)).toBe(addDays(TODAY, -2));
    expect(await entriesOf(goalId)).toHaveLength(0);

    await userEvent.press(screen.getByTestId('entry-save'));
    await waitFor(() => expect(toastsShown()).toEqual(['Deposit saved']));
    const [saved] = await entriesOf(goalId);
    expect([saved?.signedAmountMinor, saved?.note, saved?.entryDate]).toEqual([1_250, 'Coins jar', addDays(TODAY, -2)]);
  });

  it('a paused goal takes entries and stays paused', async () => {
    const goalId = await setupGoal();
    const paused = await pauseGoal(deps(), { operationId: randomUuid(), goalId, expectedRevision: 1 });
    expect(paused.ok).toBe(true);
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(screen.getByTestId('home-paused')).toBeOnTheScreen();
    await userEvent.press(screen.getByTestId('home-add-savings'));
    expect(screen.getByTestId('entry-goal-paused')).toBeOnTheScreen();
    await userEvent.type(screen.getByTestId('entry-amount'), '10');
    await userEvent.press(screen.getByTestId('entry-save'));
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(screen.getByTestId('home-paused')).toBeOnTheScreen();
    expect(await statusOf(goalId)).toBe('paused');
  });
});

describe('History, corrections and confirmed deletion', () => {
  beforeEach(async () => {
    await freshAppDatabase('ledger-history');
    await chooseCurrency('EUR');
  });

  it('lists current entries newest first and corrects one through the shared form', async () => {
    const goalId = await setupGoal();
    const first = addDays(TODAY, -3);
    const deposit = await seedEntry(goalId, 'deposit', 5_000, first);
    const withdrawal = await seedEntry(goalId, 'withdrawal', 2_000, addDays(TODAY, -1));
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await chooseGoalOption(/^History/);
    expect(screen).toHavePathname('/history');
    expect(screen.getByTestId('history-balance')).toHaveTextContent('Saved: €30.00');

    const rows = screen.getAllByTestId(/^history-row-/);
    expect(rows.map((row) => row.props.testID)).toEqual([`history-row-${withdrawal}`, `history-row-${deposit}`]);
    expect(rows.every((row) => row.props.accessibilityRole === 'button')).toBe(true);
    // The row card keeps its layout inside `Link asChild` (found on the simulator: a function style
    // on the Pressable itself was dropped).
    expect(rows[0]).toHaveStyle({ flexDirection: 'row' });
    expect(screen.getByTestId(`history-row-${withdrawal}`)).toHaveAccessibleName(/^Withdrawal, -€20.00, /);

    await userEvent.press(screen.getByTestId(`history-row-${withdrawal}`));
    expect(screen).toHavePathname('/entry-form');
    expect(screen.getByTestId('entry-amount')).toHaveDisplayValue('20.00');
    expect(nativeView({ label: 'Entry type' }).props.selection).toBe('withdrawal');

    // Moving the withdrawal before its funding deposit is refused, though the total would stay 30.
    await chooseDate(addDays(first, -1));
    await userEvent.press(screen.getByTestId('entry-save'));
    expect(screen.getByTestId('entry-date-error')).toHaveTextContent(/The balance would go below zero on/);
    expect(hapticTypes()).toEqual(['warning']);
    expect(toastsShown()).toEqual([]);

    await chooseDate(first);
    await userEvent.clear(screen.getByTestId('entry-amount'));
    await userEvent.type(screen.getByTestId('entry-amount'), '25');
    await userEvent.type(screen.getByTestId('entry-note'), 'Train tickets');
    await userEvent.press(screen.getByTestId('entry-save'));
    await waitFor(() => expect(screen).toHavePathname('/history'));
    expect(toastsShown()).toEqual(['Entry updated']);
    expect(hapticTypes()).toEqual(['warning', 'success']);
    expect(screen.getByTestId('history-balance')).toHaveTextContent('Saved: €25.00');
    expect(screen.getByText('Train tickets')).toBeOnTheScreen();
    const [kept, corrected] = await entriesOf(goalId);
    expect([kept?.id, corrected?.id, corrected?.signedAmountMinor, corrected?.entryDate, corrected?.revision]).toEqual([
      deposit,
      withdrawal,
      -2_500,
      first,
      2,
    ]);
  });

  it('shows a long history one page at a time, newest first, with the count and balance of every entry (Phase 21)', async () => {
    const goalId = await setupGoal('Long history', 100_000_000);
    const ids: string[] = [];
    for (let i = 0; i < 230; i += 1) {
      ids.push(await seedEntry(goalId, 'deposit', 100 + i, addDays(TODAY, -230 + i)));
    }
    await renderRouter(APP_DIR, { initialUrl: `/history?goalId=${goalId}` });
    const rowIds = () => screen.getAllByTestId(/^history-row-/).map((row) => row.props.testID);
    expect(rowIds()).toHaveLength(100);
    expect(rowIds()[0]).toBe(`history-row-${ids[229]}`);
    expect(rowIds()[99]).toBe(`history-row-${ids[130]}`);
    expect(screen.getByText(/^230 entries/)).toBeTruthy();
    // 100 + 101 + … + 329 minor units = 49,335 = €493.35, from every entry, not only the page.
    expect(screen.getByTestId('history-balance')).toHaveTextContent('Saved: €493.35');

    await userEvent.press(screen.getByTestId('history-show-older'));
    await waitFor(() => expect(rowIds()).toHaveLength(200));
    expect(rowIds()[0]).toBe(`history-row-${ids[229]}`);
    await userEvent.press(screen.getByTestId('history-show-older'));
    await waitFor(() => expect(rowIds()).toHaveLength(230));
    expect(rowIds()[229]).toBe(`history-row-${ids[0]}`);
    expect(screen.queryByTestId('history-show-older')).toBeNull();
  });

  it('deletes after a native confirmation; deleting a funding deposit is refused inline', async () => {
    const goalId = await setupGoal();
    const deposit = await seedEntry(goalId, 'deposit', 5_000, addDays(TODAY, -2));
    const withdrawal = await seedEntry(goalId, 'withdrawal', 2_000, TODAY);
    await renderRouter(APP_DIR, { initialUrl: `/history?goalId=${goalId}` });

    // Cancel in the confirmation deletes nothing.
    await userEvent.press(screen.getByTestId(`history-row-${deposit}`));
    const cancel = answerNextAlert('Cancel');
    await userEvent.press(screen.getByTestId('entry-delete'));
    expect(cancel).toHaveBeenCalledWith('Delete this entry?', expect.stringMatching(/^Deposit of €50.00 on .+This can’t be undone/), expect.anything());
    expect(await entriesOf(goalId)).toHaveLength(2);

    answerNextAlert('Delete');
    await userEvent.press(screen.getByTestId('entry-delete'));
    expect(await screen.findByTestId('entry-form-error')).toHaveTextContent(/Deleting this entry would take the balance below zero/);
    expect(hapticTypes()).toEqual(['warning']);
    // No toast: only the inline error notice is spoken (Phase 19).
    expect(toastsShown()).toEqual(['Not deleted. Deleting this entry would take the balance below zero. Change or delete a withdrawal first.']);
    announce.mockClear();
    await userEvent.press(screen.getByTestId('entry-cancel'));

    await userEvent.press(screen.getByTestId(`history-row-${withdrawal}`));
    answerNextAlert('Delete');
    await userEvent.press(screen.getByTestId('entry-delete'));
    await waitFor(() => expect(toastsShown()).toEqual(['Entry deleted']));
    expect(screen).toHavePathname('/history');
    expect(hapticTypes()).toEqual(['warning', 'success']);
    expect(screen.queryByTestId(`history-row-${withdrawal}`)).not.toBeOnTheScreen();
    expect((await entriesOf(goalId)).map((entry) => entry.id)).toEqual([deposit]);
  });

  it('a form opened before another change to the entry is refused as stale, with no haptic', async () => {
    const goalId = await setupGoal();
    const entryId = await seedEntry(goalId, 'deposit', 1_000, TODAY);
    await renderRouter(APP_DIR, { initialUrl: `/entry-form?entryId=${entryId}` });
    const elsewhere = await correctEntry(deps(), {
      operationId: randomUuid(),
      entryId,
      expectedRevision: 1,
      kind: 'deposit',
      amountMinor: 1_100,
      entryDate: TODAY,
      note: null,
    });
    expect(elsewhere.ok).toBe(true);
    await userEvent.clear(screen.getByTestId('entry-amount'));
    await userEvent.type(screen.getByTestId('entry-amount'), '99');
    await userEvent.press(screen.getByTestId('entry-save'));
    expect(screen.getByTestId('entry-form-error')).toHaveTextContent(/This entry changed after you opened it/);
    expect(screen.getByTestId('entry-amount')).toHaveDisplayValue('99');
    expect((await entriesOf(goalId))[0]?.signedAmountMinor).toBe(1_100);
    expect(hapticTypes()).toEqual([]);
    // No toast: only the inline error notice is spoken (Phase 19).
    expect(toastsShown()).toEqual(['Not saved. This entry changed after you opened it. Close this form and open it again.']);
    announce.mockClear();
  });

  it('shows an empty state with Add savings', async () => {
    const goalId = await setupGoal();
    await renderRouter(APP_DIR, { initialUrl: `/history?goalId=${goalId}` });
    // The goal's own world at its start, waiting for its first savings (D98, V03).
    expect(screen.getByTestId('history-empty')).toHaveTextContent(/Ready to grow/);
    expect(screen.getByTestId('history-empty')).toHaveTextContent(/Your island is waiting for its first savings\./);
    expect(screen.getByTestId('history-empty-world', { includeHiddenElements: true })).toBeOnTheScreen();
    // A button above the entries, as on Home; nothing floats (D81).
    expect(screen.queryByTestId('floating-action-slot')).toBeNull();
    expect(screen.getByTestId('history-add')).toHaveAccessibleName('Add savings');
    await userEvent.press(screen.getByTestId('history-add'));
    expect(screen).toHavePathname('/entry-form');
  });

  it('closed goals are read-only: no Add savings, rows are not buttons and the form explains Reopen', async () => {
    const goalId = await setupGoal();
    const entryId = await seedEntry(goalId, 'deposit', 100_000, TODAY);
    const finished = await finishGoal(deps(), { operationId: randomUuid(), goalId, expectedRevision: 1 });
    expect(finished.ok).toBe(true);
    await renderRouter(APP_DIR, { initialUrl: `/history?goalId=${goalId}` });
    expect(screen.getByTestId('history-closed')).toBeOnTheScreen();
    expect(screen.queryByTestId('history-add')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('floating-action-slot')).not.toBeOnTheScreen();
    expect(screen.getByTestId(`history-row-${entryId}`)).not.toHaveProp('accessibilityRole', 'button');

    await act(async () => {
      router.navigate(`/entry-form?entryId=${entryId}`);
    });
    expect(screen.getByTestId('entry-form-unavailable')).toHaveTextContent(/Reopen it from Collection/);
    expect(screen.queryByTestId('entry-save')).not.toBeOnTheScreen();
    await act(async () => {
      router.navigate(`/entry-form?goalId=${goalId}`);
    });
    expect(screen.getByTestId('entry-form-unavailable')).toHaveTextContent(/This goal is closed/);
  });
});

describe('Free limit (Phase 16: the paywall entry and the read-only rule replace refusals)', () => {
  beforeEach(async () => {
    await freshAppDatabase('ledger-free-limit');
    await chooseCurrency('EUR');
  });

  it('Create Goal at the Free limit opens "Build another world" instead of a form that would be refused', async () => {
    await setupGoal('Open goal');
    await renderRouter(APP_DIR, { initialUrl: '/goal-form' });
    expect(screen.getByTestId('paywall-another-world')).toHaveTextContent(/Build another world/);
    expect(screen.queryByTestId('goal-title')).toBeNull();
    expect(hapticTypes()).toEqual([]);
    expect(liveToasts()).toHaveLength(0);
  });

  it('Reopen over the Free limit (two goals, as after losing Pro) is offered only for the goal kept in use', async () => {
    const closed = await setupGoal('Closed goal');
    await seedEntry(closed, 'deposit', 100_000, TODAY);
    expect((await finishGoal(deps(), { operationId: randomUuid(), goalId: closed, expectedRevision: 1 })).ok).toBe(true);
    const pro = { ...deps(), capabilities: capabilitiesFor('pro') };
    expect(
      (await createGoal(pro, { operationId: randomUuid(), title: 'Open goal', targetMinor: 100_000, deadlineDate: null, themeId: 'island' })).ok,
    ).toBe(true);
    await renderRouter(APP_DIR, { initialUrl: '/collection' });
    await userEvent.press(screen.getByTestId(`collection-card-${closed}`));
    const reopen = screen.getByTestId(`reopen-${closed}`);
    expect(reopen).toHaveTextContent(/Read-only until Pro returns/);
    expect(reopen).toBeDisabled();
    // The command refuses it on its own as well (a stale screen or deep link cannot bypass it).
    const refused = await reopenGoal(deps(), { operationId: randomUuid(), goalId: closed, expectedRevision: 2 });
    expect(!refused.ok && refused.error.code).toBe('goal_limit');
    expect(hapticTypes()).toEqual([]);
  });
});
