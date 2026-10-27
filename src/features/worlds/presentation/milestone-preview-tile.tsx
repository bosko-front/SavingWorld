import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Stage, ThemeId } from '@/core/progression';
import { useFontScale } from '@/shared/layout';
import { radii, spacing } from '@/shared/theme';
import { IconTile, tileColors } from '@/shared/ui/icon-tile';

import { milestonePreview } from '../themes/milestone-previews';
import { milestonePreviewLabel } from '../world-copy';

// The tile's side at the standard text size; it grows with text up to MAX_TEXT_SCALE, so the picture
// stays readable next to larger text without pushing the quest's name off a small screen.
const TILE_SIZE = 56;
const MAX_TEXT_SCALE = 1.5;

type MilestonePreviewTileProps = {
  themeId: ThemeId;
  stage: Stage;
  // Spoken as its own image where the tile is not inside a labelled control (the current quest).
  accessible?: boolean;
  testID?: string;
};

// A still picture of the main object a milestone unlocks, on the quest's honey tile (Phase 19, D136):
// the goal's own theme, so a Garden goal shows Garden art. No motion. Without a preview (or if the
// image can't be loaded) it shows the quest's generic sparkle tile instead.
export function MilestonePreviewTile({ themeId, stage, accessible = false, testID }: MilestonePreviewTileProps) {
  const preview = milestonePreview(themeId, stage);
  const [failed, setFailed] = useState(false);
  const size = TILE_SIZE * Math.min(Math.max(useFontScale(), 1), MAX_TEXT_SCALE);
  if (!preview || failed) {
    return (
      <View testID={testID ? `${testID}-fallback` : undefined}>
        <IconTile name="unlocked" color="honey" role="headline" />
      </View>
    );
  }
  return (
    <View
      style={[styles.tile, { width: size, height: size }]}
      accessible={accessible}
      accessibilityRole={accessible ? 'image' : undefined}
      accessibilityLabel={accessible ? milestonePreviewLabel(preview.object) : undefined}
      accessibilityElementsHidden={!accessible}
      importantForAccessibility={accessible ? 'yes' : 'no-hide-descendants'}
      testID={testID}>
      <Image
        source={preview.source}
        style={styles.image}
        contentFit="contain"
        transition={null}
        accessible={false}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: tileColors.honey.background,
    borderRadius: radii.md,
    padding: spacing.xs,
  },
  image: {
    flex: 1,
  },
});
