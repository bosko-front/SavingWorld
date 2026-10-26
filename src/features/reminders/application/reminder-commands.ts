import { utcTimestamp, type Clock } from '@/core/calendar';
import type { Result } from '@/core/result';
import { executeCommand, type StorageFailure } from '@/data/command';
import type { AppDatabase } from '@/data/db/database';
import { writeWeeklyReminderEnabled } from '@/data/repositories/settings-repository';

// The one Settings switch for the global weekly reminder (v1.2 AppSettings.weeklyReminderEnabled).
// It stores the person's intent only; the OS request follows from it in a separate reconciliation
// after this commit (reminder-reconciler.ts), never inside a financial transaction. Like the
// selected goal it is an idempotent preference, so it needs no operation ID or receipt (D57, D108).
export async function setWeeklyReminderEnabled(
  deps: { db: AppDatabase; clock: Clock },
  enabled: boolean,
): Promise<Result<{ enabled: boolean }, StorageFailure>> {
  return executeCommand(deps.db, async (tx) => {
    await writeWeeklyReminderEnabled(tx, enabled, utcTimestamp(deps.clock));
    return { enabled };
  });
}
