# Latest session handoff

Session date: 26 October 2026. Session kind: Phase 17 (Garden and per-goal theme switching). Result: **Phase 17 VERIFIED COMPLETE** (owner decision D130): lint, typecheck, Jest, the still-stack pixel check, `test:db` 52/52 + restart, simulator checks and the owner's device look; carried items below. Next prompt: [PHASE_18](prompts/PHASE_18.md). Details: [PHASE_17 evidence](evidence/PHASE_17.md), decision D129.

The previous handoff (Phase 16) is superseded; its record remains in [PHASE_16 evidence](evidence/PHASE_16.md) and DECISIONS D117-D128. The Garden art workstream notes below are kept for history.

## Completed this session

- Verified Phase 16 from code (goal access gates, paywall, `theme_locked`) and the Garden export (version 1, 16 extension layers, D124 milestones). Baseline `main` c768e1a, Jest 1080/1080.
- Garden art bundled unchanged (`assets/themes/garden/`, static map `src/features/worlds/themes/garden-assets.ts`) and registered.
- Contract and renderer: kinds koi/glow/butterfly/petal, water owned by an unlock, `AMBIENT_REST`, presets, limits and release switches per kind; `WorldScene` motion per kind and `crossfadeTheme` (old world kept until the new one has loaded, 450 ms, instant under Reduce Motion).
- `changeGoalTheme` + `updateGoalTheme` + `canChangeGoalTheme`; `editGoal` uses the same rule.
- World picker: `ThemeCards` (worlds/presentation), Create inline cards, `/theme-picker` (Home ⋯ "Change world", Edit goal's World row, locked-Garden note and edit view), locked "Pro" card → `/paywall`, D75 confirmation, selection haptic + shared toast; `useShownTheme` on Home.
- Paywall: completed Garden in the Garden feature row (D121). The "gazebo" copy (D124) no longer existed (D125); verified, nothing changed.
- World inspector: `?theme=garden`, Garden effect switches, crossfade on Island/Garden toggle.
- Tests: `garden-manifest.test.ts`, `theme-switching.test.ts`, `theme-picker-ui.test.tsx`, `garden-ambient.test.tsx`, native scenario G10; `scripts/check-still-stack.py`.

- Owner fixes after review: Done on the Pro screen is a compact centered button; the shared pinned footer (`screen.tsx`) keeps at least 16 pt under its last control. Owner: "sad je ok", then "komituj i zatvori fazu".

## Also: onboarding redesign (owner request, D132)

- Onboarding is three steps (Welcome on a full-screen sky, How it works, Choose your currency; Next, Next, Get Started) in `src/features/settings/presentation/onboarding-screen.tsx`; new shared `TopBleed` (`src/shared/layout/top-bleed.tsx`) and FormScreen `bleed`. Currency rules, command and persistence unchanged; no other screen changed.
- A double-tap guard (presses within 600 ms of a step change are ignored) after the simulator showed a second tap saving the currency on step 3.
- Screenshots: `docs/evidence/onboarding-redesign/` (17 Pro iOS 26.0 steps 1-3, SE iOS 18.5 step 1). The owner checked the pull-down and the result himself ("dobro je to sad sve je ok provjero sam").
- Throwaway simulators "SW 17 Pro Onboarding" (new) and "SW SE 3 Phase17" (reinstalled build 7769c486, onboarded with RSD) are shut down; both can be deleted. VoiceOver of the steps is a physical-iPhone check (Phase 19/21).

## Decisions

- D130 (owner): closes Phase 17.
- D129 (engineering, no product rule changed): contract kinds and presets, Change Theme rule, picker stages (completed worlds in Create, current stage for an existing goal, completed Garden on a locked card the person does not use), one haptic per theme change (selection on the pick, no success haptic with the toast), crossfade.

## Checks

- Lint PASS, typecheck PASS, Jest 50 suites, 1133 passed + 1 env-gated skip (final run after all edits).
- Still stack vs `assets/worlds/garden/renders/milestones/`: PASS, mean 0.000-0.534/255 at stages 0-10.
- `npm run test:db -- --device <17 Pro Max iOS 26.0>`: PASS 52/52 + R2.
- Simulator (17 Pro Max iOS 26.0; SE iOS 18.5; a new SE for Create): screenshots `docs/evidence/phase-17/01`-`13`.

## Incomplete work and blockers

1. Done: the owner reviewed on his device and closed the phase (D130). The Pro switch and the Garden → Island path with a real purchase were not itemized; no sandbox purchase was made in this session.
2. Carried to Phases 19/21: VoiceOver of the picker cards, the locked card and the paywall preview; the felt selection haptic; physical-iPhone frames/energy/memory with Garden motion on and off (D90); simulator Reduce Motion relaunch check (Jest covers the gate).
3. Simulators: the existing SE now runs build 7769c486 (its text size reset to "large"); "SW SE 3 Phase17" (synthetic, shut down) can be deleted. The 17 Pro Max test data was not changed (Free; no theme change made).
4. Git: Phase 17 committed on `main` (not pushed).

## Exact next session

In ~/Desktop/SavingWorld, start Claude Code with the full `docs/prompts/PHASE_18.md` (four precise Pro savings statistics). Verify Phase 17 from [PHASE_17 evidence](evidence/PHASE_17.md). Never enter Apple Account passwords or codes on the owner's behalf.

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
