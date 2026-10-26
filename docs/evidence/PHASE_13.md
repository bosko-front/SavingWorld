# Phase 13 evidence: Fixed challenge catalog and attempt UX

Session date: 26 October 2026. State: **VERIFIED COMPLETE** (owner decision D107). Every acceptance criterion has Jest evidence on the real routes (host SQLite), a simulator walkthrough on real expo-sqlite and owner review of the design (D105, D106). The Challenges VoiceOver walkthrough and the felt haptics could not run: there is no VoiceOver or Taptic Engine in the iOS Simulator and no physical-device build. The owner moved them to Phase 19, repeated in Phase 21, as D60/D63/D83/D88/D102 did. They are deferred, not passed, and stay mandatory before release. Next prompt: [PHASE_14](../prompts/PHASE_14.md).

## Context verified first

- Read the full v1.2 DOCX (textutil): section 3 "Osnovni izazovi i podsjetnici", section 6 "Challenges", section 7 "Tri gotova izazova" and section 10 "Izazovi". Also README, PRODUCT_REQUIREMENTS, SOURCE_RECONCILIATION, DECISIONS (D62, D66, D68, D74, D85, D97-D103), DEVELOPMENT_RULES, PROJECT_STATUS, SESSION_HANDOFF, ARCHITECTURE, DATA_MODEL, TEST_PLAN (T11, T12, T19), DESIGN_SYSTEM (Visual direction, World-first direction, Haptics, Toasts), ADAPTIVE_LAYOUT and the Phase 13 roadmap entry.
- Baseline: clean tree on `main` at dcdb90b (Phase 12).
- Dependencies verified in code: `readChallengeBoard` (settled board: current, three offers with reason or preview, history), `startChallenge`/`skipChallenge` (operation IDs, receipts, typed refusals), `LedgerMutationResult.completedAttemptId` from `createEntry`/`correctEntry`/`deleteEntry`, the shared entry form (`/entry-form`), `stageName` from the Island manifest, `useCommittedRead` and `refreshAppData`.
- Native and delivery: no native, dependency, schema or config change. Build **405064a9** runs the new JS through the Metro already serving this folder on port 8081 (`expo start --dev-client --clear`, started earlier today). A second Metro on port 8082 (same folder, started 25 October) was left alone. No build, update or store action.

## What was built

| Area | Module | Behavior |
| --- | --- | --- |
| Challenges tab | `src/features/challenges/presentation/challenges-screen.tsx`; route `src/app/(tabs)/(challenges)/challenges.tsx` (composes only) | Quests for the goal Home shows (`selectedGoalId`). The header shows the goal's world, still, at its real stage, with its name and saved amount, and says that quests count recorded savings and never add money. Then one of three blocks. With a current quest: its card, **Add savings** (the one primary button; opens `/entry-form?goalId=&from=challenges`) and a plain **Skip this quest** (native confirmation). With no current quest: "Choose a quest", three radio cards and **Start {quest}**. When nothing can start (only at B ≥ T): a rest card with "Go to Home". Below: "Past quests" as one `ListGroup` with `StatusBadge`s. A paused goal gets an info notice; its quests still work. |
| Quest cards | `quest-cards.tsx` | `OfferCard`: an available quest is a radio card (role radio, checked state, 2 pt action-green outline plus a check). It says what to do, how it helps the world and the frozen target or saved week a start would fix. A quest that can't start rests on the soft surface with its reason; it is not selectable and not greyed out. `CurrentQuestCard`: the headline; for a money target the shared `ProgressBar` (no milestone marks), "{progress} of {target}" and "{remaining} to go"; for First step a plain status; then the period. `CompletedQuestCard`: "{Quest} complete!" on the warm surface with the thin gold frame; a short pop (≤ 540 ms) and a one-shot sparkle (`AmbientSparkles once`); under Reduce Motion it is the final card at once. |
| Copy | `challenge-copy.ts` | All English quest strings: titles, tiles, "Bring the {stage name} to your {island}" from the manifest ("Complete your island" at stage 10, a percent when a theme has no art), offer/current/completed/history wording, every `UnavailableReason`, result badges (Completed success; Not completed and Skipped neutral), and Start/Skip refusal messages. |
| Completion signal | `completed-quest.ts` (in memory, zustand) | The entry form notes `completedAttemptId` after a commit. Challenges celebrates it once in the card the next time it is focused with the re-read board, announces it once and then forgets it. It is dropped when the screen loses focus and never survives a relaunch. |
| Shared entry form | `src/features/ledger/presentation/entry-form-screen.tsx`, `src/app/entry-form.tsx` | An optional `origin` (`from=challenges`). Same command, operation ID, retry and in-flight guard as Home. After a commit with `completedAttemptId` it notes the quest. When opened from Challenges it skips its own success haptic, because the quest card plays it. From Home or History it keeps its haptic, and the card later celebrates without one. |

Mapping to the planned paths: `src/features/challenges/presentation/` → screen, cards, copy and completion signal (current/history detail are inline on the tab; every past row carries all its facts, so no separate detail route); `src/app/` → the Challenges route plus the `from` parameter on `entry-form`; `src/shared/i18n/` → the strings live in `challenge-copy.ts` in the feature, like `ledger-copy.ts` and `goal-copy.ts`, because they depend on challenge domain types (a shared module importing a feature would invert the dependency); shared transaction form → the `origin` prop; tests → `tests/integration/challenges-ui.test.tsx`, `tests/unit/challenge-copy.test.ts`. No rule is recomputed in the UI.

Decision: D104 (UI and feedback choices; no product rule changed). Proposal V05 (cropped milestone objects) is still not approved: the Next milestone quest names its object in words only.

## Acceptance criteria → evidence

| Criterion | Evidence |
| --- | --- |
| Free user can start an available type, record from Home or Challenges, see calculated completion, Skip and inspect retained history offline | Jest: "choosing a quest… Start freezes it" (attempt `next_milestone`, target 1,500, milestone 3, no entry written); "Add savings from Challenges books one entry…" (entries 6,000 / 1,000 / 500, completion card, Completed row); "a quest completed from Home is celebrated on the next visit"; "Skip asks first…" (Skipped row, First step reason). Simulator (17 Pro Max iOS 26.0, fresh install of 405064a9, real expo-sqlite, no network used): start Next milestone `04`, partial deposit `05`, completing deposit with in-card celebration `06`, past quests `07`, start First step `08`, Skip → reasons `09`, Weekly current `10`, process restart keeps the current Weekly step and past quests without replaying the celebration `11`. Database read-only after the restart: 2 entries (100000, 150000 minor) and attempts next_milestone historical completed 250000 · first_step historical skipped · weekly_step active 2250000, 2026-10-26 to 2026-11-01, Europe/Belgrade. |
| Weekly/once-only/active-limit unavailable states explain the actual reason | Jest: Weekly with no deadline ("Needs a deadline…"), First step after Skip ("Each goal has one First step…"), Weekly after use ("You've had this week's step…"), the active limit ("One quest at a time. Finish or skip it to choose another." under the current quest; the stale-Start error toast "One quest at a time. Finish or skip your current quest first."); unit test: all seven reasons are distinct and contain no blame words. Simulator `09`, `14`, `15`. |
| Cancelled/failed entry never marks a result complete; corrected historical attempt stays historical | Jest: "a cancelled or refused entry never completes the quest" (cancel; failed write with the draft kept; the retry with the same operation ID commits once and only then completes); "a correction changes a past result while a different quest stays current" (deleting the completing deposit makes First step Not completed, Next milestone stays current, no celebration, no haptic). Native SQLite: Phase 12 H06 (Completed → Not completed → Completed while another attempt is current) and H02-H04 on three simulators; the engine is unchanged in this phase. |

## Tests and checks

| Check | Environment | Result |
| --- | --- | --- |
| `npm run lint` | macOS, Node per lockfile | PASS (0 warnings) |
| `npm run typecheck` | same | PASS |
| `npm test -- --runInBand` | Jest, host `node:sqlite` | PASS, 37 suites, 893 tests (new: 13 Challenges UI, 6 copy) |
| `tests/integration/challenges-ui.test.tsx` first run | Jest | 11/13; two failures in my own test helper (search params also carried `goalId`), then a navigation outside `act`. Fixed in the test; 13/13 |
| Interactions for all three types, validation/availability, Skip/cancel/error/retry, absence of custom/pause/editor/paywall controls | Jest | PASS. A regex check refuses "custom", "edit amount/quest/challenge", "pause quest/challenge", "reminder", "streak", "points", "XP", "level", "Unlock/Explore Pro", "failed", and any switch |
| Haptics | Jest fake | PASS: selection only on a changed choice; none for Start, Skip or a refused Start; exactly one success for a completing deposit from Challenges (the card's); Home's own success once when completed from Home, none added by Challenges |
| Simulator screenshots, default text | 17 Pro Max iOS 26.0 (fresh install) and 17 Pro Max iOS 26.1 (existing data) | PASS: `01` no goal, `02` Free goal finished (iOS 26.1), `03` choose a quest, `04` current Next milestone, `05` progress, `06` completed in its card (with "Deposit saved" toast; the sparkle had already finished in the 1.5 s frame), `07` past quests, `08` current First step, `09` after Skip, `10` current Weekly, `11` after restart, `15` reasons and history, `16` target reached rest card |
| Simulator screenshots, largest text (accessibility XXXL) | 17 Pro Max iOS 26.0 | PASS: `12` header, `13` current card, Add savings, Skip and a wrapped past row, `14` choose screen with the Weekly reason |
| D97 checklist | review of `01`-`16` | PASS: quest cards and grouped rows, not a checklist; worlds before icons (header world, empty-state worlds); neutral Skipped/Not completed; no red, no "failed", no countdown; Completed celebrated once in place; no points or new money. One note: the selected radio card shows a check mark at its trailing edge. It marks the choice (role radio), not a task to tick. |
| Paused-goal notice on the simulator | — | NOT RUN (Pause is in Home's native ⋯ menu, which simulator taps did not reach reliably this session). Jest covers it ("a paused goal keeps its quests and records savings without resuming"). |
| iPhone SE / Duo screenshots | — | NOT RUN. The screen uses the shared `Screen` layout with wrapping text and a measured-width-free card stack; checked at the largest text on the 17 Pro Max. |
| `npm run test:db` | — | NOT RUN: no schema, repository or command change. Phase 12's native results (51/51 on three simulators, including H02-H06) stand for the engine. This session's simulator journey exercised start, a Challenges deposit, Skip and restart on real expo-sqlite. |
| VoiceOver walkthrough (quest cards, radio state, progress values, celebration announcement) | — | **NOT RUN**: no VoiceOver in the iOS Simulator, no physical-device build. Accessible names, roles, radio state, progress values and the one announcement are asserted in Jest. Needs an owner decision to defer to Phases 19/21 (as D102), or a physical iPhone. |
| Resize-preserved transaction draft | Jest (Phase 07 `ledger-ui` test, unchanged form) | PASS in the full suite. The native rotation/fold check stays under D63 (Phase 21). |
| Felt haptics | — | NOT RUN (no Taptic Engine in the simulator); physical-device check with D102's carried haptics. |
| `deps:check` / `doctor` | — | NOT RUN: no dependency change. |

## Simulator notes

- Simulator taps lag about one action and two swipes did not scroll, so some screens were opened by deep link and the scroll done with a slow touch path. The floating gear at the top right of the screenshots is the Expo development menu button; it does not exist in release builds.
- The fresh-install simulator (iPhone 17 Pro Max iOS 26.0, `D4BA6D4D…`) was booted by this session and holds only test data: goal "Camera" (RSD 25,000, deadline 26 Oct 2026), three entries and three attempts. The 17 Pro Max iOS 26.1 was only read (its database was opened read-only); its app was relaunched once to load the new bundle. The SE and Duo were only read.
- RSD was preselected in onboarding from the simulator region; the deadline defaulted to today, so the Weekly step amount equals the remaining amount (v1.2: deadline today gives R).

## Owner polish D105 (same session): quests, not a task manager

The owner asked for a polish pass before closing the phase: less text, a clear identity per quest, a distinct active quest, selected ≠ active, neutral words for skipped/ended quests, collapsible Past quests, a celebratory reached-target state tied to the finished Island, no overlap with the tab bar, small iPhones, Dynamic Type and Reduce Motion. Challenge logic, persistence, eligibility and business rules are unchanged (no file outside `src/features/challenges/presentation/` changed in this pass, apart from tests).

| Change | Module |
| --- | --- |
| Short card copy; the full rules ("How quests work": never adds money, one at a time, target/week fixed at start, withdrawals count, skipping is fine) behind an info button next to the section heading | `challenge-copy.ts` `QUEST_RULES`, `challenges-screen.tsx` `QuestHeading` |
| Quest identity: glyph, pastel color and tagline (First step: green leaf, "Begin your journey"; Next milestone: honey sparkles, "Unlock the next part"; Weekly step: blue calendar, "A step this week") | `QUEST_TILES`, `QUEST_TAGLINES` |
| Selected quest: white card with a 2 pt green outline and check; its short detail ("Save RSD 2,500.00 more · no deadline") and the Start button sit inside it. The others are compact cards with an empty radio ring. | `quest-cards.tsx` `OfferCard` |
| Active quest: a card with the quest's tinted band, an "In progress" badge, the headline, the counted amount large "of {target}", the ProgressBar and "{remaining} to go · {end}". It never shows Start. | `CurrentQuestCard` |
| Can't-start quests: one flat soft row with a short kind reason (for example "Each goal has one First step.", "Done for this week. A new one opens Monday.") | `OfferCard`, `unavailableCopy` |
| Neutral history: Not completed is now worded "Ended"; rows show "{amount} saved" only when something was saved (never "0 of …") | `RESULT_BADGES`, `historyRowCopy` |
| Past quests collapsible: a heading button with the count and a chevron, closed at first, `expanded` state for VoiceOver | `PastQuests` |
| Reached target: the finished world in its sky as the hero, one-shot sparkle once drawn (none under Reduce Motion), "Your island is complete!" (world's own words), one line and Go to Home; the small header is hidden in this state | `CompleteWorld` |
| Contrast: text on the three quest tints (textPrimary/textSecondary) added to `tests/unit/contrast.test.ts` | — |

Checks after the polish: `npm run lint` PASS, `npm run typecheck` PASS, `npm test -- --runInBand` PASS (37 suites, 903 tests; 13 Challenges UI tests updated for the new structure and wording, plus info-button, collapsed-history, In-progress/no-Start and "Ended" assertions; contrast +6 pairs).

Simulator screenshots after the polish:

- `18-polish-active-quest-17promax.png`: active Next milestone, RSD 1,600 of 2,500, In progress, no Start, Past quests collapsed (4).
- `17-polish-target-reached-17promax.png`: reached target, finished Island hero, "Your island is complete!", Go to Home, the just-completed quest's card, Past quests collapsed.
- `19-polish-choose-se.png`: iPhone SE iOS 18.5 (existing data, only viewed): selected First step with Start inside, fully above the tab bar.
- `20-polish-choose-se-largest.png`: the same at accessibility XXXL; text wraps, nothing clipped (text size restored to "large" afterwards).

Tab bar: the scroll view keeps the native automatic bottom inset (content can always scroll clear of the tab bar). Moving Start into the chosen card keeps the primary action above the tab bar on the 17 Pro Max and the SE at default text. Reduce Motion: every Jest UI test runs with it on (final card and no sparkle); the simulator was not switched to Reduce Motion.

Noticed during the polish: on the fresh-install 17 Pro Max simulator, the RSD 22,500 entry from the first walkthrough had been corrected to RSD 10,000 (revision 2) between steps. This session did not do that (by hand in the simulator panel or by another session); it was left as is and the screenshots were taken from that state.

## Owner final adjustments D106 (same session; design approved)

The owner approved the polished design and asked for five final adjustments without a redesign or new features.

| Request | Change and evidence |
| --- | --- |
| Shorter milestone titles | `milestoneGoal` now says "Unlock the {unlock}" in sentence case ("Unlock the final decorations", "Unlock the pond"); the last unlock stays "Complete your island". The completion line follows ("toward the pond"). Unit test covers the owner's example; screenshot `21`. |
| Smooth progress bar | The active quest's `ProgressBar` glides over Home's count duration (700 ms) after Home's sheet-closing pause (450 ms), through a new optional `delayMs` on the shared bar (default 0, so Home and every other bar are unchanged). Reduce Motion or another quest jumps. Jest: `tests/integration/progress-bar-glide.test.tsx` (holds during the delay, part-way at 800 ms, rests on 48%; jumps under Reduce Motion). Simulator video of a withdrawal (frames every 100 ms, fill width in px): `551 551 551 551 493 441 405 383 371 367` and still, i.e. it waits while the sheet closes, then eases down to 32% (800 of 2,500). Before the delay, the first frames of a deposit's glide were hidden behind the closing sheet (`0 … 331 437 493 549 551`). |
| Skip stays secondary | Unchanged: a plain, centered button under the filled Add savings (screenshots `23`-`26`). |
| Progress correct after withdrawals, goal edits and reopening | Jest: "progress stays right after a withdrawal from Challenges, a goal edit and reopening the app" (12 of 15 → withdrawal 5 → 7 of 15, 46%; target 250 → 400 with a new deadline keeps the frozen 15 and the title; a fresh app tree reads 7 of 15; entries 6,000 / 1,200 / −500). Simulator on real SQLite: deposit 1,200 → 1,200 of 2,500 (`22`, after a relaunch); withdrawal 400 from Challenges → 800 of 2,500, balance 20,800 (`23`); Edit goal target 25,000 → 30,000 → header "of RSD 30,000", quest still 800 of 2,500, database `target_minor 250000, milestone_stage 9` (`24`); relaunch → identical (`25`). |
| Past quests reachable by scrolling | Expanded Past quests (5 rows) scrolled to the end: the last row ends above the tab bar (`26`). The scroll view keeps the native automatic bottom inset. |

Checks after D106: `npm run lint` PASS, `npm run typecheck` PASS, `npm test -- --runInBand` PASS (38 suites, 906 tests). Before the commit (docs-only changes since): a full run under a machine load average of about 650 (four booted simulators) had 11 tests in 3 suites fail; the rerun at load about 124 passed 906/906, matching the earlier clean run (load-related timeouts, as in Phase 12).

Data note: the fresh-install simulator's data changed between steps again, not by this session: an entry corrected from 10,900 to 5,900 and a Next milestone skipped then started again (08:24-08:26 UTC). A withdrawal this session had typed was cancelled before saving (entry count and sum checked read-only). The verification above started from that state.

## Remaining work and limitations

1. VoiceOver walkthrough and felt haptics: deferred by the owner to Phase 19, repeated in Phase 21 (D107; RELEASE_CHECKLIST). Not passed.
2. Paused notice and Duo screenshots: NOT RUN on the simulator; Jest covers the paused behavior (the SE was photographed in the D105 polish).
3. When a deposit saved from Challenges both completes a quest and unlocks a stage, Challenges plays the success haptic at once and Home plays its milestone haptic when it is next shown (two moments on two screens, D104).
4. The board is settled when it is read; a week that ends while Challenges stays open updates on the next commit or foreground (Phase 12 behavior).
5. The completion card stays on screen until the tab loses focus, also after a new quest starts.
