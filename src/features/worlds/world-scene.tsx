import { Image, type ImageProps } from 'expo-image';
import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { type Stage, type ThemeId } from '@/core/progression';
import { fitAspect, useFontScale, useMeasuredSize, useSceneInsets } from '@/shared/layout';
import { COMMON_COPY } from '@/shared/i18n/common-copy';
import { colors, radii, spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';

import { ambientKindOn, useAmbientSwitches, type AmbientSwitches } from './ambient';
import {
  AMBIENT_REST,
  sceneDescription,
  sceneViewport,
  visibleLayers,
  type AmbientMark,
  type ManifestResult,
  type Rect,
  type SceneLayer,
  type ThemeManifest,
} from './manifest';
import { themeManifest } from './registry';
import { SCENE_FALLBACK_COPY, sceneFallbackLabel, sceneLabel } from './world-copy';
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
  // Phase 17: when `themeId` changes, the old world stays on screen until the new one has loaded and
  // then crosses over to it in a brief crossfade (Home; false under Reduce Motion: the new world
  // replaces the old one at once once it has loaded). Never a replay of milestones.
  crossfadeTheme?: boolean;
};

// How long a theme change crosses over on Home (Phase 17): brief and bounded.
export const THEME_CROSSFADE_MS = 450;

// The world shown before a theme change, kept while the new one loads and fades in.
type OutgoingWorld = { themeId: ThemeId; manifest: ThemeManifest; stage: Stage; key: number };

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
  crossfadeTheme = false,
}: WorldSceneProps) {
  const [area, onAreaLayout] = useMeasuredSize();
  const insets = useSceneInsets();
  const result = manifest ?? themeManifest(themeId);
  const box = fitAspect(area, worldArtAspect(themeId, result));
  // A theme change (Phase 17): the world on screen until now becomes the outgoing one.
  const [current, setCurrent] = useState<{ themeId: ThemeId; stage: Stage; manifest: ManifestResult }>({ themeId, stage, manifest: result });
  const [outgoing, setOutgoing] = useState<OutgoingWorld | null>(null);
  const [incomingShown, setIncomingShown] = useState(false);
  if (current.themeId !== themeId) {
    setOutgoing(current.manifest.ok ? { themeId: current.themeId, manifest: current.manifest.manifest, stage: current.stage, key: (outgoing?.key ?? 0) + 1 } : null);
    setIncomingShown(false);
    setCurrent({ themeId, stage, manifest: result });
  } else if (current.stage !== stage || current.manifest !== result) {
    setCurrent({ themeId, stage, manifest: result });
  }
  const outgoingBox = outgoing ? fitAspect(area, worldArtAspect(outgoing.themeId, { ok: true, manifest: outgoing.manifest })) : null;
  // Remounts the art (and clears a load failure) on Try again.
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
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
        {/* One labelled image while the art is drawn. In the fallback the region is not one element,
            so VoiceOver reaches its message (named like the scene) and Try again inside it. */}
        <View
          accessible={!decorative && showArt}
          accessibilityElementsHidden={decorative}
          importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
          accessibilityRole={showArt ? 'image' : undefined}
          accessibilityLabel={showArt ? sceneLabel(themeId, stage, true) : undefined}
          accessibilityValue={showArt ? { text: sceneDescription(result.manifest, stage) } : undefined}
          style={[styles.scene, fill ? null : [styles.framed, backdropStyle(backdrop)], { width: box.width, height: box.height }]}
          testID="world-scene">
          {showArt && box.width > 0 ? (
            <ThemeFade visible={outgoing === null || incomingShown} durationMs={crossfadeTheme ? THEME_CROSSFADE_MS : 0} testID="world-theme-incoming">
              <SceneErrorBoundary key={`${themeId}-${attempt}`} onError={() => setFailed(true)}>
                <SceneLayers
                  manifest={result.manifest}
                  stage={stage}
                  upcomingStage={upcomingStage}
                  reveal={reveal}
                  ambient={ambient}
                  boxWidth={box.width}
                  onShown={(shownStage) => {
                    setIncomingShown(true);
                    onShown?.(shownStage);
                  }}
                  onError={() => setFailed(true)}
                />
              </SceneErrorBoundary>
            </ThemeFade>
          ) : null}
          {showArt ? null : <SceneFallback label={sceneLabel(themeId, stage, false)} canRetry={result.ok} onRetry={retry} decorative={decorative} />}
        </View>
        {outgoing && outgoingBox && outgoingBox.width > 0 && showArt ? (
          <OutgoingScene
            key={outgoing.key}
            world={outgoing}
            box={outgoingBox}
            // The new world is on screen: the old one fades out (at once without the crossfade) and leaves.
            leaving={incomingShown}
            durationMs={crossfadeTheme ? THEME_CROSSFADE_MS : 0}
            onGone={() => setOutgoing((value) => (value?.key === outgoing.key ? null : value))}
          />
        ) : null}
      </View>
      {children}
    </View>
  );
}

type SceneLayersProps = {
  // Test IDs of the layers: `world` for the scene, `world-outgoing` for a world fading out after a
  // theme change (both themes have layers called cloud_1).
  idPrefix?: string;
  // The world leaving after a theme change: it was on screen a moment ago, so its stage counts as
  // complete from the first frame instead of waiting for its (already decoded) images again.
  alreadyShown?: boolean;
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
function SceneLayers({ idPrefix = 'world', alreadyShown = false, manifest, stage, upcomingStage, reveal, ambient, boxWidth, onShown, onError }: SceneLayersProps) {
  const viewport = useMemo(() => sceneViewport(manifest, VIEWPORT_MARGIN), [manifest]);
  const scale = boxWidth / viewport.width;
  const switches = useAmbientSwitches();
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(() =>
    alreadyShown ? new Set(visibleLayers(manifest, stage).filter((layer) => drawsAtRest(layer, switches)).map((layer) => layer.id)) : new Set(),
  );
  const [shownStage, setShownStage] = useState<Stage | null>(alreadyShown ? stage : null);
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
      idPrefix={idPrefix}
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
  idPrefix: string;
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
function SceneLayerView({ idPrefix, layer, source, viewport, scale, shown, entrance, exit, ambient, onLoad, onError }: SceneLayerViewProps) {
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
      testID={`${idPrefix}-layer-${layer.id}`}
    />
  );

  return (
    <Animated.View
      style={[box, { transformOrigin: [(layer.anchor.x - layer.x) * scale, (layer.anchor.y - layer.y) * scale, 0] }, animated]}
      pointerEvents="none"
      testID={`${idPrefix}-box-${layer.id}`}>
      {layer.ambient ? (
        <AmbientBox
          idPrefix={idPrefix}
          viewport={viewport}
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

// Whether a layer is drawn with these switches: layers invisible at rest (water flow, glows,
// butterflies, petals) are left out entirely when their kind is switched off, so the still scene is
// exactly the approved stack. Clouds, trees and koi are part of the picture and always drawn.
function drawsAtRest(layer: SceneLayer, switches: AmbientSwitches): boolean {
  return !layer.ambient || AMBIENT_REST[layer.ambient.kind] === 'visible' || ambientKindOn(switches, layer.ambient.kind);
}

type AmbientBoxProps = {
  idPrefix: string;
  viewport: Rect;
  layer: SceneLayer;
  mark: AmbientMark;
  scale: number;
  running: boolean;
  startDelayMs: number;
  children: ReactNode;
};

// How long one butterfly flight and one petal fall last (Phase 17, D124): short, within their shared
// period, so at most one of each is in the air at a time.
export const AMBIENT_EVENT_MS = { butterfly: 4200, petal: 5200 } as const;

// A butterfly or petal waits this long after Home appears before the first one moves.
const EVENT_LEAD_MS = 1500;

// Ambient motion of one layer (Phase 10.5, D90; Garden kinds Phase 17, D124), nested inside the reveal
// box so a pop and a motion compose instead of fighting over one transform. One shared value per
// layer, driven on the UI thread by a repeating Reanimated timing: no React render per frame, no timer,
// no frame limiter. Clouds drift out and back (a half-cosine each way), each water flow layer fades in
// and out in its turn (together the streaks travel downstream, D93), a tree leans to each side from its
// trunk base (a sine on a skew, so the base stays put and the crown moves sideways). On the Garden a koi
// glides once round a small loop that starts and ends where it rests (the value is the angle), a glow
// warms up and then breathes very slowly a little below its warmest (never back to dark, so never a
// pulse), and a butterfly or a petal moves once per period (the value is the progress of that one
// flight or fall, 0 = resting unseen). The value is 0 at rest; when `running` turns off (Home hidden,
// app inactive, Reduce Motion, a switch) the animation is cancelled and the layer is back at rest at
// once, and the next start begins from rest, so it never jumps. Each layer waits its phase before it
// starts, so layers never move in step.
function AmbientBox({ idPrefix, viewport, layer, mark, scale, running, startDelayMs, children }: AmbientBoxProps) {
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
    const lead = mark.kind === 'butterfly' || mark.kind === 'petal' ? EVENT_LEAD_MS : 0;
    value.value = withDelay(delayRef.current + lead + mark.phase * mark.periodMs, ambientLoop(mark));
    return () => {
      cancelAnimation(value);
      value.value = 0;
    };
  }, [running, mark, value]);

  const { kind, amplitude } = mark;
  // Butterflies fly toward the middle of the art and back, like clouds drift.
  const inward = layer.x + layer.width / 2 <= viewport.x + viewport.width / 2 ? 1 : -1;
  const animated = useAnimatedStyle(() => {
    const v = value.value;
    switch (kind) {
      case 'cloud':
        return { transform: [{ translateX: v * scale }] };
      case 'water':
      case 'glow':
        return { opacity: v };
      case 'sway':
        return { transform: [{ skewX: `${v}deg` }] };
      case 'koi':
        // One small ellipse through the resting place: across and a little down, and back.
        return { transform: [{ translateX: amplitude * Math.sin(v) * scale }, { translateY: amplitude * 0.45 * (1 - Math.cos(v)) * scale }] };
      case 'butterfly': {
        // Out above its resting place and back below it, with a light flutter; seen only in flight.
        const reach = amplitude * Math.sin(Math.PI * v);
        const rise = -amplitude * 0.3 * Math.sin(2 * Math.PI * v) + amplitude * 0.05 * Math.sin(14 * Math.PI * v);
        return {
          opacity: Math.min(1, v / 0.08, (1 - v) / 0.08),
          transform: [{ translateX: inward * reach * scale }, { translateY: rise * scale }],
        };
      }
      case 'petal':
        // Falls from the canopy, swinging a little side to side, and fades before it lands.
        return {
          opacity: Math.min(1, v / 0.1, (1 - v) / 0.3),
          transform: [
            { translateX: amplitude * 0.1 * Math.sin(3 * Math.PI * v) * scale },
            { translateY: amplitude * v * scale },
            { rotate: `${40 * Math.sin(2 * Math.PI * v)}deg` },
          ],
        };
    }
  });
  const origin =
    mark.pivot === null || kind !== 'sway'
      ? null
      : { transformOrigin: [(mark.pivot.x - layer.x) * scale, (mark.pivot.y - layer.y) * scale, 0] as [number, number, number] };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, origin, animated]} testID={`${idPrefix}-ambient-${layer.id}`}>
      {children}
    </Animated.View>
  );
}

// One endless cycle of a mark, starting and ending at rest (0).
function ambientLoop({ kind, amplitude, periodMs }: AmbientMark) {
  const half = periodMs / 2;
  const smooth = Easing.inOut(Easing.sin);
  switch (kind) {
    case 'sway':
      return withSequence(
        withTiming(amplitude, { duration: periodMs / 4, easing: Easing.out(Easing.sin) }),
        withRepeat(withSequence(withTiming(-amplitude, { duration: half, easing: smooth }), withTiming(amplitude, { duration: half, easing: smooth })), -1),
      );
    case 'koi':
      return withRepeat(withTiming(2 * Math.PI, { duration: periodMs, easing: Easing.linear }), -1);
    case 'glow':
      return withSequence(
        withTiming(amplitude, { duration: half, easing: smooth }),
        withRepeat(withSequence(withTiming(amplitude * 0.7, { duration: half, easing: smooth }), withTiming(amplitude, { duration: half, easing: smooth })), -1),
      );
    case 'butterfly':
    case 'petal': {
      const eventMs = AMBIENT_EVENT_MS[kind];
      return withRepeat(
        withSequence(
          withTiming(1, { duration: eventMs, easing: kind === 'petal' ? Easing.in(Easing.quad) : Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 0 }),
          withDelay(periodMs - eventMs, withTiming(0, { duration: 0 })),
        ),
        -1,
      );
    }
    case 'cloud':
    case 'water':
      return withRepeat(withSequence(withTiming(amplitude, { duration: half, easing: smooth }), withTiming(0, { duration: half, easing: smooth })), -1);
  }
}

type ThemeFadeProps = { visible: boolean; durationMs: number; testID: string; children: ReactNode };

// The new world after a theme change (Phase 17): invisible while the old one is still on screen,
// faded in once its stage has loaded (at once without the crossfade).
function ThemeFade({ visible, durationMs, testID, children }: ThemeFadeProps) {
  const [initiallyVisible] = useState(visible);
  const opacity = useSharedValue(initiallyVisible ? 1 : 0);
  useEffect(() => {
    if (!visible) {
      cancelAnimation(opacity);
      opacity.value = 0;
      return;
    }
    opacity.value = durationMs > 0 ? withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.quad) }) : 1;
  }, [visible, durationMs, opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, animated]} pointerEvents="none" testID={testID}>
      {children}
    </Animated.View>
  );
}

type OutgoingSceneProps = { world: OutgoingWorld; box: { width: number; height: number }; leaving: boolean; durationMs: number; onGone: () => void };

// The world shown before a theme change: still (no ambient motion, no reveal), centred where the scene
// is, until the new world has loaded; then it fades out over the same time the new one fades in, and
// unmounts.
function OutgoingScene({ world, box, leaving, durationMs, onGone }: OutgoingSceneProps) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (!leaving) {
      return;
    }
    opacity.value = durationMs > 0 ? withTiming(0, { duration: durationMs, easing: Easing.inOut(Easing.quad) }) : 0;
    const timer = setTimeout(onGone, durationMs);
    return () => clearTimeout(timer);
    // `onGone` is recreated on every render; the leaving flag decides when to start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving, durationMs, opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <View style={styles.outgoingArea} pointerEvents="none">
      <Animated.View style={[styles.scene, { width: box.width, height: box.height }, animated]} testID="world-theme-outgoing">
        <SceneLayers idPrefix="world-outgoing" alreadyShown manifest={world.manifest} stage={world.stage} upcomingStage={null} reveal={null} ambient={false} boxWidth={box.width} onError={() => undefined} />
      </Animated.View>
    </View>
  );
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

type SceneFallbackProps = { label: string; canRetry: boolean; onRetry: () => void; decorative: boolean };

function SceneFallback({ label, canRetry, onRetry, decorative }: SceneFallbackProps) {
  const compact = useFontScale() > COMPACT_TEXT_SCALE;
  if (decorative) {
    return null;
  }
  return (
    <View style={styles.fallback} testID="world-scene-fallback">
      <View
        accessible
        accessibilityLabel={sceneFallbackLabel(label)}
        style={styles.fallbackText}
        testID="world-scene-fallback-message">
        <AppText role={compact ? 'footnote' : 'headline'} style={styles.centered}>
          {SCENE_FALLBACK_COPY.title}
        </AppText>
        {compact ? null : (
          <AppText role="footnote" tone="secondary" style={styles.centered}>
            {SCENE_FALLBACK_COPY.message}
          </AppText>
        )}
      </View>
      {canRetry ? <Button label={COMMON_COPY.tryAgain} variant="plain" centered onPress={onRetry} testID="world-scene-retry" /> : null}
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
  // The art is placed from the manifest's left-to-right coordinates; a right-to-left layout must
  // not mirror the world (Phase 19 RTL readiness).
  area: {
    direction: 'ltr',
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
  // The outgoing world after a theme change, centred over the scene's area.
  outgoingArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
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
  fallbackText: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  centered: {
    textAlign: 'center',
  },
});
