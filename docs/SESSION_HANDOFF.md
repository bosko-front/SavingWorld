# Latest session handoff

Session date: 25 October 2026. Session kind: Phase 12 (three fixed challenge rules and the attempt engine). Result: **Phase 12 VERIFIED COMPLETE**. Every acceptance criterion has pure Jest, host-SQLite and native-SQLite evidence; the phase has no UI and no physical-device check. Next prompt: [PHASE_13](prompts/PHASE_13.md).

The previous handoff (Phase 11) is superseded; its record remains in [PHASE_11 evidence](evidence/PHASE_11.md) and DECISIONS D95-D102.

## Completed

- Read the v1.2 DOCX (section 7 "Tri gotova izazova" and section 10 "Izazovi" in full) and the required docs. Verified the Phase 11 dependencies in code: the ledger mutation transactions with the souvenir award, `editGoal`, `deleteGoal`, the pure calendar and progression helpers. Baseline: clean `main` at 783f841.
- Schema 4 `src/data/db/migrations/0004-challenge-attempts.ts` (checksum `4255b9a308e7cb0c`, pinned):
  - the DATA_MODEL fields plus `milestone_stage` (the stage a Next milestone aims at, frozen);
  - partial unique indexes: one active attempt per goal, First step once per goal, Weekly step once per goal and saved week;
  - triggers: the started contract never changes, historical never becomes active or changes its end time, nothing changes to or from Skipped, no new attempt on a completed goal.
- `challenge-attempt-repository.ts`: list, get, ended-week goals, insert, outcome update, delete for a goal.
- `src/core/calendar/week.ts`: `isoWeekday`, `weekStartDate`, `weekEndDate`, `startOfCivilDateMs`; `utcTimestampAt` in `clock.ts`.
- `src/features/challenges/domain/challenge-rules.ts` (pure): counting, progress, settlement, availability with reasons and previews, the frozen start plan, the `ChallengeBoard` view for Phase 13.
- `src/features/challenges/application/`: `startChallenge`, `skipChallenge`, `closeEndedAttempts`, `reconcileGoalAttempts`; `readChallengeBoard`.
- Ledger: `createEntry`/`correctEntry`/`deleteEntry` recalculate the goal's attempts in their transaction; `completedAttemptId` on results.
- `deleteGoal` deletes the goal's attempts in its transaction.
- Foreground: `closeEndedChallengeAttempts()` before the civil-date check (`src/bootstrap/app-data.ts`, `foreground.ts`); `challengeCommandDeps()`.
- Tests:
  - `tests/native/challenge-scenarios.ts` H01-H07; G09 in `goal-scenarios.ts`; R1/R2 now carry an unacknowledged Next milestone start across the restart; schema pins moved to 4 (S01-S04, G08, C06, database-gate, ledger-history);
  - `tests/unit/challenge-rules.test.ts` (66);
  - `tests/integration/challenge-foreground.test.tsx`.
- Docs: evidence `PHASE_12.md` with `phase-12/` (test:db reports for the 17 Pro Max and SE); DECISIONS D103; DATA_MODEL, ARCHITECTURE, TEST_PLAN, README, CLAUDE.md, PROJECT_STATUS; PHASE_13 prompt and its roadmap entry name the Phase 12 API.

## Decisions

- D103 (engineering baseline): attempt schema, counting and settling rules, week end instant, in-ledger recalculation, `completedAttemptId`, command refusals, foreground close, board settled at read time.
- No product rule changed. Q01-Q06 stay resolved; nothing custom, no challenge pause, reminder or evidence link.

## Checks

- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm test -- --runInBand` PASS (35 suites, 874 tests). An earlier full run under machine load average 24-28 had two first-in-file UI tests exceed the 5 s Jest timeout; both files passed alone and the final run passed (evidence keeps the failure).
- `npm run test:db` (build 405064a9) PASS, 51/51 + restart verify:
  - iPhone 17 Pro Max iOS 26.1
  - SE 3 iOS 18.5 (app database upgraded 3 → 4 at launch)
  - Duo iOS 27.1: 51/51 through the script; the restart check (1/1) is in Metro's log because the slow relaunch outlasted the script's 900 s wait. Two earlier Duo attempts produced nothing (Metro stopped, black screen); details in the evidence.
- Release export PASS: 72 assets; scenario titles absent; schema 4 and the engine present.
- `deps:check`/`doctor`: NOT RUN (no dependency change).

## Incomplete work and blockers

1. No Phase 12 blocker. Carried items from earlier phases are unchanged (VoiceOver and felt haptics on a physical iPhone in Phases 19/21; RELEASE_CHECKLIST).
2. Performance note for Phase 21: each ledger change recalculates all attempts of the goal.
3. Git: Phase 12 is committed on `main` ("Phase 12: fixed challenge rules and attempt engine (D103)"); not pushed.
4. Simulator state: the 17 Pro Max, SE and Duo app databases are at schema 4 with their goals unchanged; the SE and Duo simulators were booted by this session (the Duo was rebooted once); the Phase 11 Metro (PID 4728) stopped, and this session's Metro (`.claude/launch.json` "metro") is running on port 8081.

## Exact next session

In ~/Desktop/SavingWorld, start Claude Code with the full `docs/prompts/PHASE_13.md` (fixed challenge catalog and attempt UX). Verify Phase 12 from this file and [PHASE_12 evidence](evidence/PHASE_12.md) first; do not redo it. Phase 13 builds the Challenges tab on `readChallengeBoard`, `startChallenge`, `skipChallenge`, the shared `/entry-form` and `completedAttemptId`, following DESIGN_SYSTEM "World-first design direction" (V05-V08 still need owner approval before they touch their screens).
