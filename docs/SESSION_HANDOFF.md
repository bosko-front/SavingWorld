# Latest session handoff

Session date: 26 October 2026. Session kind: Phase 14 (global weekly local reminder). Result: **Phase 14 VERIFIED COMPLETE** (D108-D109) on Jest and simulator evidence. The owner deferred the real-iPhone schedule/delivery/cancel/tap checks to Phase 19, repeated in Phase 21 (D109): not passed, mandatory before release. Next prompt: [PHASE_15](prompts/PHASE_15.md).

The previous handoff (Phase 13) is superseded; its record remains in [PHASE_13 evidence](evidence/PHASE_13.md) and DECISIONS D104-D107.

## Parallel workstream: Garden art (26 October 2026)

A separate session in the `claude/garden-theme-56e130` worktree ran Steps 1-2 of the owner's Garden brief ([GARDEN_ART](prompts/GARDEN_ART.md), D114). It changed no app code and nothing in Phase 15's area.

- Built: `assets/worlds/garden/` (README, `scripts/swg/` on the Island's shared rig, storybook pass and shaders, `source/garden.blend` with `SWG_00`-`SWG_10` and `SWG_Ambient`), the 100% review render and a reference comparison in `renders/review/`.
- Decided (D115, owner): the Garden milestone order is v1.2 except 80% greenhouse and vegetable beds; the 60% fountain brings all the water; the pergola is part of 90%. PRODUCT_REQUIREMENTS, ASSET_SPEC, SOURCE_RECONCILIATION, docs/README, CLAUDE.md and the Phase 17 prompt/roadmap follow it.
- Approved by the owner: the completed Garden's appearance (Step 2).
- Step 3 done: 0%, 50% and 100% rendered (`assets/worlds/garden/renders/milestones/`, sheet `garden_milestones.png`); `verify_stages.py` PASS (one rig/terrain fingerprint, add-only, nothing floating after four small fixes) and `milestone_report.py` PASS (identical underside 0% → 50%). Waiting on the owner: approval of Step 3.
- Next for this workstream after approval: brief Step 4 (all eleven states, the animation layers, the layer export and manifest, validated like the Island's). Step 5 (Phase 17 integration) follows only on further approval.
- Not run: stages 1-4 and 6-9 renders, export, any app check (none apply yet).

## Completed

- Read the v1.2 DOCX (sections 2, 3, 6, 7) and the required docs. Verified goal statuses, lifecycle commands and their `refreshAppData()` calls, the settings table and the foreground hook in code. Baseline: clean `main` at ebb12be.
- `npx expo install expo-notifications` (~58.1.6); `app.config.ts` plugin `['expo-notifications', { enableRemoteNotifications: false }]` (no `aps-environment`, no remote background mode).
- `src/features/reminders/`:
  - `domain/weekly-reminder.ts`: `WEEKLY_REMINDER` (identifier, Sunday = weekday 1, 18:00, content version, approved title and body (D110)), `reminderState`, `isCurrentWeeklyRequest`, `planReconcile`.
  - `application/reminder-commands.ts`: `setWeeklyReminderEnabled` (settings row, no receipt).
  - `application/reminder-reconciler.ts`: `reconcileWeeklyReminder` (read intent and active-goal count, permission, list, record pending, cancel/schedule, verify, record outcome; failures recorded by step).
  - `native/notification-gateway.ts`: the only expo-notifications importer (permission mapping/request, weekly schedule, normalization of iOS calendar triggers, foreground presentation to Notification Center only, launch/running taps).
  - `presentation/reminder-settings.tsx`, `reminder-copy.ts`: the Settings row (React Native `Switch`), state explanations, Allow notifications, denied notice + Open Settings, toasts and success haptic.
- `src/data/repositories/settings-repository.ts`: `weeklyReminderEnabled` and `weeklyReminderRequest` rows (shared JSON helpers); `goal-repository.ts`: `countActiveGoals`.
- `src/bootstrap/reminders.ts` (serialized reconciliation after every committed refresh, at launch and on foreground; permission request; tap routing to Home except over a form sheet), `foreground.ts`, `src/app/_layout.tsx`, Settings route section.
- Development only: `src/dev/reminder-lab.tsx`, route `/dev-reminder`, Settings link (absent from the release bundle).
- ESLint: expo-notifications restricted to the adapter and the lab. Jest maps `expo-notifications` to `tests/support/expo-notifications-fake.ts`; `resetApp()` resets it.
- Tests: `tests/unit/weekly-reminder.test.ts` (25), `tests/integration/reminder-reconcile.test.ts` (20), `tests/integration/reminder-ui.test.tsx` (9), one config assertion.
- EAS development simulator build **9dc5b3b9-5bd0-4110-9fb8-0f171a2db388**; simulator evidence in `docs/evidence/phase-14/`.
- Docs: evidence `PHASE_14.md`; DECISIONS D108; PROJECT_STATUS; DATA_MODEL (settings rows replace the planned table); ARCHITECTURE; TECH_STACK; DESIGN_SYSTEM; README; CLAUDE.md.

## Decisions

- D113 (owner): Apple setup before Phase 15: bundle ID kept and verified, existing App Store Connect app 6827062634, Non-Consumable `com.bosko123.savingworlds.pro.lifetime` created without price; see APPLE_SETUP.md.
- D112 (owner): the Collection souvenir detail without tab bar and with a short summary; snapshot unchanged.
- D111 (owner): Settings design approved; short lines with info buttons, no tab bar on Settings.
- D110 (owner): Settings in the shared look (Preferences, Reminders, About; diagnostics development-only; titles never break at accessibility sizes) and the approved reminder copy.
- D109 (owner): the physical-iPhone notification checks move to Phase 19, repeated in Phase 21 (RELEASE_CHECKLIST, PHASE_19/PHASE_21 prompts and roadmap updated); Phase 14 closes. V08 text stays open.
- D108 (engineering; no product rule changed): settings rows instead of a `notification_requests` table; one fixed identifier with a floating (zone-less) Sunday 18:00 calendar trigger; reconciliation after every committed refresh, launch and foreground with pending/outcome records; permission only after opt-in, denial keeps the intent; foreground arrival to Notification Center only; tap → Home, never over a form; local only; UIKit switch instead of the `@expo/ui` Toggle.

## Checks

- `npm run lint` PASS; `npm run typecheck` PASS; `npm test -- --runInBand` PASS (41 suites, 961 tests).
- `npm run deps:check`: six pre-existing SDK 58 patch notices (same as Phase 09), not upgraded; expo-notifications at the expected version.
- `npx expo export --platform ios`: PASS, no lab code.
- Simulator (build 9dc5b3b9, Metro 8081 not started by this session): see the evidence table. PASS: trigger configuration, orphan cleanup, background/terminated/foreground delivery, Pause/Resume, New York DST next fire, cold-start reconciliation, permission dialog after opt-in, denial path, Open Settings.
- NOT RUN: real-iPhone schedule/delivery/cancel/tap; notification tap → Home natively (simulator tool cannot open notifications from Notification Center); native deposit while paused or denied (Jest covers both); `npm run test:db` (no schema change; the new rows use the existing settings table).

## Incomplete work and blockers

1. No Phase 14 blocker. Carried to Phases 19/21 (D109, RELEASE_CHECKLIST): real-iPhone schedule/delivery (foreground, background, terminated)/cancel/tap → Home including cold start, native deposit/edit while paused and saving while denied, Open Settings reaching the app's notification page, VoiceOver of the switch, felt haptic; Phase 21 adds a real Sunday 18:00 delivery with travel/DST. Earlier carried items (D60, D63, D83, D88, D102, D107) are unchanged.
2. Settled after closing (D110): Settings polished into Preferences/Reminders/About with diagnostics development-only, and the approved notification copy (content version 2). A future copy change edits `WEEKLY_REMINDER` and raises `contentVersion`.
3. Git: Phase 14 and the D110-D112 polish are committed on `main` ("Phase 14: global weekly local reminder; Settings and souvenir polish (D108-D112)"); not pushed.
4. Simulator state: 17 Pro Max iOS 26.0 (`D4BA6D4D…`) has the reminder on and scheduled (goal "Camera" active); SE iOS 18.5 (`66F6F9E8…`) has it on but denied, and its test goal "Summer trip" reached its target (souvenir) for the D112 check. Both have build 9dc5b3b9, the current development simulator build.

## Exact next session

In ~/Desktop/SavingWorld, start Claude Code with the full `docs/prompts/PHASE_15.md` (verified StoreKit purchases and entitlement adapter). Verify Phase 14 from [PHASE_14 evidence](evidence/PHASE_14.md) first; do not redo it. Phase 15's Apple identifiers and product are ready ([APPLE_SETUP](APPLE_SETUP.md), D113); the owner still activates the Paid Applications agreement and sets a sandbox price when ready, or the phase starts with a local StoreKit configuration file. It adds a native dependency (expo-iap per D41) and therefore a new development build under EAS_AND_OTA; the API key stays in ~/.appstoreconnect/private_keys/ and its Key ID/Issuer ID come from the owner.
