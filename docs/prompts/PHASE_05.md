# Implement Phase 05 SQLite migrations and ledger repositories

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, the phase-specific documents below and its canonical roadmap entry. For any UI work, also read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; reuse their tokens/primitives and layout policy. For native, dependency, persistence or delivery changes, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies, entry audit history or goal deletion. Read the compatible setup/layout and EAS/OTA source records for engineering only. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/TECH_STACK.md`, `docs/TEST_PLAN.md` and the Phase 05 entry in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Create durable transactional storage with safe migrations and idempotent financial commands.

## Dependencies and decision gates

Phase 04

None beyond verified dependencies.

## Exact scope

- Create migrations, goals with all four statuses, ledger_entries, minimal operation_receipts and typed global-currency settings tables only; no ledger audit/revision-history table. Later phases own completions, challenges, reminders and billing tables.
- Configure foreign keys/WAL and one serialized write path; use parameterized queries and explicit exclusive transaction handles.
- Implement repository reads and create/correct/confirmed-delete commands with stale-row checks, stable operation IDs, minimal replay receipts and exact recomputation. Enforce resolved v1.2 positive amounts, no future entry dates and nonnegative chronological subtotals under date/createdAt/id order; keep createdAt immutable on edit. No previous-entry snapshots.
- Add startup migration gating and a retryable storage failure screen; never wipe a failed database.
- Establish a real Expo SQLite test runner on iOS, expose a truthful test:db command/instructions and record machine-readable or concise scenario evidence. Jest native mocks are additional tests only.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `src/data/db/connection, migration runner and versioned migration files`
- `src/data/repositories/ goal and ledger adapters`
- `src/features/goals/application/ and src/features/ledger/application/ commands`
- `src/bootstrap/ database readiness and recovery state`
- `tests/integration/ and tests/native/database scenarios`

## Technical requirements

- Uniqueness and foreign keys defend the same invariants as commands.
- No cached balance or optimistic financial success before commit.
- Migration application and command side effects roll back together on failure. Future schema versions fail safely.

## Acceptance criteria

- Fresh install and repeated startup yield the expected schema without resetting data.
- Duplicate operation IDs do not duplicate a transaction, and payload mismatch/stale edits fail clearly. Current/chronological negative balances and future entry dates are rejected atomically without audit versions.
- A forced mid-write or migration error leaves the prior valid data intact.

## Tests and verification

- Run actual iOS SQLite scenarios for fresh setup, migration replay/failure, FK checks, restart persistence and rollback.
- Test concurrent deposits/corrections, stale rows and Unicode/SQL-special notes; reject a withdrawal before the first deposit and deletion of a deposit needed by a later withdrawal, even when another later deposit makes the final total positive.
- Run standard checks and document actual native runner/device result. A mocked-only result leaves this phase incomplete.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Financial forms, worlds, completions, challenges, notifications and purchases.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. Phase 01 establishes those scripts; later phases inspect and use the real scripts rather than replacing them with no-ops. If a command or tool cannot run, record NOT RUN with the exact reason and next action. A mocked native API does not prove SQLite, StoreKit, notification delivery or device performance.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, build/device/OS, files changed, dependency verification, manual checks and unresolved limitations. Update `docs/DECISIONS.md` for significant choices (or explicitly state none changed), and update any affected requirements, architecture, schema, roadmap or prompts in the same change. Preserve old evidence rather than rewriting a failed test as passed.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and dependency is verified. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation. Code complete with a pending required device check is not verified complete.

Finish by reporting: concrete behavior implemented, changed modules, checks and results, remaining work/blockers, documentation updated and the exact next prompt file. Do not claim the app is built, submitted or live unless the corresponding operation actually occurred.

Evidence path: `docs/evidence/PHASE_05.md` (create it during implementation; the planning baseline intentionally has no test evidence for this phase).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_05.md`. If verified complete, the next prompt is `docs/prompts/PHASE_06.md`.
