# Phase 06 evidence: goal forms, global currency and lifecycle

Session date: 23 October 2026. Phase state: **VERIFIED COMPLETE** (owner decision D60: the VoiceOver walkthrough, which the iOS Simulator cannot run, moved to the physical-device gate in Phases 19/21). Next prompt: [PHASE_07](../prompts/PHASE_07.md).

## Starting state and dependency evidence

- Read the full v1.2 DOCX (textutil) and the required docs (README, PRODUCT_REQUIREMENTS, SOURCE_RECONCILIATION, DECISIONS, DEVELOPMENT_RULES, PROJECT_STATUS, SESSION_HANDOFF, ARCHITECTURE, DATA_MODEL, TECH_STACK, TEST_PLAN, DESIGN_SYSTEM, ADAPTIVE_LAYOUT, EAS_AND_OTA, Phase 06 roadmap entry and prompt).
- Git: `main` at 9351b72 (Phase 05 commit), clean working tree at start. Phase 06 is uncommitted.
- Baseline before changes: lint PASS, typecheck PASS, `npm test -- --runInBand` PASS (16 suites, 467 tests).
- Phase 05 dependencies verified in code: `createGoal` (currency gate, Free slot, theme capability), `updateGoalStatus`, `writeCurrency`, `executeCommand`, receipts, schema 1 triggers (no goal delete, closed-goal ledger guard). Phase 02/03 shared UI and layout primitives reused unchanged except for the icon additions below.

## Toolchain

- Expo SDK 58 (expo 58.0.17), React Native 0.88.0, React 19.3.0, Expo Router 58.0.25, Hermes. Node 22.16.0. Xcode 27.1.
- New dependencies (all `npx expo install`): `expo-symbols` ~58.0.4, `react-native-svg` 15.16.0, `sonner-native` ^0.27.0 (0.27.0), and `expo-font` ~58.0.9 (required peer of expo-symbols; expo-doctor fails without it; iOS SymbolView does not load fonts). `npm audit` unchanged by these installs: 31 high before and after (pre-existing).
- EAS project `@bosko123/saving-worlds`, profile `development-simulator`, channel `development`, environment `development`, runtime 1.0.0 (not yet shared, so no version bump), schema 1 unchanged.
  - Build 5af84daf-3beb-4f85-8c49-5f146a10bbdb: first rebuild for expo-symbols/react-native-svg/sonner-native; used only for early UI exploration.
  - Build **9ccf0f42-bcf9-4cb7-bdca-33dba0311a59**: final development simulator build including expo-font (archive contains ExpoFont.framework). All native evidence below uses this build. Both builds were uploaded from the uncommitted working tree (EAS records commit 9351b72 plus local changes).
- Simulators: SW iPhone SE 3 iOS 18.5 (66F6F9E8…), iPhone 17 Pro Max iOS 26.1 (CE4A7B1E…), SW iPhone Duo iOS 27.1 (E273F5F5…). Device region Serbia, language English (en-US tag).

## Implementation

| Area | Files |
| --- | --- |
| Lifecycle rules (pure) | `src/features/goals/domain/goal-lifecycle.ts` |
| Goal commands | `src/features/goals/application/goal-commands.ts`: `createGoal` refactored onto shared field validation; new `editGoal`, `changeGoalStatus` and `pauseGoal`/`resumeGoal`/`archiveGoal`/`finishGoal`/`reopenGoal`, each with operation ID, revision check and `{goalId, revision}` receipt. No delete. |
| Selection | `goal-selection.ts` (`selectGoal`, no receipt, D57), `goal-queries.ts` (`readGoalsOverview`, `resolveSelectedGoalId`) |
| Currency | `src/features/settings/domain/currency-change.ts` (`rescaleTarget`), `application/currency-commands.ts` (`setGlobalCurrency`), `application/settings-queries.ts` (`readCurrencyOverview`) |
| Data layer | `goal-repository.ts` (`updateGoalDetails`, `listGoals`, `updateGoalTarget`), `settings-repository.ts` (`selectedGoalId` key), new `collectible-repository.ts` (souvenir count boundary until Phase 11) |
| Access policy | Existing `src/core/access` (`hasOpenGoalSlot`, `canUseTheme`, `switchOpenGoalTheme`) used for Create, Reopen and Edit; no change needed. |
| Screens | `src/features/goals/presentation/` (home-screen, goal-form-screen, deadline-field, closed-goals, use-goal-action, goal-copy, goal-amounts), `src/features/settings/presentation/` (onboarding-screen, currency-settings, currency-picker, currency-copy) |
| Routes | `src/app/(onboarding)/onboarding.tsx`, `src/app/goal-form.tsx` (root form sheet), Home/Collection/Settings route files now thin adapters; `src/app/_layout.tsx` guards (tabs)/goal-form behind a chosen currency; `dev-db` moved to the root stack (development only) |
| Composition | `src/bootstrap/app-data.ts` (committed-data snapshot, `refreshAppData`, command deps, Free capabilities) |
| Shared | `src/shared/ui/toast.tsx`, `src/shared/ui/icon.tsx`, icon support in Button/Notice/TextField, `src/shared/layout/use-font-scale.ts`, `src/shared/i18n/locale.ts` and `local-date.ts` |
| Dev | Gallery toast and icon sections; runner includes `GOAL_SCENARIOS` and `INTL_SCENARIOS` |
| Lint | `sonner-native` only in toast.tsx, `expo-symbols` only in icon.tsx |
| Tests | `tests/native/goal-scenarios.ts` (G01-G06), `tests/native/intl-scenarios.ts` (I01), restart pair extended, `tests/integration/goal-ui.test.tsx`, `toast-and-icon.test.tsx`, `tests/unit/goal-rules.test.ts`, `tests/unit/locale.test.ts`, `tests/support/app-fixture.ts`, `tests/support/sonner-native-fake.tsx` |

Decisions: D56 (currency change keeps written target amounts, onboarding = stored currency, souvenir lock boundary), D57 (lifecycle transitions, edit guards, selection without receipt, Collection Reopen), D58 (feedback layer), D59 (region separators for typed amounts, root `dev-db`, `(onboarding)` group).

## Checks

| Check | Environment | Result | Evidence / remaining action |
| --- | --- | --- | --- |
| `npm run lint` | host | PASS (exit 0) | After final edits |
| `npm run typecheck` | host | PASS (exit 0) | |
| `npm test -- --runInBand` | host, Jest + node:sqlite | PASS: 20 suites, 532 tests | First full run after the dev-db move: 1 FAIL (deep link `/` landed on `/dev-db` instead of `/onboarding`, also seen on the Duo); fixed with the `(onboarding)` group, guard tests added |
| `npm run deps:check` | host | PASS ("Dependencies are up to date") | |
| `npm run doctor` | host | PASS 20/20 | First run after installing expo-symbols: 1 FAIL (missing peer expo-font); fixed by installing expo-font and rebuilding |
| `npm run test:db -- --fresh-install` | SE iOS 18.5, build 9ccf0f42 | PASS 27/27 + restart 1/1; app DB migrated `[1]` on fresh install | [report](phase-06/test-db-iphone-se-ios18.5.json). First attempt timed out because `/dev-db` was unreachable before onboarding; fixed (D59) |
| `npm run test:db` with simulator TZ Pacific/Kiritimati | 17 Pro Max iOS 26.1 | PASS 27/27 + 1/1 | [report](phase-06/test-db-iphone-17-pro-max-ios26.1-tz-kiritimati.json) |
| `npm run test:db` | Duo iOS 27.1 | PASS 27/27 + 1/1 | [report](phase-06/test-db-iphone-duo-ios27.1.json) |
| Release export `npx expo export --platform ios` | host | PASS | Hermes bytecode has no scenario titles, `dbtest-report` or gallery content ("Text roles" 0); only the guarded route title "Component gallery" (pre-existing, D39) |

TEST_PLAN coverage: T07 (G01, G02, G03, UI lifecycle tests), T27 (G04, UI currency tests), T01 locale input (unit), T18 partial (largest text, Reduce Motion; VoiceOver NOT RUN), T23 partial (draft kept through errors and sheet swipe-cancel), carried Phase 04 Intl check (I01).

## Native SQLite and command results (`npm run test:db`)

G01 lifecycle (paused takes the slot, Finish only at B ≥ T, Finish frees the slot, Reopen refused at the limit, Archive frees it, Reopen at ≥ 100% stays active, stale/replay/conflict), G02 concurrent Create/Reopen (one winner of four, then no reopen while the slot is taken), G03 edit guards (paused editable without resuming, unchanged expired deadline kept, changed past deadline refused, title 100/101, Free theme switch refused, Pro allowed, archived read-only, history kept), G04 currency (first choice, JPY/KWD/EUR rewrite of empty targets, not-representable refusal changes nothing, transaction locks, deleting the last transaction unlocks, souvenir fixture alone locks, racing deposit serializes, replay), G05 selection across a database reopen and fallback, G06 currency and zero-balance goal across a reopen and goal DELETE refused. R1/R2 now also verify a second zero-balance goal and the Home selection after a real process restart. All on real expo-sqlite in three simulators.

## Carried Phase 04 check: Hermes Intl (I01)

Hermes on iOS 26.1 (identical digits on 18.5 and 27.1): `formatMoney` gives `€9,999,999,999.99` (en-US), `9.999.999.999,99 €` (de-DE), `¥1,235`, `KWD 1.250`, `IQD 1,250.000` (registry exponent 3 overrides CLDR), `-€5.00`. `separatorsForLocale('de-DE')` = `,` / `.`; `en-IN` uses Indian grouping. Engine locale `en-US`. `today(systemClock)`: Europe/Belgrade gives 2026-10-23; with the simulator launchd `TZ=Pacific/Kiritimati` (UTC+14) at 2026-10-23T14:39Z it gives **2026-10-24**, so the civil date follows the device zone. Finding: with English language and region Serbia, the iOS decimal keyboard types `,` while Intl for the `en-US` tag uses `.`; "12,345" was read as twelve thousand. Fixed by `deviceSeparators()` using the region's separators from expo-localization (D59, unit-tested, re-checked on the simulator: `12345,005` now reports "at most 2 decimal places", `12345,00` saves).

## Manual native checks (build 9ccf0f42 / 5af84daf, 17 Pro Max iOS 26.1 unless noted)

| Check | Result | Screenshot |
| --- | --- | --- |
| Onboarding with native @expo/ui menu picker, region currency preselected, Continue opens Home | PASS | [01](phase-06/01-onboarding.png), [02](phase-06/02-currency-menu.png) |
| Create Goal sheet: currency only as read-only label/hint, no currency picker | PASS | [03](phase-06/03-new-goal-form.png) |
| Comma decimal read as grouping before the fix (bug) | FAIL, then fixed | [04](phase-06/04-before-fix-comma-read-as-grouping.png) |
| Invalid target: inline error with SF Symbol and red outline, input kept, focus on field, Save reachable above keyboard | PASS | [05](phase-06/05-target-error-inline.png) |
| Native compact DatePicker; past days disabled; deadline saved | PASS | [06](phase-06/06-deadline-calendar.png) |
| Save: loading state, sheet closes, "Goal saved" toast drawn above the dismissing native sheet | PASS | [07](phase-06/07-goal-saved-toast-over-sheet.png) |
| Swipe-down cancel saves nothing | PASS | (Home unchanged) |
| Pause: badge, explanation, Resume, slot notice stays, toast | PASS | [08](phase-06/08-paused.png) |
| Archive: native confirmation, toast, empty Home with Collection hint | PASS | [09](phase-06/09-archive-confirmation.png), [10](phase-06/10-archived-home.png) |
| Collection lists the archived goal read-only; Reopen sets active with toast | PASS | [11](phase-06/11-collection-closed-goal.png), [12](phase-06/12-reopened-toast.png) |
| Settings currency (unlocked): menu picker, no-conversion native confirmation, toast; target 12,345.00 SBD → 12,345 RWF | PASS | [13](phase-06/13-currency-change-confirmation.png), [14](phase-06/14-currency-changed.png) |
| Cold restart (terminate + relaunch): currency, goal, rewritten target, deadline and selection kept | PASS | [15](phase-06/15-after-cold-restart.png) |
| Largest text (accessibility XXXL) + Reduce Motion: text wraps, icons scale, toast fades in without slide and wraps | PASS (after fixing a first-frame flash: the host now tracks Reduce Motion) | [16](phase-06/16-largest-text-reduce-motion-toast.png), [17](phase-06/17-largest-text-home.png) |
| Keyboard: Return moves from name to target; Save and errors reachable with keyboard up | PASS | [05](phase-06/05-target-error-inline.png) |
| Duo iOS 27.1 onboarding layout | PASS (tap automation on the Duo intermittent, as in Phase 03) | [18](phase-06/18-duo-onboarding.png) |
| SE iOS 18.5 fresh install: `/settings` deep link lands on onboarding | PASS | [19](phase-06/19-se-fresh-install-deeplink-onboarding.png) |
| VoiceOver walkthrough and spoken toast announcement | **NOT RUN; moved to the physical-device gate (D60)** | The iOS Simulator has no VoiceOver; the simulator host (DeviceHub) exposes no iOS accessibility tree to macOS AX. Jest verifies labels, roles, hidden icons and one queued `announceForAccessibilityWithOptions` per toast. Needs a physical-device development build (owner's Apple credentials). |

Simulator settings restored afterwards (text size large, Reduce Motion off, launchd TZ unset).

## Unresolved limitations

1. VoiceOver NOT RUN (above). The owner moved it to the physical-device gate (D60): Phase 19 VoiceOver audit and Phase 21 / RELEASE_CHECKLIST before Release 1.0.
2. Deadline summary text and Home dates use the language tag (`Oct 31, 2026`) while the native picker uses the region (`31. 10. 2026.`). Noncritical; consistent date formatting is a Phase 19 localization item.
3. Dev-client warnings `Sending onAnimatedValueUpdate with no listeners registered` appear in Metro during runs (development-only, also when no toast shows); not investigated further.
4. Free never shows the open-goal switcher; the Pro list on Home is exercised only by G05/unit tests until Phase 16.
5. Finish has a guarded command only; its UI and the souvenir award are Phase 11. A completed goal must be reopened before it can be archived (D57).
6. Phase 06 work is uncommitted; Metro was started for the native runs and stopped at session end.

## Result

Initial session result (same day): all four acceptance criteria had automated and simulator evidence; only the VoiceOver walkthrough was NOT RUN, so the phase was recorded IN PROGRESS.

Owner decision 23 October 2026 (DECISIONS D60): move the Phase 06 VoiceOver walkthrough to the physical-device gate, as D48 did for Duo split view. With that decision every remaining mandatory Phase 06 check has evidence, so Phase 06 is **VERIFIED COMPLETE**. The VoiceOver walkthrough stays NOT RUN and is carried to the Phase 19 VoiceOver audit, Phase 21 and the RELEASE_CHECKLIST accessibility item. Next prompt: [PHASE_07](../prompts/PHASE_07.md).
