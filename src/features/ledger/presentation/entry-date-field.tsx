import { DatePicker, Host } from '@expo/ui/swift-ui';
import { datePickerStyle, labelsHidden } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';

import { compareCivilDates, type CivilDate } from '@/core/calendar';
import { civilDateToLocalDate, localDateToCivilDate } from '@/shared/i18n/local-date';
import { colors, spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Icon } from '@/shared/ui/icon';
import { IconTile } from '@/shared/ui/icon-tile';
import { ListCell } from '@/shared/ui/list-row';

type EntryDateFieldProps = {
  value: CivilDate;
  onChange: (value: CivilDate) => void;
  // Today's local date when the form opened: the latest date the picker offers.
  today: CivilDate;
  error?: string;
};

// Entry date as one row of the form's grouped card (Phase 07.5), with the native SwiftUI date
// picker (@expo/ui) at its trailing edge. It defaults to today and offers no later date, because
// entries can't be dated in the future (v1.2 section 3). The command checks the date again against
// the clock at save time, so a time-zone change while the form is open is still caught.
export function EntryDateField({ value, onChange, today, error }: EntryDateFieldProps) {
  const isToday = compareCivilDates(value, today) === 0;
  return (
    <ListCell>
      <View style={styles.row}>
        <IconTile name="calendar" color="red" />
        <View style={styles.text}>
          <AppText accessibilityElementsHidden>Date</AppText>
          <AppText role="footnote" tone="secondary" testID="entry-date-summary">
            {isToday ? 'Today' : 'Counts in date order'}
          </AppText>
        </View>
        <Host matchContents colorScheme="light" seedColor={colors.actionPrimary} testID="entry-date-picker">
          <DatePicker
            title="Date"
            selection={civilDateToLocalDate(value)}
            range={{ end: civilDateToLocalDate(today) }}
            displayedComponents={['date']}
            onDateChange={(date) => onChange(localDateToCivilDate(date))}
            // The row's own "Date" text labels the picker; SwiftUI's inline label would repeat it and
            // push the date past the edge at the largest text sizes. The title stays as the VoiceOver
            // label.
            modifiers={[datePickerStyle('compact'), labelsHidden()]}
          />
        </Host>
      </View>
      {error ? (
        <View style={styles.errorRow} accessible accessibilityRole="alert" accessibilityLabel={`Error: ${error}`} testID="entry-date-error">
          <Icon name="error" role="footnote" tone="error" />
          <AppText role="footnote" tone="error" style={styles.errorText}>
            {error}
          </AppText>
        </View>
      ) : null}
    </ListCell>
  );
}

const styles = StyleSheet.create({
  // Wraps at large text sizes, so the picker moves under the label instead of off the edge.
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: spacing.md,
    rowGap: spacing.sm,
  },
  text: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 120,
    gap: spacing.xs / 2,
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
