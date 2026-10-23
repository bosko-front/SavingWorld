import { useCallback, useState, type ReactElement } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { colors, layout, spacing } from '@/shared/theme';

import { arrangementViewAvailable, NativeArrangement } from './arrangement-adapter';
import { isArrangementCollapsed, readableColumnWidth, sameSize, stackedSceneHeight, type Size } from './metrics';
import { ScrollingScreen } from './screen';
import { useMeasuredSize } from './use-measured-size';

export type ArrangementMode = 'native' | 'fallback';

type AdaptiveGoalLayoutProps = {
  // Primary region: the world scene. It fills the region it is given and sizes its artwork to its
  // own onLayout bounds at its aspect ratio; decorative backgrounds may fill the whole region.
  scene: ReactElement;
  // Secondary region: saved amount, progress and every action. It always scrolls, so all actions
  // stay reachable in a short window, and its text and controls stay inside the safe area.
  controls: ReactElement;
  // Width/height of the scene artwork; used to size the scene in the single-column fallback.
  sceneAspectRatio: number;
  // Tests and the development layout lab only. Product screens never choose a mode.
  arrangement?: 'automatic' | 'fallback';
  testID?: string;
};

// Narrow primary-scene / secondary-controls contract (docs/ADAPTIVE_LAYOUT.md). The owner of the
// goal selection and any draft is the route component that renders this layout; arrangement and
// size changes only re-lay out the two regions and never submit, reset or recalculate anything.
export function AdaptiveGoalLayout({
  scene,
  controls,
  sceneAspectRatio,
  arrangement = 'automatic',
  testID,
}: AdaptiveGoalLayoutProps) {
  // When the system collapses the native arrangement to the scene alone (no space for the
  // controls), use the stacked composition for that window size, so every action stays reachable.
  // Measurements are tagged with the window size they belong to; any later window change (unfold,
  // rotation, split view) discards them and tries the native arrangement again.
  const window = useWindowDimensions();
  const windowKey = `${Math.round(window.width)}x${Math.round(window.height)}`;
  const [measured, setMeasured] = useState<RegionMeasurement>(EMPTY_MEASUREMENT);
  const record = useCallback(
    (part: 'container' | 'primary', { width, height }: Size) => {
      setMeasured((current) => {
        const base = current.windowKey === windowKey ? current : { ...EMPTY_MEASUREMENT, windowKey };
        return sameSize(base[part], { width, height }) && base === current ? current : { ...base, [part]: { width, height } };
      });
    },
    [windowKey],
  );
  const collapsed = measured.windowKey === windowKey && isArrangementCollapsed(measured.container, measured.primary);

  const mode = resolveArrangementMode(arrangement);
  if (mode === 'native' && !collapsed) {
    return (
      <NativeArrangement
        testID={testID}
        onContainerLayout={(size) => record('container', size)}
        primary={
          <View
            style={styles.region}
            testID="adaptive-scene-region"
            onLayout={(event) => record('primary', event.nativeEvent.layout)}>
            {scene}
          </View>
        }
        secondary={
          <View style={styles.region} testID="adaptive-controls-region">
            <ScrollingScreen keyboard="form" insets="container">
              {controls}
            </ScrollingScreen>
          </View>
        }
      />
    );
  }
  return (
    <StackedComposition testID={testID} scene={scene} controls={controls} sceneAspectRatio={sceneAspectRatio} />
  );
}

type RegionMeasurement = { windowKey: string; container: Size; primary: Size };
const UNMEASURED: Size = { width: 0, height: 0 };
const EMPTY_MEASUREMENT: RegionMeasurement = { windowKey: '', container: UNMEASURED, primary: UNMEASURED };

export function resolveArrangementMode(arrangement: 'automatic' | 'fallback'): ArrangementMode {
  return arrangement === 'automatic' && arrangementViewAvailable() ? 'native' : 'fallback';
}

type StackedCompositionProps = Omit<AdaptiveGoalLayoutProps, 'arrangement'>;

// Explicit fallback for iOS versions without ArrangementView, and for a window where the native
// arrangement collapsed to the scene alone: one scrolling column with the scene
// first and the controls below it. The scene takes the column width at its aspect ratio but at most
// part of the visible height, so the saved amount and actions start close to the top.
function StackedComposition({ scene, controls, sceneAspectRatio, testID }: StackedCompositionProps) {
  const [viewport, onViewportLayout] = useMeasuredSize();
  const [column, onColumnLayout] = useMeasuredSize();
  const sceneHeight = stackedSceneHeight(
    readableColumnWidth(column.width, layout.readableMaxWidth),
    viewport.height,
    sceneAspectRatio,
  );
  return (
    <ScrollingScreen keyboard="form" testID={testID} onViewportLayout={onViewportLayout}>
      <View onLayout={onColumnLayout} testID="adaptive-scene-region" style={[styles.stackedScene, { height: sceneHeight }]}>
        {scene}
      </View>
      <View testID="adaptive-controls-region" style={styles.stackedControls}>
        {controls}
      </View>
    </ScrollingScreen>
  );
}

const styles = StyleSheet.create({
  region: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  stackedScene: {
    width: '100%',
  },
  stackedControls: {
    gap: spacing.md,
  },
});
