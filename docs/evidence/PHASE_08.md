# Phase 08 evidence: Free dashboard and deadline estimates

- Session date: 23 October 2026. Phase state: **VERIFIED COMPLETE**. Every acceptance criterion has automated and simulator evidence. VoiceOver for the new Home elements joins the existing physical-device gate (D60/D63).
- Source: `main` at 2ae1372; this session's work is committed as 4cf1a59 (Phase 08, including D74).
- Build: EAS development simulator build a8045c3a-2238-4043-9983-f522e1f2fd0b (Phase 07), with JS served by the Metro that was already running (pid 46517, port 8081). There was no native, dependency or config change (the `plus`/`trash` SF Symbols and the SwiftUI `Menu` go through the existing `expo-symbols` and `@expo/ui`), so no new build, no update publication and no store action. Runtime 1.0.0 is not shared yet. **Schema 2** (`0002-goal-deletion`, D74) was added this session.
- Devices: iPhone SE (3rd gen) iOS 18.5, iPhone 17 Pro Max iOS 26.1, iPhone Duo iOS 27.1 (open, inner display). Text sizes: default (`large`) and largest (`accessibility-extra-extra-extra-large`).
- Owner decisions this session: D74 (no Archive; any goal can be deleted; Free keeps one goal in total; loss-of-Pro and Garden rules), see the section below; D70 (keep Add savings visible on short windows); D72, after the owner saw the first result (a deadline card instead of loose text, a floating button on Home and History, replacing D70's full-width bar); D73, after the second review (world first: goal administration into a ⋯ menu, the button labelled "+ Add savings", and the Island-as-star and milestone-unlock direction recorded for Phases 09/10). Engineering record: D71.
- TEST_PLAN: T02 (dashboard part), T06 (dashboard reflects corrections), T08, T18 partial (largest text; VoiceOver NOT RUN), T22 partial (SE/17 Pro Max fallback and Duo open native arrangement).

## Dependency verification

Phase 07.5 is verified complete ([evidence](PHASE_07_5.md); direction A and the honey accent per D64). The code was inspected before changing anything: `deadlineEstimate`, `inclusiveDayCount`, `stageFor`, `nextThresholdMinor`, `progressPercent` and `sceneFeedback` in `src/core/` already implemented the v1.2 formulas (Phase 04 tests), and Home already had direction A without the scene, callout and estimates. The baseline of 23 suites and 618 tests was green before any edit.

## What was built

| Requirement | Implementation |
| --- | --- |
| Home in direction A on `AdaptiveGoalLayout`, world first (D73) | `src/features/goals/presentation/home-screen.tsx`, top to bottom: world region; title with Paused / Target reached badges and the ⋯ goal menu (`goal-menu.tsx`, native SwiftUI `Menu`: History, Edit goal, Pause/Resume, Archive…, New goal); display amount and "saved of {target}"; `ProgressBar` with the floored percent and "{remaining} to go" or "{over} over target"; next-milestone callout on `accentSurface`; deadline card; Pro switcher. The floating "+ Add savings" button. No admin rows or Free footnote on Home; New goal at the Free limit explains the limit in an alert |
| Numbers straight from ledger queries | `homeDashboard()` (`home-dashboard.ts`) reads the committed snapshot (balance recomputed from `ledger_entries` by `listGoalSummaries`), the target and the deadline; `goalAmounts` adds `over` |
| Weekly/monthly pace with explanation and states | Phase 04 `deadlineEstimate` (inclusive D, BigInt ceil, min R) worded by `deadlineCopy` (`src/shared/i18n/deadline-messages.ts`) and shown by `DeadlineCard` (`deadline-card.tsx`, D72): date with "30 days left"/"Today", "€23.34 per week" and "€100.00 per month", an info button with the formula; Overdue (neutral badge, "€75.00 still to go · choose a new date in Edit goal"); Reached ("Nothing more to save by this date"); no deadline ("Add a deadline" row → Edit goal) |
| Recalculation after commits and on a new civil date | Every command caller already calls `refreshAppData()`; the snapshot now carries `today`. `src/bootstrap/foreground.ts` re-reads the date on AppState `active` and refreshes once only if it changed. No timer. One `appClock()` serves the snapshot, the commands and the forms |
| Overfunding numeric, scene capped at 10 | "€375.00 over target", 125%; `WorldScene` stage from `stageFor` (max 10); callout "All 10 milestones unlocked" |
| World region ready for Phase 09 | `src/features/worlds/world-scene.tsx` `WorldScene({ themeId, stage })`, `WORLD_SCENE_ASPECT` 4:3, rounded `radii.xl`, measured with `useMeasuredSize`/`fitAspect`, image role and label "Island world, n of 10 milestones unlocked"; only the stage line above text scale 1.35. Temporary inside, which Phase 09 replaces |
| Add savings visible on small screens and at large text; History the same | `FloatingActionButton` (`src/shared/ui/floating-action-button.tsx`): an "+ Add savings" pill (min 56 pt), only the + above text scale 1.35, same spoken name. Placed by the new `floatingAction` slot of `Screen` and `AdaptiveGoalLayout` (full-width trailing-aligned slot). Used on Home and on History (open goals only); the stacked scene cap went from 45% to 40% |
| Recovery from query errors | A failed read after the app has opened keeps the navigator; Home shows "Couldn’t load your goals" with Try again, never stale numbers |
| Goal switcher haptic | `haptics.selection()` after a successful `selectGoal` (custom control, Pro only) |

Planned path mapping (prompt "Expected files"): Home view model and UI → `src/features/goals/presentation/home-dashboard.ts`, `home-screen.tsx` and `deadline-card.tsx`. Estimate integration → the existing `src/core/calendar/deadline-estimate.ts`, unchanged and consumed by the view model. Amount and progress components → the existing `AmountText`/`ProgressBar`, unchanged, plus the new `FloatingActionButton`. Deadline strings → `src/shared/i18n/deadline-messages.ts`. Tests → `tests/unit/home-dashboard.test.ts` and `tests/integration/home-dashboard.test.tsx`.

## Layout findings and owner decisions (D70, D72)

1. **SE fold.** Measured with the real scene region at default text: the controls from the goal title down to the bottom of Add savings need about 400 pt, and about 500 pt are visible between the large title and the tab bar. Fitting Add savings under the scene would shrink the world to about 85 pt (tried at a 10% cap). The owner chose to pin Add savings (D70). It was first built as a full-width bar above the tab bar.
2. **Large title regression, found and fixed on the SE.** The first bar implementation wrapped the scroll view and the bar in a `View` with a background, and UIKit stopped collapsing Home's large title: content scrolled under a large "Home". The same happened with a single-child wrapper that had a background, and it did not happen without the wrapper. Fix: the wrapper is layout-only (`flex: 1`), so Fabric flattens it; the action is absolutely positioned over a full-frame scroll view, which gets the action's height as `contentInset.bottom`. Tests assert the wrapper style is exactly `{ flex: 1 }` and that the scroll view is its first child.
3. **First owner follow-up (D72).** The owner disliked the loose explanation text under the deadline ("confusing, complicates the picture") and asked for a card. They also asked to try Add savings as a floating + button at the bottom right, and the same on History. The bar was replaced by the shared floating button and the text by the deadline card, with the explanation behind an info button. At the largest text size the round button first grew to about 100 pt and covered the amount, so its glyph was capped (superseded by item 4).
4. **Second owner review (D73): world first.** The owner felt the screen looked like a classic finance app. Home now keeps only the world, progress, next milestone, deadline and Add savings. History, Edit, Pause/Resume, Archive and New goal moved to a native ⋯ menu next to the title; the Free footnote and the paused sentence left Home. The bare + was unclear (money or goal?), so the button reads "+ Add savings". At the largest text that pill was about 560 × 120 pt and ran off the SE's leading edge, so above scale 1.35 the button shows only the +. The slot became full-width and trailing-aligned with `maximum` sides so the pill stays inside the margins. The Island-as-star direction and the five-step milestone unlock moment are recorded in the Phase 09/10 prompts and roadmap, not built now (owner: finish the Island first, then review Home).

## Owner decision D74: no Archive, goal deletion, Free keeps one goal

After the D73 review the owner removed Archive completely. Statuses are now only active, paused and completed. Any goal can be deleted after a native confirmation that names what is lost. Free may keep one goal in total, in any status. Pro loss keeps all goals (one stays usable, the others read-only). A Garden goal stays visible after Pro loss but cannot progress until it switches to Island. The owner answered three open points: no Close goal, keep all goals after Pro loss, and any goal can be deleted. This overrides v1.2 on goals by explicit owner instruction.

| Area | Change |
| --- | --- |
| Rules | `src/core/access/capabilities.ts`: `goalLimit` (Free 1, Pro unlimited) counts all goals; `hasGoalSlot` for Create, `withinGoalLimit` for Reopen; error code `goal_limit` |
| Lifecycle | `goal-lifecycle.ts`: Pause, Resume, Finish, Reopen (completed → active); no Archive |
| Deletion | `deleteGoal` in `goal-commands.ts`: one exclusive transaction with operation ID, revision check and identifiers-only receipt. A completed goal is first set back to paused inside the same transaction (schema 1's closed-goal triggers protect its entries); then entries, the souvenir (if `collectibles` exists) and the goal are deleted. `deleteEntriesForGoal`, `deleteCollectiblesForGoal`, `deleteGoalRow`, `countGoals` in the repositories |
| Schema 2 | `src/data/db/migrations/0002-goal-deletion.ts`: drops `goals_no_delete`; any 'archived' row becomes 'paused' (revision + 1, records kept). Checksum pinned (`02eb49969587883c`); schema 1 unchanged |
| UI | Home ⋯ menu: History, Edit goal, Pause/Resume, New goal, **Delete goal…** (red, native destructive confirmation: "Delete “{title}”?" / "This permanently deletes the goal and its savings history. This action cannot be undone."). New goal on Free with a goal: "Build another world" alert (Pro or delete to start over). Collection: completed goals with Reopen and Delete ("Delete completed goal?" / the owner's text). Empty Home with only a finished Free goal explains Pro or deleting. Success: "Goal deleted" toast + one success haptic; failures: error toast |
| Tests | Unit (`goal-rules`, `access`, `ledger-history` pin); integration (`goal-ui` menu delete, cancel, Free limit and Collection completed delete/reopen; `ledger-ui` completed read-only and Reopen over the limit; `database-gate` schema 2); native scenarios S01-S05/S17/R2 for schema 2, G01-G06 reworked without Archive, new **G07** (delete a completed goal with entries and souvenir, stale/replay/not-found, currency unlock, injected failure rolls back) and **G08** (schema 1 → 2 upgrade: archived → paused, records kept, no-delete trigger gone, goal deletable) |
| Docs | A docs pass (subagent, reviewed) updated PRODUCT_REQUIREMENTS, SOURCE_RECONCILIATION, DATA_MODEL, ARCHITECTURE, UI_UX_GUIDELINES, DESIGN_SYSTEM, DEVELOPMENT_RULES, TEST_PLAN, RELEASE_CHECKLIST, DEVELOPMENT_ROADMAP, README, CLAUDE.md and prompts 09-22 (Phase 11: Collection Delete and real `collectibles` check; Phase 12: extend `deleteGoal` to challenge attempts; Phases 15-17: loss-of-Pro and Garden rules; Phase 16: "Build another world"). Completed-phase prompts 01-08 are kept as historical records |

## Commands and results

| Command | Environment | Result |
| --- | --- | --- |
| `npm run lint` | host | PASS (0 warnings) |
| `npm run typecheck` | host | PASS |
| `npm test -- --runInBand` | host, Jest + node:sqlite | PASS after D74: 25 suites, 654 tests (baseline was 23 suites, 618 tests). Before D74: 651. One intermediate run failed: Jest's default font scale is 2, so the button rendered compact and a label assertion in the dashboard test failed; the label is now tested in `shared-controls.test.tsx` at scale 1 and 3.1 |
| `npx jest tests/unit/home-dashboard.test.ts` | host | PASS 20 tests. Numbers: zero, partial, 99.99%, exact, 125%, the €2,000 example, JPY and KWD, de-DE. Pace: R=100.00 with D=30 gives €23.34/€100.00 and the formula text; deadline today gives "Today" and R for both; Overdue; funded before and after the deadline; no deadline; target and deadline edit paces. Clock boundaries: local midnight (Belgrade 21:59:59.999Z vs 22:00Z), Kiritimati vs Pago Pago, Sunday→Monday on the 25 Oct DST day, month end, leap day and a 366-day leap year |
| `npx jest tests/integration/home-dashboard.test.tsx` | host, real routes, test clock | PASS 8 tests (see below). Mutation check: listening for `inactive` instead of `active` in `foreground.ts` makes the midnight test fail |
| `npx jest tests/integration/adaptive-layout.test.tsx tests/unit/layout-metrics.test.ts` | host | PASS. The floating slot is outside the scroll view, absolute at bottom/right, edges `{off, additive, off, maximum}`, and gives `contentInset.bottom` 80 for a 56 pt button. The wrapper is flattenable. `Screen` accepts the same slot. In the native arrangement the slot sits in the controls region with no extra inset. The cap is 40% |
| `npx jest tests/integration/ledger-ui.test.tsx` | host | PASS 14: History's button is in the floating slot, is named "Add savings" and opens the form; closed goals have none; History is reached through the ⋯ menu |
| `tests/integration/goal-ui.test.tsx` | host | PASS: the ⋯ menu lists History, Edit goal, Pause goal, Archive goal…, New goal; New goal at the Free limit shows "One open goal on Free" and stays on Home; Pause, Edit (paused goal) and Archive work from the menu |
| `npm run deps:check`, `npm run doctor` | n/a | NOT RUN: no dependency or native change |
| `npm run test:db` | iPhone SE iOS 18.5, iPhone 17 Pro Max iOS 26.1, iPhone Duo iOS 27.1, real expo-sqlite, Metro | PASS on all three: 37/37 scenarios (S01-S18, G01-G08, L01-L08, I01, R1) + R2 restart verify 1/1. Each simulator's own app database upgraded in place to schema 2 when the app reloaded; on the SE the "Summer trip" goal and its 3 entries were kept (sqlite read of the container) |
| Release export check | n/a | NOT RUN: no development-only code was added; `WorldScene` is intentional release code |

Integration scenarios (`tests/integration/home-dashboard.test.tsx`):

1. €450 − €120 on a €1,500 goal due 21 Nov: €330.00, "saved of €1,500.00", €1,170.00 to go, 22%, €120.00 more to reach 30%. Card header "Deadline Nov 21, 2026, 30 days left"; "€273.00 per week or €1,170.00 per month". The info button opens the explanation alert with the formula. World 2 of 10; Add savings is the floating + named "Add savings".
2. Zero balance, no deadline: €0.00, 0%, €150.00 to reach 10%, "Add a deadline" row, no pace, 0 of 10.
3. Through the real forms: deposit to exactly €1,500 (100%, Target reached, card "target reached", no pace, 10 of 10), then €375 more (125%, €375.00 over target, still 10 of 10), then a €975 withdrawal (60%, €140.00 per week, 6 of 10), then a History correction to €1,000 (58%, €145.84 per week, 5 of 10).
4. Edit goal: target 100 → 200 (12%, €40.84 per week, stage 1), then deadline → 22 Dec (61 days, €20.09 per week or €86.07 per month), then the deadline removed ("Add a deadline", which opens Edit goal).
5. 23:59 on the deadline day shows "today" and €75.00 for both paces. A foreground on the same date re-reads nothing. A background, then 00:01 the next day, then foreground re-reads once: Overdue badge, "Deadline Oct 23, 2026, overdue", "€75.00 still to go. Choose a new date in Edit goal."
6. A funded goal after its deadline: no Overdue, "Nothing more to save by this date."
7. The read after a committed deposit fails once: the error and Try again show, no numbers, the deposit is in the database, the path is still `/`; Try again shows €50.00 and 50%.
8. Two open goals (Pro capabilities): choosing the other goal plays exactly one selection haptic and shows its numbers.

## Simulator walkthrough

Screenshots in [`phase-08/`](phase-08/), taken with `xcrun simctl io … screenshot` (Duo: `--display` 9BF0CE1D… for the inner display) and saved as 1000-px JPEGs. Scrolling and taps used the Claude Code iOS Simulator control. The floating gear "Tools" bubble at the top right is the Expo development client, not app UI. Screenshots of the earlier designs (bar, round +) were replaced by these D73 shots.

| Check | Device / setting | Result | Evidence |
| --- | --- | --- | --- |
| Home, default text | SE iOS 18.5, region Serbia | PASS: world 4:3, "Summer trip" with ⋯ at the trailing end, RSD 355.00 of 1,500.00, 23%, "+ Add savings" pill above the tab bar | `se-default-01-home` |
| ⋯ goal menu | SE default | PASS (D73 version, Archive since replaced by Delete): native pull-down; choosing History pushed the History screen | `se-default-04-history` |
| Scrolled Home | SE default | PASS: Home ends after the deadline card (no admin rows); large title collapsed; the card clears the button | `se-default-03-home-scrolled` |
| History | SE default | PASS: same "+ Add savings"; earlier in this session the round + version opened the Add savings sheet for the goal | `se-default-04-history` |
| Delete goal (D74) | SE default | PASS: ⋯ menu shows History (3 entries), Edit goal, Pause goal, New goal, Delete goal… in red; Delete opens "Delete “Summer trip”?" with the permanent-loss text; Cancel kept the goal (database read) | `se-default-02-goal-menu`, `se-default-05-delete-confirm` |
| Largest text | SE | PASS: scene placeholder shows only the stage line; the button shows only the + (about 85 pt) with its spoken name; the ⋯ moves under the title. The deadline card wrapping was checked with the D72 version (unchanged since) | `se-largest-01-home` |
| Large iPhone | 17 Pro Max iOS 26.1 | PASS: Paused badge, ⋯, card with "9 days left", RWF 9,563 per week; "+ Add savings" above the floating tab bar | `pm-default-01-home` |
| Alternate number and date locale | 17 Pro Max, language de-DE, region de_DE (restored afterwards) | PASS with the D72 version (numbers and card unchanged since): "50 RWF", "12.345 RWF", "1.185 RWF more to reach 10%", "31. Okt. 2026", "9.563 RWF per week" (ceil(12295 × 7 / 9) = 9563), "12.295 RWF per month". Screenshot replaced by the D73 set | (replaced) |
| Native arrangement | Duo iOS 27.1 open, portrait | PASS: ArrangementView with the scene above and the controls below; ⋯ beside "New bike"; "+ Add savings" floats at the bottom right of the controls region; "Add a deadline" row | `duo-open-01-home` |
| Duo closed, landscape collapse, split view, fold/rotate | n/a | NOT RUN this session. The collapsed arrangement uses the same stacked composition as the SE (Jest covers the switch). Split view stays a physical-Duo gate (D48) |
| VoiceOver of the new Home elements | n/a | NOT RUN: the simulator has no VoiceOver. Jest checks the accessible names (world image, progress text, callout, card header, per-week/per-month values, Overdue line, "Add savings" button, menu item labels). Joins the physical-device gate (D60/D63, Phases 19/21) |

## Files changed

- New: `src/features/goals/presentation/home-dashboard.ts`, `deadline-card.tsx`, `goal-menu.tsx`, `use-delete-goal.ts`, `src/data/db/migrations/0002-goal-deletion.ts`, `tests/support/goal-menu.ts`, `src/features/worlds/world-scene.tsx`, `src/shared/i18n/deadline-messages.ts`, `src/shared/ui/floating-action-button.tsx`, `src/bootstrap/foreground.ts`, `tests/unit/home-dashboard.test.ts`, `tests/integration/home-dashboard.test.tsx`, `docs/evidence/phase-08/` (8 screenshots), this file.
- Changed: `src/features/goals/presentation/home-screen.tsx`; `goal-amounts.ts` (`over`); `goal-copy.ts` (`FREE_SLOT_EXPLANATION`); `goal-form-screen.tsx` and `src/features/ledger/presentation/entry-form-screen.tsx` (today from `appClock()`); `src/features/ledger/presentation/history-screen.tsx` (floating Add savings); `src/bootstrap/app-data.ts` (`today`, app clock, failed state with `onboarded`, `reconcileCivilDate`); `src/app/_layout.tsx` (foreground hook, navigator kept on a later failed read); `src/shared/layout/adaptive-goal-layout.tsx`, `metrics.ts`, `screen.tsx` (floating slot, cap 40%); `src/shared/ui/icon.tsx` (`add` = `plus`); `tests/integration/adaptive-layout.test.tsx`, `goal-ui.test.tsx`, `ledger-ui.test.tsx`, `shared-controls.test.tsx`, `toast-and-icon.test.tsx`; `tests/unit/layout-metrics.test.ts`.
- Docs: DECISIONS (D70-D73), DESIGN_SYSTEM (Home composition, World-first direction, FloatingActionButton, `add` icon), ADAPTIVE_LAYOUT, ARCHITECTURE, TEST_PLAN, DEVELOPMENT_ROADMAP (08/09/10 notes), prompts/PHASE_09.md and PHASE_10.md (D73 direction), CLAUDE.md, PROJECT_STATUS, SESSION_HANDOFF.

## Acceptance criteria

| Criterion | Evidence |
| --- | --- |
| Dashboard matches ledger values in zero, partial, exactly complete and overfunded cases | Unit numbers tests; integration scenarios 1-3; SE/Pro Max/Duo screenshots |
| Deadline/clock changes update both paces; deadline today gives R for both; expired incomplete gives Overdue; R = 0 has no Overdue; no deadline has no estimates | Unit pace and clock-boundary tests; integration 4-6; SE screenshot (D = 1), Pro Max (D = 9), Duo (no deadline) |
| Small and large iPhones keep readable financial actions at increased text size | SE at the largest size with the compact + always visible (spoken "Add savings") and the card wrapping; 17 Pro Max largest checked with the earlier bar design; goal options in the ⋯ menu |

## Limitations and follow-ups

1. The world region is a temporary box until Phase 09's licensed art. Stage names in the callout arrive with the Phase 09 manifest.
2. A civil-date change while the app stays in the foreground across midnight shows at the next foreground or commit, not live (no timers, by design).
3. On iOS 18.5 the collapsed inline navigation bar is transparent, so scrolled content passes under "Home". This is unchanged from earlier phases (Phase 02 limitation).
4. "+ Add savings" floats over content until it is scrolled. At the largest text it is only a + (spoken name kept). Lifecycle actions are one tap further away in the ⋯ menu (D73); the menu's VoiceOver comes from SwiftUI (physical-device check).
5. Deferred by owner direction D73: the real Island as the star of Home and a Home review once it renders (Phase 09), and the five-step milestone unlock moment (Phase 10). Both are written into those prompts and the roadmap.
6. Duo closed/landscape and rotation were not re-shot this session. Split view and VoiceOver remain physical-device gates.
7. D74 follow-ups owned by later phases: loss-of-Pro (one goal usable, others read-only) and Garden-after-Pro-loss rules (Phases 15-17), the "Build another world" paywall (Phase 16, an alert until then), challenge attempts in `deleteGoal` (Phase 12), and the real `collectibles` table under deletion (Phase 11). A deleted goal cannot be recovered; the confirmation is the only safeguard, as the owner chose.
8. The goals CHECK still accepts the legacy 'archived' value (rebuilding the table only to drop it would recreate every goal trigger). No code writes it, and the row decoder refuses it.
