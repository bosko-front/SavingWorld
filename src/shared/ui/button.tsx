import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { borders, colors, layout, radii, spacing } from '@/shared/theme';

import { AppText, type TextTone } from './app-text';
import { Icon, type IconName } from './icon';

export type ButtonVariant = 'primary' | 'secondary' | 'plain';

type ButtonColors = {
  background: string;
  pressedBackground: string;
  border: string;
  label: string;
  labelTone: TextTone;
};

const TRANSPARENT = 'transparent';

// State colors per variant. tests/unit/contrast.test.ts checks every label/background pair here.
// `plain` has no fill of its own, so its label is checked on each container it may sit on.
export const buttonColors = {
  primary: {
    background: colors.actionPrimary,
    pressedBackground: colors.actionPrimaryPressed,
    border: colors.actionPrimary,
    label: colors.textOnAction,
    labelTone: 'onAction',
  },
  secondary: {
    background: colors.surface,
    pressedBackground: colors.surfaceSoft,
    border: colors.borderControl,
    label: colors.actionPrimary,
    labelTone: 'action',
  },
  plain: {
    background: TRANSPARENT,
    pressedBackground: colors.surfaceSoft,
    border: TRANSPARENT,
    label: colors.actionPrimary,
    labelTone: 'action',
  },
} as const satisfies Record<ButtonVariant, ButtonColors>;

export const disabledButtonColors = {
  filled: { background: colors.disabledSurface, border: colors.disabledBorder },
  label: colors.disabledText,
} as const;

type ButtonProps = {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  // Shows a spinner, keeps the label visible and ignores presses until the work finishes.
  loading?: boolean;
  // Optional SF Symbol before the label, in the label's color; the label still states the action.
  icon?: IconName;
  accessibilityHint?: string;
  testID?: string;
};

// Shared action control. Every variant keeps a 44 pt minimum touch target, wraps long labels and
// grows with Dynamic Type instead of truncating.
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const [focused, setFocused] = useState(false);
  const variantColors = buttonColors[variant];
  const inactive = disabled || loading;
  const showDisabledLook = disabled && !loading;
  const labelTone: TextTone = showDisabledLook ? 'disabled' : variantColors.labelTone;
  const spinnerColor = showDisabledLook ? disabledButtonColors.label : variantColors.label;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      // Keyboard focus (Full Keyboard Access) where the platform delivers focus events.
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        variant === 'plain' ? styles.plain : styles.filled,
        {
          backgroundColor: pressed ? variantColors.pressedBackground : variantColors.background,
          borderColor: variantColors.border,
        },
        showDisabledLook && variant !== 'plain' && styles.disabledFilled,
        focused && styles.focused,
      ]}>
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={spinnerColor} accessibilityElementsHidden /> : null}
        {icon && !loading ? <Icon name={icon} role="headline" tone={labelTone} weight="semibold" /> : null}
        <AppText role="headline" tone={labelTone} style={styles.label} accessible={false}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: borders.control,
  },
  filled: {
    paddingVertical: spacing.md - borders.control,
    paddingHorizontal: spacing.lg,
  },
  plain: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  disabledFilled: {
    backgroundColor: disabledButtonColors.filled.background,
    borderColor: disabledButtonColors.filled.border,
  },
  focused: {
    borderColor: colors.focus,
    borderWidth: borders.emphasis,
    // Grow outward so the thicker outline does not shift the label.
    margin: borders.control - borders.emphasis,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: {
    flexShrink: 1,
    textAlign: 'center',
  },
});
