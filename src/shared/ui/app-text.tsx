import type { ReactNode, Ref } from 'react';
import { StyleSheet, Text, type HostInstance, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { colors, typography, type TextRole } from '@/shared/theme';

export type TextTone = 'primary' | 'secondary' | 'action' | 'onAction' | 'error' | 'success' | 'info' | 'disabled' | 'accent';

type AppTextProps = Pick<
  TextProps,
  'accessibilityLabel' | 'accessibilityRole' | 'accessibilityElementsHidden' | 'accessible' | 'numberOfLines' | 'testID'
> & {
  role?: TextRole;
  tone?: TextTone;
  // For moving VoiceOver to a heading that replaced other content (useAccessibilityFocusOnChange).
  ref?: Ref<HostInstance>;
  // Layout or a token-derived color only (alignment, margins, flex). Typography comes from `role`.
  style?: StyleProp<TextStyle>;
  children: ReactNode;
};

// All app text goes through this component so it uses system fonts, a semantic role and Dynamic
// Type scaling. Text wraps by default; pass numberOfLines only where truncation keeps meaning.
export function AppText({ role = 'body', tone = 'primary', style, children, ...rest }: AppTextProps) {
  const { ramp, ...roleStyle } = typography[role];
  return (
    <Text {...rest} dynamicTypeRamp={ramp} style={[roleStyle, toneStyles[tone], style]}>
      {children}
    </Text>
  );
}

// Text color per tone; tests/unit/contrast.test.ts uses it to check tone/surface pairs.
export const toneColors = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  action: colors.actionPrimary,
  onAction: colors.textOnAction,
  error: colors.error,
  success: colors.success,
  info: colors.info,
  disabled: colors.disabledText,
  accent: colors.accentText,
} as const satisfies Record<TextTone, string>;

const toneStyles = StyleSheet.create(
  Object.fromEntries(Object.entries(toneColors).map(([tone, color]) => [tone, { color }])) as Record<TextTone, { color: string }>,
);
