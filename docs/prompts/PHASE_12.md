# Implement Phase 12 Three fixed challenge rules and attempt engine

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, the phase-specific documents below and its canonical roadmap entry. For any UI work, also read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; reuse their tokens/primitives and layout policy. For native, dependency, persistence or delivery changes, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies or entry audit history. Owner decision D74 (DECISIONS) overrides v1.2 on goals: Archive and Close goal are removed (statuses active, paused, completed), any goal can be deleted after a native confirmation (goal, entries and souvenir; no undo), Free may have one goal in total in any status, and loss of Pro keeps one chosen goal usable and the others read-only. Do not restore Archive or the old no-deletion rule. Read the compatible setup/layout and EAS/OTA source records for engineering only. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/TECH_STACK.md`, `docs/TEST_PLAN.md` and the Phase 12 entry in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Implement the exact v1.2 fixed challenge catalog and durable attempt/result rules shared by Free and Pro.

## Dependencies and decision gates

Phase 11; verify shared ledger/target mutation transaction and pure calendar helpers.

Q04 is resolved. No custom schedule, evidence-link choice or owner confirmation is required.

## Exact scope

- Persist attempts using DATA_MODEL fields: ruleId, frozen targetMinor where relevant, startedAt, startDate, optional periodEndDate, saved periodTimezone and historical marker/result. Enforce at most one unfinished attempt per goal.
- First step: once per goal, one eligible positive deposit after start, no deadline. Next milestone: only B<T; threshold=ceil(T*(floor(10*B/T)+1)/10), frozen target=threshold-B.
- Weekly step: unexpired goal deadline and remaining>0; freeze v1.2 weekly estimate on start. At most once per goal/calendar week, Monday-Sunday in timezone at start. Starting midweek still ends Sunday with unchanged target; travel never moves the saved period.
- Count records with immutable createdAt>startedAt and entry date from startDate through saved period end if any. New records created after an ended week cannot retroactively finish it; corrections to existing corresponding records may change results.
- Next/Weekly progress=max(0,sum eligible signed amounts); First checks positive deposit. Recalculate on correction/deletion/withdrawal. Goal target/deadline changes do not rewrite the started target/period.
- Completed/Not completed/Skipped remain historical; expiry of an unsuccessful weekly period gives Not completed. Corrected historical results never reactivate, take the current slot or repeat notification. Skip preserves history. Engine never creates, links/copies or duplicates a transaction; shared Add savings is UI integration in 13.
- `challenge_attempts.goal_id` references goals, so extend the D74 `deleteGoal` command (`src/features/goals/application/goal-commands.ts`) to delete the goal's attempts in the same exclusive transaction before the goal row, with a native scenario next to G07.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse equivalent existing modules after inspection; document mappings and do not create duplicates.

- `src/features/challenges/domain/ three fixed rules and eligibility`
- `src/features/challenges/application/ start skip and result recalculation`
- `src/data/db/ challenge_attempts migration and repositories`
- `src/features/ledger/ atomic result invalidation/recalculation`
- `tests/unit/ and tests/native/ attempt fixtures`

## Technical requirements

- No custom definition/form, schedule versions, editable target/frequency, challenge pause, evidence links or challenge reminder.
- Amounts use global minor units; calendar logic uses saved timezone/period.
- Historical marker is independent of corrected Completed/Not completed result; never return it to active automatically.
- Expose a typed attempt view for Phase 13's quest cards (rule, availability and its reason, frozen target, eligible progress, saved period, historical result and, for Next milestone, the milestone it aims at), so the UI presents quests without recomputing rules (owner design direction D97).

## Acceptance criteria

- Exact three rules work offline, First step cannot start twice and only one unfinished attempt exists per goal.
- Weekly boundary/midweek/timezone/late-created-backdated cases match the stored contract.
- Home-originated eligible records count automatically once; withdrawals/corrections/deletions update results without new money or historical reactivation.

## Tests and verification

- Independent First/Next/Weekly targets including tiny money thresholds and frozen target after goal edit.
- Sunday/Monday, midweek, DST, timezone travel, strict createdAt/startDate filters and record created after period end.
- Native atomic rollback/retry, competing start requests, skip, completed->not-completed historical correction while another attempt is active; standard checks.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Custom/advanced challenges, challenge-specific transaction booking, pause/editable schedules, XP/rewards, notifications and challenge UI.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. Phase 01 establishes those scripts; later phases inspect and use the real scripts rather than replacing them with no-ops. If a command or tool cannot run, record NOT RUN with the exact reason and next action. A mocked native API does not prove SQLite, StoreKit, notification delivery or device performance.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, build/device/OS, files changed, dependency verification, manual checks and unresolved limitations. Update `docs/DECISIONS.md` for significant choices (or explicitly state none changed), and update any affected requirements, architecture, schema, roadmap or prompts in the same change. Preserve old evidence rather than rewriting a failed test as passed.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and dependency is verified. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation. Code complete with a pending required device check is not verified complete.

Finish by reporting: concrete behavior implemented, changed modules, checks and results, remaining work/blockers, documentation updated and the exact next prompt file. Do not claim the app is built, submitted or live unless the corresponding operation actually occurred.

Evidence path: `docs/evidence/PHASE_12.md` (create it during implementation; the planning baseline intentionally has no test evidence for this phase).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_12.md`. If verified complete, the next prompt is `docs/prompts/PHASE_13.md`.
