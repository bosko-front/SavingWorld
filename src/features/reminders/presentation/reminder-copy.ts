import { formatClockTime } from '@/shared/i18n/locale';

import { WEEKLY_REMINDER, type ReminderState } from '../domain/weekly-reminder';

// Strings for the one weekly reminder row in Settings (Phase 14, D97 calm voice: kind, short, no
// pressure). The time follows the region's clock style; the day and time themselves are fixed.

export function reminderTime(locale?: string): string {
  return formatClockTime(WEEKLY_REMINDER.hour, WEEKLY_REMINDER.minute, locale);
}

export const REMINDER_COPY = {
  section: 'Reminders',
  title: 'Weekly reminder',
  on: 'Reminder turned on',
  off: 'Reminder turned off',
  failed: 'Reminder not changed',
  failedMessage: 'Something went wrong while saving. Try again.',
  allow: 'Allow notifications',
  openSettings: 'Open Settings',
  deniedTitle: 'Notifications are off for Saving Worlds',
  deniedMessage: 'Turn them on in iOS Settings to get the reminder. Saving works the same either way.',
  infoTitle: 'About the weekly reminder',
  notSetTitle: 'Reminder not set yet',
  notSetMessage: 'Saving Worlds will try again the next time you open the app.',
} as const;

export function reminderDetail(locale?: string): string {
  return `Sundays at ${reminderTime(locale)}`;
}

// The one short line under the row, for the state the reminder is in (D111). The details are in
// `reminderInfo`, behind the info button.
export function reminderExplanation(state: ReminderState | null): string {
  switch (state) {
    case 'on':
      return 'On. It arrives on this iPhone’s time.';
    case 'no_active_goal':
      return 'Resting until a goal is active.';
    case 'needs_permission':
      return 'Allow notifications to receive it.';
    case 'denied':
      return 'Waiting for notifications to be turned on.';
    default:
      return 'A gentle nudge to add this week’s savings.';
  }
}

export function reminderInfo(locale?: string): string {
  return `One gentle note every Sunday at ${reminderTime(locale)}, on this iPhone’s time, while at least one goal is active. Paused and finished goals don’t send reminders. When you turn it on, iOS asks once whether Saving Worlds may notify you. The note never shows amounts or goal names, and iOS decides the exact delivery.`;
}
