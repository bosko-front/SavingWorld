import * as Notifications from 'expo-notifications';
import { IosAuthorizationStatus } from 'expo-notifications';

import {
  WEEKLY_REMINDER,
  type ReminderPermission,
  type ScheduledRequest,
} from '../domain/weekly-reminder';

// The local-notification adapter (docs/ARCHITECTURE.md "Reminders"): the only module that imports
// expo-notifications (ESLint enforces it). Local scheduling only: no push token, no server
// registration, no background task. iOS delivers the request on its own; nothing here runs while
// the app is terminated, and delivery is best effort.

export type ReminderGateway = {
  permission(): Promise<ReminderPermission>;
  // Shows the iOS permission dialog when the person has not answered yet; otherwise returns the
  // current answer without a dialog.
  requestPermission(): Promise<ReminderPermission>;
  scheduled(): Promise<ScheduledRequest[]>;
  scheduleWeekly(): Promise<string>;
  cancel(identifier: string): Promise<void>;
};

// Marks the request as ours in its payload; it carries no goal, amount or other user data.
const REMINDER_KIND = 'weekly-reminder';

function permissionFrom(response: Notifications.NotificationPermissionsStatus): ReminderPermission {
  switch (response.ios?.status) {
    case IosAuthorizationStatus.AUTHORIZED:
      return 'authorized';
    case IosAuthorizationStatus.PROVISIONAL:
      return 'provisional';
    case IosAuthorizationStatus.EPHEMERAL:
      return 'ephemeral';
    case IosAuthorizationStatus.DENIED:
      return 'denied';
    case IosAuthorizationStatus.NOT_DETERMINED:
      return 'undetermined';
    default:
      // No iOS detail (not expected on iOS): fall back to the cross-platform status.
      return response.granted ? 'authorized' : response.status === 'undetermined' ? 'undetermined' : 'denied';
  }
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

// iOS reports a weekly request as a calendar trigger with the matched date components. A fixed
// time zone would pin the time to one zone; ours has none (floating local time).
function normalize(request: Notifications.NotificationRequest): ScheduledRequest {
  const trigger = request.trigger as unknown;
  let weekly: ScheduledRequest['weekly'] = null;
  if (typeof trigger === 'object' && trigger !== null && (trigger as { type?: unknown }).type === 'calendar') {
    const { repeats, dateComponents } = trigger as { repeats?: unknown; dateComponents?: Record<string, unknown> };
    const components = dateComponents ?? {};
    const weekday = numberOrNull(components.weekday);
    const hour = numberOrNull(components.hour);
    const minute = numberOrNull(components.minute);
    if (weekday !== null && hour !== null && minute !== null) {
      const timeZone = typeof components.timeZone === 'string' ? components.timeZone : null;
      weekly = { weekday, hour, minute, repeats: repeats === true, timeZone };
    }
  }
  const data = request.content.data as Record<string, unknown> | null | undefined;
  const contentVersion = data?.kind === REMINDER_KIND ? numberOrNull(data.contentVersion) : null;
  return { identifier: request.identifier, weekly, contentVersion };
}

export const expoReminderGateway: ReminderGateway = {
  async permission() {
    return permissionFrom(await Notifications.getPermissionsAsync());
  },
  async requestPermission() {
    const current = await Notifications.getPermissionsAsync();
    if (permissionFrom(current) !== 'undetermined') {
      return permissionFrom(current);
    }
    return permissionFrom(
      await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }),
    );
  },
  async scheduled() {
    return (await Notifications.getAllScheduledNotificationsAsync()).map(normalize);
  },
  scheduleWeekly() {
    return Notifications.scheduleNotificationAsync({
      identifier: WEEKLY_REMINDER.identifier,
      content: {
        title: WEEKLY_REMINDER.title,
        body: WEEKLY_REMINDER.body,
        sound: 'default',
        data: { kind: REMINDER_KIND, contentVersion: WEEKLY_REMINDER.contentVersion },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: WEEKLY_REMINDER.weekday,
        hour: WEEKLY_REMINDER.hour,
        minute: WEEKLY_REMINDER.minute,
      },
    });
  },
  cancel(identifier) {
    return Notifications.cancelScheduledNotificationAsync(identifier);
  },
};

// While the app is open the reminder is not needed as a banner: it goes quietly to Notification
// Center. In the background or when the app is closed iOS presents it normally.
export function configureReminderPresentation(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function isReminderResponse(response: Notifications.NotificationResponse | null): boolean {
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
    return false;
  }
  const { request } = response.notification;
  const data = request.content.data as Record<string, unknown> | null | undefined;
  return request.identifier === WEEKLY_REMINDER.identifier || data?.kind === REMINDER_KIND;
}

// A tap that opened the app from the terminated state. Cleared once read, so a later launch or
// remount never repeats it.
export function takeLaunchReminderTap(): boolean {
  const response = Notifications.getLastNotificationResponse();
  if (!isReminderResponse(response)) {
    return false;
  }
  Notifications.clearLastNotificationResponse();
  return true;
}

// Taps on the reminder while the app is running (foreground or background).
export function subscribeToReminderTaps(onTap: () => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    if (isReminderResponse(response)) {
      Notifications.clearLastNotificationResponse();
      onTap();
    }
  });
  return () => subscription.remove();
}
