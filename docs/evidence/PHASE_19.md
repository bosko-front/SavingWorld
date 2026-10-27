# Phase 19 evidence: accessibility, localization and Settings review

Session date: 27 October 2026. Phase state: **VERIFIED COMPLETE by owner decision D138** (27 October 2026). The owner reported that VoiceOver (D135), the felt haptics, the weekly reminder on a physical iPhone and the Duo checks all work; these are owner-reported, not itemized. Earlier state, kept for history: IN PROGRESS (code, automated and simulator work done; the mandatory physical-iPhone VoiceOver/haptics/notification checks, the Duo matrix and the Q09 privacy/support destinations are not done). Next prompt: [PHASE_19_5](../prompts/PHASE_19_5.md).

Baseline: `main` at fcdd83c (Phase 18), clean working tree. Changes are uncommitted. Product authority: [MVP plan v1.2](../Saving_Worlds_MVP_Plan_v1_2.docx), read in full with `textutil` this session; D74, D75 and D119 respected. Decision recorded: D134 (engineering, no product rule changed).

## Dependency verification

- Phase 18 is verified complete (D133) and its code is present: `/statistics`, `StepChart`, Pro-only entries. Settings had Preferences, Reminders, Pro (one Restore on the Pro screen, D126) and About, but no explanation of local data or device loss.
- The global currency is edited only in Settings (`currency-settings.tsx`) and onboarding, through `setGlobalCurrency`. The lock covers any transaction or souvenir and is re-checked inside the exclusive transaction. Empty-goal targets keep their number with no conversion. The goal form shows the currency as read-only text, with no picker. Covered by existing Jest tests and T27 / native scenarios; nothing changed here.
- Weekly reminder: one Settings switch, Sunday 18:00 local time. The denial path (notice and Open Settings) leaves saving usable (Jest, `reminder-ui.test.tsx`). The simulator SE shows the "on but denied" state (screenshot 00).
- No network code in `src/`: no `fetch`, `XMLHttpRequest` or `WebSocket`. The app goes online only through StoreKit (expo-iap) and expo-updates (`checkAutomatically: ON_LOAD`). The "Your data" text describes exactly that and does not claim "no data collected".

## What changed

| Area | Change | Files |
| --- | --- | --- |
| Settings "Your data" (R23) | New section between Pro and About with two static rows and a short line; the info button opens "About your data". It covers the local database, no account, online only for purchases and updates, no backup/export/sync, deleting the app or losing the iPhone can remove records for good, iOS/iCloud backups are not an app promise, and Restore brings back Pro, not goals. There is no backup/export/import/sync control. Privacy and support links are not shown (Q09 pending). | `src/features/settings/presentation/local-data-settings.tsx`, `settings-copy.ts`, `src/app/(tabs)/(home)/settings.tsx` |
| English catalog | About 210 inline strings moved, unchanged, into `*-copy.ts` modules and `src/shared/i18n/` (`common-copy`, `navigation-copy`, `chart-copy`). The ESLint `catalogGuardrails` now refuse inline text in `.tsx` outside dev tools. Navigation titles and tab labels come from `SCREEN_TITLES`/`TAB_LABELS`. `ONBOARDING_COPY` moved to `onboarding-copy.ts`. The Phase 03 sample `details` route now sits inside the `__DEV__` guard. | `eslint.config.js`; goals, ledger, statistics, challenges, collection, worlds, settings, bootstrap, app layouts |
| VoiceOver focus | `useAccessibilityFocusOnChange` moves VoiceOver to the new title after an onboarding step change, a quest Start/Skip/end, and the paywall's Explore Pro or a purchase. | `src/shared/ui/accessibility-focus.ts`, `app-text.tsx` (`ref`), onboarding, challenges, paywall |
| Spoken form errors | `Notice announce`: form errors are spoken once when they appear (entry, goal, onboarding, currency, keep-goal, theme picker), and so is "Pro is unlocked". The goal form's world error is now an error notice instead of plain red text. | `notice.tsx`, forms |
| World scene | The fallback is reachable: the region is one image only while the art is drawn, and the fallback has one message element plus Try again (the Try again button was hidden inside the image). | `world-scene.tsx`, `world-copy.ts` |
| Unlock message | Button role, hint "Dismisses the message.". Under Reduce Motion it enters and leaves without animation, read live (Reanimated reads its own value only at launch). | `unlock-banner.tsx` |
| Dynamic Type | `AmountText display` steps down to the large title above 1.35× text (Home and souvenir amounts). The theme picker title is no longer cut to 2 lines. The paywall product line wraps. | `amount-text.tsx`, `theme-picker-screen.tsx`, `paywall-screen.tsx` |
| Touch / labels | The savings-plan info button now has a 44 pt target; "Savings needed" is read once; the paywall spinner is hidden next to its text; the reminder switch is disabled while saving; the onboarding strip reads its three captions. | `savings-plan-cards.tsx`, `paywall-screen.tsx`, `reminder-settings.tsx`, `onboarding-copy.ts` |
| History sign | `formatMoney` places "+"/"-" itself, because Hermes ignores Intl `signDisplay` and deposits showed no "+". | `src/core/money/format-amount.ts` |
| RTL readiness | Notice and toast accents and row insets use start/end. The world art area and the step chart are pinned LTR. Chevrons rotate the other way in RTL. | `notice.tsx`, `toast.tsx`, `list-row.tsx`, `collection-screen.tsx`, `home-screen.tsx` (one margin), `world-scene.tsx`, `line-chart.tsx`, challenges/statistics |
| Tests | `tests/unit/english-catalog.test.ts` (367 catalog strings), `tests/unit/locale-formatting.test.ts` (en-US, de-DE, fr-FR, en-GB; exponents 0/2/3; signs incl. an engine ignoring `signDisplay`; dates; 12/24 h), `tests/integration/accessibility-settings.test.tsx` (Your data, no backup control, focus move, spoken notice, display step-down), I01 asserts "+€5.00" on Hermes; three ledger tests and one goal test now expect the spoken error notice (no toast). | tests |

Home (D97: changes need an owner request): only the catalog move, one `marginStart` and the large-text step-down of the saved amount (no change at default sizes) touched Home, plus the 44 pt info target and the single reading of "Savings needed" in the savings plan. No visual direction changed.

## Verification

| Check | Environment | Result | Notes |
| --- | --- | --- | --- |
| `npm run lint` | macOS, Node 22 | PASS (exit 0) | After the last edits, including the new catalog guard. |
| `npm run typecheck` | same | PASS (exit 0) | One test typing error found in the first run and fixed. |
| `npm test -- --runInBand` | Jest, host `node:sqlite` | PASS: 55 suites, 1545 passed, 1 skipped (env-gated) | Was 1161 in Phase 18; +367 catalog, +7 locale, +4 accessibility tests and others. Before fixing: 4 failures, where tests expected no announcement on a form error; updated to expect the spoken notice and still no toast. Only one test file was edited after that (a type fix), and it re-ran 4/4 PASS. |
| `npm run test:db -- --device <SE iOS 18.5> --record docs/evidence/phase-19/test-db-se-ios18.5.json` | SW iPhone SE 3 iOS 18.5, dev build 7769c486, Metro, Hermes | PASS 55/55 + R2 | I01 now asserts the deposit sign "+€5.00" on Hermes: PASS. |
| Simulator look: Settings at default (L) and accessibility XXXL | SE iOS 18.5 | PASS | [00](phase-19/00-se-settings-top-large.png), [01](phase-19/01-se-settings-your-data-large.png), [02](phase-19/02-se-settings-your-data-axxxl.png), [03](phase-19/03-se-settings-your-data-axxxl-rows.png): calm grouped rows, no clipping; titles wrap. |
| Simulator: Home amount at AX XXXL | SE iOS 18.5 | PASS | [04](phase-19/04-se-home-amount-axxxl.png): "RSD 1,500.00" in the large title, wrapping between code and digits. |
| `deps:check` / `doctor` | — | NOT RUN | No dependency or native change. |
| Release export | — | NOT RUN | No change to development-only tool loading; `details` now behind `__DEV__`. |
| Physical-iPhone VoiceOver walkthroughs (D60, D63, D83, D88, D102, D107, D109, D133) | Owner's iPhone | **PASS (owner-reported, D135)** | The owner reports VoiceOver is fine everywhere ("voice over je okej svuda"). Not itemized screen by screen; no recording. In this session there was no VoiceOver in the simulator and no device. |
| Felt haptics (D63, D88, D102, D107, D109, D133) | Owner's iPhone | **PASS (owner-reported, D138)** | Purchase haptic confirmed and kept earlier (D135); the rest reported working by the owner, not itemized. |
| Weekly reminder device checks (D109) | Owner's iPhone | **PASS (owner-reported, D138)** | Not itemized. |
| Duo matrix with forms, both themes, charts and sheets | Owner | **PASS (owner-reported, D138)** | Not run by Claude in this session; reported working by the owner, not itemized. |
| Simulator Reduce Motion relaunch walk-through | — | NOT RUN | Covered by Jest gates (audit: every animation gated; see below). |
| Privacy/support links | GitHub Pages | PASS (D137) | Both URLs live (200); Settings › About links them. |

## Owner follow-up (same day, D135)

- VoiceOver: accepted by the owner on his iPhone, everywhere (owner-reported).
- Purchase/restore success haptic: kept (D117(3)). DESIGN_SYSTEM "Haptics" now allows it.
- V07 approved and built: the Savings insights row reads "Finished worlds", with "Your completed worlds live in Collection." underneath. The count (status = completed) and the Collection link are unchanged. Files: `statistics-model.ts`, with `savings-statistics.test.ts` and `statistics-ui.test.tsx` updated.
- Checks after the change: lint and typecheck PASS. `statistics-ui` + `savings-statistics` passed 29/29; `english-catalog` passed. The first run of the statistics suite timed out twice while the Mac's load average was about 460 from other work; the rerun passed.
- Still open (date language and V05 resolved later the same day by D136): the felt haptics other than the purchase, the D109 reminder device checks, the Duo matrix and Q09.

## Owner request: milestone previews and English dates (same day, D136)

- Inspected: both manifests (`assets/worlds/<theme>/export/<theme>_manifest.json`, identical to the bundled copies; Island version 2, Garden version 1), every unlock's layers (per-stage contact sheets composited from the 2048 export), and the quest code. The Next milestone quest's stage comes from `ChallengeOffer.preview.milestoneStage` (offer) and the frozen `AttemptView.milestoneStage` (current).
- Built: the spec `assets/worlds/milestone-previews.json`, the generator `scripts/make_milestone_previews.py` (Blender 5.2.3 Python, numpy; premultiplied compositing, area filter, view transform Standard so the colours are exact), 20 previews in `assets/themes/{island,garden}/previews/` (192 px max, RGBA, 696 KB total), `milestone-previews.ts`, `MilestonePreviewTile`, `QuestWorld.themeId`, `offerLabel`, and `milestonePreviewLabel`. English dates and times: `englishDateLocale`/`englishTimeLocale`.
- **Approved by the owner as shown** ("Previews approved as shown.").
- Review sheet (Island top row, Garden bottom, stages 1-10): [milestone-previews-review.png](phase-19/milestone-previews-review.png).
- Simulator (17 Pro Max iOS 26.0, test goal "Camera" on the Island at 69%):
  - [05](phase-19/05-17promax-challenges-current-island-stage9.png): the current quest frozen at stage 9 shows the bench.
  - [06](phase-19/06-17promax-challenges-offer-island-stage7.png): after Skip (test data), the Next milestone offer shows the pine for "Unlock the additional trees".
  - [07](phase-19/07-17promax-challenges-offer-axxxl.png): accessibility XXXL; the tile grows and the card reflows.
  - The simulators are Free, so the Garden previews were checked in the review sheet and in Jest only.
- Tests: `tests/unit/milestone-previews.test.ts` (21), `challenges-ui.test.tsx` (the preview replaces the generic tile only for Next milestone; offer label "… Shows a leafy tree."; current quest image "Shows flowering bushes."), `locale-formatting.test.ts` (English dates for de-DE, fr-FR, sr-Latn-RS, ja-JP; English 24 h for de-DE, 12 h for ko-KR). Under heavy machine load (load average 70-460 from other work), the first test of a suite can exceed Jest's 5 s. Final run: `npm test -- --runInBand --testTimeout=30000` PASS, 56 suites, 1566 passed, 1 skipped. Lint PASS, typecheck PASS. The de-DE dashboard test now expects "21 Nov 2026" (English dates, D136).

## Owner request: Privacy Policy and Support pages (same day, D137)

- Repository: `https://github.com/bosko-front/SavingWorld`, PUBLIC; `main` on origin is at fcdd83c, so this session's work is not pushed. GitHub shows `docs/README.md` as the repository README (`gh api …/readme`). Pages is not enabled (API 404).
- Verified for the claims:
  - Storage: the SQLite tables are settings, goals, ledger_entries, operation_receipts, collectibles, challenge_attempts, entitlement_cache and purchase_events. `purchase_events` holds only transaction ID, product ID and timestamps.
  - Network: `src/` has no network code (no fetch/XHR/WebSocket).
  - Purchases: `store-gateway.ts` uses only StoreKit calls. OpenIAP's kit.openiap.dev is reached only through `verifyPurchaseWithProvider`, which is not used.
  - Notifications: local only (`enableRemoteNotifications: false`, no push-token call).
  - Updates: `expo-updates` request headers come from `FileDownloader.swift` (EAS-Client-ID from `expo-eas-client`, a UUID kept in UserDefaults; runtime version; channel; update IDs; Expo-Fatal-Error up to 1024 characters).
  - SDK privacy manifests: none declares collected data types or tracking.
  - The production EAS profile has no development client.
- Files: `PRIVACY.md`, `SUPPORT.md`, `_config.yml` (Pages publishes only these two pages), README links.
- **App Privacy (App Store Connect) recommendation, not entered:**
  - The conservative answer is "Data Collected → Identifiers → Device ID (the EAS update client ID), not linked to the user, not used for tracking, purpose App Functionality".
  - Optionally add "Diagnostics → Crash Data, not linked, App Functionality", for the fatal-error header after a failed launch.
  - "Data Not Collected" is defensible only if the owner reads Expo's use of the client ID as servicing the request. Expo keeps it for update insights, so the conservative answer is recommended.
  - Purchases are Apple's and are not declared by the developer.
- Owner gave publisher "Bosko Jaksic" and support email boskojaksic2407995@gmail.com and approved the rest:
  - commit 031c2b3 pushed to `main`;
  - GitHub Pages enabled through the API (`POST /repos/bosko-front/SavingWorld/pages`, branch `main`, `/`), build `built` in 76 s;
  - `curl`: PRIVACY.html 200, SUPPORT.html 200, the blob URL 200, `/docs/DECISIONS.html` 404 and `/CLAUDE.html` 404 (only the two pages are published), the internal Support link converts to `/SavingWorld/SUPPORT.html`, mailto present;
  - the page checked in a browser.
- Settings › About: "Privacy Policy" and "Support" rows (`hand.raised`/`questionmark.circle`, hint "Opens in Safari.", `Linking.openURL`); Jest checks the URLs; simulator [08](phase-19/08-se-settings-about-links.png).
- Checks before the push: lint PASS; typecheck PASS; Jest 1571 passed with one icon-map test to update, then that test and the Settings tests 13/13 PASS after the fix.
- **For App Store Connect (not entered):** Privacy Policy URL `https://bosko-front.github.io/SavingWorld/PRIVACY.html`; Support URL `https://bosko-front.github.io/SavingWorld/SUPPORT.html`.

## Audit results (code review of every implemented screen)

- **Reduce Motion:** every animation is gated by the live `useReduceMotion`/`useAmbientMotion` (count-up, progress glide, world reveal/pop/crossfade, ambient, AmbientFloat still, sparkles off, theme crossfade, quest pop, onboarding steps, toast fade). Two were not: the unlock message is fixed; sonner's toast slide uses Reanimated's launch-time value (limitation). The chart has no motion.
- **Haptics:** each haptic has a toast or on-screen message, and at most one plays per action (form success versus Home milestone versus quest card). Owner items (D134): (1) the purchase/restore `success` haptic, kept by the owner (D135); (2) the chart's per-day selection while scrubbing (D131(6)), now listed in the Haptics table. Known (D85/D104): a milestone haptic can fire when Home is next focused; on Free the theme picker's selection plays before the D75 confirmation.
- **Icons:** all go through `Icon`/`ICON_SYMBOLS` (tab-bar symbols allowed), are hidden unless labelled, and scale with text. Icon-only buttons are labelled; the one under 44 pt (savings plan info) is fixed.
- **Toasts:** announced once, queued, never focused. A stage-unlocking deposit is heard as two different messages ("Deposit saved", then the milestone).
- **D97 world-first:** Settings is calm grouped rows in the shared look; "Your data" uses the D111 short-line + info pattern, with no alarm colors. Empty states are invitations, celebrations happen in place, motion stays within budget, copy encourages. Proposals: V01-V04, V09 applied (D98); V06 applied (D121); V08 replaced (D110); V07 approved and built (D135); V05 approved and built (D136).
- **Locale:** numbers follow the device language tag (D59). Dates and times are English, in the device language's order and clock style (D136).

## Physical-iPhone checklist for the continuation session

Run on a physical iPhone with a device development build (Pro bought in sandbox where noted), VoiceOver on, then largest text, then Reduce Motion:

1. Onboarding: each Next/Back moves VoiceOver to the step title; "Step n of 3"; the strip reads its three captions; a currency error is spoken once.
2. Create/Edit Goal: field errors read with their field; the "Not saved" notice is spoken once; the world error is spoken; Deadline add/remove (focus may stay on the row that disappeared; note it).
3. Home: the world image label and value; decorative layers are silent; the fallback message and Try again are reachable; Pause/Resume/Delete toasts are heard once; the unlock message is heard once, is focusable as a button and is dismissed by double-tap; the milestone haptic is felt once and the success haptic is not; the savings-plan info button is easy to hit; the percent is read (possibly twice: ProgressBar + text, a Home change needs the owner).
4. Entry form and History: labels, kind control, date picker, delete confirmation, rows "Deposit/Withdrawal, +/− amount, date, note" (a deposit now shows "+"), ledger toasts heard once, haptics felt once per commit or rule refusal.
5. Challenges: the D107 list (radios with state, Start, reasons, active card, "How quests work", "Past quests, n" expanded state, completion once, hero); after Start, VoiceOver lands on "Your quest".
6. Collection and souvenir: the D102 list.
7. Paywall: after Explore Pro, VoiceOver lands on the headline; after a purchase, on "Pro is active"; the product line is heard without "In progress"; restore results are heard once.
8. Savings insights (Pro): the D133 list.
9. Settings: the currency lock line and its info; the reminder switch "Weekly reminder, Sundays at {time}" with its state; Your data rows and "About your data".
10. Weekly reminder: the full D109 list.
11. iPhone Duo (simulator or physical): the forms, both themes, the chart and native sheets in each pose; draft kept; four-edge safe areas.

## Limitations and remaining work

- Phase incomplete: items marked NOT RUN / PENDING above.
- Focus after Add/Remove deadline is not moved (record it in step 2); the Home index has no spoken screen title (`headerTitle: ''`, D78), and Home's percent may be read twice (a Home change needs an owner request).
- Reanimated's Reduce Motion value for the toast slide is read at launch.
- Two queued announcements for an unlocking deposit (each heard once).
- Owner choices: none open (D135, D136).
- Simulator: the SE text size was set back to "large"; no app data changed (test databases are deleted by the runner).

## Closure (D138)

The owner reports that everything left in Phase 19 works ("ovo sve radi"): the felt haptics, the weekly reminder checks on a physical iPhone and the Duo checks. VoiceOver was accepted earlier (D135). Phase 19 is VERIFIED COMPLETE by owner decision D138. Phase 21 repeats the device checks on the release candidate with itemized evidence. App Store Connect entries (URLs, App Privacy) remain with the owner. Next prompt: [PHASE_19_5](../prompts/PHASE_19_5.md).
