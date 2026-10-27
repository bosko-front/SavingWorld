import { canOpenStatistics, type Capabilities } from '@/core/access';
import type { CivilDate } from '@/core/calendar';
import { err, ok, type Result } from '@/core/result';
import type { AppDatabase } from '@/data/db/database';
import { listDatedAmountsFrom, listGoalLedgerSums, readGoalCounts } from '@/data/repositories/statistics-repository';

import { savingsStatistics, statisticsPeriod, type SavingsStatistics } from '../domain/savings-statistics';

export type StatisticsReadError = 'pro_required';

// The Pro statistics read (Phase 18). The capability check is part of the query, not only of the
// screen: without Pro nothing is read (DEVELOPMENT_RULES "Capability checks belong in commands as well
// as UI"). Everything comes from one read snapshot, so the four views always describe the same
// committed ledger, on the civil date `today` that the app snapshot was read on.
export async function readSavingsStatistics(
  db: AppDatabase,
  capabilities: Capabilities,
  today: CivilDate,
): Promise<Result<SavingsStatistics, StatisticsReadError>> {
  if (!canOpenStatistics(capabilities)) {
    return err('pro_required');
  }
  const period = statisticsPeriod(today);
  const ledger = await db.read(async (snapshot) => {
    const counts = await readGoalCounts(snapshot);
    const goalBalances = await listGoalLedgerSums(snapshot);
    const openingBalances = await listGoalLedgerSums(snapshot, period.readFrom);
    const entries = await listDatedAmountsFrom(snapshot, period.readFrom);
    return { ...counts, goalBalances, openingBalances, entries };
  });
  return ok(savingsStatistics(period, ledger));
}
