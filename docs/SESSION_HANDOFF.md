# Latest session handoff

Session date: 25 October 2026. Session kind: Phase 11 (permanent souvenirs, Finish/Reopen and Collection), with owner design work D97-D101. Result: **Phase 11 VERIFIED COMPLETE** (D102). Every acceptance criterion has automated, native-SQLite and simulator evidence. The Collection VoiceOver walkthrough and felt haptics are deferred to Phase 19 and repeated in Phase 21: not passed, mandatory before release. Next prompt: [PHASE_12](prompts/PHASE_12.md).

The previous handoff (Phase 10.5) is superseded; its record remains in [PHASE_10_5 evidence](evidence/PHASE_10_5.md) and DECISIONS D91-D94.

## Completed

- Read the v1.2 DOCX and the required docs. Verified the Phase 06/07/10/10.5 dependencies in code. Baseline: clean `main` at 23a97d1.
- Schema 3 `src/data/db/migrations/0003-collectibles.ts`:
  - columns `goal_id` (PK), `theme_id`, `theme_version`, `target_minor_at_award`, `earned_at_utc`;
  - no updates allowed;
  - backfill for goals already funded;
  - checksum `1d1c7826fd9f83de` pinned.
- `collectible-repository.ts`: get, list, insert, delete for a goal, count. The "no table" fallback was removed.
- `CURRENT_THEME_VERSIONS` (Island 2, Garden 1) and `themeManifestAt` for historical art.
- `awardSouvenirIfFirstFunded` (`src/features/collection/application/`) runs inside `createEntry`, `correctEntry`, `deleteEntry` and `editGoal`. `souvenirAwarded` is on ledger results and false on replays.
- Home:
  - "Finish goal" in the ⋯ menu at B ≥ T;
  - the souvenir moment (`SceneSnapshot.souvenir`, success haptic instead of milestone, quiet for a lower target);
  - "Build another world" on the empty Home while Free's one goal is finished.
- Collection (`src/features/collection/presentation/`):
  - list: empty state, Completed goals / Still open, cards with the still souvenir world;
  - `/souvenir?goalId=` detail: Souvenir then / Goal now, Reopen, and Delete with the D74 confirmation.
  - `closed-goals.tsx` removed. `useDeleteGoal(onDeleted)` lets the detail leave after deleting.
- Tests:
  - `tests/native/souvenir-scenarios.ts` C01-C06;
  - native pins moved to schema 3; G04/G07 use real souvenirs; G08 continues to 3; R1/R2 finish a goal across a process restart;
  - `tests/integration/collection-ui.test.tsx`, `tests/unit/collection-model.test.ts`, souvenir cases in the world-transition/manifest/motion tests.
- Docs:
  - evidence `PHASE_11.md` with `phase-11/` (7 screenshots, 3 test:db reports);
  - DECISIONS D95-D96;
  - DATA_MODEL, ARCHITECTURE, DESIGN_SYSTEM, UI_UX_GUIDELINES, TEST_PLAN, RELEASE_CHECKLIST (Phase 11 physical-device item), PROJECT_STATUS, CLAUDE.md.

## Follow-up in the same session: design direction (D97, docs only)

- The owner set the world-first direction: a cozy savings game with useful tracking, with Home and the Island as the reference.
- Added DESIGN_SYSTEM "World-first design direction": philosophy, identity table, eight patterns, motion budget, anti-patterns, per-screen direction for Challenges, reminder, paywall, theme picker, Statistics, Settings and store screenshots, and proposals V01-V08.
- UI_UX_GUIDELINES links to it and annotates the screen contracts.
- Prompts 12, 13, 14, 16, 17, 18, 19, 21 and 22 and the matching roadmap entries gained scope/verification lines; a roadmap revision note was added. Acceptance criteria, phase numbering, business rules and scope are unchanged.
- No code changed; Home is untouched.
- Owner approval needed for V01-V08 (DESIGN_SYSTEM table). Without approval they stay unapplied.

## Follow-up: approved visual polish (D98)

- V01 gallery empty Collection; V02 gold frame on completed cards and a one-shot sparkle burst on the souvenir detail, after the world is drawn (`WorldScene onShown`, `AmbientSparkles once large`); V03 History "Ready to grow"; V04 Home's finished-world empty state; V09 onboarding Island.
- Fixed: Collection cards lost their surface style inside `Link asChild` (now `CardButton`).
- Checks: Jest 795/795, lint and typecheck PASS. Screenshots 08-14 are in `docs/evidence/phase-11/`; 12-14 come from a fresh install on the 17 Pro Max iOS 26.4 simulator, whose app now has RSD and the goal "New bike" (RSD 800).
- D99: the souvenir detail follows Home (full-bleed sky, transparent bar with the goal name, chevron-only Back); screenshot 15.
- D101: Collection gallery polish: intro line, featured/two-column gallery, subtle 1 pt gold frame, simplified achievement-first detail; Jest 799/799; screenshots 16-20. The 26.4 simulator has a seeded four-world fixture; its earlier "New bike" goal had been deleted through the app's confirmed Delete (receipt at 21:23:35).
- Still open: the VoiceOver decision. V05-V08 remain proposals. D100: Collection card worlds float slowly (3 pt over 4.4 s, out of step per card, only while visible, still under Reduce Motion), an owner exception to D90; Jest 797/797.

## Decisions

- D95: souvenir storage and award (schema 3 shape, immutability, backfill, the award hook, the stored version constant).
- D96: souvenir moment, Finish in the menu, Collection structure and the detail route, Build another world on the empty Home.
- D97 (owner): world-first design direction for all later UI phases (docs only).
- D99-D101 (owner): souvenir detail like Home, Collection card float, Collection gallery polish.
- D102 (owner): Phase 11 closed; the Collection VoiceOver walkthrough and felt haptics carried to Phases 19/21.
- D98 (owner): V01-V04 and V09 approved and built in Phase 11.
- No product rule changed.

## Checks

- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm test -- --runInBand` PASS (33 suites, 795 tests)
- `npm run test:db` (build 405064a9, Metro started from `.claude/launch.json`) PASS, 43/43 + restart verify:
  - iPhone 17 Pro Max iOS 26.1
  - SE 3 iOS 18.5
  - Duo iOS 27.1
- Release export PASS: 72 assets, no dev code.
- Simulator walkthrough on the 17 Pro Max PASS: souvenir moment on a paused goal, Finish, Build another world, Collection, detail, Reopen; database rows checked.
- `deps:check`/`doctor`: NOT RUN (no dependency change).
- VoiceOver walkthrough and felt haptics: NOT RUN (physical iPhone).

## Incomplete work and blockers

1. No Phase 11 blocker. Carried by D102 to Phase 19 (repeated in Phase 21): the Collection/historical-manifest VoiceOver walkthrough and felt haptics; also the D100 float and the burst in the Phase 21 device measurement. Listed in RELEASE_CHECKLIST and the Phase 19/21 prompts and roadmap.
2. Minor: the onboarding picture pushes Continue below the fold on the iPhone SE (the screen scrolls).
3. Git: Phase 11 is committed on `main` ("Phase 11: permanent souvenirs, Finish/Reopen and Collection (D95-D102)"); not pushed.
4. Simulator state:
   - The 17 Pro Max goal "Summer trip12.345" is now active at RWF 12,345/12,345 with its souvenir.
   - The SE and Duo app databases are at schema 3 and their goals are unchanged.
   - Metro was started by this session through the preview tool.

## Exact next session

In ~/Desktop/SavingWorld, start Claude Code with the full `docs/prompts/PHASE_12.md` (three fixed challenge rules and the attempt engine). Verify Phase 11 from this file and [PHASE_11 evidence](evidence/PHASE_11.md) first; do not redo it. Phase 12 extends `deleteGoal` to remove the goal's attempts in the same transaction, next to the collectible deletion. It exposes a typed attempt view for Phase 13's quest cards (D97).
