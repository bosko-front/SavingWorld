import type { AppDatabase } from '@/data/db/database';
import { listCollectibles, type CollectibleRecord } from '@/data/repositories/collectible-repository';
import { isOpenStatus, listGoalSummaries, type GoalSummary } from '@/data/repositories/goal-repository';
import { readSelectedGoalId } from '@/data/repositories/settings-repository';

// Every goal (all statuses) with its balance recomputed from committed ledger entries.
export function readGoalSummaries(db: AppDatabase): Promise<GoalSummary[]> {
  return db.read((snapshot) => listGoalSummaries(snapshot));
}

export type GoalsOverview = {
  // Oldest first (created_at, id), all statuses.
  goals: GoalSummary[];
  // The open goal Home shows, after the fallback rule; null when no goal is open.
  selectedGoalId: string | null;
  // Every souvenir, newest first (Phase 11). Read in the same snapshot as the goals, so a goal and
  // its souvenir are never out of step on screen.
  souvenirs: CollectibleRecord[];
};

// Home's selected goal: the stored choice while it names an open goal, otherwise the oldest open
// goal (created_at, id), otherwise none. Deterministic, so a restart with a stale, missing or
// closed selection always lands on the same goal or the empty Home state.
export function resolveSelectedGoalId(goals: readonly GoalSummary[], storedId: string | null): string | null {
  const open = goals.filter((summary) => isOpenStatus(summary.goal.status));
  const stored = open.find((summary) => summary.goal.id === storedId);
  return (stored ?? open[0])?.goal.id ?? null;
}

export async function readGoalsOverview(db: AppDatabase): Promise<GoalsOverview> {
  return db.read(async (snapshot) => {
    const goals = await listGoalSummaries(snapshot);
    const storedId = await readSelectedGoalId(snapshot);
    const souvenirs = await listCollectibles(snapshot);
    return { goals, selectedGoalId: resolveSelectedGoalId(goals, storedId), souvenirs };
  });
}
