import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/shared/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

export type BadgeTone = 'info' | 'success' | 'neutral';

// Tone colors; tests/unit/contrast.test.ts checks each label against its surface.
export const badgeColors = {
  info: { surface: colors.infoSurface, tone: 'info' },
  success: { surface: colors.successSurface, tone: 'success' },
  neutral: { surface: colors.surfaceSoft, tone: 'secondary' },
} as const;

type StatusBadgeProps = {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
  testID?: string;
};

// A short status word in a soft pill ("Paused", "Completed", "Target reached"). The word carries the
// meaning; the color and icon only support it.
export function StatusBadge({ label, tone = 'neutral', icon, testID }: StatusBadgeProps) {
  const toneColors = badgeColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: toneColors.surface }]} testID={testID}>
      {icon ? <Icon name={icon} role="label" tone={toneColors.tone} weight="semibold" filled /> : null}
      <AppText role="label" tone={toneColors.tone} style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
  },
  label: {
    flexShrink: 1,
  },
});
