import { Image, type ImageProps } from 'expo-image';
import { Component, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, type ImageStyle, type ViewStyle } from 'react-native';

import { MILESTONE_COUNT, type Stage, type ThemeId } from '@/core/progression';
import { fitAspect, useFontScale, useMeasuredSize, useSceneInsets } from '@/shared/layout';
import { colors, radii, spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';

import { sceneDescription, sceneViewport, visibleLayers, type ManifestResult, type Rect, type SceneLayer, type ThemeManifest } from './manifest';
import { themeManifest } from './registry';

// The world region of Home (DESIGN_SYSTEM "Visual direction", owner direction D73: the world is the
// star). One renderer for every theme: it measures its own region, fits the art's 4:3 viewport into
// it and stacks the layers the manifest makes visible at `stage`. The stage comes from the shared
// stage function; nothing here computes progress. No caption or icon inside the world: the stage
// and its description are in the accessibility label and value, the numbers below the scene.
//
// If the manifest is invalid, an image fails to load or a layer throws, only this region shows a
// short message; the ledger and every control around it keep working.

// Aspect ratio of a theme whose art cannot be shown (the fallback message box) and of the
// canvases the art is exported on.
export const WORLD_SCENE_ASPECT = 4 / 3;

// Behind the transparent art: a soft sky gradient (Home's choice, owner decision D79), the cream of
// the approved previews, or nothing (an illustration on the screen background).
export type SceneBackdrop = 'cream' | 'sky' | 'none';

const THEME_NAMES: Record<ThemeId, string> = { island: 'Island', garden: 'Garden' };

// Empty canvas kept around the art, in canvas units (D78). The renders leave sky around the island;
// framing every stage's art with this margin draws the world as large as its space allows.
const VIEWPORT_MARGIN = 12;

// Width/height of what the scene draws for a theme: the art's viewport (about 1.2 for the Island),
// or 4:3 when the theme has no valid art. Layouts size the scene region with it.
export function worldArtAspect(themeId: ThemeId, manifest: ManifestResult = themeManifest(themeId)): number {
  if (!manifest.ok) {
    return WORLD_SCENE_ASPECT;
  }
  const viewport = sceneViewport(manifest.manifest, VIEWPORT_MARGIN);
  return viewport.width / viewport.height;
}

// Above this text scale the fallback shows only its title, which fits a short region at the
// largest size; the accessibility label always has the full message.
const COMPACT_TEXT_SCALE = 1.35;

type WorldSceneProps = {
  themeId: ThemeId;
  // Current stage from the shared stage function: 0 is the base scene, 10 the last unlock. A
  // balance above the target still shows 10.
  stage: Stage;
  backdrop?: SceneBackdrop;
  // Home (owner decision D80): the backdrop fills the whole region, edge to edge with no rounded
  // frame, and the art is fitted inside the layout's scene insets (clear of the bars and the side
  // safe areas). Without it the scene is a rounded box at the art's aspect ratio.
  fill?: boolean;
  // An illustration next to its own text (Home's empty state): hidden from VoiceOver.
  decorative?: boolean;
  // Development inspection and tests only: a manifest other than the bundled one.
  manifest?: ManifestResult;
};

export function WorldScene({ themeId, stage, backdrop = 'sky', fill = false, decorative = false, manifest }: WorldSceneProps) {
  const [area, onAreaLayout] = useMeasuredSize();
  const insets = useSceneInsets();
  const result = manifest ?? themeManifest(themeId);
  const box = fitAspect(area, worldArtAspect(themeId, result));
  // Remounts the art (and clears a load failure) on Try again.
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const name = THEME_NAMES[themeId];
  const unlocked = `${stage} of ${MILESTONE_COUNT} milestones unlocked`;
  const showArt = result.ok && !failed;
  const retry = () => {
    setFailed(false);
    setAttempt((value) => value + 1);
  };

  return (
    <View
      style={[styles.region, fill && backdropStyle(backdrop), fill && { paddingTop: insets.top, paddingRight: insets.right, paddingBottom: insets.bottom, paddingLeft: insets.left }]}
      testID="world-scene-region">
      <View style={styles.area} onLayout={onAreaLayout} testID="world-scene-area">
        <View
          accessible={!decorative}
          accessibilityElementsHidden={decorative}
          importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
          accessibilityRole="image"
          accessibilityLabel={showArt ? `${name} world, ${unlocked}` : `${name} world can’t be shown, ${unlocked}`}
          accessibilityValue={showArt ? { text: sceneDescription(result.manifest, stage) } : undefined}
          style={[styles.scene, fill ? null : [styles.framed, backdropStyle(backdrop)], { width: box.width, height: box.height }]}
          testID="world-scene">
          {showArt && box.width > 0 ? (
            <SceneErrorBoundary key={attempt} onError={() => setFailed(true)}>
              <SceneLayers manifest={result.manifest} stage={stage} boxWidth={box.width} onError={() => setFailed(true)} />
            </SceneErrorBoundary>
          ) : null}
          {showArt ? null : <SceneFallback canRetry={result.ok} onRetry={retry} decorative={decorative} />}
        </View>
      </View>
    </View>
  );
}

type SceneLayersProps = { manifest: ThemeManifest; stage: Stage; boxWidth: number; onError: () => void };

// Every layer of a stage at its canvas position, scaled from the viewport to the measured box. A
// stage appears only once all of its layers have loaded, so the world never builds up piece by
// piece (owner review, D78): until then the previous complete stage stays on screen (nothing on the
// first load), and the incoming layers wait invisibly. Keys are layer ids, so a stage change mounts
// only new layers and later unmounts removed ones (the stage 4 cabin from 8 on).
function SceneLayers({ manifest, stage, boxWidth, onError }: SceneLayersProps) {
  const viewport = useMemo(() => sceneViewport(manifest, VIEWPORT_MARGIN), [manifest]);
  const scale = boxWidth / viewport.width;
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(() => new Set());
  const [shownStage, setShownStage] = useState<Stage | null>(null);
  const target = visibleLayers(manifest, stage);
  const ready = target.every((layer) => loaded.has(layer.id));
  const shown = ready ? target : shownStage === null ? [] : visibleLayers(manifest, shownStage);
  const shownIds = new Set(shown.map((layer) => layer.id));
  const mounted = [...shown, ...target.filter((layer) => !shownIds.has(layer.id))].sort((a, b) => a.z - b.z);
  const mountedIds = new Set(mounted.map((layer) => layer.id));

  // Derived state, updated during render (React's "adjusting state when a prop changes"): remember
  // the last complete stage, and forget layers that unmounted, which must load again when they
  // return (stage 8 → 7 brings the cabin back).
  if (ready && shownStage !== stage) {
    setShownStage(stage);
  }
  if ([...loaded].some((id) => !mountedIds.has(id))) {
    setLoaded(new Set([...loaded].filter((id) => mountedIds.has(id))));
  }

  const markLoaded = (id: string) => setLoaded((current) => (current.has(id) ? current : new Set(current).add(id)));

  return mounted.map((layer) => (
    <Image
      key={layer.id}
      source={manifest.assets[layer.file] as ImageProps['source']}
      style={[layerStyle(layer, viewport, scale), shownIds.has(layer.id) ? null : styles.waiting]}
      // Each export keeps its crop's aspect ratio, so `contain` fills the box exactly and still lets
      // the image be decoded at the displayed size instead of the file size.
      contentFit="contain"
      enforceEarlyResizing
      transition={null}
      accessible={false}
      onLoad={() => markLoaded(layer.id)}
      onError={onError}
      testID={`world-layer-${layer.id}`}
    />
  ));
}

function layerStyle(layer: SceneLayer, viewport: Rect, scale: number): ImageStyle {
  return {
    position: 'absolute',
    left: (layer.x - viewport.x) * scale,
    top: (layer.y - viewport.y) * scale,
    width: layer.width * scale,
    height: layer.height * scale,
  };
}

function backdropStyle(backdrop: SceneBackdrop): ViewStyle | null {
  switch (backdrop) {
    case 'cream':
      return styles.cream;
    case 'sky':
      return { backgroundImage: `linear-gradient(to bottom, ${colors.sceneSkyTop}, ${colors.sceneSkyBottom})` };
    case 'none':
      return null;
  }
}

function SceneFallback({ canRetry, onRetry, decorative }: { canRetry: boolean; onRetry: () => void; decorative: boolean }) {
  const compact = useFontScale() > COMPACT_TEXT_SCALE;
  if (decorative) {
    return null;
  }
  return (
    <View style={styles.fallback} testID="world-scene-fallback">
      <AppText role={compact ? 'footnote' : 'headline'} style={styles.centered}>
        Your world can’t be shown right now
      </AppText>
      {compact ? null : (
        <AppText role="footnote" tone="secondary" style={styles.centered}>
          Your savings are safe and up to date.
        </AppText>
      )}
      {canRetry ? <Button label="Try again" variant="plain" centered onPress={onRetry} testID="world-scene-retry" /> : null}
    </View>
  );
}

type BoundaryProps = { onError: () => void; children: ReactNode };

// Catches a render error inside the art so it cannot reach the screen's own boundary.
class SceneErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    if (__DEV__) {
      console.warn('[worlds] scene layer failed to render', error);
    }
    this.props.onError();
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

const styles = StyleSheet.create({
  region: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  area: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scene: {
    overflow: 'hidden',
  },
  framed: {
    borderRadius: radii.xl,
  },
  cream: {
    backgroundColor: colors.sceneBackground,
  },
  // Mounted and loading, not yet part of a complete stage.
  waiting: {
    opacity: 0,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
  },
  centered: {
    textAlign: 'center',
  },
});
