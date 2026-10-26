import { utcTimestamp, type Clock } from '@/core/calendar';
import type { AppDatabase } from '@/data/db/database';
import { countActiveGoals } from '@/data/repositories/goal-repository';
import {
  readReminderRequest,
  readWeeklyReminderEnabled,
  writeReminderRequest,
  type ReminderRequestRecord,
  type ReminderRequestState,
} from '@/data/repositories/settings-repository';

import {
  isEmptyPlan,
  planReconcile,
  reminderState,
  WEEKLY_REMINDER,
  type ReminderPermission,
  type ReminderState,
} from '../domain/weekly-reminder';
import type { ReminderGateway } from '../native/notification-gateway';

// Brings the OS in line with the committed intent (docs/DATA_MODEL.md "reminder intent"): exactly
// one weekly request while the person opted in, iOS permits it and a goal is active; none otherwise.
// Runs after commits, never inside one: SQLite and the notification center cannot share a
// transaction. The order makes an interruption harmless:
//   1. read the committed intent and the OS state;
//   2. record `pending` with the plan before the first OS call;
//   3. cancel duplicates and orphans, schedule the one request if missing;
//   4. read the OS state again and record the outcome (`scheduled`, `none` or `failed`).
// A process killed between 2 and 4 leaves `pending`; the next reconciliation (launch, foreground,
// commit) plans from the real OS state and finishes the record. Nothing here changes goals or money.

export type ReminderDeps = { db: AppDatabase; clock: Clock; gateway: ReminderGateway };

export type ReminderStatus = {
  enabled: boolean;
  // null when iOS could not be asked (the reconciliation failed before it knew).
  permission: ReminderPermission | null;
  activeGoalCount: number;
  state: ReminderState | null;
  // The one request is pending in the notification center.
  scheduled: boolean;
  failed: boolean;
};

// Adapter step that failed, recorded as a short code (never an OS message).
type FailedStep = 'permission' | 'list' | 'cancel' | 'schedule' | 'verify';

class ReconcileStepError extends Error {
  readonly step: FailedStep;

  constructor(step: FailedStep) {
    super(`Reminder reconciliation failed at ${step}`);
    this.name = 'ReconcileStepError';
    this.step = step;
  }
}

async function step<T>(name: FailedStep, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch {
    throw new ReconcileStepError(name);
  }
}

function sameOutcome(record: ReminderRequestRecord | null, next: Omit<ReminderRequestRecord, 'revision' | 'updatedAtUtc' | 'timeZone'>): boolean {
  return (
    record !== null &&
    record.state === next.state &&
    record.desired === next.desired &&
    record.nativeId === next.nativeId &&
    record.contentVersion === next.contentVersion &&
    record.errorCode === next.errorCode
  );
}

export async function reconcileWeeklyReminder(deps: ReminderDeps): Promise<ReminderStatus> {
  const { db, clock, gateway } = deps;
  const intent = await db.read(async (snapshot) => ({
    enabled: await readWeeklyReminderEnabled(snapshot),
    activeGoalCount: await countActiveGoals(snapshot),
    record: await readReminderRequest(snapshot),
  }));
  let record = intent.record;

  const save = async (state: ReminderRequestState, desired: boolean, nativeId: string | null, errorCode: string | null) => {
    const next = { state, desired, nativeId, contentVersion: WEEKLY_REMINDER.contentVersion, errorCode };
    // Unchanged, or nothing ever scheduled and still nothing wanted: no write.
    if (sameOutcome(record, next) || (record === null && state === 'none')) {
      return;
    }
    const written: ReminderRequestRecord = {
      ...next,
      revision: (record?.revision ?? 0) + 1,
      timeZone: clock.timeZone(),
      updatedAtUtc: utcTimestamp(clock),
    };
    await db.write((tx) => writeReminderRequest(tx, written));
    record = written;
  };

  let permission: ReminderPermission | null = null;
  let desired = false;
  try {
    permission = await step('permission', () => gateway.permission());
    const state = reminderState({ enabled: intent.enabled, permission, activeGoalCount: intent.activeGoalCount });
    desired = state === 'on';
    const plan = planReconcile(desired, await step('list', () => gateway.scheduled()));
    if (!isEmptyPlan(plan)) {
      await save('pending', desired, null, null);
      for (const identifier of plan.cancel) {
        await step('cancel', () => gateway.cancel(identifier));
      }
      if (plan.schedule) {
        await step('schedule', () => gateway.scheduleWeekly());
      }
      // Confirm the notification center now holds exactly the desired request.
      if (!isEmptyPlan(planReconcile(desired, await step('verify', () => gateway.scheduled())))) {
        throw new ReconcileStepError('verify');
      }
    }
    await save(desired ? 'scheduled' : 'none', desired, desired ? WEEKLY_REMINDER.identifier : null, null);
    return { enabled: intent.enabled, permission, activeGoalCount: intent.activeGoalCount, state, scheduled: desired, failed: false };
  } catch (error) {
    if (!(error instanceof ReconcileStepError)) {
      // A SQLite failure while recording: nothing else to record; the next reconciliation retries.
      throw error;
    }
    await save('failed', desired, null, error.step);
    const state = permission === null ? null : reminderState({ enabled: intent.enabled, permission, activeGoalCount: intent.activeGoalCount });
    return { enabled: intent.enabled, permission, activeGoalCount: intent.activeGoalCount, state, scheduled: false, failed: true };
  }
}
