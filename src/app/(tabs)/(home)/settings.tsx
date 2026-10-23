import { PlatformColor, StyleSheet, Text, View } from 'react-native';

import { describeBuildInfo } from '@/bootstrap/build-info';
import { readBuildInfo } from '@/bootstrap/read-build-info';
import { PlaceholderScreen } from '@/shared/ui/placeholder-screen';

export default function SettingsScreen() {
  const rows = describeBuildInfo(readBuildInfo());
  return (
    <PlaceholderScreen
      title="Settings"
      description="Currency, reminder and local-data settings will appear here.">
      {rows.map((row) => (
        <View key={row.label} style={styles.row} accessible>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{row.value}</Text>
        </View>
      ))}
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 2,
  },
  label: {
    fontSize: 13,
    color: PlatformColor('secondaryLabel'),
  },
  value: {
    fontSize: 17,
    color: PlatformColor('label'),
  },
});
