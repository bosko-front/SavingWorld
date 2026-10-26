import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { layout, spacing } from '@/shared/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

type FootnoteWithInfoProps = {
  // The one short line under a group: the essential fact only.
  text: string;
  // Optional leading symbol (the currency lock).
  icon?: IconName;
  // The full explanation, opened from the info button in a native alert.
  infoTitle: string;
  infoMessage: string;
  testID?: string;
};

// A short explanation line under a grouped card with an info button for the details (Settings,
// D111), the same pattern as Challenges' "How quests work" (D105). The line stays readable by
// itself; the alert only adds detail.
export function FootnoteWithInfo({ text, icon, infoTitle, infoMessage, testID }: FootnoteWithInfoProps) {
  return (
    <View style={styles.row}>
      <View style={styles.text} accessible testID={testID}>
        {icon ? <Icon name={icon} role="footnote" tone="secondary" /> : null}
        <AppText role="footnote" tone="secondary" style={styles.label}>
          {text}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={infoTitle}
        onPress={() => Alert.alert(infoTitle, infoMessage)}
        hitSlop={spacing.sm}
        style={styles.infoButton}
        testID={testID ? `${testID}-info` : undefined}>
        <Icon name="info" role="body" tone="action" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  text: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  label: {
    flexShrink: 1,
  },
  // A full 44 pt touch target that does not push the short line away from its card: the negative
  // vertical margin lets the target overlap the surrounding spacing.
  infoButton: {
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    marginVertical: -spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
