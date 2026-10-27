import { useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { CHART_COPY } from '@/shared/i18n/chart-copy';
import { useFontScale, useMeasuredSize } from '@/shared/layout';
import { borders, colors, radii, spacing, typography } from '@/shared/theme';

import { AppText } from './app-text';
import { haptics } from './haptics';

export type ChartPoint = {
  // Drawing position on the value axis (any real number; exact values are in `detail`).
  value: number;
  // What the point is, e.g. its date ("Oct 12, 2026").
  title: string;
  // Its exact value as text, e.g. "€330.00".
  detail: string;
};

export type ChartGridline = { value: number; label: string };

export type ChartAxisLabel = { index: number; label: string };

type StepChartProps = {
  // Oldest first, at least two.
  points: readonly ChartPoint[];
  // The value range drawn, bottom to top (min < max). Callers include zero, so a zero balance sits on
  // a visible line rather than at an arbitrary bottom.
  domain: readonly [number, number];
  // Labeled horizontal lines (for example the top value and zero).
  gridlines: readonly ChartGridline[];
  // Labels under the chart at point positions: the first, an optional middle one and the last.
  xLabels: readonly ChartAxisLabel[];
  // What the chart shows, for VoiceOver; the selected point is its value.
  accessibilityLabel: string;
  // How to move between days with VoiceOver; the English default suits a daily chart.
  accessibilityHint?: string;
  testID?: string;
};

const MIN_HEIGHT = 140;
const MAX_HEIGHT = 220;
const ASPECT = 0.5;
const STROKE = 2.5;
const DOT = 5;
const SIDE = DOT + STROKE;
// Above this text scale the middle date label is left out, so the dates never overlap.
const COMPACT_TEXT_SCALE = 1.35;

// A step chart of recorded values (DESIGN_SYSTEM "World-first design direction": minimal and soft,
// react-native-svg only). Each value holds flat until the next point's value, so nothing between two
// points is invented or smoothed; flat and zero periods stay flat. A readout above the chart shows the
// selected point (the newest at first); a tap or a horizontal drag on the chart selects another (one
// selection haptic per change), and VoiceOver adjusts it with a swipe up or down. The stroke runs from
// the honey accent to the soft green of the progress ramp over a faint warm fill. It sizes from its own
// measured width, so it reflows with the column, rotation and Duo. No animation.
export function StepChart({ points, domain, gridlines, xLabels, accessibilityLabel, accessibilityHint = CHART_COPY.dailyHint, testID }: StepChartProps) {
  const last = points.length - 1;
  const [chosen, setChosen] = useState<number | null>(null);
  const selected = Math.min(chosen ?? last, last);
  const point = points[selected];
  const [size, onLayout] = useMeasuredSize();
  const fontScale = useFontScale();
  const labelHeight = Math.ceil(typography.caption.lineHeight * fontScale) + spacing.xs;
  // Room above the top line and below the bottom line for their labels, so no value label ever sits on
  // the plotted line, at any text size.
  const height = Math.round(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, size.width * ASPECT))) + labelHeight * 2;
  const frame = { width: size.width, height, top: labelHeight + spacing.xs, bottom: labelHeight + spacing.xs, side: SIDE };
  const geometry = size.width > 0 && points.length > 1 ? chartGeometry(points.map((p) => p.value), domain, frame) : null;

  const select = (index: number) => {
    const next = Math.max(0, Math.min(last, index));
    if (next !== selected) {
      setChosen(next);
      haptics.selection();
    }
  };
  const selectAt = (event: GestureResponderEvent) => {
    if (geometry) {
      select(nearestIndex(event.nativeEvent.locationX, geometry.xs));
    }
  };

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.readout} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden testID={testID ? `${testID}-readout` : undefined}>
        <AppText role="footnote" tone="secondary">
          {point?.title ?? ''}
        </AppText>
        <AppText role="headline" style={styles.digits}>
          {point?.detail ?? ''}
        </AppText>
      </View>
      <View
        style={[styles.plot, { height }]}
        onLayout={onLayout}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: point ? `${point.title}, ${point.detail}` : '' }}
        accessibilityHint={accessibilityHint}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => select(selected + (event.nativeEvent.actionName === 'increment' ? 1 : -1))}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        // A vertical scroll may take the touch over; a tap or a sideways drag stays here.
        onResponderTerminationRequest={() => true}
        onResponderGrant={selectAt}
        onResponderMove={selectAt}
        testID={testID ? `${testID}-plot` : undefined}>
        {geometry ? (
          <>
            <Svg width={size.width} height={height} pointerEvents="none">
              {/* User-space gradients: a flat line has no height, and a bounding-box gradient would not
                  draw on it at all. */}
              <Defs>
                <LinearGradient id="stroke" gradientUnits="userSpaceOnUse" x1={frame.side} y1={0} x2={size.width - frame.side} y2={0}>
                  <Stop offset="0" stopColor={colors.accent} />
                  <Stop offset="1" stopColor={colors.progressHigh} />
                </LinearGradient>
                <LinearGradient id="fill" gradientUnits="userSpaceOnUse" x1={0} y1={frame.top} x2={0} y2={height - frame.bottom}>
                  <Stop offset="0" stopColor={colors.accentSurface} stopOpacity={1} />
                  <Stop offset="1" stopColor={colors.accentSurface} stopOpacity={0.2} />
                </LinearGradient>
              </Defs>
              {gridlines.map((line) => {
                const y = geometry.y(line.value);
                return (
                  <Line
                    key={line.label}
                    x1={frame.side}
                    x2={size.width - frame.side}
                    y1={y}
                    y2={y}
                    stroke={colors.borderSubtle}
                    strokeWidth={borders.control}
                    strokeDasharray={line.value === 0 ? undefined : '3 4'}
                  />
                );
              })}
              <Path d={geometry.area} fill="url(#fill)" />
              <Path d={geometry.line} stroke="url(#stroke)" strokeWidth={STROKE} strokeLinejoin="round" strokeLinecap="round" fill="none" />
              <Line
                x1={geometry.xs[selected]}
                x2={geometry.xs[selected]}
                y1={frame.top}
                y2={height - frame.bottom}
                stroke={colors.borderControl}
                strokeWidth={borders.control}
                strokeDasharray="2 3"
              />
              <Circle cx={geometry.xs[selected]} cy={geometry.ys[selected]} r={DOT} fill={colors.progressHigh} stroke={colors.surface} strokeWidth={borders.emphasis} />
            </Svg>
            {gridlines.map((line) => (
              <View
                key={line.label}
                pointerEvents="none"
                style={[styles.gridLabel, gridLabelPlace(line.value, domain, geometry.y(line.value), labelHeight, frame.side)]}>
                <AppText role="caption" tone="secondary" style={styles.digits}>
                  {line.label}
                </AppText>
              </View>
            ))}
          </>
        ) : null}
      </View>
      <XLabels labels={fontScale > COMPACT_TEXT_SCALE ? xLabels.filter((_, i) => i === 0 || i === xLabels.length - 1) : xLabels} xs={geometry?.xs ?? []} width={size.width} />
    </View>
  );
}

// The first label starts at the left edge, the last ends at the right edge, any other is centered
// under its point once its own width is known.
function XLabels({ labels, xs, width }: { labels: readonly ChartAxisLabel[]; xs: readonly number[]; width: number }) {
  const [widths, setWidths] = useState<Record<number, number>>({});
  return (
    <View style={styles.xLabels} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {labels.map((label, index) => {
        const first = index === 0;
        const lastLabel = index === labels.length - 1;
        if (first || lastLabel) {
          return (
            <AppText key={label.index} role="caption" tone="secondary" style={lastLabel && !first ? styles.xLast : undefined}>
              {label.label}
            </AppText>
          );
        }
        const w = widths[label.index] ?? 0;
        const x = xs[label.index] ?? width / 2;
        return (
          <View
            key={label.index}
            style={[styles.xMiddle, { left: Math.max(0, Math.min(width - w, x - w / 2)), opacity: w > 0 ? 1 : 0 }]}
            onLayout={(event) => {
              const measured = event.nativeEvent.layout.width;
              setWidths((current) => (current[label.index] === measured ? current : { ...current, [label.index]: measured }));
            }}>
            <AppText role="caption" tone="secondary">
              {label.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

// The top line's label sits just above it and the bottom line's just below it, both at the leading
// edge; a line in between (zero, when values go below it) is labeled above, at the trailing edge.
function gridLabelPlace(value: number, domain: readonly [number, number], y: number, labelHeight: number, side: number) {
  if (value <= domain[0]) {
    return { left: side, top: y + spacing.xs / 2 };
  }
  return value >= domain[1] ? { left: side, top: y - labelHeight } : { right: side, top: y - labelHeight };
}

export type ChartFrame = { width: number; height: number; top: number; bottom: number; side: number };

export type ChartGeometry = {
  xs: number[];
  ys: number[];
  // The step line and the area between it and the zero line (or the bottom when zero is below it).
  line: string;
  area: string;
  y: (value: number) => number;
};

// Pure geometry for the step chart: x evenly spaced, y linear in `domain` (clamped to it).
export function chartGeometry(values: readonly number[], domain: readonly [number, number], frame: ChartFrame): ChartGeometry {
  const [min, max] = domain[1] > domain[0] ? domain : [domain[0], domain[0] + 1];
  const innerWidth = Math.max(0, frame.width - frame.side * 2);
  const plotTop = frame.top;
  const plotBottom = frame.height - frame.bottom;
  const span = Math.max(1, values.length - 1);
  const y = (value: number) => {
    const v = Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
    return plotBottom - ((v - min) / (max - min)) * (plotBottom - plotTop);
  };
  const xs = values.map((_, index) => frame.side + (innerWidth * index) / span);
  const ys = values.map(y);
  const fmt = (n: number) => n.toFixed(1);
  let line = `M${fmt(xs[0] ?? 0)} ${fmt(ys[0] ?? plotBottom)}`;
  for (let i = 1; i < values.length; i += 1) {
    line += ` H${fmt(xs[i] ?? 0)} V${fmt(ys[i] ?? plotBottom)}`;
  }
  const base = y(Math.min(max, Math.max(min, 0)));
  const area = `${line} V${fmt(base)} H${fmt(xs[0] ?? 0)} Z`;
  return { xs, ys, line, area, y };
}

export function nearestIndex(x: number, xs: readonly number[]): number {
  let best = 0;
  xs.forEach((candidate, index) => {
    if (Math.abs(candidate - x) < Math.abs((xs[best] ?? 0) - x)) {
      best = index;
    }
  });
  return best;
}

const styles = StyleSheet.create({
  // Days run left to right like the SVG line, also in a right-to-left layout (Phase 19).
  container: {
    direction: 'ltr',
    gap: spacing.xs,
  },
  readout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: spacing.sm,
  },
  plot: {
    width: '100%',
  },
  gridLabel: {
    position: 'absolute',
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  digits: {
    fontVariant: ['tabular-nums'],
  },
  xLabels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.sm,
    minHeight: typography.caption.lineHeight,
  },
  xLast: {
    marginLeft: 'auto',
  },
  xMiddle: {
    position: 'absolute',
    top: 0,
  },
});
