import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/shared/theme';

import { AppText } from './app-text';
import { type IconName } from './icon';
import { IconTile, type TileColor } from './icon-tile';

type EmptyStateProps = {
  icon: IconName;
  iconColor?: TileColor;
  title: string;
  message: string;
  // At most one action, usually the screen's primary button.
  children?: ReactNode;
  testID?: string;
};

// What a screen or section shows when it has nothing yet: an icon, a short title that says what
// belongs here and one sentence on how it fills, plus an optional action. No "will appear here"
// placeholder copy.
export function EmptyState({ icon, iconColor = 'green', title, message, children, testID }: EmptyStateProps) {
  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.icon}>
        <IconTile name={icon} color={iconColor} role="largeTitle" />
      </View>
      <AppText role="title" accessibilityRole="header" style={styles.centered}>
        {title}
      </AppText>
      <AppText tone="secondary" style={styles.centered}>
        {message}
      </AppText>
      {children ? <View style={styles.action}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  icon: {
    marginBottom: spacing.xs,
  },
  centered: {
    textAlign: 'center',
  },
  action: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
  },
});
