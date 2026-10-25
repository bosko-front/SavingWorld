import { Image, type ImageProps } from 'expo-image';
import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { MILESTONE_COUNT, type Stage, type ThemeId } from '@/core/progression';
import { fitAspect, useFontScale, useMeasuredSize, useSceneInsets } from '@/shared/layout';
import { colors, radii, spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';

import { ambientKindOn, useAmbientSwitches, type AmbientSwitches } from './ambient';
import { sceneDescription, sceneViewport, visibleLayers, type AmbientMark, type ManifestResult, type Rect, type SceneLayer, type ThemeManifest } from './manifest';
import { themeManifest } from './registry';
import { layerMotion, WORLD_MOTION, type LayerEntrance, type LayerExit, type LayerMotion, type SceneReveal } from './world-transition';

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
  // Phase 10: a later stage whose layers load invisibly ahead of an unlock, and how the change to
  // `stage` animates (null or absent: the stage is shown directly, as after a launch).
  upcomingStage?: Stage | null;
  reveal?: SceneReveal | null;
  // Phase 10.5 (D90): whether the Living Island may move now. Home passes `useAmbientMotion()` (Home
  // focused, app active, no Reduce Motion); every other scene leaves it off and stays still.
  ambient?: boolean;
  // Shown over the scene region (Home's "New milestone unlocked!" message).
  children?: ReactNode;
  // Called once a stage is on screen with all of its layers loaded (Phase 11, D98: a souvenir's
  // sparkle burst waits for the world it greets).
  onShown?: (stage: Stage) => void;
};

export function WorldScene({
  themeId,
  stage,
  backdrop = 'sky',
  fill = false,
  decorative = false,
  manifest,
  upcomingStage = null,
  reveal = null,
  ambient = false,
  children,
  onShown,
}: WorldSceneProps) {
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
            <SceneErrorBoundary key={`${themeId}-${attempt}`} onError={() => setFailed(true)}>
              <SceneLayers
                manifest={result.manifest}
                stage={stage}
                upcomingStage={upcomingStage}
                reveal={reveal}
                ambient={ambient}
                boxWidth={box.width}
                onShown={onShown}
                onError={() => setFailed(true)}
              />
            </SceneErrorBoundary>
          ) : null}
          {showArt ? null : <SceneFallback canRetry={result.ok} onRetry={retry} decorative={decorative} />}
        </View>
      </View>
      {children}
    </View>
  );
}

type SceneLayersProps = {
  manifest: ThemeManifest;
  stage: Stage;
  upcomingStage: Stage | null;
  reveal: SceneReveal | null;
  ambient: boolean;
  boxWidth: number;
  onShown?: (stage: Stage) => void;
  onError: () => void;
};

// What animates during one revealed stage change; the layers in `leaving` stay drawn while they fade.
type LayerAnimation = { revision: number; motion: LayerMotion; leaving: SceneLayer[] };

// Every layer of a stage at its canvas position, scaled from the viewport to the measured box. A
// stage appears only once all of its layers have loaded, so the world never builds up piece by
// piece (owner review, D78): until then the previous complete stage stays on screen (nothing on the
// first load), and the incoming layers wait invisibly. Keys are layer ids, so a stage change mounts
// only new layers and later unmounts removed ones (the stage 4 cabin from 8 on).
//
// Phase 10: when the change to a new complete stage comes with a `reveal`, its new layers pop from
// their anchors (an unlock) or fade (a quiet change), the stage 8 house crossfades with the cabin and
// removed layers fade out; without one the stage simply replaces the old one. The layers of
// `upcomingStage` load invisibly in advance, so an unlock does not wait for its images.
//
// Phase 10.5: layers with an ambient mark move while `ambient` is on and their effect's switch allows
// it; the water sparkle layers are invisible at rest and are not drawn at all when water is switched
// off, so the switched-off scene is the approved picture.
function SceneLayers({ manifest, stage, upcomingStage, reveal, ambient, boxWidth, onShown, onError }: SceneLayersProps) {
  const viewport = useMemo(() => sceneViewport(manifest, VIEWPORT_MARGIN), [manifest]);
  const scale = boxWidth / viewport.width;
  const switches = useAmbientSwitches();
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(() => new Set());
  const [shownStage, setShownStage] = useState<Stage | null>(null);
  const [animation, setAnimation] = useState<LayerAnimation | null>(null);
  const drawn = (forStage: Stage) => visibleLayers(manifest, forStage).filter((layer) => drawsAtRest(layer, switches));
  const target = drawn(stage);
  const ready = target.every((layer) => loaded.has(layer.id));

  // Derived state, updated during render (React's "adjusting state when a prop changes"): a newly
  // complete stage starts its reveal, if it has one; a reveal that was withdrawn (superseded,
  // navigation away, background) ends at once, so a removed layer can never come back.
  if (ready && shownStage !== stage) {
    if (shownStage !== null && reveal) {
      const motion = layerMotion(manifest, shownStage, stage, reveal.mode);
      const leaving = drawn(shownStage).filter((layer) => motion.exits.has(layer.id));
      setAnimation({ revision: reveal.revision, motion, leaving });
    } else if (animation) {
      setAnimation(null);
    }
    setShownStage(stage);
  } else if (animation && animation.revision !== reveal?.revision) {
    setAnimation(null);
  }

  const shown = ready ? target : shownStage === null ? [] : drawn(shownStage);
  const shownIds = new Set(shown.map((layer) => layer.id));
  const leaving = (animation?.leaving ?? []).filter((layer) => !shownIds.has(layer.id));
  const upcoming = upcomingStage === null ? [] : drawn(upcomingStage);
  const mounted = new Map<string, SceneLayer>();
  [...shown, ...leaving, ...target, ...upcoming].forEach((layer) => mounted.set(layer.id, layer));
  const ordered = [...mounted.values()].sort((a, b) => a.z - b.z);

  // Forget layers that unmounted; they must load again when they return (stage 8 → 7 brings the
  // cabin back).
  if ([...loaded].some((id) => !mounted.has(id))) {
    setLoaded(new Set([...loaded].filter((id) => mounted.has(id))));
  }

  useEffect(() => {
    if (shownStage !== null) {
      onShown?.(shownStage);
    }
    // Only a newly shown stage reports; the callback identity may change on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownStage]);

  const markLoaded = (id: string) => setLoaded((current) => (current.has(id) ? current : new Set(current).add(id)));

  return ordered.map((layer) => (
    <SceneLayerView
      key={layer.id}
      layer={layer}
      source={manifest.assets[layer.file] as ImageProps['source']}
      viewport={viewport}
      scale={scale}
      shown={shownIds.has(layer.id)}
      entrance={shownIds.has(layer.id) ? animation?.motion.entrances.get(layer.id) : undefined}
      exit={shownIds.has(layer.id) ? undefined : animation?.motion.exits.get(layer.id)}
      ambient={ambient && layer.ambient !== null && ambientKindOn(switches, layer.ambient.kind)}
      onLoad={() => markLoaded(layer.id)}
      onError={onError}
    />
  ));
}

type SceneLayerViewProps = {
  layer: SceneLayer;
  source: ImageProps['source'];
  viewport: Rect;
  scale: number;
  // Part of the complete stage on screen (false while it loads or waits for its stage).
  shown: boolean;
  entrance: LayerEntrance | undefined;
  exit: LayerExit | undefined;
  // The layer's ambient mark may move now.
  ambient: boolean;
  onLoad: () => void;
  onError: () => void;
};

// One layer: the image in a box at its canvas position. The box scales from the layer's anchor (where
// the object meets the ground), so a new object grows out of the ground; the art already carries its
// shadow and outline (D76). A layer mounted while waiting starts invisible and appears with its
// entrance, or at once without one; a superseded entrance jumps to the end.
function SceneLayerView({ layer, source, viewport, scale, shown, entrance, exit, ambient, onLoad, onError }: SceneLayerViewProps) {
  const [visibleAtMount] = useState(shown);
  const opacity = useSharedValue(visibleAtMount ? 1 : 0);
  const grow = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(opacity);
    cancelAnimation(grow);
    if (exit) {
      const duration = exit.kind === 'crossfade' ? WORLD_MOTION.crossfadeMs : WORLD_MOTION.quietMs;
      opacity.value = withDelay(exit.delayMs, withTiming(0, { duration, easing: Easing.inOut(Easing.quad) }));
      return;
    }
    if (!shown) {
      return;
    }
    if (!entrance) {
      opacity.value = 1;
      grow.value = 1;
      return;
    }
    opacity.value = 0;
    switch (entrance.kind) {
      case 'pop':
        // Pop, grow a little past full size, settle (D73: short, not a cutscene).
        grow.value = 0.35;
        opacity.value = withDelay(entrance.delayMs, withTiming(1, { duration: 160 }));
        grow.value = withDelay(
          entrance.delayMs,
          withSequence(
            withTiming(1.08, { duration: 320, easing: Easing.out(Easing.cubic) }),
            withTiming(1, { duration: WORLD_MOTION.popMs - 320, easing: Easing.inOut(Easing.quad) }),
          ),
        );
        break;
      case 'crossfade':
        grow.value = 1;
        opacity.value = withDelay(entrance.delayMs, withTiming(1, { duration: WORLD_MOTION.crossfadeMs, easing: Easing.inOut(Easing.quad) }));
        break;
      case 'fade':
        grow.value = 1;
        opacity.value = withDelay(entrance.delayMs, withTiming(1, { duration: WORLD_MOTION.quietMs }));
        break;
    }
  }, [shown, entrance, exit, opacity, grow]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: grow.value }] }));
  const box = layerBox(layer, viewport, scale);
  const image = (
    <Image
      source={source}
      style={[StyleSheet.absoluteFill, shown || exit ? null : styles.waiting]}
      // Each export keeps its crop's aspect ratio, so `contain` fills the box exactly and still lets
      // the image be decoded at the displayed size instead of the file size.
      contentFit="contain"
      enforceEarlyResizing
      transition={null}
      accessible={false}
      onLoad={onLoad}
      onError={onError}
      testID={`world-layer-${layer.id}`}
    />
  );

  return (
    <Animated.View
      style={[box, { transformOrigin: [(layer.anchor.x - layer.x) * scale, (layer.anchor.y - layer.y) * scale, 0] }, animated]}
      pointerEvents="none"
      testID={`world-box-${layer.id}`}>
      {layer.ambient ? (
        <AmbientBox
          layer={layer}
          mark={layer.ambient}
          scale={scale}
          // A layer moves only while it is drawn (shown, or fading out), never while it waits to load.
          running={ambient && (shown || exit !== undefined)}
          // A new tree starts swaying only after its reveal has finished, so the pop and the sway never
          // fight.
          startDelayMs={entrance ? entrance.delayMs + entranceMs(entrance) : 0}>
          {image}
        </AmbientBox>
      ) : (
        image
      )}
    </Animated.View>
  );
}

function entranceMs(entrance: LayerEntrance): number {
  switch (entrance.kind) {
    case 'pop':
      return WORLD_MOTION.popMs;
    case 'crossfade':
      return WORLD_MOTION.crossfadeMs;
    case 'fade':
      return WORLD_MOTION.quietMs;
  }
}

// Whether a layer is part of the picture at rest with these switches: the water sparkle layers
// (invisible at rest) are left out entirely when water motion is switched off.
function drawsAtRest(layer: SceneLayer, switches: AmbientSwitches): boolean {
  return layer.ambient?.kind !== 'water' || ambientKindOn(switches, 'water');
}

type AmbientBoxProps = {
  layer: SceneLayer;
  mark: AmbientMark;
  scale: number;
  running: boolean;
  startDelayMs: number;
  children: ReactNode;
};

// Ambient motion of one layer (Phase 10.5, D90), nested inside the reveal box so a pop and a sway
// compose instead of fighting over one transform. One shared value per layer, driven on the UI thread
// by a repeating Reanimated timing: no React render per frame, no timer, no frame limiter. Clouds
// drift out and back (a half-cosine each way), each water flow layer fades in and out in its turn
// (together the streaks travel downstream, D93), a tree leans to each side from its trunk base (a sine
// on a skew, so the base stays put and the crown moves sideways). The value is 0 at rest; when `running` turns
// off (Home hidden, app inactive, Reduce Motion, a switch) the animation is cancelled and the layer
// is back at rest at once, and the next start begins from rest, so it never jumps. Each layer waits
// its phase before it starts, so layers never move in step.
function AmbientBox({ layer, mark, scale, running, startDelayMs, children }: AmbientBoxProps) {
  const value = useSharedValue(0);
  // Read when motion starts; a reveal that ends later does not restart a layer that is moving.
  const delayRef = useRef(startDelayMs);
  useLayoutEffect(() => {
    delayRef.current = startDelayMs;
  });

  useEffect(() => {
    if (!running) {
      return;
    }
    value.value = withDelay(delayRef.current + mark.phase * mark.periodMs, ambientLoop(mark));
    return () => {
      cancelAnimation(value);
      value.value = 0;
    };
  }, [running, mark, value]);

  const { kind } = mark;
  const animated = useAnimatedStyle(() => {
    switch (kind) {
      case 'cloud':
        return { transform: [{ translateX: value.value * scale }] };
      case 'water':
        return { opacity: value.value };
      case 'sway':
        return { transform: [{ skewX: `${value.value}deg` }] };
    }
  });
  const origin =
    mark.pivot === null ? null : { transformOrigin: [(mark.pivot.x - layer.x) * scale, (mark.pivot.y - layer.y) * scale, 0] as [number, number, number] };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, origin, animated]} testID={`world-ambient-${layer.id}`}>
      {children}
    </Animated.View>
  );
}

// One endless cycle of a mark, starting and ending at rest (0).
function ambientLoop({ kind, amplitude, periodMs }: AmbientMark) {
  const half = periodMs / 2;
  const smooth = Easing.inOut(Easing.sin);
  if (kind === 'sway') {
    return withSequence(
      withTiming(amplitude, { duration: periodMs / 4, easing: Easing.out(Easing.sin) }),
      withRepeat(withSequence(withTiming(-amplitude, { duration: half, easing: smooth }), withTiming(amplitude, { duration: half, easing: smooth })), -1),
    );
  }
  return withRepeat(withSequence(withTiming(amplitude, { duration: half, easing: smooth }), withTiming(0, { duration: half, easing: smooth })), -1);
}

function layerBox(layer: SceneLayer, viewport: Rect, scale: number): ViewStyle {
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
