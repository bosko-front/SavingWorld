// The one optional global weekly reminder (v1.2 section 3, R17, docs/DATA_MODEL.md "reminder
// intent"). Pure rules: when the reminder should exist, what the one OS request looks like, and what
// a reconciliation has to cancel or schedule. The native adapter and SQLite stay outside.
//
// The OS request is a repeating calendar trigger on weekday 1 (Sunday in the Gregorian numbering
// iOS uses), 18:00, with no fixed time zone: iOS evaluates it in the device's current zone, so
// travel and daylight-saving changes keep "Sunday 18:00 here" without rescheduling.

export const WEEKLY_REMINDER = {
  // One logical request; a fixed identifier means scheduling it again replaces it on iOS.
  identifier: 'saving-worlds.weekly-reminder',
  weekday: 1,
  hour: 18,
  minute: 0,
  // Raised whenever the text changes, so reconciliation replaces requests that carry the old text.
  // 2: the owner-approved copy (D110) replaced the V08 proposal.
  contentVersion: 2,
  // Owner-approved copy (D110): generic and kind, never an amount, a goal title or guilt.
  title: 'A little progress goes a long way 🌱',
  body: 'Ready to grow your world? Check in on your savings this week.',
} as const;

// What iOS reports for the app's notification permission. provisional (quiet delivery) and
// ephemeral (App Clips) still deliver, so they count as permitted.
export type ReminderPermission = 'undetermined' | 'denied' | 'authorized' | 'provisional' | 'ephemeral';

export function permitsReminder(permission: ReminderPermission): boolean {
  return permission === 'authorized' || permission === 'provisional' || permission === 'ephemeral';
}

// A pending OS request, normalized by the adapter. `weekly` describes a repeating calendar trigger;
// anything else (another trigger kind, a one-off) is `null`.
export type ScheduledRequest = {
  identifier: string;
  weekly: { weekday: number; hour: number; minute: number; repeats: boolean; timeZone: string | null } | null;
  contentVersion: number | null;
};

export type ReminderIntent = { enabled: boolean; permission: ReminderPermission; activeGoalCount: number };

// Why the reminder is or isn't wanted right now, for Settings and the evidence record.
export type ReminderState = 'off' | 'needs_permission' | 'denied' | 'no_active_goal' | 'on';

// The reminder exists only while the person turned it on, iOS permits it and at least one goal is
// active. paused and completed goals never qualify, so editing or adding to a paused goal changes
// nothing here (only its status counts).
export function reminderState(intent: ReminderIntent): ReminderState {
  if (!intent.enabled) {
    return 'off';
  }
  if (intent.permission === 'undetermined') {
    return 'needs_permission';
  }
  if (!permitsReminder(intent.permission)) {
    return 'denied';
  }
  return intent.activeGoalCount > 0 ? 'on' : 'no_active_goal';
}

export function isCurrentWeeklyRequest(request: ScheduledRequest): boolean {
  const { weekly } = request;
  return (
    request.identifier === WEEKLY_REMINDER.identifier &&
    request.contentVersion === WEEKLY_REMINDER.contentVersion &&
    weekly !== null &&
    weekly.repeats &&
    weekly.weekday === WEEKLY_REMINDER.weekday &&
    weekly.hour === WEEKLY_REMINDER.hour &&
    weekly.minute === WEEKLY_REMINDER.minute &&
    weekly.timeZone === null
  );
}

export type ReconcilePlan = { cancel: string[]; schedule: boolean };

// The OS work that turns `scheduled` into exactly one current request (desired) or none. The app
// owns every request it ever scheduled, so anything that is not the one current request is a
// duplicate or an orphan (an older text, a changed trigger, an interrupted earlier attempt) and is
// cancelled. Running the plan twice is safe: the second plan is empty.
export function planReconcile(desired: boolean, scheduled: readonly ScheduledRequest[]): ReconcilePlan {
  const keep = desired ? scheduled.find(isCurrentWeeklyRequest) : undefined;
  // iOS keeps identifiers unique; the filter on the kept identifier only guards a misbehaving
  // adapter from cancelling the request it keeps.
  const cancel = [
    ...new Set(
      scheduled
        .filter((request) => request !== keep && request.identifier !== keep?.identifier)
        .map((request) => request.identifier),
    ),
  ];
  return { cancel, schedule: desired && keep === undefined };
}

export function isEmptyPlan(plan: ReconcilePlan): boolean {
  return plan.cancel.length === 0 && !plan.schedule;
}
