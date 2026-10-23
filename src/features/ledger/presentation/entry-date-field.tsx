import { DatePicker, Host } from '@expo/ui/swift-ui';
import { datePickerStyle, labelsHidden } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';

import { compareCivilDates, type CivilDate } from '@/core/calendar';
import { civilDateToLocalDate, localDateToCivilDate } from '@/shared/i18n/local-date';
import { formatCivilDate } from '@/shared/i18n/locale';
import { colors, spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Icon } from '@/shared/ui/icon';

type EntryDateFieldProps = {
  value: CivilDate;
  onChange: (value: CivilDate) => void;
  // Today's local date when the form opened: the latest date the picker offers.
  today: CivilDate;
  error?: string;
};

// Entry date with the native SwiftUI date picker (@expo/ui, as the goal deadline). It defaults to
// today and offers no later date, because entries can't be dated in the future (v1.2 section 3).
// The command checks the date again against the clock at save time, so a time-zone change while
// the form is open is still caught.
export function EntryDateField({ value, onChange, today, error }: EntryDateFieldProps) {
  const isToday = compareCivilDates(value, today) === 0;
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Icon name="calendar" role="label" tone="primary" />
        <AppText role="label" accessibilityRole="header">
          Date
        </AppText>
      </View>
      <Host matchContents style={styles.picker} colorScheme="light" seedColor={colors.actionPrimary} testID="entry-date-picker">
        <DatePicker
          title="Date"
          selection={civilDateToLocalDate(value)}
          range={{ end: civilDateToLocalDate(today) }}
          displayedComponents={['date']}
          onDateChange={(date) => onChange(localDateToCivilDate(date))}
          // The visible label is our own header above; SwiftUI's inline label would sit beside the
          // date and push it past the edge at the largest text sizes. The title stays as the
          // VoiceOver label.
          modifiers={[datePickerStyle('compact'), labelsHidden()]}
        />
      </Host>
      <AppText role="footnote" tone="secondary" testID="entry-date-summary">
        {isToday
          ? `Today, ${formatCivilDate(value)}. Choose an earlier date for savings you set aside before.`
          : `${formatCivilDate(value)}. Entries count in date order.`}
      </AppText>
      {error ? (
        <View style={styles.errorRow} accessible accessibilityRole="alert" accessibilityLabel={`Error: ${error}`} testID="entry-date-error">
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
    alignSelf: 'flex-start',
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
