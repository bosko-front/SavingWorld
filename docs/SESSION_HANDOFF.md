# Latest session handoff

Session date: 27 October 2026. Session kind: Phase 21 (resilience, performance and release candidate). Result: **IN PROGRESS** — automated, native-SQLite and simulator work done; the release-candidate build, its OTA repeat and every physical-device check remain. Next prompt: [PHASE_21](prompts/PHASE_21.md) again. Details: [PHASE_21 evidence](evidence/PHASE_21.md), decision D144.

The previous handoff (Phase 20, VERIFIED COMPLETE by D143) is superseded; its record remains in [PHASE_20 evidence](evidence/PHASE_20.md).

## Completed this session

- Read v1.2 (textutil) and the required documents; baseline `main` 92e7586 clean; `release-check` PASS.
- Native scenarios: `tests/native/performance-scenarios.ts` (PF01 10,004 entries / 8 Pro goals / 52 weekly quests in EUR with exact totals and timed reads/writes; PF02 JPY and PF03 BHD whole-app fixtures) and `tests/native/resilience-scenarios.ts` (RS01 real SQLITE_FULL). Registered in the native runner and the host Jest run.
- Fixture files: `tests/integration/performance-fixture.test.ts` (`PERF_FIXTURE_DIR=<dir>` writes `ui-free-10k` and `ui-collection` app databases; seed with `node scripts/ota-drill.mjs seed --device <udid> --db <file> --replace-test-data`).
- Measured and fixed (D144): History paging (`readHistoryPage`, 100 rows + "Show older entries", `useCommittedRead` `keepWhileLoading`) after the release build showed nothing for 10+ minutes with 10,000 entries; date-indexed quest counting in `challenge-rules.ts` (board 155 → 98 ms, heavy writes ~120 → ~90 ms on the SE iOS 18.5 simulator).
- Release tooling: `scripts/release-audit.mjs` (A1-A6 PASS; found and fixed the `details` sample route rendering in release), `scripts/test-e2e.mjs` + `maestro/` (five Free journeys, Reduce Motion on).
- Docs: evidence PHASE_21 with screenshots and `test:db` records in `docs/evidence/phase-21/`, DECISIONS D144, PROJECT_STATUS, TEST_PLAN, RELEASE_CHECKLIST, CLAUDE.md fact line.

## Decisions

- D144 (bounded History, date-indexed quest counting, release audit, Maestro journeys, fixtures; JS only, OTA-compatible with runtime 1.0.0).

## Checks

lint, typecheck PASS; Jest 61 suites / 1,625 passed (1 env-gated skip); `test:db` 59/59 + R2 before and after; `release-check` PASS; `release-audit` PASS; `test:e2e` 5/5 PASS on e86513c7 (`docs/evidence/phase-21/e2e-e86513c7.xml`). NOT RUN: deps:check/doctor (no dependency change), test:storekit (billing unchanged), RC EAS builds, OTA repeat on the RC, all physical-device checks.

## Open items and owner decisions

1. **Release candidate (owner-approved).** Committed locally as ce46419 (not pushed). EAS `preview-simulator` 5e207eba FINISHED and recorded (`delivery/runtime-contracts.json`, fingerprint c83b89a5… = runtime 1.0.0); `preview` device 9a42b94e FINISHED and recorded (same fingerprint); the owner installs it from its EAS build page. The owner's EAS free plan is at ~80% of its builds: start no EAS build without explicit approval; Phase 22 still needs the production build.
2. **Baseline device.** Only the owner's iPhone 14 Pro is available; name the oldest supported iPhone for profiling or accept the 14 Pro with a recorded limitation.
3. **Device session.** Instruments profiling (cold launch, 10,000-entry History/Home/Challenges, Collection, both worlds, ambient on/off for the D90 decision, unlock moment), purchase/Restore on the RC, a real Sunday 18:00 reminder with travel/DST/reinstall, itemized VoiceOver and haptics, icon/launch look, physical Duo split view/fold with a draft. Instruments needs a development-signed Release build on the device.
4. Simulators made this session (synthetic data, deletable): "SW P21 Perf SE" (89785432…) and "SW P21 E2E" (C4ECF3CB…). Another session in this folder had Metro on 8081, a booted "iPhone Duo" and the "SW iPhone SE 3 iOS 18.5" simulator; they were used read-only for one `test:db` run and not changed.
5. Carried: PRIVACY.md wording for the update request's user agent/language (owner, before Phase 22); `.easignore` for `assets/worlds/` (optional).

## Exact next session

In ~/Desktop/SavingWorld, after the owner's answers above, start Claude Code with the full `docs/prompts/PHASE_21.md`. Then: take the owner's smoke-test result for 9a42b94e, download 5e207eba's .app, `node scripts/test-e2e.mjs --app <RC .app> --report docs/evidence/phase-21/e2e-rc.xml`, `node scripts/release-audit.mjs --out docs/evidence/phase-21/release-audit-rc.json`, the Phase 20 runbook (offline launch, one preview update, roll back to embedded) on the RC with the release fixture, then the device matrix.

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
