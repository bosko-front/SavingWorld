import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { appClock } from '@/bootstrap/app-data';
import { getAppDatabase } from '@/bootstrap/database-readiness';
import { reconcileReminders, useReminderStore } from '@/bootstrap/reminders';
import { readReminderRequest, type ReminderRequestRecord } from '@/data/repositories/settings-repository';
import { WEEKLY_REMINDER } from '@/features/reminders/domain/weekly-reminder';
import { Screen } from '@/shared/layout';
import { spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { SectionHeader } from '@/shared/ui/section-header';

// Development/test-only reminder lab (Phase 14 native evidence). Shows what the notification center
// really holds (identifier, trigger components, repeats, time zone), the next fire date iOS computes
// for the weekly trigger in the device's current zone, the stored request record and the last
// reconciliation, and can deliver a controlled copy of the reminder a few seconds from now so
// delivery and taps (foreground, background, terminated) can be checked without waiting for Sunday.
// Reached from Settings → Development only → Reminder lab (`/dev-reminder`), guarded and absent
// from release bundles. Every action also logs a `[reminder-lab]` line to Metro.
//
// The test copy uses its own identifier, so the app's reconciliation cancels it as an orphan on the
// next commit or foreground: schedule it, then leave the app (Home button or terminate) and wait.

const TEST_IDENTIFIER = 'dev-test-reminder';

type LabState = {
  permission: string;
  requests: Notifications.NotificationRequest[];
  nextFireMs: number | null;
  record: ReminderRequestRecord | null;
};

function describeInstant(ms: number | null): string {
  if (ms === null) {
    return 'none';
  }
  const local = new Date(ms).toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  return `${local} · ${new Date(ms).toISOString()}`;
}

function log(message: string, value?: unknown): void {
  console.log(`[reminder-lab] ${message}${value === undefined ? '' : ` ${JSON.stringify(value)}`}`);
}

async function readLab(): Promise<LabState> {
  const permissions = await Notifications.getPermissionsAsync();
  const requests = await Notifications.getAllScheduledNotificationsAsync();
  const nextFireMs = await Notifications.getNextTriggerDateAsync({
    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
    weekday: WEEKLY_REMINDER.weekday,
    hour: WEEKLY_REMINDER.hour,
    minute: WEEKLY_REMINDER.minute,
  });
  const record = await getAppDatabase().read((r) => readReminderRequest(r));
  const next: LabState = { permission: `${permissions.status} (ios ${String(permissions.ios?.status)})`, requests, nextFireMs, record };
  log('inspect', {
    zone: appClock().timeZone(),
    permission: next.permission,
    requests: requests.map((request) => ({ identifier: request.identifier, trigger: request.trigger, body: request.content.body, data: request.content.data })),
    nextFire: describeInstant(nextFireMs),
    record,
  });
  return next;
}

export function ReminderLab() {
  const status = useReminderStore((store) => store.status);
  const [lab, setLab] = useState<LabState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Bumped by every action, so the state is read again.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    void readLab().then((next) => {
      if (live) {
        setLab(next);
      }
    });
    return () => {
      live = false;
    };
  }, [status, tick]);

  const inspect = () => setTick((value) => value + 1);

  const reconcile = async () => {
    const result = await reconcileReminders();
    log('reconcile', result);
    setMessage(`Reconciled: ${JSON.stringify(result)}`);
    inspect();
  };

  const deliverSoon = async (seconds: number) => {
    await Notifications.scheduleNotificationAsync({
      identifier: TEST_IDENTIFIER,
      content: { title: WEEKLY_REMINDER.title, body: WEEKLY_REMINDER.body, sound: 'default', data: { kind: 'weekly-reminder', contentVersion: WEEKLY_REMINDER.contentVersion } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false },
    });
    log('test delivery scheduled', { seconds });
    setMessage(`Test reminder in ${seconds} s. Leave the app now to see it as a banner.`);
    inspect();
  };

  const seedOrphans = async () => {
    for (const identifier of ['dev-orphan-a', 'dev-orphan-b']) {
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: { body: 'Orphan from an interrupted run', data: {} },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: WEEKLY_REMINDER.weekday,
          hour: WEEKLY_REMINDER.hour,
          minute: WEEKLY_REMINDER.minute,
        },
      });
    }
    log('orphans seeded');
    setMessage('Two orphan weekly requests added. Reconcile to see them cancelled.');
    inspect();
  };

  return (
    <Screen>
      <View style={styles.section}>
        <SectionHeader title="Notification center" caption={`Device zone ${appClock().timeZone()}`} />
        <Card testID="reminder-lab-state">
          <AppText role="footnote">Permission: {lab?.permission ?? '…'}</AppText>
          <AppText role="footnote">Next weekly fire: {describeInstant(lab?.nextFireMs ?? null)}</AppText>
          <AppText role="footnote">Pending requests: {lab?.requests.length ?? '…'}</AppText>
          {lab?.requests.map((request) => (
            <AppText key={request.identifier} role="footnote" tone="secondary">
              {request.identifier}: {JSON.stringify(request.trigger)}
            </AppText>
          ))}
        </Card>
      </View>
      <View style={styles.section}>
        <SectionHeader title="Stored record and last reconciliation" />
        <Card>
          <AppText role="footnote">{JSON.stringify(lab?.record ?? null)}</AppText>
          <AppText role="footnote" tone="secondary">
            {JSON.stringify(status)}
          </AppText>
        </Card>
      </View>
      {message ? <AppText role="footnote">{message}</AppText> : null}
      <Button label="Reconcile now" variant="secondary" onPress={() => void reconcile()} testID="reminder-lab-reconcile" />
      <Button label="Deliver a test reminder in 10 s" variant="secondary" onPress={() => void deliverSoon(10)} testID="reminder-lab-deliver" />
      <Button label="Add two orphan requests" variant="secondary" onPress={() => void seedOrphans()} testID="reminder-lab-orphans" />
      <Button label="Refresh" variant="plain" onPress={inspect} testID="reminder-lab-refresh" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
});
