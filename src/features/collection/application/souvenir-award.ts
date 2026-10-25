import { currentThemeVersion, isFunded } from '@/core/progression';
import type { SqlExecutor } from '@/data/db/sql';
import { getCollectible, insertCollectible } from '@/data/repositories/collectible-repository';
import type { GoalRecord } from '@/data/repositories/goal-repository';

// The one permanent souvenir per goal (v1.2 section 3 "Scene i kolekcija", docs/DATA_MODEL.md
// "collectibles"). Called inside the exclusive transaction of every saved change that can make
// B >= T: a ledger create, correction or deletion and a target edit. The first one that leaves the
// goal at or above its target stores the souvenir with the goal's theme and the current art
// version, in that same transaction, so the change and its souvenir commit or roll back together.
// Also on Free. It never changes the goal's status (Finish does that, separately). Once stored it
// stays: a later withdrawal, correction (even of a mistaken first entry), target or theme change,
// Finish or Reopen leaves it, and crossing 100% again finds it and adds nothing.

// `goal` carries the values as saved by the calling change (the new target for a target edit).
// Returns whether this call stored the souvenir.
export async function awardSouvenirIfFirstFunded(
  tx: SqlExecutor,
  goal: Pick<GoalRecord, 'id' | 'themeId' | 'targetMinor'>,
  balanceMinor: number,
  nowUtc: string,
): Promise<boolean> {
  if (!isFunded(balanceMinor, goal.targetMinor) || (await getCollectible(tx, goal.id)) !== null) {
    return false;
  }
  await insertCollectible(tx, {
    goalId: goal.id,
    themeId: goal.themeId,
    themeVersion: currentThemeVersion(goal.themeId),
    targetMinorAtAward: goal.targetMinor,
    earnedAtUtc: nowUtc,
  });
  return true;
}
