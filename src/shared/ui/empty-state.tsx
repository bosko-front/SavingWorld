import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/shared/theme';

import { AmbientFloat } from './ambient-float';
import { AppText } from './app-text';
import { type IconName } from './icon';
import { IconTile, type TileColor } from './icon-tile';

type EmptyStateProps = {
  icon: IconName;
  // A picture that replaces the icon tile (Home's empty state shows the stage 0 world, D69).
  illustration?: ReactNode;
  iconColor?: TileColor;
  title: string;
  message: string;
  // At most one action, usually the screen's primary button.
  children?: ReactNode;
  testID?: string;
};

// What a screen or section shows when it has nothing yet: an icon, a short title that says what
// belongs here and one sentence on how it fills, plus an optional action. No "will appear here"
// placeholder copy. The picture floats gently while the screen is visible (D69, Phase 10).
export function EmptyState({ icon, illustration, iconColor = 'green', title, message, children, testID }: EmptyStateProps) {
  return (
    <View style={styles.container} testID={testID}>
      {illustration ? (
        <AmbientFloat style={styles.illustration} testID={testID ? `${testID}-picture` : undefined}>
          {illustration}
        </AmbientFloat>
      ) : (
        <AmbientFloat style={styles.icon} testID={testID ? `${testID}-picture` : undefined}>
          <IconTile name={icon} color={iconColor} role="largeTitle" />
        </AmbientFloat>
      )}
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
  illustration: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  centered: {
    textAlign: 'center',
  },
  action: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
  },
});
