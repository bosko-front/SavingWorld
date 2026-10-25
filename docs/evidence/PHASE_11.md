# Phase 11 evidence: Permanent souvenirs, Finish, Reopen and Collection

Session date: 25 October 2026. State: **VERIFIED COMPLETE** (owner decision D102). Every acceptance criterion has automated, native-SQLite (`test:db` on three simulators) and simulator evidence. The historical-manifest/Collection VoiceOver walkthrough and the felt haptics could not run (no VoiceOver in the iOS Simulator, no physical-device build). The owner moved them to Phase 19, repeated in Phase 21, as D60/D63/D83/D88 did: they are deferred, not passed, and stay mandatory before release. Owner design work in the same session: D97 (direction), D98 (V01-V04, V09), D99 (detail like Home), D100 (card float), D101 (gallery). Next prompt: [PHASE_12](../prompts/PHASE_12.md).

## Context verified first

- Read the full v1.2 DOCX (textutil), including sections 2, 3 ("Scene i kolekcija"), 6 and 10 ("Završetak", "Ispravka nakon završetka"). Also read README, PRODUCT_REQUIREMENTS, SOURCE_RECONCILIATION, DECISIONS (D53-D58, D74, D75, D83-D94), DEVELOPMENT_RULES, PROJECT_STATUS, SESSION_HANDOFF, ARCHITECTURE, DATA_MODEL, TECH_STACK, TEST_PLAN, DESIGN_SYSTEM, ADAPTIVE_LAYOUT, EAS_AND_OTA (schema/runtime rules) and the Phase 11 roadmap entry.
- Baseline: clean tree on `main` at 23a97d1 (Phase 10.5).
- Dependencies verified in code:
  - Phase 10.5 / 10: world transitions, ambient motion and the Island manifest version 2.
  - Phase 06 lifecycle: `changeGoalStatus` with Finish (B ≥ T) and Reopen (within the limit), and the `editGoal` closed-goal guard.
  - Phase 07 ledger mutation boundary: create/correct/delete in one `executeCommand` exclusive transaction with receipts.
  - D74 deletion: `deleteGoal` → `deleteCollectiblesForGoal`.
  - D56 currency lock: `countCollectibles`.
- Native and delivery: no native dependency or config change. Build **405064a9** runs the new JS through Metro, and expo-sqlite was already in it. Schema 3 is a persistence change. Runtime 1.0.0 has never been shared, so this is local work under EAS_AND_OTA: no OTA was published and no runtime bump is needed yet. A shared runtime would need a new app version and native build for schema 3.

## What was built

| Area | Module | Behavior |
| --- | --- | --- |
| Schema 3 | `src/data/db/migrations/0003-collectibles.ts` (checksum `1d1c7826fd9f83de`, pinned in `tests/unit/ledger-history.test.ts`) | `collectibles` (STRICT):<br>- `goal_id` is the primary key and a RESTRICT foreign key to goals.<br>- `theme_id` CHECK island/garden.<br>- `theme_version` ≥ 1.<br>- `target_minor_at_award` is in the money range.<br>- `earned_at_utc` must have the UTC shape.<br>- Trigger `collectibles_immutable` refuses every UPDATE.<br>- Backfill: goals already at B ≥ T get one souvenir, with Island version 2 and the upgrade time. This only affects development databases, since no release shipped schema 1 or 2. |
| Repository | `src/data/repositories/collectible-repository.ts` | `getCollectible`, `listCollectibles` (newest first), `insertCollectible`, `deleteCollectiblesForGoal` (deletion transaction only), `countCollectibles`. Rows are validated on read. The Phase 06 "table may be absent" fallback was removed, because schema 3 always has the table. |
| Theme versions | `src/core/progression/theme-ids.ts` | `CURRENT_THEME_VERSIONS` = Island 2, Garden 1 (Garden art arrives in Phase 17); `currentThemeVersion`. A test asserts it equals the bundled Island manifest version. |
| Award hook | `src/features/collection/application/souvenir-award.ts` | `awardSouvenirIfFirstFunded(tx, goal, balance, now)`, called inside the triggering transaction by `createEntry`, `correctEntry`, `deleteEntry` (deleting a withdrawal can be the first B ≥ T) and `editGoal` (a lower target; it records the saved target and theme). No status change. `LedgerMutationResult.souvenirAwarded` is true only on the awarding commit and false on a receipt replay. |
| Finish / Reopen | `goal-commands.ts` (unchanged rules), `goal-menu.tsx`, `use-goal-action.ts` | Home's ⋯ menu offers **Finish goal** (`finish` icon) only at B ≥ T, next to Pause/Resume and Delete. Finish shows the toast "Goal finished" with one `haptics.success()`. A Reopen refused by `goal_limit` plays `haptics.warning()` and an error toast (unchanged Phase 06/07 behavior). |
| Souvenir moment | `world-transition.ts`, `use-world-motion.ts` | `SceneSnapshot.souvenir`. A committed change that first holds the souvenir shows the in-scene message "Your island is complete!" / "Its souvenir is now in your Collection." with one announcement.<br>- Deposit, upward correction or deleted withdrawal: one `haptics.success()` instead of `milestone`. The entry form already leaves the haptic to Home through `unlocksStage`.<br>- Lower target: the message with no haptic from Home, because the goal form played `success`.<br>- Re-crossing 100% later is an ordinary milestone unlock.<br>- A launch or retry never replays it: the first snapshot already holds the souvenir, and a replay reports `souvenirAwarded: false`. |
| Historical art | `src/features/worlds/registry.ts` `themeManifestAt(theme, version)` | Returns the bundled manifest for its own version. Any other version gets the scene fallback, never another version shown as it. |
| Collection | `src/features/collection/presentation/collection-model.ts`, `collection-screen.tsx`, route `src/app/(tabs)/(collection)/collection.tsx` | `EmptyState` "No finished worlds yet" when nothing qualifies. Otherwise two `SectionHeader` sections: **Completed goals** and **Still open** (goals that earned their souvenir and are still open). Each card shows the souvenir world (stored theme and version, stage 10, still; no ambient motion, D90), the title, a `StatusBadge` and "Finished island · earned {date}". There is no archived list. |
| Souvenir detail | `souvenir-screen.tsx`, route `souvenir.tsx` (`/souvenir?goalId=`) | The historical world, then two groups:<br>- **Souvenir** (`ListGroup`): Earned, World ("Island, all 10 milestones"), Target then (plus "The target is … now." when it changed).<br>- **Goal now**: `StatusBadge` and Saved, Target, Progress ("8% · 0 of 10 milestones"), with "The souvenir stays complete; the world on Home shows what is saved now." when it regressed.<br>A completed goal also gets a `ListGroup` with **Reopen goal** and **Delete goal…**. Delete uses the D74 native confirmation "Delete completed goal?" with the owner's message, then leaves the screen and shows "Goal deleted" with `success`. |
| Home empty state | `home-screen.tsx`, `goal-copy.ts` | While Free's one goal is finished: a **Build another world** button (the Phase 16 paywall entry; an alert until then, with "…delete your finished goal in Collection"). The deep-link Create form still refuses with `goal_limit`. |
| Removed | `src/features/goals/presentation/closed-goals.tsx` | Replaced by the Collection feature; no duplicate. |

Mapping to the planned paths:
- `src/data/db/` → `0003-collectibles.ts`.
- `src/data/repositories/` → `collectible-repository.ts`. The closed-goal queries stay in the existing `goal-queries.ts`; `GoalsOverview.souvenirs` is read in the same snapshot as the goals.
- `src/features/collection/` → `application/souvenir-award.ts` and `presentation/*`.
- `src/features/goals/` → Finish menu item and Build another world.
- `src/features/ledger/` → the award calls inside the three ledger commands, plus `tests/native/souvenir-scenarios.ts`. The hook lives in `collection/` because `editGoal` uses it too.

## Acceptance criteria → evidence

| Criterion | Evidence |
| --- | --- |
| First saved 100% gives one souvenir for Free; status stays active or paused until explicit Finish | C01 (active and paused; replay does not award again; PK and immutability refuse a second row or an update), C03 (target edit), collection-ui (deposit through the form), world-motion. Simulator: the paused 17 Pro Max goal "Summer trip12.345" deposited RWF 7,395 to 12,345 → one `collectibles` row `island\|2\|12345`, status still `paused` (screenshot 02). |
| Finish keeps the goal counted toward Free; Reopen within the limit stays active at 100%; Free Create while the finished goal exists is refused with the "Build another world" entry | C04 (`goal_limit` on create; Reopen → active at 100%; Finish needs 100% again after the correction; over the limit refused), G01, collection-ui (menu labels, Finish toast/haptic, Build another world alert, Reopen from the detail, warning haptic on the limit). Simulator: Finish from the native menu → `completed` (03, 04); Reopen from the detail → `active` with "Goal reopened" (07). |
| Deleting a completed goal after confirmation removes goal, entries and souvenir in one transaction; Collection no longer shows it; the currency lock recounts; Free can create a new goal | C05 (failure before COMMIT keeps all three; success removes all three; receipt replay; `souvenirs` empty; lock recounts; Free creates), G07 (now with a real souvenir), collection-ui (confirmation title/message, Cancel keeps it, Delete → back to the empty Collection, "Goal deleted" with `success`, Create available). |
| Reopen then correction 100 → 10 regresses the live scene while the souvenir persists; repeated Finish never adds another | C04 (correction to 10% → stage 1, one souvenir; Finish/Reopen/Finish → still one), C01, collection-ui (detail shows "8% · 0 of 10 milestones" and the complete souvenir world; list moves it to "Still open"). |

Technical requirements: souvenirs are never added to money. The only money columns read are ledger amounts; `target_minor_at_award` is a caption (`collection-model.ts`). The live scene uses current B/T and the historical scene uses the stored theme/version (`themeManifestAt`). Retry, relaunch and correction never duplicate a souvenir or replay the moment (C01, C02, R2, world-motion relaunch test).

## Automated checks

| Check | Result |
| --- | --- |
| `npm run lint` | PASS (0 warnings) |
| `npm run typecheck` | PASS (typed routes regenerated by Metro with `/souvenir`) |
| `npm test -- --runInBand` | PASS: 33 suites, 795 tests (768 before) |
| New: `tests/native/souvenir-scenarios.ts` C01-C06 (also in Jest) | See the table above. C02 injects a real SQLite failure: a temporary trigger aborts the souvenir INSERT after the ledger insert or the target update in the same transaction. Both roll back, and the same operation ID then commits once with one souvenir. C06: schema 2 → 3 backfills only the funded goals (`done`, `funded`, not `short` at 89,999/90,000) and changes no goal or entry. |
| Changed native scenarios | S01/S02/S03/S04/R2 pin schema 3 and the `collectibles` table. G04 and G07 use real souvenirs instead of the Phase 06 fixture table. G08 continues 2 → 3 and deletes the upgraded goal. R1/R2 add "Finished bike": its awarding deposit's result is dropped, then the goal is finished. After the process restart, one souvenir and `completed` are read back, and retrying the deposit replays without a new award. |
| New Jest | `tests/integration/collection-ui.test.tsx` (4), `tests/unit/collection-model.test.ts` (6), souvenir cases in `world-transition.test.ts` (+5), `world-manifest.test.ts` (+2), `world-motion.test.tsx` (+4; Home scoping because the Collection tab now mounts worlds too). |
| `npm run test:db` (real expo-sqlite, build 405064a9) | **PASS** on three simulators, each upgrading its app database 2 → 3 at launch and then 43/43 + restart verify 1/1:<br>- iPhone 17 Pro Max iOS 26.1 (SQLite via expo-sqlite, Hermes)<br>- SE 3 iOS 18.5<br>- Duo iOS 27.1<br>Reports: `phase-11/test-db-17promax.json`, `test-db-se.json`, `test-db-duo.json`. |
| Release export (`npx expo export --platform ios`) | PASS: 72 assets. No inspector or scenario strings ("files decode to", "Ambient gate", "dev-world-ambient", "C01" absent); the souvenir and Collection copy is present. |
| `deps:check` / `doctor` | NOT RUN: no dependency change. |

## Simulator walkthrough (17 Pro Max iOS 26.1, build 405064a9, Metro, synthetic data, Reduce Motion off)

Screens were opened by deep link where taps lag (as in earlier phases). Database rows were read with `sqlite3 -readonly` from the simulator container.

1. `01`: empty Collection with the floating souvenir tile and "No finished worlds yet".
2. `02`: deposit RWF 7,395 on the paused goal at 40%. The count and reveal play, then "Your island is complete! / Its souvenir is now in your Collection." in the scene and "Deposit saved". The goal stays Paused with "Target reached". Database: one souvenir, status paused.
3. `03`: the native ⋯ menu lists History, Edit goal, Resume goal, **Finish goal**, New goal, Delete goal….
4. `04`: after Finish, "Goal finished" and Home's empty state with **Build another world** and the Collection hint. Database: `completed`.
5. `05`: Collection: "Completed goals" with the still finished island, "Completed" badge and "Finished island · earned Oct 25, 2026".
6. `06`: detail: the historical island, the Souvenir rows, Goal now (Completed, 100% · 10 of 10 milestones), Reopen goal and Delete goal….
7. `07`: Reopen: "Goal reopened", status "Still open", actions gone. Database: `active`, one souvenir.

The simulator was not used for the deletion; C05/G07 cover it on real SQLite and collection-ui covers the screen. The 17 Pro Max test goal is now active at 100% with its souvenir.

## Owner-approved visual polish (D97 direction, D98 approval), same session

The owner approved proposals V01-V04 and the new V09. They were built inside Phase 11; no rule, data or acceptance criterion changed.

| ID | Change | Module |
| --- | --- | --- |
| V01 | Collection empty state "Your gallery of worlds": the stage 0 Island at 55% opacity, still floating like every empty-state picture | `collection-screen.tsx` |
| V02 | Thin gold frame on completed cards; the souvenir detail plays a one-shot burst of four title-size sparkles over the sky once the finished world is drawn (`WorldScene onShown`, `AmbientSparkles once large`) | `collection-screen.tsx`, `souvenir-screen.tsx`, `world-scene.tsx`, `ambient-float.tsx` |
| V03 | History empty state "Ready to grow" with the goal's own world at stage 0 (`worldNoun`) | `history-screen.tsx`, `world-copy.ts` |
| V04 | Home empty state while Free's one goal is finished: that finished world (souvenir theme/version), "Your world is finished", hint "Unlock Pro to build another world, or delete your finished goal in Collection to start over." | `home-screen.tsx` |
| V09 | Onboarding opens with the finished Island (still, decorative) | `onboarding-screen.tsx` |

**Bug found and fixed while checking V02:** `Link asChild` dropped the cards' function-valued Pressable style. On the simulator the Phase 11 cards had no white surface (screenshot 05); Jest showed `style: {}`. The fix is a `CardButton` component (the D61 pattern). Screenshot 09 shows the surface and frame, and Jest asserts the frame.

**First V02 attempt failed:** a frame-by-frame recording showed the burst playing over an empty sky while the island's images were still loading, finishing before the island appeared. A footnote-size sparkle was also nearly invisible over the art. The burst now waits for `onShown`, is title size and sits over the sky. Sheet 11 shows four glints in turn, then nothing.

Checks after the polish:
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm test -- --runInBand` PASS (33 suites, 795 tests). Expectations were added in `collection-ui` (gallery copy and faded picture, gold frame, burst gated on the drawn world and off under Reduce Motion), `goal-ui` (onboarding world, finished-goal hint), `ledger-ui` (History empty state) and `world-scene`/`world-motion` (scoped to Home).

Simulator screenshots:
- 17 Pro Max iOS 26.1 (existing data): `08` Home with the finished world, `09` Collection card with its surface and gold frame, `10` detail mid-burst, `11` burst frames.
- 17 Pro Max iOS 26.4, fresh install of build 405064a9 (no existing data touched): `12` onboarding with the Island, `13` empty Collection gallery, `14` History "Ready to grow".

`test:db`: not rerun (no persistence change since the PASS above).

**Owner follow-up D99:** the souvenir detail now follows Home.
- The souvenir's sky fills the screen top edge to edge on `AdaptiveGoalLayout sceneBleed`.
- The bar is transparent, with the goal's name as title and Back as a chevron only.
- The burst sits in the sky.
- Jest 795/795 PASS (plus an assertion that the region carries the sky gradient and the world has no frame); lint and typecheck PASS.
- Simulator: `15` (detail) and a recording showing the burst over the sky after the island is drawn.

**Owner follow-up D100:** Collection card worlds float slowly.
- `AmbientFloat` now takes `periodMs`/`delayMs`. The cards use 3 pt over 4.4 s, starting 1.3 s apart per card (`CARD_FLOAT`, `cardFloatDelay` in `collection-model.ts`), only while Collection is focused and the app is active, and still under Reduce Motion.
- Jest: unit tests for the phase spread and a UI check that the floating wrapper is decorative and rests under Reduce Motion.
  - Run 1: 796/797, one timeout in `ledger-ui` while the Mac's load average was ~30-90 (`fileproviderd` plus a second simulator). That file then passed alone (14/14).
  - Final run at load ~6: 797/797 PASS. Lint and typecheck PASS.
- Simulator recording on the 17 Pro Max (iOS 26.1), measured from the top edge of the canopy in 24 frames at 0.25 s: it moves between y 799 and 808 px (9 px = 3 pt at 3×) on a cycle of about 4.4 s.

## Owner polish D101: Collection as a gallery (UI only)

- **Title:** "Summer trip12.345" is stored exactly so (`sqlite3`: `'Summer trip12.345'`, 17 characters), from an earlier test session. It is not a formatting bug. Long names: featured cards wrap fully; compact cards show three lines with the full name in the card's VoiceOver label; the detail's navigation bar truncates with "…" (standard iOS).
- **Gallery** (`collection-screen.tsx`):
  - intro line, "Completed worlds" and "Still growing";
  - a featured card for one world;
  - two columns from the section's measured width (≥ 340 pt; otherwise one column);
  - no badge on compact completed cards, the status of open ones under the caption;
  - a 1 pt gold frame;
  - captions from `cardCaption` ("Island · Oct 25, 2026").
- **Detail** (`souvenir-screen.tsx`, `souvenirDetail`): status badge, the saved amount as display text, "Island completed on {date}", one "since then" sentence only when something changed, Reopen/Delete (or the finish-on-Home hint).
- **Tests:**
  - collection-ui (+1 gallery test: 174 pt columns at 360 pt, one column at 300 pt, three-line compact titles, full name in the label, no badge on compact completed cards; detail hero, the saved amount, the since-then note);
  - collection-model (`souvenirDetail` shape, `cardCaption`, the no-change and target-changed notes).
  - Full Jest: one run at load ~9-17 took 125 s and failed two unrelated Home/navigation tests, which passed alone (19/19). The next full run was **799/799 PASS** in 37 s. Lint and typecheck PASS.
- **Simulator screenshots:**
  - 17 Pro Max iOS 26.1 (real data): `16` featured card, `17` simplified detail.
  - 17 Pro Max iOS 26.4: `18` two-column gallery, `19` "Still growing" detail with the since-then note, `20` long-name detail.
- **Gallery fixture on the 26.4 simulator.** Several finished worlds need Pro (Phase 15). With the app closed, its own test database was seeded with `sqlite3` under the schema's CHECKs, triggers and foreign keys: three completed worlds (one long name) and one still-open world that regressed. It is a state like "after a lost Pro". `PRAGMA foreign_key_check` was clean.
- **Deleted goal on the 26.4 simulator.** Its earlier test goal "New bike" had been deleted at 21:23:35 local through the app's own confirmed Delete Goal (a `goal.delete` receipt). I sent no input to that simulator at that time; it was used in the panel. This is not a data-loss bug.

## Not run / limitations

- **Deferred by D102, not passed:** historical-manifest/Collection VoiceOver walkthrough (no VoiceOver in the iOS Simulator, no physical-device build). It moves to Phase 19 and is repeated in Phase 21 (prompts, roadmap and RELEASE_CHECKLIST updated).
- Felt haptics (success on the first 100%, Finish, Reopen and Delete; warning on the refused Reopen) need a physical device: deferred with the walkthrough (D102). Jest checks the calls.
- Simulator taps lag about one action; screens were opened by deep link. The Collection's two-column layout on a wide window (Duo open) was not photographed; cards wrap through `flexBasis` without any window read.
- Onboarding on the iPhone SE: the new picture pushes Continue below the fold (the screen scrolls). Not photographed on the SE because its app already has a currency.
- The developer "Tools" button and dev-client sheets in screenshots belong to the development client, not the app.
- Garden version 1 is a reserved constant until Phase 17 bundles Garden art; no Garden goal can exist on Free.

## Files changed

Code:
- `src/data/db/migrations/0003-collectibles.ts`, `migrations/index.ts`, `0001-initial-ledger.ts` (comment path only)
- `src/data/repositories/collectible-repository.ts`
- `src/core/progression/theme-ids.ts`, `index.ts`
- `src/features/collection/{application/souvenir-award.ts, presentation/collection-model.ts, collection-screen.tsx, souvenir-screen.tsx}`
- `src/features/ledger/application/ledger-commands.ts`
- `src/features/goals/application/{goal-commands.ts, goal-queries.ts}`
- `src/features/goals/presentation/{goal-menu.tsx, goal-copy.ts, home-screen.tsx, use-delete-goal.ts}`; `closed-goals.tsx` removed
- `src/features/worlds/{world-transition.ts, use-world-motion.ts, registry.ts}`
- Routes: `src/app/(tabs)/(collection)/{_layout.tsx, collection.tsx, souvenir.tsx}`
- `src/dev/db-test-runner.tsx`

Tests: listed above.

Docs: this file and `phase-11/` (7 screenshots, 3 test:db reports), DECISIONS D95-D96, DATA_MODEL, ARCHITECTURE, DESIGN_SYSTEM, TEST_PLAN, UI_UX_GUIDELINES, RELEASE_CHECKLIST, PROJECT_STATUS, SESSION_HANDOFF, CLAUDE.md.

Test IDs: T07, T09, T15 (Free Finish/Reopen/Delete), T19 (offline-only local commands; airplane mode itself not exercised), T26 (receipt/collectible persistence across restart), T27.
