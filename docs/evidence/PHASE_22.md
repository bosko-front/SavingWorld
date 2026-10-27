# Phase 22 evidence: App Store release preparation and final handoff

Session date: 27 October 2026. State: **IN PROGRESS** (signed App Store build made and inspected, uploaded to TestFlight and processed; store materials entered in App Store Connect on the owner's go; installed-build smoke/purchase test, App Privacy, review contact and the remaining owner steps still open). Prompt: [PHASE_22](../prompts/PHASE_22.md). Decision: D146.

Release states now: implementation complete (Phases 01-21) · release checks **not** complete · **signed candidate prepared** (local build 7) · **uploaded to TestFlight** (build 7 VALID, internal testing) · **submitted for review by the owner** (review submission 4b88da3d, 2026-10-27 20:57 UTC: version 1.0.0 build 7 and Saving Worlds Pro, both WAITING_FOR_REVIEW; release type changed by the owner to automatic after approval) · not approved · not live.

## Starting point and dependencies

- Read v1.2 in full (textutil, all tables) and README, PRODUCT_REQUIREMENTS, SOURCE_RECONCILIATION, DECISIONS (to D145), DEVELOPMENT_RULES, PROJECT_STATUS, SESSION_HANDOFF, APPLE_SETUP, EAS_AND_OTA (runbook), RELEASE_CHECKLIST, the Phase 22 roadmap entry, PRIVACY.md and SUPPORT.md.
- Baseline `main` 2720be0, clean. Phase 21 VERIFIED COMPLETE (D145). HEAD differs from the release-candidate commit ce46419 only in docs, CLAUDE.md and `delivery/runtime-contracts.json` (no app source).
- Gate before work: `node scripts/release-check.mjs` PASS (runtime 1.0.0, fingerprint c83b89a5…, schema 5, stored-data contract unchanged).
- Owner answers this session (AskUserQuestion): store build = **local `eas build`** (no EAS quota); store name = **"Saving Worlds"**; TestFlight upload = **yes, internal testing only**; App Store Connect edits = **only after the owner reviews the drafts**. Later the owner gave the final screenshot headlines and order (see "Screenshots").

## Expected modules → actual files

| Planned | Actual |
| --- | --- |
| `app.config.ts` and EAS distribution profile | Unchanged: the existing `production` profile (store distribution, channel production, environment production, autoIncrement, remote version source) was correct; `ios.config.usesNonExemptEncryption: false` already sets export compliance |
| `store/` metadata drafts, screenshots, review notes | `store/README.md` (index, release states, manual submission procedure), `listing.en-US.json`, `review-notes.txt`, `age-rating.md`, `app-privacy.md`, `in-app-purchase.md`, `header/header-21x9.png` + `header-16x9.png`, `screenshots/en-US/01-05`, `screenshots/raw/`, `screenshots/shots.json`, `screenshots/preview.png`, `screenshots/iap-review-paywall.png`, `scripts/compose_header.py`, `scripts/frame_screenshots.py` |
| fixtures | `tests/native/store-fixture.ts` + `tests/integration/store-fixture.test.ts` (built by the real commands, like the Phase 20 drill fixture) |
| `docs/evidence/PHASE_22.md`, RELEASE_CHECKLIST, PROJECT_STATUS, SESSION_HANDOFF | This file and those documents |
| PRIVACY.md | Two lines added (user agent, preferred language) and the "Device information" sentence corrected; **local only, not pushed** |

No app source, native config, package or stored-data file changed: the native fingerprint is still c83b89a5… and runtime 1.0.0 stays valid.

## Current Apple requirements (rechecked 27 October 2026, official pages)

| Requirement | Source | Release candidate |
| --- | --- | --- |
| Build with Xcode 26+ and an iOS 26+ SDK (since 28 April 2026) | developer.apple.com/news/upcoming-requirements | PASS: Xcode 27.1 (27A9275), SDK iphoneos27.1 (both EAS and local) |
| Target iOS 13 or later (since 9 September 2026) | same | PASS: MinimumOSVersion 16.4 |
| New age-rating questionnaire (since 31 January 2026) | same; "Age ratings values and definitions" | Answers drafted, expected 4+ (`store/age-rating.md`) |
| Privacy manifest: approved reasons for required-reason APIs | same; privacy manifest docs | PASS: every required-reason API in the archive has a declared reason (below) |
| Screenshots: at least one for "iPhone with Dynamic Island (medium display)" (1206 × 2622 or 1179 × 2556); ≤ 10; PNG/JPEG without alpha. iPhone Duo screenshots: required from April 2027 for iOS 27.1 SDK apps, optional now (adds a Duo badge) | "Screenshot specifications" | Five 1206 × 2622 RGB PNG, no alpha. Duo screenshots not made (optional) |
| Product page header (creative asset, iOS 27): 3840 × 1646 (21:9, JPEG/PNG) or 5244 × 2950 (16:9, PNG), no alpha; no price, URL, copyright symbol, awards, other platforms; 4+ | "Creative assets specifications", "App Store asset best practices" | Both sizes made, RGB, no text |
| IAP metadata: display name 2-30, description ≤ 45, review screenshot required, review notes ≤ 4,000 | "In-App Purchase information" | Existing product fits; review screenshot made, not uploaded |
| Listing limits: promotional text 170, description 4,000, keywords 100 bytes (each > 2 chars), review notes 4,000 bytes; name and subtitle 30 | "Platform version information" | 159 / 1,984 / 90 bytes / 2,032 bytes; name 13, subtitle 24 |
| App Privacy: disclose data collected by third-party SDKs unless all optional-disclosure criteria hold | "App privacy details on the App Store" | Drafted: Device ID + Crash Data via EAS Update, not linked, no tracking (`store/app-privacy.md`) |

## Release-candidate archive inspection (9a42b94e device IPA, same fingerprint as the store build)

- 16 `PrivacyInfo.xcprivacy` files (app, React, ReactNativeDependencies boost/folly/glog/SocketRocket, React-cxxreact, React-timing, ExpoApplication, ExpoConstants, ExpoLocalization, ExpoNotifications, ExpoSystemUI, ExpoFileSystem, EASClient, ReachabilitySwift). `NSPrivacyTracking` false and `NSPrivacyCollectedDataTypes` empty in every one; no tracking domains. Required-reason APIs: UserDefaults CA92.1; file timestamp C617.1, 0A2A.1, 3B52.1; system boot time 35F9.1; disk space E174.1, 85F4.1.
- Info.plist: no usage-description keys (no camera, photos, location, contacts, tracking prompt); `ITSAppUsesNonExemptEncryption` false; ATS `NSAllowsArbitraryLoads` false with Expo's default `NSAllowsLocalNetworking` true (no local-network prompt, nothing listens; accepted); URL schemes `savingworlds`, `com.bosko123.savingworlds`, `exp+saving-worlds`; iPhone only (`UIDeviceFamily` 1), all four orientations; light appearance.
- Entitlements: application identifier and team only, `get-task-allow` false; no `aps-environment` (local notifications only), no iCloud, no associated domains.

## Signed App Store build (local `eas build`, owner's choice)

| Item | Value |
| --- | --- |
| Command | `npm run eas -- build --platform ios --profile production --local --output <scratch>/SavingWorlds-production.ipa` (pinned eas-cli 25.3.0, plugin eas-cli-local-build-plugin 25.3.0), with the team API key through `EXPO_ASC_*` environment variables only; `EXPO_APPLE_TEAM_TYPE=INDIVIDUAL` |
| Toolchain | the owner's Mac (Darwin 27.0), Xcode 27.1 (27A9275), SDK iphoneos27.1, CocoaPods 1.17.0 (the same as the EAS image of the RC), fastlane 2.241.2 (EAS RC used 2.240.1), Node from the host |
| Source | `main` 2720be0 plus uncommitted non-app files (store fixture, store/ drafts); app JavaScript identical to ce46419 |
| Result | `SavingWorlds-production.ipa` (copied to `dist/store-builds/SavingWorlds-1.0.0-7.ipa`, git-ignored), 37,876,358 bytes, SHA-256 `d5e149c459b2499271dd54a83f78db86ef7baf863a878912313d48be112283be`; not in the repository |
| Identity | `com.bosko123.savingworlds`, version **1.0.0**, build **7** (EAS remote counter; it advanced on each attempt: 2-6 were attempts stopped before compiling, none produced a binary) |
| Signing | "iPhone Distribution: Bosko Jaksic (86J9LHRPM3)" (existing distribution certificate, serial 5C9E695B…, expires 26 October 2027); provisioning profile "*[expo] com.bosko123.savingworlds AppStore 2026-10-27T17:22:36Z" (App Store, `beta-reports-active` true, `get-task-allow` false, expires 26 October 2027); push not set up (answered No) |
| Delivery config | `Expo.plist`: runtime 1.0.0, channel **production**, update URL `u.expo.dev/25d3089f…`, check ALWAYS, launch wait 0 ms; embedded update ID `055a9754-67c7-4bc2-8032-f9a8978adae7` |
| Native contract | `npx expo-updates fingerprint:generate --platform ios` on the build tree = **c83b89a5d24660fbb150b4b77e20fdf4c969aee3** = runtime 1.0.0's recorded fingerprint; schema 5 |
| Compared with RC 9a42b94e | All 16 privacy manifests byte-identical; same file list; Hermes bundles differ only by the build machine's folder path embedded in the bytecode (`/Users/expo/workingdir/...` vs the local temp folder), which shifts offsets. No content difference |

Not recorded in `delivery/runtime-contracts.json`: `--record` needs EAS's fingerprint for an EAS build ID, and a local build has none on EAS. This record and the matching local fingerprint stand in for it; the next production build made on EAS can be recorded normally.

Attempts and incidents (kept for the record): (1) non-interactive mode refused to create credentials; (2) the interactive run stopped at the team-type menu; (3) a stop pattern in my `expect` wrapper matched an info line; (4) the push-notification question needed "No"; (5) installing fastlane with Homebrew upgraded Homebrew Ruby to 4.0.9 and broke CocoaPods 1.16.2 (`ffi` gem); fixed by `brew reinstall cocoapods` (now 1.17.0). Two leftover Phase 21 throwaway simulators ("SW P21 Perf SE", "SW P21 E2E") were shut down (not deleted) because they kept the Mac at load ~800.

## TestFlight upload

**DONE (27 October 2026, owner's go: "upload build 7 to TestFlight with eas submit, internal TestFlight only").** The first attempt in this session was refused by the session's permission guard; after the owner's renewed instruction:

- `npm run eas -- submit --platform ios --profile production --path dist/store-builds/SavingWorlds-1.0.0-7.ipa --non-interactive --wait` (IPA SHA-256 d5e149c4… checked before the upload). The first run failed with "App Store Connect API Keys cannot be set up in --non-interactive mode": EAS Submit does not read the `EXPO_ASC_*` variables. The second run added `ascApiKeyPath`, `ascApiKeyId` and `ascApiKeyIssuerId` to `eas.json` `submit.production.ios` **only for that run** and restored the file afterwards (`git diff eas.json` empty); the key IDs stay out of the repository (APPLE_SETUP).
- EAS submission [fd39a684](https://expo.dev/accounts/bosko123/projects/saving-worlds/submissions/fd39a684-212d-4f05-b032-a03078f033e7): uploaded to EAS 20:55, waited in the free-plan queue ("Waiting to start", about 40 minutes), then "Submitted your app to Apple App Store Connect".
- App Store Connect build `8ca5f60d-30af-44ee-9233-1e9ccd5d5284`: version 1.0.0 (7), uploaded 2026-10-27T13:35:59-07:00, processing **VALID**, `usesNonExemptEncryption` false (answered by the binary). TestFlight: internal state IN_BETA_TESTING in the internal group "My group" (all builds, 1 tester, auto-notify on); external state READY_FOR_BETA_SUBMISSION, **not** submitted for beta review.
- Build 7 is attached to App Store version 1.0.0. No review submission.

## Store materials

All drafts in `store/` (index: [store/README.md](../../store/README.md)). Claims checked against the shipped behavior:

- Listing: name "Saving Worlds", subtitle "Grow a world as you save", Finance / Lifestyle, Privacy Policy and Support URLs (live since D137), copyright "2026 Bosko Jaksic". The description names only what Release 1.0 does: one goal Free with the complete Island, all three quests and the reminder; Pro = unlimited goals, Garden, Island/Garden per goal, Savings insights (the R18 list); one-time purchase, no subscription; no backup/sync, data only on the iPhone; "does not give financial advice". No price, no future themes.
- Review notes: no account, offline, how to reach the Pro screen three ways, Restore on the same screen, network use (StoreKit and EAS Update only).
- Age rating: every item None/No; expected 4+.
- App Privacy: Identifiers › Device ID (EAS Update's random install ID) and Diagnostics › Crash Data (one error message after a failed launch), both not linked and not used for tracking; purposes App Functionality (+ Analytics for the Device ID as the conservative reading, owner choice). "Data Not Collected" is not recommended.
- PRIVACY.md: now lists the user agent (app name/build and iOS network version) and preferred language that iOS adds to update requests (the item open since Phase 20); needs owner approval and a push.
- In-App Purchase: product unchanged (Non-Consumable, US$7.99 final, Family Sharing off); review screenshot `store/screenshots/iap-review-paywall.png` (the release build's Pro screen on the simulator: "Unlock Pro for $7.99" from the App Store sandbox storefront, Restore Purchases, Not now). Localized price display: the button shows StoreKit's `displayPrice`; observed $7.99 (US sandbox) this session and in Phase 15.

## Screenshots and header

- Build and device: RC simulator build **5e207eba** (Release, production export, runtime 1.0.0) on a new throwaway simulator "SW P22 Store" (iPhone 17 Pro, iOS 27.0, UDID 236BDD72…, region en_US, 12-hour clock, status bar overridden to 9:41 / full battery). Synthetic data only.
- First pass (5 screens: Home 63%, Add savings with keyboard, Weekly step quest, History 7 entries, Settings) was replaced at the owner's request ("App Store Screenshots Final Polish"): exact headlines and order, Collection instead of Settings, nothing clipped, keyboard avoided.
- Final data: `store-fixture.ts` (no deadline, so Home ends at the milestone card; Next milestone instead of Weekly step; five entries so History ends above the tab bar). Hand-worked: B = 450 + 375 − 60 + 450 = 1,215.00 (81%), quest threshold ceil(150,000 × 9 / 10) = 135,000 → target 135.00, + 85.00 = 1,300.00 (86%), quest 85.00 of 135.00. Jest `store-fixture.test.ts` PASS; the app showed exactly these numbers.
- Collection: the same goal finished in the app (Add savings $200.00 → "Your island is complete! Its souvenir is now in your Collection." → ⋯ › Finish goal → "Your world is finished"), Collection "Summer trip · Island · Oct 27, 2026 · Completed". Every edit went through the real UI; the two cancelled forms saved nothing (History stayed at 5 entries, $1,300.00, before the finishing deposit).
- Exports: `store/screenshots/en-US/01-home.png` "Watch your savings come to life", `02-add-savings.png` "Every little saving counts", `03-challenges.png` "Make saving a little adventure", `04-history.png` "Keep track of every step", `05-collection.png` "Every goal becomes a world": each 1206 × 2622, RGB, no alpha, 220-989 KB. `preview.png` shows all five and a thumbnail strip (headlines readable at ~140 px width).
- Optional 6th (Garden Pro, "Unlock a whole new world"): **dropped by the owner** (27 October). It would have needed a real sandbox purchase, never a seeded entitlement.
- Header: `store/header/header-21x9.png` (3840 × 1646) and `header-16x9.png` (5244 × 2950), RGB: the approved stage 10 Island and Garden renders side by side on the icon's sky, no text. A first version with a drop shadow read as a grey box and was removed. **Owner approved the five screenshots and the header as shown (27 October 2026).**

## App Store Connect entry (27 October 2026, owner's go)

Owner: "you can upload the screenshots, headers and everything else to App Store Connect" (no submission asked). Entered with the App Store Connect API (team key, ES256 JWT; scripts in the session scratchpad, not in the repository), each value read back:

| Item | Result |
| --- | --- |
| Version | 1.0 renamed to **1.0.0**, copyright "2026 Bosko Jaksic", release type MANUAL, build 7 attached |
| App info (en-US) | name "Saving Worlds", subtitle "Grow a world as you save", Privacy Policy URL (HTTP 200); categories Finance / Lifestyle; content rights "does not use third-party content" |
| Version text (en-US) | keywords and support URL (HTTP 200) from `store/listing.en-US.json`. The description and promotional text were then **rewritten by the owner in App Store Connect** ("leave them as they are"); not touched again; copied back into `store/listing.en-US.json` (1,915 and 154 characters) so the repository matches |
| Age rating | every answer None/No per `store/age-rating.md`; computed rating **4+** (`FOUR_PLUS`) |
| Screenshots | the five approved files in `APP_IPHONE_61` (iPhone with Dynamic Island, medium), order 1-5, all COMPLETE 1206 × 2622. iPad: not needed (`supportsTablet: false`, `UIDeviceFamily` [1]) |
| Header | App Asset Library (CREATIVE_ASSETS): `header-21x9.png` as PRODUCT_PAGE_HEADER_ASSET and the universal `header-16x9.png` (Apple's 5244 × 2950 spec) as APP_STORE_SEARCH_RESULTS_ASSET, both placements ACTIVE on the en-US version |
| IAP | review screenshot `iap-review-paywall.png` uploaded (COMPLETE 1206 × 2622); Saving Worlds Pro state MISSING_METADATA → **READY_TO_SUBMIT**. It is added to the review together with version 1.0.0 at submission |
| App Review information | **not saved**: Apple requires contact first/last name, email and phone (+country code) together with the notes; the owner's phone number is not known to the agent. `store/review-notes.txt` is ready to paste |
| App Privacy | not available in the API; owner enters `store/app-privacy.md` manually |
| Pricing and availability | not changed (no pricing change without the owner's explicit instruction) |

The optional sixth (Garden) screenshot was **dropped by the owner** ("we won't do the Garden, forget it"); the listing keeps the five approved screenshots.

## Production update promotion record (prepared, not executed)

No production update is published with the launch: the store build's embedded bundle (update ID 055a9754…) is the baseline. For the first later JS fix, the runbook in [EAS_AND_OTA](../EAS_AND_OTA.md) "Production promotion" applies unchanged, with these Phase 22 facts:

| Item | Value |
| --- | --- |
| Runtime / platform | 1.0.0 / ios (fingerprint c83b89a5…, schema 5) |
| Channel → branch | production → production (the channel does not exist on EAS yet: no EAS production build and no update were made; create it with the first EAS production build or `eas channel:create production` when publishing, owner action) |
| Environment | production (same as preview builds) |
| Tested artifact | a preview update group verified on the RC (5e207eba simulator / 9a42b94e device) and then on a TestFlight install |
| Gate | `node scripts/release-check.mjs --eas --publish` exit 0 |
| Rollout | `update:republish --group <tested group> --destination-channel production --rollout-percentage 10`, ≥ 24 h, then 50 / 100 by `update:edit`, each recorded |
| Stop / recovery | `update:revert-update-rollout`, republish previous production group, or `update:roll-back-to-embedded --branch production --runtime-version 1.0.0` |
| Schema rule | any migration or stored-meaning change = new app version and native build, never an OTA |

## Checks

| Check | Result |
| --- | --- |
| `node scripts/release-check.mjs` (start) | PASS (exit 0) |
| `npm run lint` | PASS (exit 0) |
| `npm run typecheck` | PASS (exit 0) |
| `npx jest tests/integration/store-fixture.test.ts` | PASS 1/1 |
| `npm test -- --runInBand` | PASS: 62 suites, 1,626 passed, 1 env-gated skip (exit 0) |
| `node scripts/release-audit.mjs` (final tree) | PASS A1-A6 (exit 0) |
| `node scripts/release-check.mjs` (final tree) | PASS (exit 0): runtime 1.0.0, fingerprint c83b89a5…, schema 5, stored-data contract unchanged |
| Archive inspection (RC and store build) | PASS (above) |
| Store build fingerprint vs runtime contract | PASS (c83b89a5…) |
| TestFlight upload | PASS: build 7 VALID, internal testing (EAS submission fd39a684) |
| App Store Connect entry | PASS except App Review contact/notes (needs the owner's phone) and App Privacy (manual) |
| Installed TestFlight build 7 on the owner's iPhone | PASS (owner-reported, 27 October: "it works, the app is all OK"); itemized airplane-mode and purchase/Restore results were not reported separately. The internal invite stayed INVITED until the owner opened TestFlight with the same account |
| `deps:check` / `doctor` | NOT RUN (no dependency change) |
| `test:db`, `test:storekit`, `test:e2e` | NOT RUN (no app change since Phase 21) |

## Blocking items for release-ready

1. Done (owner-reported): build 7 installed from TestFlight and working on the owner's iPhone. The owner filled App Review information and App Privacy and submitted version 1.0.0 themselves; confirmed through the API: review submission 4b88da3d WAITING_FOR_REVIEW (submitted 2026-10-27T20:57:04Z), version 1.0.0 build 7 WAITING_FOR_REVIEW, IAP WAITING_FOR_REVIEW, review contact and notes filled. The owner set release type to **AFTER_APPROVAL** (goes live automatically when approved), replacing the agent's MANUAL. The agent submitted nothing.
2. Done by the owner: App Review information and App Privacy (entered before submitting). PRIVACY.md wording change is still a local edit; push it so the published policy matches.
3. Apple's review result (approved → live automatically, or rejected → address and resubmit).
4. Not live until the product page is public.
5. Accepted limitations still to be acknowledged for release (D145): itemized VoiceOver, Instruments profiling, a real Sunday reminder, physical Duo, icon/launch look on the store build.
6. Submission: done by the owner (above). Duo screenshots are required only from April 2027 (27.1 SDK).

## Decisions

D146 (this phase): store build made locally on the owner's choice, store name "Saving Worlds", App Privacy approach, screenshot pipeline and data rules, header, PRIVACY.md wording; no product rule changed.
