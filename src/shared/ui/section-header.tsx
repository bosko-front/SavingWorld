import { StyleSheet, View } from 'react-native';

import { spacing } from '@/shared/theme';

import { AppText } from './app-text';

type SectionHeaderProps = {
  title: string;
  // One short line under the title, for context the section needs ("Read-only until you reopen").
  caption?: string;
  testID?: string;
};

// The one heading style for a group of content inside a screen (DESIGN_SYSTEM "Visual direction").
// The screen's own title is the native navigation title; screens never repeat it in the content.
export function SectionHeader({ title, caption, testID }: SectionHeaderProps) {
  return (
    <View style={styles.container} testID={testID}>
      <AppText role="headline" accessibilityRole="header">
        {title}
      </AppText>
      {caption ? (
        <AppText role="footnote" tone="secondary">
          {caption}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs / 2,
    paddingTop: spacing.sm,
  },
});
