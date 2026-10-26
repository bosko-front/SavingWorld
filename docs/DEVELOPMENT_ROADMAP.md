# Development roadmap

The current 22 focused phases implement [MVP plan v1.2](Saving_Worlds_MVP_Plan_v1_2.docx), the supreme product authority. No implementation has started. The six broad product stages are decomposed into bounded setup/style/layout, financial, world, motivation, monetization and release phases without expanding product scope.

[DEVELOPMENT_RULES](DEVELOPMENT_RULES.md) owns the shared Definition of Done/session protocol; [evidence](evidence/README.md) records actual checks. Q01-Q06 are resolved by v1.2; owner decision D74 (23 October 2026) overrides the v1.2 rules for Archive, whole-goal deletion, the Free goal limit and loss of Pro. Compatible setup/layout and EAS choices remain. Historical source text never overrides the current product rules.

## Planning revisions and continuation

The original 19-phase plan expanded to 21 for early style/adaptive layout, then 22 for EAS preview/OTA recovery. On 23 October 2026 the owner authorized documentation alignment to v1.2 only. This revision replaces per-goal currency, custom challenges, audit versions, contribution-calendar estimates and unresolved lifecycle/statistics policies. No app files, packages, database, builds or cloud actions were created. Use current prompt names rather than saved older copies; a partial phase repeats its own prompt. On 23 October 2026, after Phase 03, the owner added checkpoint Phase 07.5 (visual direction and design review, DECISIONS D49) between 07 and 08; the 22 numbered phases keep their numbers. On 23 October 2026, during Phase 08, the owner removed Archive (statuses active, paused, completed), allowed confirmed whole-goal deletion (goal, entries and souvenir), changed the Free limit to one goal in total in any status and replaced the loss-of-Pro rule (DECISIONS D74). Phases 09-22 below follow D74; archive or no-deletion text inside the completed Phase 04-07 sections is historical and superseded by D74.

Design direction revision (owner, 25 October 2026, D97): DESIGN_SYSTEM "World-first design direction" now guides every UI phase. Phases 12, 13, 14, 16, 17, 18, 19, 21 and 22 gained scope or verification lines that apply it; no phase, number, acceptance criterion or business rule changed.

## Ordered phases

| Phase | Deliverable | Prompt |
| --- | --- | --- |
| 01 | Latest Expo EAS setup packages and native navigation | [PHASE_01](prompts/PHASE_01.md) |
| 02 | Palette design tokens and global native styling | [PHASE_02](prompts/PHASE_02.md) |
| 03 | Global adaptive layout and iPhone Duo foundation | [PHASE_03](prompts/PHASE_03.md) |
| 04 | Exact money calendar and progression rules | [PHASE_04](prompts/PHASE_04.md) |
| 05 | SQLite migrations and ledger repositories | [PHASE_05](prompts/PHASE_05.md) |
| 06 | Goal forms global currency and lifecycle | [PHASE_06](prompts/PHASE_06.md) |
| 07 | Deposits withdrawals history and corrections | [PHASE_07](prompts/PHASE_07.md) |
| 07.5 | Visual direction and design review checkpoint | [PHASE_07_5](prompts/PHASE_07_5.md) |
| 08 | Free dashboard and deadline estimates | [PHASE_08](prompts/PHASE_08.md) |
| 09 | Island theme assets and static world renderer | [PHASE_09](prompts/PHASE_09.md) |
| 10 | World transitions and progress feedback | [PHASE_10](prompts/PHASE_10.md) |
| 10.5 | Living Island ambient motion (owner-added) | [PHASE_10_5](prompts/PHASE_10_5.md) |
| 11 | Permanent souvenirs Finish Reopen and Collection | [PHASE_11](prompts/PHASE_11.md) |
| 12 | Three fixed challenge rules and attempt engine | [PHASE_12](prompts/PHASE_12.md) |
| 13 | Fixed challenge catalog and attempt UX | [PHASE_13](prompts/PHASE_13.md) |
| 14 | Global weekly local reminder | [PHASE_14](prompts/PHASE_14.md) |
| 15 | Verified StoreKit purchases and entitlement adapter | [PHASE_15](prompts/PHASE_15.md) |
| 16 | Pro paywall and capability enforcement | [PHASE_16](prompts/PHASE_16.md) |
| 17 | Garden and per-goal theme switching | [PHASE_17](prompts/PHASE_17.md) |
| 18 | Four precise Pro savings statistics | [PHASE_18](prompts/PHASE_18.md) |
| 19 | Accessibility localization and Settings review | [PHASE_19](prompts/PHASE_19.md) |
| 20 | EAS preview delivery and OTA recovery verification | [PHASE_20](prompts/PHASE_20.md) |
| 21 | Resilience performance and release candidate | [PHASE_21](prompts/PHASE_21.md) |
| 22 | App Store release preparation and final handoff | [PHASE_22](prompts/PHASE_22.md) |

## Phase 01 Latest Expo EAS setup packages and native navigation

## Objective

Create a reproducible project on the latest stable Expo SDK, with EAS Build/Update configuration, required foundation packages and native navigation, while preserving the existing documentation.

## Dependencies and decision gates

V1.2-aligned documentation baseline only. No implementation phase is complete yet; this prompt authorizes setup only when the owner actually starts it.

The owner's Expo organization/project choice and valid account/signing access are needed to link EAS and produce the required EAS development build. Ask only for genuinely missing identity/access; continue local setup and record pending evidence if access is unavailable.

## Exact scope

- Inspect the docs-only project and preserve every source/document. If the scaffold tool cannot use a nonempty folder, create a temporary sibling and copy only conflict-checked application files; never replace SavingWorld.
- Check official stable Expo releases at execution time and use the latest stable SDK and compatible patch set. The planning research identifies SDK 58 on 22 October 2026; recheck rather than treating that number as permanent. Pin the SDK/React/RN/Router versions in one npm lockfile.
- Install or verify the required foundation set: Expo Router/dev client, safe-area-context, screens, Reanimated and its currently required worklets support, Zustand, expo-sqlite, expo-localization, expo-updates and @expo/ui for the planned adaptive container. Pin a reproducible EAS CLI version as development tooling. Use the Expo-compatible installation method for native packages; inspect template-provided packages first.
- Configure strict TypeScript, ESLint, meaningful noninteractive Jest/React Native Testing Library checks and the lint/typecheck/test scripts. Record Node/npm/Xcode/Device Hub requirements and supported older-iPhone/Duo simulator availability.
- Create thin Home, Challenges and Collection native tab routes with native Stack form/detail routing and a Settings entry. Keep a single navigation owner and simple temporary display content; the palette/components belong to Phase 02 and global adaptation to Phase 03.
- Verify/select the intended Expo account/organization and project, link only that project and configure eas.json plus the public EAS project ID/update URL. Define development/preview/production profiles with explicit channels/environments from EAS_AND_OTA. Configure appVersion runtime policy and nonblocking next-launch update activation; do not publish a production update.
- Produce and launch an EAS development build, recording its real build ID/profile/runtime and toolchain results. Local Xcode is supplementary for simulator/native diagnosis. Record the package/version/install matrix and native rebuild instructions. Add the root CLAUDE.md documentation entry point naming v1.2 as supreme product authority, Q01-Q06 as resolved, and the required status/handoff/current-prompt workflow; historical sources cannot override it. Feature-specific notifications, purchases, images and charts are installed in their owning phases rather than implementing those systems now.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `package.json, package-lock.json and SDK-compatible lint/test/TypeScript configuration`
- `app.config.ts, eas.json and native development-build/update configuration`
- `src/app/_layout.tsx and src/app/(tabs)/ native navigation layouts`
- `src/bootstrap/ and minimal src/shared/ shell files`
- `root CLAUDE.md and .gitignore`
- `docs/evidence/PHASE_01.md package/toolchain matrix and build evidence`

## Technical requirements

- Latest stable means no beta/canary and no silent downgrade to an older SDK. Resolve compatible package versions or document the exact blocker; do not hide peer conflicts with force flags.
- Use native Router Stack/NativeTabs supported by the locked SDK so the OS can adapt navigation chrome. No fixed custom bottom tab bar or native lifecycle opt-out.
- Package installation does not implement database tables, billing, reminders or financial calculations. Configure only required native plugins/permissions; no credentials or secrets in the repository.
- EAS Build/Update is required developer tooling, not a savings backend. Keep the ledger local, no in-app Expo login, no client secrets and no forced reload while editing/saving. A dev client is not release-mode OTA acceptance.
- No CSS framework, whole-screen scaling library, Skia, Lottie or expo-hinge dependency is needed for the planned foundation.

## Acceptance criteria

- All documentation/source copies survive scaffolding and no unrelated user file is overwritten. Root CLAUDE.md directs a fresh session to v1.2 and the current docs, never historical feature scope.
- The locked package set matches the latest official stable Expo SDK at setup time, with compatible native peers and a documented version/install matrix.
- An EAS iOS development build starts, native tabs/stack/back navigation work, and required packages link without native errors; its actual project/profile/build ID is recorded.
- EAS profiles/channels/environments, project/update config and appVersion runtime policy are present and validated; no live production update or routing change occurred.
- Lint, TypeScript, meaningful tests and Expo dependency validation pass; simulator/toolchain coverage and any later physical-device checks are recorded.

## Tests and verification

- Run npm run lint, npm run typecheck and npm test -- --runInBand after configuring real scripts.
- Run npx expo-doctor@latest and the selected SDK's package compatibility check; record exact results without forced peer overrides.
- Build/open an ordinary supported iPhone simulator; test cold launch, native tab/stack transitions and back. Confirm the selected toolchain can run the intended Duo simulator or record that missing environment as an early blocker.
- Inspect EAS build/app configuration for correct account/project, native ID, profile/channel/environment, compatible runtime and nonblocking offline startup; record cloud build results. Actual OTA publish/rollback verification belongs to Phase 20.
- Inspect the dependency/permission diff: only the foundation packages and required native configuration are present.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Final palette/global component styling (Phase 02), responsive/Duo layout implementation (Phase 03), goal/ledger/database features, world assets, challenge behavior, IAP, notification scheduling, full release-mode OTA/rollback drill (Phase 20), production publication and store submission.

[Full implementation prompt](prompts/PHASE_01.md).

## Phase 02 Palette design tokens and global native styling

## Objective

Choose and establish the app palette, shared style tokens and accessible native UI primitives before building product feature screens.

## Dependencies and decision gates

Phase 01. Verify the actual locked project and native build; do not assume the packages or navigation were created correctly.

None beyond verified dependencies.

## Exact scope

- Read DESIGN_SYSTEM and select/refine its recommended warm neutral/forest palette. Record final semantic color values and actual contrast pairs. This is the product palette, not a user-facing Pro color-customization feature.
- Create one typed token module for colors, spacing, text roles, radii, borders, elevation, motion and readable content constraints. Use platform fonts and Dynamic Type; do not introduce scale(screenWidth) or new device-size classifications.
- Create or refine shared AppText, Button, TextField, Card, AmountText display styling and feedback primitives using StyleSheet and resolved tokens. Keep amount parsing/calculation out of this phase; Phase 04 owns it.
- Integrate tokens/primitives into existing shell screens and supported native navigation tint/surface APIs. Explicitly configure the supported launch appearance; do not add a dark-mode toggle or claim untested appearance support.
- Build a development/test-only component gallery showing normal, pressed, loading, disabled, error and focus variants plus long labels and large text. Exclude its route from the distribution build.
- Document conventions for semantic color usage, purposeful component variants, local StyleSheet composition and adding tokens only for real repeated needs. Leave global window/safe-area adaptation to Phase 03.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `src/shared/theme/ palette, typed tokens and app theme access`
- `src/shared/ui/ shared native controls, text and feedback`
- `src/app/ existing shell screens and native appearance configuration`
- `development/test-only component gallery excluded from release routes`
- `tests/integration/ meaningful shared-control behavior checks`
- `docs/DESIGN_SYSTEM.md final chosen palette and evidence/PHASE_02.md`

## Technical requirements

- Use React Native StyleSheet and typed tokens; no web CSS, NativeWind/Tailwind or second styling engine without demonstrated need.
- Keep raw color constants centralized. Typography scales with user text preferences, touch areas remain usable, and labels/errors convey meaning beyond color.
- Normal text targets 4.5:1 contrast; large text/necessary graphical controls target 3:1. Recalculate final foreground/background pairs, including transparent and interactive states.
- App palette semantics are independent of Island/Garden. No user color picker, decoration editor or paid accessibility setting.

## Acceptance criteria

- A documented palette/token source drives shell screens and native surface/tint configuration without copied hex values in feature UI.
- Shared controls expose consistent loading/disabled/error/accessibility behavior; long text and large text remain readable on small and large iPhones.
- Final contrast checks pass for required combinations; decorative colors are not reused as inaccessible financial labels.
- Component gallery is available only in development/test, and the chosen StyleSheet convention plus launch appearance is documented.

## Tests and verification

- Calculate contrast for every required text/control pair and record results separately from visual/device checks.
- Run meaningful component interactions for disabled/loading buttons, labelled fields and error feedback, plus standard lint/TypeScript/tests.
- Review ordinary iPhone simulator shells/gallery with default and large text and both OS appearance preferences; verify the app's configured launch appearance remains legible.
- Inspect source for duplicate palette constants, disabled font scaling and screen-ratio scaling helpers.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Adaptive layout/Duo integration (Phase 03), money parsing/business calculations, financial forms, production scene assets, full dark-mode product scope and user color customization.

[Full implementation prompt](prompts/PHASE_02.md).

## Phase 03 Global adaptive layout and iPhone Duo foundation

## Objective

Establish reusable screen/container rules and verify a native adaptive layout foundation across ordinary iPhones and iPhone Duo before financial feature screens are implemented.

## Dependencies and decision gates

Phase 02. Verify Phase 01 native navigation/packages and Phase 02 tokens/components against code and evidence.

The selected latest stable Expo toolchain and Duo simulator must be available for required native baseline checks. A physical Duo/unavailable pose is tracked as a later device/release gate, not represented as a passing simulator check.

## Exact scope

- Implement shared Screen, FormScreen and ContentColumn behavior for all four safe-area edges, native navigator/scroll inset ownership, readable width, growing text and keyboard-safe scrolling.
- Use live application-window dimensions and nested onLayout measurements for local content sizing; keep geometry ephemeral. Do not use module-level physical-screen dimensions, per-device branches, a global scale function or a hard-coded fold coordinate.
- Implement the narrow AdaptiveGoalLayout primary-scene/secondary-controls contract using native environmental adaptation. Validate @expo/ui ArrangementView with RNHostView on supported iOS and an explicit usable fallback on older supported systems.
- Use development-only scene and controlled-input samples to prove region sizing, aspect ratio, side safe areas and short-window behavior. Keep the route/form draft above arrangement changes and preserve input, selection and navigation through resize/fold/rotation.
- Check native Stack/NativeTabs placement, supported orientations, native sheet/popover sizing and inner split-view left/right positions on the available Duo simulator. Include partial-fold/tabletop checks the native simulator actually supports; record any physical-device follow-up explicitly.
- Apply shared layout primitives to the current shell screens and write the adoption contract for later Home/forms/history/challenges/Collection/statistics/paywall screens. No financial calculation or mutation may depend on size or pose.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `src/shared/layout/ Screen, FormScreen, ContentColumn and layout metrics`
- `src/shared/layout/ AdaptiveGoalLayout and bounded native compatibility adapter`
- `src/app/ native route layouts and current shell adoption`
- `development/test-only resize and controlled-form samples`
- `tests/integration/ layout-state preservation and inset policy cases`
- `docs/ADAPTIVE_LAYOUT.md and evidence/PHASE_03.md native layout matrix`

## Technical requirements

- Prefer native compact/regular adaptation and the system container; window measurement sizes content, not a device-specific breakpoint map. Keep one navigation tree and no forced fullscreen/portrait workaround.
- ArrangementView needs a runtime availability guard and explicit older-OS composition; verify locked package APIs. Hosted React Native content has one parent element per region and a tested sizing mode.
- Financial text and controls remain inside usable margins; decorative scene backgrounds may extend farther. Avoid double application of native and shared insets.
- No expo-hinge requirement, separate app per pose, experimental Router Split View or automatic money action on geometry changes. Keep state stable and accessible.

## Acceptance criteria

- Current shells and sample forms use shared layout primitives and stay usable on small/large iPhones, short windows, large text and keyboard presentation.
- Available native Duo outer/inner/rotation/split-view checks demonstrate correct side insets, native controls and local scene/control sizing without guessed device widths.
- A draft, selected sample goal and current route survive repeated arrangement/size changes with no submission or reset; older supported iOS has a verified fallback.
- Record native simulator/device/OS/pose evidence and any physical-only gaps. Do not claim complete Duo release coverage from generic resized screenshots.

## Tests and verification

- Run layout policy/interaction tests for asymmetric insets, content bounds, large text and state preservation plus standard checks.
- Use the actual iPhone Duo Xcode/Device Hub simulator and ordinary supported iPhone simulator. Verify outer/open, supported rotations, inner split view on both sides, keyboard and available partial-fold poses.
- Test the native ArrangementView/RNHostView combination and the fallback on an older supported OS; inspect measurements, scroll reachability and focus.
- Repeat resize while typing and switching navigation, confirming no remount-driven draft loss or accidental action. Track physical Duo/unavailable-pose checks for the release gate.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Financial/goal implementation (begins Phase 04), production scenes, hinge-driven effects, iPad launch, custom pose-specific features and claiming unperformed real-device support.

[Full implementation prompt](prompts/PHASE_03.md).

## Phase 04 Exact money calendar and progression rules

## Objective

Build the deterministic domain calculations used by all financial and visual features.

## Dependencies and decision gates

Phase 03

None beyond verified dependencies.

## Exact scope

- Implement strict text-to-minor-unit parsing, formatting, checked sums and BigInt intermediates with the documented storage ceiling.
- Bundle a supported currency/exponent registry with source/version evidence. Include zero-, two- and three-decimal behavior and never assume every currency has cents.
- Implement validated civil-date helpers, injected clock boundaries and v1.2 weekly=min(R,ceil(R*7/D)) and monthly=min(R,ceil(R*30/D)) estimates with inclusive civil-day D from DATA_MODEL, with no automatic deposits.
- Implement one shared stage 0-10 function, exact thresholds, numeric overfunding and bounded fractional scene feedback. Do not introduce theme-specific math.
- Define the small capability input used by commands: open-goal count limit (D74 later changed it to a count of all goals), Garden/open-goal theme switching and the four Pro statistics; challenges are the same in Free/Pro. Default production behavior is Free until native verification is integrated.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `src/core/money/`
- `src/core/calendar/`
- `src/core/progression/`
- `src/core/access/ capability contracts and Free baseline`
- `tests/unit/money, calendar and progression scenarios`

## Technical requirements

- No React, database or native imports in pure calculation modules.
- All financial math stays exact through parsing, sum and threshold checks. Float values may drive only visual interpolation.
- Numeric progress must not round 99.999% to a false completed state.

## Acceptance criteria

- The €2,000 threshold examples in requirements are correct, including a withdrawal and 105% overfunding.
- JPY/EUR/KWD-style inputs, malformed values and overflow produce deterministic results/errors.
- Deadline absent/today/expired, leap day and inclusive D match v1.2: remaining 100.00 and D=30 gives weekly 23.34/monthly 100.00; R=0 gives zero and no Overdue.

## Tests and verification

- Table tests for every k/10 boundary, one minor unit below/above, tiny targets, zero and amounts at the bound.
- Parsing tests include alternate locale separators, extra decimals, malformed grouping, scientific notation and non-finite strings.
- Calendar tests cover inclusive day counts across month ends, leap years and DST/time-zone changes with a fake clock, never a contribution-opportunity calendar. Run standard checks.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Screens, persisted records, live currency exchange, forecasts and theme art.

[Full implementation prompt](prompts/PHASE_04.md).

## Phase 05 SQLite migrations and ledger repositories

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

[Full implementation prompt](prompts/PHASE_05.md).

## Phase 06 Goal forms global currency and lifecycle

## Objective

Implement onboarding/global currency and the explicit open/closed goal lifecycle with Free slot enforcement.

## Dependencies and decision gates

Phase 05; inspect the real schema/commands and Phase 02/03 shared UI/layout.

Q01/Q02 are resolved by v1.2. No further owner choice is required for currency, lifecycle or Free limits. Finish/collectible UI integration is completed in Phase 11.

## Exact scope

- Add a short onboarding with one global currency choice. Settings is the only later currency editor; change allowed only with zero transactions and zero collectibles across the database. Empty goals inherit the new selection; explain no conversion and recheck lock atomically.
- Create/edit title, positive target, optional today/future deadline and available theme. Currency is read-only AppSettings information, never a goal field. Existing deadlines may expire naturally.
- Implement active/paused/completed/archived commands. Free counts active+paused<=1 for Create and Reopen, with completed/archived excluded; Pro capability contract permits unlimited open goals later. (Historical; superseded by D74: no archived status, confirmed whole-goal deletion exists and Free allows one goal in total in any status.)
- Pause/Resume and Archive preserve history. paused can edit/add transactions without resuming reminders. completed/archived are read-only until Reopen checks the slot and sets active; never automatically Finish at 100%. Define guarded Finish requiring B>=T for Phase 11 integration. No whole-goal deletion. (Historical; superseded by D74: no archived status, confirmed whole-goal deletion exists and Free allows one goal in total in any status.)
- Implement basic Home open-goal summary/selection and restart fallback. Keep Island-only selection until paid Garden integration; use shared accessible/adaptive controls.
- Set up the shared feedback layer from DESIGN_SYSTEM "Transient feedback (toasts)" and "UX library plan": install `sonner-native`, `react-native-svg` and `expo-symbols` with `npx expo install`; create `src/shared/ui/toast.tsx` (`showToast({ tone, title })` plus a `<Toaster />` host in the root layout) rendered with tokens/AppText, one toast at a time, VoiceOver announcement, Reduce Motion fade and top placement; add a gallery demo. Use it only for committed confirmations here (goal created/saved, paused, resumed, archived (Archive later removed by D74), reopened, currency changed); errors stay inline. Use `@expo/ui` Picker for the currency choice. Rebuild the development client for the new native modules.
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
- No whole-goal deletion, per-goal currency, FX, custom challenge capability or new product decisions. (Whole-goal deletion was later added by D74.)

## Acceptance criteria

- Global currency and zero-balance goal survive restart; second goal never has its own currency picker.
- A paused goal consumes the Free slot; Archive frees it; Reopen at the limit fails and at >=100% remains active. (Historical; superseded by D74: no archived status, confirmed whole-goal deletion exists and Free allows one goal in total in any status.)
- Currency changes update empty goals without conversion, fail with any transaction or collectible, and unlock again only if neither exists.
- Committed goal/currency actions show one announced confirmation toast; failures show inline errors and keep input; no screen imports a toast library directly.

## Tests and verification

- Repository-backed Create/Reopen concurrent slot checks and closed/paused edit guards; confirm no goal-delete route. (Historical; D74 later added confirmed goal deletion.)
- Currency fixtures: empty goals change globally, transaction blocks, deleting last transaction without collectible permits change, collectible alone blocks; use a boundary fixture before Phase 11 introduces real collectible storage.
- UI cancel/invalid target/deadline/write-error tests; native cold restart/selection and VoiceOver/keyboard walkthrough; standard checks.
- Carried from Phase 04 (evidence/PHASE_04.md): on a simulator dev build, observe the Hermes `Intl` output of `formatMoney` (EUR, JPY, KWD, IQD, including 9,999,999,999.99), `separatorsForLocale` for the device locale and `today(systemClock)` after changing the simulator time zone; Jest runs on Node ICU only.
- Carried from Phase 05 (evidence/PHASE_05.md, DECISIONS D52-D54): build on the existing data layer instead of parallel paths. `createGoal` (currency gate, Free slot, theme capability) already exists in `src/features/goals/application/goal-commands.ts`; add edit/lifecycle commands there on `updateGoalStatus`, and the Settings currency change on `writeCurrency`, each inside `executeCommand` with a stable operation ID and a receipt. Map every command error code to inline copy (title 1..100 characters). Re-run `npm run test:db` after adding commands that write.
- Toast wrapper tests (announcement called once, a new toast replaces the current one, no toast on failed write) and a simulator check with VoiceOver, Reduce Motion and the largest text size.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Transaction form/history (07), estimate presentation (08), collectible award and Finish UI (11), Garden/paywall/multi-goal Pro UI.

[Full implementation prompt](prompts/PHASE_06.md).

## Phase 07 Deposits withdrawals history and corrections

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
- Guard completed/archived as read-only until Reopen (D74 later removed archived; completed remains read-only). paused remains editable without Resume. Invalidate balance, stage, estimates and later challenge/statistics queries after commit.
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
- Carried from Phase 06 (evidence/PHASE_06.md, DECISIONS D56-D58): reuse what exists instead of parallel paths. Screens read committed data from `useAppDataStore` and call `refreshAppData()` after a commit; command dependencies come from `goalCommandDeps()` in `src/bootstrap/app-data.ts`. Feedback goes through `showToast` and `Icon` (`deposit`, `withdrawal`, `history`, `calendar`); the deadline picker in `src/features/goals/presentation/deadline-field.tsx` and `src/shared/i18n/local-date.ts` show the `@expo/ui` DatePicker bridge for the entry date. The Free-limit Create rejection that gets `haptics.warning()` is in `goal-form-screen.tsx` (`open_goal_limit`); Reopen at the limit is in `use-goal-action.ts`. Add Savings belongs on the basic Home in `src/features/goals/presentation/home-screen.tsx`. Add the new ledger scenarios to `tests/native/` and the runner as Phase 06 did (`GOAL_SCENARIOS`), and re-run `npm run test:db`.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Entry audit/history versions, whole-goal deletion (later added by D74, not in Phase 07), banks/transfers, animations, challenge engine and forecasting.

[Full implementation prompt](prompts/PHASE_07.md).

## Phase 07.5 Visual direction and design review checkpoint

## Objective

Before the Home dashboard is built, review the real screens that exist after Phase 07 and agree a visual direction with the owner, so Phase 08 onward builds on an approved design rather than the plain Phase 02-03 shell (owner request, DECISIONS D49).

## Dependencies and decision gates

Phase 07. Owner approval (or explicit deferral) of the visual direction gates Phase 08. Final licensed art is not required (Phase 09).

## Exact scope

- Review every current screen, sheet, toast, error and empty state on iPhone SE, a large iPhone and Duo open/closed at default and largest text; list concrete weaknesses (hierarchy, spacing, button stacks, duplicated native and in-content titles, placeholder copy, headers, rows, color and icon use).
- Present two or three Home composition options on `AdaptiveGoalLayout` (prominent saved amount, progress indicator, scene region, next milestone, one primary action, grouped secondary actions) as development-only mocks with fixed sample values and a temporary placeholder scene; record the owner's choice.
- Refine palette/typography only as far as the chosen direction needs (accent role, display amount role, card softness, elevation, spacing), through the tokens and contrast tests; one light appearance stays.
- Apply behavior-free polish to existing screens through new or refined shared primitives (section header, list row, progress indicator, button group); write the outcome into DESIGN_SYSTEM "Visual direction" and update affected Phase 08-11/13 prompts.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse equivalent existing modules after inspection; document mappings and do not create duplicates.

- `src/shared/theme/ palette and token refinements`
- `src/shared/ui/ new or refined shared primitives`
- `src/dev/ development-only Home direction mocks`
- `existing screens: polish only`
- `docs/DESIGN_SYSTEM.md visual direction and docs/evidence/PHASE_07_5.md screenshots`

## Technical requirements

- No product behavior, financial, persistence, navigation or capability change; ideas needing new behavior become owner questions.
- Semantic tokens and contrast targets for every new pair; layout through `src/shared/layout/`; Dynamic Type uncapped; Reduce Motion respected; icons through the shared `Icon`.
- Mocks and placeholder art are development-only and absent from release exports; no licensed art without rights confirmation.

## Acceptance criteria

- Written review with before screenshots on the device matrix.
- Owner's chosen Home direction and any palette/typography change recorded in DECISIONS and DESIGN_SYSTEM.
- Agreed polish visible on existing screens with after screenshots, no regression in keyboard, inset or state preservation.
- Contrast tests cover new pairs and pass; release export has no mock code; Phase 08 names the approved composition.

## Tests and verification

- Lint, typecheck, Jest (contrast, layout, navigation); native before/after screenshots at default and largest text; release export check.

- Carried from Phase 07 (evidence/PHASE_07.md, DECISIONS D61-D62): review `/entry-form` and `/history` too; known starting points are the deadline picker's duplicated SwiftUI label, Home's five stacked buttons, the toast covering the back button and tag-versus-region date formats. Keep ledger behavior unchanged.

## Definition of Done

Every acceptance criterion above has evidence, including the owner's approval; relevant checks pass; documentation and handoff reflect actual state. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Real dashboard data (08), final art/renderer (09/17), animations (10), dark mode, user color customization, new features or navigation destinations.

[Full implementation prompt](prompts/PHASE_07_5.md).

## Phase 08 Free dashboard and deadline estimates

## Objective

Complete the financial dashboard and understandable weekly/monthly deadline guidance.

## Dependencies and decision gates

Phase 07.5 (which depends on Phase 07). Build Home in the approved direction A "Calm hero" with the honey accent (DECISIONS D64, DESIGN_SYSTEM "Visual direction").

## Exact scope

- Compose Home as direction A (D64): scene region, title + status badge, display amount, progress bar with percent and remaining, next-milestone callout, deadline line, one Add savings, grouped rows; extend the Phase 07.5 Home and keep Add savings reachable on the SE with the real scene (done in Phase 08: "+ Add savings" floats on Home and History and goal administration moved to a ⋯ menu, owner decisions D70/D72/D73).
- Show current saved, target, remaining amount and numerical percentage directly from ledger queries.
- Integrate optional deadline weekly/monthly suggestions using v1.2 inclusive-day D and the exact formulas in DATA_MODEL (remaining 100.00,D=30 => weekly 23.34/monthly 100.00). Display the calculation explanation and no-deadline/overdue/complete states.
- Recalculate after deposits, withdrawals, corrections, target/deadline edits and foreground civil-date changes.
- Show overfunding numerically without increasing scene unlocks beyond ten; leave a correctly sized world region ready for Phase 09.
- Keep history and Add savings/Withdraw actions visible and accessible on small screens and large text.
- If the Home goal switcher is a custom control, call `haptics.selection()` when the selected goal changes; a native `@expo/ui` picker needs no extra haptic.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `src/features/goals/ Home dashboard view models and UI`
- `src/core/calendar/ estimate integration`
- `src/shared/ui/ amount and progress components`
- `src/shared/i18n/ deadline and overdue strings`
- `dashboard and clock-boundary tests`

## Technical requirements

- Compose Home through the Phase 03 shared scene/control layout; numerical actions and estimates must remain readable on Duo, short windows and large text.

- All metrics in this phase are Free, including deadline estimates.
- No timers repeatedly recompute the entire ledger; use explicit invalidation and foreground/date reconciliation.
- All amounts use the global currency; no infinite estimate, contribution-calendar formula or false 100% rounding.

## Acceptance criteria

- Dashboard matches ledger values in zero, partial, exactly complete and overfunded cases.
- Changing deadline/clock updates both alternative pace estimates; deadline today gives remaining for both, expired incomplete gives Overdue, remaining zero has no Overdue, no deadline has no estimates.
- Small and large iPhones retain readable financial actions at increased text size.

## Tests and verification

- Fake-clock tests for today, week/month boundaries, overdue and app foreground after midnight.
- Interaction tests for financial edits refreshing metrics and recovery from query errors.
- Simulator/device walkthrough with alternate number locale and standard checks.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- World art/animation, Pro statistics, advanced projections and automatic transfers.

[Full implementation prompt](prompts/PHASE_08.md).

## Phase 09 Island theme assets and static world renderer

## Objective

Build the reusable scene renderer and the complete Free Island composition.

## Dependencies and decision gates

Phase 08

Approved Island artwork and ownership/license provenance are required for visual completion.

## Exact scope

- Implement the static manifest contract from ASSET_SPEC using local static module references, coordinates, z-order and explicit replacement rules.
- Integrate approved Island base and all ten milestone outcomes: tree, path, flowers/bushes, house, bridge, pond, trees, larger house/details, final decorations, completed island.
- Render the exact current stage computed by the shared financial engine, including empty base and 100% cap.
- Implement accessible scene/next-stage descriptions and a scene-only error fallback that keeps financial tracking usable.
- Render the scene in the Phase 07.5/08 scene region (rounded `radii.xl` 4:3 box measured with `useMeasuredSize`/`fitAspect`), replacing the temporary inside of the Phase 08 `WorldScene` (`src/features/worlds/world-scene.tsx`, same props and aspect); feed the next-milestone callout's stage name from the manifest.
- World first (D73): the real Island is the star of Home (no caption/icon inside the world, most visual weight the layout allows); after it renders, review Home with the owner and remove text/cards that are no longer needed. No card polishing before the Island exists.
- Validate asset alignment and decoded memory on an iPhone; keep development scene inspection controls out of release flows.
- **Art input (D76, 24 October 2026).** The Island art comes from the reproducible Blender workspace `assets/worlds/island/` (its README: rebuild/render commands, stage-to-collection map, provenance). Use its layered export: a base layer (stage 0) plus one cropped transparent layer per milestone with its position in the 2048×1536 master frame and an anchor point (where the object meets the ground), and the stage names from the collection labels ("First tree", "Path", ...). Stacking the base and layers 1..n in order reproduces stage n exactly; the stage 8 layer already covers the small house, and the manifest still declares the replacement explicitly (hide the stage 4 house from stage 8 on). Copy the export into `assets/themes/island/`; never paint over or hand-edit the images: a defect is fixed in the Blender scripts and re-exported. Choose one app resolution with a device measurement (suggestion: 1536×1152 for the largest scene region, Duo open, within the ASSET_SPEC memory budget). The renders are transparent: choose the scene box background (the preview cream or a soft sky gradient) as part of the Home review. Provenance and approval are recorded in D76 and the workspace README; Phase 09 evidence references them.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `src/features/worlds/ theme manifest types, registry, validation and WorldScene`
- `assets/themes/island/ approved production exports`
- `src/features/goals/ Home scene integration`
- `tests/unit/world manifest validation and stage scenarios`
- `docs/evidence/PHASE_09.md asset provenance and visual checks`

## Technical requirements

- Size the world against its measured local region through the shared layout; no physical-screen coordinate assumptions. Check Duo relayout without changing stage.

- One renderer, no Island-specific progression math, no full 3D engine.
- House replacement at stage 8 hides the stage 4 house correctly.
- All eleven states require real approved licensed art; temporary art cannot pass visual acceptance.

## Acceptance criteria

- All thresholds show the agreed coherent Island state with correct persistence/regression on reload.
- Missing assets/invalid manifest produce a controlled fallback, not ledger loss or an app crash.
- Asset provenance and first device memory/frame observations are recorded.

## Tests and verification

- Validate manifest thresholds, stable IDs, layer references and replacement sets.
- Review a contact sheet of all eleven states and test one minor unit below/at/above each threshold.
- Inspect small/large iPhone compositions, base-to-complete memory, VoiceOver descriptions and standard checks.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Animated transitions, Garden art, object placement/editor and Skia/Lottie without measured need.

[Full implementation prompt](prompts/PHASE_09.md).

## Phase 10 World transitions and progress feedback

## Objective

Make committed savings updates visibly rewarding while keeping scenes deterministic.

## Dependencies and decision gates

Phase 09

Phase 09 must have verified production Island assets.

## Exact scope

- Connect post-commit old/new stage and mutation revisions to short Reanimated reveals and bounded completion feedback.
- Provide small numerical/progress feedback for savings changes inside a milestone interval, by animating the shared `ProgressBar` fill and percent (accent role, D64) rather than a new indicator.
- Coalesce large deposits crossing several thresholds into a short final-state-correct sequence; quiet regression on withdrawals and target edits.
- Cancel/supersede stale animations on rapid commits, navigation, background or theme changes; reload directly into the persisted final stage.
- Respect OS Reduce Motion and avoid any financial writes or eligibility logic inside animation callbacks.
- Animated empty states (D69): gentle looping Reanimated motion on the centered empty states (stage-0 Island on Home, floating icon tiles elsewhere), paused off-screen, still under Reduce Motion; Skia only with a measured need and a recorded decision.
- Call `haptics.milestone()` once per committed unlock sequence (coalesced with the animation, also under Reduce Motion); no haptic for regression after withdrawals or target edits.
- Milestone unlock moment (D73): count-up of the saved amount, progress bar fill, Island stage reveal, short new-object animation and an in-world "New milestone unlocked!" message (not a toast), one haptic, Reduce Motion shows the final state at once; this moment is what sells the app.
- **Art for the unlock moment (D76).** The new-object animation animates that milestone's own layer from the Phase 09 manifest (pop/grow/settle from the layer's anchor point; the layer already includes the object's shadow and outline, so no extra drawing). The stage 8 house replacement is a short crossfade from the small to the larger house, not a pop. The animated empty state uses the stage 0 base layer. No re-rendering or art changes in the app; a missing layer or anchor is fixed in the Blender workspace export.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `src/features/worlds/ transition planner and Reanimated coordinator`
- `src/features/goals/ committed mutation scene integration`
- `src/shared/ui/ numeric/progress feedback`
- `tests/unit/world transition state-machine scenarios`
- `docs/evidence/PHASE_10.md device motion and frame evidence`

## Technical requirements

- Animation is a presentation effect; query data is authoritative.
- No unbounded celebration queue, offscreen loops or replayed fake deposit on every launch.
- Completion souvenir storage remains Phase 11; this phase must not create a competing completion history.

## Acceptance criteria

- At animation end the scene always equals the current committed stage, including 100% -> 90%.
- Rapid updates and background/resume cannot resurrect removed layers or replay a stale completion.
- Reduced Motion delivers immediate stable state plus concise accessible feedback.
- A threshold-crossing deposit shows the D73 unlock moment on a device recording: count-up, bar, stage reveal, new-object animation, "New milestone unlocked!" message, one haptic.

## Tests and verification

- Deterministic transition tests for multi-stage jumps, decreases, superseded revisions and no-op stage changes.
- Real device recordings/frame inspection during rapid changes and offscreen navigation.
- VoiceOver/Reduce Motion checks and standard checks.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Completion storage/Collection, Garden, physics engines and a general particle system.

[Full implementation prompt](prompts/PHASE_10.md).

## Phase 10.5 Living Island ambient motion

## Objective

Make the Home Island feel alive with quiet ambient motion (drifting clouds, a soft water shimmer, gently swaying trees) at a cost low enough to keep; owner request D90 (25 October 2026). Phase 21 decides on a physical iPhone whether it ships; a static Island is an accepted fallback.

## Dependencies and decision gates

Phase 10 (verified complete, D88). Clouds, stream, waterfall and foam are baked into the base layer (`SW_00_Base_EmptyIsland`), so separate layers come from a Blender re-export (D76); the owner approves the re-exported art and the motion on the simulator.

## Exact scope

- Owner rules (D90): ambient only (clouds, water shimmer, trees); 30 fps is enough, no JavaScript frame limiter (Reanimated on the UI thread); runs only while Home is focused and the app is active; off under Reduce Motion; transforms and opacity on a few layers, never re-rendering the scene; if it costs too much, simplify the water first, then switch ambient motion off.
- Blender export of cloud layers and a water layer/highlight mask (a tree canopy only if whole-layer sway looks wrong); stacking still reproduces the eleven approved renders; copy to `assets/themes/island/`.
- Ambient marks in the manifest contract (cloud, water, sway) with validation; ASSET_SPEC updated.
- Ambient driver in `src/features/worlds/`: long slow cloud drift, water opacity pulse, sub-degree tree sway around anchors with staggered periods; one gate (`useAmbientMotion`); rest pose when stopped; composed with the Phase 10 reveal so a popping tree does not fight its sway.
- Global and per-effect kill switches; World inspector toggles for review and Phase 21 measurement builds.
- Skia only with a recorded gap and an owner decision (D86).

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `assets/worlds/island/scripts/ and assets/themes/island/ re-export with ambient layers`
- `src/features/worlds/ manifest ambient marks, ambient driver, flags`
- `src/dev/world-inspector.tsx ambient toggles`
- `tests/ ambient gating, rest pose, flags, manifest validation, reveal coexistence`
- `docs/evidence/PHASE_10_5.md art verification, simulator recordings, owner approval`

## Technical requirements

- Presentation only; the committed stage stays the only source of what is drawn.
- No ambient motion off Home, in the background, under Reduce Motion or in lists of worlds; decorative only for VoiceOver.
- Decoded memory within the ASSET_SPEC budget; the static Island with ambient off identical to the approved renders.

## Acceptance criteria

- Re-exported Island reproduces all eleven renders with ambient off; provenance updated.
- Owner-approved ambient motion on the simulator that stops and resumes correctly (leave Home, background, Reduce Motion).
- The Phase 10 unlock moment still works with ambient on and ends on the committed stage.
- Kill switches work; standard checks and new deterministic tests pass.

## Tests and verification

- Lint, typecheck, Jest, release export; Blender stacking verification and app-vs-render comparison; simulator recordings (SE, a large iPhone, Duo open).
- Performance is measured in Phase 21 on a physical iPhone (energy, memory, smoothness, ambient on vs off, Xcode Instruments); not decided on the simulator.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Owner approval of art and motion is mandatory. The physical-iPhone measurement is a Phase 21 gate (D90).

## Out of scope

- Souvenirs and Collection (Phase 11), Garden and its ambient motion (Phase 17), new objects, particles, weather, day/night, sounds, Skia without an owner decision, the device measurement (Phase 21).

[Full implementation prompt](prompts/PHASE_10_5.md).

## Phase 11 Permanent souvenirs Finish Reopen and Collection

## Objective

Award one permanent world souvenir per goal independently of explicit Finish/Reopen lifecycle.

## Dependencies and decision gates

Phase 10.5 (which depends on Phase 10); verify Phase 06 lifecycle and Phase 07 atomic ledger mutation boundary.

Q03 is resolved by v1.2. No retention/award reapproval is needed. D74 decides souvenir deletion: a souvenir is deleted only together with its goal.

## Exact scope

- Add collectibles with unique goal_id, theme_id, theme_version and earned_at timestamp. Award at the first saved transaction mutation or target edit yielding B>=T, atomically with the triggering mutation, including Free. Do not change goal status at threshold.
- Retain the souvenir even after correcting an initial mistake, withdrawal, target/theme changes, Finish or Reopen. Re-crossing 100% or retrying a command never duplicates it; preserve referenced historical theme versions. Extend the D74 goal-deletion command so it deletes the goal's collectible in the same exclusive transaction; the souvenir is removed only that way.
- Integrate explicit Finish action for open goals at >=100%: set completed and make read-only. Free keeps that one finished world in Collection; the goal still counts toward the Free limit of one goal in total (D74). Reopen on a completed goal adds no goal, so it is allowed while the person is within the limit; it sets active, enables edits and never auto-finishes even if already >=100%.
- Build Collection souvenir/detail and completed goal views with clear historical/current captions, with Reopen and Delete on a completed goal; there is no archived list (D74). Delete uses the D74 native confirmation: title "Delete completed goal?", message "This will permanently delete your savings history and the completed world from your Collection. This action cannot be undone." A live regressed scene and completed souvenir may coexist. Follow the Phase 07.5 look: `SectionHeader` sections, `StatusBadge` for Completed, `EmptyState` when empty; Finish joins Home's Pause/Delete actions at >= 100%.
- Ensure target/theme/ledger edits respect closed-goal guards and the global currency lock includes collectibles even if every transaction was deleted after Reopen.
- Call `haptics.success()` for the first-100% souvenir moment (instead of the milestone haptic) and after Finish; `haptics.warning()` when Reopen is refused by the Free goal limit; `haptics.success()` with the "Goal deleted" toast after a confirmed deletion. Use the `finish`, `reopen`, `delete` and `souvenir` icons from the shared icon map.

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
- Finish keeps the goal counted toward the Free one-goal limit; Reopen within the limit succeeds and stays active at100%; a Free Create while the finished goal exists is refused with the "Build another world" entry.
- Deleting a completed goal after confirmation removes goal, entries and souvenir in one transaction; Collection no longer shows it, the currency lock recounts and Free can create a new goal.
- Reopen then correction100->10 regresses live scene while the souvenir persists; repeated Finish never adds another.

## Tests and verification

- Real SQLite failure between ledger/target and award rolls back both; unique goal_id plus separate-operation re-crossing tests.
- Native Finish/Reopen/closed edit/paused edit/global currency lock tests, including goal deletion with a souvenir (rollback on failure, receipt replay); count status-completed separately from souvenir count.
- Process termination and historical-manifest/Collection VoiceOver walkthrough; standard checks.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- XP/badges, public sharing, deleting a souvenir without its goal, Archive or Close goal, custom retention policies and multiple rewards per goal.

[Full implementation prompt](prompts/PHASE_11.md).

## Phase 12 Three fixed challenge rules and attempt engine

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
- Extend the D74 `deleteGoal` command to delete the goal's challenge attempts in the same transaction (attempts reference goals).

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

[Full implementation prompt](prompts/PHASE_12.md).

## Phase 13 Fixed challenge catalog and attempt UX

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

[Full implementation prompt](prompts/PHASE_13.md).

## Phase 14 Global weekly local reminder

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
- Present the switch as one Settings row in the shared look (`reminder` tile, native switch) with a short, warm permission explanation; the notification text is generic and kind in the D97 voice (owner-approved copy, D110: "A little progress goes a long way 🌱" / "Ready to grow your world? Check in on your savings this week."), never an amount, title or guilt.

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

[Full implementation prompt](prompts/PHASE_14.md).

## Phase 15 Verified StoreKit purchases and entitlement adapter

## Objective

Prove a restorable lifetime purchase and native verified entitlement state without an application backend.

## Dependencies and decision gates

Phase 14

Q07 product ID/store setup and Q09 bundle identifier are required; a configured test price is not a decision on the final Pro price. Done before Phase 15 (D113, [APPLE_SETUP](APPLE_SETUP.md)): bundle ID `com.bosko123.savingworlds`, App Store Connect app 6827062634, Non-Consumable `com.bosko123.savingworlds.pro.lifetime` without price; the Paid Applications agreement and a sandbox price are owner actions. Native sandbox credentials/device access are external dependencies.

## Exact scope

- Resolve native identifiers with the owner and configure one non-consumable Pro product. Review the pinned package source/API for native verification, current entitlements and revocation.
- Implement event-driven purchase states, verified/unverified/pending distinction and product metadata. Do not grant rights from callback success or JWS decoding alone.
- Persist idempotent transaction processing and entitlement snapshots before finishing/acknowledging store transactions; handle replay after interruption.
- Implement current-entitlement queries, transaction update listeners, explicit restore and foreground reconciliation. Treat network failure as unknown rather than revocation.
- A verified revocation or refund only changes the stored entitlement; it never deletes or changes goals, entries, souvenirs or theme choices (D74, D75).
- Map Pro to unlimited goals, Garden/open-goal theme switching and the four precise statistics; fixed challenges are identical for Free/Pro, with theme rights addressable independently. Pro price remains storefront-sourced and commercially undecided.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `src/features/billing/ PurchaseGateway and expo-iap/native adapter`
- `src/features/billing/ entitlement repository and capability mapping`
- `src/data/db/ entitlement/purchase event migration`
- `src/bootstrap/ StoreKit launch/foreground/update reconciliation`
- `app.config.ts native configuration and StoreKit test setup`

## Technical requirements

- Use an iOS development build, not Expo Go, and no RevenueCat/IAPKit/backend by default.
- If expo-iap cannot supply verifiable native semantics, document and implement only a narrow StoreKit 2 adapter after reviewing that evidence.
- Do not commit credentials, server API signing keys, raw receipts in logs or release entitlement bypasses.

## Acceptance criteria

- A native verified non-consumable purchase persists rights across restart; unverified/pending/cancelled results never grant them.
- Restore from the same App Store account works after reinstall while correctly leaving savings-data restoration out of scope.
- Duplicate updates, interrupted finishing, offline startup and refund/revocation reconcile without deleting user data.

## Tests and verification

- Contract/state-machine tests for all native outcomes and capability mapping.
- Xcode StoreKit tests plus actual sandbox/TestFlight product load, purchase, restore and restart on iPhone.
- Record selected package/native API proof, transaction lifecycle evidence, standard checks and pending credential dependencies honestly.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Paywall polish, subscription products, consumables, external payment links and sale of future premium themes.

[Full implementation prompt](prompts/PHASE_15.md).

## Phase 16 Pro paywall and capability enforcement

## Objective

Connect verified purchases to the complete Free/Pro access rules and a truthful paywall.

## Dependencies and decision gates

Phase 15

Q05 is resolved by v1.2 and its confirmed-loss policy is changed by owner decision D74; use the D74 policy without reapproval. Test paywall pricing may use configured sandbox data; public-release sale copy waits for final Q07 price.

## Exact scope

- Implement lifetime paywall with exact included features, localized product price and buy/restore controls; handle loading/offline/pending/cancelled/owned/error states.
- Replace the Phase 08 native alert with the "Build another world" paywall entry when Free tries to create a second goal (D74): title "Build another world", message "You've already created your free savings goal. Unlock Pro to create more goals and grow your collection of worlds.", button "Explore Pro", footnote "One-time purchase. No subscription.", with Garden shown as an extra Pro benefit. Free can also delete its goal and start over.
- Replace all temporary test capability wiring with the verified production provider; inspect every command entry point for duplicate/free-limit bypasses.
- Enable unlimited Pro goals and statistics navigation; Free keeps the one-goal-in-total limit (any status) for Create; fixed challenges remain identical in both tiers; Garden becomes selectable only when Phase 17 is complete.
- Implement the D74 verified-loss behavior (verified revocation/refund, Family Sharing removed): delete or change nothing; with several goals the person chooses one goal to keep using; the other goals stay visible but read-only (no new entries or edits) until Pro returns or they are deleted. A Garden goal keeps its world as it is but cannot progress further in Garden without Pro; to continue saving the person switches it to Island (Phase 17). Garden souvenirs persist. Temporary offline failure retains previously verified rights; never alter amounts or delete data.
- Provide restore from both paywall and Settings, distinguish purchase rights from data recovery, and return users to the action that opened the paywall.
- Design the paywall world-first and honest (DESIGN_SYSTEM "World-first design direction" (owner decision D97)): the person's world as the hero, the exact included features as a short list with tiles, the store's localized price, one primary purchase button, Restore as a plain button and the footnote. Garden is described in words until Phase 17 provides its art (proposal V06). No comparison tables, discounts, timers, pressure or toast for purchase results; every state has calm in-place text.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `src/features/billing/presentation/ paywall and restore states`
- `src/features/goals/ multi-goal selection and command gates`
- `src/core/access/ Free goal limit, read-only-after-loss and paid-statistics gates`
- `src/features/settings/ Restore Purchases entry`
- `capability and purchase user-journey tests`

## Technical requirements

- Do not gate Free deadline estimates, history, goal editing, basic challenges or accessibility.
- Check capabilities in application commands as well as UI; preserve rights during unknown network state.
- Do not promise all future themes, subscriptions, advanced analytics, rewards or unimplemented functionality.
- Read-only goals after a verified loss look calm and explained (a neutral badge and one sentence), never alarming.

## Acceptance criteria

- Free and Pro feature matrix matches R05/R14/R15/R18/R19/R20 across cold restart and deep-link entry.
- Restore/error/cancellation states are understandable and do not trap the user.
- No automatic data loss (D75): neither a lost entitlement nor any other automatic process deletes or changes goals, entries, souvenirs or theme choices; deletion happens only as the person's own confirmed action. Verified revocation deletes or changes nothing; with several goals the person chooses one goal to keep using; the other goals stay visible but read-only (no new entries or edits) until Pro returns or they are deleted; Garden souvenirs stay. Unknown offline state does not revoke.
- A Free second Create shows the "Build another world" paywall entry with the exact D74 copy; buying Pro returns to Create.

## Tests and verification

- Unit/integration access matrix, deep-link and repeated goal-create tests.
- Device purchase/restore/cancel/offline/pending walkthrough; all three fixed challenges stay Free before/after Pro.
- D74 revocation behavior (choose one goal, the others read-only until Pro returns or they are deleted), the Free one-goal limit, accessibility checks and standard checks.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Garden artwork, final commercial price selection, future-theme entitlement promises and external payment systems.

[Full implementation prompt](prompts/PHASE_16.md).

## Phase 17 Garden and per-goal theme switching

## Objective

Deliver the complete Pro Garden theme and the full confirmed personalization scope.

## Dependencies and decision gates

Phase 16

Approved Garden art and provenance plus verified implementation of v1.2 Q03 and the D74-changed Q05 policies are required for visual and access acceptance. The Garden stages follow owner decision D115 (80% greenhouse and vegetable beds; the 60% fountain brings all the water; the pergola is part of 90%); the art comes from the Garden art workstream ([GARDEN_ART](prompts/GARDEN_ART.md), D114). Art input (D116): `assets/worlds/garden/export/` (copy it unchanged to `assets/themes/garden/`, never edit the PNGs) with `garden_manifest.json` version 1, which the current contract already accepts (base, two drifting clouds, ten unlocks, twelve swaying trees). Its `ambientExtensions` hold Garden motion the contract does not express yet (water flow and pond ripples owned by milestone 6, koi resting visible, lantern/greenhouse glows, butterflies, falling petals); using them means extending `manifest.ts`/`theme-export.ts` with new kinds that rest at 0, presets and limits, and owner confirmation of the proposed butterfly (30%) and petal (40%) milestones.

## Exact scope

- Integrate approved Garden base and all ten exact outcomes from ASSET_SPEC through the existing renderer.
- Allow verified Pro users to select Island/Garden when creating a goal and change an existing open active/paused goal theme later; completed goals require Reopen before any edit.
- Persist theme changes as metadata through a capability-checked command while preserving target, currency, ledger, challenge evidence and current milestone.
- Keep completion snapshots on their historical theme/version; switching an open live goal already at100% does not rewrite its souvenir or award another.
- Use a brief bounded transition and accessible confirmation; verify all Garden states offline and implement the D74 verified-loss Garden rule: a Garden goal is never deleted or changed and its world stays visible as it is, but without Pro it cannot progress further in Garden; to continue saving the person switches that goal to Island (ledger, target and souvenir kept). Garden souvenirs stay. Nothing switches the theme automatically (D75): without Pro the only theme change allowed is the person's own choice of Island for a Garden goal, after a confirmation; if Pro returns they may choose Garden again, and the Garden scene is computed from the goal's current balance and target with the shared stage function.
- Call `haptics.selection()` when the user picks Island or Garden in a custom theme picker; the theme change confirmation uses the shared toast.
- The theme picker shows both themes as picture cards drawn by `WorldScene` at the goal's current stage (owner design direction D97); switching settles on Home with a brief crossfade, never a replay of milestones. Garden souvenirs appear in Collection exactly like Island ones (stored theme and version). The locked-Garden explanation after a verified loss is kind and short.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `assets/themes/garden/ approved production exports`
- `src/features/worlds/ Garden manifest and registry integration`
- `src/features/goals/ theme selection/change command`
- `src/features/worlds/presentation/ theme picker`
- `theme switching, asset and capability tests`

## Technical requirements

- Reuse the shared palette/layout and verify Garden theme switching during a resize without resetting financial state or covering actions with native side chrome.

- No copy of progression math, no theme-specific financial query and no backend assets.
- No object placement, decoration editing, color customization or advanced editor.
- Both complete themes must use approved licensed assets and survive historical-version lookup.

## Acceptance criteria

- Garden has the exact base plus ten milestone outcomes, with coherent regression and 100% cap.
- Theme switching at 0/10/50/100/over100% preserves every financial value and chooses equivalent stage.
- Free access and verified Pro access behave correctly after restart and capability changes.

## Tests and verification

- Review Garden eleven-state contact sheet, manifest validation and threshold boundaries.
- Native/theme-change tests check unchanged ledger/target/completion snapshots and command-level capability rejection and closed-goal read-only guards; a paused edit must not resume reminders.
- Device memory/transition/Reduce Motion/VoiceOver checks and standard checks.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Additional theme packs, manual art editing, color controls and selling future themes.

[Full implementation prompt](prompts/PHASE_17.md).

## Phase 18 Four precise Pro savings statistics

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
- Recalculate after transaction correction/deletion, goal status change, goal deletion and date/month rollover; provide clear empty/loading/error states, accessible chart text and Pro command/query entry guards.
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

[Full implementation prompt](prompts/PHASE_18.md).

## Phase 19 Accessibility localization and Settings review

## Objective

Finish the first-release usability and data explanations across completed product screens.

## Dependencies and decision gates

Phase 18

Production support/privacy destinations and publisher information from Q09 are needed to finish release-facing links.

## Exact scope

- Audit every implemented screen for Dynamic Type, small-screen reflow, VoiceOver order/labels/actions, keyboard navigation and modal focus restoration.
- Apply Reduce Motion across both worlds/chart transitions, preserve all information without color, and verify contrast/touch target sizes.
- Move remaining user-visible strings and accessibility descriptions into the English catalog; test longer strings/RTL layout readiness and alternate numeric/date locales without claiming translations.
- Complete Settings/help explanation that app deletion/device loss may permanently remove local data and the app cannot restore it. Restore Purchases returns the license only. No backup/export/import/sync button or recovery promise; OS backup caveats cannot imply app data restoration.
- Check global currency is editable only in Settings with zero transactions and zero collectibles, applies to every empty goal without conversion, and never appears as an editable goal field; verify the single Sunday 18:00 global reminder switch, permission-denial paths remain usable, and privacy/support links use resolved legitimate destinations or remain explicitly pending release dependencies.
- Audit haptics and icons against DESIGN_SYSTEM: every haptic has a matching visual/text confirmation, at most one per action, none on navigation/regression/purchase; every icon is decorative or labelled, uses the shared map and scales with text.
- Audit every implemented screen against the D97 world-first direction (identity, empty states, celebrations, motion budget, encouraging copy) and present Settings as calm grouped rows in the shared look. Apply only owner-approved D97 proposals (V01-V08) to existing screens; record the others as not applied. Changing Home needs an explicit owner request.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `src/shared/ui/ accessibility and adaptive layout fixes`
- `src/shared/i18n/ English catalog and formatting audit`
- `src/features/settings/ local data, privacy, support and restore information`
- `all affected screen accessibility props and focus handling`
- `accessibility and formatting regression evidence`

## Technical requirements

- No paid accessibility features, new customization controls or manual backup/import implementation.
- Explain the actual data behavior and SDK practices; do not claim no data collection until the shipped dependency audit supports it.
- Avoid fragile screenshot-only verification of focus, keyboard and screen-reader interactions.

## Acceptance criteria

- Critical journeys work with VoiceOver and supported largest text sizes on the selected iPhone matrix.
- Both themes and charts remain understandable with Reduce Motion and color-independent descriptions.
- Settings accurately explains local persistence, purchases and available recovery without fake backup buttons.

## Tests and verification

- Repeat the shared Duo matrix with actual forms, both themes, charts and native sheets; record focused-draft preservation and four-edge safe-area results.

- Manual iPhone VoiceOver/text-size/Reduce Motion checklist with screen-by-screen evidence.
- Carried from Phase 06 (DECISIONS D60): on a physical iPhone, run the VoiceOver walkthrough of onboarding, Create/Edit Goal (inline errors read with the field), Home Pause/Resume and Delete goal (Archive was removed by D74), Collection Reopen and Delete and the Settings currency lock; each confirmation toast is announced once and never takes focus.
- Carried from Phase 07 (DECISIONS D63): on a physical iPhone, run the VoiceOver walkthrough of the Add/Edit Entry form (`/entry-form`: amount/note labels and inline errors read with their field, the Deposit/Withdrawal control, the date picker, the delete confirmation) and History (`/history`: rows read as "Deposit/Withdrawal, signed amount, date, note", closed-goal read-only state); each ledger toast is announced once and never takes focus. Feel the haptics: one success after each committed write, one warning per rule rejection, none otherwise.
- Carried from Phase 10 (DECISIONS D88): on a physical iPhone, VoiceOver hears "New milestone unlocked! {stage}." (or "{n} milestones unlocked! …") exactly once after an unlocking deposit, can focus the in-scene message and dismiss it with a double-tap; nothing is announced for a withdrawal or a deposit inside one interval. Also: the milestone haptic is felt once for an unlocking deposit and the success haptic is not (felt haptics, Phase 19 haptics check).
- Carried from Phase 09 (DECISIONS D83): on a physical iPhone, VoiceOver of the world scene on Home: one image element read as "Island world, n of 10 milestones unlocked" with the stage description as its value, decorative layers silent, the empty-state Island hidden, the scene fallback ("Your world can’t be shown right now", Try again) and the milestone card at 100% ("Your island is complete!"). Mandatory before release; deferred from Phase 09, not passed.
- Carried from Phase 11 (DECISIONS D102): on a physical iPhone, the Collection VoiceOver walkthrough. Each gallery card is one button whose label carries the full goal name, its status and "Island · {date}"; the floating world and the sparkle burst are silent. In the souvenir detail, the world is one labelled image, the achievement block reads "{status}. Saved {amount}. Island completed on {date}.", the "since then" note is read when shown, and Reopen and Delete…, with the "Delete completed goal?" confirmation, are reachable in order. "Your island is complete! Its souvenir is now in your Collection." is heard once after the first 100%. Also: the success haptic of the first 100%, Finish, Reopen and Delete, and the warning of a refused Reopen, are each felt once.
- Carried from Phase 13 (DECISIONS D107): on a physical iPhone, the Challenges VoiceOver walkthrough. Check:
  - each available quest is one radio ("{quest}. {headline}. {detail}") with its checked state, and Start is a separate button inside the chosen card;
  - a quest that can't start reads "{quest}, not available now. {reason}";
  - the active card reads its headline, "{saved} of {target} saved, {to go}" and the quest progress bar with its percent;
  - the info button reads "How quests work";
  - the Past quests heading reads "Past quests, {n}" with its expanded state, and each row reads "{title}, {result}. {detail}";
  - a completed quest is announced once;
  - the reached-target hero reads "Your island is complete!".
  Felt haptics: selection on changing the chosen quest, one success when a quest completes from Challenges, none for Start or Skip.
- Carried from Phase 14 (DECISIONS D109): on a physical iPhone with a device development build, the weekly reminder checks. Check:
  - turning the Settings switch on shows the iOS permission dialog once, only after the opt-in; Allow schedules one request (Reminder lab: one repeating Sunday 18:00 calendar trigger, no time zone, next fire next Sunday 18:00 local);
  - a controlled delivery (Reminder lab test copy) in the foreground goes to Notification Center without a banner or sound; in the background and with the app terminated it shows a banner with the default sound and the generic text only;
  - tapping the banner and the Notification Center row opens Home from the background and from a cold start (terminated); a tap while the Add savings sheet is open keeps the sheet and its draft;
  - switch off cancels the request; Pause of the last active goal cancels it and Resume restores it; a deposit and an edit on the paused goal keep it paused with no request;
  - Don't Allow keeps the switch on with the notice, saving still works, and Open Settings reaches the app's notification settings; allowing there and returning schedules the request;
  - VoiceOver reads the switch as "Weekly reminder, Sundays at {time}" with its on/off state and the explanation line; the success haptic is felt on turning it on or off.
- Formatting tests for at least two numeric/date locales, currency exponents and all user-facing catalog keys.
- Contrast/touch/layout review, relevant interaction regressions and standard checks.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- New languages for launch, cloud sync, app lock, custom colors, export/import and new premium features.

[Full implementation prompt](prompts/PHASE_19.md).

## Phase 20 EAS preview delivery and OTA recovery verification

## Objective

Prove the actual EAS release-mode preview/update/recovery path against the completed MVP and its local financial data before the final release-candidate regression.

## Dependencies and decision gates

Phase 19. Verify the actual Phase 01 EAS project/profiles/runtime configuration and all intervening native/persistence changes as well as the completed feature/accessibility state.

The selected Expo account/project, required signing/test-device access and permitted EAS build/update operations must be available. Executing this phase authorizes only the named development/preview builds and preview-channel OTA drill, using synthetic fixtures. No production publication, production routing change or App Store upload is part of it.

## Exact scope

- Audit the actual EAS project, eas.json/app config, explicit development/preview/production channels/environments and appVersion runtime policy. Verify native package/config and persistence changes have not reused an incompatible shared runtime; document profile/native parity and current channel-to-branch mappings.
- Produce/install a release-mode EAS preview build with a known embedded baseline and the complete current native/SQLite feature set. Use the production export environment on the isolated preview channel as specified in EAS_AND_OTA; use dedicated test installations, not real savings data.
- Implement a small repeatable compatibility/release-record check and redacted version/update diagnostics using existing modules. Review app version/runtime, native contract, schema/data semantics, environment and artifact IDs before an update may be considered publishable.
- Export and publish a harmless clearly identifiable JS-only update to preview with the explicit iOS platform, preview channel and production environment. Verify download, next-normal-start activation, cached/embedded offline launches and complete asset availability; do not force reload an active form, write or purchase.
- Test incompatible runtime rejection and interrupted/failed update behavior. Exercise prior-known-good and embedded rollback on disposable fixtures where supported, proving ledger/receipts/collectibles/challenge-attempt data and actual verified StoreKit sandbox rights remain correct; financial data may use synthetic fixtures, ownership may not be fabricated. Schema/persistence changes are native-release work, never an OTA-only migration.
- Prepare a concrete production promotion/rollout/recovery runbook identifying the exact tested artifact, runtime/platform/environment, baseline, responsible operator and stop/continue evidence. Leave actual production promotion, rollout and store submission to an explicit later operator instruction.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `eas.json and app.config.ts verified build/update/runtime configuration`
- `scripts/ small compatibility/release-record check, only as needed for repeatability`
- `src/bootstrap/ and src/features/settings/ redacted native/update version diagnostics`
- `tests/native/ release-mode update, offline and persisted-state scenarios`
- `docs/EAS_AND_OTA.md validated runbook and release metadata contract`
- `docs/evidence/PHASE_20.md EAS build/update IDs and actual QA results`

## Technical requirements

- Use release-mode preview artifact evidence, not Expo Go, Metro hot reload or a normal dev client as OTA proof. Do not infer production runtime parity from a matching version string alone.
- Same-runtime OTA may change compatible JS/assets only; a shared native or persisted-schema/meaning incompatibility requires a new app version/runtime/native build. Native buildNumber-only increments are not runtime changes.
- Preview and production routing remain isolated. Match build/update export environments; no --auto branch inference, client channel switching, forced runtime override or production publish during tests.
- Update checks do not block the local database. No application-triggered reload during editing, database work or IAP. Code rollback does not revert database writes and must be checked against current persisted state.
- No new backend, analytics SDK, EAS Workflows pipeline, credential export or real financial-data upload. Audit the actual update-service metadata before privacy declarations.

## Acceptance criteria

- A real EAS release-mode preview build and compatible preview OTA update have recorded project/build/update IDs, runtime/channel/environment/platform, source revision and schema contract.
- Installed preview app downloads and activates the expected compatible update at normal restart and remains usable offline with both themes and the same accurate ledger/rights state.
- Incompatible/interrupted/failed update and rollback scenarios have actual recorded results without data reset, duplicate financial effects or unverified ownership changes.
- A reproducible compatibility check and concrete production promotion/recovery record are reviewable; no production channel, rollout or store state was changed by the drill.

## Tests and verification

- Run standard lint/typecheck/tests and the actual native SQLite/financial regression relevant to the baseline and candidate. Any changes to shared financial behavior require independent fixtures, not just a visual marker test.
- On a release-mode preview installation, test first offline embedded launch, online download, normal-start activation, subsequent offline launch and all required static assets. Record native/update identifiers before and after.
- Exercise incompatible runtime and failed/interrupted download. Run a controlled known-good/embedded rollback with synthetic ledger, receipts, collectible/fixed-attempt fixtures and actual verified StoreKit sandbox purchase state; verify persisted-state compatibility. Do not substitute a seeded isPro/cache value for native ownership proof.
- Inspect EAS project/profile/channel/branch/environment evidence, public configuration/secrets exposure and absence of accidental production publication. Record unavailable native/EAS/device checks as NOT RUN; required gaps keep the phase incomplete.

## Definition of Done

Every acceptance criterion above has actual evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Production OTA publishing/rollout/channel remapping, App Store/TestFlight upload, automatic CI deployments, new features/products, destructive OTA migrations, a hosted savings backend and adding a remote analytics service.

[Full implementation prompt](prompts/PHASE_20.md).

## Phase 21 Resilience performance and release candidate

## Objective

Verify the integrated MVP under realistic data, interruption and device performance conditions.

## Dependencies and decision gates

Phase 20

All prior native/device/art checks must be truly complete. Required devices, signing and sandbox accounts may be external blockers.

## Exact scope

- Automate core journeys: Free create/deposit/withdraw/correct/restart, deadline, challenge recording, first-souvenir/Finish/Reopen/Collection, confirmed goal deletion and delete-and-start-over on Free, fixed challenge attempts, global currency lock, global reminder, verified Pro/confirmed-loss handling, open-goal theme change and four exact statistics.
- Exercise actual SQLite migrations and financial commands under interruption, repeated taps, stale edits, low-storage/write failures and foreground date changes.
- Profile local launch, goal/history queries and both worlds on the oldest supported iPhone using realistic multi-goal data, including a 10,000-entry fixture in the one global currency. Test alternate currency exponents in separate whole-app fixtures only.
- Fix measured bottlenecks with indexes, bounded query results, memoized layers and stopped offscreen effects; record before/after evidence without redesigning the app.
- Include the D97 visual elements in profiling: Collection with many souvenir worlds (Pro), quest-card and souvenir celebrations, the paywall and theme-picker world previews and every continuous effect's start/stop. Anything over the budget is simplified per the D97 motion budget (static is an acceptable fallback).
- Repeat the proven OTA/offline/runtime and known-good fallback checks against the actual release-candidate EAS binary, including the relevant persisted financial fixture.
- Create an installable release candidate with no debug routes, entitlement overrides, placeholder art or leaked logs. Audit every R01-R26 acceptance scenario and unresolved blocker.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `tests/native/ financial and native failure scenarios`
- `maestro/ critical iOS user journeys`
- `performance fixes in measured query/scene modules only`
- `build/test scripts and release configuration validation`
- `docs/evidence/PHASE_21.md release-candidate test matrix`

## Technical requirements

- Native tests and release build results are distinct from mocked tests and development performance.
- Preserve migrations and user data during fixes; do not reset fixtures to hide a failure.
- Initial budgets: aim for cold local readiness within about 3 seconds and 60 fps short scene transitions on the selected baseline; record measured outcomes and any agreed revised budget.

## Acceptance criteria

- No known critical financial/data-loss/startup defects; all blocking acceptance checks have actual evidence.
- Release candidate passes the documented offline and native test matrix, including real purchase/restore and notifications.
- Performance is measured on the supported baseline and unresolved failures have owner/impact/next action recorded; failed mandatory checks keep phase incomplete.

## Tests and verification

- Run ordinary-iPhone and Duo resize/fold/split-view scenarios from ADAPTIVE_LAYOUT against the release candidate, including physical-only gaps carried from Phase 03: inner split view with the app on both sides on a physical iPhone Duo (DECISIONS D48), plus the closed-display collapse fallback and focus behavior (D47). Repeat the Phase 06 VoiceOver walkthrough on a physical iPhone if Phase 19 did not already record it (D60). Rotate an ordinary iPhone and fold/unfold/rotate a Duo with a typed draft in `/entry-form` (draft, kind, date and operation ID kept, no extra ledger write), and repeat the Phase 07 ledger VoiceOver walkthrough if Phase 19 did not record it (D63).

- Run standard checks, actual test:db suite and established test:e2e critical flows on iOS.
- Run interruption/rollback/migration scenarios and device memory/launch/frame profiling; record build identifier and fixture size.
- Carried from Phase 09 (DECISIONS D83): on a physical iPhone (oldest supported and one recent), decoded image memory and frame observations of the Island scene from stage 0 to the complete Island, stage changes on Home and the full-bleed scroll, against the ASSET_SPEC budgets (~32 MiB per world, 60 fps). Phase 09 recorded only simulator footprints (303 → 305-306 MB). Mandatory before release; deferred from Phase 09, not passed.
- Carried from Phase 09 (DECISIONS D83): repeat the world-scene VoiceOver check from Phase 19 on the release candidate.
- Carried from Phase 10 (DECISIONS D88): on a physical iPhone, a recording with frame inspection of the D73 unlock moment (count-up, bar, stage reveal, object pop, stage 8 crossfade, message), of rapid repeated deposits and of navigating away/backgrounding mid-moment; the scene always ends on the committed stage and nothing replays. Repeat the Phase 19 unlock VoiceOver/haptic check on the release candidate.
- Phase 10.5 ambient motion (DECISIONS D90): on a physical iPhone with Xcode Instruments, compare Home with ambient motion on and off (Energy Log/Power Profiler, memory, Animation Hitches or Core Animation frame pacing) over a few minutes idle on Home and during an unlock; confirm it stops off Home, in the background and under Reduce Motion. Keep ambient motion only if it passes; otherwise simplify the water first, then switch it off (static Island). The switches are `AMBIENT_RELEASE_SWITCHES` in `src/features/worlds/ambient.ts` (all, clouds, water, trees); the World inspector toggles them at runtime in a measurement build (D91). Record the numbers and the decision.
- Carried from Phase 11 (DECISIONS D102): repeat the Collection VoiceOver walkthrough and haptics from Phase 19 on the release candidate, and include Collection (featured card, multi-world gallery with the D100 float, souvenir detail and sparkle burst) in the physical-iPhone frame and energy measurement.
- Carried from Phase 13 (DECISIONS D107): repeat the Challenges VoiceOver walkthrough and haptics from Phase 19 on the release candidate, and include the Challenges tab (active quest bar glide after a saved entry, reached-target hero with its one-shot sparkle) in the physical-iPhone frame and energy measurement.
- Carried from Phase 14 (DECISIONS D109): repeat the Phase 19 weekly reminder checks on the release candidate, including one real Sunday 18:00 delivery (or a device time-zone change that reaches it), travel to another zone and a DST change keeping 18:00 local, and a reinstall/upgrade that leaves exactly one request.
- Run full regression only now after integration, not repeatedly after every unchanged earlier phase; update requirements traceability.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Public App Store submission, unrelated refactors, new features, remote crash/analytics services and unsupported device claims.

[Full implementation prompt](prompts/PHASE_21.md).

## Phase 22 App Store release preparation and final handoff

## Objective

Prepare a reviewable first-release package and operator instructions without claiming an unperformed launch.

## Dependencies and decision gates

Phase 21

Final Pro price and sale details (Q07), identity/legal/URLs/toolchain (Q09), artwork approval and all native verification evidence must be resolved for release readiness.

## Exact scope

- Recheck current official Apple submission, IAP, privacy-manifest, privacy-label, age-rating and toolchain requirements against the actual release candidate.
- Finalize owner-approved name/publisher/bundle/support/privacy information and prepare truthful description, screenshots, age rating, review notes and privacy answers. Screenshots show the real app in the D97 world-first look (worlds first, honest numbers), never mock features.
- Prepare the one-time Pro product description and localized price displays using the owner-finalized commercial decision. Leave future premium-theme rights/prices unresolved and avoid broad inclusion promises.
- Verify the Phase 20/21 EAS delivery evidence and prepare the exact production update promotion/rollout/recovery record with runtime/channel/environment and schema constraints. Do not publish it.
- Generate/verify the signed EAS distribution candidate and prepare TestFlight/review instructions, build/version mapping and installed-build smoke evidence as credentials permit.
- Produce a release handoff listing every artifact, verification result, known acceptable limitation, outstanding operational step and the exact manual submission procedure. Distinguish release-ready, submitted and live states.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `app.config.ts and EAS distribution/build profile configuration`
- `store/ metadata drafts, screenshots and review notes when created in this phase`
- `docs/evidence/PHASE_22.md signed build and store-readiness record`
- `docs/RELEASE_CHECKLIST.md and PROJECT_STATUS.md`
- `final SESSION_HANDOFF.md with operator steps`

## Technical requirements

- No production OTA publication/routing/rollout change, public submission, pricing change or external message without explicit owner authorization in that implementation session.
- Store/privacy claims describe observed shipped behavior, not a template. No financial advice claims, account registration or subscriptions.
- Unconfigured production IAP, missing policy URL, unapproved art or failed device tests block readiness; do not label them done.

## Acceptance criteria

- All release checklist items have verified evidence or a named blocking dependency; readiness is claimed only when required items are complete.
- Distribution build and store materials accurately show both themes and the exact Free/Pro feature matrix.
- Final handoff clearly says whether app is ready, uploaded/submitted or live; no automatic claim of App Store approval.

## Tests and verification

- Validate signed build installation and core airplane-mode journey plus real sandbox/TestFlight purchase/restore.
- Inspect archive manifests/permissions/dependency privacy behavior and run current official store requirement checklist.
- Review screenshots, metadata, product copy, URLs and final documentation links; standard checks after any app changes.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Automatic publication/submission, future theme product sales, unresolved future-theme entitlements, Android launch and post-launch features.

[Full implementation prompt](prompts/PHASE_22.md).

## Release scope and gates

One global currency; exact local ledger with nonnegative chronological balance; a Free limit of one goal in total in any status (D74); explicit Finish/Reopen; confirmed whole-goal deletion (goal, entries and souvenir; D74); a unique souvenir per goal; Island/Garden base plus ten unlocks; three fixed challenge rules; one optional global Sunday 18:00 reminder; lifetime Apple Pro with restore, unlimited goals, open-goal theme switching and four precise statistics. Include every existing goal's ledger and the pre-window opening balance in the 30-day total daily graph; completed count is current goal status. Loss of Pro keeps one chosen goal usable and the others read-only (D74). No audit history, Archive or Close goal, custom challenge editor, backup/export/import/sync, AI, accounts, Android launch or extra themes.

Compatible native styling/adaptation and EAS delivery must be verified in actual builds. Licensed final art, identity/price/store/native/EAS access are phase/release dependencies. VERIFIED COMPLETE requires evidence; a finished Phase 22 prepares release, not production publishing, store submission or Apple approval. Core testing does not wait for final Pro price.
