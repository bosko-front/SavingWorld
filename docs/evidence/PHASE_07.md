# Phase 07 evidence: deposits, withdrawals, history and corrections

Session date: 23 October 2026. Phase state: **VERIFIED COMPLETE** (owner decision D63: the History/form VoiceOver walkthrough and the native rotation/fold draft check, which this session could not run, moved to the physical-device/Duo gate in Phases 19/21). Next prompt: [PHASE_07_5](../prompts/PHASE_07_5.md).

## Starting state and dependency evidence

- Read the full v1.2 DOCX (textutil) and README, PRODUCT_REQUIREMENTS, SOURCE_RECONCILIATION, DECISIONS, DEVELOPMENT_RULES, PROJECT_STATUS, SESSION_HANDOFF, ARCHITECTURE, DATA_MODEL, TECH_STACK, TEST_PLAN, DESIGN_SYSTEM, ADAPTIVE_LAYOUT, EAS_AND_OTA and the Phase 07 roadmap entry and prompt.
- Git: `main` at 75c5f78 (Phase 06 docs commit), clean working tree at start. Phase 07 is uncommitted.
- Baseline before changes: lint PASS, typecheck PASS, `npm test -- --runInBand` PASS (20 suites, 532 tests).
- Phase 05/06 dependencies verified in code: `createEntry`/`correctEntry`/`deleteEntry` (operation IDs, receipts, revision checks, candidate-history validation in date/createdAt/id order, closed-goal guard, confirmation flag), `validateCandidateHistory`, schema 1 triggers (no ledger change on completed/archived goals), `setGlobalCurrency` lock, lifecycle commands (paused stays editable), `useAppDataStore`/`refreshAppData`, `showToast`, `Icon`. The ledger application layer needed no change; Phase 07 reuses it (mapping below).

## Toolchain

- Expo SDK 58 (expo 58.0.17), React Native 0.88.0, React 19.3.0, Expo Router 58.0.25, Hermes. Node 22.16.0. Xcode 27.1.
- New dependency: `expo-haptics` ~58.0.7 via `npx expo install expo-haptics` (no config plugin). `npm audit` after the install: 5 high (all pre-existing transitive dev/tooling advisories; the Phase 06 record said 31 high, the count changed with the advisory database, not with this install).
- EAS project `@bosko123/saving-worlds`, profile `development-simulator`, channel `development`, environment `development`, runtime 1.0.0 (not yet shared, no version bump), schema 1 unchanged (no migration).
  - Build **a8045c3a-2238-4043-9983-f522e1f2fd0b** (`npm run eas -- build --platform ios --profile development-simulator --non-interactive --no-wait --message "Phase 07: expo-haptics for ledger feedback"`), uploaded from the uncommitted working tree on 75c5f78. Archive inspected: `SavingWorlds.debug.dylib` contains `HapticsModule`. Installed with `xcrun simctl install` on all three simulators; all native evidence below uses it.
- Simulators: SW iPhone SE 3 iOS 18.5 (66F6F9E8…), iPhone 17 Pro Max iOS 26.1 (CE4A7B1E…), SW iPhone Duo iOS 27.1 (E273F5F5…). Region Serbia, language English (en-US tag).
- Metro: an `expo start` on port 8081 for this project was already running when the session began (pid 46517, not started by this session); the native runs and the walkthrough used it and it was left running. A second Metro this session started briefly on 8082 (to regenerate typed routes) was stopped.

## Implementation

| Area | Files |
| --- | --- |
| Commands (reused, unchanged) | `src/features/ledger/application/ledger-commands.ts`, `src/features/ledger/domain/candidate-history.ts` (Phase 05). Expected path "application/ candidate-history validation" maps to these. |
| Queries | `ledger-queries.ts`: `readGoalLedger` (refactored), new `readEntryContext` (entry + its goal's ledger), `newestFirst` |
| Draft and copy | `src/features/ledger/presentation/entry-draft.ts` (`newEntryDraft`, `draftFromEntry`, `draftValues`), `ledger-copy.ts` (every ledger error code → inline message, rule-rejection flag, toast titles), `src/shared/i18n/amount-messages.ts` (amount parse copy shared with the goal form; `goal-copy.ts` delegates) |
| Shared form | `entry-form-screen.tsx` (create/edit, closed/missing/currency states, in-flight guard, delete confirmation), `entry-kind-picker.tsx` (@expo/ui segmented Picker), `entry-date-field.tsx` (@expo/ui DatePicker, range ends today, `labelsHidden`) |
| History | `history-screen.tsx` (newest first, empty state, closed read-only, `RowButton` inside `Link asChild`) |
| Routes | `src/app/entry-form.tsx` (root form sheet), `src/app/(tabs)/(home)/history.tsx`; registered in `src/app/_layout.tsx` and the Home stack layout |
| Home and lifecycle | `home-screen.tsx` Add savings (primary) and History (count) buttons; `goal-form-screen.tsx` and `use-goal-action.ts` call `haptics.warning()` on `open_goal_limit` (Create, Reopen) |
| Composition | `src/bootstrap/app-data.ts`: store `version`, `useCommittedRead`, `ledgerCommandDeps()` |
| Haptics | `src/shared/ui/haptics.ts`; ESLint single-owner rule for `expo-haptics` in `eslint.config.js`; Jest map in `package.json` |
| Tests | `tests/native/ledger-scenarios.ts` (L01-L08) in the native runner and Jest; R1/R2 restart pair extended; `tests/integration/ledger-ui.test.tsx` (14); `tests/unit/ledger-feedback.test.ts` (11); `tests/support/expo-haptics-fake.ts`; fixture resets haptics |

Decisions: D61 (ledger UI structure), D62 (haptics layer). No product decision changed.

## Checks

| Check | Environment | Result | Evidence / remaining action |
| --- | --- | --- | --- |
| `npm run lint` | host | PASS (exit 0) | After final edits |
| `npm run typecheck` | host | PASS (exit 0) | Typed routes regenerated by a Metro start |
| `npm test -- --runInBand` | host, Jest + node:sqlite | PASS: 22 suites, 565 tests | During development: History test failed once because two entries seeded in the same millisecond (frozen test clock) ordered by random id, which is the v1.2 rule working; seeds now use a 1 ms stepping clock. An unawaited double-press test leaked into later tests; rewritten as two presses inside one awaited act. Mutation check: removing the form's in-flight guard makes the double-tap test fail (second toast). |
| `npm run deps:check` | host | PASS ("Dependencies are up to date") | |
| `npm run doctor` | host | PASS 20/20 | |
| Release export `npx expo export --platform ios` | host | PASS | Hermes bytecode: scenario titles 0, `dbtest-report` 0, gallery "Text roles" 0; "Deposit saved"/"Entry deleted" present |
| `npm run test:db` | SE iOS 18.5, build a8045c3a | PASS 35/35 + restart 1/1 (runs rmvl7n4kva/b) | [report](phase-07/test-db-iphone-se-ios18.5.json) |
| `npm run test:db` | 17 Pro Max iOS 26.1, build a8045c3a | PASS 35/35 + restart 1/1 (runs rmvl7nc6ea/b) | [report](phase-07/test-db-iphone-17-pro-max-ios26.1.json) |
| `npm run test:db` | Duo iOS 27.1, build a8045c3a | PASS 35/35 + restart 1/1 (runs rmvl7nk5fa/b) | [report](phase-07/test-db-iphone-duo-ios27.1.json) |

TEST_PLAN coverage: T05 (L06, L07, UI double tap/failure/stale), T06 (L01-L04, S03-S05), T07 ledger part (L08, UI closed/paused), T19 partial (the app is offline-only; restart R1/R2), T23 partial (Jest window/text-size sequence; native text-size relayout; native rotation NOT RUN), T18 partial (largest text; VoiceOver NOT RUN).

## Native SQLite and command results (`npm run test:db`)

First run (before the T06 correction/deletion lines were added to L01): 35/35 + restart 1/1 on all three simulators. Final run after adding them, after all code edits: 35/35 + restart 1/1 on all three (L01 facts `{balanceMinor: 3000, afterCorrectionAndDelete: 6000}`, R2 `{pausedGoalBalanceMinor: 3000}`), real expo-sqlite, Hermes.

- L01 typed 50 − 20 = 30 survives closing and reopening the file, withdrawal 31 refused with nothing written, History order newest first; then T06: deposit corrected to 60 gives 40, confirmed delete of the withdrawal gives 60.
- L02 same-date order by createdAt then id; a correction keeps createdAt, so a deposit moved onto its withdrawal's date still counts first; one day later it dips on that date although the final total is 10 (refused, row unchanged).
- L03 moving a withdrawal before its funding is refused with a positive final total (60); moving it to the deposit date is allowed; sign flips revalidate; de-DE prefill `40,00` parses back exactly.
- L04 deleting the funding deposit is refused despite a final 60; delete needs confirmation; the v1.2 example (delete the only deposit while 20 is withdrawn) is refused; no audit/revision/history tables exist.
- L05 typed `0`, empty, sign, extra decimals, grouping errors, overflow (`10000000000.01`), de-DE and JPY rules; tomorrow refused on create and correction; 501-character note refused; per-goal balance ceiling refused one minor unit past 10^12.
- L06 commit then lost acknowledgment: after closing and reopening the database the same operation ID replays once for create, correct and delete; an edited draft under the same ID is a conflict.
- L07 injected failure before COMMIT writes nothing; retry plus a simultaneous second call with the same ID writes once; two forms opened at revision 1: the second save and a stale delete are refused, the first edit kept.
- L08 paused goal takes entries, corrections and deletions and stays paused with its row untouched; archived goal refuses create/correct/delete; Reopen makes it editable again.
- R1/R2 (real process restart by the runner): a paused goal with 50 − 20 typed through `draftValues`; the withdrawal's result is dropped before the app is terminated, and after relaunch the same operation ID replays (balance 30, one withdrawal), withdrawal 31 is refused and the goal is still paused.

## Manual native checks (build a8045c3a, iPhone 17 Pro Max iOS 26.1, global currency RWF (0 decimals), paused goal from the Phase 06 walkthrough)

| Check | Result | Screenshot |
| --- | --- | --- |
| Home shows Add savings (primary) and History; goal paused | PASS | [01](phase-07/01-home-add-savings-history.png) |
| Add savings sheet: paused note, native segmented type, number pad for RWF, native date defaulting to today | PASS | [02](phase-07/02-add-savings-form-paused-goal.png) |
| Deposit 50: sheet closes, "Deposit saved" toast, RWF 50, History (1), goal still paused | PASS | [03](phase-07/03-deposit-saved-toast-still-paused.png) |
| Withdrawal 3151 from 50: inline error with balance, red outline, field refocused, draft kept, no toast | PASS | [04](phase-07/04-withdrawal-over-balance-inline-error.png) |
| Withdrawal 20 saved with the keyboard open: RWF 30, History (2); app database holds exactly two entries despite repeated taps | PASS | (sqlite read of the app container) |
| History rows lost their card layout inside `Link asChild` (bug) | FAIL, then fixed (D61) | [05](phase-07/05-before-fix-history-row-style-dropped.png) |
| History newest first with signed amounts, words and icons | PASS | [06](phase-07/06-history-newest-first.png) |
| Delete: native destructive confirmation naming kind, amount and date, no Undo | PASS | [07](phase-07/07-delete-confirmation.png) |
| Deleting the funding deposit while the withdrawal remains: "Not deleted" inline; state kept through a Metro Fast Refresh | PASS | [08](phase-07/08-delete-funding-deposit-refused.png) |
| Native calendar: days after today and the next month are disabled | PASS | [09](phase-07/09-date-picker-no-future-dates.png) |
| Correction (deposit moved to Oct 20): "Entry updated" toast, History re-reads | PASS | [10](phase-07/10-entry-updated-toast.png) |
| Delete the withdrawal: "Entry deleted", RWF 50, 1 entry | PASS | [11](phase-07/11-entry-deleted-toast.png) |
| Cold restart (terminate + relaunch): RWF 50, History (1), still paused | PASS | [12](phase-07/12-after-cold-restart.png) |
| Largest text (accessibility XXXL): History wraps, nothing truncated | PASS | [13](phase-07/13-history-largest-text.png) |
| Largest text: SwiftUI's inline "Date" label pushed the date pill past the edge (bug) | FAIL, then fixed with `labelsHidden` | [14](phase-07/14-before-fix-date-label-overflow-largest-text.png), [15](phase-07/15-date-fits-largest-text.png) |
| Draft "777" kept through a native text-size change with the keyboard open; Save reachable above the keyboard | PASS | [16](phase-07/16-draft-kept-after-text-size-change-keyboard.png) |
| Native rotation / Duo fold with a draft in the entry form | **NOT RUN; moved to the physical-device/Duo gate (D63)** | DeviceHub exposed no windows or menus to the macOS Accessibility API this session and `simctl` has no rotation; Jest runs the Phase 03 window sequence (outer, inner, split, short landscape, largest text) on the real form and checks draft, kind, date, no write and one save. Needs Device Hub automation (ADAPTIVE_LAYOUT) or a manual rotate/fold. |
| VoiceOver walkthrough of the form and History | **NOT RUN; moved to the physical-device gate (D63)** | The iOS Simulator has no VoiceOver (as D60). Jest checks labels (`Amount (EUR)`, `Note (optional)`), row button role and spoken label ("Withdrawal, -€20.00, …"), and one queued announcement per toast. Needs a physical-device build or an owner decision like D60. |
| Felt haptics | NOT POSSIBLE in the simulator | No Taptic Engine; Jest proves one `success` per commit, one `warning` per rule rejection and none otherwise; the build contains `HapticsModule`. Physical-device check in Phase 19/21. |

Simulator settings restored afterwards (text size large). The Duo and SE app databases are not onboarded, so the UI walkthrough ran on the 17 Pro Max; the Duo and SE ran the native database suite.

## Acceptance criteria

| Criterion | Evidence |
| --- | --- |
| 50 − 20 = 30 after restart; withdrawal 31 rejected | L01 (reopen), R1/R2 (process restart), UI test, manual 03/04/12 |
| Withdrawal before the first deposit and deleting its funding deposit rejected, including positive-final-total counterexamples | L02, L03, L04, S04/S05, UI tests, manual 08 |
| Edits/deletions apply once; stale/retried writes safe; closed goals reject; paused stay paused | L06, L07, L08, R1/R2, UI stale/double-tap/failure/closed/paused tests, manual 03/12 |
| Exactly one toast and one haptic per committed write; none for a rejected or failed write | UI tests (announcement count and recorded haptics per flow; a rule rejection plays one warning and no success), mutation check, manual toasts 03/10/11 and no toast on 04/08 |

## Unresolved limitations

1. VoiceOver NOT RUN and native rotation/fold with a draft NOT RUN (above). The owner moved both to the physical-device/Duo gate (D63): Phase 19 VoiceOver audit and device haptics, Phase 21 resize/fold/rotation matrix, and RELEASE_CHECKLIST.
2. The Phase 06 deadline picker still shows SwiftUI's inline label next to our header (same overflow risk at the largest text); left for Phase 07.5 polish.
3. The native segmented control keeps its system size at the largest text size (iOS behavior for segmented controls); the words beside it scale.
4. Dates in our own text use the language tag (`Oct 20, 2026`) while native pickers use the region (`20. 10. 2026.`), as in Phase 06 (Phase 19).
5. History renders all rows in the scrolling screen (D61); Phase 21 profiles 10,000 entries.
6. After a successful delete the edit form's own read briefly finds no entry while the sheet is already closing; not visible in the walkthrough.
7. Simulator taps and screenshots lag by about one action; several screens were opened by deep link (`savingworlds://entry-form?goalId=…`, `savingworlds://history?goalId=…`).

## Result

Initial session result (same day): Phase 07 was recorded **IN PROGRESS**: code complete, all four acceptance criteria with automated and native-simulator evidence, standard checks passing, but the required History/form VoiceOver check and the native rotation/fold draft check NOT RUN.

Owner decision 23 October 2026 (DECISIONS D63): move both checks to the physical-device/Duo gate, as D48 and D60 did. With that decision every remaining mandatory Phase 07 check has evidence, so Phase 07 is **VERIFIED COMPLETE**. Both checks stay NOT RUN and are carried to Phase 19 (VoiceOver audit, felt haptics), Phase 21 (resize/fold/rotation matrix, VoiceOver repeat) and the RELEASE_CHECKLIST. Next prompt: [PHASE_07_5](../prompts/PHASE_07_5.md).
