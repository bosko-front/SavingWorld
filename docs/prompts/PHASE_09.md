# Implement Phase 09 Island theme assets and static world renderer

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, the phase-specific documents below and its canonical roadmap entry. For any UI work, also read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; reuse their tokens/primitives and layout policy. For native, dependency, persistence or delivery changes, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies or entry audit history. Owner decision D74 (DECISIONS) overrides v1.2 on goals: Archive and Close goal are removed (statuses active, paused, completed), any goal can be deleted after a native confirmation (goal, entries and souvenir; no undo), Free may have one goal in total in any status, and loss of Pro keeps one chosen goal usable and the others read-only. Do not restore Archive or the old no-deletion rule. Read the compatible setup/layout and EAS/OTA source records for engineering only. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/ASSET_SPEC.md`, `docs/UI_UX_GUIDELINES.md`, `docs/TEST_PLAN.md` and the Phase 09 entry in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Build the reusable scene renderer and the complete Free Island composition.

## Dependencies and decision gates

Phase 08

Approved Island artwork and ownership/license provenance are required for visual completion.

## Exact scope

- Implement the static manifest contract from ASSET_SPEC using local static module references, coordinates, z-order and explicit replacement rules.
- Integrate approved Island base and all ten milestone outcomes: tree, path, flowers/bushes, house, bridge, pond, trees, larger house/details, final decorations, completed island.
- Render the exact current stage computed by the shared financial engine, including empty base and 100% cap.
- Implement accessible scene/next-stage descriptions and a scene-only error fallback that keeps financial tracking usable.
- Render the scene in Home's scene region as approved in Phase 07.5 (DECISIONS D64, DESIGN_SYSTEM "Visual direction"): a rounded (`radii.xl`) 4:3 box measured with `useMeasuredSize`/`fitAspect`, replacing the temporary inside of `src/features/worlds/world-scene.tsx` (Phase 08 `WorldScene`: keep its `themeId`/`stage` props, `WORLD_SCENE_ASPECT` and accessibility label contract); supply the stage name used by Home's next-milestone callout from the manifest (Phase 08 shows "Next milestone: 30%" until then, D71). Also render the stage-0 Island as the illustration of Home's empty state (no goal yet), so Phase 10 can animate it (D69).
- Validate asset alignment and decoded memory on an iPhone; keep development scene inspection controls out of release flows.
- **Art input (D76, 24 October 2026).** The Island art comes from the reproducible Blender workspace `assets/worlds/island/` (its README: rebuild/render commands, stage-to-collection map, provenance). Use its layered export: a base layer (stage 0) plus one cropped transparent layer per milestone with its position in the 2048×1536 master frame and an anchor point (where the object meets the ground), and the stage names from the collection labels ("First tree", "Path", ...). Stacking the base and layers 1..n in order reproduces stage n exactly; the stage 8 layer already covers the small house, and the manifest still declares the replacement explicitly (hide the stage 4 house from stage 8 on). Copy the export into `assets/themes/island/`; never paint over or hand-edit the images: a defect is fixed in the Blender scripts and re-exported. Choose one app resolution with a device measurement (suggestion: 1536×1152 for the largest scene region, Duo open, within the ASSET_SPEC memory budget). The renders are transparent: choose the scene box background (the preview cream or a soft sky gradient) as part of the Home review. Provenance and approval are recorded in D76 and the workspace README; Phase 09 evidence references them.
- **World first (owner direction D73, 23 October 2026).** Saving Worlds must feel like a small game, not a classic finance app: the person sees their world first and the numbers second. The real Island is the visual star of Home, not a card with an icon and text. Within the scene region give it the most visual weight the layout allows: no caption or icon inside the world, art filling the rounded box (or a frameless edge-to-edge treatment if it reads better), and the numbers below as supporting information. Changing the stacked-scene cap (40%, D70) or the composition belongs in `src/shared/layout/`/Home with owner review on the SE and a large iPhone, keeping "+ Add savings" visible.
- **Home review after the Island arrives (D73).** Once the real Island renders, review Home with the owner on the device matrix before Phase 10 finishes: expect even less text and fewer cards (for example a lighter next-milestone callout or deadline card). Do not polish the cards before the Island exists.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `src/features/worlds/ theme manifest types, registry, validation and WorldScene`
- `assets/themes/island/ approved production exports`
- `src/features/goals/ Home scene integration`
- `tests/unit/world manifest validation and stage scenarios`
- `docs/evidence/PHASE_09.md asset provenance and visual checks`

## Technical requirements

- Size the world against its measured local region through the shared layout; no physical-screen coordinate assumptions. Check Duo relayout without changing stage.

- One renderer, no Island-specific progression math, no full 3D engine.
- House replacement at stage 8 hides the stage 4 house correctly.
- All eleven states require real approved licensed art; temporary art cannot pass visual acceptance.

## Acceptance criteria

- All thresholds show the agreed coherent Island state with correct persistence/regression on reload.
- Missing assets/invalid manifest produce a controlled fallback, not ledger loss or an app crash.
- Asset provenance and first device memory/frame observations are recorded.

## Tests and verification

- Validate manifest thresholds, stable IDs, layer references and replacement sets.
- Review a contact sheet of all eleven states and test one minor unit below/at/above each threshold.
- Inspect small/large iPhone compositions, base-to-complete memory, VoiceOver descriptions and standard checks.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Animated transitions, Garden art, object placement/editor and Skia/Lottie without measured need.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. Phase 01 establishes those scripts; later phases inspect and use the real scripts rather than replacing them with no-ops. If a command or tool cannot run, record NOT RUN with the exact reason and next action. A mocked native API does not prove SQLite, StoreKit, notification delivery or device performance.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, build/device/OS, files changed, dependency verification, manual checks and unresolved limitations. Update `docs/DECISIONS.md` for significant choices (or explicitly state none changed), and update any affected requirements, architecture, schema, roadmap or prompts in the same change. Preserve old evidence rather than rewriting a failed test as passed.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and dependency is verified. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation. Code complete with a pending required device check is not verified complete.

Finish by reporting: concrete behavior implemented, changed modules, checks and results, remaining work/blockers, documentation updated and the exact next prompt file. Do not claim the app is built, submitted or live unless the corresponding operation actually occurred.

Evidence path: `docs/evidence/PHASE_09.md` (create it during implementation; the planning baseline intentionally has no test evidence for this phase).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_09.md`. If verified complete, the next prompt is `docs/prompts/PHASE_10.md`.
