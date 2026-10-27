import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { borders, colors, radii, spacing } from '@/shared/theme';

import { AppText } from './app-text';
import { Icon } from './icon';

export type NoticeTone = 'error' | 'success' | 'info';

// Tone colors; tests/unit/contrast.test.ts checks title, message and accent against each surface.
export const noticeColors = {
  error: { surface: colors.errorSurface, accent: colors.error, titleTone: 'error' },
  success: { surface: colors.successSurface, accent: colors.success, titleTone: 'success' },
  info: { surface: colors.infoSurface, accent: colors.info, titleTone: 'info' },
} as const;

type NoticeProps = {
  tone: NoticeTone;
  // States the outcome in words ("Couldn't save"), so meaning never depends on color.
  title: string;
  message?: string;
  // Speaks the notice once when it appears or its text changes (Phase 19). iOS does not read an
  // `alert` element by itself, so a form's error after a submit sets this; focus stays where it is.
  announce?: boolean;
  testID?: string;
};

// Inline feedback for errors, confirmations and information inside a screen or form.
export function Notice({ tone, title, message, announce = false, testID }: NoticeProps) {
  const toneColors = noticeColors[tone];
  const spoken = message ? `${title}. ${message}` : title;
  useEffect(() => {
    if (announce) {
      AccessibilityInfo.announceForAccessibilityWithOptions(spoken, { queue: true });
    }
  }, [announce, spoken]);
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole={tone === 'error' ? 'alert' : 'text'}
      accessibilityLabel={spoken}
      style={[styles.container, { backgroundColor: toneColors.surface, borderStartColor: toneColors.accent }]}>
      <View style={styles.titleRow}>
        <Icon name={tone} role="headline" tone={toneColors.titleTone} />
        <AppText role="headline" tone={toneColors.titleTone} style={styles.title}>
          {title}
        </AppText>
      </View>
      {message ? <AppText role="callout">{message}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderStartWidth: borders.emphasis * 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flexShrink: 1,
  },
});
