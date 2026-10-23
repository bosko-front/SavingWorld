import { DatePicker, Host } from '@expo/ui/swift-ui';
import { datePickerStyle, labelsHidden } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';

import { compareCivilDates, type CivilDate } from '@/core/calendar';
import { civilDateToLocalDate, localDateToCivilDate } from '@/shared/i18n/local-date';
import { formatCivilDate } from '@/shared/i18n/locale';
import { colors, spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { IconTile } from '@/shared/ui/icon-tile';
import { ListCell, ListRow } from '@/shared/ui/list-row';

type DeadlineFieldProps = {
  value: CivilDate | null;
  onChange: (value: CivilDate | null) => void;
  today: CivilDate;
  // The goal's saved deadline, which may already have passed; it stays selectable as it is.
  savedDeadline: CivilDate | null;
  error?: string;
};

// Optional goal deadline as one row of the goal form's grouped card (Phase 07.5), with the native
// SwiftUI date picker (@expo/ui). Without a deadline the row adds one (today); with one, the picker
// sits at the row's trailing edge with Remove below. New dates start at today; a saved deadline that
// has passed stays visible and can be kept or removed, because an existing deadline may expire
// naturally (v1.2 section 7).
export function DeadlineField({ value, onChange, today, savedDeadline, error }: DeadlineFieldProps) {
  if (value === null) {
    return (
      <ListRow
        title="Add a deadline"
        icon="calendar"
        iconColor="red"
        detail="Optional. Gives a weekly and monthly estimate."
        onPress={() => onChange(today)}
        testID="deadline-add"
      />
    );
  }
  const earliest = savedDeadline !== null && compareCivilDates(savedDeadline, today) < 0 ? savedDeadline : today;
  const passed = compareCivilDates(value, today) < 0;
  return (
    <ListCell>
      <View style={styles.row}>
        <IconTile name="calendar" color="red" />
        <View style={styles.text}>
          <AppText accessibilityElementsHidden>Deadline</AppText>
          <AppText role="footnote" tone={passed ? 'primary' : 'secondary'} testID="deadline-summary">
            {passed ? `Passed on ${formatCivilDate(value)}. Keep it, pick a new date or remove it.` : `Save by ${formatCivilDate(value)}`}
          </AppText>
        </View>
        <Host matchContents colorScheme="light" seedColor={colors.actionPrimary} testID="deadline-picker">
          <DatePicker
            title="Deadline"
            selection={civilDateToLocalDate(value)}
            range={{ start: civilDateToLocalDate(earliest) }}
            displayedComponents={['date']}
            onDateChange={(date) => onChange(localDateToCivilDate(date))}
            // The row's own "Deadline" text labels the picker; SwiftUI's inline label repeated it
            // (Phase 07.5, as the entry date in D61). The title stays as the VoiceOver label.
            modifiers={[datePickerStyle('compact'), labelsHidden()]}
          />
        </Host>
      </View>
      {error ? (
        <View style={styles.errorRow} accessible accessibilityRole="alert" accessibilityLabel={`Error: ${error}`}>
          <Icon name="error" role="footnote" tone="error" />
          <AppText role="footnote" tone="error" style={styles.errorText}>
            {error}
          </AppText>
        </View>
      ) : null}
      <Button label="Remove deadline" variant="plain" onPress={() => onChange(null)} testID="deadline-remove" />
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
