import { capabilitiesFor } from '@/core/access';
import { addDays, parseCivilDate, type CivilDate } from '@/core/calendar';
import { getGoal } from '@/data/repositories/goal-repository';
import { listCollectibles } from '@/data/repositories/collectible-repository';
import { createGoal, deleteGoal, finishGoal, pauseGoal, reopenGoal } from '@/features/goals/application/goal-commands';
import { correctEntry, createEntry, deleteEntry } from '@/features/ledger/application/ledger-commands';
import { readSavingsStatistics } from '@/features/statistics/application/statistics-queries';
import type { SavingsStatistics } from '@/features/statistics/domain/savings-statistics';

import { steppingClock, values, withSession, type Harness } from './database-scenarios';
import { check, equal, type Scenario } from './scenario-harness';

// Phase 18 scenarios: the four Pro statistics read from real SQLite (docs/TEST_PLAN.md T19, R19).
// Every expected value below is written out by hand from the entries the scenario saves, not computed
// by the statistics code. Same dual use as the other native scenarios: the iOS simulator through Expo
// SQLite (`npm run test:db`, the evidence) and Jest on host SQLite.

const PRO = capabilitiesFor('pro');
const FREE = capabilitiesFor('free');

function date(text: string): CivilDate {
  const parsed = parseCivilDate(text);
  check(parsed.ok, `bad fixture date ${text}`);
  return parsed.value;
}

// The 30 expected daily balances from hand-written steps: each step's value holds from its date until
// the next step. `from` is the first date of the window.
function dailyFrom(from: string, steps: readonly [string, number][]): { date: string; balanceMinor: bigint }[] {
  const start = date(from);
  return Array.from({ length: 30 }, (_, index) => {
    const day = addDays(start, index);
    let value = 0;
    for (const [stepDate, stepValue] of steps) {
      if (stepDate <= day) {
        value = stepValue;
      }
    }
    return { date: day, balanceMinor: BigInt(value) };
  });
}

async function statistics(h: Harness, today: string): Promise<SavingsStatistics> {
  const result = await readSavingsStatistics(h.db, PRO, date(today));
  check(result.ok, `statistics refused: ${result.ok ? '' : result.error}`);
  return result.value;
}

function summary(stats: SavingsStatistics) {
  return {
    goalCount: stats.goalCount,
    totalMinor: stats.totalMinor,
    deposits: stats.month.depositsMinor,
    withdrawals: stats.month.withdrawalsMinor,
    openingMinor: stats.openingMinor,
    completed: stats.completedGoalCount,
  };
}

async function newGoal(h: Harness, title: string, targetMinor: number): Promise<string> {
  const created = await createGoal({ ...h.deps, capabilities: PRO }, { operationId: h.op(), title, targetMinor, deadlineDate: null, themeId: 'island' });
  check(created.ok, `goal ${title} failed: ${JSON.stringify(created)}`);
  return created.value.goalId;
}

async function save(h: Harness, goalId: string, kind: 'deposit' | 'withdrawal', amount: number, entryDate: string) {
  const result = await createEntry({ ...h.deps, capabilities: PRO }, { operationId: h.op(), goalId, ...values(kind, amount, entryDate) });
  check(result.ok, `${kind} ${amount} ${entryDate} failed: ${JSON.stringify(result)}`);
  return result.value;
}

async function lifecycle(h: Harness, goalId: string) {
  const goal = await h.db.read((r) => getGoal(r, goalId));
  check(goal, `goal ${goalId} missing`);
  return { deps: { ...h.deps, capabilities: PRO }, input: { operationId: h.op(), goalId, expectedRevision: goal.revision } };
}

async function finish(h: Harness, goalId: string) {
  const { deps, input } = await lifecycle(h, goalId);
  const result = await finishGoal(deps, input);
  check(result.ok, `finish failed: ${JSON.stringify(result)}`);
}

export const STATISTICS_SCENARIOS: Scenario[] = [
  {
    id: 'P01',
    title: 'Four statistics match a hand-computed fixture; Finish/Reopen/Delete, backdated edits and deletion recalculate',
    run: (context) =>
      withSession(context, async (s) => {
        // Today is 2026-10-23 (Belgrade): the line runs 2026-09-24 .. 2026-10-23; the month is October.
        const h = await s.harness('stats');
        const tripId = h.goalId;
        await save(h, tripId, 'deposit', 20_000, '2026-09-10');
        const early = await save(h, tripId, 'withdrawal', 5_000, '2026-09-20');
        const lateSeptember = await save(h, tripId, 'deposit', 10_000, '2026-09-30');
        await save(h, tripId, 'deposit', 3_000, '2026-10-05');
        // Same date, saved after the deposit (date, createdAt, id order keeps it valid).
        await save(h, tripId, 'withdrawal', 2_000, '2026-10-05');
        await save(h, tripId, 'deposit', 1_000, '2026-10-23');

        const bikeId = await newGoal(h, 'Bike', 5_000);
        const bikeFunded = await save(h, bikeId, 'deposit', 5_000, '2026-09-01');
        check(bikeFunded.souvenirAwarded, 'Bike earns its souvenir');
        await finish(h, bikeId);

        const cameraId = await newGoal(h, 'Camera', 10_000);
        const cameraFunded = await save(h, cameraId, 'deposit', 10_000, '2026-10-10');
        check(cameraFunded.souvenirAwarded, 'Camera earns its souvenir');
        const paused = await lifecycle(h, cameraId);
        check((await pauseGoal(paused.deps, paused.input)).ok, 'Camera paused');

        const deskId = await newGoal(h, 'Desk', 2_000);
        await save(h, deskId, 'deposit', 2_000, '2026-10-01');
        await finish(h, deskId);

        // Trip 27,000 + Bike 5,000 + Camera 10,000 + Desk 2,000. October: deposits 3,000 + 1,000 +
        // 10,000 + 2,000, withdrawals 2,000. Opening (end of 23 Sep): Trip 15,000 + Bike 5,000.
        // Completed: Bike and Desk; Camera has a souvenir but is paused.
        const first = await statistics(h, '2026-10-23');
        equal(summary(first), { goalCount: 4, totalMinor: 44_000n, deposits: 16_000n, withdrawals: 2_000n, openingMinor: 20_000n, completed: 2 }, 'first read');
        equal(
          first.daily,
          dailyFrom('2026-09-24', [
            ['2026-09-24', 20_000],
            ['2026-09-30', 30_000],
            ['2026-10-01', 32_000],
            ['2026-10-05', 33_000],
            ['2026-10-10', 43_000],
            ['2026-10-23', 44_000],
          ]),
          'first line',
        );
        equal(first.month, { start: '2026-10-01', end: '2026-10-31', depositsMinor: 16_000n, withdrawalsMinor: 2_000n }, 'month bounds');

        // Reopen: the count drops though Desk keeps its souvenir; the money is unchanged.
        const reopen = await lifecycle(h, deskId);
        check((await reopenGoal(reopen.deps, reopen.input)).ok, 'Desk reopened');
        const reopened = await statistics(h, '2026-10-23');
        equal([reopened.completedGoalCount, reopened.totalMinor], [1, 44_000n], 'count after Reopen');
        equal((await h.db.read((r) => listCollectibles(r))).length, 3, 'souvenirs unchanged by Reopen');
        await finish(h, deskId);
        equal((await statistics(h, '2026-10-23')).completedGoalCount, 2, 'Finish counts again');

        // Backdated correction: the 20 Sep withdrawal moves to 2 Oct (into the window and the month).
        const moved = await correctEntry(
          { ...h.deps, capabilities: PRO },
          { operationId: h.op(), entryId: early.entryId, expectedRevision: 1, ...values('withdrawal', 5_000, '2026-10-02') },
        );
        check(moved.ok, `correction failed: ${JSON.stringify(moved)}`);
        const corrected = await statistics(h, '2026-10-23');
        equal(summary(corrected), { goalCount: 4, totalMinor: 44_000n, deposits: 16_000n, withdrawals: 7_000n, openingMinor: 25_000n, completed: 2 }, 'after correction');
        equal(
          corrected.daily,
          dailyFrom('2026-09-24', [
            ['2026-09-24', 25_000],
            ['2026-09-30', 35_000],
            ['2026-10-01', 37_000],
            ['2026-10-02', 32_000],
            ['2026-10-05', 33_000],
            ['2026-10-10', 43_000],
            ['2026-10-23', 44_000],
          ]),
          'line after correction',
        );

        // Deleting the 30 Sep deposit (previous month, inside the window).
        const removed = await deleteEntry({ ...h.deps, capabilities: PRO }, { operationId: h.op(), entryId: lateSeptember.entryId, expectedRevision: 1, confirmed: true });
        check(removed.ok, `deletion failed: ${JSON.stringify(removed)}`);
        const afterDelete = await statistics(h, '2026-10-23');
        equal(summary(afterDelete), { goalCount: 4, totalMinor: 34_000n, deposits: 16_000n, withdrawals: 7_000n, openingMinor: 25_000n, completed: 2 }, 'after entry deletion');
        equal(afterDelete.daily[6], { date: '2026-09-30', balanceMinor: 25_000n }, 'no step on 30 Sep any more');
        equal(afterDelete.daily.at(-1), { date: '2026-10-23', balanceMinor: 34_000n }, 'today after deletion');

        // Deleting the completed Bike goal removes its money, its opening share and its count (D74).
        const bike = await lifecycle(h, bikeId);
        check((await deleteGoal(bike.deps, bike.input)).ok, 'Bike deleted');
        const afterGoal = await statistics(h, '2026-10-23');
        equal(summary(afterGoal), { goalCount: 3, totalMinor: 29_000n, deposits: 16_000n, withdrawals: 7_000n, openingMinor: 20_000n, completed: 1 }, 'after goal deletion');
        equal(afterGoal.daily[0], { date: '2026-09-24', balanceMinor: 20_000n }, 'first point without Bike');
        return { total: afterGoal.totalMinor.toString(), completed: afterGoal.completedGoalCount };
      }),
  },
  {
    id: 'P02',
    title: 'Month and day boundaries: last day of a month, the first of the next, and an entry dated after today',
    run: (context) =>
      withSession(context, async (s) => {
        // The clock is on 1 Nov 2026 (Belgrade), so entries up to that date are allowed.
        const h = await s.harness('stats-month', { clock: steppingClock('2026-11-01T10:00:00.000Z') });
        await save(h, h.goalId, 'deposit', 4_000, '2026-09-30');
        await save(h, h.goalId, 'deposit', 1_000, '2026-10-01');
        await save(h, h.goalId, 'withdrawal', 500, '2026-10-31');
        await save(h, h.goalId, 'deposit', 700, '2026-11-01');

        // Today 31 Oct: the line is 2 Oct .. 31 Oct, so 1 Oct is opening balance although it is in
        // the month. The 1 Nov entry (after "today") is in the total only.
        const october = await statistics(h, '2026-10-31');
        equal(summary(october), { goalCount: 1, totalMinor: 5_200n, deposits: 1_000n, withdrawals: 500n, openingMinor: 5_000n, completed: 0 }, '31 Oct');
        equal(october.daily, dailyFrom('2026-10-02', [['2026-10-02', 5_000], ['2026-10-31', 4_500]]), '31 Oct line');

        // The date rolls over to 1 Nov: a new month and a window of 3 Oct .. 1 Nov.
        const november = await statistics(h, '2026-11-01');
        equal(summary(november), { goalCount: 1, totalMinor: 5_200n, deposits: 700n, withdrawals: 0n, openingMinor: 5_000n, completed: 0 }, '1 Nov');
        equal(november.daily, dailyFrom('2026-10-03', [['2026-10-03', 5_000], ['2026-10-31', 4_500], ['2026-11-01', 5_200]]), '1 Nov line');
        equal(november.month.start, '2026-11-01', 'November starts');
        return { october: october.daily.length, november: november.daily.length };
      }),
  },
  {
    id: 'P03',
    title: 'Without Pro the statistics read is refused before any data is read; an empty ledger reads as zeros',
    run: (context) =>
      withSession(context, async (s) => {
        const h = await s.harness('stats-free');
        const refused = await readSavingsStatistics(h.db, FREE, date('2026-10-23'));
        equal(refused, { ok: false, error: 'pro_required' }, 'Free is refused');
        const empty = await statistics(h, '2026-10-23');
        equal(summary(empty), { goalCount: 1, totalMinor: 0n, deposits: 0n, withdrawals: 0n, openingMinor: 0n, completed: 0 }, 'one empty goal');
        check(empty.daily.every((point) => point.balanceMinor === 0n), 'flat zero line');
        return { refused: !refused.ok };
      }),
  },
];
