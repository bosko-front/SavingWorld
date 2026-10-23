# Implement Phase 07 Deposits withdrawals history and corrections

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, the phase-specific documents below and its canonical roadmap entry. For any UI work, also read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; reuse their tokens/primitives and layout policy. For native, dependency, persistence or delivery changes, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies, entry audit history or goal deletion. Read the compatible setup/layout and EAS/OTA source records for engineering only. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/TECH_STACK.md`, `docs/TEST_PLAN.md` and the Phase 07 entry in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Provide the complete Free ledger using saved current records and strict chronological validation.

## Dependencies and decision gates

Phase 06; verify global currency, lifecycle guards and Phase 05 real SQLite commands.

Q01/Q02 are final v1.2 rules, not approval gates.

## Exact scope

- Use one shared transaction form for Home and later Challenges: positive amount, deposit/withdrawal kind, local date default today and optional note. Reject future dates.
- Retain a stable operation ID across retries, disable repeated submissions and show success only after commit; failed writes preserve draft input.
- Implement current transaction History with edit and confirmed deletion. Overwrite corrected current values; do not keep ledger audit tables, old-entry snapshots or audit detail screens. Preserve immutable createdAt for ordering/eligibility.
- For every create/edit/delete, order the candidate goal history by date, createdAt, id and reject any negative subtotal or final balance. Correcting an amount/date/sign revalidates the entire affected sequence.
- Guard completed/archived as read-only until Reopen. paused remains editable without Resume. Invalidate balance, stage, estimates and later challenge/statistics queries after commit.
- Feedback per DESIGN_SYSTEM: after a committed create/edit/delete, show the Phase 06 `showToast` confirmation ("Deposit saved", "Withdrawal saved", "Entry updated", "Entry deleted") and a light success haptic; install `expo-haptics` with `npx expo install` and rebuild the development client. Deletion still needs a native confirmation first and has no Undo. Use the `@expo/ui` DatePicker for the entry date. Rejections and write failures stay inline with the draft preserved.
- Create `src/shared/ui/haptics.ts` with the four DESIGN_SYSTEM "Haptics" helpers. Call `success()` once after each committed create/edit/delete (with the toast) and `warning()` once per rejected submit (negative running balance, future date) alongside the inline explanation; also wire `warning()` into the Phase 06 Free-limit Create rejection. No haptic on press-in, navigation or failed I/O.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse equivalent existing modules after inspection; document mappings and do not create duplicates.

- `src/features/ledger/presentation/ shared form and current history`
- `src/features/ledger/application/ candidate-history validation`
- `src/app/ transaction/history route adapters`
- `src/features/goals/ query invalidation and lifecycle guards`
- `ledger UI/native persistence and failure tests`
- reuse of `src/shared/ui/toast.tsx` and a small shared haptics helper

## Technical requirements

- Use global Settings currency/exponent and shared exact parsers; no editable saved balance.
- Minimal retry receipts and stale-row revisions are technical safeguards, not previous-entry history.
- No challenge-specific booking command or automatic transaction on completion.

## Acceptance criteria

- Deposit50-withdraw20 yields30 after restart; withdrawal31 is rejected.
- Withdrawal dated before the first deposit and deletion of its funding deposit are rejected, including positive-final-total counterexamples.
- Edits/deletions apply once, stale/retried writes are safe, closed goals reject mutation and paused goals remain paused.
- Each committed financial write produces exactly one confirmation toast and haptic; a rejected or failed write produces none.

## Tests and verification

- Native DB scenarios for chronological order, equal-date createdAt/id ties, edit moving a withdrawal earlier, deleting funding entry, zero/future/overflow input.
- Kill after commit before acknowledgment, failed write/retry/double tap and stale form revision checks.
- History/form VoiceOver, keyboard and resize-preserved draft checks; standard checks.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Entry audit/history versions, whole-goal deletion, banks/transfers, animations, challenge engine and forecasting.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. Phase 01 establishes those scripts; later phases inspect and use the real scripts rather than replacing them with no-ops. If a command or tool cannot run, record NOT RUN with the exact reason and next action. A mocked native API does not prove SQLite, StoreKit, notification delivery or device performance.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, build/device/OS, files changed, dependency verification, manual checks and unresolved limitations. Update `docs/DECISIONS.md` for significant choices (or explicitly state none changed), and update any affected requirements, architecture, schema, roadmap or prompts in the same change. Preserve old evidence rather than rewriting a failed test as passed.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and dependency is verified. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation. Code complete with a pending required device check is not verified complete.

Finish by reporting: concrete behavior implemented, changed modules, checks and results, remaining work/blockers, documentation updated and the exact next prompt file. Do not claim the app is built, submitted or live unless the corresponding operation actually occurred.

Evidence path: `docs/evidence/PHASE_07.md` (create it during implementation; the planning baseline intentionally has no test evidence for this phase).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_07.md`. If verified complete, the next prompt is `docs/prompts/PHASE_08.md`.
