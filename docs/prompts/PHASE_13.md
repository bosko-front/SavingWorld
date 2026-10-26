# Implement Phase 13 Fixed challenge catalog and attempt UX

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, the phase-specific documents below and its canonical roadmap entry. For any UI work, also read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; reuse their tokens/primitives and layout policy. For native, dependency, persistence or delivery changes, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies or entry audit history. Owner decision D74 (DECISIONS) overrides v1.2 on goals: Archive and Close goal are removed (statuses active, paused, completed), any goal can be deleted after a native confirmation (goal, entries and souvenir; no undo), Free may have one goal in total in any status, and loss of Pro keeps one chosen goal usable and the others read-only. Do not restore Archive or the old no-deletion rule. Read the compatible setup/layout and EAS/OTA source records for engineering only. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/TECH_STACK.md`, `docs/TEST_PLAN.md` and the Phase 13 entry in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Expose the three fixed challenges, calculated progress and retained attempt history without a custom editor.

## Dependencies and decision gates

Phase 12; inspect the actual rule/eligibility engine and shared Phase 07 transaction form. Phase 12 provides `readChallengeBoard` (current attempt, the three offers with their availability reason and preview, history), `startChallenge`/`skipChallenge` and `completedAttemptId` on ledger results (DECISIONS D103); present them without recomputing a rule.

No unresolved product gate. Free and Pro use the identical catalog.

## Exact scope

- Build First step, Next milestone and Weekly step as a small set of **quest cards** for the selected open goal, not a task list (owner design direction D97, DESIGN_SYSTEM "World-first design direction" (owner decision D97)). Each card says what to do, how it helps the world (the Next milestone quest names the object it unlocks from the theme manifest, for example "Bring the Pond to your island") and its availability, frozen target/period and the one unfinished-attempt limit in plain words. Replace the Phase 07.5 Challenges `EmptyState` and follow the shared look (DESIGN_SYSTEM "Visual direction"): one primary action per screen, the shared `ProgressBar` and amounts for money-target progress, `ListGroup` rows for past attempts with `StatusBadge` for Completed (success) and Not completed/Skipped (neutral, never red or "failed").
- Empty and unavailable states (no open goal, goal paused or closed, nothing available this week) follow the D97 empty-state pattern: a world picture or tile, an encouraging sentence and the one next step. A completed attempt is celebrated once in its card (short one-shot motion within the D97 motion budget, off under Reduce Motion); no XP, points, streaks, levels or new money.
- Show current progress plus historical Completed/Not completed/Skipped attempts. Corrections may adjust a historical result without reactivating it or displacing the current attempt.
- Add savings opens the same Home transaction form and command with the same operation ID/retry behavior. Saving one eligible Home or Challenges entry updates money exactly once and recalculates progress automatically; no separate confirmation/evidence-link screen.
- Offer Skip without penalty/history loss; a new attempt selects an available fixed type. Do not offer pause/resume, amount/frequency editing, custom creation, challenge reminders or a custom-feature paywall.
- Keep goal Pause/Resume separate: paused goal can still edit/add without resuming the global reminder. Closed goals stay read-only until Reopen.
- Call `haptics.selection()` when choosing a challenge type in a custom control and `haptics.success()` when an attempt becomes Completed while its screen is visible; no haptic for Skip or Not completed.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse equivalent existing modules after inspection; document mappings and do not create duplicates.

- `src/features/challenges/presentation/ fixed catalog current/history detail`
- `src/app/ challenge route adapters`
- `src/shared/i18n/ fixed rule and attempt-result English strings`
- `shared transaction form navigation/query integration`
- `challenge UI and device journey tests`

## Technical requirements

- One ledger booking path; no automatic financial record on start, Skip or result.
- Free access to all three rules and history; no Pro challenge capability.
- Use shared tokens/layout and accessible progress/availability/error descriptions.

## Acceptance criteria

- Free user can start an available type, record from Home or Challenges, see calculated completion, Skip and inspect retained history offline.
- Weekly/once-only/active-limit unavailable states explain the actual reason.
- Cancelled/failed entry never marks a result complete; corrected historical attempt stays historical.

## Tests and verification

- Interactions for all three types, validation/availability, Skip/cancel/error/retry and absence of custom/pause/editor/paywall controls.
- Simulator screenshots of every card and empty/unavailable state at default and largest text, reviewed against the D97 checklist (no generic task-list look, no shaming wording or colors).
- Native device: start, Home deposit, restart, eligible withdrawal/date correction/deletion, historical result correction with a different current attempt.
- VoiceOver/text sizing/resize-preserved transaction draft and standard checks.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Custom/advanced challenge types, editable amounts/schedules, challenge pause/reminders, XP/levels and purchase implementation.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. Phase 01 establishes those scripts; later phases inspect and use the real scripts rather than replacing them with no-ops. If a command or tool cannot run, record NOT RUN with the exact reason and next action. A mocked native API does not prove SQLite, StoreKit, notification delivery or device performance.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, build/device/OS, files changed, dependency verification, manual checks and unresolved limitations. Update `docs/DECISIONS.md` for significant choices (or explicitly state none changed), and update any affected requirements, architecture, schema, roadmap or prompts in the same change. Preserve old evidence rather than rewriting a failed test as passed.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and dependency is verified. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation. Code complete with a pending required device check is not verified complete.

Finish by reporting: concrete behavior implemented, changed modules, checks and results, remaining work/blockers, documentation updated and the exact next prompt file. Do not claim the app is built, submitted or live unless the corresponding operation actually occurred.

Evidence path: `docs/evidence/PHASE_13.md` (create it during implementation; the planning baseline intentionally has no test evidence for this phase).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_13.md`. If verified complete, the next prompt is `docs/prompts/PHASE_14.md`.
