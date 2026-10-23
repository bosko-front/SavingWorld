import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/shared/theme';

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

// Goal progress track with milestone marks (DESIGN_SYSTEM "Visual direction"). The fill color
// follows the progress range; the exact percentage is always also written in text next to the bar, so the bar is
// a supporting cue and never the only one. VoiceOver reads it as a progress bar with the percent.
export function ProgressBar({ fraction, percent, milestones = 10, accessibilityLabel = 'Progress', testID }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, fraction));
  const marks = Array.from({ length: Math.max(0, milestones - 1) }, (_, index) => (index + 1) / milestones);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.min(100, Math.max(0, percent)), text: `${percent}%` }}
      style={styles.track}
      testID={testID}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: progressFillColor(percent) }]} />
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
