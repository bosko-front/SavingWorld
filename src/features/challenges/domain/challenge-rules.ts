import {
  addDays,
  deadlineEstimate,
  startOfCivilDateMs,
  utcTimestampAt,
  weekEndDate,
  weekStartDate,
  type CivilDate,
} from '@/core/calendar';
import { MAX_MINOR } from '@/core/money';
import { nextThresholdMinor, remainingMinor, stageFor, type Stage } from '@/core/progression';
import { err, ok, type Result } from '@/core/result';
import {
  CHALLENGE_RULE_IDS,
  type AttemptOutcome,
  type AttemptResult,
  type ChallengeAttemptRecord,
  type ChallengeRuleId,
} from '@/data/repositories/challenge-attempt-repository';
import type { GoalRecord } from '@/data/repositories/goal-repository';
import type { LedgerEntryRecord } from '@/data/repositories/ledger-repository';

// The three fixed challenges (v1.2 section 7 "Tri gotova izazova", docs/DATA_MODEL.md "Three fixed
// challenge rules"). Pure rules shared by Free and Pro; the commands apply them inside the
// serialized write transaction and the board query presents them, so no screen recomputes a rule.
//
//   First step      once per goal; met by one counted positive deposit; no end
//   Next milestone  only while B < T; target = ceil(T × (floor(10B/T) + 1) / 10) − B at start; no end
//   Weekly step     only with a deadline today or later and R > 0; target = the weekly estimate
//                   min(R, ceil(7R / D)) at start; at most once per goal and calendar week; ends at
//                   the end of that week's Sunday in the time zone saved at start
//
// A record counts for an attempt when it was created strictly after the attempt started, its
// entry date is from the start date through the saved period end (Weekly step), it was created
// before that week ended, and it was created no later than the moment the attempt became
// historical. So a record added after a week ended, even with an earlier date, never finishes that
// week, while correcting a record that counted can change the result. Progress is
// max(0, sum of counted signed amounts); First step looks for one counted deposit. Nothing here
// creates, links or copies an entry, and a historical attempt never becomes active again.

export type ChallengeEntry = Pick<LedgerEntryRecord, 'createdAtUtc' | 'entryDate' | 'signedAmountMinor'>;

export type ChallengeGoal = Pick<GoalRecord, 'status' | 'targetMinor' | 'deadlineDate'>;

// Why a fixed challenge cannot start now.
export type UnavailableReason =
  // The goal is completed (read-only until Reopen).
  | 'goal_closed'
  // The goal already has its one unfinished attempt.
  | 'attempt_active'
  // First step: this goal already had one, whatever its result.
  | 'already_used'
  // Next milestone or Weekly step: B ≥ T, nothing left to reach.
  | 'target_reached'
  // Weekly step: the goal has no deadline.
  | 'no_deadline'
  // Weekly step: the deadline is before today.
  | 'deadline_passed'
  // Weekly step: this goal already had one in the current calendar week.
  | 'used_this_week';

// What starting a rule now would freeze, shown before the person starts it.
export type AttemptPreview =
  | { ruleId: 'first_step' }
  | { ruleId: 'next_milestone'; targetMinor: number; thresholdMinor: number; milestoneStage: Stage }
  | { ruleId: 'weekly_step'; targetMinor: number; weekStartDate: CivilDate; periodEndDate: CivilDate };

export type Availability = { available: true; preview: AttemptPreview } | { available: false; reason: UnavailableReason };

export type AttemptProgress =
  | { kind: 'first_deposit'; met: boolean }
  // progressMinor = max(0, counted sum), capped at the money limit (never above any target);
  // remainingMinor = max(0, target − progress).
  | { kind: 'amount'; targetMinor: number; progressMinor: number; remainingMinor: number; met: boolean };

// The current values of the attempt's goal and the time of the decision.
export type RuleContext = {
  goal: ChallengeGoal;
  balanceMinor: number;
  // Every attempt of the goal, already settled for `nowUtc`.
  attempts: readonly ChallengeAttemptRecord[];
  // Today in the device's current time zone.
  today: CivilDate;
};

// --- Counting records ----------------------------------------------------------------------------

export function countsForAttempt(attempt: ChallengeAttemptRecord, entry: ChallengeEntry): boolean {
  // UTC timestamps share one fixed format, so text order is time order.
  if (!(entry.createdAtUtc > attempt.startedAtUtc)) {
    return false;
  }
  if (attempt.periodEndAtUtc !== null && !(entry.createdAtUtc < attempt.periodEndAtUtc)) {
    return false;
  }
  if (attempt.historicalAtUtc !== null && entry.createdAtUtc > attempt.historicalAtUtc) {
    return false;
  }
  if (entry.entryDate < attempt.startDate) {
    return false;
  }
  return attempt.periodEndDate === null || entry.entryDate <= attempt.periodEndDate;
}

export function attemptProgress(attempt: ChallengeAttemptRecord, entries: readonly ChallengeEntry[]): AttemptProgress {
  const counted = entries.filter((entry) => countsForAttempt(attempt, entry));
  if (attempt.ruleId === 'first_step' || attempt.targetMinor === null) {
    return { kind: 'first_deposit', met: counted.some((entry) => entry.signedAmountMinor > 0) };
  }
  const sum = counted.reduce((total, entry) => total + BigInt(entry.signedAmountMinor), 0n);
  const capped = sum <= 0n ? 0 : sum >= BigInt(MAX_MINOR) ? MAX_MINOR : Number(sum);
  const target = attempt.targetMinor;
  return {
    kind: 'amount',
    targetMinor: target,
    progressMinor: capped,
    remainingMinor: capped >= target ? 0 : target - capped,
    met: capped >= target,
  };
}

// --- Settling ------------------------------------------------------------------------------------

// The outcome an attempt has at `nowUtc` given the goal's saved entries:
// - active and met → historical Completed now;
// - active Weekly step whose week ended → historical at the week's end, Completed if the records
//   counted by then met it, otherwise Not completed;
// - historical Completed/Not completed → the result its counted records give now (a correction
//   can change it), staying historical with the same end time;
// - Skipped stays Skipped.
export function settleAttempt(
  attempt: ChallengeAttemptRecord,
  entries: readonly ChallengeEntry[],
  nowUtc: string,
): AttemptOutcome {
  if (attempt.state === 'historical') {
    if (attempt.result === 'skipped') {
      return { state: 'historical', result: 'skipped', historicalAtUtc: attempt.historicalAtUtc };
    }
    return { state: 'historical', result: resultFor(attempt, entries), historicalAtUtc: attempt.historicalAtUtc };
  }
  if (attempt.periodEndAtUtc !== null && nowUtc >= attempt.periodEndAtUtc) {
    const ended = { ...attempt, historicalAtUtc: attempt.periodEndAtUtc };
    return { state: 'historical', result: resultFor(ended, entries), historicalAtUtc: attempt.periodEndAtUtc };
  }
  if (attemptProgress(attempt, entries).met) {
    return { state: 'historical', result: 'completed', historicalAtUtc: nowUtc };
  }
  return { state: 'active', result: null, historicalAtUtc: null };
}

function resultFor(attempt: ChallengeAttemptRecord, entries: readonly ChallengeEntry[]): AttemptResult {
  return attemptProgress(attempt, entries).met ? 'completed' : 'not_completed';
}

export function outcomeChanged(attempt: ChallengeAttemptRecord, outcome: AttemptOutcome): boolean {
  return (
    attempt.state !== outcome.state || attempt.result !== outcome.result || attempt.historicalAtUtc !== outcome.historicalAtUtc
  );
}

export function settledAttempts(
  attempts: readonly ChallengeAttemptRecord[],
  entries: readonly ChallengeEntry[],
  nowUtc: string,
): ChallengeAttemptRecord[] {
  return attempts.map((attempt) => ({ ...attempt, ...settleAttempt(attempt, entries, nowUtc) }));
}

// --- Availability and start ----------------------------------------------------------------------

export function availability(ruleId: ChallengeRuleId, context: RuleContext): Availability {
  const { goal, balanceMinor, attempts, today } = context;
  if (goal.status === 'completed') {
    return unavailable('goal_closed');
  }
  if (attempts.some((attempt) => attempt.state === 'active')) {
    return unavailable('attempt_active');
  }
  switch (ruleId) {
    case 'first_step':
      return attempts.some((attempt) => attempt.ruleId === 'first_step')
        ? unavailable('already_used')
        : { available: true, preview: { ruleId } };
    case 'next_milestone': {
      const threshold = nextThresholdMinor(balanceMinor, goal.targetMinor);
      if (threshold === null || balanceMinor >= goal.targetMinor) {
        return unavailable('target_reached');
      }
      const milestoneStage = (stageFor(balanceMinor, goal.targetMinor) + 1) as Stage;
      return {
        available: true,
        preview: { ruleId, targetMinor: threshold - balanceMinor, thresholdMinor: threshold, milestoneStage },
      };
    }
    case 'weekly_step': {
      const estimate = deadlineEstimate({
        balanceMinor,
        targetMinor: goal.targetMinor,
        deadline: goal.deadlineDate,
        today,
      });
      if (estimate.kind === 'none') {
        return unavailable('no_deadline');
      }
      if (estimate.kind === 'funded' || remainingMinor(balanceMinor, goal.targetMinor) === 0) {
        return unavailable('target_reached');
      }
      if (estimate.kind === 'overdue') {
        return unavailable('deadline_passed');
      }
      const monday = weekStartDate(today);
      if (attempts.some((attempt) => attempt.ruleId === 'weekly_step' && attempt.weekStartDate === monday)) {
        return unavailable('used_this_week');
      }
      return {
        available: true,
        preview: { ruleId, targetMinor: estimate.weeklyMinor, weekStartDate: monday, periodEndDate: weekEndDate(today) },
      };
    }
  }
}

function unavailable(reason: UnavailableReason): Availability {
  return { available: false, reason };
}

export type StartRequest = {
  id: string;
  goalId: string;
  ruleId: ChallengeRuleId;
  startedAtUtc: string;
  // The device's current zone; saved, so later travel never moves the period.
  timeZone: string;
};

// The new attempt's frozen contract, or why the rule is not available.
export function planAttempt(request: StartRequest, context: RuleContext): Result<ChallengeAttemptRecord, UnavailableReason> {
  const offer = availability(request.ruleId, context);
  if (!offer.available) {
    return err(offer.reason);
  }
  const base: ChallengeAttemptRecord = {
    id: request.id,
    goalId: request.goalId,
    ruleId: request.ruleId,
    targetMinor: null,
    milestoneStage: null,
    startedAtUtc: request.startedAtUtc,
    startDate: context.today,
    weekStartDate: null,
    periodEndDate: null,
    periodEndAtUtc: null,
    periodTimezone: request.timeZone,
    state: 'active',
    result: null,
    historicalAtUtc: null,
  };
  const { preview } = offer;
  switch (preview.ruleId) {
    case 'first_step':
      return ok(base);
    case 'next_milestone':
      return ok({ ...base, targetMinor: preview.targetMinor, milestoneStage: preview.milestoneStage });
    case 'weekly_step':
      return ok({
        ...base,
        targetMinor: preview.targetMinor,
        weekStartDate: preview.weekStartDate,
        periodEndDate: preview.periodEndDate,
        // Monday 00:00 after the saved Sunday, in the saved zone.
        periodEndAtUtc: utcTimestampAt(startOfCivilDateMs(addDays(preview.periodEndDate, 1), request.timeZone)),
      });
  }
}

// --- Board view (Phase 13 quest cards) -----------------------------------------------------------

export type AttemptView = {
  id: string;
  ruleId: ChallengeRuleId;
  state: ChallengeAttemptRecord['state'];
  result: AttemptResult | null;
  progress: AttemptProgress;
  // Next milestone: the stage it aims at (frozen at start).
  milestoneStage: Stage | null;
  startedAtUtc: string;
  startDate: CivilDate;
  // Weekly step: the saved week and zone; the attempt ends at `periodEndAtUtc`.
  weekStartDate: CivilDate | null;
  periodEndDate: CivilDate | null;
  periodEndAtUtc: string | null;
  periodTimezone: string;
  historicalAtUtc: string | null;
};

export type ChallengeOffer = { ruleId: ChallengeRuleId; availability: Availability };

export type ChallengeBoard = {
  // The one unfinished attempt, if any.
  current: AttemptView | null;
  // The three fixed rules in catalog order, each with its availability now.
  offers: ChallengeOffer[];
  // Completed, Not completed and Skipped attempts, most recently ended first.
  history: AttemptView[];
};

export type BoardInput = RuleContext & { entries: readonly ChallengeEntry[]; nowUtc: string };

// Everything the challenge screens show for one goal, settled for `nowUtc`, so a week that ended
// while the app was closed already reads Not completed before any command writes it.
export function challengeBoard(input: BoardInput): ChallengeBoard {
  const attempts = settledAttempts(input.attempts, input.entries, input.nowUtc);
  const views = attempts.map((attempt) => attemptView(attempt, input.entries));
  const context: RuleContext = { ...input, attempts };
  const history = views
    .filter((view) => view.state === 'historical')
    .sort((a, b) => compareText(b.historicalAtUtc ?? '', a.historicalAtUtc ?? '') || compareText(b.startedAtUtc, a.startedAtUtc));
  return {
    current: views.find((view) => view.state === 'active') ?? null,
    offers: CHALLENGE_RULE_IDS.map((ruleId) => ({ ruleId, availability: availability(ruleId, context) })),
    history,
  };
}

function attemptView(attempt: ChallengeAttemptRecord, entries: readonly ChallengeEntry[]): AttemptView {
  return {
    id: attempt.id,
    ruleId: attempt.ruleId,
    state: attempt.state,
    result: attempt.result,
    progress: attemptProgress(attempt, entries),
    milestoneStage: attempt.milestoneStage === null ? null : (attempt.milestoneStage as Stage),
    startedAtUtc: attempt.startedAtUtc,
    startDate: attempt.startDate,
    weekStartDate: attempt.weekStartDate,
    periodEndDate: attempt.periodEndDate,
    periodEndAtUtc: attempt.periodEndAtUtc,
    periodTimezone: attempt.periodTimezone,
    historicalAtUtc: attempt.historicalAtUtc,
  };
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
