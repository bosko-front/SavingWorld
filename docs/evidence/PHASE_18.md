# Phase 18 evidence: Four precise Pro savings statistics

Session dates: 26-27 October 2026. State: **VERIFIED COMPLETE by owner decision D133** (27 October 2026: the owner carried the Statistics VoiceOver check to Phases 19/21 like D107/D130 and closed the phase). Before that decision: Every acceptance criterion has automated, native SQLite (Expo SQLite on the simulator) and simulator-look evidence below; the phase's required chart VoiceOver check cannot run in the iOS Simulator and was NOT RUN, so the phase is not verified complete until it runs on a physical iPhone or the owner carries it to Phases 19/21 as in D102/D107/D128/D130. The Pro screen with real data was seen only in Jest and through the development-only fixture preview, because the simulators have no Pro purchase. Decision: D131 (engineering; no product rule changed).

## Context verified first

- Read the full v1.2 DOCX with `textutil -convert txt -stdout` (section 4 "Pro statistika obuhvata…", section 6 "Pro Statistics: četiri prikaza…", section 7 "Historijski graf sabira sve važeće transakcije…", section 10 "Pro"), then README, PRODUCT_REQUIREMENTS (R18, R19, R22), SOURCE_RECONCILIATION (Q06), DECISIONS (D74, D75, D84, D97, D117), DEVELOPMENT_RULES, PROJECT_STATUS, SESSION_HANDOFF, ARCHITECTURE ("Deadline and statistics queries"), DATA_MODEL ("Four Pro statistics"), TECH_STACK (charts: react-native-svg, no framework), TEST_PLAN (global EUR fixture), UI_UX_GUIDELINES (Statistics row, chart text), DESIGN_SYSTEM ("World-first design direction", Statistics row, V07) and ADAPTIVE_LAYOUT (Statistics row, `useMeasuredSize`), and the roadmap Phase 18 entry.
- Baseline: clean `main` at e3af610 ("Phase 17 … verified complete by owner decision (D129-D130)").
- Phase 17 dependency verified from code: goal statuses are only active/paused/completed (`GOAL_STATUSES`), souvenirs live in `collectibles` keyed by goal (separate from status), `deleteGoal` removes entries and souvenir, ledger reads recompute balances from `ledger_entries`, and `canOpenStatistics` exists in `@/core/access` (D117) with no entry point yet. `react-native-svg` 15.16.0 was already installed (Phase 06); no package was added.
- Another session's Metro (`expo start --dev-client --clear`, started from this folder) served the simulators; four simulators were booted.

## What was built

| Area | Module | Behavior |
| --- | --- | --- |
| Domain (pure) | `src/features/statistics/domain/savings-statistics.ts` | `statisticsPeriod(today)`: the 30-day line is today and the 29 dates before; the month is the local calendar month of today; entries are read one by one from the earlier of the two starts. `savingsStatistics`: (1) total = BigInt sum of every existing goal's current balance; (2) gross deposits and gross withdrawals dated in the month, separate from the net; (3) 30 end-of-day all-goal balances, carrying every earlier entry in as the opening balance, consecutive dates (days without activity repeat the previous balance); (4) count of goals whose status is completed. An entry dated after today (device clock moved back) counts in the total and month, on no point. `presentable` refuses amounts beyond `MAX_FORMAT_MINOR` (exact formatter bound) instead of rounding. |
| Repository | `src/data/repositories/statistics-repository.ts` | `readGoalCounts` (goals in any status; status = completed, never souvenirs), `listGoalLedgerSums` (one sum per goal, all entries or those before a date; each per-goal sum is a chronological running balance, so within 0..MAX_MINOR and checked by the row codec), `listDatedAmountsFrom` (single entries from a date). Current rows only: deleted goals' entries are gone (D74); no snapshot table, souvenirs not read. |
| Query + Pro guard | `src/features/statistics/application/statistics-queries.ts` | `readSavingsStatistics(db, capabilities, today)` returns `pro_required` without reading when `canOpenStatistics` is false; otherwise one read snapshot for all four views. |
| Presentation | `src/features/statistics/presentation/statistics-model.ts`, `statistics-screen.tsx` | "Your savings at a glance" (D97): headline total; "This month" with the month name and two small cards (Deposits, Withdrawals) like the savings plan (D84), stacked above text scale 1.35, both in the primary text color; "Last 30 days": the line in a card with start date / "Today", a summary sentence ("Up from … on … to … today." / "… today, from … on …." / "Steady at … since …." / "Your line starts with your first savings."), and a collapsible "Daily balances" list of all 30 days, newest first; "Completed goals" row with the count, opening Collection. States: loading (spinner with a spoken label), read failure (Notice + Try again), currency unreadable, no goals (invitation + Create a goal), Pro missing or lost (invitation + Explore Pro → `/paywall`), totals too large to show exactly (Notice). The read re-runs after every `refreshAppData()` and when the snapshot's civil date changes. |
| Chart | `src/shared/ui/line-chart.tsx` | Minimal react-native-svg line on a zero baseline, honey → soft green stroke (user-space gradient, so a flat line still draws), faint warm fill, dot on today; sized from its own measured width (`useMeasuredSize`), 120-220 pt tall; one image for VoiceOver with the summary as its label; no motion. |
| Entry points | `goal-menu.tsx`, `home-screen.tsx`, `pro-settings.tsx`, `billing-copy.ts`, route `src/app/(tabs)/(home)/statistics.tsx`, Home stack title | Pro only: Home ⋯ "Savings insights" (after History) and a "Savings insights" row under the Pro row in Settings (reachable when no goal is open on Home). Free sees neither; a deep link shows the Pro invitation. |
| Dev | `src/dev/statistics-preview.tsx`, route `dev-statistics`, Settings › Development only › Statistics preview | Fixture ledgers (`?sample=rising|flat|lower|large`) through the same domain/model/screen, for layout checks without a Pro purchase. Never the person's data, no capability override; release bundles omit it. |

Scope mapping: the prompt's `src/features/statistics/` (domain, application, presentation), `src/data/repositories/` (statistics-repository), `src/shared/ui/` (line-chart), `src/app/` (one Statistics route in the Home stack, because Statistics opens from Home, UI_UX_GUIDELINES).

## Acceptance criteria

| Criterion | Evidence | Result |
| --- | --- | --- |
| All four views match independently computed fixtures; current-month gross values and 30 daily points have exact semantics | `tests/unit/savings-statistics.test.ts` (periods incl. month ends, leap day, year change; opening balance, sparse days, same-day order, month days before the line, entry after today, sums above one goal's ceiling, formatter bound); native P01/P02 with hand-written expected arrays; `statistics-ui.test.tsx` words and daily rows | PASS |
| A goal with a souvenir but active/paused status is not counted; explicit Finish changes the count | P01 (Camera: souvenir, paused, not counted; Desk Finish → 2, Reopen → 1 with 3 souvenirs unchanged, Finish → 2; deleting completed Bike → 1); UI test Reopen → 0, Finish → 1 | PASS |
| Backdated edit/deletion updates opening balance/month/series; chart information accessible without graphics | P01 (withdrawal moved from 20 Sep to 2 Oct: opening 20,000 → 25,000, month withdrawals 2,000 → 7,000, line steps; deleting the 30 Sep deposit; deleting a goal); UI test correction moves a deposit out of the opening balance; the line's summary sentence, the image label and the 30-row list carry every value | PASS (automated); VoiceOver hearing it NOT RUN |

## Checks

| Check | Environment | Result | Detail |
| --- | --- | --- | --- |
| `npm run lint` | host | PASS | exit 0 after the final edits |
| `npm run typecheck` | host | PASS | exit 0 |
| `npm test -- --runInBand` | host, Jest | PASS | 52 suites, 1161 passed, 1 skipped (env-gated still-stack writer); baseline 50 suites, 1133. New: 18 unit, 7 UI, 3 scenarios on host SQLite |
| `npm run test:db -- --device D4BA6D4D… --record docs/evidence/phase-18/test-db-17promax-ios26.0.json` | iPhone 17 Pro Max iOS 26.0 simulator, dev build 7769c486, real expo-sqlite, Hermes | PASS | 55/55 (P01 66 ms, P02 44 ms, P03 35 ms on native SQLite) + R2 restart verify 1/1; app database stays at schema 5 (nothing applied); record in [test-db-17promax-ios26.0.json](phase-18/test-db-17promax-ios26.0.json) |
| `npm run deps:check` / `npm run doctor` | host | 1 check failed (not caused by this phase) | Six newer SDK 58 patch releases (`@expo/ui` 58.0.23, `expo` 58.0.19, `expo-dev-client` 58.0.15, `expo-font` 58.0.10, `expo-router` 58.0.26, `expo-sqlite` 58.0.14). No package changed in this phase; an SDK patch upgrade is its own reviewed change (CLAUDE.md), as recorded since Phase 09 |

Unit and integration tests:

- `tests/unit/savings-statistics.test.ts`: `statisticsPeriod` on six dates; the four views from a hand-written ledger; same-day order independence; 31 Oct (1 Oct in the month and the opening balance); entry after today; five goals at the ceiling summed exactly; the formatter bound; inconsistent input refused; view wording (total, month sentence, rising/lower/steady/empty summaries, 30 rows newest first, completed detail), no loss/trading words; `lineFractions`; `chartPoints` clamping and even spacing.
- `tests/integration/statistics-ui.test.tsx` (real routes, host SQLite, Pro bought through the real billing path over the fake store, test clock): Free has no menu item or Settings row and the deep link shows the invitation (→ `/paywall`); Pro opens it from the ⋯ menu and Settings; total €255.00, October €80.00/€5.00, summary, image role and label, completed row → `/collection`, daily list toggle with `expanded` state and six spot-checked days; backdated correction, entry deletion, Reopen/Finish recalculate; a new day and month (1 Nov) via `reconcileCivilDate`; Pro without goals → invitation → `/goal-form`; a verified refund while the screen is open → invitation, no numbers.
- `tests/native/statistics-scenarios.ts` (P01-P03, also registered in `src/dev/db-test-runner.tsx`): P01 four goals across statuses and souvenirs, opening balance, same-day withdrawal, Finish/Reopen/Finish, backdated correction, entry deletion, completed-goal deletion; P02 31 Oct vs 1 Nov boundaries and an entry dated after today; P03 Free refusal and an empty ledger.

## Simulator look

| Shot | Device | What it shows |
| --- | --- | --- |
| [01](phase-18/01-preview-17promax.png) | 17 Pro Max iOS 26.0, default text, dev preview `rising` (app currency RSD) | Headline total, month cards, honey→green line with dot, dates, summary, Daily balances, Completed goals → Collection |
| [03](phase-18/03-locked-free-17promax.png) | 17 Pro Max, Free app data, `savingworlds://statistics` | Pro invitation, Explore Pro (the blue bar is Metro's "Refreshing…" banner) |
| [04](phase-18/04-preview-se-ax-xxxl.png), [05](phase-18/05-preview-se-ax-xxxl-chart.png) | SE 3 iOS 18.5, accessibility XXXL | Before the fix: realistic amounts wrap at the space and cards stack, but the axis labels ran past the card edge |
| [02](phase-18/02-preview-se-ax-xxxl-large.png) → [06](phase-18/06-se-ax-xxxl-large-after.png), [07](phase-18/07-se-ax-xxxl-chart-after.png), [08](phase-18/08-se-ax-xxxl-axis-after.png) | SE, accessibility XXXL, `large` sample | Fixed: the axis wraps inside the card with "Today" at the trailing edge; the headline uses the large role above 1.35× text, so a 72-billion total breaks at a digit group instead of mid-group |

The SE's text size was restored to "large" afterwards. The floating gear at the lower right in the shots is the development client's tools button, not app UI.

## Polish (owner request, 27 October 2026)

Built: step chart with value and date labels and a day inspector (tap/drag, VoiceOver adjustable), "Net change" card in place of the summary sentence, tab bar hidden, compact circular Back (D131 point 6). Calculations unchanged.

| Check | Environment | Result |
| --- | --- | --- |
| `npm run lint`, `npx tsc --noEmit` | host | PASS (after the final edits) |
| `npx jest --ci --testTimeout=180000 tests/unit/savings-statistics.test.ts tests/integration/statistics-ui.test.tsx tests/integration/navigation.test.tsx` | host, Jest | PASS 40/40 (unit 22: chart points/domain/gridlines/date labels, flat/zero/negative, net change vs month deposits, step geometry, nearest day; UI: adjustable chart value, VoiceOver decrement, tap selects the nearest day, net change after correction and month rollover). The full suite was not rerun at the owner's request (load average 400-600 made it very slow). |
| Simulator look | 17 Pro Max iOS 26.0 default text; SE iOS 18.5 accessibility XXXL | [09](phase-18/09-polish-inspect-day-17promax.png) a tapped day; [10](phase-18/10-polish-flat-17promax.png) all-zero series; [11](phase-18/11-polish-se-ax-xxxl-top.png)-[13](phase-18/13-polish-se-ax-xxxl-net-change.png) SE at the largest text; [14](phase-18/14-polish-final-17promax.png) final. Shots 09 and 10 predate moving the zero label below the baseline. Found and fixed: the zero label covered the line at large text; Hermes ignored `signDisplay` (no "+"). The negative series was checked visually through `?sample=negative` (not possible from a valid ledger). |

Noticed, not changed (other screen): History rows also rely on `signDisplay: 'exceptZero'`, so on iOS a deposit may show without "+" there; the deposit/withdrawal word and icon still say which it is. Worth a check in Phase 19.

## Not run and carried

- Chart and screen VoiceOver (focus order, the image label, the collapsible list, the Collection row): NOT RUN, the iOS Simulator has no VoiceOver; needs a physical iPhone (Phase 19/21 gate unless run before the phase closes).
- Duo open/closed reflow of the chart: NOT RUN natively; the chart sizes from its measured width (same primitive as the rest of the layout); covered by the shared layout and Phase 21's matrix.
- The Pro screen with a real purchase on a device: not seen; the simulators are Free (no StoreKit configuration in the dev build); Jest covers it over the real billing queue.

## Limitations

- Implausibly large all-goal totals (tens of billions) can still break inside a number at the largest accessibility sizes; realistic amounts wrap at the currency space (Phase 19 audit).
- The read loads every entry from the earlier of the line's and month's first dates, and one sum per goal before it; Phase 21 profiles 10,000 entries.
- V07 ("finished worlds" wording) is still an open owner proposal; the row says "Completed goals" (the default when not approved).

## Files changed

New: `src/features/statistics/domain/savings-statistics.ts`, `src/features/statistics/application/statistics-queries.ts`, `src/features/statistics/presentation/statistics-model.ts`, `src/features/statistics/presentation/statistics-screen.tsx`, `src/data/repositories/statistics-repository.ts`, `src/shared/ui/line-chart.tsx`, `src/app/(tabs)/(home)/statistics.tsx`, `src/app/(tabs)/(home)/dev-statistics.tsx`, `src/dev/statistics-preview.tsx`, `tests/unit/savings-statistics.test.ts`, `tests/integration/statistics-ui.test.tsx`, `tests/native/statistics-scenarios.ts`, `docs/evidence/phase-18/`.
Changed: `src/app/(tabs)/(home)/_layout.tsx`, `src/features/goals/presentation/goal-menu.tsx`, `src/features/goals/presentation/home-screen.tsx`, `src/features/billing/presentation/pro-settings.tsx`, `src/features/billing/presentation/billing-copy.ts`, `src/dev/settings-development.tsx`, `src/dev/db-test-runner.tsx`, `tests/integration/database-scenarios.test.ts`, and the documents listed in SESSION_HANDOFF.

No schema change, no migration, no new dependency, no native change, no build, no update.
