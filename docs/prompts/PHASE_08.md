# Implement Phase 08 Free dashboard and deadline estimates

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, the phase-specific documents below and its canonical roadmap entry. For any UI work, also read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; reuse their tokens/primitives and layout policy. For native, dependency, persistence or delivery changes, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies, entry audit history or goal deletion. Read the compatible setup/layout and EAS/OTA source records for engineering only. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/TECH_STACK.md`, `docs/TEST_PLAN.md` and the Phase 08 entry in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Complete the financial dashboard and understandable weekly/monthly deadline guidance.

## Dependencies and decision gates

Phase 07

None beyond verified dependencies.

## Exact scope

- Show current saved, target, remaining amount and numerical percentage directly from ledger queries.
- Integrate optional deadline weekly/monthly suggestions using v1.2 inclusive-day D and the exact formulas in DATA_MODEL (remaining 100.00,D=30 => weekly 23.34/monthly 100.00). Display the calculation explanation and no-deadline/overdue/complete states.
- Recalculate after deposits, withdrawals, corrections, target/deadline edits and foreground civil-date changes.
- Show overfunding numerically without increasing scene unlocks beyond ten; leave a correctly sized world region ready for Phase 09.
- Keep history and Add savings/Withdraw actions visible and accessible on small screens and large text.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `src/features/goals/ Home dashboard view models and UI`
- `src/core/calendar/ estimate integration`
- `src/shared/ui/ amount and progress components`
- `src/shared/i18n/ deadline and overdue strings`
- `dashboard and clock-boundary tests`

## Technical requirements

- Compose Home through the Phase 03 shared scene/control layout; numerical actions and estimates must remain readable on Duo, short windows and large text.

- All metrics in this phase are Free, including deadline estimates.
- No timers repeatedly recompute the entire ledger; use explicit invalidation and foreground/date reconciliation.
- All amounts use the global currency; no infinite estimate, contribution-calendar formula or false 100% rounding.

## Acceptance criteria

- Dashboard matches ledger values in zero, partial, exactly complete and overfunded cases.
- Changing deadline/clock updates both alternative pace estimates; deadline today gives remaining for both, expired incomplete gives Overdue, remaining zero has no Overdue, no deadline has no estimates.
- Small and large iPhones retain readable financial actions at increased text size.

## Tests and verification

- Fake-clock tests for today, week/month boundaries, overdue and app foreground after midnight.
- Interaction tests for financial edits refreshing metrics and recovery from query errors.
- Simulator/device walkthrough with alternate number locale and standard checks.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- World art/animation, Pro statistics, advanced projections and automatic transfers.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. Phase 01 establishes those scripts; later phases inspect and use the real scripts rather than replacing them with no-ops. If a command or tool cannot run, record NOT RUN with the exact reason and next action. A mocked native API does not prove SQLite, StoreKit, notification delivery or device performance.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, build/device/OS, files changed, dependency verification, manual checks and unresolved limitations. Update `docs/DECISIONS.md` for significant choices (or explicitly state none changed), and update any affected requirements, architecture, schema, roadmap or prompts in the same change. Preserve old evidence rather than rewriting a failed test as passed.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and dependency is verified. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation. Code complete with a pending required device check is not verified complete.

Finish by reporting: concrete behavior implemented, changed modules, checks and results, remaining work/blockers, documentation updated and the exact next prompt file. Do not claim the app is built, submitted or live unless the corresponding operation actually occurred.

Evidence path: `docs/evidence/PHASE_08.md` (create it during implementation; the planning baseline intentionally has no test evidence for this phase).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_08.md`. If verified complete, the next prompt is `docs/prompts/PHASE_09.md`.
