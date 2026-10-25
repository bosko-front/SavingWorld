# Implement Phase 10.5 Living Island ambient motion

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, the phase-specific documents below and its canonical roadmap entry. This is a UI and art phase: read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`. For any native or dependency change, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies or entry audit history. Owner decision D74 (DECISIONS) overrides v1.2 on goals: Archive and Close goal are removed (statuses active, paused, completed), any goal can be deleted after a native confirmation, Free may have one goal in total in any status. Do not restore Archive or the old no-deletion rule. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/ASSET_SPEC.md`, `assets/worlds/island/README.md` (Blender source, rebuild/render/export commands, provenance), `docs/DESIGN_SYSTEM.md` (motion, scene), `docs/evidence/PHASE_09.md` and `docs/evidence/PHASE_10.md`, DECISIONS D76-D77 (art and renderer), D85-D86 (world motion, no Skia), D90 (this phase's rules), and the Phase 10.5 and Phase 21 entries in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Make the Home Island feel alive with quiet ambient motion (drifting clouds, a soft shimmer on the water, gently swaying trees) at a cost low enough to keep. The owner asked for this on 25 October 2026 (DECISIONS D90). Performance decides whether it ships: Phase 21 measures it on a physical iPhone, and a static Island is an accepted fallback.

## Dependencies and decision gates

Phase 10 (verified complete; D88 carried its physical-iPhone checks to Phases 19/21). Verify in code: `WorldScene` with per-layer boxes and anchors (`src/features/worlds/world-scene.tsx`), the motion gates `useAmbientMotion`/`useReduceMotion`/`useAppActive` (`src/shared/ui/motion-preferences.ts`) and the unlock reveal (`world-transition.ts`, `use-world-motion.ts`).

Art gate: clouds, the stream, the waterfall and the foam are currently baked into the base layer (`SW_00_Base_EmptyIsland` in the Blender source). Separate layers for them are made in the Blender workspace and re-exported (D76: fix art in the scripts, never hand-edit PNGs). The owner approves the re-exported Island (stacked layers must still reproduce the approved renders) and the motion on the simulator before the phase closes.

## Owner rules (D90)

- Ambient motion only: clouds, a gentle water shimmer and trees. No new objects, characters, particles, weather or sounds.
- 30 fps is enough for these effects; 60 fps is not a goal. Do not add a JavaScript frame limiter: Reanimated runs the animations on the UI thread, and real load and energy matter more than the frame count. Prefer slow, low-amplitude motion that looks right at any frame rate.
- Ambient motion runs only while Home is visible (focused) and the app is active, and is off under Reduce Motion (a still Island, not a frozen mid-animation frame).
- Simple transforms and opacity wherever possible, on a few layers. Never re-render the whole scene, never animate layout every frame, never drive the motion from React state.
- If testing shows meaningful battery use or performance loss, simplify the water first, then switch ambient motion off if needed. A static Island is an acceptable final result.

## Exact scope

- **Art export (Blender workspace).** Change `assets/worlds/island/scripts` so the export gives: the base without clouds (and, if the water effect needs it, without the moving water highlights); one transparent layer per cloud (or one per cloud group); a water layer or highlight mask covering the stream and waterfall for the shimmer. Keep camera, light, frame and every stage composition unchanged; `verify_stages.py` and the stacking check must still reproduce all eleven approved renders. Trees stay the existing milestone layers; export a separate canopy only if swaying a whole tree layer (with its trunk shadow) looks wrong on the simulator. Copy the re-export unchanged to `assets/themes/island/` and update the static map (`themes/island-assets.ts`), as Phase 09 did.
- **Manifest contract.** Mark ambient layers in the manifest/export mapping (for example an `ambient` kind: `cloud`, `water`, `sway`, with a small per-layer amplitude/period or a preset name), validated like other layers. A cloud or water layer belongs to the base (always visible); a sway mark goes on the tree layers of their milestones. Update `ASSET_SPEC.md` and `manifest.ts`/`theme-export.ts`. No progression math in the renderer; stage visibility rules are unchanged. Follow ASSET_SPEC's version rule for a changed layer contract (no souvenirs exist yet, Phase 11 starts storing theme versions).
- **Ambient renderer.** In `src/features/worlds/`, a small ambient layer driver on the existing per-layer boxes: clouds drift a few points horizontally and back on long cycles (tens of seconds, wrapping or ping-pong, never leaving the sky region); the water shimmer is an opacity pulse (and at most a tiny translate) of the water/highlight layer; trees sway by a fraction of a degree around their anchor (the point where the trunk meets the ground) with staggered, slightly different periods so the island does not move in lockstep. One shared gate decides whether ambient motion runs: `useAmbientMotion()` (focused + active + not reduced). When it stops, every ambient value returns to its rest pose; when it starts again, the motion resumes without a jump.
- **Coexistence with Phase 10.** The unlock reveal (pop, crossfade, quiet fades) keeps working on the same layers: compose the transforms (for example a nested view for sway inside the reveal box) so a popping tree does not fight its sway, and a layer starts swaying only after its reveal ends. Stage changes, removals (stage 8 house) and settling after background must still end on the committed stage. The banner, count-up and bar are unchanged.
- **Kill switches.** One flag turns ambient motion off entirely (static Island) and one per effect (clouds, water, trees), in one place in code, so Phase 21 can compare on/off and the release can ship without the effect if it fails. The Home empty-state Island may use the same ambient driver behind the same gate, or stay with its Phase 10 float; record the choice.
- **Development tool.** The World inspector (`/dev-world`) gets ambient on/off and per-effect toggles for review and for Phase 21 measurement builds.
- **Skia.** Not planned (D86). Only if the water shimmer cannot look acceptable with layers and opacity, record the measured gap and ask the owner before adding it (`npx expo install`, development rebuild, D09).

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `assets/worlds/island/scripts/ export of cloud, water and (only if needed) canopy layers; re-export and verify`
- `assets/themes/island/ copied re-export; src/features/worlds/themes/island-assets.ts static map`
- `src/features/worlds/manifest.ts and theme-export.ts ambient layer marks and validation`
- `src/features/worlds/ ambient driver inside WorldScene; feature flags`
- `src/dev/world-inspector.tsx ambient toggles`
- `tests/unit and tests/integration ambient contract, gating and reveal coexistence`
- `docs/evidence/PHASE_10_5.md simulator recordings, art verification and the owner's approval`

## Technical requirements

- Animation is presentation only: no data writes, no eligibility logic, no timers that refresh data. The committed stage stays the only source of what is drawn.
- UI-thread Reanimated animations (`withRepeat`, `withTiming`, `withSequence`) on transform and opacity; no per-frame React renders, no `setInterval`, no JS frame limiter. Cancel every ambient animation when the gate closes and on unmount.
- No ambient motion off Home (History, sheets covering Home, other tabs), in the background, in the app switcher, under Reduce Motion, or in any list of worlds (Collection, Phase 11).
- Decorative only: nothing new for VoiceOver; the scene keeps its one labelled image with the stage description.
- Memory: the extra layers must keep the ASSET_SPEC budget (about 32 MiB decoded for one world). Record the decoded estimate of the new layers.
- Static Island fallback must stay visually identical to the approved renders when ambient motion is off.

## Acceptance criteria

- The re-exported Island reproduces all eleven approved renders when stacked with ambient motion off (verification script and an app screenshot comparison as in Phase 09), with provenance updated.
- On the simulator, Home shows drifting clouds, a soft water shimmer and gently swaying trees that the owner approves; the motion stops on leaving Home, in the background and under Reduce Motion, and resumes cleanly.
- A deposit that crosses a threshold still plays the Phase 10 unlock moment correctly with ambient motion on, and the scene ends on the committed stage after rapid changes and backgrounding.
- The global and per-effect switches work and the static Island looks exactly like Phase 10.
- Standard checks pass; the new behavior has deterministic tests (gate on/off, rest pose, flags, manifest validation, reveal coexistence).

## Tests and verification

- Run lint, typecheck, `npm test -- --runInBand` and the release export (no inspector code; the new Island PNGs present).
- Blender verification (`verify_stages.py`, stacking comparison) and an app-vs-render comparison at stage 0, 4, 8 and 10 with ambient off.
- Simulator recordings on Home (ambient on, a threshold-crossing deposit with ambient on, leaving Home and returning, background/resume, Reduce Motion), and a quick look on the SE and the Duo open.
- Performance is not decided on the simulator. Phase 21 measures energy, memory and smoothness with ambient on vs off on a physical iPhone with Xcode Instruments (D90); this phase only proves correct starting and stopping.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES. The owner's approval of the re-exported art and of the motion is mandatory; without it the phase stays IN PROGRESS. The physical-iPhone measurement is a Phase 21 gate (D90), not part of this phase.

## Out of scope

- Souvenirs, Finish/Reopen and Collection (Phase 11), Garden art and ambient motion for Garden (Phase 17), new objects, particles, weather, day/night, sounds, a physics engine, Skia without an owner decision, and the physical-iPhone performance measurement (Phase 21).

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. If a command or tool cannot run, record NOT RUN with the exact reason and next action. A mocked native API does not prove device performance.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, device/OS, files changed, art verification, recordings, the owner's approval and unresolved limitations. Update `docs/DECISIONS.md` for significant choices (ambient manifest marks, flags, whether canopies were exported, the empty-state choice), and update ASSET_SPEC, DESIGN_SYSTEM, ARCHITECTURE and the Phase 21 prompt if the measurement plan changes. Preserve old evidence.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and the owner's approval are recorded. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation.

Finish by reporting: concrete behavior implemented, changed modules and art, checks and results, remaining work/blockers, documentation updated and the exact next prompt file.

Evidence path: `docs/evidence/PHASE_10_5.md` (create it during implementation).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_10_5.md`. If verified complete, the next prompt is `docs/prompts/PHASE_11.md`.
