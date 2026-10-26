import { StyleSheet, View } from 'react-native';

import { readBuildInfo } from '@/bootstrap/read-build-info';
import { PRO_SETTINGS_COPY } from '@/features/billing/presentation/billing-copy';
import { ProSettings } from '@/features/billing/presentation/pro-settings';
import { ReminderSettings } from '@/features/reminders/presentation/reminder-settings';
import { REMINDER_COPY } from '@/features/reminders/presentation/reminder-copy';
import { CurrencySettings } from '@/features/settings/presentation/currency-settings';
import { Screen } from '@/shared/layout';
import { spacing } from '@/shared/theme';
import { ListGroup, ListRow } from '@/shared/ui/list-row';
import { SectionHeader } from '@/shared/ui/section-header';

// Settings (owner polish D110): calm grouped cards in the shared look. Preferences (the one global
// currency, Phase 06), Reminders (the weekly reminder, Phase 14), Pro (status and Restore Purchases,
// Phase 16) and About (app name and version).
// The native navigation title names the screen. Delivery diagnostics and development tools live in
// a development-only module that release bundles leave out.
export default function SettingsScreen() {
  const version = readBuildInfo().appVersion;
  return (
    <Screen>
      <View style={styles.section}>
        <SectionHeader title="Preferences" />
        <CurrencySettings />
      </View>
      <View style={styles.section}>
        <SectionHeader title={REMINDER_COPY.section} />
        <ReminderSettings />
      </View>
      <View style={styles.section}>
        <SectionHeader title={PRO_SETTINGS_COPY.section} />
        <ProSettings />
      </View>
      <View style={styles.section}>
        <SectionHeader title="About" />
        <ListGroup testID="settings-about">
          <ListRow icon="milestone" title="Saving Worlds" detail="Record real savings and watch small worlds grow." />
          <ListRow icon="device" iconColor="blue" title="Version" value={version ?? 'Not available'} testID="settings-version" />
        </ListGroup>
      </View>
      {__DEV__ ? <DevelopmentSection /> : null}
    </Screen>
  );
}

function DevelopmentSection() {
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SettingsDevelopmentSection } = require('@/dev/settings-development') as typeof import('@/dev/settings-development');
    return <SettingsDevelopmentSection />;
  }
  return null;
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
});
