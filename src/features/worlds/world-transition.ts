import { MILESTONE_COUNT, stageFor, type Stage, type ThemeId } from '@/core/progression';

import { visibleLayers, type Milestone, type SceneUnlock, type ThemeManifest } from './manifest';
import { worldCompleteCopy } from './world-copy';

// World transitions (Phase 10, owner direction D73): what Home animates after a committed change of
// the selected goal. Pure TypeScript: no React, no timers, no database. The committed snapshot is
// always the truth; a transition only says how the screen moves from the state it last showed to
// that snapshot, and every path ends on the committed stage. Nothing here writes data or decides
// eligibility: stages come from the shared stage function.

// One committed reading of the selected goal. `revision` is the app-data version the snapshot was
// read at; it only grows, so an older reading can never replace a newer one. `souvenir` says whether
// the goal holds its permanent souvenir (Phase 11).
export type SceneSnapshot = {
  goalId: string;
  themeId: ThemeId;
  balanceMinor: number;
  targetMinor: number;
  souvenir: boolean;
  revision: number;
};

// unlock:   the balance rose and the stage rose (a deposit, a correction upwards or a deleted
//           withdrawal): the D73 unlock moment.
// quiet:    the stage changed without an unlock (a withdrawal or correction down, or a target
//           edit): layers settle quietly, no message, no haptic.
// progress: same stage, new numbers: the amount and the bar move, the scene stays.
export type TransitionKind = 'unlock' | 'quiet' | 'progress';

export type WorldTransition = {
  kind: TransitionKind;
  from: SceneSnapshot;
  to: SceneSnapshot;
  fromStage: Stage;
  toStage: Stage;
  // The milestones this transition unlocks, lowest first (unlock only; several when one deposit
  // crosses several thresholds).
  unlocked: readonly Milestone[];
  // The balance rose: the saved amount and the percent count up. A decrease is shown at once.
  countUp: boolean;
  // The goal received its souvenir in this change (the first saved B >= T, Phase 11): the moment
  // says so instead of naming the milestone. A launch never shows it, because the first snapshot
  // already has the souvenir.
  souvenir: boolean;
};

// How the screen moves from `from` to `to`, or null when the goal or theme changed (the screen
// shows the new state directly) or nothing visible changed.
export function planWorldTransition(from: SceneSnapshot, to: SceneSnapshot): WorldTransition | null {
  if (from.goalId !== to.goalId || from.themeId !== to.themeId) {
    return null;
  }
  if (from.balanceMinor === to.balanceMinor && from.targetMinor === to.targetMinor) {
    return null;
  }
  const fromStage = stageFor(from.balanceMinor, from.targetMinor);
  const toStage = stageFor(to.balanceMinor, to.targetMinor);
  const rose = to.balanceMinor > from.balanceMinor;
  const kind: TransitionKind = rose && toStage > fromStage ? 'unlock' : toStage !== fromStage ? 'quiet' : 'progress';
  const unlocked: Milestone[] = [];
  if (kind === 'unlock') {
    for (let stage = fromStage + 1; stage <= toStage; stage += 1) {
      unlocked.push(stage as Milestone);
    }
  }
  return { kind, from, to, fromStage, toStage, unlocked, countUp: rose, souvenir: !from.souvenir && to.souvenir };
}

// Whether a transition has an in-scene message: every unlock, and a first souvenir however it came
// (a lower target also earns it).
export function celebrates(transition: WorldTransition): boolean {
  return transition.kind === 'unlock' || transition.souvenir;
}

// Whether a committed change of the balance unlocks a stage. The entry form uses it to leave the
// haptic to Home's unlock moment (one action, one haptic: DESIGN_SYSTEM "Haptics").
export function unlocksStage(beforeMinor: number, afterMinor: number, targetMinor: number): boolean {
  return afterMinor > beforeMinor && stageFor(afterMinor, targetMinor) > stageFor(beforeMinor, targetMinor);
}

// ---------------------------------------------------------------------------------------------
// Motion state machine. Home keeps one of these per mounted goal view.
//
// waiting:   a transition is known but has not started (the sheet is still closing, Home is not
//            focused yet). The screen keeps showing `from`.
// counting:  the amount, percent and bar move to `to`; the scene still shows the old stage while
//            the new stage's layers load invisibly.
// revealing: the scene shows the new stage and animates its layers.
//
// Rules: the first snapshot, another goal or another theme is shown directly (a launch never
// replays a deposit). A snapshot not newer than the last one seen is ignored. A new commit while
// waiting is coalesced into one transition from what the screen shows; a new commit after the
// transition started finishes it at once and plans the next one from its end. `settle` (background)
// jumps to the latest committed state; `leave` (navigation away from Home) does the same for a
// running transition and keeps a waiting one for Home's return. Both remove the unlock message.
// There is never more than one transition and one message, so nothing queues up.

export type MotionPhase = 'waiting' | 'counting' | 'revealing';

export type WorldMotionState = {
  // The committed state the screen shows when no transition runs, and the start of the running one.
  shown: SceneSnapshot;
  transition: WorldTransition | null;
  phase: MotionPhase;
  // Highest snapshot revision seen.
  revision: number;
  // The unlock whose "New milestone unlocked!" message is shown, if any.
  celebration: Celebration | null;
};

export type Celebration = {
  revision: number;
  goalId: string;
  themeId: ThemeId;
  unlocked: readonly Milestone[];
  souvenir: boolean;
};

export type WorldMotionEvent =
  | { type: 'commit'; snapshot: SceneSnapshot }
  | { type: 'start' }
  | { type: 'reveal'; revision: number }
  | { type: 'finish'; revision: number }
  | { type: 'celebrate'; revision: number }
  | { type: 'dismiss'; revision: number }
  | { type: 'leave' }
  | { type: 'settle' };

export function initialWorldMotion(snapshot: SceneSnapshot): WorldMotionState {
  return { shown: snapshot, transition: null, phase: 'waiting', revision: snapshot.revision, celebration: null };
}

// The committed state the screen ends on.
export function latestSnapshot(state: WorldMotionState): SceneSnapshot {
  return state.transition?.to ?? state.shown;
}

export function worldMotionReducer(state: WorldMotionState, event: WorldMotionEvent): WorldMotionState {
  switch (event.type) {
    case 'commit': {
      const { snapshot } = event;
      const latest = latestSnapshot(state);
      if (snapshot.goalId !== latest.goalId || snapshot.themeId !== latest.themeId) {
        return initialWorldMotion({ ...snapshot, revision: Math.max(snapshot.revision, state.revision) });
      }
      if (snapshot.revision <= state.revision) {
        return state;
      }
      const revision = snapshot.revision;
      if (snapshot.balanceMinor === latest.balanceMinor && snapshot.targetMinor === latest.targetMinor) {
        // A refresh that changed nothing for this goal (a new civil date, another goal's commit)
        // never interrupts what is running.
        return { ...state, revision };
      }
      if (state.transition && state.phase === 'waiting') {
        // Not started yet: one transition from what the screen shows to the newest commit.
        return { ...withTransition(state.shown, snapshot, revision), celebration: state.celebration };
      }
      // Started (or none): what was running is finished at once; the next one starts from there.
      return { ...withTransition(latest, snapshot, revision), celebration: state.celebration };
    }
    case 'start':
      if (!state.transition || state.phase !== 'waiting') {
        return state;
      }
      // A quiet change moves the scene together with the numbers; the others count first.
      return { ...state, phase: state.transition.kind === 'quiet' ? 'revealing' : 'counting' };
    case 'reveal':
      if (!state.transition || state.phase !== 'counting' || state.transition.to.revision !== event.revision) {
        return state;
      }
      return { ...state, phase: 'revealing' };
    case 'finish':
      if (!state.transition || state.transition.to.revision !== event.revision) {
        return state;
      }
      return { ...state, shown: state.transition.to, transition: null, phase: 'waiting' };
    case 'celebrate': {
      const { transition } = state;
      if (!transition || !celebrates(transition) || transition.to.revision !== event.revision) {
        return state;
      }
      const { goalId, themeId } = transition.to;
      const { unlocked, souvenir } = transition;
      return { ...state, celebration: { revision: event.revision, goalId, themeId, unlocked, souvenir } };
    }
    case 'dismiss':
      return state.celebration?.revision === event.revision ? { ...state, celebration: null } : state;
    case 'leave':
      if (state.transition && state.phase !== 'waiting') {
        return { ...state, shown: state.transition.to, transition: null, phase: 'waiting', celebration: null };
      }
      return state.celebration ? { ...state, celebration: null } : state;
    case 'settle':
      return state.transition || state.celebration
        ? { ...state, shown: latestSnapshot(state), transition: null, phase: 'waiting', celebration: null }
        : state;
  }
}

function withTransition(from: SceneSnapshot, to: SceneSnapshot, revision: number): WorldMotionState {
  const transition = planWorldTransition(from, to);
  return transition
    ? { shown: from, transition, phase: 'waiting', revision, celebration: null }
    : { shown: to, transition: null, phase: 'waiting', revision, celebration: null };
}

// What the screen draws for a motion state.
export type WorldMotionView = {
  // Balance and target the numbers and the bar show (the transition's start while waiting).
  balanceMinor: number;
  targetMinor: number;
  // Whether a rise of the numbers counts up instead of jumping.
  countUp: boolean;
  // Stage the scene shows, and a later stage whose layers it may load invisibly ahead of the reveal.
  stage: Stage;
  upcomingStage: Stage | null;
  // How the scene animates the change to `stage` (null: show it directly).
  reveal: SceneReveal | null;
};

export type SceneReveal = { revision: number; mode: 'unlock' | 'quiet' };

export function worldMotionView(state: WorldMotionState): WorldMotionView {
  const { transition, phase } = state;
  if (!transition) {
    const { balanceMinor, targetMinor } = state.shown;
    return { balanceMinor, targetMinor, countUp: false, stage: stageFor(balanceMinor, targetMinor), upcomingStage: null, reveal: null };
  }
  const source = phase === 'waiting' ? transition.from : transition.to;
  const upcomingStage = transition.kind === 'unlock' ? transition.toStage : null;
  return {
    balanceMinor: source.balanceMinor,
    targetMinor: source.targetMinor,
    countUp: transition.countUp,
    stage: phase === 'revealing' ? transition.toStage : transition.fromStage,
    upcomingStage: phase === 'revealing' ? null : upcomingStage,
    reveal: phase === 'revealing' ? { revision: transition.to.revision, mode: transition.kind === 'unlock' ? 'unlock' : 'quiet' } : null,
  };
}

// ---------------------------------------------------------------------------------------------
// Timing. Short on purpose (D73: "pop/grow/settle, not a long cutscene").

export const WORLD_MOTION = {
  // Lets the entry sheet finish closing before Home moves.
  startDelayMs: 450,
  // Amount, percent and bar.
  countMs: 700,
  // Pop/grow/settle of a new object from its anchor.
  popMs: 560,
  // Stage 8 house replacement (small → larger house).
  crossfadeMs: 480,
  // Quiet layer changes after withdrawals and target edits; also the bar's quiet glide.
  quietMs: 360,
  // Longest stagger between the milestones of a multi-threshold deposit, and between the parts
  // (objects) of one milestone.
  maxMilestoneStaggerMs: 600,
  maxPartStaggerMs: 180,
  // How long the "New milestone unlocked!" message stays.
  bannerMs: 4200,
} as const;

// ---------------------------------------------------------------------------------------------
// Per-layer reveal plan for a scene stage change (D76 art: each milestone's own layers, popped from
// their anchors; the stage 8 house replaces the small house with a crossfade).

export type LayerEntrance = { kind: 'pop' | 'fade' | 'crossfade'; delayMs: number };
export type LayerExit = { kind: 'fade' | 'crossfade'; delayMs: number };

export type LayerMotion = {
  entrances: ReadonlyMap<string, LayerEntrance>;
  // Layers leaving the scene; they stay drawn only while they fade out.
  exits: ReadonlyMap<string, LayerExit>;
  // When the last layer animation ends.
  durationMs: number;
};

export function layerMotion(manifest: ThemeManifest, fromStage: Stage, toStage: Stage, mode: SceneReveal['mode']): LayerMotion {
  const before = new Set(visibleLayers(manifest, fromStage).map((layer) => layer.id));
  const after = visibleLayers(manifest, toStage);
  const afterIds = new Set(after.map((layer) => layer.id));
  const added = after.filter((layer) => !before.has(layer.id));
  const removed = [...before].filter((id) => !afterIds.has(id));
  const entrances = new Map<string, LayerEntrance>();
  const exits = new Map<string, LayerExit>();

  if (mode === 'quiet') {
    added.forEach((layer) => entrances.set(layer.id, { kind: 'fade', delayMs: 0 }));
    removed.forEach((id) => exits.set(id, { kind: 'fade', delayMs: 0 }));
    return { entrances, exits, durationMs: added.length + removed.length > 0 ? WORLD_MOTION.quietMs : 0 };
  }

  const owners = new Map<string, SceneUnlock>();
  manifest.unlocks.forEach((unlock) => unlock.adds.forEach((layer) => owners.set(layer.id, unlock)));
  const unlocks = [...new Set(added.map((layer) => owners.get(layer.id)).filter((unlock): unlock is SceneUnlock => !!unlock))].sort(
    (a, b) => a.milestone - b.milestone,
  );
  const milestoneStagger = staggerStep(unlocks.length, 160, WORLD_MOTION.maxMilestoneStaggerMs);
  let durationMs = 0;
  unlocks.forEach((unlock, index) => {
    const start = index * milestoneStagger;
    const replaced = unlock.removes.filter((id) => before.has(id));
    const parts = unlock.adds.filter((layer) => afterIds.has(layer.id) && !layer.incidental);
    const partStagger = staggerStep(parts.length, 50, WORLD_MOTION.maxPartStaggerMs);
    if (replaced.length > 0) {
      // A replacement is one object changing, not a new one appearing: crossfade, no pop.
      unlock.adds.forEach((layer) => entrances.set(layer.id, { kind: 'crossfade', delayMs: start }));
      replaced.forEach((id) => exits.set(id, { kind: 'crossfade', delayMs: start }));
      durationMs = Math.max(durationMs, start + WORLD_MOTION.crossfadeMs);
      return;
    }
    parts.forEach((layer, part) => {
      entrances.set(layer.id, { kind: 'pop', delayMs: start + part * partStagger });
      durationMs = Math.max(durationMs, start + part * partStagger + WORLD_MOTION.popMs);
    });
    // Shadows and outline shifts of an object fade in with it instead of popping on their own.
    unlock.adds
      .filter((layer) => layer.incidental && afterIds.has(layer.id))
      .forEach((layer) => entrances.set(layer.id, { kind: 'fade', delayMs: start }));
  });
  // A removal without a replacing unlock cannot happen on the way up; fade it if a manifest ever
  // has one, so nothing pops away.
  removed.filter((id) => !exits.has(id)).forEach((id) => exits.set(id, { kind: 'fade', delayMs: 0 }));
  return { entrances, exits, durationMs };
}

// Even steps between `count` items, at most `preferred` apart and `total` overall.
function staggerStep(count: number, preferred: number, total: number): number {
  return count > 1 ? Math.min(preferred, total / (count - 1)) : 0;
}

// ---------------------------------------------------------------------------------------------
// The in-world message (not a toast, D40) and its VoiceOver announcement.

export type UnlockMessage = { title: string; detail: string; announcement: string };

// `name` gives a milestone's name from the theme manifest (null for a theme without art). The first
// time a goal reaches its target (`souvenir`), the message is the completed world and its souvenir
// instead of the milestone names (Phase 11).
export function unlockMessage(
  unlocked: readonly Milestone[],
  name: (milestone: Milestone) => string | null,
  souvenir: { themeId: ThemeId } | null = null,
): UnlockMessage {
  if (souvenir) {
    const title = worldCompleteCopy(souvenir.themeId).title;
    const detail = 'Its souvenir is now in your Collection.';
    return { title, detail, announcement: `${title} ${detail}` };
  }
  const names = unlocked.map((milestone) => name(milestone) ?? `${(milestone * 100) / MILESTONE_COUNT}% reached`);
  const title = unlocked.length === 1 ? 'New milestone unlocked!' : `${unlocked.length} milestones unlocked!`;
  const detail =
    names.length <= 2 ? names.join(' and ') : `${names[names.length - 1]} and ${names.length - 1} more`;
  return { title, detail, announcement: `${title} ${detail}.` };
}
