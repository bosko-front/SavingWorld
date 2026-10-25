import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from './icon';
import { useAmbientMotion } from './motion-preferences';

// Animated empty states (owner request D69, Phase 10): a gentle, endless float for the picture of a
// centered empty state, and an optional soft sparkle. Subtle on purpose (a few points of movement),
// decorative and hidden from VoiceOver. It runs only while its screen is focused and the app is in
// the foreground, and Reduce Motion shows a still frame (useAmbientMotion).

const FLOAT_PERIOD_MS = 3600;

type AmbientFloatProps = {
  children: ReactNode;
  // Points the picture rises at the top of its float.
  amplitude?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function AmbientFloat({ children, amplitude = 4, style, testID }: AmbientFloatProps) {
  const running = useAmbientMotion();
  const rise = useSharedValue(0);

  useEffect(() => {
    if (running) {
      rise.value = withRepeat(withTiming(1, { duration: FLOAT_PERIOD_MS / 2, easing: Easing.inOut(Easing.sin) }), -1, true);
    } else {
      // Paused or reduced: rest on the still frame.
      cancelAnimation(rise);
      rise.value = 0;
    }
    return () => cancelAnimation(rise);
  }, [running, rise]);

  const floating = useAnimatedStyle(() => ({ transform: [{ translateY: -amplitude * rise.value }] }));

  return (
    <Animated.View
      style={[style, floating]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}>
      {children}
    </Animated.View>
  );
}

// Where a sparkle twinkles, as fractions of its container, and when in the shared cycle.
export type SparkleSpot = { x: number; y: number; delayMs: number };

const SPARKLE_CYCLE_MS = 2800;
const SPARKLE_GLOW_MS = 700;

// A few small sparkles that twinkle in turn over a picture (Home's empty Island). Same running rule
// as the float; nothing is drawn while paused, so a still frame stays clean.
export function AmbientSparkles({ spots, testID }: { spots: readonly SparkleSpot[]; testID?: string }) {
  const running = useAmbientMotion();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID={testID}>
      {running ? spots.map((spot) => <Sparkle key={`${spot.x}-${spot.y}`} spot={spot} />) : null}
    </View>
  );
}

function Sparkle({ spot }: { spot: SparkleSpot }) {
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value = withDelay(
      spot.delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: SPARKLE_GLOW_MS / 2, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: SPARKLE_GLOW_MS / 2, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: SPARKLE_CYCLE_MS - SPARKLE_GLOW_MS }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(glow);
  }, [glow, spot.delayMs]);

  const twinkle = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 0.6 + 0.4 * glow.value }] }));

  return (
    <Animated.View style={[styles.sparkle, { left: `${spot.x * 100}%`, top: `${spot.y * 100}%` }, twinkle]}>
      <Icon name="sparkle" role="footnote" tone="accent" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sparkle: {
    position: 'absolute',
  },
});
