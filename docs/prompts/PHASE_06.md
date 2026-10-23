# Implement Phase 06 Goal forms global currency and lifecycle

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, the phase-specific documents below and its canonical roadmap entry. For any UI work, also read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; reuse their tokens/primitives and layout policy. For native, dependency, persistence or delivery changes, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies, entry audit history or goal deletion. Read the compatible setup/layout and EAS/OTA source records for engineering only. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/TECH_STACK.md`, `docs/TEST_PLAN.md` and the Phase 06 entry in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Implement onboarding/global currency and the explicit open/closed goal lifecycle with Free slot enforcement.

## Dependencies and decision gates

Phase 05; inspect the real schema/commands and Phase 02/03 shared UI/layout.

Q01/Q02 are resolved by v1.2. No further owner choice is required for currency, lifecycle or Free limits. Finish/collectible UI integration is completed in Phase 11.

## Exact scope

- Add a short onboarding with one global currency choice. Settings is the only later currency editor; change allowed only with zero transactions and zero collectibles across the database. Empty goals inherit the new selection; explain no conversion and recheck lock atomically.
- Create/edit title, positive target, optional today/future deadline and available theme. Currency is read-only AppSettings information, never a goal field. Existing deadlines may expire naturally.
- Implement active/paused/completed/archived commands. Free counts active+paused<=1 for Create and Reopen, with completed/archived excluded; Pro capability contract permits unlimited open goals later.
- Pause/Resume and Archive preserve history. paused can edit/add transactions without resuming reminders. completed/archived are read-only until Reopen checks the slot and sets active; never automatically Finish at 100%. Define guarded Finish requiring B>=T for Phase 11 integration. No whole-goal deletion.
- Implement basic Home open-goal summary/selection and restart fallback. Keep Island-only selection until paid Garden integration; use shared accessible/adaptive controls.
- Set up the shared feedback layer from DESIGN_SYSTEM "Transient feedback (toasts)" and "UX library plan": install `sonner-native`, `react-native-svg` and `expo-symbols` with `npx expo install`; create `src/shared/ui/toast.tsx` (`showToast({ tone, title })` plus a `<Toaster />` host in the root layout) rendered with tokens/AppText, one toast at a time, VoiceOver announcement, Reduce Motion fade and top placement; add a gallery demo. Use it only for committed confirmations here (goal created/saved, paused, resumed, archived, reopened, currency changed); errors stay inline. Use `@expo/ui` Picker for the currency choice. Rebuild the development client for the new native modules.
- Create `src/shared/ui/icon.tsx` (expo-symbols `SymbolView` with the DESIGN_SYSTEM "Icons" semantic name map, token colors, size following text scale, hidden from VoiceOver by default) and replace the TextField warning glyph with the `error` icon. Use icons in toasts, Notice and goal lifecycle actions; no icon fonts, custom SVG icons or emoji.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse equivalent existing modules after inspection; document mappings and do not create duplicates.

- `src/features/goals/ forms and lifecycle commands`
- `src/features/settings/ global currency and onboarding`
- `src/app/ onboarding and goal route adapters`
- `src/core/access/ Free open-slot policy`
- `goal/currency/lifecycle repository and UI tests`
- `src/shared/ui/toast.tsx` shared toast wrapper, root-layout host and gallery demo
- `src/shared/ui/icon.tsx` shared SF Symbols icon component and semantic name map

## Technical requirements

- Use one serialized boundary for currency lock, ledger mutation and slot checks; no synthetic opening balance.
- Apply closed-goal guards to title/target/deadline/theme/transaction changes, not just UI buttons.
- No whole-goal deletion, per-goal currency, FX, custom challenge capability or new product decisions.

## Acceptance criteria

- Global currency and zero-balance goal survive restart; second goal never has its own currency picker.
- A paused goal consumes the Free slot; Archive frees it; Reopen at the limit fails and at >=100% remains active.
- Currency changes update empty goals without conversion, fail with any transaction or collectible, and unlock again only if neither exists.
- Committed goal/currency actions show one announced confirmation toast; failures show inline errors and keep input; no screen imports a toast library directly.

## Tests and verification

- Repository-backed Create/Reopen concurrent slot checks and closed/paused edit guards; confirm no goal-delete route.
- Currency fixtures: empty goals change globally, transaction blocks, deleting last transaction without collectible permits change, collectible alone blocks; use a boundary fixture before Phase 11 introduces real collectible storage.
- UI cancel/invalid target/deadline/write-error tests; native cold restart/selection and VoiceOver/keyboard walkthrough; standard checks.
- Carried from Phase 04 (evidence/PHASE_04.md): on a simulator dev build, observe the Hermes `Intl` output of `formatMoney` (EUR, JPY, KWD, IQD, including 9,999,999,999.99), `separatorsForLocale` for the device locale and `today(systemClock)` after changing the simulator time zone; Jest runs on Node ICU only.
- Carried from Phase 05 (evidence/PHASE_05.md, DECISIONS D52-D54): build on the existing data layer instead of parallel paths. `createGoal` (currency gate, Free slot, theme capability) already exists in `src/features/goals/application/goal-commands.ts`; add edit/lifecycle commands there on `updateGoalStatus`, and the Settings currency change on `writeCurrency`, each inside `executeCommand` with a stable operation ID and a receipt. Map every command error code to inline copy (title 1..100 characters). Re-run `npm run test:db` after adding commands that write.
- Toast wrapper tests (announcement called once, a new toast replaces the current one, no toast on failed write) and a simulator check with VoiceOver, Reduce Motion and the largest text size.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Transaction form/history (07), estimate presentation (08), collectible award and Finish UI (11), Garden/paywall/multi-goal Pro UI.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. Phase 01 establishes those scripts; later phases inspect and use the real scripts rather than replacing them with no-ops. If a command or tool cannot run, record NOT RUN with the exact reason and next action. A mocked native API does not prove SQLite, StoreKit, notification delivery or device performance.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, build/device/OS, files changed, dependency verification, manual checks and unresolved limitations. Update `docs/DECISIONS.md` for significant choices (or explicitly state none changed), and update any affected requirements, architecture, schema, roadmap or prompts in the same change. Preserve old evidence rather than rewriting a failed test as passed.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and dependency is verified. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation. Code complete with a pending required device check is not verified complete.

Finish by reporting: concrete behavior implemented, changed modules, checks and results, remaining work/blockers, documentation updated and the exact next prompt file. Do not claim the app is built, submitted or live unless the corresponding operation actually occurred.

Evidence path: `docs/evidence/PHASE_06.md` (create it during implementation; the planning baseline intentionally has no test evidence for this phase).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_06.md`. If verified complete, the next prompt is `docs/prompts/PHASE_07.md`.
