import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { borders, colors, elevation, radii, spacing } from '@/shared/theme';

type CardProps = {
  // `surface` for readable panels; `soft` for a quiet highlight or selected item.
  variant?: 'surface' | 'soft';
  children: ReactNode;
  testID?: string;
};

export function Card({ variant = 'surface', children, testID }: CardProps) {
  return (
    <View testID={testID} style={[styles.base, variant === 'surface' ? styles.surface : styles.soft]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
  },
  // The hairline is decorative; content inside a card meets contrast against the card itself.
  surface: {
    backgroundColor: colors.surface,
    borderWidth: borders.hairline,
    borderColor: colors.borderSubtle,
    ...elevation.card,
  },
  soft: {
    backgroundColor: colors.surfaceSoft,
  },
});
