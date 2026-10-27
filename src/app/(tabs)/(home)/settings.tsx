import { Alert, Linking, StyleSheet, View } from 'react-native';

import { buildInfoMessage, describeBuildInfo } from '@/bootstrap/build-info';
import { BUILD_INFO_COPY } from '@/bootstrap/build-info-copy';
import { readBuildInfo } from '@/bootstrap/read-build-info';
import { PRO_SETTINGS_COPY } from '@/features/billing/presentation/billing-copy';
import { ProSettings } from '@/features/billing/presentation/pro-settings';
import { ReminderSettings } from '@/features/reminders/presentation/reminder-settings';
import { REMINDER_COPY } from '@/features/reminders/presentation/reminder-copy';
import { CurrencySettings } from '@/features/settings/presentation/currency-settings';
import { LocalDataSettings } from '@/features/settings/presentation/local-data-settings';
import { LOCAL_DATA_COPY, PUBLIC_PAGES, SETTINGS_COPY } from '@/features/settings/presentation/settings-copy';
import { COMMON_COPY } from '@/shared/i18n/common-copy';
import { Screen } from '@/shared/layout';
import { spacing } from '@/shared/theme';
import { ListGroup, ListRow } from '@/shared/ui/list-row';
import { SectionHeader } from '@/shared/ui/section-header';

// Settings (owner polish D110): calm grouped cards in the shared look. Preferences (the one global
// currency, Phase 06), Reminders (the weekly reminder, Phase 14), Pro (status and Restore Purchases,
// Phase 16), Your data (local storage and no in-app backup, Phase 19) and About (app name and
// version, and the public Privacy Policy and Support pages, D137).
// The native navigation title names the screen. Pressing and holding Version (or its VoiceOver
// action) shows the redacted build details for support (D142); the visible About stays as approved
// in D110. Development tools live in a development-only module that release bundles leave out.
export default function SettingsScreen() {
  const version = readBuildInfo().appVersion;
  return (
    <Screen>
      <View style={styles.section}>
        <SectionHeader title={SETTINGS_COPY.preferences} />
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
        <SectionHeader title={LOCAL_DATA_COPY.section} />
        <LocalDataSettings />
      </View>
      <View style={styles.section}>
        <SectionHeader title={SETTINGS_COPY.about} />
        <ListGroup testID="settings-about">
          <ListRow icon="milestone" title={SETTINGS_COPY.appName} detail={SETTINGS_COPY.appDetail} />
          <ListRow
            icon="device"
            iconColor="blue"
            title={SETTINGS_COPY.version}
            value={version ?? COMMON_COPY.notAvailable}
            onLongPress={showBuildDetails}
            longPressActionLabel={BUILD_INFO_COPY.showAction}
            accessibilityHint={BUILD_INFO_COPY.showHint}
            testID="settings-version"
          />
          <ListRow
            icon="privacy"
            iconColor="neutral"
            title={SETTINGS_COPY.privacyPolicy}
            chevron
            accessibilityHint={SETTINGS_COPY.opensInSafari}
            onPress={() => void Linking.openURL(PUBLIC_PAGES.privacyPolicy)}
            testID="settings-privacy"
          />
          <ListRow
            icon="support"
            iconColor="neutral"
            title={SETTINGS_COPY.support}
            chevron
            accessibilityHint={SETTINGS_COPY.opensInSafari}
            onPress={() => void Linking.openURL(PUBLIC_PAGES.support)}
            testID="settings-support"
          />
        </ListGroup>
      </View>
      {__DEV__ ? <DevelopmentSection /> : null}
    </Screen>
  );
}

// Reads at the moment of the press, so it names the bundle this launch is actually running.
function showBuildDetails() {
  Alert.alert(BUILD_INFO_COPY.title, buildInfoMessage(describeBuildInfo(readBuildInfo())));
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
