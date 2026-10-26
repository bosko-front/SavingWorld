import type { Clock } from '@/core/calendar';
import { LATEST_SCHEMA_VERSION, MIGRATIONS } from '@/data/db/migrations';
import { getAttempt, listAttemptsForGoal, type ChallengeAttemptRecord } from '@/data/repositories/challenge-attempt-repository';
import { getGoal } from '@/data/repositories/goal-repository';
import { closeEndedAttempts, skipChallenge, startChallenge } from '@/features/challenges/application/challenge-commands';
import { readChallengeBoard } from '@/features/challenges/application/challenge-queries';
import { editGoal } from '@/features/goals/application/goal-commands';
import { correctEntry, createEntry, deleteEntry } from '@/features/ledger/application/ledger-commands';

import { count, expectError, START, values, withSession, type Harness, type Session } from './database-scenarios';
import { check, equal, rejects, type Scenario } from './scenario-harness';

// Phase 12 scenarios: the three fixed challenges and their attempts (docs/TEST_PLAN.md T11, T12,
// T28; v1.2 section 7 "Tri gotova izazova" and section 10 "Izazovi"). Same dual use as
// database-scenarios.ts: the iOS simulator through real Expo SQLite (`npm run test:db`, the
// evidence) and Jest on host SQLite. The harness goal is "Summer trip", target €1,000.00
// (100_000 minor), no deadline, Island, Free. 21 October 2026 is a Wednesday; Belgrade leaves
// summer time on Sunday 25 October, so that week ends at 2026-10-25T23:00Z.

type MovableClock = Clock & { at(iso: string): void; zone(timeZone: string): void };

// Advances one second per reading (createdAt strictly increases) and can jump to any instant or
// zone, like a person travelling or the week passing.
function movableClock(startIso: string, timeZone = 'Europe/Belgrade'): MovableClock {
  let t = Date.parse(startIso);
  let zone = timeZone;
  return {
    nowMs: () => (t += 1000),
    timeZone: () => zone,
    at: (iso) => {
      t = Date.parse(iso);
    },
    zone: (next) => {
      zone = next;
    },
  };
}

const WEDNESDAY = '2026-10-21T08:00:00.000Z';

async function setup(s: Session, label: string, startIso = WEDNESDAY) {
  const clock = movableClock(startIso);
  const h = await s.harness(label, { clock });
  return { h, clock };
}

async function start(h: Harness, ruleId: ChallengeAttemptRecord['ruleId'], operationId = h.op()) {
  return startChallenge(h.deps, { operationId, goalId: h.goalId, ruleId });
}

async function mustStart(h: Harness, ruleId: ChallengeAttemptRecord['ruleId']): Promise<string> {
  const started = await start(h, ruleId);
  check(started.ok && !started.value.replayed, `start ${ruleId}: ${JSON.stringify(started)}`);
  return started.value.attemptId;
}

async function attempt(h: Harness, id: string): Promise<ChallengeAttemptRecord> {
  const row = await h.db.read((r) => getAttempt(r, id));
  check(row, `attempt ${id} missing`);
  return row;
}

async function outcome(h: Harness, id: string) {
  const row = await attempt(h, id);
  return { state: row.state, result: row.result, historicalAtUtc: row.historicalAtUtc };
}

async function activeCount(h: Harness): Promise<number> {
  return Number((await h.db.read((r) => r.get<{ n: number }>("SELECT count(*) AS n FROM challenge_attempts WHERE state = 'active'")))?.n);
}

async function board(h: Harness) {
  const value = await readChallengeBoard(h.db, h.goalId, h.clock);
  check(value, 'board missing');
  return value;
}

async function progressOf(h: Harness): Promise<unknown> {
  return (await board(h)).current?.progress ?? null;
}

async function entry(h: Harness, kind: 'deposit' | 'withdrawal', amount: number, date: string, operationId = h.op()) {
  const result = await createEntry(h.deps, { operationId, goalId: h.goalId, ...values(kind, amount, date) });
  check(result.ok, `${kind} ${amount} ${date}: ${JSON.stringify(result)}`);
  return result.value;
}

async function correct(h: Harness, entryId: string, expectedRevision: number, amount: number, date: string) {
  const result = await correctEntry(h.deps, { operationId: h.op(), entryId, expectedRevision, ...values('deposit', amount, date) });
  check(result.ok, `correct ${entryId}: ${JSON.stringify(result)}`);
  return result.value;
}

async function editDetails(h: Harness, targetMinor: number, deadlineDate: string | null) {
  const goal = await h.db.read((r) => getGoal(r, h.goalId));
  check(goal, 'goal missing');
  const edited = await editGoal(h.deps, {
    operationId: h.op(),
    goalId: h.goalId,
    expectedRevision: goal.revision,
    title: goal.title,
    targetMinor,
    deadlineDate,
    themeId: goal.themeId,
  });
  check(edited.ok, `edit goal: ${JSON.stringify(edited)}`);
}

function unavailableReason(result: { ok: boolean; error?: unknown }): string | undefined {
  check(!result.ok, 'expected the start to be refused');
  const error = result.error as { code?: string; reason?: string };
  equal(error.code, 'challenge_unavailable', 'refusal code');
  return error.reason;
}

const ATTEMPT_INSERT = `INSERT INTO challenge_attempts (id, goal_id, rule_id, target_minor, milestone_stage, started_at_utc,
  start_date, week_start_date, period_end_date, period_end_at_utc, period_timezone, state, result, historical_at_utc)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

export const CHALLENGE_SCENARIOS: Scenario[] = [
  {
    id: 'H01',
    title: 'Schema 4 defends attempts: one active per goal, First step once, Weekly once a week, frozen contract, no reactivation',
    run: (context) =>
      withSession(context, async (s) => {
        const { h } = await setup(s, 'h01');
        const write = (sql: string, params: (string | number | null)[] = []) => h.db.write((tx) => tx.run(sql, params));
        const week = ['2026-10-19', '2026-10-25', '2026-10-25T23:00:00.000Z', 'Europe/Belgrade'] as const;
        await write(ATTEMPT_INSERT, ['a1', h.goalId, 'first_step', null, null, START, '2026-10-23', null, null, null, 'Europe/Belgrade', 'active', null, null]);
        await rejects(
          write(ATTEMPT_INSERT, ['a2', h.goalId, 'next_milestone', 100, 1, START, '2026-10-23', null, null, null, 'Europe/Belgrade', 'active', null, null]),
          /UNIQUE/i,
          'second active attempt',
        );
        await write("UPDATE challenge_attempts SET state = 'historical', result = 'skipped', historical_at_utc = ? WHERE id = 'a1'", [START]);
        await rejects(
          write(ATTEMPT_INSERT, ['a3', h.goalId, 'first_step', null, null, START, '2026-10-23', null, null, null, 'Europe/Belgrade', 'active', null, null]),
          /UNIQUE/i,
          'First step twice',
        );
        await write(ATTEMPT_INSERT, ['w1', h.goalId, 'weekly_step', 500, null, START, '2026-10-23', ...week, 'historical', 'not_completed', week[2]]);
        await rejects(
          write(ATTEMPT_INSERT, ['w2', h.goalId, 'weekly_step', 500, null, START, '2026-10-24', ...week, 'active', null, null]),
          /UNIQUE/i,
          'Weekly step twice in one week',
        );
        await rejects(
          write(ATTEMPT_INSERT, ['b1', h.goalId, 'first_step', 100, null, START, '2026-10-23', null, null, null, 'Europe/Belgrade', 'active', null, null]),
          /CHECK/i,
          'First step has no money target',
        );
        await rejects(
          write(ATTEMPT_INSERT, ['b2', h.goalId, 'weekly_step', 500, null, START, '2026-10-23', null, null, null, 'Europe/Belgrade', 'active', null, null]),
          /CHECK/i,
          'Weekly step needs its saved week',
        );
        await rejects(
          write(ATTEMPT_INSERT, ['b3', h.goalId, 'next_milestone', 0, 1, START, '2026-10-23', null, null, null, 'Europe/Belgrade', 'active', null, null]),
          /CHECK/i,
          'positive frozen target',
        );
        await rejects(
          write(ATTEMPT_INSERT, ['b4', h.goalId, 'next_milestone', 100, 1, START, '2026-10-23', null, null, null, 'Europe/Belgrade', 'active', 'completed', null]),
          /CHECK/i,
          'an active attempt has no result',
        );
        await rejects(write("UPDATE challenge_attempts SET target_minor = 600 WHERE id = 'w1'"), /keeps its rule, target and period/, 'frozen target');
        await rejects(write("UPDATE challenge_attempts SET period_timezone = 'Asia/Tokyo' WHERE id = 'w1'"), /keeps its rule, target and period/, 'saved zone');
        await rejects(
          write("UPDATE challenge_attempts SET state = 'active', result = NULL, historical_at_utc = NULL WHERE id = 'w1'"),
          /stays historical/,
          'no reactivation',
        );
        await rejects(write("UPDATE challenge_attempts SET result = 'completed' WHERE id = 'a1'"), /stays historical/, 'Skipped stays Skipped');
        await rejects(write("UPDATE challenge_attempts SET result = 'skipped' WHERE id = 'w1'"), /stays historical/, 'a result never becomes Skipped');
        await rejects(write('UPDATE challenge_attempts SET historical_at_utc = ? WHERE id = ?', [START, 'w1']), /stays historical/, 'end time kept');
        await write("UPDATE challenge_attempts SET result = 'completed' WHERE id = 'w1'");
        await rejects(write('DELETE FROM goals WHERE id = ?', [h.goalId]), /FOREIGN KEY/i, 'no goal deletion under its attempts');
        await write("UPDATE goals SET status = 'completed', revision = revision + 1 WHERE id = ?", [h.goalId]);
        await rejects(
          write(ATTEMPT_INSERT, ['c1', h.goalId, 'next_milestone', 100, 1, START, '2026-10-23', null, null, null, 'Europe/Belgrade', 'active', null, null]),
          /goal is closed/,
          'no attempt on a completed goal',
        );
        equal(await h.db.read((r) => count(r, 'challenge_attempts')), 2, 'only the two valid rows exist');
      }),
  },
  {
    id: 'H02',
    title: 'First step: one counted deposit after start completes it; it never starts twice; deleting it gives Not completed',
    run: (context) =>
      withSession(context, async (s) => {
        const { h } = await setup(s, 'h02');
        await entry(h, 'deposit', 1_000, '2026-10-21');
        const id = await mustStart(h, 'first_step');
        const row = await attempt(h, id);
        equal(
          [row.ruleId, row.targetMinor, row.startDate, row.periodEndDate, row.periodTimezone, row.state],
          ['first_step', null, '2026-10-21', null, 'Europe/Belgrade', 'active'],
          'stored contract',
        );
        equal(await progressOf(h), { kind: 'first_deposit', met: false }, 'a deposit made before the start does not count');
        await entry(h, 'deposit', 1_000, '2026-10-20');
        equal(await progressOf(h), { kind: 'first_deposit', met: false }, 'a deposit dated before the start date does not count');
        const withdrawal = await entry(h, 'withdrawal', 500, '2026-10-21');
        equal(withdrawal.completedAttemptId, null, 'a withdrawal is no deposit');
        const op = h.op();
        const completing = await entry(h, 'deposit', 2_000, '2026-10-21', op);
        equal(completing.completedAttemptId, id, 'the deposit completes First step');
        const completed = await attempt(h, id);
        equal([completed.state, completed.result], ['historical', 'completed'], 'Completed');
        check(completed.historicalAtUtc !== null && completed.historicalAtUtc > completed.startedAtUtc, 'ended when the deposit was saved');
        const replay = await createEntry(h.deps, { operationId: op, goalId: h.goalId, ...values('deposit', 2_000, '2026-10-21') });
        check(replay.ok && replay.value.replayed && replay.value.completedAttemptId === null, 'a retry replays without a second completion');
        equal(unavailableReason(await start(h, 'first_step')), 'already_used', 'First step once per goal');

        const removed = await deleteEntry(h.deps, { operationId: h.op(), entryId: completing.entryId, expectedRevision: 1, confirmed: true });
        check(removed.ok && removed.value.completedAttemptId === null, 'delete the completing deposit');
        const after = await attempt(h, id);
        equal([after.state, after.result], ['historical', 'not_completed'], 'recalculated, still historical');
        const shown = await board(h);
        equal(shown.current, null, 'the historical attempt does not take the current slot');
        equal(shown.history.map((view) => [view.id, view.result]), [[id, 'not_completed']], 'history kept');
        equal(unavailableReason(await start(h, 'first_step')), 'already_used', 'still once per goal');
        check((await start(h, 'next_milestone')).ok, 'another fixed rule can start');
        equal(await h.db.read((r) => count(r, 'ledger_entries')), 3, 'challenges created no entry');
      }),
  },
  {
    id: 'H03',
    title: 'Next milestone: frozen threshold target and milestone, net progress with withdrawals, tiny targets, goal edits do not rewrite it',
    run: (context) =>
      withSession(context, async (s) => {
        const { h } = await setup(s, 'h03');
        await entry(h, 'deposit', 25_000, '2026-10-21');
        const id = await mustStart(h, 'next_milestone');
        const row = await attempt(h, id);
        // B = 250.00 of 1,000.00: stage 2; threshold ceil(100000 × 3 / 10) = 30,000; target 5,000.
        equal([row.targetMinor, row.milestoneStage, row.periodEndDate], [5_000, 3, null], 'frozen target and milestone');
        await editDetails(h, 200_000, '2026-12-31');
        equal([(await attempt(h, id)).targetMinor, (await attempt(h, id)).milestoneStage], [5_000, 3], 'a goal edit keeps the started target');
        await entry(h, 'deposit', 3_000, '2026-10-21');
        await entry(h, 'withdrawal', 4_000, '2026-10-21');
        equal(
          await progressOf(h),
          { kind: 'amount', targetMinor: 5_000, progressMinor: 0, remainingMinor: 5_000, met: false },
          'net progress never below zero',
        );
        const done = await entry(h, 'deposit', 6_000, '2026-10-21');
        equal(done.completedAttemptId, id, 'net 5,000 completes it');
        // B = 30,000 of 200,000: stage 1; next threshold 40,000.
        const next = (await board(h)).offers.find((offer) => offer.ruleId === 'next_milestone')?.availability;
        equal(next, { available: true, preview: { ruleId: 'next_milestone', targetMinor: 10_000, thresholdMinor: 40_000, milestoneStage: 2 } }, 'next offer');
        await editDetails(h, 30_000, '2026-12-31');
        equal(unavailableReason(await start(h, 'next_milestone')), 'target_reached', 'only below the target');

        // Tiny target 0.03: thresholds 1, 2, 3 minor units reach stages 3, 6 and 10.
        const tiny = await setup(s, 'h03-tiny');
        const t = tiny.h;
        await editDetails(t, 3, null);
        const expected = [
          [1, 1],
          [1, 4],
          [1, 7],
        ];
        for (const [target, milestone] of expected) {
          const tinyId = await mustStart(t, 'next_milestone');
          const tinyRow = await attempt(t, tinyId);
          equal([tinyRow.targetMinor, tinyRow.milestoneStage], [target, milestone], `tiny threshold for milestone ${milestone}`);
          equal((await entry(t, 'deposit', 1, '2026-10-21')).completedAttemptId, tinyId, 'one minor unit completes it');
        }
        equal(unavailableReason(await start(t, 'next_milestone')), 'target_reached', 'funded at 0.03');
      }),
  },
  {
    id: 'H04',
    title: 'Weekly step: frozen estimate, saved Monday-Sunday week and zone, travel, late backdated record, corrections, expiry, once a week',
    run: (context) =>
      withSession(context, async (s) => {
        const { h, clock } = await setup(s, 'h04');
        equal(unavailableReason(await start(h, 'weekly_step')), 'no_deadline', 'needs a deadline');
        await editDetails(h, 100_000, '2026-11-19');
        await entry(h, 'deposit', 5_000, '2026-10-21');
        const id = await mustStart(h, 'weekly_step');
        const row = await attempt(h, id);
        // R = 95,000, D = 21 Oct..19 Nov inclusive = 30: ceil(95000 × 7 / 30) = 22,167.
        equal(
          [row.targetMinor, row.startDate, row.weekStartDate, row.periodEndDate, row.periodEndAtUtc, row.periodTimezone],
          [22_167, '2026-10-21', '2026-10-19', '2026-10-25', '2026-10-25T23:00:00.000Z', 'Europe/Belgrade'],
          'midweek start ends that Sunday, at Monday 00:00 CET after the DST change',
        );
        await entry(h, 'deposit', 10_000, '2026-10-20');
        const counted = await entry(h, 'deposit', 10_000, '2026-10-21');
        await entry(h, 'withdrawal', 3_000, '2026-10-21');
        equal(await progressOf(h), { kind: 'amount', targetMinor: 22_167, progressMinor: 7_000, remainingMinor: 15_167, met: false }, 'counted net');
        await editDetails(h, 300_000, '2026-12-31');
        const frozen = await attempt(h, id);
        equal([frozen.targetMinor, frozen.periodEndDate, frozen.periodEndAtUtc], [22_167, '2026-10-25', '2026-10-25T23:00:00.000Z'], 'goal edit keeps target and week');

        // Travel to Honolulu on Sunday: the saved week and zone stay; still one current attempt.
        clock.zone('Pacific/Honolulu');
        clock.at('2026-10-25T20:00:00.000Z');
        equal(unavailableReason(await start(h, 'weekly_step')), 'attempt_active', 'travel does not create a second one');
        await entry(h, 'deposit', 1_000, '2026-10-25');
        equal(((await progressOf(h)) as { progressMinor: number }).progressMinor, 8_000, 'Sunday in Honolulu before the saved end counts');
        equal((await attempt(h, id)).periodEndAtUtc, '2026-10-25T23:00:00.000Z', 'travel never moves the saved end');

        // After the saved end (Monday 00:30 in Belgrade, still Sunday in Honolulu).
        clock.at('2026-10-25T23:30:00.000Z');
        const shown = await board(h);
        equal([shown.current, shown.history[0]?.result, shown.history[0]?.historicalAtUtc], [null, 'not_completed', '2026-10-25T23:00:00.000Z'], 'read as ended');
        const late = await entry(h, 'deposit', 20_000, '2026-10-25');
        equal(late.completedAttemptId, null, 'a record created after the week ended cannot finish it, even dated inside it');
        equal(await outcome(h, id), { state: 'historical', result: 'not_completed', historicalAtUtc: '2026-10-25T23:00:00.000Z' }, 'Not completed at the saved end');
        equal(unavailableReason(await start(h, 'weekly_step')), 'used_this_week', 'once per calendar week, also after travel');

        const raised = await correct(h, counted.entryId, 1, 30_000, '2026-10-21');
        equal(raised.completedAttemptId, null, 'a historical result change is not a new completion');
        equal(await outcome(h, id), { state: 'historical', result: 'completed', historicalAtUtc: '2026-10-25T23:00:00.000Z' }, 'correcting a counted record can complete it');
        await correct(h, counted.entryId, 2, 10_000, '2026-10-21');
        equal((await attempt(h, id)).result, 'not_completed', 'and correct it back');
        equal(await activeCount(h), 0, 'never reactivated');

        // Next week in Belgrade: a new Weekly step with the estimate of that moment.
        clock.zone('Europe/Belgrade');
        clock.at('2026-10-27T09:00:00.000Z');
        const second = await mustStart(h, 'weekly_step');
        const secondRow = await attempt(h, second);
        // B = 43,000 of 300,000: R = 257,000; D = 27 Oct..31 Dec = 66: ceil(257000 × 7 / 66) = 27,258.
        equal(
          [secondRow.targetMinor, secondRow.weekStartDate, secondRow.periodEndDate, secondRow.periodEndAtUtc],
          [27_258, '2026-10-26', '2026-11-01', '2026-11-01T23:00:00.000Z'],
          'next week',
        );
        clock.at('2026-11-02T08:00:00.000Z');
        const closed = await closeEndedAttempts(h.deps);
        check(closed.ok && closed.value.goalsChanged === 1, 'foreground closes the ended week');
        equal(await outcome(h, second), { state: 'historical', result: 'not_completed', historicalAtUtc: '2026-11-01T23:00:00.000Z' }, 'expired unsuccessful week');
        const again = await closeEndedAttempts(h.deps);
        check(again.ok && again.value.goalsChanged === 0, 'nothing left to close');
        return { firstWeekEnd: row.periodEndAtUtc, secondWeekEnd: secondRow.periodEndAtUtc };
      }),
  },
  {
    id: 'H05',
    title: 'Competing starts, retries, Skip, and rollback of a start or of a ledger change together with its challenge result',
    run: (context) =>
      withSession(context, async (s) => {
        const { h } = await setup(s, 'h05');
        const [a, b] = await Promise.all([start(h, 'first_step'), start(h, 'next_milestone')]);
        const winners = [a, b].filter((result) => result.ok);
        equal(winners.length, 1, 'exactly one competing start commits');
        const loser = [a, b].find((result) => !result.ok);
        check(loser, 'one start is refused');
        equal(unavailableReason(loser), 'attempt_active', 'the other sees the active attempt');
        equal(await activeCount(h), 1, 'one unfinished attempt');
        const winner = winners[0];
        check(winner?.ok, 'winner');
        const winnerOp = winner.value.operationId;
        const winnerRule = (await attempt(h, winner.value.attemptId)).ruleId;
        const replay = await start(h, winnerRule, winnerOp);
        check(replay.ok && replay.value.replayed && replay.value.attemptId === winner.value.attemptId, 'the same operation ID replays');
        expectError(await start(h, winnerRule === 'first_step' ? 'next_milestone' : 'first_step', winnerOp), 'operation_conflict', 'changed payload');

        const skipOp = h.op();
        h.hooks.failBeforeCommit = true;
        expectError(await skipChallenge(h.deps, { operationId: skipOp, attemptId: winner.value.attemptId }), 'storage_failure', 'failed skip');
        h.hooks.failBeforeCommit = false;
        equal((await attempt(h, winner.value.attemptId)).state, 'active', 'a failed skip changes nothing');
        const skipped = await skipChallenge(h.deps, { operationId: skipOp, attemptId: winner.value.attemptId });
        check(skipped.ok && !skipped.value.replayed, 'skip');
        equal([(await attempt(h, winner.value.attemptId)).state, (await attempt(h, winner.value.attemptId)).result], ['historical', 'skipped'], 'Skipped');
        const skipReplay = await skipChallenge(h.deps, { operationId: skipOp, attemptId: winner.value.attemptId });
        check(skipReplay.ok && skipReplay.value.replayed, 'skip replays');
        expectError(await skipChallenge(h.deps, { operationId: h.op(), attemptId: winner.value.attemptId }), 'attempt_not_active', 'skip twice');

        const startOp = h.op();
        const attemptsBefore = await h.db.read((r) => count(r, 'challenge_attempts'));
        h.hooks.failBeforeCommit = true;
        expectError(await start(h, 'next_milestone', startOp), 'storage_failure', 'failed start');
        h.hooks.failBeforeCommit = false;
        equal(await h.db.read((r) => count(r, 'challenge_attempts')), attemptsBefore, 'a failed start leaves no attempt');
        const started = await start(h, 'next_milestone', startOp);
        check(started.ok && !started.value.replayed, 'the retry starts it');
        const id = started.value.attemptId;

        // A real SQLite failure while writing the challenge result rolls the entry back with it.
        await h.db.write((tx) =>
          tx.exec(`CREATE TEMP TRIGGER test_result_failure BEFORE UPDATE ON main.challenge_attempts
                   BEGIN SELECT RAISE(ABORT, 'injected result failure'); END;`),
        );
        const depositOp = h.op();
        const failed = await createEntry(h.deps, { operationId: depositOp, goalId: h.goalId, ...values('deposit', 10_000, '2026-10-21') });
        expectError(failed, 'storage_failure', 'result write failure');
        equal(await h.db.read((r) => count(r, 'ledger_entries')), 0, 'no entry without its challenge result');
        equal((await attempt(h, id)).state, 'active', 'attempt unchanged');
        await h.db.write((tx) => tx.exec('DROP TRIGGER temp.test_result_failure;'));
        const retried = await createEntry(h.deps, { operationId: depositOp, goalId: h.goalId, ...values('deposit', 10_000, '2026-10-21') });
        check(retried.ok && !retried.value.replayed && retried.value.completedAttemptId === id, 'the retry saves both');
        equal(await h.db.read((r) => count(r, 'ledger_entries')), 1, 'one entry, counted once');
      }),
  },
  {
    id: 'H06',
    title: 'A Completed attempt corrected to Not completed and back stays historical while another attempt is current',
    run: (context) =>
      withSession(context, async (s) => {
        const { h } = await setup(s, 'h06');
        const first = await mustStart(h, 'next_milestone');
        const e = await entry(h, 'deposit', 10_000, '2026-10-21');
        equal(e.completedAttemptId, first, 'Next milestone completed');
        const current = await mustStart(h, 'first_step');
        const lowered = await correct(h, e.entryId, 1, 4_000, '2026-10-21');
        equal(lowered.completedAttemptId, null, 'no completion moment');
        equal([(await attempt(h, first)).state, (await attempt(h, first)).result], ['historical', 'not_completed'], 'corrected to Not completed');
        equal([(await attempt(h, current)).state, await activeCount(h)], ['active', 1], 'the current attempt keeps the slot');
        const shown = await board(h);
        equal([shown.current?.id, shown.history.map((view) => [view.id, view.result])], [current, [[first, 'not_completed']]], 'board');
        await correct(h, e.entryId, 2, 10_000, '2026-10-21');
        equal((await attempt(h, first)).result, 'completed', 'corrected back to Completed');
        equal(await activeCount(h), 1, 'still one current attempt');
        const d = await entry(h, 'deposit', 500, '2026-10-21');
        equal(d.completedAttemptId, current, 'the current First step completes on its own deposit');
        const attempts = await h.db.read((r) => listAttemptsForGoal(r, h.goalId));
        equal(attempts.map((row) => [row.ruleId, row.state, row.result]), [['next_milestone', 'historical', 'completed'], ['first_step', 'historical', 'completed']], 'history');
      }),
  },
  {
    id: 'H07',
    title: 'Schema 3 → 4 adds the empty attempts table and keeps every record',
    run: (context) =>
      withSession(context, async (s) => {
        const name = s.name('upgrade4');
        const old = await s.openDb(name, MIGRATIONS.slice(0, 3));
        await old.write(async (tx) => {
          await tx.run("INSERT INTO settings VALUES ('currency', ?, ?)", ['{"code":"EUR","exponent":2,"registryVersion":1}', START]);
          await tx.run('INSERT INTO goals VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['g4', 'Bike', 50_000, null, 'island', 'active', START, START, 1]);
          await tx.run('INSERT INTO ledger_entries VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['e4', 'g4', 60_000, '2026-10-01', 'kept', START, START, 1]);
          await tx.run('INSERT INTO collectibles VALUES (?, ?, ?, ?, ?)', ['g4', 'island', 2, 50_000, START]);
        });
        await old.close();
        const clock = movableClock(WEDNESDAY);
        const db = await s.openDb(name, MIGRATIONS, clock);
        equal(
          db.migration,
          { fromVersion: 3, toVersion: LATEST_SCHEMA_VERSION, applied: MIGRATIONS.map((m) => m.version).filter((v) => v > 3) },
          'upgrade through schema 4',
        );
        const state = await db.read(async (r) => [
          await count(r, 'goals'),
          await count(r, 'ledger_entries'),
          await count(r, 'collectibles'),
          await count(r, 'challenge_attempts'),
        ]);
        equal(state, [1, 1, 1, 0], 'records kept, no attempts');
        equal((await db.read((r) => r.all('PRAGMA foreign_key_check'))).length, 0, 'foreign_key_check clean');
        const started = await startChallenge({ db, clock, ids: { newId: () => 'a4' } }, { operationId: 'op-upgrade4', goalId: 'g4', ruleId: 'first_step' });
        check(started.ok, 'an upgraded goal can start a challenge');
      }),
  },
];
