import { stageFor, type Stage } from '@/core/progression';
import { type Milestone, type ThemeManifest } from '@/features/worlds/manifest';
import { stageName, themeManifest } from '@/features/worlds/registry';
import {
  initialWorldMotion,
  latestSnapshot,
  layerMotion,
  planWorldTransition,
  unlockMessage,
  unlocksStage,
  WORLD_MOTION,
  worldMotionReducer,
  worldMotionView,
  type SceneSnapshot,
  type WorldMotionEvent,
  type WorldMotionState,
} from '@/features/worlds/world-transition';
import { colors } from '@/shared/theme';
import { fillColorStops, progressFillColor } from '@/shared/ui/progress-bar';

// Phase 10 world transitions (pure): what a committed change animates, the motion state machine
// (coalescing, superseding, settling, never more than one transition or message), the per-layer
// reveal plan from the Island manifest (D76: pops from anchors, stage 8 crossfade) and the bar's
// color blend. Expected values are written from v1.2's stage rule, not computed by the code under
// test. Rendering and timing on Home: tests/integration/world-motion.test.tsx.

const TARGET = 100_000; // €1,000.00: stage k starts at k × €100.

function snap(balanceMinor: number, revision: number, overrides: Partial<SceneSnapshot> = {}): SceneSnapshot {
  return { goalId: 'g1', themeId: 'island', balanceMinor, targetMinor: TARGET, revision, ...overrides };
}

function island(): ThemeManifest {
  const result = themeManifest('island');
  if (!result.ok) {
    throw new Error('island manifest invalid');
  }
  return result.manifest;
}

function run(state: WorldMotionState, ...events: WorldMotionEvent[]): WorldMotionState {
  return events.reduce(worldMotionReducer, state);
}

describe('planWorldTransition', () => {
  it('a deposit from 55% to 62% unlocks exactly stage 6 and counts up', () => {
    const plan = planWorldTransition(snap(55_000, 1), snap(62_000, 2));
    expect(plan).toMatchObject({ kind: 'unlock', fromStage: 5, toStage: 6, unlocked: [6], countUp: true });
  });

  it('a deposit inside one interval only moves the numbers', () => {
    expect(planWorldTransition(snap(55_000, 1), snap(58_000, 2))).toMatchObject({ kind: 'progress', fromStage: 5, toStage: 5, unlocked: [], countUp: true });
  });

  it('one deposit across several thresholds unlocks each crossed milestone once, in order', () => {
    expect(planWorldTransition(snap(5_000, 1), snap(73_000, 2))).toMatchObject({ kind: 'unlock', fromStage: 0, toStage: 7, unlocked: [1, 2, 3, 4, 5, 6, 7] });
    // 9.99% stays at the base; exactly 10% unlocks the first stage (v1.2 test example).
    expect(planWorldTransition(snap(0, 1), snap(9_999, 2))?.kind).toBe('progress');
    expect(planWorldTransition(snap(9_999, 1), snap(10_000, 2))).toMatchObject({ kind: 'unlock', unlocked: [1] });
  });

  it('overfunding stops at stage 10: 95% → 125% unlocks only the last stage', () => {
    expect(planWorldTransition(snap(95_000, 1), snap(125_000, 2))).toMatchObject({ kind: 'unlock', fromStage: 9, toStage: 10, unlocked: [10] });
    expect(planWorldTransition(snap(100_000, 1), snap(125_000, 2))).toMatchObject({ kind: 'progress', unlocked: [] });
  });

  it('withdrawals and corrections down regress quietly, including 100% → 90%', () => {
    expect(planWorldTransition(snap(100_000, 1), snap(90_000, 2))).toMatchObject({ kind: 'quiet', fromStage: 10, toStage: 9, unlocked: [], countUp: false });
    expect(planWorldTransition(snap(62_000, 1), snap(58_000, 2))).toMatchObject({ kind: 'quiet', toStage: 5 });
  });

  it('target edits never celebrate: a lower target can raise the stage, but quietly', () => {
    expect(planWorldTransition(snap(30_000, 1), snap(30_000, 2, { targetMinor: 50_000 }))).toMatchObject({ kind: 'quiet', fromStage: 3, toStage: 6, countUp: false });
    expect(planWorldTransition(snap(30_000, 1), snap(30_000, 2, { targetMinor: 200_000 }))).toMatchObject({ kind: 'quiet', fromStage: 3, toStage: 1 });
    expect(planWorldTransition(snap(30_000, 1), snap(30_000, 2, { targetMinor: 99_000 }))?.kind).toBe('progress');
  });

  it('no transition for another goal, another theme or an unchanged reading', () => {
    expect(planWorldTransition(snap(10_000, 1), snap(80_000, 2, { goalId: 'g2' }))).toBeNull();
    expect(planWorldTransition(snap(10_000, 1), snap(80_000, 2, { themeId: 'garden' }))).toBeNull();
    expect(planWorldTransition(snap(10_000, 1), snap(10_000, 9))).toBeNull();
  });
});

describe('unlocksStage (entry form leaves the haptic to Home)', () => {
  it('only a rise across a threshold unlocks', () => {
    expect(unlocksStage(55_000, 62_000, TARGET)).toBe(true);
    expect(unlocksStage(55_000, 59_999, TARGET)).toBe(false);
    expect(unlocksStage(62_000, 55_000, TARGET)).toBe(false);
    expect(unlocksStage(100_000, 150_000, TARGET)).toBe(false);
  });
});

describe('world motion state machine', () => {
  it('the first reading is shown directly: a launch never replays a deposit', () => {
    const state = initialWorldMotion(snap(62_000, 5));
    expect(state.transition).toBeNull();
    expect(worldMotionView(state)).toEqual({ balanceMinor: 62_000, targetMinor: TARGET, countUp: false, stage: 6, upcomingStage: null, reveal: null });
  });

  it('runs an unlock as waiting → counting → revealing → rest and ends on the committed stage', () => {
    let state = run(initialWorldMotion(snap(55_000, 1)), { type: 'commit', snapshot: snap(62_000, 2) });
    expect(state.phase).toBe('waiting');
    // Waiting: the screen keeps the old numbers and stage, and preloads the new stage's layers.
    expect(worldMotionView(state)).toMatchObject({ balanceMinor: 55_000, stage: 5, upcomingStage: 6, reveal: null });
    state = run(state, { type: 'start' });
    expect(worldMotionView(state)).toMatchObject({ balanceMinor: 62_000, countUp: true, stage: 5, upcomingStage: 6, reveal: null });
    state = run(state, { type: 'reveal', revision: 2 });
    expect(worldMotionView(state)).toMatchObject({ balanceMinor: 62_000, stage: 6, upcomingStage: null, reveal: { revision: 2, mode: 'unlock' } });
    state = run(state, { type: 'celebrate', revision: 2 }, { type: 'finish', revision: 2 });
    expect(state.transition).toBeNull();
    expect(state.celebration).toMatchObject({ revision: 2, unlocked: [6] });
    expect(worldMotionView(state)).toMatchObject({ balanceMinor: 62_000, stage: 6, reveal: null });
  });

  it('a quiet regression moves the scene with the numbers (no counting phase, no message)', () => {
    let state = run(initialWorldMotion(snap(100_000, 1)), { type: 'commit', snapshot: snap(90_000, 2) }, { type: 'start' });
    expect(state.phase).toBe('revealing');
    expect(worldMotionView(state)).toMatchObject({ balanceMinor: 90_000, countUp: false, stage: 9, reveal: { revision: 2, mode: 'quiet' } });
    state = run(state, { type: 'celebrate', revision: 2 });
    expect(state.celebration).toBeNull();
    state = run(state, { type: 'finish', revision: 2 });
    expect(worldMotionView(state).stage).toBe(9);
  });

  it('coalesces commits that arrive before the start into one transition from what is shown', () => {
    const state = run(
      initialWorldMotion(snap(5_000, 1)),
      { type: 'commit', snapshot: snap(25_000, 2) },
      { type: 'commit', snapshot: snap(73_000, 3) },
    );
    expect(state.transition).toMatchObject({ kind: 'unlock', fromStage: 0, toStage: 7, unlocked: [1, 2, 3, 4, 5, 6, 7] });
    expect(state.transition?.from.balanceMinor).toBe(5_000);
  });

  it('a commit during a running transition finishes it at once and starts from its end', () => {
    let state = run(initialWorldMotion(snap(55_000, 1)), { type: 'commit', snapshot: snap(62_000, 2) }, { type: 'start' });
    state = run(state, { type: 'commit', snapshot: snap(71_000, 3) });
    expect(state.phase).toBe('waiting');
    expect(state.shown.balanceMinor).toBe(62_000);
    expect(state.transition).toMatchObject({ kind: 'unlock', fromStage: 6, toStage: 7, unlocked: [7] });
    // The superseded transition's late events change nothing.
    expect(run(state, { type: 'reveal', revision: 2 }, { type: 'finish', revision: 2 })).toEqual(state);
  });

  it('a superseding withdrawal during an unlock ends on the lower committed stage; removed layers cannot return', () => {
    let state = run(initialWorldMotion(snap(75_000, 1)), { type: 'commit', snapshot: snap(82_000, 2) }, { type: 'start' }, { type: 'reveal', revision: 2 });
    expect(worldMotionView(state).stage).toBe(8);
    state = run(state, { type: 'commit', snapshot: snap(70_000, 3) }, { type: 'start' });
    expect(state.transition).toMatchObject({ kind: 'quiet', fromStage: 8, toStage: 7 });
    state = run(state, { type: 'finish', revision: 3 });
    expect(worldMotionView(state)).toMatchObject({ balanceMinor: 70_000, stage: 7, reveal: null });
  });

  it('ignores stale and repeated readings; a refresh without change never interrupts a transition', () => {
    let state = run(initialWorldMotion(snap(55_000, 4)), { type: 'commit', snapshot: snap(62_000, 5) });
    expect(run(state, { type: 'commit', snapshot: snap(10_000, 3) })).toBe(state);
    expect(run(state, { type: 'commit', snapshot: snap(62_000, 5) })).toBe(state);
    state = run(state, { type: 'start' }, { type: 'commit', snapshot: snap(62_000, 6) });
    expect(state.phase).toBe('counting');
    expect(state.revision).toBe(6);
    expect(state.transition?.to.revision).toBe(5);
  });

  it('settle (background) jumps to the committed state and removes the message; nothing replays on resume', () => {
    let state = run(initialWorldMotion(snap(95_000, 1)), { type: 'commit', snapshot: snap(100_000, 2) }, { type: 'start' }, { type: 'reveal', revision: 2 }, { type: 'celebrate', revision: 2 });
    state = run(state, { type: 'settle' });
    expect(state.transition).toBeNull();
    expect(state.celebration).toBeNull();
    expect(worldMotionView(state)).toMatchObject({ balanceMinor: 100_000, stage: 10, reveal: null });
    // Even a waiting transition settles in the background.
    const waiting = run(initialWorldMotion(snap(10_000, 1)), { type: 'commit', snapshot: snap(30_000, 2) }, { type: 'settle' });
    expect(worldMotionView(waiting)).toMatchObject({ balanceMinor: 30_000, stage: 3, reveal: null });
  });

  it('leave (navigation) settles a running transition but keeps a waiting one for Home', () => {
    const waiting = run(initialWorldMotion(snap(10_000, 1)), { type: 'commit', snapshot: snap(30_000, 2) });
    expect(run(waiting, { type: 'leave' })).toBe(waiting);
    const running = run(waiting, { type: 'start' }, { type: 'leave' });
    expect(running.transition).toBeNull();
    expect(latestSnapshot(running).balanceMinor).toBe(30_000);
  });

  it('another goal or theme is shown directly, dropping the running transition and message', () => {
    const running = run(initialWorldMotion(snap(55_000, 1)), { type: 'commit', snapshot: snap(62_000, 2) }, { type: 'start' }, { type: 'reveal', revision: 2 }, { type: 'celebrate', revision: 2 });
    const other = run(running, { type: 'commit', snapshot: snap(5_000, 3, { goalId: 'g2' }) });
    expect(other).toEqual(initialWorldMotion(snap(5_000, 3, { goalId: 'g2' })));
    const garden = run(running, { type: 'commit', snapshot: snap(62_000, 3, { themeId: 'garden' }) });
    expect(garden.transition).toBeNull();
    expect(garden.celebration).toBeNull();
  });

  it('keeps at most one message: a newer unlock replaces it, dismiss removes only its own', () => {
    let state = run(initialWorldMotion(snap(55_000, 1)), { type: 'commit', snapshot: snap(62_000, 2) }, { type: 'start' }, { type: 'reveal', revision: 2 }, { type: 'celebrate', revision: 2 }, { type: 'finish', revision: 2 });
    state = run(state, { type: 'commit', snapshot: snap(71_000, 3) });
    expect(state.celebration?.revision).toBe(2);
    state = run(state, { type: 'start' }, { type: 'reveal', revision: 3 }, { type: 'celebrate', revision: 3 });
    expect(state.celebration).toMatchObject({ revision: 3, unlocked: [7] });
    expect(run(state, { type: 'dismiss', revision: 2 }).celebration?.revision).toBe(3);
    expect(run(state, { type: 'dismiss', revision: 3 }).celebration).toBeNull();
  });

  it('every random sequence of commits and events ends on the latest committed stage once settled', () => {
    // Deterministic pseudo-random walk (no Math.random): balances jump up and down across thresholds.
    let seed = 7;
    const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648);
    let state = initialWorldMotion(snap(0, 0));
    let committed = 0;
    for (let step = 1; step <= 400; step += 1) {
      const roll = next() % 6;
      const revision = state.revision;
      if (roll < 2) {
        committed = Math.max(0, committed + ((next() % 60_001) - 25_000));
        state = worldMotionReducer(state, { type: 'commit', snapshot: snap(committed, step) });
      } else {
        const events: WorldMotionEvent[] = [
          { type: 'start' },
          { type: 'reveal', revision },
          { type: 'finish', revision },
          { type: 'leave' },
        ];
        state = worldMotionReducer(state, events[roll - 2] ?? { type: 'start' });
      }
      expect(latestSnapshot(state).balanceMinor).toBe(committed);
    }
    state = worldMotionReducer(state, { type: 'settle' });
    expect(worldMotionView(state)).toMatchObject({ balanceMinor: committed, stage: stageFor(committed, TARGET), reveal: null });
  });
});

describe('layerMotion (Island manifest, D76)', () => {
  const ids = (stage: Stage, milestone: Milestone) => island().unlocks[milestone - 1]?.adds.filter(() => stage >= milestone).map((layer) => layer.id) ?? [];

  it('pops each new object of the unlocked milestone from its anchor, parts a little apart', () => {
    const motion = layerMotion(island(), 2, 3, 'unlock');
    const flowers = ids(3, 3);
    expect([...motion.entrances.keys()].sort()).toEqual([...flowers].sort());
    const delays = flowers.map((id) => motion.entrances.get(id));
    expect(delays.every((entrance) => entrance?.kind === 'pop')).toBe(true);
    expect(delays[0]?.delayMs).toBe(0);
    // Eight parts within the bounded part stagger.
    expect(Math.max(...delays.map((entrance) => entrance?.delayMs ?? 0))).toBeLessThanOrEqual(WORLD_MOTION.maxPartStaggerMs);
    expect(motion.exits.size).toBe(0);
  });

  it('shadows and outline shifts fade in with their object instead of popping', () => {
    const motion = layerMotion(island(), 3, 4, 'unlock');
    expect(motion.entrances.get('small_house_1')).toEqual({ kind: 'pop', delayMs: 0 });
    expect(motion.entrances.get('small_house_2')).toEqual({ kind: 'fade', delayMs: 0 });
  });

  it('the stage 8 house replaces the small house with a crossfade, not a pop', () => {
    const motion = layerMotion(island(), 7, 8, 'unlock');
    for (const id of ids(8, 8)) {
      expect(motion.entrances.get(id)).toEqual({ kind: 'crossfade', delayMs: 0 });
    }
    expect([...motion.exits.entries()]).toEqual([
      ['small_house_1', { kind: 'crossfade', delayMs: 0 }],
      ['small_house_2', { kind: 'crossfade', delayMs: 0 }],
    ]);
    expect(motion.durationMs).toBe(WORLD_MOTION.crossfadeMs);
  });

  it('a jump over stage 8 never shows the small house: the larger house simply pops', () => {
    const motion = layerMotion(island(), 3, 9, 'unlock');
    expect(motion.entrances.has('small_house_1')).toBe(false);
    expect(motion.exits.size).toBe(0);
    expect(motion.entrances.get('larger_house_1')?.kind).toBe('pop');
  });

  it('a multi-threshold deposit staggers its milestones within a short, bounded sequence', () => {
    const motion = layerMotion(island(), 0, 10, 'unlock');
    const firstTree = motion.entrances.get('first_tree_1')?.delayMs ?? -1;
    const completed = motion.entrances.get('completed_island_1')?.delayMs ?? -1;
    expect(firstTree).toBe(0);
    expect(completed).toBeLessThanOrEqual(WORLD_MOTION.maxMilestoneStaggerMs);
    expect(motion.durationMs).toBeLessThanOrEqual(WORLD_MOTION.maxMilestoneStaggerMs + WORLD_MOTION.maxPartStaggerMs + WORLD_MOTION.popMs);
    // Every layer drawn at stage 10 that the base did not have is revealed once.
    const base = new Set(island().base.layers.map((layer) => layer.id));
    const expected = island()
      .unlocks.flatMap((unlock) => unlock.adds)
      .filter((layer) => !layer.id.startsWith('small_house'))
      .map((layer) => layer.id)
      .filter((id) => !base.has(id));
    expect([...motion.entrances.keys()].sort()).toEqual(expected.sort());
  });

  it('quiet changes fade layers out and back (100% → 90%, and 8 → 7 brings the small house back)', () => {
    const down = layerMotion(island(), 10, 9, 'quiet');
    expect([...down.exits.keys()].sort()).toEqual(ids(10, 10).sort());
    expect([...down.exits.values()].every((exit) => exit.kind === 'fade')).toBe(true);
    expect(down.entrances.size).toBe(0);
    const house = layerMotion(island(), 8, 7, 'quiet');
    expect(house.entrances.get('small_house_1')).toEqual({ kind: 'fade', delayMs: 0 });
    expect(house.exits.get('larger_house_1')).toEqual({ kind: 'fade', delayMs: 0 });
    expect(house.durationMs).toBe(WORLD_MOTION.quietMs);
  });

  it('no layer change, no animation time', () => {
    expect(layerMotion(island(), 5, 5, 'quiet')).toEqual({ entrances: new Map(), exits: new Map(), durationMs: 0 });
  });
});

describe('unlockMessage', () => {
  const name = (milestone: Milestone) => stageName('island', milestone);

  it('names the one unlocked stage from the manifest', () => {
    expect(unlockMessage([6], name)).toEqual({ title: 'New milestone unlocked!', detail: 'Pond', announcement: 'New milestone unlocked! Pond.' });
  });

  it('several thresholds give one message', () => {
    expect(unlockMessage([5, 6], name)).toMatchObject({ title: '2 milestones unlocked!', detail: 'Bridge and Pond' });
    expect(unlockMessage([1, 2, 3, 4, 5, 6, 7], name)).toMatchObject({ title: '7 milestones unlocked!', detail: 'Additional trees and 6 more' });
  });

  it('a theme without art says the percentage', () => {
    expect(unlockMessage([4], () => null)).toMatchObject({ detail: '40% reached' });
  });
});

describe('fillColorStops (bar color blend, D66 ranges)', () => {
  it('keeps one color inside a range and ends on the exact range color', () => {
    expect(fillColorStops(0.55, 55, 0.58, 58)).toEqual({ input: [0, 1], output: [colors.progressMid, colors.progressMid] });
  });

  it('blends into olive just before 30% on the way up', () => {
    expect(fillColorStops(0.25, 25, 0.35, 35)).toEqual({
      input: [0.25, 0.26, 0.3, 0.35],
      output: [colors.progressLow, colors.progressLow, colors.progressMid, colors.progressMid],
    });
  });

  it('crosses several ranges up to the strong green at 100%', () => {
    const stops = fillColorStops(0.2, 20, 1, 100);
    expect(stops.input.map((at) => Number(at.toFixed(6)))).toEqual([0.2, 0.26, 0.3, 0.56, 0.6, 0.96, 1]);
    expect(stops.output).toEqual([
      colors.progressLow,
      colors.progressLow,
      colors.progressMid,
      colors.progressMid,
      colors.progressHigh,
      colors.progressHigh,
      colors.progressComplete,
    ]);
  });

  it('on the way down (100% → 90%) blends before the boundary it passes and rests on soft green', () => {
    expect(fillColorStops(1, 100, 0.9, 90)).toEqual({ input: [0.9, 0.96, 1], output: [colors.progressHigh, colors.progressHigh, colors.progressComplete] });
  });

  it('a start right at a boundary has no blend zone before it', () => {
    expect(fillColorStops(0.29, 29, 0.3, 30)).toEqual({ input: [0.29, 0.3], output: [colors.progressLow, colors.progressMid] });
  });

  it('the color at rest is always progressFillColor of the final percent', () => {
    for (const [from, to] of [
      [0, 29],
      [29, 30],
      [59, 61],
      [99, 100],
      [100, 59],
      [61, 12],
    ] as const) {
      const stops = fillColorStops(from / 100, from, to / 100, to);
      const endIndex = stops.input.indexOf(to / 100);
      expect(stops.output[endIndex === -1 ? stops.output.length - 1 : endIndex]).toBe(progressFillColor(to));
      expect(stops.input).toEqual([...stops.input].sort((a, b) => a - b));
      expect(new Set(stops.input).size).toBe(stops.input.length);
    }
  });
});
