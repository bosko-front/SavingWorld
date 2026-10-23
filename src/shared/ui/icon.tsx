import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { useFontScale } from '@/shared/layout';
import { typography, type TextRole } from '@/shared/theme';

import { toneColors, type TextTone } from './app-text';

type SFSymbol = Extract<SymbolViewProps['name'], string>;

// SF Symbols only (docs/DESIGN_SYSTEM.md "Icons", DECISIONS D43). Screens name an icon by meaning,
// never by raw symbol name, so one place decides which symbol stands for what. Every symbol exists
// in SF Symbols 4 (iOS 16.4, the SDK 58 minimum). Filled variants mark status, outlined variants
// mark actions. Extend only for a real repeated need.
export const ICON_SYMBOLS = {
  success: 'checkmark.circle.fill',
  error: 'exclamationmark.triangle.fill',
  info: 'info.circle.fill',
  deposit: 'arrow.down.circle',
  withdrawal: 'arrow.up.circle',
  history: 'clock.arrow.circlepath',
  calendar: 'calendar',
  pause: 'pause.circle',
  resume: 'play.circle',
  delete: 'trash',
  reopen: 'arrow.uturn.backward.circle',
  finish: 'flag.checkered',
  lock: 'lock.fill',
  reminder: 'bell',
  settings: 'gearshape',
  souvenir: 'sparkles',
  pro: 'star.circle',
  // Phase 07.5: grouped rows, goal options and the next-milestone callout.
  edit: 'pencil',
  more: 'ellipsis.circle',
  chevron: 'chevron.right',
  milestone: 'leaf.fill',
  challenges: 'flag',
  currency: 'banknote',
  device: 'iphone',
  // Phase 08: the floating Add savings button and New goal in Home's goal menu.
  add: 'plus',
} as const satisfies Record<string, SFSymbol>;

export type IconName = keyof typeof ICON_SYMBOLS;

// Solid glyphs for icon tiles (Phase 07.5 icon-style proposal): the filled shape without its own
// circle, because the tile is the background. Names without an entry use the outline symbol.
export const FILLED_SYMBOLS: Partial<Record<IconName, SFSymbol>> = {
  deposit: 'arrow.down',
  withdrawal: 'arrow.up',
  history: 'clock.fill',
  calendar: 'calendar',
  pause: 'pause.fill',
  resume: 'play.fill',
  delete: 'trash.fill',
  reopen: 'arrow.uturn.backward',
  settings: 'gearshape.fill',
  souvenir: 'sparkles',
  edit: 'pencil',
  more: 'ellipsis',
  milestone: 'leaf.fill',
  challenges: 'flag.fill',
  currency: 'banknote.fill',
  reminder: 'bell.fill',
  info: 'info',
  success: 'checkmark',
  error: 'exclamationmark',
  add: 'plus',
};

type IconProps = {
  name: IconName;
  // The text role the icon sits next to: its size follows that role and the current text size.
  role?: TextRole;
  // Semantic color, the same tones text uses.
  tone?: TextTone;
  weight?: 'regular' | 'semibold';
  // The solid glyph from FILLED_SYMBOLS (used inside icon tiles).
  filled?: boolean;
  // Only for an icon that carries meaning on its own. By default icons are decorative and hidden
  // from VoiceOver, because the adjacent text always states the meaning in words.
  accessibilityLabel?: string;
  testID?: string;
};

export function iconSize(role: TextRole, fontScale: number): number {
  return Math.round(typography[role].fontSize * fontScale);
}

export function Icon({ name, role = 'body', tone = 'secondary', weight = 'regular', filled = false, accessibilityLabel, testID }: IconProps) {
  const size = iconSize(role, useFontScale());
  const labelled = accessibilityLabel !== undefined;
  return (
    <SymbolView
      name={(filled ? FILLED_SYMBOLS[name] : undefined) ?? ICON_SYMBOLS[name]}
      size={size}
      weight={weight}
      tintColor={toneColors[tone]}
      testID={testID}
      style={{ width: size, height: size }}
      accessible={labelled}
      accessibilityRole={labelled ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!labelled}
      importantForAccessibility={labelled ? 'yes' : 'no-hide-descendants'}
    />
  );
}
