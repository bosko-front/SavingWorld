import buildAppConfig from '../../app.config';
import { palette } from '../../src/shared/theme/palette';
import { colors } from '../../src/shared/theme/tokens';
import { buttonColors, disabledButtonColors } from '../../src/shared/ui/button';
import { toneColors as textToneColors } from '../../src/shared/ui/app-text';
import { noticeColors } from '../../src/shared/ui/notice';
import { badgeColors } from '../../src/shared/ui/status-badge';
import { toastColors } from '../../src/shared/ui/toast';
import { tileColors } from '../../src/shared/ui/icon-tile';
import { fieldColors } from '../../src/shared/ui/text-field';

// WCAG 2.x relative luminance and contrast ratio for opaque sRGB hex colors.
function luminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match?.[1]) throw new Error(`Expected an opaque #RRGGBB color, got ${hex}`);
  const value = parseInt(match[1], 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = 4.5; // normal text
const NON_TEXT = 3; // large text and necessary graphical/control boundaries

type Pair = { usage: string; foreground: string; background: string; minimum: number };

// Every foreground/background combination the shell and shared controls actually render. Surfaces
// are opaque; a `plain` button or field helper text is checked on each container it can sit on.
const containers = { canvas: colors.canvas, surface: colors.surface, surfaceSoft: colors.surfaceSoft };

const pairs: Pair[] = [
  ...Object.entries(containers).flatMap(([name, background]) => [
    { usage: `text.primary on ${name}`, foreground: colors.textPrimary, background, minimum: TEXT },
    { usage: `text.secondary on ${name}`, foreground: colors.textSecondary, background, minimum: TEXT },
    { usage: `plain button label on ${name}`, foreground: buttonColors.plain.label, background, minimum: TEXT },
    { usage: `field error message on ${name}`, foreground: colors.error, background, minimum: TEXT },
    { usage: `deposit amount on ${name}`, foreground: colors.moneyDeposit, background, minimum: TEXT },
    { usage: `withdrawal amount on ${name}`, foreground: colors.moneyWithdrawal, background, minimum: TEXT },
    { usage: `disabled plain label on ${name}`, foreground: disabledButtonColors.label, background, minimum: TEXT },
  ]),
  { usage: 'plain button label on pressed fill', foreground: buttonColors.plain.label, background: buttonColors.plain.pressedBackground, minimum: TEXT },
  { usage: 'primary button label', foreground: buttonColors.primary.label, background: buttonColors.primary.background, minimum: TEXT },
  { usage: 'primary button label pressed', foreground: buttonColors.primary.label, background: buttonColors.primary.pressedBackground, minimum: TEXT },
  { usage: 'secondary button label', foreground: buttonColors.secondary.label, background: buttonColors.secondary.background, minimum: TEXT },
  { usage: 'secondary button label pressed', foreground: buttonColors.secondary.label, background: buttonColors.secondary.pressedBackground, minimum: TEXT },
  { usage: 'disabled button label', foreground: disabledButtonColors.label, background: disabledButtonColors.filled.background, minimum: TEXT },
  { usage: 'field value text', foreground: fieldColors.text, background: fieldColors.background, minimum: TEXT },
  { usage: 'field placeholder', foreground: fieldColors.placeholder, background: fieldColors.background, minimum: TEXT },
  { usage: 'disabled field text', foreground: fieldColors.disabledText, background: fieldColors.disabledBackground, minimum: TEXT },
  ...Object.entries(noticeColors).flatMap(([tone, notice]) => [
    { usage: `${tone} notice title`, foreground: colors[notice.titleTone], background: notice.surface, minimum: TEXT },
    { usage: `${tone} notice message`, foreground: colors.textPrimary, background: notice.surface, minimum: TEXT },
    { usage: `${tone} notice accent bar`, foreground: notice.accent, background: notice.surface, minimum: NON_TEXT },
  ]),
  { usage: 'primary button spinner', foreground: buttonColors.primary.label, background: buttonColors.primary.background, minimum: NON_TEXT },
  { usage: 'primary button shape on canvas', foreground: buttonColors.primary.background, background: colors.canvas, minimum: NON_TEXT },
  { usage: 'secondary button outline on canvas', foreground: buttonColors.secondary.border, background: colors.canvas, minimum: NON_TEXT },
  { usage: 'secondary button outline on surface', foreground: buttonColors.secondary.border, background: colors.surface, minimum: NON_TEXT },
  { usage: 'field outline', foreground: fieldColors.border, background: fieldColors.background, minimum: NON_TEXT },
  { usage: 'field outline on canvas', foreground: fieldColors.border, background: colors.canvas, minimum: NON_TEXT },
  { usage: 'field focus outline', foreground: fieldColors.focusBorder, background: fieldColors.background, minimum: NON_TEXT },
  { usage: 'focus outline on canvas', foreground: colors.focus, background: colors.canvas, minimum: NON_TEXT },
  { usage: 'field error outline', foreground: fieldColors.errorBorder, background: fieldColors.background, minimum: NON_TEXT },
  { usage: 'header back/tint on canvas', foreground: colors.actionPrimary, background: colors.canvas, minimum: TEXT },
  // Phase 07.5 visual direction: warm accent, progress, destructive button, status badges.
  ...Object.entries({ ...containers, accentSurface: colors.accentSurface }).flatMap(([name, background]) => [
    { usage: `accent label on ${name}`, foreground: colors.accentText, background, minimum: TEXT },
    { usage: `progress fill on ${name}`, foreground: colors.accent, background, minimum: NON_TEXT },
  ]),
  { usage: 'progress fill on progress track', foreground: colors.accent, background: colors.progressTrack, minimum: NON_TEXT },
  { usage: 'text.primary on accentSurface', foreground: colors.textPrimary, background: colors.accentSurface, minimum: TEXT },
  { usage: 'text.secondary on accentSurface', foreground: colors.textSecondary, background: colors.accentSurface, minimum: TEXT },
  { usage: 'destructive button label', foreground: buttonColors.destructive.label, background: buttonColors.destructive.background, minimum: TEXT },
  { usage: 'destructive button label pressed', foreground: buttonColors.destructive.label, background: buttonColors.destructive.pressedBackground, minimum: TEXT },
  { usage: 'destructive button outline on canvas', foreground: buttonColors.destructive.border, background: colors.canvas, minimum: NON_TEXT },
  { usage: 'destructive button outline on surface', foreground: buttonColors.destructive.border, background: colors.surface, minimum: NON_TEXT },
  // Progress fill by range (D66): each step on the track and on every surface a bar may sit on.
  ...(['progressLow', 'progressMid', 'progressHigh', 'progressComplete'] as const).flatMap((token) =>
    Object.entries({ ...containers, progressTrack: colors.progressTrack }).map(([name, background]) => ({
      usage: `${token} fill on ${name}`,
      foreground: colors[token],
      background,
      minimum: NON_TEXT,
    })),
  ),
  { usage: 'progress percent (green range) on canvas', foreground: textToneColors.success, background: colors.canvas, minimum: TEXT },
  // Toasts, including the error tone (D66): title, message and accent bar on each toast surface.
  ...Object.entries(toastColors).flatMap(([tone, toast]) => [
    { usage: `${tone} toast title`, foreground: tone === 'error' ? colors.error : colors.textPrimary, background: toast.surface, minimum: TEXT },
    { usage: `${tone} toast message`, foreground: colors.textPrimary, background: toast.surface, minimum: TEXT },
    { usage: `${tone} toast accent bar`, foreground: toast.accent, background: toast.surface, minimum: NON_TEXT },
  ]),
  // Icon tiles (D68): the filled glyph against its pastel tile.
  ...Object.entries(tileColors).map(([name, tile]) => ({
    usage: `${name} icon tile glyph`,
    foreground: textToneColors[tile.tone],
    background: tile.background,
    minimum: NON_TEXT,
  })),
  ...Object.entries(badgeColors).map(([tone, badge]) => ({
    usage: `${tone} status badge label`,
    foreground: textToneColors[badge.tone],
    background: badge.surface,
    minimum: TEXT,
  })),
  // Phase 13 (D105): the current quest's tinted band holds its title, tagline and In progress badge;
  // the badge keeps its own pill.
  ...Object.entries(tileColors).flatMap(([name, tile]) => [
    { usage: `quest band title on ${name} tint`, foreground: colors.textPrimary, background: tile.background, minimum: TEXT },
    { usage: `quest band tagline on ${name} tint`, foreground: colors.textSecondary, background: tile.background, minimum: TEXT },
  ]),
  { usage: 'selected tab tint on light bar', foreground: colors.actionPrimary, background: colors.surface, minimum: NON_TEXT },
  // Phase 09 scene fallback: its message and Try again sit on the scene backdrop (cream, or either end
  // of the sky gradient).
  ...Object.entries({ sceneBackground: colors.sceneBackground, sceneSkyTop: colors.sceneSkyTop, sceneSkyBottom: colors.sceneSkyBottom }).flatMap(
    ([name, background]) => [
      { usage: `scene fallback title on ${name}`, foreground: colors.textPrimary, background, minimum: TEXT },
      { usage: `scene fallback message on ${name}`, foreground: colors.textSecondary, background, minimum: TEXT },
      { usage: `scene Try again on ${name}`, foreground: colors.actionPrimary, background, minimum: TEXT },
    ],
  ),
];

describe('contrast formula', () => {
  it('matches known WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });
});

describe('required palette pairs', () => {
  it.each(pairs.map((pair) => ({ ...pair, ratio: contrastRatio(pair.foreground, pair.background).toFixed(2) })))(
    '$usage: $foreground on $background = $ratio:1 (needs $minimum:1)',
    ({ foreground, background, minimum }) => {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(minimum);
    },
  );

  it('never uses the decorative accent as text or a necessary control color', () => {
    const used = pairs.flatMap((pair) => [pair.foreground, pair.background]);
    expect(used).not.toContain(colors.accentDecorative);
    // Recorded so the documentation's "decorative only" claim stays true.
    expect(contrastRatio(colors.accentDecorative, colors.surface)).toBeLessThan(NON_TEXT);
  });
});

describe('palette source', () => {
  it('keeps every semantic color an opaque value from the private palette', () => {
    const paletteValues = new Set<string>(Object.values(palette));
    for (const value of Object.values(colors)) {
      expect(paletteValues.has(value)).toBe(true);
    }
  });

  it('uses palette.cream for the native launch background', () => {
    const config = buildAppConfig({ config: {}, projectRoot: process.cwd(), staticConfigPath: null, packageJsonPath: null });
    expect(config.backgroundColor).toBe(palette.cream);
    const splash = config.plugins?.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen');
    expect(Array.isArray(splash) ? splash[1] : undefined).toMatchObject({ backgroundColor: palette.cream });
  });

  it('declares the single supported light appearance', () => {
    const config = buildAppConfig({ config: {}, projectRoot: process.cwd(), staticConfigPath: null, packageJsonPath: null });
    expect(config.userInterfaceStyle).toBe('light');
  });
});
