import { StyleSheet, View } from 'react-native';

import { fitAspect, useMeasuredSize } from '@/shared/layout';
import { colors, radii, spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';

// Development/test-only placeholder for the world scene in the Home direction mocks (Phase 07.5).
// It is deliberately crude: flat shapes from existing tokens, labelled "Placeholder" on screen, so
// nobody mistakes it for final or licensed art (that arrives in Phase 09). It measures its own region
// and keeps a 4:3 box, the same contract the Phase 09 renderer will follow.

export const PLACEHOLDER_SCENE_ASPECT = 4 / 3;

type PlaceholderSceneProps = {
  stage: number;
  // `framed` draws the scene as a card with rounded corners; otherwise it fills the region.
  framed?: boolean;
};

export function PlaceholderScene({ stage, framed = true }: PlaceholderSceneProps) {
  const [region, onRegionLayout] = useMeasuredSize();
  const box = fitAspect(region, PLACEHOLDER_SCENE_ASPECT);
  const unit = box.width / 100;
  return (
    <View style={styles.region} onLayout={onRegionLayout} testID="placeholder-scene-region">
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Placeholder world, stage ${stage} of 10`}
        style={[styles.scene, framed && styles.framed, { width: box.width, height: box.height }]}>
        <View style={[styles.sun, { width: 14 * unit, height: 14 * unit, top: 8 * unit, right: 12 * unit }]} />
        <View style={[styles.island, { width: 72 * unit, height: 22 * unit, left: 14 * unit, bottom: 10 * unit }]} />
        <View style={[styles.grass, { width: 54 * unit, height: 14 * unit, left: 23 * unit, bottom: 22 * unit }]} />
        {stage >= 1 ? <Tree unit={unit} left={30} bottom={28} /> : null}
        {stage >= 3 ? <Tree unit={unit} left={64} bottom={27} small /> : null}
        {stage >= 4 ? <View style={[styles.house, { width: 12 * unit, height: 10 * unit, left: 46 * unit, bottom: 30 * unit }]} /> : null}
        <View style={styles.caption}>
          <AppText role="caption" tone="secondary">
            {`Placeholder art · stage ${stage} of 10`}
          </AppText>
        </View>
      </View>
    </View>
  );
}

function Tree({ unit, left, bottom, small = false }: { unit: number; left: number; bottom: number; small?: boolean }) {
  const size = (small ? 9 : 12) * unit;
  return <View style={[styles.tree, { width: size, height: size, left: left * unit, bottom: bottom * unit }]} />;
}

const styles = StyleSheet.create({
  region: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  scene: {
    overflow: 'hidden',
    backgroundColor: colors.infoSurface,
  },
  framed: {
    borderRadius: radii.xl,
  },
  sun: {
    position: 'absolute',
    borderRadius: radii.pill,
    backgroundColor: colors.accentDecorative,
  },
  island: {
    position: 'absolute',
    borderRadius: radii.pill,
    backgroundColor: colors.accentSurface,
  },
  grass: {
    position: 'absolute',
    borderTopLeftRadius: radii.pill,
    borderTopRightRadius: radii.pill,
    backgroundColor: colors.surfaceSoft,
  },
  tree: {
    position: 'absolute',
    borderRadius: radii.pill,
    backgroundColor: colors.actionPrimary,
  },
  house: {
    position: 'absolute',
    borderRadius: radii.sm,
    backgroundColor: colors.moneyWithdrawal,
  },
  caption: {
    position: 'absolute',
    left: spacing.sm,
    top: spacing.sm,
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
});
