import { useIsFocused } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';

import { haptics } from '@/shared/ui/haptics';
import { useAppActive, useReduceMotion } from '@/shared/ui/motion-preferences';

import { themeManifest, stageName } from './registry';
import {
  initialWorldMotion,
  latestSnapshot,
  layerMotion,
  unlockMessage,
  WORLD_MOTION,
  worldMotionReducer,
  worldMotionView,
  type SceneSnapshot,
  type UnlockMessage,
  type WorldMotionView,
  type WorldTransition,
} from './world-transition';

// Home's world motion (Phase 10): feeds each committed snapshot of the selected goal into the pure
// state machine in world-transition.ts and runs its timeline. The D73 unlock moment, in order: the
// saved amount counts up and the bar fills, then the Island shows the new stage and its new objects
// pop from their anchors, together with one "New milestone unlocked!" message in the scene, one
// VoiceOver announcement and one `haptics.milestone()`.
//
// Presentation only: it never writes data or decides eligibility, and the committed snapshot stays
// the truth. A transition starts only while Home is focused and the app is in the foreground;
// leaving Home or the app ends it on the committed state, and a launch shows the saved state
// directly. Reduce Motion skips every movement: the final values and the message appear at once,
// with the same announcement and haptic.

export type UnlockBanner = UnlockMessage & { key: number };

export type WorldMotion = WorldMotionView & {
  banner: UnlockBanner | null;
  dismissBanner: () => void;
};

export function useWorldMotion(snapshot: SceneSnapshot): WorldMotion {
  const [state, dispatch] = useReducer(worldMotionReducer, snapshot, initialWorldMotion);
  const focused = useIsFocused();
  const active = useAppActive();
  const reduced = useReduceMotion();
  const lastMoment = useRef<number | null>(null);
  const latest = latestSnapshot(state);

  // A new committed snapshot is taken in during render, so the screen never paints its numbers
  // before the transition knows where to start from.
  if (snapshot.revision > state.revision || snapshot.goalId !== latest.goalId || snapshot.themeId !== latest.themeId) {
    dispatch({ type: 'commit', snapshot });
  }

  const { transition, phase, celebration } = state;

  // The moment's feedback, once per transition: the message (state), the announcement, the haptic.
  const celebrate = (unlock: WorldTransition) => {
    if (lastMoment.current === unlock.to.revision) {
      return;
    }
    lastMoment.current = unlock.to.revision;
    const message = unlockMessage(unlock.unlocked, (milestone) => stageName(unlock.to.themeId, milestone));
    haptics.milestone();
    AccessibilityInfo.announceForAccessibilityWithOptions(message.announcement, { queue: true });
    dispatch({ type: 'celebrate', revision: unlock.to.revision });
  };

  // In the background nothing waits or runs: on return the scene is simply the committed one.
  useEffect(() => {
    if (!active) {
      dispatch({ type: 'settle' });
    }
  }, [active]);

  // Leaving Home ends a running transition (a waiting one waits for Home to come back).
  useEffect(() => {
    if (!focused) {
      dispatch({ type: 'leave' });
    }
  }, [focused, phase]);

  // Reduce Motion: the final state at once, before the frame is painted, plus the message.
  useLayoutEffect(() => {
    if (transition && phase === 'waiting' && focused && active && reduced) {
      if (transition.kind === 'unlock') {
        celebrate(transition);
      }
      dispatch({ type: 'finish', revision: transition.to.revision });
    }
  }, [transition, phase, focused, active, reduced]);

  // The timeline: a short pause for the sheet to close, the count, the reveal.
  useEffect(() => {
    if (!transition || !focused || !active || reduced) {
      return;
    }
    const revision = transition.to.revision;
    let timer: ReturnType<typeof setTimeout>;
    if (phase === 'waiting') {
      timer = setTimeout(() => dispatch({ type: 'start' }), WORLD_MOTION.startDelayMs);
    } else if (phase === 'counting') {
      timer = setTimeout(
        () => dispatch(transition.kind === 'unlock' ? { type: 'reveal', revision } : { type: 'finish', revision }),
        WORLD_MOTION.countMs,
      );
    } else {
      if (transition.kind === 'unlock') {
        celebrate(transition);
      }
      timer = setTimeout(() => dispatch({ type: 'finish', revision }), revealDurationMs(transition));
    }
    return () => clearTimeout(timer);
  }, [transition, phase, focused, active, reduced]);

  // The message stays a few seconds; a tap dismisses it earlier.
  useEffect(() => {
    if (!celebration) {
      return;
    }
    const timer = setTimeout(() => dispatch({ type: 'dismiss', revision: celebration.revision }), WORLD_MOTION.bannerMs);
    return () => clearTimeout(timer);
  }, [celebration]);

  const banner = useMemo(
    () =>
      celebration
        ? { ...unlockMessage(celebration.unlocked, (milestone) => stageName(celebration.themeId, milestone)), key: celebration.revision }
        : null,
    [celebration],
  );

  return {
    ...worldMotionView(state),
    banner,
    dismissBanner: () => {
      if (celebration) {
        dispatch({ type: 'dismiss', revision: celebration.revision });
      }
    },
  };
}

// How long the scene animates its layers for a transition, plus a little time for the new images to
// appear; the transition finishes after it, so finishing never cuts a running animation short.
function revealDurationMs(transition: WorldTransition): number {
  const result = themeManifest(transition.to.themeId);
  if (!result.ok) {
    return 0;
  }
  const mode = transition.kind === 'unlock' ? 'unlock' : 'quiet';
  return layerMotion(result.manifest, transition.fromStage, transition.toStage, mode).durationMs + 120;
}
