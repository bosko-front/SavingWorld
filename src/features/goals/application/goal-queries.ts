import type { AppDatabase } from '@/data/db/database';
import { listGoalSummaries, type GoalSummary } from '@/data/repositories/goal-repository';

// Every goal (all four statuses) with its balance recomputed from committed ledger entries.
export function readGoalSummaries(db: AppDatabase): Promise<GoalSummary[]> {
  return db.read((snapshot) => listGoalSummaries(snapshot));
}
