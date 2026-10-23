import { utcTimestamp, type Clock } from '@/core/calendar';
import { err, type Result } from '@/core/result';
import { executeCommand, reject, type CommandFailure } from '@/data/command';
import type { AppDatabase } from '@/data/db/database';
import { isEntityId } from '@/data/ids';
import { getGoal, isOpenStatus } from '@/data/repositories/goal-repository';
import { writeSelectedGoalId } from '@/data/repositories/settings-repository';

// Stores which open goal Home shows. This is a display preference, not a financial or lifecycle
// change: writing the same value twice has the same effect as once, so it needs no operation ID or
// receipt (DECISIONS D57). It still runs on the serialized write path and only accepts an open goal.

export type SelectGoalError = CommandFailure<
  { code: 'invalid_reference' } | { code: 'goal_not_found' } | { code: 'goal_closed' }
>;

export async function selectGoal(
  deps: { db: AppDatabase; clock: Clock },
  goalId: string,
): Promise<Result<{ goalId: string }, SelectGoalError>> {
  if (!isEntityId(goalId)) {
    return err({ code: 'invalid_reference' });
  }
  return executeCommand(deps.db, async (tx) => {
    const goal = await getGoal(tx, goalId);
    if (!goal) {
      reject({ code: 'goal_not_found' });
    }
    if (!isOpenStatus(goal.status)) {
      reject({ code: 'goal_closed' });
    }
    await writeSelectedGoalId(tx, goalId, utcTimestamp(deps.clock));
    return { goalId };
  });
}
