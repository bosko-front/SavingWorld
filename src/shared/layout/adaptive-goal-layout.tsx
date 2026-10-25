import { HeaderHeightContext } from 'expo-router/react-navigation';
import { useCallback, useContext, useState, type ReactElement } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '@/shared/theme';

import { arrangementViewAvailable, NativeArrangement } from './arrangement-adapter';
import { isArrangementCollapsed, readableColumnWidth, sameSize, stackedSceneHeight, type Size } from './metrics';
import { SceneInsetsContext } from './scene-insets';
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
  // The screen's one primary action as a FloatingActionButton (Home: Add savings). It floats at the
  // bottom trailing corner of the controls' scroll view, above the tab bar, so it stays visible on
  // short windows and at large text (owner decisions D70, D72).
  floatingAction?: ReactElement;
  // Width/height of the scene artwork; used to size the scene in the single-column fallback.
  sceneAspectRatio: number;
  // Stacked composition only (owner decision D80): the scene region spans the full window width and
  // reaches up under a transparent navigation bar and the status bar to the top of the screen, so a
  // backdrop can fill it edge to edge. The artwork gets the window width minus the side gutters
  // (or larger side safe areas) at its aspect ratio, at most half the visible height, and keeps
  // clear of the bars through `useSceneInsets()`. Needs a screen whose header is transparent.
  sceneBleed?: boolean;
  // With `sceneBleed`: the color at the top of the scene's backdrop. The native arrangement keeps
  // its regions below the bars, so this color fills the band behind the status and navigation bars
  // there and the backdrop continues up to the top of the screen without an edge. In the stacked
  // composition it fills the space above the scene that a pull-down (overscroll) reveals (D82).
  sceneBleedColor?: string;
  // 'none' for a screen without text fields (Home): its scroll view then ignores a keyboard shown
  // over it in a sheet, instead of growing its inset and scrolling the world away (Phase 10).
  keyboard?: 'form' | 'none';
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
  floatingAction,
  sceneAspectRatio,
  sceneBleed = false,
  sceneBleedColor,
  keyboard = 'form',
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
  const headerHeight = useContext(HeaderHeightContext) ?? 0;

  const mode = resolveArrangementMode(arrangement);
  if (mode === 'native' && !collapsed) {
    const band =
      sceneBleed && sceneBleedColor ? (
        <View style={[styles.bleedBand, { height: headerHeight, backgroundColor: sceneBleedColor }]} testID="adaptive-bleed-band" />
      ) : null;
    return (
      <>
        {band}
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
              <ScrollingScreen keyboard={keyboard} insets="container" floatingAction={floatingAction}>
                {controls}
              </ScrollingScreen>
            </View>
          }
        />
      </>
    );
  }
  return (
    <StackedComposition
      testID={testID}
      scene={scene}
      controls={controls}
      floatingAction={floatingAction}
      sceneAspectRatio={sceneAspectRatio}
      sceneBleed={sceneBleed}
      sceneBleedColor={sceneBleedColor}
      keyboard={keyboard}
    />
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
// part of the visible height, so the saved amount and actions start close to the top. A floating
// action stays at the bottom trailing corner while both scroll.
function StackedComposition({ scene, controls, floatingAction, sceneAspectRatio, sceneBleed, sceneBleedColor, keyboard = 'form', testID }: StackedCompositionProps) {
  const [viewport, onViewportLayout] = useMeasuredSize();
  const [column, onColumnLayout] = useMeasuredSize();
  if (sceneBleed) {
    return (
      <BleedComposition
        testID={testID}
        scene={scene}
        controls={controls}
        floatingAction={floatingAction}
        sceneAspectRatio={sceneAspectRatio}
        sceneBleedColor={sceneBleedColor}
        keyboard={keyboard}
        viewport={viewport}
        onViewportLayout={onViewportLayout}
      />
    );
  }
  const sceneHeight = stackedSceneHeight(
    readableColumnWidth(column.width, layout.readableMaxWidth),
    viewport.height,
    sceneAspectRatio,
  );
  return (
    <ScrollingScreen keyboard={keyboard} testID={testID} onViewportLayout={onViewportLayout} floatingAction={floatingAction}>
      <View onLayout={onColumnLayout} testID="adaptive-scene-region" style={[styles.stackedScene, { height: sceneHeight }]}>
        {scene}
      </View>
      <View testID="adaptive-controls-region" style={styles.stackedControls}>
        {controls}
      </View>
    </ScrollingScreen>
  );
}

// Share of the visible height the full-bleed scene's artwork may take, so the goal title and the
// saved amount still start on screen on short windows (landscape, split view).
const BLEED_ART_MAX_SHARE = 0.5;

type BleedCompositionProps = Omit<StackedCompositionProps, 'sceneBleed'> & {
  viewport: Size;
  onViewportLayout: ReturnType<typeof useMeasuredSize>[1];
};

// The stacked composition with a full-bleed scene (D80). The scroll view still adjusts its top
// inset for the transparent bar natively; the scene region moves up by the header height (status
// bar included) so its backdrop starts at the top of the screen, and tells the scene how much of
// it the bars cover. Side insets: the window's side safe area or the screen gutter, whichever is
// larger, like every other column.
function BleedComposition({
  scene,
  controls,
  floatingAction,
  sceneAspectRatio,
  sceneBleedColor,
  keyboard = 'form',
  viewport,
  onViewportLayout,
  testID,
}: BleedCompositionProps) {
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const safe = useSafeAreaInsets();
  const left = Math.max(safe.left, layout.screenGutter);
  const right = Math.max(safe.right, layout.screenGutter);
  const top = headerHeight + spacing.xs;
  const artHeight = stackedSceneHeight(viewport.width - left - right, viewport.height, sceneAspectRatio, BLEED_ART_MAX_SHARE);
  const insets = { top, right, bottom: 0, left };
  return (
    <ScrollingScreen
      keyboard={keyboard}
      testID={testID}
      onViewportLayout={onViewportLayout}
      floatingAction={floatingAction}
      // The column scrolls under the sky with no indicator over the world (D82).
      hideScrollIndicator
      bleed={
        <SceneInsetsContext.Provider value={insets}>
          <View
            testID="adaptive-scene-region"
            style={[styles.bleedScene, { marginTop: -headerHeight, height: viewport.width > 0 ? top + artHeight : 0 }]}>
            {/* Pulling down past the top reveals the space above the scene; it continues the sky
                instead of showing the plain canvas (D82). One visible height is more than any
                overscroll. */}
            {sceneBleedColor ? (
              <View
                pointerEvents="none"
                testID="adaptive-overscroll-sky"
                style={[styles.overscroll, { height: Math.max(viewport.height, 1), backgroundColor: sceneBleedColor }]}
              />
            ) : null}
            {scene}
          </View>
        </SceneInsetsContext.Provider>
      }>
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
  bleedScene: {
    width: '100%',
  },
  // Directly above the full-bleed scene, outside the content, only seen while pulling down.
  overscroll: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
  },
  // Behind the transparent bars, under the native arrangement host (which draws nothing itself).
  bleedBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  stackedControls: {
    gap: spacing.md,
  },
});
