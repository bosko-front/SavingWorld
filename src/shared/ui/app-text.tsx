import type { ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { colors, typography, type TextRole } from '@/shared/theme';

export type TextTone = 'primary' | 'secondary' | 'action' | 'onAction' | 'error' | 'success' | 'info' | 'disabled';

type AppTextProps = Pick<
  TextProps,
  'accessibilityLabel' | 'accessibilityRole' | 'accessibilityElementsHidden' | 'accessible' | 'numberOfLines' | 'testID'
> & {
  role?: TextRole;
  tone?: TextTone;
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

const toneStyles = StyleSheet.create({
  primary: { color: colors.textPrimary },
  secondary: { color: colors.textSecondary },
  action: { color: colors.actionPrimary },
  onAction: { color: colors.textOnAction },
  error: { color: colors.error },
  success: { color: colors.success },
  info: { color: colors.info },
  disabled: { color: colors.disabledText },
});
