# Latest session handoff

Session date: 27 October 2026. Session kind: Phase 19 (accessibility, localization and Settings review). Result: **Phase 19 VERIFIED COMPLETE by owner decision D138**: the code, automated and simulator work is done; the owner reports that VoiceOver (D135), the felt haptics, the weekly reminder on a physical iPhone and the Duo checks work. Next prompt: [PHASE_19_5](prompts/PHASE_19_5.md). Details: [PHASE_19 evidence](evidence/PHASE_19.md), decisions D134-D138.

The previous handoff (Phase 18, VERIFIED COMPLETE by D133) is superseded; its record remains in [PHASE_18 evidence](evidence/PHASE_18.md) and DECISIONS D131-D133.

## Completed this session

- Read v1.2 in full (textutil) and the required docs. Verified Phase 18 in code. Baseline `main` fcdd83c, clean.
- Settings "Your data" (R23): `local-data-settings.tsx` + `settings-copy.ts`, between Pro and About. There is no backup/export/import/sync control. Privacy and support links are not shown (Q09).
- English catalog: about 210 inline strings moved unchanged into the feature `*-copy.ts` modules (new `collection-copy`, `settings-copy`, `onboarding-copy`, `storage-failure-copy`) and `src/shared/i18n/` (`common-copy`, `navigation-copy`, `chart-copy`). ESLint `catalogGuardrails` blocks new inline text in `.tsx` outside dev tools. The Phase 03 `details` sample route is now behind `__DEV__`.
- Accessibility fixes from a code audit of every screen (two read-only audit agents plus my own review):
  - focus after content swaps (`src/shared/ui/accessibility-focus.ts`; `AppText` takes `ref`);
  - spoken form errors (`Notice announce`);
  - a reachable world-scene fallback;
  - the unlock message as a button with live Reduce Motion;
  - `AmountText display` stepping down above 1.35× text;
  - a 44 pt savings-plan info button, and "Savings needed" read once;
  - paywall spinner hidden, product line wrap;
  - reminder switch disabled while saving;
  - theme picker title no longer truncated;
  - the onboarding strip reads its captions;
  - RTL readiness (start/end; world art area and chart pinned LTR; chevrons).
- History "+" sign on iOS: `formatMoney` now places the sign itself (Hermes ignores `signDisplay`). I01 asserts "+€5.00" natively.
- Tests:
  - new: `english-catalog.test.ts` (367 strings), `locale-formatting.test.ts` (4 locales, exponents 0/2/3, dates, 12/24 h), `accessibility-settings.test.tsx`;
  - updated: three ledger tests, one goal test and one world-scene test, plus one onboarding label test.
- Docs: DECISIONS D134; DESIGN_SYSTEM (Notice `announce`, AmountText step-down, focus helper, chart selection haptic, purchase-haptic conflict, device icon); PROJECT_STATUS; RELEASE_CHECKLIST (privacy/support pending note); CLAUDE.md fact line.

## Owner follow-up (same day, D135)

- VoiceOver is fine everywhere on the owner's iPhone (owner-reported, not itemized). The purchase/restore success haptic stays; DESIGN_SYSTEM updated.
- V07 built: Savings insights shows "Finished worlds" with "Your completed worlds live in Collection." underneath; the count is unchanged.
- Remaining for Phase 19 (as of the end of this session): felt haptics other than the purchase, the D109 reminder device checks and the Duo matrix. Q09 links, date language and V05 were resolved later (D136, D137).

## Owner request: milestone previews and English dates (D136)

- Next milestone quest: a small still picture of the main object it unlocks, for all ten unlocks of Island and Garden, cut from the approved 2048 exports. The spec is `assets/worlds/milestone-previews.json`; the generator `scripts/make_milestone_previews.py` (Blender) writes `assets/themes/<theme>/previews/`. `MilestonePreviewTile` keeps the generic sparkle tile as the fallback; VoiceOver hears "Shows {object}.". Quest logic, progress and entitlements are unchanged. The owner approved the previews as shown.
- Dates and times are in English, in the device's order and clock style.
- Checks: milestone-previews 21/21; Challenges UI and locale tests; simulator screenshots 05-07 and the review sheet in `docs/evidence/phase-19/`. Garden previews were seen only in the review sheet (the simulators are Free).
- Test data: on the 17 Pro Max iOS 26.0 simulator the "Camera" goal's old stage-9 quest was skipped to show the offer.

## Owner request: Privacy Policy and Support pages (D137)

- `PRIVACY.md` and `SUPPORT.md` (root), linked from `docs/README.md` (the README GitHub shows). `_config.yml` makes GitHub Pages publish only these two pages.
- The claims were checked against the code and SDKs (see PHASE_19 evidence). The EAS update client ID is disclosed; there is no "no data collected" claim.
- Recommended URLs (GitHub Pages): `https://bosko-front.github.io/SavingWorld/PRIVACY.html` and `…/SUPPORT.html`. Fallback: the `github.com/…/blob/main/…` URLs.
- Done with the owner's approval: publisher Bosko Jaksic, support email filled in, commit 031c2b3 pushed to `main`, GitHub Pages enabled and both URLs verified (200; the development docs are not published), Settings › About links added. App Store Connect is untouched: the owner enters the two URLs (and the App Privacy answers) or approves doing it.

## Phase closure (D138)

- The owner reports that the remaining checks work: the felt haptics, the weekly reminder on a physical iPhone and the Duo checks ("ovo sve radi"). Phase 19 is VERIFIED COMPLETE by owner decision. The incomplete-work list below is kept for history; its device items are closed by D138.

## Decisions

- D134 (engineering, no product rule changed): the catalog and its guard, the "Your data" copy and placement, the shared focus and announcement behavior, sign placement, RTL readiness. Open owner choices recorded in it:
  1. the purchase/restore success haptic, kept by the owner (D135);
  2. dates are English in the device's order (D136);
  3. V07 (D135) and V05 (D136) approved and built.

## Checks

- Lint PASS, typecheck PASS, Jest 55 suites: 1545 passed, 1 env-gated skip.
- `npm run test:db -- --device <SW iPhone SE 3 iOS 18.5> --record docs/evidence/phase-19/test-db-se-ios18.5.json`: PASS 55/55 + R2.
- Simulator look on the SE at default and accessibility XXXL: screenshots `docs/evidence/phase-19/00`-`04`.
- NOT RUN:
  - physical-iPhone VoiceOver walkthroughs, felt haptics and the D109 reminder checks (no device in the session; no VoiceOver in the simulator);
  - the Duo matrix;
  - simulator Reduce Motion walkthrough (the gates are covered by Jest and the audit);
  - `deps:check`/`doctor` (no dependency change);
  - release export (no change to how dev tools load).

## Incomplete work and blockers

1. Physical iPhone: VoiceOver is accepted by the owner (D135). Still needed: the felt haptics and the D109 reminder steps from the checklist in the evidence file (needs a device development build on the owner's iPhone and the owner's sandbox account for Pro; never enter Apple passwords or codes on the owner's behalf).
2. Duo matrix with forms, both themes, charts and native sheets (simulator Duo iOS 27.1 is available; physical split view stays a D48 release gate).
3. Q09 privacy/support: done (D137). Still open in Q09: final name/identity.
4. Owner answers: none open (D135, D136).
5. Known small gaps:
   - no focus move after Add/Remove deadline;
   - Home has no spoken screen title and may read its percent twice (Home changes need the owner);
   - the toast slide follows Reduce Motion only after a relaunch.
6. Git: Phase 19 work committed and pushed to `main` (031c2b3, plus this docs commit).

## Exact next session

In ~/Desktop/SavingWorld, start Claude Code with the full `docs/prompts/PHASE_19_5.md` (owner-approved app icon and launch screen, D114). Owner actions outside the app: enter the Privacy Policy and Support URLs (D137) and the App Privacy answers in App Store Connect. Phase 21 repeats the device checks on the release candidate with itemized evidence.

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
