import { StyleSheet, View } from 'react-native';

import { MILESTONE_COUNT, type Stage, type ThemeId } from '@/core/progression';
import { fitAspect, useFontScale, useMeasuredSize } from '@/shared/layout';
import { colors, radii, spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { IconTile } from '@/shared/ui/icon-tile';

// The world region of Home (DESIGN_SYSTEM "Visual direction": a rounded 4:3 box that measures its
// own region). TEMPORARY until Phase 09: it shows the theme name and the current stage in words on
// a plain surface, so the region already has its final size and accessibility contract. Phase 09
// replaces the inside with the layered Island renderer and keeps these props and the aspect ratio.

export const WORLD_SCENE_ASPECT = 4 / 3;

const THEME_NAMES: Record<ThemeId, string> = { island: 'Island', garden: 'Garden' };

// Above this text scale the temporary box shows only the stage line, which still fits a short
// region at the largest size; the accessibility label always has the full description.
const COMPACT_TEXT_SCALE = 1.35;

type WorldSceneProps = {
  themeId: ThemeId;
  // Current stage from the shared stage function: 0 is the base scene, 10 the last unlock. A
  // balance above the target still shows 10.
  stage: Stage;
};

export function WorldScene({ themeId, stage }: WorldSceneProps) {
  const [region, onRegionLayout] = useMeasuredSize();
  const box = fitAspect(region, WORLD_SCENE_ASPECT);
  const compact = useFontScale() > COMPACT_TEXT_SCALE;
  const name = THEME_NAMES[themeId];
  const unlocked = `${stage} of ${MILESTONE_COUNT} milestones unlocked`;
  return (
    <View style={styles.region} onLayout={onRegionLayout} testID="world-scene-region">
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${name} world, ${unlocked}`}
        style={[styles.scene, { width: box.width, height: box.height }]}
        testID="world-scene">
        {compact ? null : <IconTile name="milestone" color="honey" role="title" />}
        {compact ? null : (
          <AppText role="headline" style={styles.centered}>
            {name}
          </AppText>
        )}
        <AppText role={compact ? 'caption' : 'footnote'} tone="secondary" style={styles.centered} testID="world-scene-stage">
          {unlocked}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  region: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scene: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    overflow: 'hidden',
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceSoft,
  },
  centered: {
    textAlign: 'center',
  },
});
