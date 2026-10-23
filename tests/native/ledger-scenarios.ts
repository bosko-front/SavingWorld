import { DEFAULT_SEPARATORS, getCurrency, separatorsForLocale, type CurrencyMetadata, type NumberSeparators } from '@/core/money';
import { getGoal } from '@/data/repositories/goal-repository';
import { getEntry } from '@/data/repositories/ledger-repository';
import { archiveGoal, pauseGoal, reopenGoal, type LifecycleInput } from '@/features/goals/application/goal-commands';
import {
  correctEntry,
  createEntry,
  deleteEntry,
  type EntryValuesInput,
} from '@/features/ledger/application/ledger-commands';
import { newestFirst, readEntryContext, readGoalLedger } from '@/features/ledger/application/ledger-queries';
import { draftFromEntry, draftValues, newEntryDraft, type EntryDraft } from '@/features/ledger/presentation/entry-draft';

import { EUR, balanceOf, count, expectError, mustCreate, values, withSession, type Harness } from './database-scenarios';
import { check, equal, type Scenario } from './scenario-harness';

// Phase 07 scenarios: the shared entry form's input path and the History corrections on the real
// commands (docs/TEST_PLAN.md T05/T06, Phase 07 "Tests and verification"). Amounts go through the
// same `draftValues` parsing as the form, then the same commands. Same dual use as the other
// files: iOS Expo SQLite through `npm run test:db` (the evidence) and Jest on host SQLite.
// The harness clock starts 2026-10-23 08:00 UTC in Europe/Belgrade, so today is 2026-10-23.

const TODAY = '2026-10-23';
const TOMORROW = '2026-10-24';
const JPY = getCurrency('JPY') as CurrencyMetadata;
const DE = separatorsForLocale('de-DE');

function draft(kind: EntryDraft['kind'], amountText: string, entryDate: string, noteText = ''): EntryDraft {
  return { ...newEntryDraft(entryDate as EntryDraft['entryDate']), kind, amountText, noteText };
}

// Typed text → command input, exactly as the form does it; fails the scenario on a parse error.
function typed(entry: EntryDraft, currency: CurrencyMetadata = EUR, separators: NumberSeparators = DEFAULT_SEPARATORS): EntryValuesInput {
  const parsed = draftValues(entry, currency.exponent, separators);
  check(parsed.ok, `draft ${JSON.stringify(entry)} did not parse: ${JSON.stringify(parsed)}`);
  return parsed.value;
}

async function add(h: Harness, entry: EntryDraft) {
  return createEntry(h.deps, { operationId: h.op(), goalId: h.goalId, ...typed(entry) });
}

async function mustAdd(h: Harness, entry: EntryDraft) {
  const result = await add(h, entry);
  check(result.ok, `add ${JSON.stringify(entry)}: ${JSON.stringify(result)}`);
  return result.value;
}

async function entryRow(h: Harness, entryId: string) {
  const entry = await h.db.read((r) => getEntry(r, entryId));
  check(entry, `entry ${entryId} missing`);
  return entry;
}

async function edit(h: Harness, entryId: string, entry: EntryDraft, expectedRevision?: number) {
  const revision = expectedRevision ?? (await entryRow(h, entryId)).revision;
  return correctEntry(h.deps, { operationId: h.op(), entryId, expectedRevision: revision, ...typed(entry) });
}

async function remove(h: Harness, entryId: string, expectedRevision?: number) {
  const revision = expectedRevision ?? (await entryRow(h, entryId)).revision;
  return deleteEntry(h.deps, { operationId: h.op(), entryId, expectedRevision: revision, confirmed: true });
}

async function entryCount(h: Harness): Promise<number> {
  return h.db.read((r) => count(r, 'ledger_entries'));
}

async function goalState(h: Harness) {
  const goal = await h.db.read((r) => getGoal(r, h.goalId));
  check(goal, 'goal missing');
  return goal;
}

async function lifecycle(h: Harness): Promise<LifecycleInput> {
  return { operationId: h.op(), goalId: h.goalId, expectedRevision: (await goalState(h)).revision };
}

export const LEDGER_SCENARIOS: Scenario[] = [
  {
    id: 'L01',
    title: 'Form input: 50 − 20 = 30 survives a database reopen; withdrawal 31 is rejected; deposit → 60 gives 40; deleting the withdrawal gives 60',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('l01');
        await mustAdd(h, draft('deposit', '50.00', TODAY));
        const withdrawal = await mustAdd(h, draft('withdrawal', '20', TODAY));
        equal(withdrawal.balanceMinor, 3_000, 'balance after 50 − 20');
        const before = await entryCount(h);
        const refused = await add(h, draft('withdrawal', '31', TODAY));
        expectError(refused, 'negative_balance', 'withdrawal 31 from 30');
        equal(await entryCount(h), before, 'refused withdrawal wrote nothing');

        // Close the database (as the app process ending would) and open the same file again.
        await h.db.close();
        const reopened = await s.openDb(h.name);
        const ledger = await readGoalLedger(reopened, h.goalId);
        check(ledger, 'goal after reopen');
        equal(ledger.balanceMinor, 3_000, 'exact balance after reopen');
        equal(newestFirst(ledger.entries).map((e) => e.signedAmountMinor), [-2_000, 5_000], 'History newest first');
        const again = await createEntry({ ...h.deps, db: reopened }, { operationId: h.op(), goalId: h.goalId, ...typed(draft('withdrawal', '31', TODAY)) });
        expectError(again, 'negative_balance', 'withdrawal 31 still rejected after reopen');
        // TEST_PLAN T06: correct the deposit to 60 → 40; confirmed delete of the withdrawal → 60.
        const reopenedDeps = { ...h.deps, db: reopened };
        const [depositEntry, withdrawalEntry] = ledger.entries;
        check(depositEntry && withdrawalEntry, 'both entries after reopen');
        const corrected = await correctEntry(reopenedDeps, {
          operationId: h.op(),
          entryId: depositEntry.id,
          expectedRevision: depositEntry.revision,
          ...typed(draft('deposit', '60', TODAY)),
        });
        check(corrected.ok && corrected.value.balanceMinor === 4_000, 'deposit corrected to 60 gives 40');
        const removed = await deleteEntry(reopenedDeps, { operationId: h.op(), entryId: withdrawalEntry.id, expectedRevision: 1, confirmed: true });
        check(removed.ok && removed.value.balanceMinor === 6_000, 'deleting the withdrawal gives 60');
        return { balanceMinor: ledger.balanceMinor, afterCorrectionAndDelete: 6_000 };
      }),
  },
  {
    id: 'L02',
    title: 'Chronological order: equal dates order by createdAt then id; a backdated deposit cannot be moved past its withdrawal',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('l02');
        // Same date: the withdrawal was created after the deposit, so it is funded.
        const deposit = await mustAdd(h, draft('deposit', '100', '2026-10-10'));
        const sameDay = await mustAdd(h, draft('withdrawal', '100', '2026-10-10'));
        equal(sameDay.balanceMinor, 0, 'same-day withdrawal after its deposit');
        // Re-saving the deposit on the same date keeps its createdAt, so it still comes first.
        check((await edit(h, deposit.entryId, draft('deposit', '100', '2026-10-10', 'kept order'))).ok, 'same-date correction keeps position');
        equal((await entryRow(h, deposit.entryId)).createdAtUtc < (await entryRow(h, sameDay.entryId)).createdAtUtc, true, 'createdAt unchanged by correction');

        // A later deposit with a backdated withdrawal funded by it.
        const backdated = await mustAdd(h, draft('deposit', '10', '2026-10-01'));
        await mustAdd(h, draft('withdrawal', '10', '2026-10-01'));
        // Moving that deposit after its withdrawal dips on 2026-10-01 although the final total is 0.
        const moved = await edit(h, backdated.entryId, draft('deposit', '10', '2026-10-11'));
        expectError(moved, 'negative_running_balance', 'deposit moved past its withdrawal');
        check(!moved.ok && moved.error.code === 'negative_running_balance' && moved.error.date === '2026-10-01', 'dip date reported');
        equal((await entryRow(h, backdated.entryId)).entryDate, '2026-10-01', 'refused correction left the row unchanged');

        // A correction keeps createdAt, so a deposit moved onto its withdrawal's date still counts
        // first there (created earlier); one day later it no longer funds the withdrawal.
        const h2 = await s.harness('l02b');
        const a = await mustAdd(h2, draft('deposit', '10', '2026-10-01'));
        await mustAdd(h2, draft('withdrawal', '10', '2026-10-02'));
        await mustAdd(h2, draft('deposit', '10', '2026-10-02'));
        check((await edit(h2, a.entryId, draft('deposit', '10', '2026-10-02'))).ok, 'moved onto the withdrawal date, created earlier');
        const late = await edit(h2, a.entryId, draft('deposit', '10', '2026-10-03'));
        check(!late.ok && late.error.code === 'negative_running_balance' && late.error.date === '2026-10-02', 'one day later: dip on 2026-10-02, final 10');
        const ledger = await readGoalLedger(h2.db, h2.goalId);
        equal(
          ledger?.entries.map((e) => [e.entryDate, e.signedAmountMinor]),
          [['2026-10-02', 1_000], ['2026-10-02', -1_000], ['2026-10-02', 1_000]],
          'date, then createdAt order',
        );
        return { balanceMinor: ledger?.balanceMinor };
      }),
  },
  {
    id: 'L03',
    title: 'Edit moving a withdrawal earlier than its funding is rejected with a positive final total; sign flips revalidate',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('l03');
        await mustAdd(h, draft('deposit', '100', '2026-10-10'));
        const withdrawal = await mustAdd(h, draft('withdrawal', '40', '2026-10-15'));
        const earlier = await edit(h, withdrawal.entryId, draft('withdrawal', '40', '2026-10-05'));
        expectError(earlier, 'negative_running_balance', 'withdrawal moved before the first deposit');
        equal(await balanceOf(h), 6_000, 'final total would still be 60, unchanged');
        const row = await entryRow(h, withdrawal.entryId);
        equal([row.entryDate, row.revision], ['2026-10-15', 1], 'row unchanged after refusal');
        // Same date as the deposit: created later, so funded.
        check((await edit(h, withdrawal.entryId, draft('withdrawal', '40', '2026-10-10'))).ok, 'move to the deposit date');
        equal((await entryRow(h, withdrawal.entryId)).revision, 2, 'revision stepped once');

        // Sign flips: a deposit corrected into a withdrawal revalidates the whole sequence.
        const small = await mustAdd(h, draft('deposit', '20', '2026-10-20'));
        check((await edit(h, small.entryId, draft('withdrawal', '20', '2026-10-20'))).ok, 'flip 20 to a withdrawal: 100 − 40 − 20 = 40');
        equal(await balanceOf(h), 4_000, 'balance after flip');
        const first = (await readGoalLedger(h.db, h.goalId))?.entries[0];
        check(first, 'first entry');
        expectError(await edit(h, first.id, draft('withdrawal', '100', '2026-10-10')), 'negative_balance', 'flipping the funding deposit');
        expectError(await edit(h, first.id, draft('deposit', '50', '2026-10-10')), 'negative_balance', 'shrinking it below the withdrawals');
        // Edit form prefill reads back to the same values.
        const context2 = await readEntryContext(h.db, withdrawal.entryId);
        check(context2, 'entry context');
        const prefill = draftFromEntry(context2.entry, EUR.exponent, DE);
        equal([prefill.kind, prefill.amountText, prefill.entryDate], ['withdrawal', '40,00', '2026-10-10'], 'prefill');
        equal(typed(prefill, EUR, DE).amountMinor, 4_000, 'prefill parses back exactly');
      }),
  },
  {
    id: 'L04',
    title: 'Deleting the funding deposit is rejected despite a positive final total; confirmation is required',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('l04');
        const funding = await mustAdd(h, draft('deposit', '50', '2026-10-01'));
        await mustAdd(h, draft('withdrawal', '40', '2026-10-10'));
        const later = await mustAdd(h, draft('deposit', '100', '2026-10-20'));
        const refused = await remove(h, funding.entryId);
        expectError(refused, 'negative_running_balance', 'delete the funding deposit (final would be 60)');
        equal(await entryCount(h), 3, 'nothing deleted');
        expectError(
          await deleteEntry(h.deps, { operationId: h.op(), entryId: later.entryId, expectedRevision: 1, confirmed: false }),
          'confirmation_required',
          'delete without confirmation',
        );
        const deleted = await remove(h, later.entryId);
        check(deleted.ok && deleted.value.entryRevision === null, 'deleting an unneeded deposit');
        equal(await balanceOf(h), 1_000, '50 − 40 = 10');
        // The v1.2 example: deleting the first deposit while the withdrawal of 20 remains.
        const h2 = await s.harness('l04b');
        const first = await mustAdd(h2, draft('deposit', '50', TODAY));
        await mustAdd(h2, draft('withdrawal', '20', TODAY));
        expectError(await remove(h2, first.entryId), 'negative_balance', 'delete the only deposit');
        equal(await balanceOf(h2), 3_000, 'balance unchanged');
        const gone = await h.db.read((r) => getEntry(r, later.entryId));
        equal(gone, null, 'deleted entry is gone, no snapshot kept');
        const tables = await h.db.read((r) => r.all<{ name: string }>("SELECT name FROM sqlite_schema WHERE type = 'table' AND (name LIKE '%revision%' OR name LIKE '%audit%' OR name LIKE '%history%')"));
        equal(tables.length, 0, 'no audit or revision tables');
      }),
  },
  {
    id: 'L05',
    title: 'Zero, empty, malformed, overflow, future-date and long-note input is refused before or by the command',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('l05');
        const parse = (text: string, currency: CurrencyMetadata = EUR, separators: NumberSeparators = DEFAULT_SEPARATORS) => {
          const result = draftValues(draft('deposit', text, TODAY), currency.exponent, separators);
          return result.ok ? 'ok' : result.error;
        };
        equal(
          ['0', '0.00', '', '  ', '-5', '12.345', '1.2.3', '10000000000.01', '10,000,000,000.00', '12,5'].map((t) => parse(t)),
          ['not_positive', 'not_positive', 'empty', 'empty', 'signed', 'too_many_decimals', 'malformed', 'too_large', 'ok', 'malformed_grouping'],
          'EUR typed amounts',
        );
        equal([parse('12,50', EUR, DE), parse('1.250,50', EUR, DE), parse('12.5', EUR, DE)], ['ok', 'ok', 'malformed_grouping'], 'de-DE separators');
        equal([parse('1500', JPY), parse('1500.5', JPY)], ['ok', 'too_many_decimals'], 'zero-decimal currency');

        expectError(await add(h, draft('deposit', '5', TOMORROW)), 'future_date', 'tomorrow');
        check((await add(h, draft('deposit', '5', TODAY))).ok, 'today is allowed');
        const today = (await readGoalLedger(h.db, h.goalId))?.entries[0];
        check(today, 'entry');
        expectError(await edit(h, today.id, draft('deposit', '5', TOMORROW)), 'future_date', 'correction into the future');
        expectError(await add(h, draft('deposit', '5', TODAY, 'x'.repeat(501))), 'note_too_long', '501-character note');
        expectError(
          await createEntry(h.deps, { operationId: h.op(), goalId: h.goalId, kind: 'deposit', amountMinor: 0, entryDate: TODAY, note: null }),
          'invalid_amount',
          'zero minor units at the command',
        );
        // Running balance ceiling: 10^12 minor units per goal.
        check((await add(h, draft('deposit', '9,999,999,994.95', TODAY))).ok, 'deposit up to 5 minor units below the ceiling');
        expectError(await add(h, draft('deposit', '0.06', TODAY)), 'balance_limit', 'one cent past the ceiling');
        equal(await entryCount(h), 2, 'only the accepted entries were written');
      }),
  },
  {
    id: 'L06',
    title: 'Commit then lost acknowledgment: after a reopen the same operation ID replays once for create, correct and delete',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('l06');
        const createInput = { operationId: 'op-l06-create', goalId: h.goalId, ...typed(draft('deposit', '75', TODAY)) };
        // The write commits but the screen never sees the result (process killed before acknowledgment).
        await createEntry(h.deps, createInput);
        await h.db.close();
        const db = await s.openDb(h.name);
        const deps = { ...h.deps, db };
        const replay = await createEntry(deps, createInput);
        check(replay.ok && replay.value.replayed && replay.value.balanceMinor === 7_500, 'create replayed with the recomputed balance');
        equal(await db.read((r) => count(r, 'ledger_entries')), 1, 'one entry, no duplicate');

        const entryId = replay.ok ? replay.value.entryId : '';
        const correctInput = { operationId: 'op-l06-correct', entryId, expectedRevision: 1, ...typed(draft('deposit', '70', TODAY)) };
        const firstCorrect = await correctEntry(deps, correctInput);
        const againCorrect = await correctEntry(deps, correctInput);
        check(firstCorrect.ok && !firstCorrect.value.replayed, 'correction committed');
        check(againCorrect.ok && againCorrect.value.replayed && againCorrect.value.entryRevision === 2, 'retried correction replays, not stale');
        equal((await db.read((r) => getEntry(r, entryId)))?.revision, 2, 'correction applied once');

        const deleteInput = { operationId: 'op-l06-delete', entryId, expectedRevision: 2, confirmed: true };
        await deleteEntry(deps, deleteInput);
        await db.close();
        const db2 = await s.openDb(h.name);
        const deleteReplay = await deleteEntry({ ...h.deps, db: db2 }, deleteInput);
        check(deleteReplay.ok && deleteReplay.value.replayed && deleteReplay.value.balanceMinor === 0, 'retried delete replays after reopen');
        expectError(
          await createEntry({ ...h.deps, db: db2 }, { ...createInput, ...typed(draft('deposit', '76', TODAY)) }),
          'operation_conflict',
          'same operation ID with an edited draft',
        );
        equal(await db2.read((r) => count(r, 'ledger_entries')), 0, 'deleted once, nothing recreated');
      }),
  },
  {
    id: 'L07',
    title: 'Failed write keeps the operation ID retryable; double tap writes once; a stale form revision is refused',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('l07');
        const input = { operationId: 'op-l07-save', goalId: h.goalId, ...typed(draft('deposit', '40', TODAY, 'gift')) };
        h.hooks.failBeforeCommit = true;
        expectError(await createEntry(h.deps, input), 'storage_failure', 'injected failure');
        h.hooks.failBeforeCommit = false;
        equal(await entryCount(h), 0, 'failed write left nothing');
        // Retry and a simultaneous second tap with the same operation ID.
        const [a, b] = await Promise.all([createEntry(h.deps, input), createEntry(h.deps, input)]);
        check(a.ok && b.ok, 'both calls succeed');
        equal([a.ok && a.value.replayed, b.ok && b.value.replayed].sort(), [false, true], 'one write, one replay');
        equal(await entryCount(h), 1, 'double tap wrote once');

        // Two forms opened at revision 1; the first saves, the second is stale (save and delete).
        const entryId = a.ok ? a.value.entryId : '';
        check((await edit(h, entryId, draft('deposit', '45', TODAY), 1)).ok, 'first form saves');
        expectError(await edit(h, entryId, draft('deposit', '99', TODAY), 1), 'stale_entry', 'second form is stale');
        expectError(await remove(h, entryId, 1), 'stale_entry', 'stale delete');
        equal((await entryRow(h, entryId)).signedAmountMinor, 4_500, 'first edit kept, never silently overwritten');
      }),
  },
  {
    id: 'L08',
    title: 'Paused goals take entries, corrections and deletions and stay paused; closed goals are read-only until Reopen',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('l08');
        const kept = await mustAdd(h, draft('deposit', '30', '2026-10-20'));
        check((await pauseGoal(h.deps, await lifecycle(h))).ok, 'pause');
        const pausedRevision = (await goalState(h)).revision;
        const added = await mustAdd(h, draft('deposit', '10', TODAY));
        check((await edit(h, added.entryId, draft('deposit', '12', TODAY))).ok, 'correct on a paused goal');
        check((await remove(h, added.entryId)).ok, 'delete on a paused goal');
        const paused = await goalState(h);
        equal([paused.status, paused.revision], ['paused', pausedRevision], 'still paused, goal row untouched');

        check((await archiveGoal(h.deps, await lifecycle(h))).ok, 'archive');
        expectError(await add(h, draft('deposit', '1', TODAY)), 'goal_closed', 'create on archived');
        expectError(await edit(h, kept.entryId, draft('deposit', '31', '2026-10-20')), 'goal_closed', 'correct on archived');
        expectError(await remove(h, kept.entryId), 'goal_closed', 'delete on archived');
        equal(await balanceOf(h), 3_000, 'archived history unchanged');
        check((await reopenGoal(h.deps, await lifecycle(h))).ok, 'reopen');
        check((await edit(h, kept.entryId, draft('deposit', '31', '2026-10-20'))).ok, 'reopened goal is editable');
        equal((await goalState(h)).status, 'active', 'reopen sets active');
        equal(await balanceOf(h), 3_100, 'balance after the correction');
      }),
  },
];
