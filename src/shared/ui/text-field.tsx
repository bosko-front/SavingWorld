import { useState, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';

import { useFontScale } from '@/shared/layout';
import { borders, colors, layout, radii, spacing, typography } from '@/shared/theme';

import { AppText } from './app-text';
import { Icon } from './icon';

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

export type TextFieldVariant = 'default' | 'amount' | 'inset';

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
  // Always visible above the input and used as its accessibility label, unless accessibilityLabel
  // gives a fuller spoken name ("Amount (EUR)" when the code is already shown as the suffix).
  label: string;
  accessibilityLabel?: string;
  // `default`: outlined field. `amount`: the large display-size number of a money form, with
  // `suffix` (the currency code) inside the outline. `inset`: borderless, for a row inside a
  // ListGroup card; the label is a small caption and errors still show the icon and message.
  variant?: TextFieldVariant;
  suffix?: string;
  value: string;
  onChangeText: (text: string) => void;
  hint?: string;
  // Shown below the input in place of the hint, with a thicker error outline.
  error?: string;
  disabled?: boolean;
  // Lets a form move focus to this input, for example back to a field after an error.
  inputRef?: Ref<TextInputInstance>;
};

// Generic labelled text input. It holds raw text only; parsing and validating amounts or dates
// belongs to the domain helpers (Phase 04) and the owning form.
export function TextField({
  label,
  accessibilityLabel,
  variant = 'default',
  suffix,
  value,
  onChangeText,
  hint,
  error,
  disabled = false,
  inputRef,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  // At accessibility text sizes the display-size number no longer fits a phone width and iOS would
  // cut it to "1…"; the title role (which still grows with Dynamic Type) keeps the whole amount
  // visible. Nothing caps the text size.
  const amountFont = useFontScale() > AMOUNT_DISPLAY_MAX_SCALE ? typography.title : typography.display;
  const errorLabel = error ? `Error: ${error}` : undefined;
  // Outline, focus and error state for the outlined variants; the amount field draws it on a
  // wrapper so the currency suffix sits inside the same box.
  const outline = [
    variant === 'amount' ? styles.amountBox : styles.input,
    focused && styles.focused,
    errorLabel !== undefined && styles.error,
    disabled && styles.disabled,
  ];
  const inputStyle =
    variant === 'amount'
      ? [styles.amountInput, { fontSize: amountFont.fontSize, fontWeight: amountFont.fontWeight }, disabled && styles.disabledText]
      : variant === 'inset'
        ? [styles.insetInput, inputProps.multiline && styles.insetMultiline, disabled && styles.disabledText]
        : [...outline, inputProps.multiline && styles.multiline];

  const input = (
    <TextInput
      {...inputProps}
      ref={inputRef}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={errorLabel ?? hint}
      accessibilityState={{ disabled }}
      editable={!disabled}
      value={value}
      onChangeText={onChangeText}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholderTextColor={fieldColors.placeholder}
      selectionColor={colors.actionPrimary}
      style={inputStyle}
    />
  );

  return (
    <View style={styles.container}>
      {/* The input carries the label for VoiceOver; hide the duplicate visual label. */}
      <AppText
        role={variant === 'inset' ? 'footnote' : 'label'}
        tone={disabled ? 'disabled' : variant === 'inset' ? 'secondary' : 'primary'}
        accessibilityElementsHidden>
        {label}
      </AppText>
      {variant === 'amount' ? (
        <View style={outline}>
          {input}
          {suffix ? (
            <AppText role="title" tone="secondary" accessibilityElementsHidden>
              {suffix}
            </AppText>
          ) : null}
        </View>
      ) : (
        input
      )}
      {error ? (
        // The error icon (and, on outlined fields, the thicker outline) mark the error without
        // relying on color.
        <View style={styles.errorRow} accessible accessibilityLabel={errorLabel}>
          <Icon name="error" role="footnote" tone="error" />
          <AppText role="footnote" tone="error" style={styles.errorText}>
            {error}
          </AppText>
        </View>
      ) : hint ? (
        <AppText role="footnote" tone="secondary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const INPUT_PADDING = spacing.md;
// Font scale above which the amount field switches from the display role to the title role.
const AMOUNT_DISPLAY_MAX_SCALE = 1.35;

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  errorText: {
    flexShrink: 1,
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
  // Wraps, so at large text sizes the currency code moves under the number instead of squeezing it.
  amountBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: spacing.sm,
    minHeight: layout.minTouchTarget * 1.5,
    paddingHorizontal: INPUT_PADDING,
    paddingVertical: spacing.sm + borders.emphasis - borders.control,
    borderRadius: radii.lg,
    borderWidth: borders.control,
    borderColor: fieldColors.border,
    backgroundColor: fieldColors.background,
  },
  amountInput: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 160,
    padding: 0,
    color: fieldColors.text,
    fontVariant: ['tabular-nums'],
  },
  insetInput: {
    minHeight: layout.minTouchTarget,
    padding: 0,
    color: fieldColors.text,
    fontSize: typography.body.fontSize,
  },
  insetMultiline: {
    minHeight: layout.minTouchTarget * 1.5,
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
  disabledText: {
    color: fieldColors.disabledText,
  },
});
