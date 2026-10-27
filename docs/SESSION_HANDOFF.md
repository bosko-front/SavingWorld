# Latest session handoff

Session date: 27 October 2026. Session kind: Phase 20 (EAS preview delivery and OTA recovery). Result: **IN PROGRESS** — simulator release-mode drill complete and recorded; the owner's iPhone drill (real StoreKit sandbox right, real Airplane Mode) is pending. Next prompt: [PHASE_20](prompts/PHASE_20.md) (same). Details: [PHASE_20 evidence](evidence/PHASE_20.md), decision D142.

The previous handoff (Phase 19.5, VERIFIED COMPLETE by D139-D141) is superseded; its record remains in [PHASE_19_5 evidence](evidence/PHASE_19_5.md).

## Completed this session

- Read v1.2 (textutil) and the required documents; audited EAS read-only: only a `development` channel/branch, no preview/production build or update, no EAS environment variables; runtime 1.0.0 not shared before this session.
- Owner choices (this session): local commits on main, no push; hidden build details on Version; iPhone steps today with test data.
- Code: hidden release build details (`src/bootstrap/build-info*.ts`, `read-build-info.ts`, `delivery-marker.ts`, `ListRow onLongPress`, Settings Version row), `preview-simulator` profile, gate `scripts/release-check.mjs` + `scripts/release/release-contract.js` + `delivery/runtime-contracts.json`, drill tool `scripts/ota-drill.mjs` + `scripts/release/persisted-digest.js`, fixture `tests/native/release-fixture.ts`, tests (build-info, release-contract, delivery-config, catalog, Settings press-and-hold/VoiceOver action, fixture).
- EAS: preview builds e86513c7 (simulator) and 638cba93 (device, ad hoc), both fingerprint c83b89a5… = local; runtime 1.0.0 contract recorded. Preview updates: OTA-1 c49dc07b (6a40478), incompatible-runtime test 3859b02e (6fb83a9), OTA-2 e647be4f (1246d8a), republish 1a6b5b59, roll-back-to-embedded 802ac048, OTA-1 for the iPhone 09c72f72 (update 01a17d7d-a9fe-73d5-b4db-0cccb4d720a2). Production: nothing (no channel).
- Simulator drill on "SW P20 A" (direct) and "SW P20 B" (fault proxy), iPhone 17 Pro iOS 26.0, synthetic fixture: all T24/T25 and rollback rows PASS; ledger hash e8082baab0b3 at every step, fe2c192038ef after the one €50 deposit on OTA-2 and through both rollbacks.
- Docs: EAS_AND_OTA "Validated runbook (Phase 20)" (metadata contract, gate, network note, preview update, recovery, prepared production promotion/rollout/stop table), DECISIONS D142, PROJECT_STATUS, RELEASE_CHECKLIST, TEST_PLAN, CLAUDE.md fact line, evidence PHASE_20 with screenshots, digest table and redacted proxy log.

## Decisions

- D142 (build details on press-and-hold, drill marker, `preview-simulator`, runtime contract gate, drill tooling, local commits).

## Checks

See the evidence's table and "Final checks". NOT RUN: `test:db` (no persistence change; the release build read/wrote the fixture natively), `deps:check`/`doctor` (no dependency change), Duo release-mode cold launch (simulator launch hung; Phase 21).

## Incomplete work and blockers

1. **Owner's iPhone drill** (evidence "Device drill" steps 1-6). Part 1 (install 638cba93, Airplane Mode, embedded) and part 2 (online → update 01a17d7d…, marker OTA-1; then offline from cache) were sent to the owner; part 3 needs the operator to run `update:roll-back-to-embedded` on preview, then two cold starts on the phone. Pro must stay active (real sandbox purchase) and data unchanged at every step.
2. PRIVACY.md lists the update request contents but not the user agent (app build, iOS/CFNetwork version) or preferred language; owner decides the wording (public page).
3. Duo release-mode cold launch: Phase 21.
4. Housekeeping: the preview branch ends with the iPhone's OTA-1; after the device drill, finish with a roll-back-to-embedded so preview builds run their embedded bundle. Simulators "SW P20 A" (booted) and "SW P20 B" (shut down, its test copy points at 127.0.0.1:8787) hold synthetic data only; delete when done. Side branches `phase20-ota-drill` and `phase20-ota-incompatible` hold the drill commits; never merge.
5. Optional: exclude `assets/worlds/` (Blender sources) in `.easignore` to cut the 619 MB build upload.
6. Git: committed on `main`, not pushed.

## Exact next session

In ~/Desktop/SavingWorld, continue with `docs/prompts/PHASE_20.md`: record the owner's iPhone results in the evidence's "Device drill" table, run the rollback-to-embedded step with the owner, re-run `node scripts/release-check.mjs --eas`, then close the phase (VERIFIED COMPLETE only with the device rows passed) and name PHASE_21.

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
