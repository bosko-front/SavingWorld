import { Pressable, StyleSheet, type GestureResponderEvent } from 'react-native';

import { useFontScale } from '@/shared/layout';
import { colors, elevation, layout, radii, spacing } from '@/shared/theme';

import { AppText } from './app-text';
import { buttonColors, disabledButtonColors } from './button';
import { Icon, type IconName } from './icon';

type FloatingActionButtonProps = {
  icon: IconName;
  // Always written next to the icon ("Add savings"): a bare "+" did not say whether it adds money or
  // a new goal (owner direction D73). Also the spoken name.
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  testID?: string;
};

// Above this text scale the pill would cover most of a small screen (about 560 × 120 pt on the SE
// at the largest size), so the button shows only its icon, which still grows with the text; the
// label stays its spoken name.
export const FAB_COMPACT_TEXT_SCALE = 1.35;

// The screen's one primary action as a floating pill at the bottom trailing corner ("+ Add
// savings" on Home and History, DECISIONS D72-D73). Placed by the layout layer (`floatingAction` on
// Screen and AdaptiveGoalLayout), never by a screen. Same colors as the primary Button; works
// inside `Link asChild`.
export function FloatingActionButton({ icon, label, onPress, disabled = false, testID }: FloatingActionButtonProps) {
  const compact = useFontScale() > FAB_COMPACT_TEXT_SCALE;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        {
          backgroundColor: disabled
            ? disabledButtonColors.filled.background
            : pressed
              ? buttonColors.primary.pressedBackground
              : buttonColors.primary.background,
        },
      ]}>
      <Icon name={icon} role="headline" tone={disabled ? 'disabled' : 'onAction'} weight="semibold" filled />
      {compact ? null : (
        <AppText role="headline" tone={disabled ? 'disabled' : 'onAction'} style={styles.label}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    minWidth: layout.minTouchTarget,
    maxWidth: '100%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    ...elevation.card,
    shadowColor: colors.shadow,
    shadowOpacity: 0.24,
  },
  compact: {
    paddingHorizontal: spacing.md,
  },
  label: {
    flexShrink: 1,
  },
});
