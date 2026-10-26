# Latest session handoff

Session date: 26 October 2026. Session kind: Phase 16 (Pro paywall and capability enforcement). Result: **Phase 16 IN PROGRESS**: code complete; lint, typecheck, Jest 1080/1080, `test:db` 51/51 + restart and a simulator look PASS; the owner's iPhone purchase walkthrough and VoiceOver remain. Next prompt: [PHASE_16](prompts/PHASE_16.md) (continuation). Details: [PHASE_16 evidence](evidence/PHASE_16.md).

The previous handoff (Phase 15) is superseded; its record remains in [PHASE_15 evidence](evidence/PHASE_15.md) and DECISIONS D115-D116.

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

## Completed

- Verified Phase 15 from code and evidence (Pro only for a stored `verified` entitlement, no override). Baseline `main` at 546ab7c; the Garden workstream committed and merged its own docs/assets on `main` during the session (D118-D120, D123-D124); this session's work is uncommitted on top.
- Enforcement (D117): `goalUse` in `@/core/access`; `src/features/goals/application/goal-access.ts` gates ledger create/correct/delete, goal edit, Pause/Resume/Finish, Reopen and quest start inside their transactions; kept-goal choice (`keptGoalId` settings row, `chooseKeptGoal`, `/keep-goal`); every `*CommandDeps` passes the snapshot's capabilities; `accessView`/`useAccessView` for screens.
- Paywall: `src/features/billing/presentation/` (`paywall-screen.tsx`, `use-pro-purchase.ts`, `billing-copy.ts`, `pro-settings.tsx`), `/paywall`, the D74 "Build another world" entry inside the goal form (becomes Create after a purchase; Phase 08 alert removed), Settings Pro row to the paywall (one Restore, D126), read-only badges/notices on Home, History, forms, Challenges and Collection.
- Owner polish (D125): approved copy, pinned purchase footer (new `footer` on the shared FormScreen/Screen, inline above 35% of the screen height), Restore explanation only in Settings.
- Owner planning decisions: D121 (hero stays the person's world; compact Garden preview in Phase 17), D122 (locked Garden card in the Phase 17 world picker opens the paywall); Phase 17 prompt and roadmap updated.

## Decisions

- D117 (engineering), D121, D122, D125, D126 (owner; D126: one Restore, on the paywall). Q07 now only needs App Store product metadata/review text (Phase 22).

## Checks

- `npm run typecheck` PASS; `npm run lint` PASS; `npm test -- --runInBand` PASS (46 suites, 1080 tests) at normal load. Runs earlier in the session at load averages 400-660 (Blender + simulators of another session) timed out UI tests; isolated reruns passed.
- `npm run test:db -- --device <17 Pro Max iOS 26.0>` PASS 51/51 + R2 restart.
- Simulator (17 Pro Max iOS 26.0, Metro): paywall with the island hero, "Unlock Pro for $7.99" from the sandbox, pinned footer; accessibility-extra-large text moves the footer inline; Settings Pro section. Screenshots in `docs/evidence/phase-16/`.

## Incomplete work and blockers

1. Owner's iPhone walkthrough (Xcode run, local StoreKit configuration and the sandbox account): Buy, cancel, Ask to Buy pending, Airplane Mode, Restore from the paywall (reached from Settings too), refund → keep one goal → others read-only, quests unchanged before/after Pro, Build another world → Buy → Create.
2. VoiceOver of the paywall, keep-goal and read-only states, or the owner's deferral to Phases 19/21.
3. The SE simulator has a pre-Phase-15 dev build: it shows a red ExpoIap error with today's JavaScript; reinstall build 7769c486 (or newer) there. The D115 claim that a build without the module opens normally should be rechecked.
4. Git: this session is committed on `main` ("Phase 16: Pro paywall and capability enforcement (D117, D121-D122, D125-D126)"); not pushed. The simulator's text size was reset to the default.

## Exact next session

In ~/Desktop/SavingWorld, continue with the full `docs/prompts/PHASE_16.md`: do not rebuild the enforcement or the paywall; record the owner's device walkthrough and VoiceOver result in `docs/evidence/PHASE_16.md`, then mark Phase 16 verified complete and name [PHASE_17](prompts/PHASE_17.md). Never enter Apple Account passwords or codes on the owner's behalf.
