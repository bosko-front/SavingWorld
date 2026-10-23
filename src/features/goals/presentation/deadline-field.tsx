import { DatePicker, Host } from '@expo/ui/swift-ui';
import { datePickerStyle } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';

import { compareCivilDates, type CivilDate } from '@/core/calendar';
import { civilDateToLocalDate, localDateToCivilDate } from '@/shared/i18n/local-date';
import { formatCivilDate } from '@/shared/i18n/locale';
import { colors, spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';

type DeadlineFieldProps = {
  value: CivilDate | null;
  onChange: (value: CivilDate | null) => void;
  today: CivilDate;
  // The goal's saved deadline, which may already have passed; it stays selectable as it is.
  savedDeadline: CivilDate | null;
  error?: string;
};

// Optional goal deadline with the native SwiftUI date picker (@expo/ui, DESIGN_SYSTEM UX library
// plan). New dates start at today; a saved deadline that has passed stays visible and can be kept
// or removed, because an existing deadline may expire naturally (v1.2 section 7).
export function DeadlineField({ value, onChange, today, savedDeadline, error }: DeadlineFieldProps) {
  const earliest = savedDeadline !== null && compareCivilDates(savedDeadline, today) < 0 ? savedDeadline : today;
  const passed = value !== null && compareCivilDates(value, today) < 0;
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Icon name="calendar" role="label" tone="primary" />
        <AppText role="label" accessibilityRole="header">
          Deadline (optional)
        </AppText>
      </View>
      {value === null ? (
        <>
          <AppText role="footnote" tone="secondary">
            Without a deadline there is no weekly or monthly estimate.
          </AppText>
          <Button label="Add a deadline" variant="secondary" icon="calendar" onPress={() => onChange(today)} testID="deadline-add" />
        </>
      ) : (
        <>
          <Host matchContents style={styles.picker} colorScheme="light" seedColor={colors.actionPrimary} testID="deadline-picker">
            <DatePicker
              title="Deadline"
              selection={civilDateToLocalDate(value)}
              range={{ start: civilDateToLocalDate(earliest) }}
              displayedComponents={['date']}
              onDateChange={(date) => onChange(localDateToCivilDate(date))}
              modifiers={[datePickerStyle('compact')]}
            />
          </Host>
          <AppText role="footnote" tone="secondary" testID="deadline-summary">
            {passed
              ? `This deadline passed on ${formatCivilDate(value)}. Keep it, choose today or a later date, or remove it.`
              : `Save by ${formatCivilDate(value)}.`}
          </AppText>
          <Button label="Remove deadline" variant="plain" onPress={() => onChange(null)} testID="deadline-remove" />
        </>
      )}
      {error ? (
        <View style={styles.errorRow} accessible accessibilityRole="alert" accessibilityLabel={`Error: ${error}`}>
          <Icon name="error" role="footnote" tone="error" />
          <AppText role="footnote" tone="error" style={styles.errorText}>
            {error}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  picker: {
    alignSelf: 'stretch',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  errorText: {
    flexShrink: 1,
  },
});
