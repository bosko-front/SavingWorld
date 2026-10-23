# Implement Phase 11 Permanent souvenirs Finish Reopen and Collection

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, the phase-specific documents below and its canonical roadmap entry. For any UI work, also read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; reuse their tokens/primitives and layout policy. For native, dependency, persistence or delivery changes, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies, entry audit history or goal deletion. Read the compatible setup/layout and EAS/OTA source records for engineering only. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/TECH_STACK.md`, `docs/TEST_PLAN.md` and the Phase 11 entry in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Award one permanent world souvenir per goal independently of explicit Finish/Reopen lifecycle.

## Dependencies and decision gates

Phase 10; verify Phase 06 lifecycle and Phase 07 atomic ledger mutation boundary.

Q03 is resolved by v1.2. No retention/award reapproval or souvenir-deletion policy is needed.

## Exact scope

- Add collectibles with unique goal_id, theme_id, theme_version and earned_at timestamp. Award at the first saved transaction mutation or target edit yielding B>=T, atomically with the triggering mutation, including Free. Do not change goal status at threshold.
- Retain the souvenir permanently even after correcting an initial mistake, withdrawal, target/theme changes, Archive, Finish or Reopen. Re-crossing 100% or retrying a command never duplicates it; preserve referenced historical theme versions.
- Integrate explicit Finish action for open goals at >=100%: set completed, make read-only and release the Free slot. Reopen on completed/archived checks active+paused slot limit then sets active, enables edits and never auto-finishes even if already >=100%.
- Build Collection souvenir/detail and completed/archived goal views with clear historical/current captions. A live regressed scene and permanent completed souvenir may coexist. No goal/souvenir deletion.
- Ensure target/theme/ledger edits respect closed-goal guards and the global currency lock includes collectibles even if every transaction was deleted after Reopen.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse equivalent existing modules after inspection; document mappings and do not create duplicates.

- `src/data/db/ collectibles migration with unique goal_id`
- `src/data/repositories/ collectible and closed-goal queries`
- `src/features/collection/ cards/details`
- `src/features/goals/ Finish/Reopen UI and command integration`
- `src/features/ledger/ atomic award hook and native tests`

## Technical requirements

- Collectibles are historical metadata, never added to savings totals.
- Live scene uses current B/T; historical scene uses award theme/version.
- Retry/relaunch/correction cannot duplicate rewards or replay a first-award celebration.

## Acceptance criteria

- First saved100% gives one souvenir for Free while status stays active or paused until explicit Finish.
- Finish frees the slot; Reopen fails when another Free goal is open and otherwise stays active at100%.
- Reopen then correction100->10 regresses live scene while the souvenir persists; repeated Finish never adds another.

## Tests and verification

- Real SQLite failure between ledger/target and award rolls back both; unique goal_id plus separate-operation re-crossing tests.
- Native Finish/Reopen/closed edit/paused edit/global currency lock tests; count status-completed separately from souvenir count.
- Process termination and historical-manifest/Collection VoiceOver walkthrough; standard checks.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- XP/badges, public sharing, whole-goal or souvenir deletion, custom retention policies and multiple rewards per goal.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. Phase 01 establishes those scripts; later phases inspect and use the real scripts rather than replacing them with no-ops. If a command or tool cannot run, record NOT RUN with the exact reason and next action. A mocked native API does not prove SQLite, StoreKit, notification delivery or device performance.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, build/device/OS, files changed, dependency verification, manual checks and unresolved limitations. Update `docs/DECISIONS.md` for significant choices (or explicitly state none changed), and update any affected requirements, architecture, schema, roadmap or prompts in the same change. Preserve old evidence rather than rewriting a failed test as passed.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and dependency is verified. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation. Code complete with a pending required device check is not verified complete.

Finish by reporting: concrete behavior implemented, changed modules, checks and results, remaining work/blockers, documentation updated and the exact next prompt file. Do not claim the app is built, submitted or live unless the corresponding operation actually occurred.

Evidence path: `docs/evidence/PHASE_11.md` (create it during implementation; the planning baseline intentionally has no test evidence for this phase).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_11.md`. If verified complete, the next prompt is `docs/prompts/PHASE_12.md`.
