# Phase 14 evidence: Global weekly local reminder

Session date: 26 October 2026. State: **VERIFIED COMPLETE** (owner decision D109). Every acceptance criterion has Jest evidence on host SQLite and the real routes, and native simulator evidence on EAS build 9dc5b3b9. The real-iPhone schedule/delivery/cancel/tap check needs a physical-device build, which does not exist yet; the owner deferred it to Phase 19, repeated in Phase 21 (D109). It is carried, not passed, and stays mandatory before release. The notification text was later replaced by owner-approved copy (D110).

## Context verified first

- Read the full v1.2 DOCX (textutil): section 3 "Osnovni izazovi i podsjetnici" (one optional local weekly reminder, Sunday 18:00 device time, permission on opt-in, none without an active goal; paused/completed don't trigger it; no per-goal/challenge schedule), section 2 statuses (a paused goal is "bez podsjetnika"; editing it does not resume reminders), section 6 Settings (one reminder switch) and section 7 AppSettings (`currencyCode`, `weeklyReminderEnabled`). Also README, PRODUCT_REQUIREMENTS (R17), SOURCE_RECONCILIATION, DECISIONS (D16, D29, D41, D57, D68, D74, D97), DEVELOPMENT_RULES, PROJECT_STATUS, SESSION_HANDOFF, ARCHITECTURE, DATA_MODEL, TECH_STACK, TEST_PLAN (T13), DESIGN_SYSTEM (reminder tile, V08), ADAPTIVE_LAYOUT, EAS_AND_OTA and the Phase 14 roadmap entry.
- Baseline: clean tree on `main` at ebb12be (Phase 13 committed).
- Dependencies verified in code: goal statuses `active`/`paused`/`completed` (`goal-repository.ts`, D74), lifecycle commands Pause/Resume/Finish/Reopen and `deleteGoal` (`goal-commands.ts`) each followed by `refreshAppData()` in their screens (`use-goal-action.ts`, `use-delete-goal.ts`, goal and entry forms), the typed `settings` table (JSON `value_json`, any key; schema 1), the foreground hook (`src/bootstrap/foreground.ts`) and the Settings screen. Phase 13 is VERIFIED COMPLETE per its evidence; not redone.
- expo-notifications was not installed before this phase.

## What was built

| Area | Module | Behavior |
| --- | --- | --- |
| Rules | `src/features/reminders/domain/weekly-reminder.ts` | `WEEKLY_REMINDER` (identifier `saving-worlds.weekly-reminder`, weekday 1 = Sunday, 18:00, content version 1, text "Your world is ready for this week’s savings."); `reminderState` (off, needs_permission, denied, no_active_goal, on); `isCurrentWeeklyRequest` (identifier, content version, repeating, Sunday 18:00, no fixed time zone); `planReconcile` (keep exactly one current request, cancel every other one, schedule if missing). |
| Opt-in | `application/reminder-commands.ts`; `settings-repository.ts` | `setWeeklyReminderEnabled` writes the settings row `weeklyReminderEnabled` on the serialized write path (idempotent preference, no receipt, D57/D108). Missing or unreadable reads as off. |
| Request record | `settings-repository.ts` (`weeklyReminderRequest`) | State pending/scheduled/none/failed, desired, native identifier, content version, revision, step error code, device zone, timestamp. No goal or money data. No schema change (schema 4). |
| Reconciler | `application/reminder-reconciler.ts`; `goal-repository.ts` `countActiveGoals` | Reads intent and active-goal count in one read, asks iOS for the permission, lists pending requests, records `pending`, cancels, schedules, lists again to verify, records the outcome. A failing adapter step is recorded with its step code and returned as `failed`; an interrupted run is finished by the next. |
| Native adapter | `native/notification-gateway.ts` (only expo-notifications importer, ESLint) | Permission mapping from `ios.status`; request only when undetermined (alert + sound, no badge); weekly schedule via `SchedulableTriggerInputTypes.WEEKLY`; normalizes iOS `calendar` triggers; foreground presentation to Notification Center only; reminder taps (launch tap taken once, running-app taps). |
| App driver | `src/bootstrap/reminders.ts`, `src/bootstrap/foreground.ts`, `src/app/_layout.tsx` | Reconcile after every committed refresh (covers goal create/pause/resume/finish/reopen/delete, entries and the switch), at launch and on every foreground; serialized with one shared follow-up; failures never surface as crashes. Tap routing to Home except over an open entry/goal form sheet. |
| Settings row | `presentation/reminder-settings.tsx`, `reminder-copy.ts`; `src/app/(tabs)/(home)/settings.tsx` | "Reminder" section: `reminder` tile, "Weekly reminder", "Sundays at {region time}", the native iOS switch (React Native `Switch`, see D108 (7)); one explanation line per state; "Allow notifications" while iOS has no answer; denied: info notice + "Open Settings"; toasts and success haptic on change (none when denied). |
| Config | `app.config.ts`, `package.json` | `expo-notifications` ~58.1.6 via `npx expo install`; plugin `['expo-notifications', { enableRemoteNotifications: false }]`. Introspected config: `ios.entitlements` `{}`, no `aps-environment`, no `UIBackgroundModes`. |
| Development only | `src/dev/reminder-lab.tsx`, route `/dev-reminder` | Shows the notification center (permission, pending requests with raw triggers, next weekly fire date from iOS), the stored record and last reconciliation; reconcile now; deliver a test copy in 10 s; add two orphan requests. Absent from the release bundle. |

Mapping to the planned paths: `src/features/reminders/` → rules, command, reconciler, adapter and Settings row; `src/data/db/ global notification request tracking` → the settings rows in `src/data/repositories/settings-repository.ts` (no new table, D108); `src/features/settings/ single opt-in switch` → the row lives in `src/features/reminders/presentation/` and is placed by the Settings route (it depends on reminder types, like challenge copy in D104); `src/bootstrap/` → `reminders.ts` and the foreground hook.

Decision: D108 (engineering; no product rule changed).

## Acceptance criteria → evidence

| Criterion | Evidence | State |
| --- | --- | --- |
| Permission denial leaves ledger fully usable and offers a system Settings path | Jest `reminder-ui`: denial keeps the switch on, shows the notice, "Open Settings" calls `Linking.openSettings` once, no success toast/haptic; allowing in iOS Settings then a foreground schedules the request. Reconciler: denied cancels an earlier request. Saving never touches the reminder (no ledger code calls it; the full suite's ledger tests pass with the fake answering "undetermined"). Simulator (SE iOS 18.5): dialog only after opt-in, denial notice, Open Settings opens iOS Settings. | PASS (Jest + simulator; the save-while-denied step itself is Jest only) |
| Exactly one desired global request with an active goal, none with only paused/completed goals or after the last active goal is deleted; repeat reconciliation never duplicates it | Jest `reminder-reconcile` (host SQLite, real adapter over the fake): zero/one/three active goals; Pause → none; edit + deposit into the paused goal → still none and still paused; Resume → one; Finish → none, Reopen → one; paused + active then delete the active → none; three repeats → one schedule call and an unchanged record; duplicates and orphans (other identifiers, older text) → one current request. Unit `weekly-reminder`: every state and plan case. Simulator: one request after opt-in, orphans cancelled on foreground, Pause → none, Resume → one, relaunches never add a second. | PASS (Jest + simulator) |
| Real iPhone schedule/delivery/cancel/tap for foreground/background/terminated | Physical iPhone: NOT RUN (no device build). Simulator: background, terminated and foreground delivery PASS; taps from Notification Center could not be injected (Jest covers routing). | **Deferred by D109** to Phase 19, repeated in Phase 21; not passed |

## Automated checks

| Check | Environment | Result |
| --- | --- | --- |
| `npm run lint` | macOS, Node 22 | PASS (0 warnings) |
| `npm run typecheck` | tsc 6.0.3 | PASS |
| `npm test -- --runInBand` | Jest 30 | PASS: 41 suites, 961 tests (new: 25 unit `weekly-reminder`, 20 `reminder-reconcile`, 9 `reminder-ui`, 1 config) |
| `npm run deps:check` | expo install --check | 6 notices, all pre-existing newer SDK 58 patches (`@expo/ui`, `expo`, `expo-dev-client`, `expo-font`, `expo-router`, `expo-sqlite`), same as Phase 09; not upgraded. `expo-notifications` 58.1.6 is the expected version. |
| `npx expo config --type introspect` | — | No `aps-environment`, no `UIBackgroundModes`; plugin present |
| `npx expo export --platform ios` | release bundle (before the last JS-only change from the `@expo/ui` Toggle to `Switch`) | PASS. Contains the reminder text and identifier; no lab code (`Deliver a test reminder`, `dev-test-reminder`, `dev-orphan-a` absent; only the dev link title remains, as for the other dev links). |

## Native evidence

Build: EAS development simulator build **9dc5b3b9-5bd0-4110-9fb8-0f171a2db388** (`npm run eas -- build --platform ios --profile development-simulator --non-interactive --wait --message "Phase 14: expo-notifications for the weekly local reminder"`), project `@bosko123/saving-worlds`, profile development-simulator (channel development, environment development), app version 1.0.0, runtime 1.0.0 (appVersion policy; not yet shared), uploaded from the uncommitted working tree on ebb12be. Archive inspected: the debug dylib contains the ExpoNotifications symbols (`WeeklyTriggerRecord`), the app entitlements are empty (no `aps-environment`) and `Info.plist` has no `UIBackgroundModes`. JS served by the Metro already running for this folder on port 8081 (not started by this session). Installed with `xcrun simctl install` over the existing app on two simulators, keeping their test data (schema 4; no migration).

| Check | Device | Result | Evidence |
| --- | --- | --- | --- |
| Settings row, default off, warm explanation | 17 Pro Max iOS 26.0 | PASS | `phase-14/01-settings-off.png` (with the earlier `@expo/ui` Toggle) |
| Turn on: opt-in committed, one request scheduled, explanation follows | 17 Pro Max iOS 26.0 | PASS. Device log: `Requested authorization [didGrant: 1]`, `Adding notification request`, `Got 1 pending notification`, success haptic call. DB: `weeklyReminderEnabled = true`, record `scheduled`. iOS did not show its dialog here (permission granted without a prompt on this simulator; the dialog is shown on the SE below). | `02-settings-on.png` |
| The real OS request: one repeating `UNCalendarNotificationTrigger`, weekday 1, 18:00, `timeZone: null`; next fire Sunday 1 Nov 2026 18:00 CET (17:00Z) | 17 Pro Max, zone Europe/Belgrade | PASS | `03-lab-scheduled-belgrade.png` |
| Duplicates/orphans: two extra weekly requests → foreground reconciliation cancels them, one remains; record pending → scheduled (revision 2 → 4) | 17 Pro Max | PASS. Log `Removing … pending notification requests`, `Got 1 pending`. | `04-lab-orphans-added.png`, `05-lab-orphans-reconciled.png` |
| Background delivery: test copy (same text and payload, 10 s) after Home button | 17 Pro Max | PASS. SpringBoard log: banner presented for `dev-test-reminder`, dismissed by its timer; the notification sits in Notification Center as "Saving Worlds — Your world is ready for this week’s savings." (no amount, no title) | `06-delivered-notification-center.png` |
| Terminated delivery: app terminated at 10:46:02, banner posted 10:46:10 with no app process on that simulator | 17 Pro Max | PASS (SpringBoard log `Posting banner … dev-test-reminder`; `launchctl list` has no app) | log only |
| Foreground delivery: no banner, no sound, kept in Notification Center | 17 Pro Max | PASS. SpringBoard: `willPresentNotification delivery succeeded`, then `shouldPlaySound: 0`, destinations NotificationCenter, LockScreen, Spoken, Forwarding (no banner) | `14-lab-after-foreground-delivery.png` |
| Tap → Home (background and terminated) | 17 Pro Max | **NOT RUN natively.** Simulator-injected taps on a Notification Center row registered as swipes (they revealed "Open"/expanded the stack) and never opened the app. Tap routing is covered by Jest (`reminder-ui`: running app, launch tap taken once, form sheet kept, foreign taps ignored). | `07-notification-center-tap-not-opened.png` |
| Pause the only goal (⋯ menu) → request cancelled, record `none`, Settings "Resting while no goal is active" | 17 Pro Max | PASS (DB `Camera|paused`; log `Removing 1`, `Got 0 pending`) | `08-settings-resting-paused.png` |
| Deposit into the paused goal stays paused with no reminder | 17 Pro Max | NOT RUN natively (the sheet closed before the typed amount registered; tap automation). Jest `reminder-reconcile` covers edit + deposit while paused. | — |
| Resume (⋯ menu) → one request again, record `scheduled` (revision 8) | 17 Pro Max | PASS | DB/log |
| Time zone and DST: cold relaunch with `launchctl setenv TZ America/New_York` | 17 Pro Max | PASS: same single request, no reschedule, record unchanged; iOS next fire Sunday 1 Nov 2026 18:00 GMT-5 = 23:00Z (the day New York leaves DST at 02:00). Relaunch back in Belgrade: still one request, 17:00Z. | `09-lab-new-york-dst.png` |
| Cold start reconciliation | 17 Pro Max | PASS (each relaunch reconciled with two reads and no change) | log |
| First-time permission dialog only after opting in | SE iOS 18.5 (never asked before) | PASS: the opt-in row was committed (`weeklyReminderEnabled|true`) before iOS showed "“Saving Worlds” Would Like to Send You Notifications" | `10-se-settings-off.png`, `11-se-permission-dialog-after-opt-in.png` |
| Denial: switch stays on, explanation, info notice, "Open Settings"; no request, no record | SE iOS 18.5 | PASS | `12-se-denied.png` |
| "Open Settings" opens iOS Settings | SE iOS 18.5 | PASS, but this simulator lands on Settings › Apps rather than the app's own page; check on a device | `13-se-ios-settings.png` |
| Ledger usable while denied | SE iOS 18.5 | Partly: Home, Settings and the Add savings sheet open normally; the save itself was NOT RUN natively (typing did not register). No ledger code calls the reminder; Jest runs the whole ledger suite with permission undetermined. | — |
| Real iPhone schedule/delivery/cancel/tap (foreground, background, terminated) | physical iPhone | **NOT RUN**: no physical-device build (needs the owner's Apple Developer device registration). | — |

Simulator finding fixed during the run: the `@expo/ui` SwiftUI Toggle did not react to most injected taps and seemed to have a smaller touch area than drawn. It was replaced by React Native's `Switch` (UIKit), D108 (7). Later it turned out that the tool's default tap was too short for these controls (a 0.15 s press works on the UIKit switch, the alert and Open Settings), so the Toggle may have been fine; the UIKit switch is kept as the plain native control. Jest 961/961 PASS after the change.

Simulator state left behind (test data only): 17 Pro Max iOS 26.0 (`D4BA6D4D…`) has the reminder on with one scheduled request and goal "Camera" active; TZ unset again. SE iOS 18.5 (`66F6F9E8…`) has the reminder on with notifications denied.

## Verdict

Session part 1 left the phase IN PROGRESS because the real-iPhone check (acceptance criterion 3) had not run. The owner then deferred that check to Phases 19/21 (D109, same session): Phase 14 is **VERIFIED COMPLETE** on its Jest and simulator evidence, with these items carried, not passed, and mandatory before release (RELEASE_CHECKLIST, PHASE_19/PHASE_21 prompts and roadmap):

- real-iPhone schedule, controlled delivery (foreground, background, terminated), cancel and tap → Home from background and cold start;
- the native deposit/edit on a paused goal and saving while notifications are denied (Jest covers both);
- Open Settings reaching the app's own notification page (the iOS 18.5 simulator lands on Settings › Apps);
- VoiceOver of the reminder switch and the felt toggle haptic;
- in Phase 21, one real Sunday 18:00 delivery with travel/DST on the release candidate.

The notification text is settled: the owner approved new copy after closing (D110), see below.

Next prompt: `docs/prompts/PHASE_15.md`.

## Follow-up: Settings polish and approved copy (D110, same day)

Owner request after closing: Settings in the shared look (Preferences, Reminders, About; diagnostics development-only), the approved notification copy, no new settings, features or dependencies.

| Check | Environment | Result |
| --- | --- | --- |
| `npm run lint`, `npm run typecheck` | — | PASS |
| `npm test -- --runInBand` | Jest | PASS: 41 suites, 963 tests (new: Settings layout, replacement of a V08 request by the approved copy; currency tests now match the grouped row) |
| `npx expo export --platform ios` | release bundle | PASS: "Development only", "Not part of the app", "No update loaded", "Embedded bundle", "Updates disabled in this build" absent; the approved title/body and the About line present; the V08 text absent |
| Settings, iPhone 17 Pro Max iOS 26.0 (build 9dc5b3b9, Metro 8081) | simulator | PASS: Preferences/Reminders/About cards | `phase-14/15-settings-redesign-17promax.png` |
| Settings, iPhone SE iOS 18.5, default text | simulator | PASS (shows the denied state left from earlier testing) | `16-settings-redesign-se.png`, `17-settings-about-se.png` |
| Largest accessibility text, SE | simulator | First run FAIL: "Weekly remind-er" and "Versi-on" broke inside the word. Fixed (switch under the title; `ListRow` value under the title above font scale 1.6); re-run PASS | `18-settings-se-largest-text.png`, `19-settings-se-largest-reminder.png`, `20-settings-se-largest-about.png` |
| Approved copy delivered (Reminder lab test copy, background) | 17 Pro Max | PASS: banner "A little progress goes a long way 🌱 / Ready to grow your world? Check in on your savings this week." | `21-approved-copy-banner.png` |
| VoiceOver of the new Settings rows | physical iPhone | NOT RUN; joins the D109 Phase 19/21 carry |

Note: on the 17 Pro Max the reminder switch had been turned off at 11:04 by someone other than this session (record revision 11, content version 2, no request): the app handled it correctly; the data is test data on a simulator shared with another session's Metro.

## Follow-up: Settings final adjustments (D111, same day)

Owner approved the D110 design and asked for shorter lines with details behind info, no tab bar on Settings, and small-iPhone checks, with no rule or feature change.

| Check | Environment | Result |
| --- | --- | --- |
| `npm run lint`, `npm run typecheck` | — | PASS |
| `npm test -- --runInBand` | Jest | PASS: 41 suites, 964 tests (new: tab bar hidden on Settings and shown after Back; the info alerts for currency and reminder; updated short-copy assertions; the tab-haptics test stubs `usePathname` because the tabs layout now reads it) |
| SE iOS 18.5 (build 9dc5b3b9, Metro 8081), default text | simulator | PASS: short lines with info buttons, no tab bar, info alert opens, scrolls to the last row with it fully visible, Back returns to Home with the tab bar | `phase-14/22-settings-short-copy-no-tabs-se.png`, `23-reminder-info-se.png`, `24-settings-scrolled-to-end-se.png`, `25-back-to-home-tabs-se.png` |
| SE, largest accessibility text | simulator | PASS: lines wrap at word boundaries, info button stays a large target | `26-settings-largest-short-copy-se.png` |
| VoiceOver (info buttons read "About your currency" / "About the weekly reminder", the line as one element) | physical iPhone | NOT RUN; Jest finds the buttons by these labels; joins the D109 Phase 19/21 carry |

## Follow-up: Collection souvenir detail polish (D112, same day)

Owner request: hide the tab bar on the completed-world detail, keep the world and background, a short summary instead of technical notes, no status repeated, snapshot unchanged, actions kept, small iPhones and large text, no logic change.

| Check | Environment | Result |
| --- | --- | --- |
| `npm run lint`, `npm run typecheck` | — | PASS |
| `npm test -- --runInBand` | Jest | PASS: 41 suites, 965 tests (unit `souvenirDetail` rewritten for the summary incl. target then/now, open status only, no milestone text, no-souvenir fallback; Collection UI: no tab bar on the detail and back after Back, headline/keep line/saved/facts, no completed badge, the snapshot target stays after a correction). A double period in the VoiceOver label was caught by the test and fixed. |
| 17 Pro Max iOS 26.0: "Camera", still open, saved RSD 20,800, earned at RSD 25,000, target now RSD 30,000 | simulator | PASS: no tab bar, complete Island (snapshot, while the goal is at 69%), "Still open", "Island completed", keep line, Earned / Target when completed / Target now | `phase-14/27-souvenir-detail-17promax.png` |
| SE iOS 18.5, default text | simulator | PASS (souvenir created for this check by a normal deposit of RSD 1,145 on the test goal "Summer trip", awarded in the same transaction) | `28-souvenir-detail-se.png` |
| SE, largest accessibility text | simulator | PASS: words stay whole, fact values move under their titles, scrolls to the end. Existing behavior noted: content scrolls under the transparent bar (as on Home) | `29-souvenir-largest-se.png`, `30-souvenir-largest-facts-se.png` |
| VoiceOver of the summary | physical iPhone | NOT RUN; joins the D102/D109 carry |
