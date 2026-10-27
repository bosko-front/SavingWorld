# Latest session handoff

Session date: 26-27 October 2026. Session kind: Phase 18 (four precise Pro savings statistics). Result: **Phase 18 VERIFIED COMPLETE by owner decision D133** (Statistics VoiceOver carried to Phases 19/21). Earlier state: code complete; Lint, typecheck, Jest, `test:db` 55/55 + restart and the simulator look pass; the required chart VoiceOver check is NOT RUN (no VoiceOver in the simulator). Next prompt: [PHASE_18](prompts/PHASE_18.md) (continuation). Details: [PHASE_18 evidence](evidence/PHASE_18.md), decision D131.

The previous handoff (Phase 17) is superseded; its record remains in [PHASE_17 evidence](evidence/PHASE_17.md) and DECISIONS D129-D130. The Garden art workstream notes below are kept for history.

## Completed this session

- Verified Phase 17 from code (statuses active/paused/completed, souvenirs separate from status, `deleteGoal` removes entries and souvenir, ledger reads recompute balances, `canOpenStatistics` present without an entry). Baseline `main` e3af610.
- Domain `src/features/statistics/domain/savings-statistics.ts` (period, the four views in BigInt, `presentable`), repository `src/data/repositories/statistics-repository.ts` (goal counts, per-goal sums, single entries from a date), query `src/features/statistics/application/statistics-queries.ts` (`pro_required` before any read).
- Screen `src/features/statistics/presentation/` ("Savings insights": headline total, This month cards, Last 30 days line + summary + collapsible daily list, Completed goals → Collection; loading/failure/no-goal/locked/too-large states), chart `src/shared/ui/line-chart.tsx` (react-native-svg, no motion), route `src/app/(tabs)/(home)/statistics.tsx`.
- Entry points, Pro only: Home ⋯ "Savings insights"; Settings row under the Pro row. Free: none; deep link shows the Pro invitation.
- Dev: `/dev-statistics?sample=rising|flat|lower|large` (Settings › Development only › Statistics preview).
- Tests: `tests/unit/savings-statistics.test.ts` (18), `tests/integration/statistics-ui.test.tsx` (7), native scenarios P01-P03 (`tests/native/statistics-scenarios.ts`, in Jest and the `test:db` runner).
- Simulator fix: chart axis labels wrap inside the card at accessibility sizes; the headline steps down to the large role above 1.35× text.

## Savings insights polish (owner request, 27 October 2026; uncommitted with Phase 18)

- Step chart with value/date labels and a day inspector, "Net change" card, tab bar hidden, compact Back (D131 point 6). Lint, typecheck and the touched tests (40/40) pass; screenshots 09-14 in `docs/evidence/phase-18/`. Metro was restarted through `.claude/launch.json` ("metro"); the frozen SE simulator was rebooted (data kept, text size back to "large").
- Noticed: History rows rely on Intl `signDisplay`, which Hermes ignores (deposits may show without "+"); not changed.

## Also this session: onboarding redesign (owner request, D132)

- Onboarding is three steps (Welcome on a full-screen sky, How it works, Choose your currency; Next, Next, Get Started) in `src/features/settings/presentation/onboarding-screen.tsx`; new shared `TopBleed` (`src/shared/layout/top-bleed.tsx`) and FormScreen `bleed`. Currency rules, command and persistence unchanged; no other screen changed.
- A double-tap guard (presses within 600 ms of a step change are ignored) after the simulator showed a second tap saving the currency on step 3.
- Screenshots: `docs/evidence/onboarding-redesign/` (17 Pro iOS 26.0 steps 1-3, SE iOS 18.5 step 1). The owner checked the pull-down and the result himself ("dobro je to sad sve je ok provjero sam").
- Throwaway simulators "SW 17 Pro Onboarding" (new) and "SW SE 3 Phase17" (reinstalled build 7769c486, onboarded with RSD) are shut down; both can be deleted. VoiceOver of the steps is a physical-iPhone check (Phase 19/21).

## Decisions

- D133 (owner): closes Phase 18, VoiceOver carried.
- D131 (engineering, no product rule changed): exact semantics (whole calendar month by entry date; end-of-day line with opening balance; entry after today in total/month only), per-goal SQL sums + BigInt, Pro guard in the query, Pro-only entries in the ⋯ menu and Settings, "Savings insights" title, presentation, dev preview.

## Checks

- Lint PASS, typecheck PASS, Jest 52 suites, 1161 passed + 1 env-gated skip (final run after all edits).
- `npm run test:db -- --device <17 Pro Max iOS 26.0> --record docs/evidence/phase-18/test-db-17promax-ios26.0.json`: PASS 55/55 + R2.
- `deps:check`/`doctor`: 1 check failed on six newer SDK 58 patch releases (not caused by this phase; not upgraded).
- Simulator: 17 Pro Max default text (preview, locked Free deep link); SE iOS 18.5 accessibility XXXL (before/after the axis fix). Screenshots `docs/evidence/phase-18/01`-`08`.

## Incomplete work and blockers

1. Carried by D133 (owner): Statistics VoiceOver and the felt scrubbing haptic on a physical iPhone with Pro (Phases 19/21).
2. Not run natively: Duo chart reflow; the Pro screen with a real purchase on a device (simulators are Free).
3. Simulators: the SE's text size was restored to "large"; no app data changed (test databases are deleted by the runner).
4. Git: Phase 18 committed on `main` with D133 (not pushed); the onboarding redesign was committed separately (52e18cc).

## Exact next session

In ~/Desktop/SavingWorld, start Claude Code with the full `docs/prompts/PHASE_19.md` (accessibility, localization and Settings review). Include the carried physical-iPhone checks from RELEASE_CHECKLIST (now with Savings insights, D133) and History's deposit "+" sign on iOS. Never enter Apple Account passwords or codes on the owner's behalf.

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
