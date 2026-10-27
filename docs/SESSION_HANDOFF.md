# Latest session handoff

Session date: 27 October 2026. Session kind: Phase 22 (App Store release preparation and final handoff). Result: **IN PROGRESS** — signed App Store build made and inspected, store materials and screenshots drafted for owner review; TestFlight upload, installed-build tests and App Store Connect entry are open. Next prompt: [PHASE_22](prompts/PHASE_22.md) (continue). Details: [PHASE_22 evidence](evidence/PHASE_22.md), decision D146, [store/README.md](../store/README.md).

The previous handoff (Phase 21, VERIFIED COMPLETE by D145) is superseded; its record remains in [PHASE_21 evidence](evidence/PHASE_21.md).

## Release states

Implementation complete (Phases 01-21) · release checks **not** complete · **signed candidate prepared** · not uploaded to TestFlight · not submitted · not approved · not live. Nothing in App Store Connect, no production channel, no production update, nothing pushed.

## Completed this session

- Read v1.2 (textutil) and the required documents; baseline `main` 2720be0 clean; `release-check` PASS.
- Rechecked Apple's current submission, screenshot, header, IAP, privacy-manifest, App Privacy and age-rating requirements on Apple's official pages (table in the evidence).
- Inspected the RC device IPA 9a42b94e: 16 privacy manifests (no tracking, no collected types, reasons for all required-reason APIs), no usage strings, no push/iCloud entitlements, export compliance set.
- Owner answers: local `eas build`; store name "Saving Worlds"; TestFlight upload yes (internal); App Store Connect edits only after reviewing drafts; later the exact screenshot headlines and order.
- **Signed App Store build** with `eas build --profile production --local`: 1.0.0 build 7, Xcode 27.1 / SDK 27.1, distribution certificate "Bosko Jaksic", App Store profile (new, made by EAS), channel production, runtime 1.0.0, fingerprint c83b89a5… (matches the shared runtime), embedded update 055a9754…. Kept at `dist/store-builds/SavingWorlds-1.0.0-7.ipa` (git-ignored; SHA-256 d5e149c4…). A plain `npx expo export` writes to `dist/` and would clear it.
- Store drafts in `store/`: listing JSON, review notes, age rating, App Privacy, IAP, header (two sizes), five screenshots + preview, IAP review screenshot, compose/frame scripts, README with the manual submission procedure.
- Screenshot fixture `tests/native/store-fixture.ts` + `tests/integration/store-fixture.test.ts` (real commands; Free; no entitlement). Throwaway simulator "SW P22 Store" (iPhone 17 Pro iOS 27.0, UDID 236BDD72…, en_US, RC build 5e207eba) now holds the finished "Summer trip" (synthetic).
- PRIVACY.md: user agent and preferred language lines added (open since Phase 20). Not pushed.

## Decisions

- D146 (build method, store name, App Privacy approach, screenshot/data rules, header, PRIVACY.md wording; no product rule changed).

## Checks

release-check PASS (start and final tree); lint, typecheck PASS; Jest 62 suites / 1,626 passed (1 env-gated skip); release-audit A1-A6 PASS; store build fingerprint = runtime 1.0.0. Build 7 uploaded to TestFlight (VALID, internal testing) and the store materials entered in App Store Connect (see PHASE_22 "App Store Connect entry"). NOT RUN: installed-build smoke/airplane/purchase/Restore, deps:check/doctor, test:db, test:storekit, test:e2e (no app change).

## Open items and owner decisions

1. **Done 27 October:** build 7 uploaded with `eas submit` (EAS Submit needs the API key fields in `eas.json` `submit.production.ios`; they were added only for the run and removed again) and processed VALID; internal TestFlight testing; attached to version 1.0.0. App Store Connect has version 1.0.0, name, subtitle, categories, URLs, keywords, age rating 4+, the five screenshots, both header files and the IAP review screenshot (IAP READY_TO_SUBMIT). The description and promotional text are the owner's own (edited in App Store Connect; do not overwrite). The Garden screenshot is dropped.
2. **App Review information** still empty: Apple needs contact name, email and phone together with the notes (`store/review-notes.txt`).
3. **App Privacy** (manual, owner) per `store/app-privacy.md` incl. the Analytics purpose choice; approve and push the PRIVACY.md change first.
4. Submission for review stays the owner's action. 27 October: the owner installed build 7 from TestFlight, reported "the app is all OK" and said they are submitting it for review themselves; confirmed the same day: review submission 4b88da3d WAITING_FOR_REVIEW (2026-10-27 20:57 UTC), version 1.0.0 build 7 and the IAP both waiting; review contact/notes and App Privacy filled by the owner; release type set by the owner to automatic after approval. Next: wait for Apple's result; push PRIVACY.md; record approval/live or address a rejection.
5. TestFlight checks on the iPhone: install, launch, airplane-mode journey, Pro purchase and Restore; then the D145 accepted limitations stay recorded for the owner's release decision.
6. Tooling change on the owner's Mac: Homebrew fastlane 2.241.2 installed; Homebrew Ruby 4.0.9 and CocoaPods 1.17.0 (reinstalled). Phase 21 simulators "SW P21 Perf SE" and "SW P21 E2E" shut down, not deleted.

## Exact next session

In ~/Desktop/SavingWorld, start Claude Code with the full `docs/prompts/PHASE_22.md` and continue from "Blocking items for release-ready" in the Phase 22 evidence. No production update, App Store submission or price change without the owner's explicit instruction in that session.

## Parallel workstream: Garden art (26 October 2026)

A separate session in the `claude/garden-theme-56e130` worktree ran Steps 1-2 of the owner's Garden brief ([GARDEN_ART](prompts/GARDEN_ART.md), D118). It changed no app code and nothing in Phase 15's area.

- Built: `assets/worlds/garden/` (README, `scripts/swg/` on the Island's shared rig, storybook pass and shaders, `source/garden.blend` with `SWG_00`-`SWG_10` and `SWG_Ambient`), the 100% review render and a reference comparison in `renders/review/`.
- Decided (D119, owner): the Garden milestone order is v1.2 except 80% greenhouse and vegetable beds; the 60% fountain brings all the water; the pergola is part of 90%. PRODUCT_REQUIREMENTS, ASSET_SPEC, SOURCE_RECONCILIATION, docs/README, CLAUDE.md and the Phase 17 prompt/roadmap follow it.
- Approved by the owner: the completed Garden's appearance (Step 2).
- Step 3 done: 0%, 50% and 100% rendered (`assets/worlds/garden/renders/milestones/`, sheet `garden_milestones.png`); `verify_stages.py` PASS (one rig/terrain fingerprint, add-only, nothing floating after four small fixes) and `milestone_report.py` PASS (identical underside 0% → 50%). Approved by the owner.
- Step 4 done (D120): all eleven states rendered; `render_ambient.py` and `export_layers.py` produced `assets/worlds/garden/export/` (79 PNGs per size, `garden_manifest.json` version 1). Rebuild mean ≤ 0.54/255 on every stage; the app's `manifestFromExport`/`validateManifest` accept it unchanged (throwaway Jest run); 16.1 MiB decoded at 1536 + 4.8 MiB for the `ambientExtensions` layers (water/ripples at 60%, koi, glows, butterflies, petals). At the owner's request the 10% seedlings and 20% flower bed were enlarged and everything re-rendered and re-exported; `milestone_report.py` PASS (0.65% and 0.68% change, threshold 0.4%). **Approved by the owner (Step 4): the Garden art workstream is complete and the export is ready for Phase 17.**
- Next for this workstream: nothing until brief Step 5, which is Phase 17 ([PHASE_17](prompts/PHASE_17.md), after Phases 15-16): copy the export to `assets/themes/garden/`, register Garden, and extend the manifest contract for the `ambientExtensions` layers.
- Not run: any app or device check of the Garden (Phase 17/21).
- **Visual polish pass (26 October 2026, after Step 4, owner request): approved by the owner (D123), art version 1 kept.** Scripts only (`swg/layout.py` drifts, `swg/plants.py` drifts/palette/new planting builders, `swg/structures.py` planters and islet flowers, `build_garden.py` wiring, `milestone_report.py` `SW_MILESTONES` override): 10% marigolds and sunflowers, 20% two-row bed with stone edge, 30% eight large pink/purple/white/yellow drifts, 50% path border, 60% pond/fountain/rill planting, 80% roses, lavender, pots and sunflowers round the greenhouse, 90% more flowering rim shrubs, 100% drifts, wildflower groups, wisteria and islet flowers. `verify_stages.py` PASS (fingerprint unchanged `61843db132018b42`), `check_framing.py` unchanged, `milestone_report.py` PASS on `renders/preview/polish/`. Review: `assets/worlds/garden/renders/review/garden_polish_*.png`. Animation layer audit in the Garden README (canopies ready as whole-tree sway; flower clusters need per-drift objects, masks and a new kind; water, butterflies and petals ready in `ambientExtensions`). After approval: the eleven 256-sample renders of the rebuilt source are in `renders/milestones/`, `render_ambient.py` and `export_layers.py` re-made `renders/ambient/` and `export/` (51 contract layers, was 63; 15.4 MiB decoded at 1536 + 4.8 MiB extension; rebuild mean ≤ 0.53/255; manifest version 1 with D123 provenance and updated VoiceOver drafts), and the app's `manifestFromExport`/`validateManifest` accept it unchanged (throwaway Jest run, removed). Decision D123 recorded. Noticed, not changed: the owner's uncommitted paywall copy (`src/features/billing/presentation/billing-copy.ts:30`) still says the Garden grows "to a gazebo" (D119 replaced it with the greenhouse). Not committed; not pushed.
- **Workstream closed (owner, D124, 26 October 2026):** `assets/worlds/garden/export/` (`garden_manifest.json` version 1) is the approved visual baseline; butterflies from 30%, falling petals from 40%; flower swaying, canopy-only movement and butterfly wing animation are not required for the MVP; water, koi, butterflies, petals and the lantern/greenhouse glows are integrated in Phase 17 where feasible with the existing React Native renderer; Phase 17 changes the paywall's "gazebo" to "greenhouse". Docs updated: DECISIONS D124, PHASE_17 prompt and roadmap entry (dependency paragraph, two scope bullets, one acceptance and one test line), Garden README, ASSET_SPEC, GARDEN_ART. No app code, renderer, render or export changed.
- Next for this workstream: none. Phase 17 ([PHASE_17](prompts/PHASE_17.md)) starts after Phase 16 and copies `export/` to `assets/themes/garden/` unchanged.
