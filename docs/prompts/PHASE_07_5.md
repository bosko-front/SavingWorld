# Implement Phase 07.5 Visual direction and design review checkpoint

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, the phase-specific documents below and its canonical roadmap entry. This is a UI phase: read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md` and reuse their tokens, primitives and layout policy. For any native or dependency change, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies, entry audit history or goal deletion. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/DESIGN_SYSTEM.md`, `docs/UI_UX_GUIDELINES.md`, `docs/ADAPTIVE_LAYOUT.md` (adoption contract), `docs/ASSET_SPEC.md`, `docs/TEST_PLAN.md`, the Phase 08-11 roadmap entries (the screens this direction feeds) and the Phase 07.5 entry in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Before the Home dashboard is built, review the real screens that exist after Phase 07 and agree a visual direction with the owner, so that Phase 08 onward builds on a design the owner likes rather than on the plain Phase 02-03 shell. The owner asked for this checkpoint on 23 October 2026 (DECISIONS D49) because the shell looked basic.

## Dependencies and decision gates

Phase 07. Verify that the Phase 06 onboarding/goal forms and the Phase 07 transaction form and History exist and run, because they are the material being reviewed.

Owner approval of the visual direction is a gate: Phase 08 does not start until the owner has approved (or explicitly deferred) the direction in DECISIONS. Final licensed Island art is not required; it arrives in Phase 09.

## Exact scope

- Design review. Capture every current screen (onboarding/currency, Home shell, Create/Edit Goal, Add/Edit Transaction, History, Settings, Challenges/Collection shells, sheets, toasts, errors and empty states) on iPhone SE, a large iPhone and the iPhone Duo simulator (open and closed), at default and the largest accessibility text size. List concrete weaknesses: hierarchy, spacing rhythm, button stacks, duplicated native and in-content titles, empty and placeholder copy, section headers, row design, use of color and icons.
- Visual direction for Home (and the shared look of later screens). Produce two or three short options for the Home composition on `AdaptiveGoalLayout`: a prominent saved amount, a progress indicator, the scene region, the next milestone and one clear primary action with secondary actions grouped. Build them as development-only mocks with fixed sample values (in `src/dev/`, guarded like the gallery and layout lab) using a clearly temporary placeholder scene, never final or licensed art. Present screenshots to the owner and record the chosen option.
- Palette and typography refinement, only as far as the chosen direction needs: for example a warmer accent with a real (non-decorative) role, an amount/display text role, card softness, elevation and spacing rhythm. Every color change goes through `palette.ts`/`tokens.ts`, the contrast test and the DESIGN_SYSTEM tables. Keep one light appearance (D37).
- Polish fixes across the existing screens that the review found and that do not change behavior: remove duplicated titles, give each screen one primary action, group secondary actions, improve empty/placeholder states, align headers, rows and spacing with the shared primitives. Add or extend shared primitives (for example a section header, list row, progress indicator or button group) instead of per-screen styling.
- Write the outcome into `docs/DESIGN_SYSTEM.md` ("Visual direction"), with before/after screenshots in the evidence, and update the Phase 08-11 and 13 prompts/roadmap entries where the approved direction changes what they build.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `src/shared/theme/ palette and token refinements with contrast tests`
- `src/shared/ui/ new or refined shared primitives (section header, list row, progress, button group, display amount)`
- `src/dev/ development-only Home direction mocks reachable from Settings`
- `existing src/app and src/features screens: polish only, no behavior change`
- `docs/DESIGN_SYSTEM.md visual direction section and docs/evidence/PHASE_07_5.md before/after screenshots`

## Technical requirements

- No product behavior, financial calculation, persistence, navigation structure or capability rule changes. A design idea that needs new product behavior is recorded as a question for the owner, not implemented.
- Semantic tokens only; raw colors stay in `palette.ts`; ESLint guardrails stay on. Contrast targets from DESIGN_SYSTEM apply to every new pair, including any newly meaningful accent.
- Layout through `src/shared/layout/` and its adoption contract; Dynamic Type never capped; Reduce Motion respected for any added motion; icons only through the shared SF Symbols `Icon` from Phase 06.
- Mocks and placeholder art are development-only and absent from release bundles (release export check, as for the gallery and layout lab). No external or licensed art is committed without the owner's rights confirmation.
- New packages only if the chosen direction genuinely needs one, with `npx expo install`, a recorded decision and a development rebuild.

## Acceptance criteria

- A written review of the current screens with before screenshots on the device matrix, and the list of weaknesses found.
- The owner has chosen a Home direction from the presented options; the choice, rationale and any palette/typography change are recorded in DECISIONS and DESIGN_SYSTEM.
- Existing screens show the agreed polish (no duplicated titles, one primary action, grouped secondary actions, consistent headers/rows), with after screenshots at default and largest text on SE, a large iPhone and Duo open/closed, and no regression in keyboard, inset or state-preservation behavior.
- Contrast tests cover every new or changed color pair and pass; release export contains no mock code or placeholder art.
- Phase 08 (and any other affected prompt) names the approved Home composition.

## Tests and verification

- Run lint, typecheck, `npm test -- --runInBand` (including the contrast test and existing layout/navigation tests).
- Native screenshots on the device matrix before and after, default and largest text; Duo checks as in ADAPTIVE_LAYOUT (Device Hub automation notes there).
- Release export string check for mock/development code.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES. Owner approval of the direction is mandatory; without it the phase stays IN PROGRESS.

## Out of scope

- The Home dashboard's real data and estimates (Phase 08), final Island/Garden art and scene renderer (Phases 09/17), animations and milestone feedback (Phase 10), dark mode, user-facing color customization, new product features and new navigation destinations.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. If a command or tool cannot run, record NOT RUN with the exact reason and next action.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, device/OS, files changed, screenshots, the owner's choice and unresolved limitations. Update `docs/DECISIONS.md` for the approved direction and any palette/typography change, and update affected prompts/roadmap in the same change. Preserve old evidence.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and the owner's approval are recorded. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation.

Finish by reporting: the review findings, the chosen direction, changed modules, checks and results, remaining work/blockers, documentation updated and the exact next prompt file.

Evidence path: `docs/evidence/PHASE_07_5.md` (create it during implementation).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_07_5.md`. If verified complete, the next prompt is `docs/prompts/PHASE_08.md`.
