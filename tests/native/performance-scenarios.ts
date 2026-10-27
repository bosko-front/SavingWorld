import { capabilitiesFor } from '@/core/access';
import { utcTimestamp, type CivilDate, type Clock } from '@/core/calendar';
import { formatMoney, getCurrency, type CurrencyMetadata } from '@/core/money';
import type { AppDatabase } from '@/data/db/database';
import { writeCurrency } from '@/data/repositories/settings-repository';
import { readStoredEntitlement } from '@/features/billing/application/entitlement-reconciler';
import { startChallenge } from '@/features/challenges/application/challenge-commands';
import { readChallengeBoard } from '@/features/challenges/application/challenge-queries';
import { createGoal, finishGoal } from '@/features/goals/application/goal-commands';
import { readGoalsOverview } from '@/features/goals/application/goal-queries';
import { correctEntry, createEntry, deleteEntry } from '@/features/ledger/application/ledger-commands';
import { newestFirst, readGoalLedger, readHistoryPage } from '@/features/ledger/application/ledger-queries';
import { readCurrencyOverview } from '@/features/settings/application/settings-queries';
import { readSavingsStatistics } from '@/features/statistics/application/statistics-queries';

import { withSession, type Session } from './database-scenarios';
import { check, equal, type Scenario } from './scenario-harness';

// Phase 21 performance fixtures (docs/TEST_PLAN.md "Failure injection and performance", T01, T19).
// A realistic Pro person in one global currency: eight goals, 10,000 ledger entries over three years
// (one goal holds 7,000 of them), a year of weekly quests on that goal, four souvenirs and three
// finished goals. The entries are inserted with one parameterized statement per batch inside one
// transaction (the commands would need hours to replay 10,000 chronological checks one by one); the
// souvenirs, quests and Finish go through the real commands. Every expected sum comes from the
// generator, not from the code under test.
//
// The scenario then times the reads and writes the app makes (the Home snapshot, History, Savings
// insights, the quest board, a deposit, a correction of the oldest entry, a deletion) on this
// device's SQLite. On a simulator these are not device results; a hard ceiling only catches a gross
// regression, and docs/evidence/PHASE_21.md records the numbers. Alternate currency exponents use
// their own whole-app databases (PF02, PF03), never mixed with EUR.

const PRO = capabilitiesFor('pro');
const TODAY = '2026-10-27';
const ZONE = 'Europe/Belgrade';
const FIRST_DATE = Date.UTC(2023, 10, 1); // 1 November 2023
const LAST_DATE = Date.UTC(2026, 9, 22); // 22 October 2026
const DAY_MS = 86_400_000;
// Regression ceilings for one operation on the simulator (not the device budget, see the evidence).
const READ_CEILING_MS = 1_500;
const WRITE_CEILING_MS = 3_000;

function now(): number {
  const performance = (globalThis as { performance?: { now?: () => number } }).performance;
  return performance?.now ? performance.now() : Date.now();
}

// A small deterministic generator (LCG) so every run builds the same ledger.
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 2 ** 32;
  };
}

function isoDate(ms: number): CivilDate {
  return new Date(ms).toISOString().slice(0, 10) as CivilDate;
}

function settableClock(startIso: string): Clock & { at(iso: string): void } {
  let t = Date.parse(startIso);
  return {
    nowMs: () => (t += 1000),
    timeZone: () => ZONE,
    at: (iso) => {
      t = Date.parse(iso);
    },
  };
}

type FixtureEntry = { id: string; amount: number; date: CivilDate; createdAt: string; note: string | null };

export type FixtureGoal = { goalId: string; entries: FixtureEntry[]; sum: bigint };

// Chronological entries for one goal: deposits of 5-200 major units (500-20,000 for a currency
// without decimals), every tenth a withdrawal of at most 5% of the running balance. `scale` is the
// minor units per major unit step, so the story is the same in currencies with 0, 2 or 3 decimals.
function ledgerFor(goalIndex: number, count: number, scale: number, idPrefix: string): FixtureEntry[] {
  const next = random(1000 + goalIndex);
  const span = LAST_DATE - FIRST_DATE;
  const entries: FixtureEntry[] = [];
  let balance = 0;
  for (let i = 0; i < count; i += 1) {
    const dateMs = FIRST_DATE + Math.floor((span * i) / count / DAY_MS) * DAY_MS;
    const createdMs = dateMs + 8 * 3_600_000 + i * 1000;
    let amount = (5 + Math.floor(next() * 196)) * scale;
    if (i % 10 === 9 && balance > 20 * scale) {
      amount = -Math.max(1, Math.floor(balance * 0.05 * next()));
    }
    balance += amount;
    entries.push({
      id: `${idPrefix}-g${goalIndex}-e${String(i).padStart(5, '0')}`,
      amount,
      date: isoDate(dateMs),
      createdAt: new Date(createdMs).toISOString(),
      note: i % 25 === 0 ? `Saved from week ${i}` : null,
    });
  }
  return entries;
}

async function insertEntries(db: AppDatabase, goalId: string, entries: readonly FixtureEntry[]): Promise<void> {
  const batch = 400;
  await db.write(async (tx) => {
    for (let start = 0; start < entries.length; start += batch) {
      const rows = entries.slice(start, start + batch);
      const params: (string | number | null)[] = [];
      for (const entry of rows) {
        params.push(entry.id, goalId, entry.amount, entry.date, entry.note, entry.createdAt, entry.createdAt, 1);
      }
      await tx.run(
        `INSERT INTO ledger_entries (id, goal_id, signed_amount_minor, entry_date, note, created_at_utc, updated_at_utc, revision)
         VALUES ${rows.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
        params,
      );
    }
  });
}

function must<T>(result: { ok: true; value: T } | { ok: false; error: unknown }, step: string): T {
  if (!result.ok) {
    throw new Error(`${step} failed: ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

function sumOf(entries: readonly FixtureEntry[]): bigint {
  return entries.reduce((total, entry) => total + BigInt(entry.amount), 0n);
}

// `souvenirs` small goals (from goal 1) reach their target through createEntry; the first `finished`
// of them are then finished.
export type FixtureShape = {
  label: string;
  currency: CurrencyMetadata;
  perGoal: readonly number[];
  weeklyQuests: boolean;
  souvenirs?: number;
  finished?: number;
};

export type SeededFixture = {
  goals: FixtureGoal[];
  heavy: FixtureGoal;
  finishedGoalIds: string[];
  souvenirGoalIds: string[];
  weeklyAttempts: number;
  seedMs: number;
};

type Fixture = SeededFixture & { db: AppDatabase; name: string; clock: FixtureClock };

export type FixtureClock = ReturnType<typeof settableClock>;

export function performanceFixtureClock(): FixtureClock {
  return settableClock('2023-10-31T08:00:00.000Z');
}

async function buildFixture(s: Session, shape: FixtureShape): Promise<Fixture> {
  const name = s.name(shape.label);
  const clock = performanceFixtureClock();
  const db = await s.openDb(name, undefined, clock);
  return { db, name, clock, ...(await seedPerformanceFixture(db, clock, shape)) };
}

// Builds the whole-app fixture: currency, goals through createGoal, entries in batches, then the last
// deposit of four small goals through createEntry (souvenir), Finish for three, and one Weekly step
// started in each of the 52 weeks before today on the heavy goal (the previous week's attempt is
// closed by the command).
// Also used by tests/integration/performance-fixture.test.ts to write an app database file for the
// simulator UI measurements (scripts/ota-drill.mjs seed). Free when there is one goal.
export async function seedPerformanceFixture(db: AppDatabase, clock: FixtureClock, shape: FixtureShape): Promise<SeededFixture> {
  const started = now();
  let ops = 0;
  const op = () => `op-${shape.label}-${(ops += 1)}`;
  let ids = 0;
  const deps = { db, clock, ids: { newId: () => `${shape.label}-id-${(ids += 1)}` }, capabilities: PRO };
  await db.write((tx) => writeCurrency(tx, shape.currency, utcTimestamp(clock)));

  const souvenirCount = shape.souvenirs ?? 4;
  const scale = shape.currency.exponent === 0 ? 100 : 10 ** shape.currency.exponent;
  const unit = 100 * scale;
  const goals: FixtureGoal[] = [];
  for (const [index, count] of shape.perGoal.entries()) {
    const entries = ledgerFor(index, count, scale, shape.label);
    const sum = sumOf(entries);
    // Goal 0 (the heavy one) stays below its target with a deadline, so Weekly steps can start; the
    // souvenir goals reach their target with one more deposit; the rest stay open.
    const targetMinor = index === 0 ? Number(sum * 2n) : index <= souvenirCount ? Number(sum) + unit : Number(sum * 3n);
    const { goalId } = must(
      await createGoal(deps, {
        operationId: op(),
        title: index === 0 ? 'House deposit' : `World ${index}`,
        targetMinor,
        deadlineDate: index === 0 ? '2027-06-30' : null,
        themeId: index % 2 === 0 ? 'island' : 'garden',
      }),
      `goal ${index}`,
    );
    await insertEntries(db, goalId, entries);
    goals.push({ goalId, entries, sum });
  }

  clock.at('2026-10-23T09:00:00.000Z');
  const souvenirGoalIds: string[] = [];
  const finishedGoalIds: string[] = [];
  for (const goal of goals.slice(1, souvenirCount + 1)) {
    const saved = must(
      await createEntry(deps, { operationId: op(), goalId: goal.goalId, kind: 'deposit', amountMinor: unit, entryDate: '2026-10-23', note: null }),
      'funding deposit',
    );
    check(saved.souvenirAwarded, 'the funding deposit awards the souvenir');
    goal.sum += BigInt(unit);
    goal.entries.push({ id: saved.entryId, amount: unit, date: '2026-10-23' as CivilDate, createdAt: '', note: null });
    souvenirGoalIds.push(goal.goalId);
  }
  for (const goal of goals.slice(1, (shape.finished ?? 3) + 1)) {
    const overview = await readGoalsOverview(db);
    const summary = overview.goals.find((item) => item.goal.id === goal.goalId);
    check(summary, 'funded goal listed');
    must(await finishGoal(deps, { operationId: op(), goalId: goal.goalId, expectedRevision: summary.goal.revision }), 'finish');
    finishedGoalIds.push(goal.goalId);
  }

  let weeklyAttempts = 0;
  const heavy = goals[0];
  check(heavy, 'heavy goal');
  if (shape.weeklyQuests) {
    const firstMonday = Date.UTC(2025, 9, 27); // Monday 27 October 2025
    for (let week = 0; week < 52; week += 1) {
      clock.at(new Date(firstMonday + week * 7 * DAY_MS + 9 * 3_600_000).toISOString());
      must(await startChallenge(deps, { operationId: op(), goalId: heavy.goalId, ruleId: 'weekly_step' }), `weekly ${week}`);
      weeklyAttempts += 1;
    }
  }
  clock.at(`${TODAY}T09:00:00.000Z`);
  return { goals, heavy, finishedGoalIds, souvenirGoalIds, weeklyAttempts, seedMs: Math.round(now() - started) };
}

type Timing = { medianMs: number; maxMs: number; runs: number };

async function time(runs: number, body: () => Promise<unknown>): Promise<Timing> {
  const samples: number[] = [];
  for (let i = 0; i < runs; i += 1) {
    const started = now();
    await body();
    samples.push(now() - started);
  }
  samples.sort((a, b) => a - b);
  const round = (value: number) => Math.round(value * 10) / 10;
  return { medianMs: round(samples[Math.floor(samples.length / 2)] ?? 0), maxMs: round(samples[samples.length - 1] ?? 0), runs };
}

function withinCeiling(label: string, timing: Timing, ceilingMs: number): void {
  check(timing.maxMs <= ceilingMs, `${label} took ${timing.maxMs} ms (ceiling ${ceilingMs} ms)`);
}

// The snapshot `refreshAppData()` reads after every commit and at launch.
function readSnapshot(db: AppDatabase) {
  return Promise.all([readCurrencyOverview(db), readGoalsOverview(db), readStoredEntitlement(db)]);
}

async function checkTotals(f: Fixture, currency: CurrencyMetadata): Promise<Record<string, unknown>> {
  const overview = await readGoalsOverview(f.db);
  equal(overview.goals.length, f.goals.length, 'goal count');
  for (const goal of f.goals) {
    const summary = overview.goals.find((item) => item.goal.id === goal.goalId);
    check(summary, 'goal listed');
    equal(BigInt(summary.balanceMinor), goal.sum, `balance of ${summary.goal.title}`);
    equal(summary.entryCount, goal.entries.length, `entry count of ${summary.goal.title}`);
  }
  equal(overview.souvenirs.map((item) => item.goalId).sort(), [...f.souvenirGoalIds].sort(), 'souvenirs');

  const allEntries = f.goals.flatMap((goal) => goal.entries);
  const total = f.goals.reduce((acc, goal) => acc + goal.sum, 0n);
  const october = allEntries.filter((entry) => entry.date.startsWith('2026-10'));
  const deposits = october.filter((entry) => entry.amount > 0).reduce((acc, entry) => acc + BigInt(entry.amount), 0n);
  const withdrawals = october.filter((entry) => entry.amount < 0).reduce((acc, entry) => acc - BigInt(entry.amount), 0n);
  const stats = must(await readSavingsStatistics(f.db, PRO, TODAY as CivilDate), 'statistics');
  equal(stats.totalMinor, total, 'statistics total');
  equal(stats.month.depositsMinor, deposits, 'October deposits');
  equal(stats.month.withdrawalsMinor, withdrawals, 'October withdrawals');
  equal(stats.completedGoalCount, f.finishedGoalIds.length, 'completed goals');
  const lastDay = stats.daily[stats.daily.length - 1];
  equal(lastDay?.balanceMinor, total, 'last daily balance equals the total');

  // The formatted total carries exactly the stored minor units for this currency's exponent.
  const formatted = formatMoney(total, currency, { locale: 'en-US' });
  equal(formatted.replace(/[^0-9]/g, ''), total.toString(), `formatted total ${formatted}`);
  return { entries: allEntries.length, totalMinor: total.toString(), formatted };
}

function fixtureFacts(f: Fixture) {
  return {
    goals: f.goals.length,
    entries: f.goals.reduce((acc, goal) => acc + goal.entries.length, 0),
    heavyGoalEntries: f.heavy.entries.length,
    weeklyAttempts: f.weeklyAttempts,
    souvenirs: f.souvenirGoalIds.length,
    completedGoals: f.finishedGoalIds.length,
    seedMs: f.seedMs,
  };
}

export const PERFORMANCE_SCENARIOS: Scenario[] = [
  {
    id: 'PF01',
    title: '10,000 entries, 8 Pro goals, a year of weekly quests (EUR): exact totals and timed reads and writes',
    run: (context) =>
      withSession(context, async (s) => {
        const eur = getCurrency('EUR') as CurrencyMetadata;
        const f = await buildFixture(s, { label: 'perf', currency: eur, perGoal: [7000, 600, 500, 450, 400, 400, 350, 300], weeklyQuests: true });
        const totals = await checkTotals(f, eur);
        equal(totals.entries, 10_004, 'fixture size (10,000 seeded + 4 funding deposits)');

        const size = await f.db.read(async (r) => {
          const pages = await r.get<{ page_count: number }>('PRAGMA page_count');
          const pageSize = await r.get<{ page_size: number }>('PRAGMA page_size');
          return Number(pages?.page_count) * Number(pageSize?.page_size);
        });

        // Launch: open the existing database (migration check, pragmas) and read the first snapshot.
        await f.db.close();
        let db = f.db;
        const open = await time(3, async () => {
          db = await s.openDb(f.name, undefined, f.clock);
          await db.close();
        });
        db = await s.openDb(f.name, undefined, f.clock);
        const firstSnapshot = await time(1, () => readSnapshot(db));
        const snapshot = await time(5, () => readSnapshot(db));
        // The whole ledger of the heavy goal, as every ledger command and the Edit Entry form read it.
        const history = await time(5, async () => {
          const ledger = await readGoalLedger(db, f.heavy.goalId);
          check(ledger && ledger.entries.length === f.heavy.entries.length, 'history rows');
          newestFirst(ledger.entries);
        });
        // What History reads since Phase 21: the newest 100 rows plus the count and balance in SQL.
        const historyPage = await time(5, async () => {
          const page = await readHistoryPage(db, f.heavy.goalId, 100);
          check(page && page.entries.length === 100 && page.entryCount === f.heavy.entries.length, 'history page');
          equal(BigInt(page.balanceMinor), f.heavy.sum, 'history page balance');
        });
        const smallHistory = await time(5, () => readGoalLedger(db, f.goals[7]?.goalId ?? ''));
        const statistics = await time(5, () => readSavingsStatistics(db, PRO, TODAY as CivilDate));
        const board = await time(5, async () => {
          const result = await readChallengeBoard(db, f.heavy.goalId, f.clock);
          check(result, 'quest board');
        });

        // Writes on the heavy goal: each runs the full chronological check and settles 52 quests.
        let op = 0;
        const deps = { db, clock: f.clock, ids: { newId: () => `perf-w-${(op += 1)}` }, capabilities: PRO };
        const createdIds: { id: string; revision: number }[] = [];
        const create = await time(5, async () => {
          const saved = must(
            await createEntry(deps, { operationId: `perf-op-${(op += 1)}`, goalId: f.heavy.goalId, kind: 'deposit', amountMinor: 1_234, entryDate: TODAY, note: null }),
            'timed deposit',
          );
          createdIds.push({ id: saved.entryId, revision: saved.entryRevision ?? 1 });
        });
        const oldest = f.heavy.entries[0];
        check(oldest, 'oldest entry');
        let revision = 1;
        const correct = await time(4, async () => {
          const saved = must(
            await correctEntry(deps, {
              operationId: `perf-op-${(op += 1)}`,
              entryId: oldest.id,
              expectedRevision: revision,
              kind: 'deposit',
              amountMinor: oldest.amount + (revision % 2 === 1 ? 1 : 0),
              entryDate: oldest.date,
              note: oldest.note,
            }),
            'timed correction of the oldest entry',
          );
          revision = saved.entryRevision ?? revision + 1;
        });
        const remove = await time(5, async () => {
          const target = createdIds.pop();
          check(target, 'entry to delete');
          must(
            await deleteEntry(deps, { operationId: `perf-op-${(op += 1)}`, entryId: target.id, expectedRevision: target.revision, confirmed: true }),
            'timed deletion',
          );
        });
        const smallGoal = f.goals[5];
        check(smallGoal, 'small goal');
        const smallCreate = await time(5, () =>
          createEntry(deps, { operationId: `perf-op-${(op += 1)}`, goalId: smallGoal.goalId, kind: 'deposit', amountMinor: 100, entryDate: TODAY, note: null }),
        );

        // The four corrections returned the oldest entry to its amount and every timed deposit on the
        // heavy goal was deleted again, so only the five small-goal deposits changed the total.
        const after = must(await readSavingsStatistics(db, PRO, TODAY as CivilDate), 'statistics after');
        equal(after.totalMinor, BigInt(totals.totalMinor as string) + 500n, 'total after the timed writes');
        const integrity = await db.read((r) => r.get<{ quick_check: string }>('PRAGMA quick_check'));
        equal(integrity?.quick_check, 'ok', 'quick_check');

        const reads = { firstSnapshot, snapshot, history, historyPage, smallHistory, statistics, board };
        const writes = { create, correct, remove, smallCreate };
        for (const [label, timing] of Object.entries(reads)) withinCeiling(label, timing, READ_CEILING_MS);
        for (const [label, timing] of Object.entries(writes)) withinCeiling(label, timing, WRITE_CEILING_MS);
        withinCeiling('open', open, READ_CEILING_MS);
        return { fixture: fixtureFacts(f), databaseBytes: size, totals, open, reads, writes };
      }),
  },
  {
    id: 'PF02',
    title: 'Whole-app JPY fixture (0 decimals): 2,000 entries keep exact totals, statistics and formatting',
    run: (context) =>
      withSession(context, async (s) => {
        const jpy = getCurrency('JPY') as CurrencyMetadata;
        equal(jpy.exponent, 0, 'JPY exponent');
        const f = await buildFixture(s, { label: 'jpy', currency: jpy, perGoal: [1200, 300, 200, 150, 150], weeklyQuests: false });
        return { fixture: fixtureFacts(f), totals: await checkTotals(f, jpy) };
      }),
  },
  {
    id: 'PF03',
    title: 'Whole-app BHD fixture (3 decimals): 2,000 entries keep exact totals, statistics and formatting',
    run: (context) =>
      withSession(context, async (s) => {
        const bhd = getCurrency('BHD') as CurrencyMetadata;
        equal(bhd.exponent, 3, 'BHD exponent');
        const f = await buildFixture(s, { label: 'bhd', currency: bhd, perGoal: [1200, 300, 200, 150, 150], weeklyQuests: false });
        return { fixture: fixtureFacts(f), totals: await checkTotals(f, bhd) };
      }),
  },
];
