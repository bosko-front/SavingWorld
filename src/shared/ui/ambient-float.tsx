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
  // One full rise and fall, and how long the picture rests before its first rise (Collection
  // cards, D100: each card starts at a different point so the worlds never float in step).
  periodMs?: number;
  delayMs?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function AmbientFloat({ children, amplitude = 4, periodMs = FLOAT_PERIOD_MS, delayMs = 0, style, testID }: AmbientFloatProps) {
  const running = useAmbientMotion();
  const rise = useSharedValue(0);

  useEffect(() => {
    if (running) {
      rise.value = withDelay(
        delayMs,
        withRepeat(withTiming(1, { duration: periodMs / 2, easing: Easing.inOut(Easing.sin) }), -1, true),
      );
    } else {
      // Paused or reduced: rest on the still frame.
      cancelAnimation(rise);
      rise.value = 0;
    }
    return () => cancelAnimation(rise);
  }, [running, rise, periodMs, delayMs]);

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
// as the float; nothing is drawn while paused, so a still frame stays clean. `once` (Phase 11, D98:
// a finished world in Collection) makes each sparkle glow a single time, a short one-shot burst that
// plays again only when the screen is shown again (D97 motion budget). `large` draws them at title size
// for a big picture, where footnote-size sparkles disappear in the art.
type AmbientSparklesProps = { spots: readonly SparkleSpot[]; once?: boolean; large?: boolean; testID?: string };

export function AmbientSparkles({ spots, once = false, large = false, testID }: AmbientSparklesProps) {
  const running = useAmbientMotion();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID={testID}>
      {running ? spots.map((spot) => <Sparkle key={`${spot.x}-${spot.y}`} spot={spot} once={once} large={large} />) : null}
    </View>
  );
}

function Sparkle({ spot, once, large }: { spot: SparkleSpot; once: boolean; large: boolean }) {
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
        once ? 1 : -1,
      ),
    );
    return () => cancelAnimation(glow);
  }, [glow, spot.delayMs, once]);

  const twinkle = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 0.6 + 0.4 * glow.value }] }));

  return (
    <Animated.View style={[styles.sparkle, { left: `${spot.x * 100}%`, top: `${spot.y * 100}%` }, twinkle]}>
      <Icon name="sparkle" role={large ? 'title' : 'footnote'} tone="accent" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sparkle: {
    position: 'absolute',
  },
});
