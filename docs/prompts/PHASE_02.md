# Implement Phase 02 Palette design tokens and global native styling

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, the phase-specific documents below and its canonical roadmap entry. For any UI work, also read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; reuse their tokens/primitives and layout policy. For native, dependency, persistence or delivery changes, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies, entry audit history or goal deletion. Read the compatible setup/layout and EAS/OTA source records for engineering only. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/DESIGN_SYSTEM.md`, `docs/UI_UX_GUIDELINES.md`, `docs/TECH_STACK.md`, `docs/ADAPTIVE_LAYOUT.md`, `docs/TEST_PLAN.md` and the Phase 02 entry in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Choose and establish the app palette, shared style tokens and accessible native UI primitives before building product feature screens.

## Dependencies and decision gates

Phase 01. Verify the actual locked project and native build; do not assume the packages or navigation were created correctly.

None beyond verified dependencies.

## Exact scope

- Read DESIGN_SYSTEM and select/refine its recommended warm neutral/forest palette. Record final semantic color values and actual contrast pairs. This is the product palette, not a user-facing Pro color-customization feature.
- Create one typed token module for colors, spacing, text roles, radii, borders, elevation, motion and readable content constraints. Use platform fonts and Dynamic Type; do not introduce scale(screenWidth) or new device-size classifications.
- Create or refine shared AppText, Button, TextField, Card, AmountText display styling and feedback primitives using StyleSheet and resolved tokens. Keep amount parsing/calculation out of this phase; Phase 04 owns it.
- Integrate tokens/primitives into existing shell screens and supported native navigation tint/surface APIs. Explicitly configure the supported launch appearance; do not add a dark-mode toggle or claim untested appearance support.
- Build a development/test-only component gallery showing normal, pressed, loading, disabled, error and focus variants plus long labels and large text. Exclude its route from the distribution build.
- Document conventions for semantic color usage, purposeful component variants, local StyleSheet composition and adding tokens only for real repeated needs. Leave global window/safe-area adaptation to Phase 03.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `src/shared/theme/ palette, typed tokens and app theme access`
- `src/shared/ui/ shared native controls, text and feedback`
- `src/app/ existing shell screens and native appearance configuration`
- `development/test-only component gallery excluded from release routes`
- `tests/integration/ meaningful shared-control behavior checks`
- `docs/DESIGN_SYSTEM.md final chosen palette and evidence/PHASE_02.md`

## Technical requirements

- Use React Native StyleSheet and typed tokens; no web CSS, NativeWind/Tailwind or second styling engine without demonstrated need.
- Keep raw color constants centralized. Typography scales with user text preferences, touch areas remain usable, and labels/errors convey meaning beyond color.
- Normal text targets 4.5:1 contrast; large text/necessary graphical controls target 3:1. Recalculate final foreground/background pairs, including transparent and interactive states.
- App palette semantics are independent of Island/Garden. No user color picker, decoration editor or paid accessibility setting.

## Acceptance criteria

- A documented palette/token source drives shell screens and native surface/tint configuration without copied hex values in feature UI.
- Shared controls expose consistent loading/disabled/error/accessibility behavior; long text and large text remain readable on small and large iPhones.
- Final contrast checks pass for required combinations; decorative colors are not reused as inaccessible financial labels.
- Component gallery is available only in development/test, and the chosen StyleSheet convention plus launch appearance is documented.

## Tests and verification

- Calculate contrast for every required text/control pair and record results separately from visual/device checks.
- Run meaningful component interactions for disabled/loading buttons, labelled fields and error feedback, plus standard lint/TypeScript/tests.
- Review ordinary iPhone simulator shells/gallery with default and large text and both OS appearance preferences; verify the app's configured launch appearance remains legible.
- Inspect source for duplicate palette constants, disabled font scaling and screen-ratio scaling helpers.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Adaptive layout/Duo integration (Phase 03), money parsing/business calculations, financial forms, production scene assets, full dark-mode product scope and user color customization.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. Phase 01 establishes those scripts; later phases inspect and use the real scripts rather than replacing them with no-ops. If a command or tool cannot run, record NOT RUN with the exact reason and next action. A mocked native API does not prove SQLite, StoreKit, notification delivery or device performance.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, build/device/OS, files changed, dependency verification, manual checks and unresolved limitations. Update `docs/DECISIONS.md` for significant choices (or explicitly state none changed), and update any affected requirements, architecture, schema, roadmap or prompts in the same change. Preserve old evidence rather than rewriting a failed test as passed.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and dependency is verified. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation. Code complete with a pending required device check is not verified complete.

Finish by reporting: concrete behavior implemented, changed modules, checks and results, remaining work/blockers, documentation updated and the exact next prompt file. Do not claim the app is built, submitted or live unless the corresponding operation actually occurred.

Evidence path: `docs/evidence/PHASE_02.md` (create it during implementation; the planning baseline intentionally has no test evidence for this phase).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_02.md`. If verified complete, the next prompt is `docs/prompts/PHASE_03.md`.
