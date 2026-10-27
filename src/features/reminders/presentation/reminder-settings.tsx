import { useState } from 'react';
import { Linking, StyleSheet, Switch, View } from 'react-native';

import { appClock, refreshAppData } from '@/bootstrap/app-data';
import { getAppDatabase } from '@/bootstrap/database-readiness';
import { reconcileReminders, requestReminderPermission, useReminderStore } from '@/bootstrap/reminders';
import { useFontScale } from '@/shared/layout';
import { colors, layout, spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { FootnoteWithInfo } from '@/shared/ui/footnote-with-info';
import { haptics } from '@/shared/ui/haptics';
import { IconTile } from '@/shared/ui/icon-tile';
import { ListGroup } from '@/shared/ui/list-row';
import { Notice } from '@/shared/ui/notice';
import { showToast } from '@/shared/ui/toast';

import { setWeeklyReminderEnabled } from '../application/reminder-commands';

import { REMINDER_COPY, reminderDetail, reminderExplanation, reminderInfo } from './reminder-copy';

// From the accessibility text sizes on, the switch moves under the title (as in iOS Settings), so
// "Weekly reminder" keeps the full row width instead of breaking inside a word.
const STACK_TEXT_SCALE = 1.6;

// The single weekly reminder switch (v1.2 section 6, R17): one row with the `reminder` tile and the
// native iOS switch, one short line under it with the details behind an info button (D111). Turning it on commits the intent first, then asks iOS
// for permission (only if the person never answered) and reconciles the one OS request. A denial
// keeps the intent and offers iOS Settings; saving never depends on any of it.
export function ReminderSettings() {
  const status = useReminderStore((store) => store.status);
  // The value the person just chose, shown while it is being saved.
  const [pending, setPending] = useState<boolean | null>(null);
  const enabled = pending ?? status?.enabled ?? false;
  const state = status?.state ?? null;
  const stacked = useFontScale() > STACK_TEXT_SCALE;

  const change = async (next: boolean) => {
    if (pending !== null) {
      return;
    }
    setPending(next);
    const result = await setWeeklyReminderEnabled({ db: getAppDatabase(), clock: appClock() }, next);
    if (!result.ok) {
      setPending(null);
      showToast({ tone: 'error', title: REMINDER_COPY.failed, message: REMINDER_COPY.failedMessage });
      return;
    }
    if (next) {
      await requestReminderPermission();
    }
    await refreshAppData();
    const reconciled = await reconcileReminders();
    setPending(null);
    // A committed change with its toast also plays the success haptic (D68). Turning it on while
    // iOS refuses notifications shows the explanation below instead of a success message.
    if (!next || reconciled?.state !== 'denied') {
      showToast({ tone: 'success', title: next ? REMINDER_COPY.on : REMINDER_COPY.off });
      haptics.success();
    }
  };

  const askAgain = async () => {
    await requestReminderPermission();
    await reconcileReminders();
  };

  const detail = reminderDetail();
  return (
    <View style={styles.section} testID="reminder-settings">
      <ListGroup>
        <View style={[styles.row, stacked && styles.rowStacked]}>
          <IconTile name="reminder" color="honey" />
          <View style={[styles.text, stacked && styles.textStacked]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <AppText>{REMINDER_COPY.title}</AppText>
            <AppText role="footnote" tone="secondary">
              {detail}
            </AppText>
          </View>
          {/* The UIKit switch: the @expo/ui SwiftUI Toggle's touch area did not match where it was
              drawn inside this row on the simulator (D108). */}
          <Switch
            value={enabled}
            onValueChange={(next) => void change(next)}
            // Busy while the choice is saved and iOS answers; VoiceOver hears it as dimmed (Phase 19).
            disabled={pending !== null}
            trackColor={{ true: colors.actionPrimary }}
            accessibilityLabel={`${REMINDER_COPY.title}, ${detail}`}
            testID="reminder-switch"
          />
        </View>
      </ListGroup>
      <FootnoteWithInfo
        text={reminderExplanation(enabled ? state : 'off')}
        infoTitle={REMINDER_COPY.infoTitle}
        infoMessage={reminderInfo()}
        testID="reminder-explanation"
      />
      {enabled && state === 'needs_permission' && pending === null ? (
        <Button label={REMINDER_COPY.allow} variant="secondary" onPress={() => void askAgain()} testID="reminder-allow" />
      ) : null}
      {enabled && state === 'denied' && pending === null ? (
        <>
          <Notice tone="info" title={REMINDER_COPY.deniedTitle} message={REMINDER_COPY.deniedMessage} testID="reminder-denied" />
          <Button
            label={REMINDER_COPY.openSettings}
            variant="secondary"
            onPress={() => void Linking.openSettings()}
            testID="reminder-open-settings"
          />
        </>
      ) : null}
      {enabled && status?.failed && state !== 'denied' && pending === null ? (
        <Notice tone="info" title={REMINDER_COPY.notSetTitle} message={REMINDER_COPY.notSetMessage} testID="reminder-not-set" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.minTouchTarget,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  rowStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  text: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  textStacked: {
    flex: 0,
    alignSelf: 'stretch',
  },
});
