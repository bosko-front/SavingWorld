# Latest session handoff

Session date: 23 October 2026. Session kind: Phase 04 implementation (exact money, calendar and progression rules). Result: **Phase 04 VERIFIED COMPLETE**. Next prompt: [PHASE_05](prompts/PHASE_05.md).

The previous handoff (Phase 03) is superseded; its record remains in [PHASE_03 evidence](evidence/PHASE_03.md).

## Completed

- Read the full v1.2 DOCX and the required docs (README, requirements, reconciliation, decisions, rules, status, handoff, architecture, data model, tech stack, test plan, Phase 04 roadmap entry). Re-ran the Phase 03 checks before any change: lint, typecheck, 119 tests PASS.
- Fetched ISO 4217 List One from SIX (published 2026-09-17) and generated `src/core/money/iso-4217.ts`: 155 savings currencies with exponents 0/2/3 (funds, metals, bond/SDR units and XTS/XXX excluded). Registry version 1.
- Built `src/core/` (pure TypeScript, no React/native/database imports):
  - `money/`: minor-unit guards and ceiling (10^12), `signedAmount`, BigInt `sumMinor`, checked `toMinorAmount`/`addMinor`; strict `parseAmount` with typed errors; `separatorsForLocale`; exact `toDecimalString`, `formatMoney` (registry exponent, Latin digits, exact up to 10^15) and `formatAmountInput` (round-trips through the parser).
  - `calendar/`: validated `CivilDate`, day-number arithmetic, inclusive day count, entry-date and new-deadline rules, `Clock`/`systemClock`/`fixedClock`/`today`/`utcTimestamp`, and `deadlineEstimate` (none/funded/overdue/pace, v1.2 formulas on BigInt).
  - `progression/`: `stageFor`, `stageThresholdMinor`, `nextThresholdMinor`, `remainingMinor`, `isFunded`, floored `progressPercent`, visual-only `sceneFeedback`; `THEME_IDS` (island, garden).
  - `access/`: frozen Free/Pro `Capabilities`, `DEFAULT_ACCESS_LEVEL = 'free'`, `hasOpenGoalSlot`, `canUseTheme`.
  - `result.ts`: shared `Result` type.
- ESLint: `src/core/**` cannot import React/React Native/Expo/zustand or app-layer `@/` modules, and cannot call `Date.now()`, `new Date()` or `parseFloat` (only `calendar/clock.ts` may read the real time).
- Tests: six new unit suites (302 tests) covering every requirement example and the phase's table tests.
- Docs: [PHASE_04 evidence](evidence/PHASE_04.md), DECISIONS D50-D51, PROJECT_STATUS, this file, ARCHITECTURE (Phase 04 paths), TECH_STACK (registry source), README, CLAUDE.md (Phase 04 facts), and a carried Hermes Intl check in the Phase 06 prompt and roadmap entry.

## Decisions

D50 (currency registry source/selection and strict parsing/formatting rules), D51 (calendar/progression/access contracts, `src/core` purity lint, scope boundaries with Phases 05/12/18). No product decision changed.

## Checks

lint PASS, typecheck PASS, `npm test -- --runInBand` PASS (13 suites, 421 tests), `npm run deps:check` PASS, expo-doctor 20/20 PASS. The first run of the new suites had 10 failures caused by a wrong test expectation (one-unit-above for target 10, stepping past the ceiling); the expectation was fixed, the implementation was not changed. No package, native config or EAS change; no build, update or store action. Details: [PHASE_04 evidence](evidence/PHASE_04.md).

## Incomplete work and blockers

None for Phase 04. Carried items:

1. Phase 06 (first on-device use): observe Hermes `Intl` output of `formatMoney`, `separatorsForLocale` and `today(systemClock)` after a simulator time-zone change. Jest ran them on Node ICU only.
2. Phase 03 gates unchanged: physical iPhone Duo split view (D48), VoiceOver (Phase 19), closed-Duo landscape focus limitation.
3. Phase 04 is committed on `main` at the owner's request. Nothing pushed.

## Exact next session

1. In ~/Desktop/SavingWorld start Claude Code with the full `docs/prompts/PHASE_05.md` (SQLite migrations and ledger repositories; real iOS SQLite runner required).
2. Read v1.2 and the required docs, rerun lint/typecheck/tests, then build on `@/core/money` (`signedAmount`, `sumMinor`, `toMinorAmount`, `MAX_MINOR`) and `@/core/calendar` (`CivilDate`, `parseCivilDate`, `validateEntryDate`, `Clock`, `utcTimestamp`). Chronological running-balance enforcement (date, createdAt, id order) is Phase 05's own rule; do not duplicate the domain helpers.
