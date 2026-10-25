# Implement Phase 14 Global weekly local reminder

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, the phase-specific documents below and its canonical roadmap entry. For any UI work, also read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; reuse their tokens/primitives and layout policy. For native, dependency, persistence or delivery changes, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies or entry audit history. Owner decision D74 (DECISIONS) overrides v1.2 on goals: Archive and Close goal are removed (statuses active, paused, completed), any goal can be deleted after a native confirmation (goal, entries and souvenir; no undo), Free may have one goal in total in any status, and loss of Pro keeps one chosen goal usable and the others read-only. Do not restore Archive or the old no-deletion rule. Read the compatible setup/layout and EAS/OTA source records for engineering only. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/TECH_STACK.md`, `docs/TEST_PLAN.md` and the Phase 14 entry in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Implement one optional global Sunday 18:00 device-local reminder while an active goal exists.

## Dependencies and decision gates

Phase 13; verify goal statuses and durable settings.

The schedule is fixed by v1.2, not an open cadence decision.

## Exact scope

- Add the single weeklyReminderEnabled Settings switch, default opt-in off. Ask OS permission only after user enables it; handle denied/provisional/authorized without blocking savings.
- Persist global intent and reconcile a single logical weekly OS request for Sunday 18:00 device time. Schedule only if enabled, permitted and at least one goal status is active.
- Reconcile on launch/foreground, settings/permission/timezone and goal Pause/Resume/Finish/Reopen/Delete. paused/completed do not qualify; no active goal means no request. Editing a paused goal does not resume it.
- Cancel duplicates/orphans and recover interrupted scheduling after SQLite commit. Use generic text and a safe Home/current-active-goal notification-tap fallback.
- Use the actual local-notification adapter/config; no per-goal/per-challenge cadence/time/pause controls, push token/server or background-JavaScript assumption.
- Present the switch as one Settings row in the shared look (`reminder` tile, native switch) with a short, warm permission explanation; the notification text is generic and kind in the D97 voice (proposal V08: "Your world is ready for this week's savings.", pending owner approval), never an amount, title or guilt.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse equivalent existing modules after inspection; document mappings and do not create duplicates.

- `src/features/reminders/ global intent and native reconciliation`
- `src/data/db/ global notification request tracking`
- `src/features/settings/ single opt-in switch`
- `src/bootstrap/ foreground and notification response handling`
- `native scheduling/delivery and interaction evidence`

## Technical requirements

- OS scheduling happens after durable intent commit, never inside financial transaction.
- Sunday 18:00 uses current device local time; timezone/DST reconciliation preserves the one global schedule.
- No amounts/titles in default notification and no guaranteed OS delivery claim.

## Acceptance criteria

- Permission denial leaves ledger fully usable and offers a system Settings path.
- Exactly one desired global request with an active goal, none with only paused/completed goals or after the last active goal is deleted; repeat reconciliation never duplicates it.
- Real iPhone schedule/delivery/cancel/tap works for tested foreground/background/terminated scenarios with evidence.

## Tests and verification

- Adapter fixtures for zero/one/multiple active goals, opt-in/denial/failure, duplicate IDs and interrupted reconcile.
- Actual iPhone Sunday 18:00 trigger configuration and controlled delivery/cancel/tap checks, timezone/DST and cold start.
- Pause then edit/add remains paused with no reminder; Resume/Reopen active reconciles; standard checks.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Per-goal/per-challenge schedules, editable day/time, challenge pause/reminder, push services, background schedulers and financial-detail notification text.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. Phase 01 establishes those scripts; later phases inspect and use the real scripts rather than replacing them with no-ops. If a command or tool cannot run, record NOT RUN with the exact reason and next action. A mocked native API does not prove SQLite, StoreKit, notification delivery or device performance.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, build/device/OS, files changed, dependency verification, manual checks and unresolved limitations. Update `docs/DECISIONS.md` for significant choices (or explicitly state none changed), and update any affected requirements, architecture, schema, roadmap or prompts in the same change. Preserve old evidence rather than rewriting a failed test as passed.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and dependency is verified. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation. Code complete with a pending required device check is not verified complete.

Finish by reporting: concrete behavior implemented, changed modules, checks and results, remaining work/blockers, documentation updated and the exact next prompt file. Do not claim the app is built, submitted or live unless the corresponding operation actually occurred.

Evidence path: `docs/evidence/PHASE_14.md` (create it during implementation; the planning baseline intentionally has no test evidence for this phase).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_14.md`. If verified complete, the next prompt is `docs/prompts/PHASE_15.md`.
