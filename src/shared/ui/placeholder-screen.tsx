import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/shared/theme';

import { AppText } from './app-text';

// Temporary shell content until feature screens exist. It uses the Phase 02 tokens and text roles;
// Phase 03 replaces its inset/layout policy with the shared Screen primitives.
type PlaceholderScreenProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function PlaceholderScreen({ title, description, children }: PlaceholderScreenProps) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      style={styles.scroll}>
      <AppText role="title" accessibilityRole="header">
        {title}
      </AppText>
      <AppText tone="secondary">{description}</AppText>
      {children ? <View style={styles.children}>{children}</View> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  children: {
    gap: spacing.md,
  },
});
