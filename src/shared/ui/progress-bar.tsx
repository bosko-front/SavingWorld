import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, motion, radii, spacing } from '@/shared/theme';

import { useReduceMotion } from './motion-preferences';

type ProgressBarProps = {
  // Visual position 0..1 from the shared progression rules (sceneFeedback().overall); it never
  // decides an unlock or a financial value. Values outside 0..1 are clamped.
  fraction: number;
  // Floored whole percent shown in words next to the bar; also the accessibility value.
  percent: number;
  // Number of milestone marks drawn on the track (the ten 10% unlocks).
  milestones?: number;
  accessibilityLabel?: string;
  testID?: string;
  // Phase 10: a change of `fraction` glides to the new position over `durationMs` (Home matches the
  // amount's count-up); `animated: false`, Reduce Motion or a new `resetKey` (another goal) jump.
  animated?: boolean;
  durationMs?: number;
  resetKey?: string;
};

// Fill color for a floored whole percent (DECISIONS D66): the ranges change at the 30% and 60%
// milestones and at the target. Color is a supporting cue only; the percent is always in words.
export function progressFillColor(percent: number): string {
  if (percent >= 100) {
    return colors.progressComplete;
  }
  if (percent >= 60) {
    return colors.progressHigh;
  }
  return percent >= 30 ? colors.progressMid : colors.progressLow;
}

// Text tone for the percent written next to the bar: honey-brown below 60%, green from 60%.
export function progressTextTone(percent: number): 'accent' | 'success' {
  return percent >= 60 ? 'success' : 'accent';
}

// The D66 ranges change at 30%, 60% and 100%.
const RANGE_BOUNDARIES = [30, 60, 100] as const;

// Share of the track over which the fill blends into the next range color, just before it reaches
// the boundary on its way.
const COLOR_BLEND = 0.04;

export type FillColorStops = { input: number[]; output: string[] };

// Fill color along the track while the fill moves from one value to another (Phase 10): it keeps
// the start's range color, blends into each crossed range's color over the last COLOR_BLEND of the
// way to that boundary (or the first, when it starts right on it), and ends exactly on the D66 color
// of the final floored percent, so a bar at rest always has its range color. Positions are fractions of the track, strictly increasing.
export function fillColorStops(fromFraction: number, fromPercent: number, toFraction: number, toPercent: number): FillColorStops {
  const from = clamp01(fromFraction);
  const to = clamp01(toFraction);
  const fromColor = progressFillColor(fromPercent);
  const toColor = progressFillColor(toPercent);
  if (fromColor === toColor || from === to) {
    return { input: [0, 1], output: [toColor, toColor] };
  }
  const up = toPercent > fromPercent;
  const crossed = RANGE_BOUNDARIES.filter((boundary) => (up ? fromPercent < boundary && boundary <= toPercent : toPercent < boundary && boundary <= fromPercent));
  const stops: { at: number; color: string }[] = [{ at: from, color: fromColor }];
  let last = from;
  for (const boundary of up ? crossed : [...crossed].reverse()) {
    const at = Math.min(1, boundary / 100);
    const before = progressFillColor(boundary - 1);
    const after = progressFillColor(boundary);
    if (up) {
      stops.push({ at: Math.max(last, at - COLOR_BLEND), color: before }, { at, color: after });
      last = at;
    } else if (last > at) {
      stops.push({ at: Math.min(last, at + COLOR_BLEND), color: after }, { at, color: before });
      last = at;
    } else {
      // Starting exactly on the boundary (100% → 90%): blend over the first part of the way down.
      const end = Math.max(to, at - COLOR_BLEND);
      stops.push({ at, color: after }, { at: end, color: before });
      last = end;
    }
  }
  stops.push({ at: to, color: toColor });
  const ordered = up ? stops : stops.reverse();
  const input: number[] = [];
  const output: string[] = [];
  for (const stop of ordered) {
    // Equal positions keep the later color on the way (the range reached at that point).
    const lastAt = input.at(-1);
    if (lastAt !== undefined && stop.at <= lastAt) {
      if (up) {
        output[output.length - 1] = stop.color;
      }
      continue;
    }
    input.push(stop.at);
    output.push(stop.color);
  }
  return input.length > 1 ? { input, output } : { input: [0, 1], output: [toColor, toColor] };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

// Goal progress track with milestone marks (DESIGN_SYSTEM "Visual direction"). The fill color
// follows the progress range; the exact percentage is always also written in text next to the bar, so the bar is
// a supporting cue and never the only one. VoiceOver reads it as a progress bar with the percent.
// Since Phase 10 a change glides (UI thread) and blends its color across a range boundary; the
// accessibility value is always the final percent.
export function ProgressBar({
  fraction,
  percent,
  milestones = 10,
  accessibilityLabel = 'Progress',
  testID,
  animated = true,
  durationMs = motion.slow,
  resetKey,
}: ProgressBarProps) {
  const clamped = clamp01(fraction);
  const marks = Array.from({ length: Math.max(0, milestones - 1) }, (_, index) => (index + 1) / milestones);
  const reduced = useReduceMotion();
  const fill = useSharedValue(clamped);
  const stops = useSharedValue<FillColorStops>(fillColorStops(clamped, percent, clamped, percent));
  const previous = useRef({ fraction: clamped, percent, resetKey });

  useEffect(() => {
    const last = previous.current;
    previous.current = { fraction: clamped, percent, resetKey };
    if (last.fraction === clamped && last.percent === percent && last.resetKey === resetKey) {
      return;
    }
    cancelAnimation(fill);
    if (!animated || reduced || last.resetKey !== resetKey) {
      stops.value = fillColorStops(clamped, percent, clamped, percent);
      fill.value = clamped;
      return;
    }
    // A change that interrupts a glide continues from where the fill is now.
    const current = fill.value;
    const currentPercent = current === last.fraction ? last.percent : Math.floor(current * 100);
    stops.value = fillColorStops(current, currentPercent, clamped, percent);
    fill.value = withTiming(clamped, { duration: durationMs, easing: Easing.out(Easing.cubic) });
  }, [clamped, percent, resetKey, animated, reduced, durationMs, fill, stops]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fill.value * 100}%`,
    backgroundColor: interpolateColor(fill.value, stops.value.input, stops.value.output),
  }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.min(100, Math.max(0, percent)), text: `${percent}%` }}
      style={styles.track}
      testID={testID}>
      <Animated.View style={[styles.fill, fillStyle]} testID={testID ? `${testID}-fill` : undefined} />
      {marks.map((position) => (
        <View key={position} style={[styles.mark, { left: `${position * 100}%` }]} />
      ))}
    </View>
  );
}

const TRACK_HEIGHT = spacing.md;

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    borderRadius: radii.pill,
    backgroundColor: colors.progressTrack,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  // Thin separators at each 10% milestone, in the screen surface color so they read as gaps.
  mark: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    backgroundColor: colors.surface,
  },
});
