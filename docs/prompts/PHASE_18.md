# Implement Phase 18 Four precise Pro savings statistics

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, the phase-specific documents below and its canonical roadmap entry. For any UI work, also read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; reuse their tokens/primitives and layout policy. For native, dependency, persistence or delivery changes, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies or entry audit history. Owner decision D74 (DECISIONS) overrides v1.2 on goals: Archive and Close goal are removed (statuses active, paused, completed), any goal can be deleted after a native confirmation (goal, entries and souvenir; no undo), Free may have one goal in total in any status, and loss of Pro keeps one chosen goal usable and the others read-only. Do not restore Archive or the old no-deletion rule. Read the compatible setup/layout and EAS/OTA source records for engineering only. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/TECH_STACK.md`, `docs/TEST_PLAN.md` and the Phase 18 entry in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Implement exactly four v1.2 Pro statistics using the one global currency and current ledger values.

## Dependencies and decision gates

Phase 17; verify lifecycle status/collectible distinction and current saved ledger queries.

Q06 is resolved by v1.2. Chart scope/range and completed count are fixed, not questions for the owner.

## Exact scope

- Show one current total across all existing goal balances (active, paused, completed); a deleted goal's entries are gone and no longer counted (D74); never add souvenir snapshots.
- Show gross deposits and withdrawals in the current local calendar month by saved entry date, separate from current net total.
- Build one all-goal daily-balance graph for today and the preceding 29 calendar dates. Carry in every valid earlier transaction as opening balance, then accumulate each displayed date across every existing goal. No selected-goal graph or currency selector.
- Count goals whose current status is completed, not the number of souvenirs. Reopen changes the count even though souvenirs remain; deleting a completed goal removes it from the count.
- Recalculate after transaction correction/deletion, goal status change and date/month rollover; provide clear empty/loading/error states, accessible chart text and Pro command/query entry guards.
- Present the four views as "your savings at a glance", not a finance dashboard (DESIGN_SYSTEM "World-first design direction" (owner decision D97)): the all-goal total as the headline, the month's deposits and withdrawals as a calm sentence or two small cards like the savings plan (D84), one soft line in the accent/green ramp with a text summary and data list, and the completed-goal count linked to Collection. No KPI grid, extra metrics or red/green trading colors.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse equivalent existing modules after inspection; document mappings and do not create duplicates.

- `src/features/statistics/ all-goal current total month and 30-day series`
- `src/data/repositories/ current-ledger/date/status aggregate queries`
- `src/shared/ui/ minimal SVG daily line and text alternative`
- `src/app/ one Pro Statistics screen`
- `independent unit/native aggregate and accessible UI fixtures`

## Technical requirements

- Use global currency and BigInt/checked aggregate presentation; no multi-currency grouping or FX.
- Include opening balance before the window and every existing goal's records in money totals/chart; a deleted goal contributes nothing.
- Use minimal SVG, no forecasting/analytics service or broad charting framework.

## Acceptance criteria

- All four views match independently computed fixtures; current-month gross values and 30 daily points have exact semantics.
- A goal with a souvenir but active/paused status is not counted as completed; explicit Finish changes the count.
- Backdated edit/deletion updates opening balance/month/series, and chart information remains accessible without graphics.

## Tests and verification

- Fixtures with several statuses, deposits/withdrawals, same-day ordering, before-window opening balance, missing-activity days and current-month boundary.
- Completed-count Finish/Reopen/Delete cases; souvenir remains unchanged on Reopen; a deleted goal's money and count disappear.
- Native repository comparisons, fake-clock local month/day changes, Pro denial, chart VoiceOver/container reflow and standard checks.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Per-goal chart, multiple currencies/FX, forecasts, advanced analytics, export, server telemetry and souvenir-money totals.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. Phase 01 establishes those scripts; later phases inspect and use the real scripts rather than replacing them with no-ops. If a command or tool cannot run, record NOT RUN with the exact reason and next action. A mocked native API does not prove SQLite, StoreKit, notification delivery or device performance.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, build/device/OS, files changed, dependency verification, manual checks and unresolved limitations. Update `docs/DECISIONS.md` for significant choices (or explicitly state none changed), and update any affected requirements, architecture, schema, roadmap or prompts in the same change. Preserve old evidence rather than rewriting a failed test as passed.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and dependency is verified. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation. Code complete with a pending required device check is not verified complete.

Finish by reporting: concrete behavior implemented, changed modules, checks and results, remaining work/blockers, documentation updated and the exact next prompt file. Do not claim the app is built, submitted or live unless the corresponding operation actually occurred.

Evidence path: `docs/evidence/PHASE_18.md` (create it during implementation; the planning baseline intentionally has no test evidence for this phase).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_18.md`. If verified complete, the next prompt is `docs/prompts/PHASE_19.md`.
