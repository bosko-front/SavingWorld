import { StyleSheet, type TextStyle } from 'react-native';

import { palette } from './palette';

// Typed design tokens (docs/DESIGN_SYSTEM.md). Screens and shared controls use these semantic
// names; raw palette values stay private to this folder. Add a token only for a real repeated need.

export const colors = {
  // Surfaces
  canvas: palette.cream,
  surface: palette.white,
  surfaceSoft: palette.sage100,
  // Text
  textPrimary: palette.forest900,
  textSecondary: palette.moss700,
  textOnAction: palette.white,
  // Actions and controls
  actionPrimary: palette.forest700,
  actionPrimaryPressed: palette.forest800,
  borderControl: palette.stone500,
  borderSubtle: palette.stone200,
  focus: palette.blue700,
  // Inactive controls. WCAG exempts disabled controls; we still keep their labels at 4.5:1.
  disabledSurface: palette.ash100,
  disabledBorder: palette.ash400,
  disabledText: palette.ash600,
  // Money cues always accompany an explicit sign or label, never color alone.
  moneyDeposit: palette.forest700,
  moneyWithdrawal: palette.brick700,
  // Feedback
  error: palette.red700,
  errorSurface: palette.red50,
  success: palette.forest700,
  successSurface: palette.sage100,
  info: palette.blue700,
  infoSurface: palette.blue50,
  // Warm accent (Phase 07.5): progress fill and milestone markers (graphics, at least 3:1 on every
  // surface and on progressTrack); accentText for short accent labels; accentSurface for the
  // next-milestone callout. Never a money or error meaning.
  accent: palette.honey600,
  accentText: palette.honey800,
  accentSurface: palette.sand100,
  progressTrack: palette.sand200,
  // Progress fill by range (DECISIONS D66): honey below 30%, olive 30-59%, soft green 60-99%,
  // strong green at 100% or more. Each is at least 3:1 on progressTrack and every surface. No red or
  // orange: low progress is never a warning.
  progressLow: palette.honey600,
  progressMid: palette.olive600,
  progressHigh: palette.leaf500,
  progressComplete: palette.forest700,
  // World scene behind the transparent art (Phase 09). sceneSky* draw Home's top-to-bottom gradient
  // (D79), ending in the canvas color so the full-bleed sky has no visible edge (D80); only the scene
  // fallback message sits on these, in textPrimary/textSecondary.
  sceneBackground: palette.sceneCream,
  sceneSkyTop: palette.skyTop,
  sceneSkyBottom: palette.cream,
  // Decorative only: never normal text or a necessary control boundary.
  accentDecorative: palette.gold400,
  shadow: palette.forest900,
} as const;

export type ColorToken = keyof typeof colors;

// Logical points. Seed scale from DESIGN_SYSTEM; never multiplied by a screen-width ratio.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const borders = {
  hairline: StyleSheet.hairlineWidth,
  control: 1,
  // Focus and error outlines: a thicker line, so state is not conveyed by color alone.
  emphasis: 2,
} as const;

export const elevation = {
  card: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
} as const;

// System font text roles. Sizes are the iOS defaults at the standard content size; `ramp` names the
// UIFont text style that Dynamic Type scales each role with (Text `dynamicTypeRamp`). Never set
// allowFontScaling={false} or cap scaling to make a layout fit.
type TextRoleToken = {
  fontSize: number;
  lineHeight: number;
  fontWeight: NonNullable<TextStyle['fontWeight']>;
  ramp: 'largeTitle' | 'title2' | 'headline' | 'body' | 'callout' | 'subheadline' | 'footnote' | 'caption1';
};

export const typography = {
  // The saved amount on Home. Scales with the largeTitle ramp, so it grows and wraps with the text size.
  display: { fontSize: 40, lineHeight: 46, fontWeight: '700', ramp: 'largeTitle' },
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700', ramp: 'largeTitle' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600', ramp: 'title2' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', ramp: 'headline' },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400', ramp: 'body' },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400', ramp: 'callout' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600', ramp: 'subheadline' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400', ramp: 'footnote' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400', ramp: 'caption1' },
} as const satisfies Record<string, TextRoleToken>;

export type TextRole = keyof typeof typography;

// Milliseconds. With Reduce Motion enabled, animations use `reduced` (no movement; an instant or
// opacity-only change) instead of the normal duration.
export const motion = {
  fast: 120,
  standard: 220,
  slow: 360,
  reduced: 0,
} as const;

// Content constraints only. These are not device classes or breakpoints; window, safe-area and
// adaptive arrangement rules belong to the Phase 03 layout layer (docs/ADAPTIVE_LAYOUT.md).
export const layout = {
  minTouchTarget: 44,
  readableMaxWidth: 680,
  formMaxWidth: 560,
  screenGutter: spacing.lg,
} as const;
