# Latest session handoff

Session date: 27 October 2026. Session kind: Phase 19.5 (app icon and launch screen). Result: **Phase 19.5 VERIFIED COMPLETE by owner approval D139**. Next prompt: [PHASE_20](prompts/PHASE_20.md). Details: [PHASE_19_5 evidence](evidence/PHASE_19_5.md).

The previous handoff (Phase 19, VERIFIED COMPLETE by D138) is superseded; its record remains in [PHASE_19 evidence](evidence/PHASE_19.md) and DECISIONS D134-D138.

## Completed this session

- Read v1.2 in full (textutil) and the required docs. Baseline `main` 6550911, clean. The app still had the Expo template icon and splash.
- Checked the pinned SDK: `ios.icon` takes a path, `{ light, dark, tinted }` or one `.icon` folder (not both); `expo-splash-screen` takes background, image, width, resize mode and an optional dark entry.
- `assets/branding/`: `scripts/render_icon.py` renders a concept from the approved Island `.blend` (read-only, own square camera on the frozen view and lights, storybook pass, never saved); `icon_compose.py` adds the skies and writes light/dark/tinted icons and the mark; `review_sheet.py` makes the 60/40/29 pt sheet; README with commands and provenance.
- Three concepts (A finished Island, B cottage close-up, C first tree) on `review/icon_concepts_sheet.png`. **Owner chose B with the night-blue dark sky**, then approved the built result ("Approve all").
- Final `assets/images/icon-light.png`, `icon-dark.png`, `icon-tinted.png` (1024, RGB, no alpha, sRGB) and `splash-mark.png` (cottage and tree cut out, 600 px, shown at 120 pt). Template `icon.png` and `splash-icon.png` deleted. `app.config.ts`: `ios.icon` object + top-level light icon, splash `{ cream, splash-mark, 120, contain }`. `.easignore` skips `assets/branding/`.
- Tests: `delivery-config.test.ts` checks the icon/mark paths, template files gone, size, RGB, no `tRNS`, sRGB, mark ≥ @3x; the launch color guard stays.
- Docs: DECISIONS D139; DESIGN_SYSTEM Icons; RELEASE_CHECKLIST; PROJECT_STATUS; SOURCE_RECONCILIATION (Q09 line); CLAUDE.md fact line; evidence PHASE_19_5 with screenshots 01-14.

## Owner follow-ups the same day (D140, D141)

- D140: the launch screen background is Home's sky `skyTop` `#CFE6EE` (root view stays cream). The owner's local Xcode build still showed the placeholder because `ios/` dated from 26 October; regenerated with `npx expo prebuild -p ios --clean` (CocoaPods needs `LANG=en_US.UTF-8`). Also fixed: a stray `#2d96cb` launch color and a `__pycache__` file that commit 48be676 had picked up.
- D141: the launch screen stays until Home's world of the current stage has loaded (`src/bootstrap/launch-splash.ts`, cap 1.5 s after the database opens; onboarding/failures release at once). Jest 58 suites: 1581 passed.
- The owner checks both in his own Xcode build. EAS build 0799fb03 predates both (cream launch, old splash timing); Phase 20's builds carry them.

## Decisions

- D139 (owner): cottage close-up icon, night-blue dark sky, tinted grayscale; PNG set rather than Icon Composer `.icon`; one light launch screen with the cottage mark; approved after the simulator build.

## Checks

- Lint PASS, typecheck PASS, Jest 56 suites: 1577 passed, 1 env-gated skip; icon/launch tests 138/138 after the final art was copied.
- Throwaway prebuild in the scratchpad: AppIcon set with any/dark/tinted 1024 entries, splash logo 120/240/360 px, splash color `#F6F4EA`; `actool` no warnings. Expo keeps an alpha channel on the dark variant by design; all pixels opaque.
- EAS development simulator build **0799fb03-84c4-4b0e-91fa-e9d05a19def8** (1.0.0 / build 1 / runtime 1.0.0, fingerprint 935de421…), installed over test data on SE iOS 18.5, 17 Pro Max iOS 26.0, Duo iOS 27.1.
- Screenshots: cold launch on all three, home light on all three, dark and tinted on iOS 26.0, Spotlight, Settings › Apps, app switcher.
- NOT RUN: `deps:check`/`doctor` (no dependency change), `test:db` (no persistence change), physical iPhone (Phase 21).

## Incomplete work and blockers

1. Physical-iPhone look of the icon and launch screen: Phase 21 release-candidate check.
2. One plain white frame with the dev client's Tools button appeared once during a Duo cold launch; the recorded sequence showed cream + mark throughout. Confirm in the Phase 20 release-mode build.
3. Dark/tinted not shown on the iOS 18.5 simulator (its Customize sheet froze); shown on iOS 26.0.
4. Simulator state: the iPhone 17 Pro Max iOS 26.0 home screen is left in the Tinted style (Customize → Default to undo).
5. Git: committed on `main` (48be676, 6794f37, 47ee132 plus this docs commit); not pushed.

## Exact next session

In ~/Desktop/SavingWorld, start Claude Code with the full `docs/prompts/PHASE_20.md` (EAS preview delivery and OTA recovery). Owner actions outside the app (unchanged): enter the Privacy Policy and Support URLs (D137) and the App Privacy answers in App Store Connect.

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
