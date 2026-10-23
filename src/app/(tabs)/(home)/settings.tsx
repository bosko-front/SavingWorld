import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { describeBuildInfo } from '@/bootstrap/build-info';
import { readBuildInfo } from '@/bootstrap/read-build-info';
import { Screen } from '@/shared/layout';
import { spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

export default function SettingsScreen() {
  const rows = describeBuildInfo(readBuildInfo());
  return (
    <Screen>
      <AppText role="title" accessibilityRole="header">
        Settings
      </AppText>
      <AppText tone="secondary">Currency, reminder and local-data settings will appear here.</AppText>
      <Card>
        {rows.map((row) => (
          <View key={row.label} style={styles.row} accessible>
            <AppText role="footnote" tone="secondary">
              {row.label}
            </AppText>
            <AppText>{row.value}</AppText>
          </View>
        ))}
      </Card>
      {__DEV__ ? (
        <>
          <Link href="/dev-gallery" asChild>
            <Button label="Component gallery (development only)" variant="plain" />
          </Link>
          <Link href="/dev-layout" asChild>
            <Button label="Layout lab (development only)" variant="plain" />
          </Link>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.xs / 2,
  },
});
