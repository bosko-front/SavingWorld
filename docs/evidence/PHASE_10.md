# Phase 10 evidence: World transitions and progress feedback

Session date: 25 October 2026. State: **VERIFIED COMPLETE** on Jest and simulator evidence; the three physical-iPhone checks were deferred by the owner to Phases 19/21 (D88), not passed, mandatory before release. Next prompt: [PHASE_11](../prompts/PHASE_11.md).

## Context verified first

- Read the full v1.2 DOCX (textutil) and the required docs (README, PRODUCT_REQUIREMENTS, SOURCE_RECONCILIATION, DECISIONS, DEVELOPMENT_RULES, PROJECT_STATUS, SESSION_HANDOFF, ARCHITECTURE, DATA_MODEL, ASSET_SPEC, UI_UX_GUIDELINES, TEST_PLAN, DESIGN_SYSTEM, the Phase 10 roadmap entry).
- Baseline: clean tree on `main` at 1477708 ("Phase 09: complete Home review D83-D84 and close the phase"). Phase 09 dependency verified in code: `src/features/worlds/` manifest/registry/renderer, Island export bundled in `assets/themes/island/` (manifest with per-milestone layers, anchors, `incidental` flags and the stage 8 `removes` of the small house), `stageFor` as the only stage source.
- No native dependency, config, schema or persistence change in this phase: Reanimated 4.7.1 and react-native-worklets 0.13.0 were already in the Phase 01 build. The current development build **405064a9** runs the new code through Metro; no rebuild, no EAS operation.

## What was built

| Area | Module | Behavior |
| --- | --- | --- |
| Transition planner (pure) | `src/features/worlds/world-transition.ts` | `planWorldTransition` (unlock / quiet / progress from two committed snapshots), `unlocksStage`, the motion state machine `worldMotionReducer` (waiting → counting → revealing → rest; coalesce before start, supersede after start, `leave` on navigation, `settle` in background, stale revisions ignored, at most one transition and one message), `worldMotionView`, the per-layer plan `layerMotion` (pops from anchors with bounded milestone/part stagger, incidental layers fade with their object, stage 8 crossfade, quiet fades), `unlockMessage`, `WORLD_MOTION` timings. |
| Coordinator | `src/features/worlds/use-world-motion.ts` | Feeds each committed snapshot (app-data `version` as the revision) into the reducer during render; runs the timeline only while Home is focused and the app is active; Reduce Motion finishes at once in a layout effect. Plays `haptics.milestone()`, one VoiceOver announcement and the in-scene message once per unlock transition. No data writes. |
| Renderer | `src/features/worlds/world-scene.tsx` | Each layer in a Reanimated box scaled from its anchor (`transformOrigin`); new layers of an unlock pop (0.35 → 1.08 → 1, 560 ms), quiet changes fade (360 ms), the stage 8 house crossfades with the cabin (480 ms); removed layers stay only while they fade, and a withdrawn reveal ends at once. `upcomingStage` preloads the next stage invisibly during the count. Still never shows a stage before all its layers loaded (D78). |
| In-world message | `src/features/worlds/unlock-banner.tsx` | "New milestone unlocked!" + stage name (or "2 milestones unlocked!" + "Bridge and Pond") at the bottom of the scene region, not a toast; tap dismisses, 4.2 s otherwise. |
| Numeric / progress feedback | `src/shared/ui/count-up.ts`, `src/shared/ui/progress-bar.tsx` | `useCountUp` counts the saved amount and percent up in whole units, ending exactly on the committed value; `ProgressBar` glides on the UI thread and blends its fill across the D66 range boundaries (`fillColorStops`), resting on the exact range color. |
| Motion preferences | `src/shared/ui/motion-preferences.ts` | `useReduceMotion` (shared with the toast), `useAppActive`, `useAmbientMotion` (focused + foreground + not reduced). |
| Animated empty states (D69) | `src/shared/ui/ambient-float.tsx`, `empty-state.tsx`, Home | Every `EmptyState` picture floats 4 pt on a 3.6 s cycle (Challenges, Collection, empty History, Home); Home's stage-0 Island adds three twinkling sparkles. Decorative, hidden from VoiceOver, paused off-screen/in background, still under Reduce Motion. |
| Home integration | `home-screen.tsx`, `home-dashboard.ts` (`format`) | Amount, percent, bar and scene come from the motion view; every VoiceOver label and every other number stays committed. Home's layout uses `keyboard="none"` (see D87). |
| Haptics | `entry-form-screen.tsx` | A commit that unlocks a stage leaves the haptic to Home's moment (`milestone`); others keep `success`. |
| Dev | `src/dev/world-inspector.tsx` | "Animated" stepping: + plays the unlock, − the quiet change (stage 8 crossfade inspection). Absent from the release export. |
| Icons | `icon.tsx` | `unlocked` (sparkles) and `sparkle`. |

Mapping to the planned paths: transition planner and coordinator → `world-transition.ts` + `use-world-motion.ts`; committed mutation scene integration → Home (`home-screen.tsx`) using the app-data revision (no separate mutation-revision store was needed: every command already refreshes the snapshot); numeric/progress feedback → `count-up.ts` + `progress-bar.tsx`; state-machine tests → `tests/unit/world-transition.test.ts`.

## Automated checks

| Check | Result |
| --- | --- |
| `npm run lint` | PASS (0 warnings) |
| `npm run typecheck` | PASS |
| `npm test -- --runInBand` | PASS, 30 suites, 755 tests (710 before; +36 unit, +9 integration) |
| `tests/unit/world-transition.test.ts` (36) | Multi-stage jumps (0 → 7, 9.99%/10%, 95% → 125%), decreases (100% → 90%, 62% → 58%), target edits quiet, no-op/other goal/other theme, coalescing, superseding (late events ignored), stale revisions, settle/leave, one message, a 400-step deterministic random walk always ending on the committed stage, layer plans (pop parts, incidental fades, stage 8 crossfade, jump over 8, 0 → 10 bounded, quiet 10 → 9 and 8 → 7), message copy, bar color stops. |
| `tests/integration/world-motion.test.tsx` (9) | Real Home routes, host SQLite, real timers: 55% → 62% count-up from the old value, pond reveal, one message/announcement, haptics exactly `[milestone]` and the toast; in-interval deposit; two thresholds in one message; withdrawal 100% → 90% quiet with `[success]`; quiet target edit; Reduce Motion immediate; background before start settles on stage 8 without the small house and replays nothing on resume; restart opens on the saved stage; empty Island sparkles hidden from VoiceOver and stopped by Reduce Motion. |
| Release export (`npx expo export --platform ios`) | PASS: 56 assets as in Phase 09 (33 Island layers), no inspector code ("files decode to" absent), unlock copy present. |
| `npm run test:db` | NOT RUN: no persistence or SQL change (last PASS with 405064a9 in Phase 09). |
| `npm run deps:check` / `npm run doctor` | NOT RUN: no dependency change; Phase 09 recorded 19/20 for six newer SDK 58 patch releases (unchanged, not upgraded). |

Jest setup change: Reanimated's Jest resolver and `setUpTests()`, Gesture Handler's `jestSetup`, a mapped no-op for its native UI-runtime bindings (`tests/support/gesture-handler-ui-runtime-fake.ts`), and Reduce Motion on by default for older suites (motion tests switch it off). The foreground test's AppState helper now calls every registered listener and clears them per test.

## Native checks (simulator)

iPhone 17 Pro Max simulator, iOS 26.1, development build 405064a9, Metro from this folder (the owner's `expo start`), owner test goal "Summer trip12.345" (paused, target RWF 12,345). Recordings with `xcrun simctl io recordVideo` (downscaled with `avconvert`); frames extracted with AVFoundation (no ffmpeg on this Mac).

| Scenario | Result | Evidence |
| --- | --- | --- |
| Single unlock: deposit RWF 1,200, 50 → 1,250 (0% → 10%) | PASS: sheet gone ~0.4 s after Save; amount counts 50 → 94 → 527 → 876 → 1,066 → 1,177 → 1,231 → 1,249 → 1,250 and the bar fills over ~0.7 s; then the tree appears and "New milestone unlocked! / First tree" fades in; the message leaves after ~4 s. | [unlock-17promax.mp4](phase-10/unlock-17promax.mp4), [frames 0.1 s](phase-10/unlock-first-tree-frames-0.1s.jpg), [screens](phase-10/unlock-first-tree-screens.jpg) |
| Found and fixed: Home scrolled ~200 pt while the sheet's keyboard was up (Home's scroll view adjusted its keyboard inset), so the reveal happened under the status bar. Fixed with `keyboard="none"` on Home's layout (D87); rerun below keeps Home at the top. | FIXED | first recording shows the scroll; second does not |
| Multi-threshold: deposit RWF 2,500, 1,250 → 3,750 (10% → 30%) | PASS: count-up (2,920 / 23% mid-way, bar blending into olive), then "2 milestones unlocked! / Path and Flowers and bushes"; the path visibly grows from its anchor (47.7 → 47.9 s). | [multi-17promax.mp4](phase-10/multi-17promax.mp4), [1 s](phase-10/multi-unlock-frames-1s.jpg), [path pop 0.1 s](phase-10/multi-unlock-path-pop-0.1s.jpg) |
| Relaunch after the unlock | PASS: opens on the saved stage (tree present), no replay. | multi recording start |
| Reduce Motion on (`com.apple.Accessibility ReduceMotionEnabled`), deposit RWF 1,200 (30% → 40%) | PASS: the first frame after the sheet shows RWF 4,950, 40%, the small house and "New milestone unlocked! / Small house" at once; no count or pop; message gone after ~4 s. | [reduce-motion-17promax.mp4](phase-10/reduce-motion-17promax.mp4), [frames](phase-10/reduce-motion-frames-0.5s.jpg) |
| Quiet regression: withdrawal RWF 1,200 (40% → 30%), Reduce Motion off | PASS: the small house fades out within ~0.4 s, amount shows RWF 3,750 at once, no message. | [withdrawal-17promax.mp4](phase-10/withdrawal-17promax.mp4), [frames](phase-10/withdrawal-quiet-frames-0.4s.jpg) |
| Animated empty state (Challenges) | PASS: the flag tile moves a few points up and down across six captures while the title stays still. | [empty-state-float-challenges.jpg](phase-10/empty-state-float-challenges.jpg) |

Simulator recordings write a frame only when the screen changes (10-18 fps nominal), so they show order and timing, not frame rate. The simulator draws on the Mac GPU and has no haptics or VoiceOver.

## Skia evaluation (D86)

Needed effects: layer pop/grow/settle from an anchor, crossfade, quiet fades, bar glide with color interpolation, a 4 pt float and three twinkling sparkles. All are opacity/transform/width/color animations on a few views, done on the UI thread with Reanimated; no particles, shaders or water shimmer were needed. Skia is not installed (D09 unchanged), no rebuild, no bundle growth.

## Acceptance criteria

| Criterion | State |
| --- | --- |
| At animation end the scene equals the committed stage, including 100% → 90% | PASS (reducer random walk, layer plan, Home integration 100% → 90%, simulator 40% → 30%) |
| Rapid updates and background/resume cannot resurrect removed layers or replay a stale completion | PASS in Jest (supersede/stale/settle tests; background settles on stage 8 without the small house and replays nothing); not reproduced natively with timed backgrounding |
| Reduced Motion: immediate stable state plus concise accessible feedback | PASS on the simulator (immediate state and message) and in Jest (announcement once); spoken VoiceOver NOT RUN (no VoiceOver in the simulator) |
| Threshold-crossing deposit shows the D73 moment on a device recording: count-up, bar, stage reveal, new-object animation, message, one haptic | Simulator recording PASS for everything visible; one haptic proven in Jest (`[milestone]` only); physical-iPhone recording, frame inspection and the felt haptic DEFERRED by D88 (Phases 19/21) |

## Deferred by the owner (D88), not passed, mandatory before release

1. Physical iPhone: recording and frame inspection of the unlock moment and of rapid deposits/offscreen navigation (needs a device development build with the owner's Apple Developer credentials and device registration).
2. Physical iPhone: VoiceOver hears "New milestone unlocked! {stage}." once, and can focus/dismiss the message.
3. Physical iPhone: the milestone haptic is felt once and the deposit's success haptic is not.

Owner decision D88 (25 October 2026): 2 and 3 move to Phase 19, 1 to Phase 21 (with 2 and 3 repeated on the release candidate); RELEASE_CHECKLIST, the Phase 19/21 prompts and the roadmap carry them.

## Owner review point and toast follow-up (D89)

The "Deposit saved" toast sat over the top of the Island for its 4 s, and the first unlock (the tree at the top) popped underneath it. The owner first asked for the toast at the bottom for the whole app (built and checked on the 17 Pro Max: above the tab bar, Island clear), then changed their mind: keep it at the top, just lower so it does not sit at the very top. Now `toastTopOffset` = top safe area + 44 + 32 pt (was + 8 pt, touching Home's gear). The toast stays for unlocking deposits. Checked on the 17 Pro Max simulator: [d89-toast-lower-17promax.png](phase-10/d89-toast-lower-17promax.png) (toast starts ~25 pt under the gear). `tests/integration/toast-and-icon.test.tsx` updated; 755 tests PASS after the change.

## Limitations

- The pop/fade timing assumes layers load within ~120 ms after the reveal; they are preloaded during the count, so this only matters on a very slow first load.
- A commit made while Home is not visible (History, a later Challenges tab) waits and plays when Home is focused again; if the app goes to the background first, it settles silently, and that unlocking deposit has no haptic (the toast still confirms it).
- Banner position checked on the 17 Pro Max only; SE/largest text and the Duo arrangement not re-shot.
- Simulator frame timing is not device performance (Phase 21 profiles memory/frames, D83).

## Files changed

New: `src/features/worlds/world-transition.ts`, `use-world-motion.ts`, `unlock-banner.tsx`, `src/shared/ui/count-up.ts`, `motion-preferences.ts`, `ambient-float.tsx`, `tests/unit/world-transition.test.ts`, `tests/integration/world-motion.test.tsx`, `tests/support/gesture-handler-ui-runtime-fake.ts`, `docs/evidence/phase-10/*`. Changed: `world-scene.tsx`, `home-screen.tsx`, `home-dashboard.ts`, `entry-form-screen.tsx`, `progress-bar.tsx`, `empty-state.tsx`, `icon.tsx`, `toast.tsx`, `adaptive-goal-layout.tsx`, `world-inspector.tsx`, `package.json` (Jest config only), `tests/support/jest-setup.ts`, three existing tests (layer box test id, decorative empty Island, AppState helper, icon map).
