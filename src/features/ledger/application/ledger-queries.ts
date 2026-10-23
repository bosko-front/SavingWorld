import type { AppDatabase } from '@/data/db/database';
import { getGoal, type GoalRecord } from '@/data/repositories/goal-repository';
import { listEntriesForGoal, type LedgerEntryRecord } from '@/data/repositories/ledger-repository';
import { sumMinor, toMinorAmount } from '@/core/money';

// Read side for one goal's ledger: committed data from a single read snapshot. The balance is
// recomputed from the entries every time; nothing caches it.

export type GoalLedger = {
  goal: GoalRecord;
  // Chronological (date, createdAt, id). History screens may present it newest first.
  entries: LedgerEntryRecord[];
  balanceMinor: number;
};

export async function readGoalLedger(db: AppDatabase, goalId: string): Promise<GoalLedger | null> {
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
    return { goal, entries, balanceMinor: balance.value };
  });
}
