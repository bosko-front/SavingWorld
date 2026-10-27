import { startChallenge } from '@/features/challenges/application/challenge-commands';
import { readGoalsOverview } from '@/features/goals/application/goal-queries';
import { correctEntry, createEntry } from '@/features/ledger/application/ledger-commands';

import { balanceOf, count, mustCreate, withSession } from './database-scenarios';
import { check, equal, type Scenario } from './scenario-harness';

// Phase 21 failure scenarios on this device's real SQLite (docs/TEST_PLAN.md T05, "Failure injection").
// Phase 05 already injects a thrown error before COMMIT (S15) and a failing migration (S03); here
// SQLite itself refuses the write. `PRAGMA max_page_count` on the app's own write connection caps the
// file at its current size, which is what a full disk looks like to SQLite (SQLITE_FULL). The command
// must roll back the entry, its receipt and its quest result together, the app must keep reading, and
// the same operation ID must commit exactly once when space returns. Nothing is reset or deleted.

const LONG_NOTE = 'Low storage check. '.repeat(26).slice(0, 500);

export const RESILIENCE_SCENARIOS: Scenario[] = [
  {
    id: 'RS01',
    title: 'Disk full (SQLITE_FULL from SQLite): writes roll back with receipt and quest result, reads continue, the same operation ID commits once later',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('full');
        await mustCreate(h, 'deposit', 10_000, '2026-10-20', 'first');
        const quest = await startChallenge(h.deps, { operationId: h.op(), goalId: h.goalId, ruleId: 'next_milestone' });
        check(quest.ok, 'Next milestone started');

        const pageCount = await h.db.read(async (r) => Number((await r.get<{ page_count: number }>('PRAGMA page_count'))?.page_count));
        await h.db.write((tx) => tx.run(`PRAGMA max_page_count = ${pageCount}`));

        // Save notes until SQLite needs a page it may not have.
        let saved = 0;
        let failedOperation: string | null = null;
        let failure: { code?: string; message?: string } | undefined;
        let before = { entries: 0, receipts: 0, balance: 0, attempts: '' };
        for (let i = 0; i < 400 && failedOperation === null; i += 1) {
          before = {
            entries: await h.db.read((r) => count(r, 'ledger_entries')),
            receipts: await h.db.read((r) => count(r, 'operation_receipts')),
            balance: await balanceOf(h),
            attempts: JSON.stringify(await h.db.read((r) => r.all('SELECT id, state, result, historical_at_utc FROM challenge_attempts ORDER BY id'))),
          };
          const operationId = h.op();
          const result = await createEntry(h.deps, { operationId, goalId: h.goalId, kind: 'deposit', amountMinor: 100, entryDate: '2026-10-22', note: LONG_NOTE });
          if (result.ok) {
            saved += 1;
          } else {
            failedOperation = operationId;
            failure = result.error as { code?: string; message?: string };
          }
        }
        check(failedOperation, 'a write eventually needed more space than allowed');
        equal(failure?.code, 'storage_failure', 'failure code');
        check(/full/i.test(failure?.message ?? ''), `SQLite reported a full database: ${failure?.message}`);

        // Nothing of the failed command remains, and the app keeps reading the committed state.
        equal(await h.db.read((r) => count(r, 'ledger_entries')), before.entries, 'entries after the failed write');
        equal(await h.db.read((r) => count(r, 'operation_receipts')), before.receipts, 'receipts after the failed write');
        equal(await balanceOf(h), before.balance, 'balance after the failed write');
        equal(
          JSON.stringify(await h.db.read((r) => r.all('SELECT id, state, result, historical_at_utc FROM challenge_attempts ORDER BY id'))),
          before.attempts,
          'quest result after the failed write',
        );
        const overview = await readGoalsOverview(h.db);
        equal(overview.goals.length, 1, 'Home snapshot still reads');

        // A correction that needs a new page fails the same way and changes nothing.
        const firstEntry = await h.db.read((r) => r.get<{ id: string; revision: number }>('SELECT id, revision FROM ledger_entries ORDER BY created_at_utc LIMIT 1'));
        check(firstEntry, 'first entry');
        const correctionOperation = h.op();
        const correction = { operationId: correctionOperation, entryId: firstEntry.id, expectedRevision: firstEntry.revision, kind: 'deposit' as const, amountMinor: 10_000, entryDate: '2026-10-20', note: LONG_NOTE };
        const correctionResult = await correctEntry(h.deps, correction);
        if (!correctionResult.ok) {
          equal((correctionResult.error as { code?: string }).code, 'storage_failure', 'correction failure code');
          const row = await h.db.read((r) => r.get<{ revision: number; note: string }>('SELECT revision, note FROM ledger_entries WHERE id = ?', [firstEntry.id]));
          equal(row, { revision: firstEntry.revision, note: 'first' }, 'entry unchanged after the failed correction');
        }
        const integrity = await h.db.read((r) => r.get<{ quick_check: string }>('PRAGMA quick_check'));
        equal(integrity?.quick_check, 'ok', 'quick_check while full');

        // Space returns: the same operation ID commits once, a second retry replays.
        await h.db.write((tx) => tx.run('PRAGMA max_page_count = 1073741823'));
        const retry = await createEntry(h.deps, { operationId: failedOperation, goalId: h.goalId, kind: 'deposit', amountMinor: 100, entryDate: '2026-10-22', note: LONG_NOTE });
        check(retry.ok && !retry.value.replayed, `retry commits: ${JSON.stringify(retry)}`);
        const again = await createEntry(h.deps, { operationId: failedOperation, goalId: h.goalId, kind: 'deposit', amountMinor: 100, entryDate: '2026-10-22', note: LONG_NOTE });
        check(again.ok && again.value.replayed, 'second retry replays');
        equal(await balanceOf(h), before.balance + 100, 'balance after the retry');
        if (!correctionResult.ok) {
          const retried = await correctEntry(h.deps, correction);
          check(retried.ok && !retried.value.replayed, 'correction retry commits once');
        }

        // The state survives closing and reopening the database.
        await h.db.close();
        const reopened = await s.openDb(h.name, undefined, h.clock);
        const ledger = await readGoalsOverview(reopened);
        equal(ledger.goals[0]?.balanceMinor, before.balance + 100, 'balance after reopening');
        return { savedBeforeFull: saved, pageCountCap: pageCount, failure: failure?.message, correctionFailed: !correctionResult.ok };
      }),
  },
];
