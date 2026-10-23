import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { layout, spacing } from '@/shared/theme';

export type ColumnWidth = 'readable' | 'form';

const MAX_WIDTH: Record<ColumnWidth, number> = {
  readable: layout.readableMaxWidth,
  form: layout.formMaxWidth,
};

type ContentColumnProps = {
  // `readable` for text and summaries, `form` for inputs. Both are content limits, not device classes.
  width?: ColumnWidth;
  children: ReactNode;
};

// Centers content in a column that fills narrow windows and stops growing at a readable width, so
// forms and financial text never stretch across a wide inner display.
export function ContentColumn({ width = 'readable', children }: ContentColumnProps) {
  return <View style={[styles.column, { maxWidth: MAX_WIDTH[width] }]}>{children}</View>;
}

const styles = StyleSheet.create({
  column: {
    width: '100%',
    alignSelf: 'center',
    gap: spacing.md,
  },
});
