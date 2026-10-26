import { capabilitiesFor, goalUse, needsKeptGoalChoice, type Capabilities, type GoalUse } from '@/core/access';
import { utcTimestamp, type Clock } from '@/core/calendar';
import { err, type Result } from '@/core/result';
import { executeCommand, reject, type CommandFailure } from '@/data/command';
import type { AppDatabase } from '@/data/db/database';
import type { SqlExecutor } from '@/data/db/sql';
import { isEntityId } from '@/data/ids';
import { countGoals, getGoal, isOpenStatus, type GoalRecord } from '@/data/repositories/goal-repository';
import { readKeptGoalId, writeKeptGoalId, writeSelectedGoalId } from '@/data/repositories/settings-repository';

// Which goals accept changes (Phase 16, owner decisions D74/D75), checked inside every command's
// exclusive transaction against current data, so no screen, deep link or stale view can bypass it.
// The pure rule is `goalUse` in @/core/access; this reads its inputs (how many goals exist and the
// kept-goal choice) and refuses a change with a typed error. Nothing here deletes or changes a goal,
// an entry, a souvenir or a theme: a lost entitlement only narrows what the commands accept.

export type GoalAccessError = { code: 'goal_read_only' } | { code: 'theme_locked' };

export type GoalAccessFacts = { goalCount: number; keptGoalId: string | null };

// The goal count and the kept-goal choice, with a choice that names no existing goal read as none.
export async function readGoalAccessFacts(executor: SqlExecutor): Promise<GoalAccessFacts> {
  const goalCount = await countGoals(executor);
  const stored = await readKeptGoalId(executor);
  const keptGoalId = stored !== null && isEntityId(stored) && (await getGoal(executor, stored)) ? stored : null;
  return { goalCount, keptGoalId };
}

export async function readGoalUse(executor: SqlExecutor, capabilities: Capabilities, goal: Pick<GoalRecord, 'id' | 'themeId'>): Promise<GoalUse> {
  const facts = await readGoalAccessFacts(executor);
  return goalUse(capabilities, { ...facts, goalId: goal.id, themeId: goal.themeId });
}

// Entries, corrections, goal edits and starting a quest need a usable goal.
export async function requireUsableGoal(tx: SqlExecutor, capabilities: Capabilities, goal: Pick<GoalRecord, 'id' | 'themeId'>): Promise<void> {
  const use = await readGoalUse(tx, capabilities, goal);
  if (use === 'read_only') {
    reject<GoalAccessError>({ code: 'goal_read_only' });
  }
  if (use === 'theme_locked') {
    reject<GoalAccessError>({ code: 'theme_locked' });
  }
}

// Pause, Resume and Finish change only the status, which a theme-locked goal still allows.
export async function requireNotReadOnly(tx: SqlExecutor, capabilities: Capabilities, goal: Pick<GoalRecord, 'id' | 'themeId'>): Promise<void> {
  if ((await readGoalUse(tx, capabilities, goal)) === 'read_only') {
    reject<GoalAccessError>({ code: 'goal_read_only' });
  }
}

export type KeepGoalError = CommandFailure<
  | { code: 'invalid_reference' }
  | { code: 'goal_not_found' }
  // Every goal fits the current capabilities (Pro is active, or one goal is left): nothing to choose.
  | { code: 'not_needed' }
  // Another goal was already chosen; it stays the kept goal until Pro returns or goals are deleted.
  | { code: 'already_chosen'; keptGoalId: string }
>;

// The person's own choice of the one goal they keep using after a confirmed loss of Pro with several
// goals (D74). Asked once, after a native confirmation: the choice stands until Pro returns or goals
// are deleted, so Free cannot rotate through several goals by switching. Choosing the same goal again
// changes nothing. Like the selected goal (D57) it is a preference without money or lifecycle effect,
// so it needs no operation ID or receipt; it still runs on the serialized write path. Home then
// shows the kept goal when it is open.
export async function chooseKeptGoal(
  deps: { db: AppDatabase; clock: Clock; capabilities?: Capabilities },
  goalId: string,
): Promise<Result<{ goalId: string }, KeepGoalError>> {
  if (!isEntityId(goalId)) {
    return err({ code: 'invalid_reference' });
  }
  const capabilities = deps.capabilities ?? capabilitiesFor('free');
  return executeCommand(deps.db, async (tx) => {
    const goal = await getGoal(tx, goalId);
    if (!goal) {
      reject({ code: 'goal_not_found' });
    }
    const facts = await readGoalAccessFacts(tx);
    if (facts.keptGoalId === goalId) {
      return { goalId };
    }
    if (!needsKeptGoalChoice(capabilities, facts.goalCount, facts.keptGoalId)) {
      if (facts.keptGoalId !== null && goalUse(capabilities, { ...facts, goalId, themeId: goal.themeId }) === 'read_only') {
        reject({ code: 'already_chosen', keptGoalId: facts.keptGoalId });
      }
      reject({ code: 'not_needed' });
    }
    const nowUtc = utcTimestamp(deps.clock);
    await writeKeptGoalId(tx, goalId, nowUtc);
    if (isOpenStatus(goal.status)) {
      await writeSelectedGoalId(tx, goalId, nowUtc);
    }
    return { goalId };
  });
}
