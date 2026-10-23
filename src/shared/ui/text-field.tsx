import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { borders, colors, layout, radii, spacing, typography } from '@/shared/theme';

import { AppText } from './app-text';

// Outline colors by state; tests/unit/contrast.test.ts checks each against the field surface.
export const fieldColors = {
  background: colors.surface,
  text: colors.textPrimary,
  placeholder: colors.textSecondary,
  border: colors.borderControl,
  focusBorder: colors.focus,
  errorBorder: colors.error,
  disabledBackground: colors.disabledSurface,
  disabledBorder: colors.disabledBorder,
  disabledText: colors.disabledText,
} as const;

type TextFieldProps = Pick<
  TextInputProps,
  | 'placeholder'
  | 'keyboardType'
  | 'inputMode'
  | 'autoCapitalize'
  | 'autoCorrect'
  | 'autoComplete'
  | 'textContentType'
  | 'returnKeyType'
  | 'onSubmitEditing'
  | 'multiline'
  | 'maxLength'
  | 'testID'
> & {
  // Always visible above the input and used as its accessibility label.
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  hint?: string;
  // Shown below the input in place of the hint, with a thicker error outline.
  error?: string;
  disabled?: boolean;
};

// Generic labelled text input. It holds raw text only; parsing and validating amounts or dates
// belongs to the domain helpers (Phase 04) and the owning form.
export function TextField({ label, value, onChangeText, hint, error, disabled = false, ...inputProps }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const errorLabel = error ? `Error: ${error}` : undefined;

  return (
    <View style={styles.container}>
      {/* The input carries the label for VoiceOver; hide the duplicate visual label. */}
      <AppText role="label" tone={disabled ? 'disabled' : 'primary'} accessibilityElementsHidden>
        {label}
      </AppText>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        accessibilityHint={errorLabel ?? hint}
        accessibilityState={{ disabled }}
        editable={!disabled}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={fieldColors.placeholder}
        selectionColor={colors.actionPrimary}
        style={[
          styles.input,
          inputProps.multiline && styles.multiline,
          focused && styles.focused,
          errorLabel !== undefined && styles.error,
          disabled && styles.disabled,
        ]}
      />
      {error ? (
        // The warning glyph and thicker outline mark the error without relying on color.
        <AppText role="footnote" tone="error" accessibilityLabel={errorLabel}>
          {`${WARNING_GLYPH} ${error}`}
        </AppText>
      ) : hint ? (
        <AppText role="footnote" tone="secondary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const INPUT_PADDING = spacing.md;
// U+26A0 with the text-style variation selector, so it renders in the error color, not as emoji.
const WARNING_GLYPH = '⚠︎';

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  input: {
    minHeight: layout.minTouchTarget,
    paddingHorizontal: INPUT_PADDING,
    paddingVertical: spacing.sm + borders.emphasis - borders.control,
    borderRadius: radii.md,
    borderWidth: borders.control,
    borderColor: fieldColors.border,
    backgroundColor: fieldColors.background,
    color: fieldColors.text,
    fontSize: typography.body.fontSize,
  },
  multiline: {
    minHeight: layout.minTouchTarget * 2,
    textAlignVertical: 'top',
  },
  // Thicker outlines keep focus and error visible without relying on color; padding shrinks by the
  // same amount so the text does not move.
  focused: {
    borderWidth: borders.emphasis,
    borderColor: fieldColors.focusBorder,
    paddingHorizontal: INPUT_PADDING - (borders.emphasis - borders.control),
    paddingVertical: spacing.sm,
  },
  error: {
    borderWidth: borders.emphasis,
    borderColor: fieldColors.errorBorder,
    paddingHorizontal: INPUT_PADDING - (borders.emphasis - borders.control),
    paddingVertical: spacing.sm,
  },
  disabled: {
    backgroundColor: fieldColors.disabledBackground,
    borderColor: fieldColors.disabledBorder,
    color: fieldColors.disabledText,
  },
});
