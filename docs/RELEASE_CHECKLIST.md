# Release checklist

Product authority is [MVP plan v1.2](Saving_Worlds_MVP_Plan_v1_2.docx). Q01-Q06 are resolved. This is a future release gate, not an assertion that the app is ready. Initially every app item is unchecked. Phases 21/22 attach evidence rather than checking boxes from memory. Recheck current official sources from [TECH_STACK](TECH_STACK.md) before submission.

## Product and financial correctness

- [ ] R01-R26 have implementation and test evidence linked from status and the test plan.
- [ ] Free: one goal in total in any status (active, paused or completed), one finished world in Collection, delete and start over, Pause, Island, all three fixed challenges, shared ledger/history and exact inclusive-day deadline estimates (D74). A second Create shows the "Build another world" paywall entry.
- [ ] Pro lifetime: unlimited goals and finished worlds, complete Garden, simple open-goal Island/Garden switching and four precise statistics. Fixed challenges identical to Free; no custom editor/schedule/pause.
- [ ] One global currency from onboarding/Settings, locked with any transaction or souvenir; no goal picker/FX. Positive entry amounts, no future dates, chronological nonnegative subtotals, edits/confirmed deletes and overfunding pass native tests; no audit versions.
- [ ] Both themes have the exact base plus ten unlocks, production-approved licensed assets, bounded animations and accessible descriptions.
- [ ] First saved>=100% gives one permanent souvenir even Free, without status change. Explicit Finish/Reopen, completed read-only guards, paused editing, the one-goal Free limit and confirmed whole-goal deletion (goal, entries and souvenir removed, exact confirmation copy, no undo, no Archive or Close goal; D74) pass. Challenge eligibility/frozen attempts/history never creates duplicate money or reactivates past attempts.
- [ ] Four Pro statistics exactly match all-goal current total, current-month gross inflow/outflow, all-goal daily balance for last 30 days including opening balance across all existing goals (deleted goals excluded), and count status=completed.
- [ ] No backup/export/import/sync, custom/advanced challenges, extra schedules, advanced gamification/forecasts, scene editor, accounts or future-theme promises entered scope.

## Setup styling and adaptive platform foundation

- [ ] Initial setup used the latest stable Expo SDK with compatible locked packages and a recorded toolchain/install matrix; no forced peer mismatch or silent downgrade.
- [ ] App palette and typed tokens are centralized; shared native controls have verified contrast, dynamic text, loading/disabled/error behavior and coherent supported appearance.
- [ ] All feature screens use shared layout/inset policy rather than model-specific widths or a global scale function.
- [ ] Duo outer/open, supported orientations and inner split view on either side have native evidence; native bars/side insets do not cover financial controls or sheet actions. Inner split view (app left and right, divider drag) must be checked on a **physical iPhone Duo**: the Xcode 27.1 Device Hub simulator offers no split-view control (DECISIONS D48). Also rotate an ordinary iPhone and fold/unfold/rotate the Duo with a typed draft in the Add/Edit Entry form: draft, kind, date and operation ID kept, no extra ledger write (DECISIONS D63).
- [ ] Required partial-fold/tabletop behavior and physical-only gaps are tested before claiming complete Duo support; no guessed fold coordinate or required hinge effect.
- [ ] ArrangementView/RNHostView integration and older-iOS fallback are verified; no experimental split-view/navigation dependency entered scope accidentally.
- [ ] Repeated resizing while editing preserves draft, route, selection and operation ID and creates no additional financial mutation.

## Native storage and recovery

- [ ] Supported-schema migrations, failure rollback, unknown-schema state, restart, stale edits, repeated submit and 10,000-entry fixtures pass on actual Expo SQLite.
- [ ] No automatic wipe/reinitialize on storage failure; retry/recovery copy is usable and diagnostics redact financial content.
- [ ] App sandbox/file protection behavior is appropriate for the tested locked-device/foreground cases.
- [ ] Data explanation states local storage/app deletion risk and OS backup limitations; no backup/sync guarantee or fake import/export action.
- [ ] Restore Purchases clearly restores paid rights, not savings records. Nothing is deleted or changed on confirmed loss; with several goals the person chooses one to keep using and the others stay visible but read-only until Pro returns or they are deleted; a Garden goal stays as it is and continues only after switching to Island; Garden souvenirs retained (D74). Temporary offline failure alone retains prior verified rights.

## Purchases and notifications

- [ ] Final Pro price/storefronts/product ID are owner-approved. Product type is non-consumable, and the store's localized price is shown. Product ID approved and created without price (`com.bosko123.savingworlds.pro.lifetime`, D113); price, Paid Applications agreement and review screenshot pending ([APPLE_SETUP](APPLE_SETUP.md)).
- [ ] Native verified/unverified states, pending/cancelled/error, finish/replay, reinstall restore, offline startup and revocation pass StoreKit and sandbox/TestFlight checks.
- [ ] Paywall and Settings expose Restore Purchases; current entitlement queries do not repeatedly prompt for an Apple password at startup.
- [ ] Future premium-theme entitlement rules/prices remain unresolved without misleading sales promises; no future products were accidentally offered.
- [ ] One optional global Sunday 18:00 device-local reminder only with an active goal passes opt-in/denial/cancel/reconcile/tap/timezone tests on a **physical iPhone** (Phase 14, deferred by D109 to Phase 19 and repeated in Phase 21: permission dialog after opt-in, foreground/background/terminated delivery, tap → Home including cold start, cancel by switch off and Pause, denial → app notification settings, VoiceOver of the switch, felt haptic). No per-goal/per-challenge time/cadence controls.
- [ ] All production capability bypasses and native test routes are removed/excluded from distribution.

## Usability and performance

- [ ] Onboarding explicitly explains manual tracking and absence of actual money transfers.
- [ ] VoiceOver, Dynamic Type, contrast, touch sizes, Reduce Motion, chart text alternatives and keyboard/focus behavior pass on supported devices. Includes the Phase 06 VoiceOver walkthrough on a **physical iPhone**: onboarding, Create/Edit Goal errors, lifecycle and currency toasts announced once without moving focus, Settings currency lock (DECISIONS D60). Also the Phase 07 VoiceOver walkthrough of the Add/Edit Entry form and History: labels and inline errors, kind and date controls, History row labels, the delete confirmation and each ledger toast announced once without moving focus; ledger haptics felt once per commit/rule rejection (DECISIONS D63).
- [ ] English catalog is complete; currency/date formatting and longer/RTL-ready layouts are verified without claiming untranslated language support.
- [ ] Airplane-mode core journeys and already verified Pro features work without an app login.
- [ ] Release build launch/query/frame/memory measurements meet the documented device budgets or a reviewed adjustment. Includes the Phase 09 Island scene on a **physical iPhone**: decoded image memory and frames from stage 0 to complete, stage changes and the full-bleed Home scroll (deferred by D83 to Phase 21; simulator figures only so far).
- [ ] VoiceOver of the world scene on a **physical iPhone** (Phase 09, deferred by D83 to Phase 19 and repeated in Phase 21): one labelled image with stage and description, silent layers, hidden empty-state illustration, fallback and the "Your island is complete!" card.
- [ ] Phase 11 Collection on a **physical iPhone** (deferred by D102 to Phase 19, repeated in Phase 21): VoiceOver reads each Collection card (title, status, "Finished island · earned …") and the souvenir detail (historical world label, Souvenir then / Goal now rows, Reopen and Delete with the confirmation), hears "Your island is complete! Its souvenir is now in your Collection." once; the success haptic of the first 100%, Finish, Reopen and Delete and the warning of a refused Reopen are felt once.
- [ ] Phase 13 Challenges on a **physical iPhone** (deferred by D107 to Phase 19, repeated in Phase 21): VoiceOver reads the quest radios with their checked state, Start inside the chosen card, the reasons of quests that can't start, the active card's amounts and progress bar, the "How quests work" info button, the collapsible "Past quests, {n}" heading and rows, the one completion announcement and the reached-target hero. Felt haptics: selection on a changed choice, one success for a quest completed from Challenges, none for Start or Skip. Phase 21: the active bar's glide and the reached-target sparkle measured for frames and energy.
- [ ] Phase 18 Savings insights on a **physical iPhone** with Pro (deferred by D133 to Phase 19, repeated in Phase 21): VoiceOver reads the headline total, both month cards, the chart as one adjustable element whose value is the selected day and its balance (swipe up/down steps through the 30 days), the Net change card, the Daily balances toggle state and rows, and the Completed goals row; the selection haptic while scrubbing is felt once per day; the chart reflows on Duo.
- [ ] Phase 10 unlock moment on a **physical iPhone** (deferred by D88 to Phases 19 and 21): device recording/frame inspection of the unlock, rapid deposits and backgrounding mid-moment; VoiceOver hears the milestone message once; the milestone haptic is felt once and the success haptic is not.
- [ ] Collection card float (D100) included in the Phase 21 physical-iPhone measurement with many souvenirs; static cards if it costs too much.
- [ ] Phase 10.5 ambient motion measured on a **physical iPhone** (Phase 21, D90): energy, memory and smoothness with ambient on vs off in Xcode Instruments; kept only if acceptable, otherwise water simplified first, then ambient switched off (static Island).
- [ ] Empty/error/complete/overfunded/paused/read-only-after-loss/offline/store-unavailable states are present and tested.

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
- [ ] Supported iPhone/iOS versions, app version/build, icons, launch assets and orientations agree with actual device evidence. The app icon (light/dark/tinted) and launch screen are the owner-approved Phase 19.5 art (D114), no Expo placeholder; their physical-iPhone look is checked on the release candidate (Phase 21).
- [ ] Current accepted Xcode/SDK requirements are checked at submission time; do not freeze a guessed deadline from this plan.
- [ ] Inspect the built archive's privacy manifests, required-reason API declarations and third-party SDK behavior; declare only accurate approved reasons.
- [ ] Privacy-label answers reflect actual collected/transmitted data, including SDK defaults. Do not assume “no data collected” solely because there is no custom backend.
- [ ] No tracking/ads SDK is included by default; any change has a separately reviewed product/privacy impact.
- [ ] Public privacy policy and support URLs work; policy accurately covers local financial records, Apple purchases and any diagnostics. Phase 19 (D134) shows no privacy/support link in the app until Q09 gives real destinations. D137: `PRIVACY.md`/`SUPPORT.md` are live on GitHub Pages (https://bosko-front.github.io/SavingWorld/PRIVACY.html, …/SUPPORT.html, both 200) and linked from Settings › About; entering them in App Store Connect is pending the owner; Settings "Your data" already explains local records, purchases and updates.
- [ ] App description, screenshots, age-rating/content answers and IAP metadata match shipped behavior. No price or all-future-themes promise was invented.
- [ ] Review notes explain no app account, manual-only tracking, offline data, how to test Pro/restore and both themes, and how to reach paid screens.
- [ ] Signed distribution build installs and the installed build passes core smoke/purchase tests. TestFlight/build identifiers and known limitations are recorded.
- [ ] Standard lint/typecheck/tests pass after final app changes; blocking issues and required device evidence are closed.

## Operator handoff and publication boundary

Save version/build/runtime, EAS project/profile/environment/channel/branch, binary/update IDs, schema compatibility, signing/build method, package versions, App Store product identifiers, test evidence and metadata/artifact locations. Never record signing secrets. Provide exact repeatable operator instructions for upload/TestFlight/review, including required roles and any remaining credential-dependent step.

Keep these states separate in PROJECT_STATUS: implementation complete; release checks complete; signed candidate prepared; uploaded to TestFlight; submitted for review; approved; live. A phase or build command does not establish later states. Owner authorization is required before upload/submission/publication or changing store pricing. Complete local reviewable preparation first.

Manual export/import and future theme sales are later work, not release checkboxes to invent now. Final future-theme rights do not block release 1.0 as long as no such rights are sold or promised.
