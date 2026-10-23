import type { ReactNode } from 'react';
import { PlatformColor, ScrollView, StyleSheet, Text, View } from 'react-native';

// Temporary Phase 01 shell content. Phase 02 replaces these system colors and text styles with
// shared palette tokens and primitives; Phase 03 replaces the inset/layout policy.
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
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.description}>{description}</Text>
      {children ? <View style={styles.children}>{children}</View> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: PlatformColor('systemGroupedBackground'),
  },
  content: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: PlatformColor('label'),
  },
  description: {
    fontSize: 17,
    color: PlatformColor('secondaryLabel'),
  },
  children: {
    gap: 12,
  },
});
