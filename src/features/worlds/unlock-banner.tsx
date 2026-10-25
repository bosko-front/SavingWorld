import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { colors, elevation, motion, radii, spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Icon } from '@/shared/ui/icon';

import type { UnlockBanner as UnlockBannerState } from './use-world-motion';

// "New milestone unlocked!" (owner direction D73): part of the world, shown at the bottom of the
// scene while the new object appears, never a toast (D40 keeps celebrations out of toasts). It names
// the stage from the theme manifest; several thresholds in one deposit give one message ("2
// milestones unlocked!"). It slides up gently (Reanimated skips that under Reduce Motion), leaves
// after a few seconds and a tap dismisses it. VoiceOver hears it once from the announcement and can
// still focus it while it is shown.
export function UnlockBanner({ banner, onDismiss }: { banner: UnlockBannerState; onDismiss: () => void }) {
  return (
    <Animated.View
      key={banner.key}
      entering={FadeInDown.duration(motion.slow)}
      exiting={FadeOut.duration(motion.standard)}
      style={styles.position}
      pointerEvents="box-none">
      <Pressable
        onPress={onDismiss}
        accessibilityRole="text"
        accessibilityLabel={`${banner.title} ${banner.detail}`}
        accessibilityHint="Double-tap to dismiss."
        style={styles.card}
        testID="unlock-banner">
        <Icon name="unlocked" role="headline" tone="accent" filled />
        <View style={styles.text}>
          <AppText role="label" testID="unlock-banner-title">
            {banner.title}
          </AppText>
          <AppText role="footnote" tone="secondary" testID="unlock-banner-detail">
            {banner.detail}
          </AppText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  position: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 360,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...elevation.card,
  },
  text: {
    flexShrink: 1,
  },
});
