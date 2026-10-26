import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, spacing } from '@/shared/theme';

import { SceneInsetsContext } from './scene-insets';

type TopBleedProps = {
  // Width / height of the artwork the scene draws, to size the region.
  sceneAspectRatio: number;
  // The artwork never grows wider than this.
  maxArtWidth: number;
  // The color at the top of the scene's backdrop; a pull-down past the top shows it.
  topColor: string;
  // A scene that fills the region and keeps its art inside `useSceneInsets()` (`WorldScene fill`).
  scene: ReactNode;
  testID?: string;
};

// A full-width scene at the top of a headerless screen (onboarding, D132), passed to FormScreen's
// `bleed`: the same composition as Home's full-bleed sky (D80, D82). The region starts at the very
// top of the screen, under the status bar, edge to edge; the scene draws its backdrop over all of it
// and keeps its artwork below the status bar and inside the side safe areas (or the screen gutter,
// whichever is larger), so nothing is covered. Pulling down past the top shows `topColor`, never the
// plain canvas.
export function TopBleed({ sceneAspectRatio, maxArtWidth, topColor, scene, testID }: TopBleedProps) {
  const safe = useSafeAreaInsets();
  const window = useWindowDimensions();
  const left = Math.max(safe.left, layout.screenGutter);
  const right = Math.max(safe.right, layout.screenGutter);
  const top = safe.top + spacing.lg;
  const artWidth = Math.max(0, Math.min(maxArtWidth, window.width - left - right));
  const height = top + artWidth / sceneAspectRatio;
  return (
    <SceneInsetsContext.Provider value={{ top, right, bottom: 0, left }}>
      {/* The scroll view already moved the content below the status bar; move back under it. */}
      <View testID={testID} style={[styles.region, { marginTop: -safe.top, height }]}>
        {/* Only seen while pulling down; one window height is more than any overscroll. */}
        <View pointerEvents="none" style={[styles.overscroll, { height: Math.max(window.height, 1), backgroundColor: topColor }]} />
        {scene}
      </View>
    </SceneInsetsContext.Provider>
  );
}

const styles = StyleSheet.create({
  region: {
    width: '100%',
  },
  overscroll: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
  },
});
