# Implement Phase 03 Global adaptive layout and iPhone Duo foundation

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, the phase-specific documents below and its canonical roadmap entry. For any UI work, also read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; reuse their tokens/primitives and layout policy. For native, dependency, persistence or delivery changes, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies, entry audit history or goal deletion. Read the compatible setup/layout and EAS/OTA source records for engineering only. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/ADAPTIVE_LAYOUT.md`, `docs/DESIGN_SYSTEM.md`, `docs/UI_UX_GUIDELINES.md`, `docs/TECH_STACK.md`, `docs/ARCHITECTURE.md`, `docs/TEST_PLAN.md` and the Phase 03 entry in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Establish reusable screen/container rules and verify a native adaptive layout foundation across ordinary iPhones and iPhone Duo before financial feature screens are implemented.

## Dependencies and decision gates

Phase 02. Verify Phase 01 native navigation/packages and Phase 02 tokens/components against code and evidence.

The selected latest stable Expo toolchain and Duo simulator must be available for required native baseline checks. A physical Duo/unavailable pose is tracked as a later device/release gate, not represented as a passing simulator check.

## Exact scope

- Implement shared Screen, FormScreen and ContentColumn behavior for all four safe-area edges, native navigator/scroll inset ownership, readable width, growing text and keyboard-safe scrolling.
- Use live application-window dimensions and nested onLayout measurements for local content sizing; keep geometry ephemeral. Do not use module-level physical-screen dimensions, per-device branches, a global scale function or a hard-coded fold coordinate.
- Implement the narrow AdaptiveGoalLayout primary-scene/secondary-controls contract using native environmental adaptation. Validate @expo/ui ArrangementView with RNHostView on supported iOS and an explicit usable fallback on older supported systems.
- Use development-only scene and controlled-input samples to prove region sizing, aspect ratio, side safe areas and short-window behavior. Keep the route/form draft above arrangement changes and preserve input, selection and navigation through resize/fold/rotation.
- Check native Stack/NativeTabs placement, supported orientations, native sheet/popover sizing and inner split-view left/right positions on the available Duo simulator. Include partial-fold/tabletop checks the native simulator actually supports; record any physical-device follow-up explicitly.
- Apply shared layout primitives to the current shell screens and write the adoption contract for later Home/forms/history/challenges/Collection/statistics/paywall screens. No financial calculation or mutation may depend on size or pose.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `src/shared/layout/ Screen, FormScreen, ContentColumn and layout metrics`
- `src/shared/layout/ AdaptiveGoalLayout and bounded native compatibility adapter`
- `src/app/ native route layouts and current shell adoption`
- `development/test-only resize and controlled-form samples`
- `tests/integration/ layout-state preservation and inset policy cases`
- `docs/ADAPTIVE_LAYOUT.md and evidence/PHASE_03.md native layout matrix`

## Technical requirements

- Prefer native compact/regular adaptation and the system container; window measurement sizes content, not a device-specific breakpoint map. Keep one navigation tree and no forced fullscreen/portrait workaround.
- ArrangementView needs a runtime availability guard and explicit older-OS composition; verify locked package APIs. Hosted React Native content has one parent element per region and a tested sizing mode.
- Financial text and controls remain inside usable margins; decorative scene backgrounds may extend farther. Avoid double application of native and shared insets.
- No expo-hinge requirement, separate app per pose, experimental Router Split View or automatic money action on geometry changes. Keep state stable and accessible.

## Acceptance criteria

- Current shells and sample forms use shared layout primitives and stay usable on small/large iPhones, short windows, large text and keyboard presentation.
- Available native Duo outer/inner/rotation/split-view checks demonstrate correct side insets, native controls and local scene/control sizing without guessed device widths.
- A draft, selected sample goal and current route survive repeated arrangement/size changes with no submission or reset; older supported iOS has a verified fallback.
- Record native simulator/device/OS/pose evidence and any physical-only gaps. Do not claim complete Duo release coverage from generic resized screenshots.

## Tests and verification

- Run layout policy/interaction tests for asymmetric insets, content bounds, large text and state preservation plus standard checks.
- Use the actual iPhone Duo Xcode/Device Hub simulator and ordinary supported iPhone simulator. Verify outer/open, supported rotations, inner split view on both sides, keyboard and available partial-fold poses.
- Test the native ArrangementView/RNHostView combination and the fallback on an older supported OS; inspect measurements, scroll reachability and focus.
- Repeat resize while typing and switching navigation, confirming no remount-driven draft loss or accidental action. Track physical Duo/unavailable-pose checks for the release gate.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Financial/goal implementation (begins Phase 04), production scenes, hinge-driven effects, iPad launch, custom pose-specific features and claiming unperformed real-device support.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. Phase 01 establishes those scripts; later phases inspect and use the real scripts rather than replacing them with no-ops. If a command or tool cannot run, record NOT RUN with the exact reason and next action. A mocked native API does not prove SQLite, StoreKit, notification delivery or device performance.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, build/device/OS, files changed, dependency verification, manual checks and unresolved limitations. Update `docs/DECISIONS.md` for significant choices (or explicitly state none changed), and update any affected requirements, architecture, schema, roadmap or prompts in the same change. Preserve old evidence rather than rewriting a failed test as passed.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and dependency is verified. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation. Code complete with a pending required device check is not verified complete.

Finish by reporting: concrete behavior implemented, changed modules, checks and results, remaining work/blockers, documentation updated and the exact next prompt file. Do not claim the app is built, submitted or live unless the corresponding operation actually occurred.

Evidence path: `docs/evidence/PHASE_03.md` (create it during implementation; the planning baseline intentionally has no test evidence for this phase).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_03.md`. If verified complete, the next prompt is `docs/prompts/PHASE_04.md`.
