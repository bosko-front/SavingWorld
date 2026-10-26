import { today, utcTimestamp, type Clock } from '@/core/calendar';
import { sumMinor, toMinorAmount } from '@/core/money';
import type { AppDatabase } from '@/data/db/database';
import { listAttemptsForGoal } from '@/data/repositories/challenge-attempt-repository';
import { getGoal } from '@/data/repositories/goal-repository';
import { listEntriesForGoal } from '@/data/repositories/ledger-repository';

import { challengeBoard, type ChallengeBoard } from '../domain/challenge-rules';

// One goal's challenges from committed data, read in one snapshot so the goal, its entries and its
// attempts are never out of step. The board is settled for the clock's current instant and zone
// (docs/ARCHITECTURE.md "Challenges"): screens present it without recomputing any rule. Null when
// the goal does not exist.
export async function readChallengeBoard(db: AppDatabase, goalId: string, clock: Clock): Promise<ChallengeBoard | null> {
  const nowMs = clock.nowMs();
  const fixed: Clock = { nowMs: () => nowMs, timeZone: clock.timeZone };
  return db.read(async (snapshot) => {
    const goal = await getGoal(snapshot, goalId);
    if (!goal) {
      return null;
    }
    const entries = await listEntriesForGoal(snapshot, goalId);
    const balance = toMinorAmount(sumMinor(entries.map((entry) => entry.signedAmountMinor)));
    if (!balance.ok) {
      throw new Error('Stored goal balance is out of range');
    }
    return challengeBoard({
      goal,
      balanceMinor: balance.value,
      entries,
      attempts: await listAttemptsForGoal(snapshot, goalId),
      today: today(fixed),
      nowUtc: utcTimestamp(fixed),
    });
  });
}
