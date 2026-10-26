# Phase 12 evidence: Three fixed challenge rules and attempt engine

Session date: 25 October 2026. State: **VERIFIED COMPLETE**. Every acceptance criterion has pure Jest, host-SQLite and native-SQLite (`npm run test:db` on three simulators) evidence. This phase has no UI and no physical-device check (challenge screens are Phase 13). Next prompt: [PHASE_13](../prompts/PHASE_13.md).

## Context verified first

- Read the full v1.2 DOCX (textutil), including section 3 "Osnovni izazovi i podsjetnici", section 7 "Tri gotova izazova" (table and the four paragraphs under it) and section 10 "Izazovi". Also read README, PRODUCT_REQUIREMENTS, SOURCE_RECONCILIATION, DECISIONS (D26, D29, D52-D55, D74, D75, D95-D102), DEVELOPMENT_RULES, PROJECT_STATUS, SESSION_HANDOFF, ARCHITECTURE, DATA_MODEL, TECH_STACK, TEST_PLAN (T11, T12, T28), EAS_AND_OTA (schema/runtime rules) and the Phase 12 roadmap entry.
- Baseline: clean tree on `main` at 783f841 (Phase 11).
- Dependencies verified in code:
  - Shared ledger mutation transaction: `createEntry`/`correctEntry`/`deleteEntry` each run one `executeCommand` exclusive transaction with the candidate-history check, the souvenir award and a receipt (`src/features/ledger/application/ledger-commands.ts`).
  - Target mutation: `editGoal` changes target/deadline in its own transaction; attempts keep their frozen contract, so it needed no change.
  - Pure calendar helpers: `civilDateAt`, `today`, `addDays`, `inclusiveDayCount`, `deadlineEstimate` (`src/core/calendar/`), and `nextThresholdMinor`/`stageFor` (`src/core/progression/stage.ts`, which already documented the Next milestone formula).
  - D74 `deleteGoal` (`goal-commands.ts`): entries → souvenir → goal.
- Native and delivery: no native dependency or config change. Build **405064a9** runs the new JS through Metro: first PID 4728 (started by the Phase 11 session in this folder), which stopped during the session, then this session's own Metro from `.claude/launch.json`. Schema 4 is a persistence change; runtime 1.0.0 has never been shared, so this is local work under EAS_AND_OTA: no OTA was published. A shared runtime would need a new app version and native build for schema 4.

## What was built

| Area | Module | Behavior |
| --- | --- | --- |
| Schema 4 | `src/data/db/migrations/0004-challenge-attempts.ts` (checksum `4255b9a308e7cb0c`, pinned in `tests/unit/ledger-history.test.ts`) | `challenge_attempts` (STRICT) with the DATA_MODEL fields plus `milestone_stage`. CHECKs tie the shape to the rule and the result to the state. Partial unique indexes: one `active` per goal; First step once per goal; Weekly step once per goal and `week_start_date`. Triggers: the started contract never changes; a historical attempt never becomes active or changes its end time; nothing changes to or from `skipped`; no new attempt on a completed goal. RESTRICT foreign key to goals. |
| Repository | `src/data/repositories/challenge-attempt-repository.ts` | Rule/state/result constants, `ChallengeAttemptRecord` with row validation, `listAttemptsForGoal`, `getAttempt`, `listGoalsWithEndedWeeks`, `insertAttempt`, `updateAttemptOutcome`, `deleteAttemptsForGoal`. No progress column, no link table. |
| Calendar weeks | `src/core/calendar/week.ts`, `utcTimestampAt` in `clock.ts` | `isoWeekday`, `weekStartDate` (Monday), `weekEndDate` (Sunday), `startOfCivilDateMs(date, zone)`: the first instant (whole minute) at which the zone's civil date is that date, by a binary search over minutes through Intl (local midnight, or 01:00 when a DST change skips midnight). |
| Rules (pure) | `src/features/challenges/domain/challenge-rules.ts` | `countsForAttempt`, `attemptProgress` (`first_deposit` met / `amount` target, progress = max(0, counted sum) capped at 10^12, remaining, met), `settleAttempt`, `availability` (with `UnavailableReason` and an `AttemptPreview` of what would be frozen), `planAttempt` (the frozen contract), `challengeBoard` (current attempt, the three offers in catalog order, history newest first) and `AttemptView` for Phase 13. |
| Commands | `src/features/challenges/application/challenge-commands.ts` | `startChallenge` and `skipChallenge` (operation ID, receipt, typed refusals), `closeEndedAttempts` (foreground; idempotent, no receipt) and `reconcileGoalAttempts` (inside the ledger transactions). |
| Query | `src/features/challenges/application/challenge-queries.ts` | `readChallengeBoard(db, goalId, clock)`: one read snapshot, settled for the current instant. |
| Ledger integration | `ledger-commands.ts` | All three commands call `reconcileGoalAttempts` after the souvenir award, in the same transaction. `LedgerMutationResult.completedAttemptId`: the attempt this commit completed; null on a replay and for a correction that only changes a historical result. |
| Goal deletion | `goal-commands.ts` `deleteGoal` | Deletes the goal's attempts after its souvenir and before the goal row, in the same exclusive transaction. |
| Foreground | `src/bootstrap/app-data.ts` `closeEndedChallengeAttempts`, `challengeCommandDeps`; `src/bootstrap/foreground.ts` | On every return to active: settle ended weeks (refresh once if anything changed), then the existing civil-date check. |
| Dev runner | `src/dev/db-test-runner.tsx` | Includes `CHALLENGE_SCENARIOS`. |

Mapping to the planned paths: `src/features/challenges/domain/` → `challenge-rules.ts`; `application/` → `challenge-commands.ts`, `challenge-queries.ts`; `src/data/db/` → `0004-challenge-attempts.ts` and the repository in `src/data/repositories/`; `src/features/ledger/` → the reconciliation calls in `ledger-commands.ts` (the function itself lives in the challenges feature because start and skip use it too); `tests/unit/` → `challenge-rules.test.ts`; `tests/native/` → `challenge-scenarios.ts`, G09 and the restart pair. No duplicate module was created.

Decision: D103 (engineering baseline). No product rule changed.

## Acceptance criteria → evidence

| Criterion | Evidence |
| --- | --- |
| Exact three rules work offline; First step cannot start twice; only one unfinished attempt exists per goal | H01 (database refuses a second active attempt, a second First step, a second Weekly step in one week, wrong shapes, contract changes, reactivation and changes to/from Skipped), H02 (First step `already_used` after Completed and after Not completed), H05 (two competing starts: exactly one commits, the other gets `attempt_active`; receipt replay; changed payload `operation_conflict`), unit `availability` (`already_used` for every result including Skipped; `attempt_active` for all three rules). All local SQLite; no network code exists. |
| Weekly boundary, midweek, timezone and late-created backdated cases match the stored contract | H04 on native SQLite: a Wednesday start in Belgrade saves 19-25 October, `Europe/Belgrade` and the end `2026-10-25T23:00:00.000Z` (Monday 00:00 CET after the DST change); the frozen estimate 22,167 (R 95,000, D 30) stays after a target/deadline edit; travel to Honolulu keeps the saved end and refuses a second attempt; a deposit created after the end with a date inside the week does not count; correcting a counted record after the end turns Not completed into Completed and back; the next Monday a new attempt with a new estimate (27,258); `closeEndedAttempts` settles an expired week. Unit: Sunday 23:59 / Monday 00:00 starts, Tokyo, New York (both DST changes), Kathmandu, Santiago's missing midnight, Kiritimati and Honolulu; every createdAt/startDate/period/historical filter at its boundary. |
| Home-originated eligible records count automatically once; withdrawals, corrections and deletions update results without new money or historical reactivation | Every scenario adds money only through the shared `createEntry` command (the one Home uses); attempts are derived, never linked. H02/H03 (withdrawals reduce net progress, never below zero; deleting the completing deposit gives Not completed; no entry is created by any challenge command, counts checked), H05 (a real SQLite failure in the result write rolls the entry back; the retry saves both, one entry), H06 (Completed → Not completed → Completed by corrections while a First step is current; the slot stays with the current attempt; `completedAttemptId` stays null for historical changes and is set only when the current attempt completes), R1/R2 (an unacknowledged start replays after a process restart). |

Technical requirements:
- No custom definition/form, schedule versions, editable target/frequency, challenge pause, evidence links or challenge reminder: none exists; the three rule IDs are a CHECK and the start command takes only a rule ID.
- Amounts are global minor units with BigInt sums; calendar logic uses the saved zone and period (H04, unit).
- The historical marker (`state`) is independent of the corrected result and never returns to active (trigger + H01, H04, H06).
- Typed attempt view for Phase 13: `ChallengeBoard`/`AttemptView`/`Availability` with rule, availability and reason, preview of the frozen target, eligible progress, saved period and zone, historical result and the milestone a Next milestone aims at.

## Automated checks

| Check | Environment | Result |
| --- | --- | --- |
| `npm run lint` | macOS, Node 22 | PASS (0 warnings) |
| `npm run typecheck` | same | PASS |
| `npm test -- --runInBand` | same, host `node:sqlite` | First full run: 871/873, **FAIL** on two first-in-file UI tests (`ledger-ui` "50 − 20 = 30 …", `goal-ui` "asks for the one global currency …") that exceeded Jest's 5 s timeout while the machine's load average was 24-28 (total 292 s). Both files then passed alone (28/28, 20 s). **Final run after all edits: PASS, 35 suites, 874 tests (799 before), 73 s.** |
| New: `tests/unit/challenge-rules.test.ts` | Jest | PASS 66/66 |
| New: `tests/integration/challenge-foreground.test.tsx` | Jest, real routes | PASS. First version hung: a `waitFor` awaiting a database read never settled under the fake timers; it now waits for the store version and then reads. |
| New/changed native scenarios in Jest | host SQLite | H01-H07, G09, R1/R2 PASS; S01-S04/R2/G08/C06 pins moved to schema 4 (broken and future test migrations moved to version 5); database-gate seeds schema 4. |
| `npm run test:db` (real expo-sqlite, build 405064a9, Metro) | iPhone 17 Pro Max iOS 26.1 | **PASS** 51/51 + restart verify 1/1 (`phase-12/test-db-17-pro-max-ios26.1.json`); the app database was already at schema 4 (Metro reload). |
| `npm run test:db` | SW iPhone SE 3 iOS 18.5 | **PASS** 51/51 + restart verify 1/1; the app database upgraded 3 → 4 at launch (`phase-12/test-db-se3-ios18.5.json`). |
| `npm run test:db` | SW iPhone Duo iOS 27.1 | **PASS with a runner caveat.** The first two attempts produced no report: Metro (the Phase 11 session's, PID 4728) stopped during the session, and the Duo showed a black screen; a simulator reboot reported the runtime's own "Data Migration Failed" but booted. With this session's Metro (`.claude/launch.json` "metro", `--clear`), the cold bundle took 998 s on the loaded machine, past the 900 s limit, after which the app logged run `rmvope02ua` 51/51 passed. Rerun on the warm bundle: launch 1 run `rmvotpm7ma` **51/51 PASS** through the script; the relaunch for the restart check was slower than 900 s, so the script timed out before reading it, while Metro's log shows run `rmvotpm7mb (restart-verify): 1/1 passed`. No JSON report was saved for the Duo. |
| Release export (`npx expo export --platform ios`, to the session scratchpad) | same | PASS: 72 assets. Scenario titles ("Schema 4 defends attempts", "H04") absent; the schema 4 SQL and engine strings present. The one `dbtest-` string is the existing deletion guard in `expo-driver.ts`. |
| `deps:check` / `doctor` | — | NOT RUN: no dependency change. |

## Scenario catalog added

- **H01** schema guards (raw SQL).
- **H02** First step: a deposit made before the start or dated before the start date does not count, a withdrawal is no deposit, the counted deposit completes it, a retry replays without a second completion, deleting it gives historical Not completed, it never starts twice, another rule can start.
- **H03** Next milestone: €250 of €1,000 → threshold 300.00, target 50.00, milestone 3; a goal edit keeps them; 30 − 40 = net 0 (never negative); 30 − 40 + 60 completes it; the next offer reads target 100.00 for milestone 2 of a €2,000 goal; `target_reached` at B = T. Tiny target 0.03: three attempts of 0.01 aim at milestones 1, 4 and 7.
- **H04** Weekly step as in the criterion table.
- **H05** competing starts, replay, conflict, a failed skip and a failed start leave nothing, Skip, `attempt_not_active`, and a real SQLite failure in the result write (temporary trigger) rolling back the entry.
- **H06** historical correction while another attempt is current.
- **H07** schema 3 → 4 keeps every record.
- **G09** `deleteGoal` on a completed goal with a historical and a current attempt, its entries and souvenir: a failure keeps all; success removes all (foreign_key_check clean); replay; a new goal can start First step again.
- **R1/R2** a Next milestone start whose result is dropped survives the process restart (target 50.00, milestone 3) and replays to the same attempt.

## Limitations and notes

- Every ledger change recalculates all of the goal's non-skipped attempts (O(attempts × entries)). It is fast at test sizes; the Phase 21 profile with 10,000 entries should include a goal with a year of weekly attempts.
- An entry created in the same millisecond as the completion still counts for it (inclusive end). Harmless.
- A zone that turns its clock back across Sunday midnight would give one of two midnights; no current zone does.
- The simulators' app databases are now at schema 4 (17 Pro Max via Metro reload, SE at the test:db launch, Duo by the first run); their goals and entries are unchanged.
- The Duo's restart check is evidenced by Metro's log rather than a saved report (slow relaunch on a loaded machine). The 17 Pro Max and SE runs carry the full scripted restart evidence.

## Next

Phase 13 ([PHASE_13](../prompts/PHASE_13.md)): the challenge catalog and attempt UX on `readChallengeBoard`, `startChallenge`, `skipChallenge`, the shared entry form and `completedAttemptId`.
