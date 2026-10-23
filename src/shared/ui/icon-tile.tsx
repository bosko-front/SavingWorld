import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing, type TextRole } from '@/shared/theme';

import type { TextTone } from './app-text';
import { Icon, type IconName } from './icon';

export type TileColor = 'green' | 'honey' | 'blue' | 'red' | 'neutral';

// Pastel tile backgrounds with their glyph tones (owner choice D68, "soft tiles").
// tests/unit/contrast.test.ts checks each glyph against its tile.
export const tileColors = {
  green: { background: colors.surfaceSoft, tone: 'success' },
  honey: { background: colors.accentSurface, tone: 'accent' },
  blue: { background: colors.infoSurface, tone: 'info' },
  red: { background: colors.errorSurface, tone: 'error' },
  neutral: { background: colors.surfaceSoft, tone: 'secondary' },
} as const satisfies Record<TileColor, { background: string; tone: TextTone }>;

type IconTileProps = {
  name: IconName;
  color?: TileColor;
  // The text role the tile sits next to; the glyph and tile grow with the text size.
  role?: TextRole;
};

// A filled SF Symbol on a small pastel rounded-square tile: the app's icon style for rows, form
// rows and empty states (DESIGN_SYSTEM "Icons", D68). Decorative: hidden from VoiceOver like every
// Icon; the adjacent text states the meaning.
export function IconTile({ name, color = 'green', role = 'body' }: IconTileProps) {
  const style = tileColors[color];
  return (
    <View style={[styles.tile, { backgroundColor: style.background }]}>
      <Icon name={name} role={role} tone={style.tone} weight="semibold" filled />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs + 2,
    borderRadius: radii.sm,
  },
});
