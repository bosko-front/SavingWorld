import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { useFontScale } from '@/shared/layout';
import { borders, colors, elevation, layout, radii, spacing } from '@/shared/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';
import { IconTile, type TileColor } from './icon-tile';

type ListGroupProps = {
  children: ReactNode;
  testID?: string;
};

// A grouped set of rows on one rounded surface, separated by hairlines (iOS inset-grouped style).
// Use it for secondary actions and settings rather than a stack of full-width buttons.
export function ListGroup({ children, testID }: ListGroupProps) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.group} testID={testID}>
      {rows.map((row, index) => (
        <Fragment key={row.key ?? index}>
          {index > 0 ? <View style={styles.separator} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

// A row of a ListGroup for custom content (a native date picker, an inset text field): the same
// padding and minimum height as ListRow, without its title/value layout.
export function ListCell({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View style={styles.cell} testID={testID}>
      {children}
    </View>
  );
}

type ListRowProps = {
  title: string;
  // Leading icon, drawn as a soft IconTile in `iconColor` (red for destructive rows, neutral when
  // disabled).
  icon?: IconName;
  iconColor?: TileColor;
  // Short supporting text under the title.
  detail?: string;
  // Short value at the trailing edge ("2 entries", "RSD").
  value?: string;
  // `action` rows open something; `destructive` uses the error color for its title and icon.
  tone?: 'action' | 'destructive';
  // Shows a disclosure chevron: the row navigates to another screen.
  chevron?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  // Shows a spinner at the trailing edge and ignores presses while the row's action runs.
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
};

// From the accessibility text sizes on, a trailing value moves under the title, so the title keeps
// the row's width instead of breaking inside a word ("Versi-on" on the SE, D110).
const STACK_VALUE_TEXT_SCALE = 1.6;

// One row of a ListGroup. Pressable when it has `onPress` (also inside `Link asChild`, which passes
// onPress); otherwise a static, readable row. 44 pt minimum; title and detail wrap with text size.
export function ListRow({
  title,
  icon,
  iconColor = 'green',
  detail,
  value,
  tone = 'action',
  chevron = false,
  onPress,
  disabled = false,
  loading = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ListRowProps) {
  const stackValue = useFontScale() > STACK_VALUE_TEXT_SCALE;
  const inactive = disabled || loading;
  const titleTone = disabled ? 'disabled' : tone === 'destructive' ? 'error' : 'primary';
  const tileColor: TileColor = disabled ? 'neutral' : tone === 'destructive' ? 'red' : iconColor;
  const label = accessibilityLabel ?? [title, value, detail].filter(Boolean).join(', ');
  const content = (
    <>
      {icon ? <IconTile name={icon} color={tileColor} /> : null}
      <View style={styles.text}>
        <AppText tone={titleTone}>{title}</AppText>
        {detail ? (
          <AppText role="footnote" tone="secondary">
            {detail}
          </AppText>
        ) : null}
        {value && stackValue ? <AppText tone="secondary">{value}</AppText> : null}
      </View>
      {value && !stackValue ? (
        <AppText tone="secondary" style={styles.value}>
          {value}
        </AppText>
      ) : null}
      {loading ? <ActivityIndicator color={colors.actionPrimary} accessibilityElementsHidden /> : null}
      {chevron && !loading ? <Icon name="chevron" role="footnote" tone="secondary" weight="semibold" /> : null}
    </>
  );
  if (!onPress) {
    return (
      <View style={styles.row} accessible accessibilityLabel={label} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: borders.hairline,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    ...elevation.card,
  },
  separator: {
    height: borders.hairline,
    marginStart: spacing.lg,
    backgroundColor: colors.borderSubtle,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.minTouchTarget,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  pressed: {
    backgroundColor: colors.surfaceSoft,
  },
  cell: {
    gap: spacing.xs,
    minHeight: layout.minTouchTarget,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  text: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
  },
});
