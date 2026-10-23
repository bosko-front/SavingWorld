# Release checklist

Product authority is [MVP plan v1.2](Saving_Worlds_MVP_Plan_v1_2.docx). Q01-Q06 are resolved. This is a future release gate, not an assertion that the app is ready. Initially every app item is unchecked. Phases 21/22 attach evidence rather than checking boxes from memory. Recheck current official sources from [TECH_STACK](TECH_STACK.md) before submission.

## Product and financial correctness

- [ ] R01-R26 have implementation and test evidence linked from status and the test plan.
- [ ] Free: active+paused<=1 open goal, Island, all three fixed challenges, shared ledger/history and exact inclusive-day deadline estimates; completed/archived excluded from limit.
- [ ] Pro lifetime: unlimited open goals, complete Garden, simple open-goal Island/Garden switching and four precise statistics. Fixed challenges identical to Free; no custom editor/schedule/pause.
- [ ] One global currency from onboarding/Settings, locked with any transaction or souvenir; no goal picker/FX. Positive entry amounts, no future dates, chronological nonnegative subtotals, edits/confirmed deletes and overfunding pass native tests; no audit versions.
- [ ] Both themes have the exact base plus ten unlocks, production-approved licensed assets, bounded animations and accessible descriptions.
- [ ] First saved>=100% gives one permanent souvenir even Free, without status change. Explicit Finish/Reopen, closed read-only guards, paused editing, one-slot limit and no whole-goal deletion pass. Challenge eligibility/frozen attempts/history never creates duplicate money or reactivates past attempts.
- [ ] Four Pro statistics exactly match all-goal current total, current-month gross inflow/outflow, all-goal daily balance for last 30 days including opening balance/archived ledger, and count status=completed.
- [ ] No backup/export/import/sync, custom/advanced challenges, extra schedules, advanced gamification/forecasts, scene editor, accounts or future-theme promises entered scope.

## Setup styling and adaptive platform foundation

- [ ] Initial setup used the latest stable Expo SDK with compatible locked packages and a recorded toolchain/install matrix; no forced peer mismatch or silent downgrade.
- [ ] App palette and typed tokens are centralized; shared native controls have verified contrast, dynamic text, loading/disabled/error behavior and coherent supported appearance.
- [ ] All feature screens use shared layout/inset policy rather than model-specific widths or a global scale function.
- [ ] Duo outer/open, supported orientations and inner split view on either side have native evidence; native bars/side insets do not cover financial controls or sheet actions. Inner split view (app left and right, divider drag) must be checked on a **physical iPhone Duo**: the Xcode 27.1 Device Hub simulator offers no split-view control (DECISIONS D48).
- [ ] Required partial-fold/tabletop behavior and physical-only gaps are tested before claiming complete Duo support; no guessed fold coordinate or required hinge effect.
- [ ] ArrangementView/RNHostView integration and older-iOS fallback are verified; no experimental split-view/navigation dependency entered scope accidentally.
- [ ] Repeated resizing while editing preserves draft, route, selection and operation ID and creates no additional financial mutation.

## Native storage and recovery

- [ ] Supported-schema migrations, failure rollback, unknown-schema state, restart, stale edits, repeated submit and 10,000-entry fixtures pass on actual Expo SQLite.
- [ ] No automatic wipe/reinitialize on storage failure; retry/recovery copy is usable and diagnostics redact financial content.
- [ ] App sandbox/file protection behavior is appropriate for the tested locked-device/foreground cases.
- [ ] Data explanation states local storage/app deletion risk and OS backup limitations; no backup/sync guarantee or fake import/export action.
- [ ] Restore Purchases clearly restores paid rights, not savings records. No records disappear on confirmed loss; select at most one open Free goal and archive others before further entries, use Island live and retain Garden souvenirs. Temporary offline failure alone retains prior verified rights.

## Purchases and notifications

- [ ] Final Pro price/storefronts/product ID are owner-approved. Product type is non-consumable, and the store's localized price is shown.
- [ ] Native verified/unverified states, pending/cancelled/error, finish/replay, reinstall restore, offline startup and revocation pass StoreKit and sandbox/TestFlight checks.
- [ ] Paywall and Settings expose Restore Purchases; current entitlement queries do not repeatedly prompt for an Apple password at startup.
- [ ] Future premium-theme entitlement rules/prices remain unresolved without misleading sales promises; no future products were accidentally offered.
- [ ] One optional global Sunday 18:00 device-local reminder only with an active goal passes opt-in/denial/cancel/reconcile/tap/timezone tests on iPhone. No per-goal/per-challenge time/cadence controls.
- [ ] All production capability bypasses and native test routes are removed/excluded from distribution.

## Usability and performance

- [ ] Onboarding explicitly explains manual tracking and absence of actual money transfers.
- [ ] VoiceOver, Dynamic Type, contrast, touch sizes, Reduce Motion, chart text alternatives and keyboard/focus behavior pass on supported devices.
- [ ] English catalog is complete; currency/date formatting and longer/RTL-ready layouts are verified without claiming untranslated language support.
- [ ] Airplane-mode core journeys and already verified Pro features work without an app login.
- [ ] Release build launch/query/frame/memory measurements meet the documented device budgets or a reviewed adjustment.
- [ ] Empty/error/complete/overfunded/paused/archived/offline/store-unavailable states are present and tested.

## EAS Build and OTA delivery

- [ ] EAS Build/Update belongs to the intended owner/project; profile/channel/environment, public identifiers, native signing and reproducible CLI/package versions are recorded without credentials.
- [ ] Development/preview/production profiles are explicit; release-mode preview uses production export values on the isolated preview channel, with native parity/signing differences documented.
- [ ] appVersion/runtime and native/persisted-data compatibility gate prevents reuse of an incompatible shared runtime. A build-number-only bump is not treated as a runtime boundary.
- [ ] Real preview update activation, incompatible/interrupted download, cached/embedded offline startup and complete Island/Garden asset groups have release-mode evidence.
- [ ] No forced reload during draft/save/migration/challenge/purchase work; core tracking never waits for the update service.
- [ ] Known-good/embedded rollback was tested against current synthetic financial data; no claim that a code rollback undoes SQLite writes. Schema/data migrations require the planned native release.
- [ ] Production candidate has exact EAS build/update IDs, source revision, runtime/platform/environment/channel/branch, schema contract and reviewed promotion/rollout/recovery instructions.
- [ ] EAS update request/diagnostic metadata is included in the shipped dependency/privacy audit; no financial history is sent as update metadata.
- [ ] Production publishing/routing/rollout and store upload remain distinct explicit operator actions. No test accidentally altered production delivery.

## App Store materials and current requirements

- [ ] Final brand/name availability, publisher and bundle identifier are confirmed by the owner; name checks are not implied by this planning task.
- [ ] Supported iPhone/iOS versions, app version/build, icons, launch assets and orientations agree with actual device evidence.
- [ ] Current accepted Xcode/SDK requirements are checked at submission time; do not freeze a guessed deadline from this plan.
- [ ] Inspect the built archive's privacy manifests, required-reason API declarations and third-party SDK behavior; declare only accurate approved reasons.
- [ ] Privacy-label answers reflect actual collected/transmitted data, including SDK defaults. Do not assume “no data collected” solely because there is no custom backend.
- [ ] No tracking/ads SDK is included by default; any change has a separately reviewed product/privacy impact.
- [ ] Public privacy policy and support URLs work; policy accurately covers local financial records, Apple purchases and any diagnostics.
- [ ] App description, screenshots, age-rating/content answers and IAP metadata match shipped behavior. No price or all-future-themes promise was invented.
- [ ] Review notes explain no app account, manual-only tracking, offline data, how to test Pro/restore and both themes, and how to reach paid screens.
- [ ] Signed distribution build installs and the installed build passes core smoke/purchase tests. TestFlight/build identifiers and known limitations are recorded.
- [ ] Standard lint/typecheck/tests pass after final app changes; blocking issues and required device evidence are closed.

## Operator handoff and publication boundary

Save version/build/runtime, EAS project/profile/environment/channel/branch, binary/update IDs, schema compatibility, signing/build method, package versions, App Store product identifiers, test evidence and metadata/artifact locations. Never record signing secrets. Provide exact repeatable operator instructions for upload/TestFlight/review, including required roles and any remaining credential-dependent step.

Keep these states separate in PROJECT_STATUS: implementation complete; release checks complete; signed candidate prepared; uploaded to TestFlight; submitted for review; approved; live. A phase or build command does not establish later states. Owner authorization is required before upload/submission/publication or changing store pricing. Complete local reviewable preparation first.

Manual export/import and future theme sales are later work, not release checkboxes to invent now. Final future-theme rights do not block release 1.0 as long as no such rights are sold or promised.
