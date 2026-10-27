import type { AppDatabase } from '@/data/db/database';
import type { SqlExecutor } from '@/data/db/sql';
import { getGoal, type GoalRecord } from '@/data/repositories/goal-repository';
import {
  getEntry,
  goalLedgerTotals,
  listEntriesForGoal,
  listNewestEntriesForGoal,
  type LedgerEntryRecord,
} from '@/data/repositories/ledger-repository';
import { sumMinor, toMinorAmount } from '@/core/money';

// Read side for one goal's ledger: committed data from a single read snapshot. The balance is
// recomputed from the entries every time; nothing caches it.

export type GoalLedger = {
  goal: GoalRecord;
  // Chronological (date, createdAt, id). History screens may present it newest first.
  entries: LedgerEntryRecord[];
  balanceMinor: number;
};

async function ledgerFor(snapshot: SqlExecutor, goal: GoalRecord): Promise<GoalLedger> {
  const entries = await listEntriesForGoal(snapshot, goal.id);
  const balance = toMinorAmount(sumMinor(entries.map((entry) => entry.signedAmountMinor)));
  if (!balance.ok) {
    throw new Error('Stored goal balance is out of range');
  }
  return { goal, entries, balanceMinor: balance.value };
}

export async function readGoalLedger(db: AppDatabase, goalId: string): Promise<GoalLedger | null> {
  return db.read(async (snapshot) => {
    const goal = await getGoal(snapshot, goalId);
    return goal ? ledgerFor(snapshot, goal) : null;
  });
}

// One page of History (Phase 21): the newest `limit` entries, newest first, with the goal's entry
// count and balance from SQL over all of its entries, from one read snapshot. A ledger of thousands
// of entries is never decoded or rendered at once; History asks for a longer page to show more.
export type HistoryPage = {
  goal: GoalRecord;
  // Newest first, at most `limit`.
  entries: LedgerEntryRecord[];
  entryCount: number;
  balanceMinor: number;
};

export async function readHistoryPage(db: AppDatabase, goalId: string, limit: number): Promise<HistoryPage | null> {
  return db.read(async (snapshot) => {
    const goal = await getGoal(snapshot, goalId);
    if (!goal) {
      return null;
    }
    const totals = await goalLedgerTotals(snapshot, goal.id);
    const entries = await listNewestEntriesForGoal(snapshot, goal.id, limit);
    return { goal, entries, entryCount: totals.entryCount, balanceMinor: totals.sumMinor };
  });
}

// One entry with its goal's current ledger, for the Edit Entry form; null when the entry is gone.
export type EntryContext = GoalLedger & { entry: LedgerEntryRecord };

export async function readEntryContext(db: AppDatabase, entryId: string): Promise<EntryContext | null> {
  return db.read(async (snapshot) => {
    const entry = await getEntry(snapshot, entryId);
    const goal = entry ? await getGoal(snapshot, entry.goalId) : null;
    if (!entry || !goal) {
      return null;
    }
    return { ...(await ledgerFor(snapshot, goal)), entry };
  });
}

// Newest first for History: the exact reverse of the chronological validation order, so the row
// on top is the one counted last.
export function newestFirst(entries: readonly LedgerEntryRecord[]): LedgerEntryRecord[] {
  return [...entries].reverse();
}
