# Phase 04 evidence: Exact money, calendar and progression rules

Session date: 23 October 2026. Product authority: [MVP plan v1.2](../Saving_Worlds_MVP_Plan_v1_2.docx), read in full (text and tables) with `textutil -convert txt -stdout` before any change. Phase state at close: **VERIFIED COMPLETE** (see [Result](#result)). Applicable test IDs: T01 (exact amounts, 0/2/3 decimals, invalid/overflow), T02 (€2,000 thresholds, withdrawal, 105%), T03 (tiny targets and every boundary neighbor; transitions/supersession remain Phase 10), T08 (inclusive-day deadline pace, month/leap/DST boundaries), T15 (capability contract only; enforcement is Phase 16).

## Starting state and dependency evidence

- Working tree: `main` at `8279da0` (Phase 07.5 docs on top of Phase 03 `5984460`), clean. No `src/core/` existed; no money, calendar or progression code anywhere in `src/` (`AmountText` only displays a preformatted string, as its Phase 02 comment says).
- Phase 03 dependency re-verified before changes: `npm run lint` PASS, `npm run typecheck` PASS, `npm test -- --runInBand` PASS (7 suites, 119 tests). Phase 04 needs no native code, so the Phase 03 native results were not repeated.
- Scope boundaries checked against the roadmap: chronological running-balance enforcement belongs to Phase 05 ("Enforce … nonnegative chronological subtotals"), Monday–Sunday attempt periods to Phase 12, month windows to Phase 18. Phase 04 provides the exact primitives they use and does not implement those rules early.

## Toolchain

| Item | Value |
| --- | --- |
| Node / Jest | Node 22.16.0 (full ICU), Jest 30 via `jest-expo/ios` preset |
| Expo | SDK 58 (expo 58.0.17), RN 0.88.0, TypeScript 6.0 strict |
| Native build | None needed: no native dependency, config or plugin changed. No EAS build or update. |

## Implementation

| Planned path | Actual module |
| --- | --- |
| `src/core/money/` | `minor-units.ts` (MAX_MINOR = 1,000,000,000,000, safe-integer guards, `signedAmount`, BigInt `sumMinor`, checked `toMinorAmount`/`addMinor`), `iso-4217.ts` (generated registry data), `currency.ts` (`CURRENCY_REGISTRY` version/source/date, `getCurrency`, `isSupportedCurrency`, `supportedCurrencies`), `separators.ts` (`separatorsForLocale`, `DEFAULT_SEPARATORS`), `parse-amount.ts` (`parseAmount`), `format-amount.ts` (`toDecimalString`, `formatMoney`, `formatAmountInput`, `MAX_FORMAT_MINOR`), `index.ts` |
| `src/core/calendar/` | `civil-date.ts` (branded `CivilDate`, `parseCivilDate`, day-number arithmetic, `addDays`, `daysBetween`, `inclusiveDayCount`, `validateEntryDate`, `validateNewDeadline`), `clock.ts` (`Clock`, `systemClock`, `fixedClock`, `today`, `civilDateAt`, `utcTimestamp`), `deadline-estimate.ts` (`deadlineEstimate`), `index.ts` |
| `src/core/progression/` | `stage.ts` (`stageFor`, `stageThresholdMinor`, `nextThresholdMinor`, `remainingMinor`, `isFunded`, `progressPercent`, `sceneFeedback`), `theme-ids.ts` (`THEME_IDS`, `isThemeId`), `index.ts` |
| `src/core/access/` | `capabilities.ts` (`Capabilities`, `FREE_CAPABILITIES`, `PRO_CAPABILITIES`, `DEFAULT_ACCESS_LEVEL = 'free'`, `capabilitiesFor`, `hasOpenGoalSlot`, `canUseTheme`), `index.ts` |
| shared | `src/core/result.ts` (`Result`, `ok`, `err`) |
| guardrail | `eslint.config.js`: `src/core/**` may not import React, React Native, Expo, `@expo/*`, zustand or any `@/` module outside `@/core`; no `Date.now()`, argument-less `new Date()` or `parseFloat` except the clock boundary file. Verified by linting a probe file (2 expected errors), then deleting it. |
| `tests/unit/` | `money.test.ts`, `currency-registry.test.ts`, `calendar.test.ts`, `deadline-estimate.test.ts`, `progression.test.ts`, `access.test.ts` |

Behavior delivered:

- **Money.** Amounts are safe-integer minor units within ±1,000,000,000,000. Sums use BigInt and go back to a stored number only through a checked conversion (`out_of_range` beyond the ceiling); all-goal sums may exceed the ceiling as BigInt. `signedAmount(kind, amount)` makes the kind decide the sign of a positive amount.
- **Parsing.** `parseAmount(text, exponent, separators)` accepts ASCII digits plus the locale's decimal and group separators only; grouping must match the locale exactly (thousands or Indian); at most `exponent` decimals (extra digits, even zeros, are rejected, never rounded); result 1..MAX_MINOR. Typed errors: `empty`, `signed`, `invalid_character` (letters, symbols, `1e3`, `Infinity`, `NaN`, non-ASCII digits), `malformed`, `malformed_grouping`, `too_many_decimals`, `not_positive`, `too_large`. Space-like group separators (space, NBSP, narrow NBSP) and the two apostrophes are interchangeable because iOS keyboards cannot type the typographic ones.
- **Formatting.** `formatMoney` always uses the registry exponent (overriding Intl/CLDR defaults that differ from ISO, e.g. IQD 3 decimals) and Latin digits. Exactness argument: any integer up to 10^15 has at most 15 significant digits, so the double `minor / 10^exponent` rounds back to the exact digits; above `MAX_FORMAT_MINOR` (10^15) it throws instead of showing a wrong digit. `formatAmountInput` prefills edit fields with text `parseAmount` reads back to the same value.
- **Currency registry.** See [Currency registry source](#currency-registry-source).
- **Calendar.** Civil dates are `YYYY-MM-DD` strings validated for real dates (leap years included), with integer day-number arithmetic (no Date, no midnight-UTC conversion), so DST and time zones never change a day count. `Clock` is the injected boundary (`nowMs`, `timeZone`); `today(clock)` reads the civil date in the clock's zone through `Intl.DateTimeFormat`. Entry dates may not be in the future; new deadlines may not be in the past.
- **Deadline pace.** `deadlineEstimate` returns `none` (no deadline), `funded` (R = 0: zero pace, never Overdue), `overdue` (deadline passed and R > 0: remaining, no division) or `pace` with inclusive D, `weekly = min(R, ceil(7R/D))`, `monthly = min(R, ceil(30R/D))` on BigInt. No contribution calendar and no entry is created.
- **Progression.** One stage function `min(10, floor(10B/T))` on BigInt for every theme; thresholds `ceil(kT/10)`; `nextThresholdMinor` matches v1.2's Next milestone formula; `progressPercent` floors (99.999% → 99.99, never 100; 105% stays 105); `isFunded` is the exact B ≥ T test. `sceneFeedback` gives float fractions for animation only, clamped to 0 ≤ x < 1 below the target.
- **Capabilities.** Free: 1 open goal (active + paused), Island only, no open-goal theme switching, no Pro statistics. Pro: unlimited, Island and Garden, switching, four statistics. Default production level is Free with no override. No challenge capability exists: the three fixed challenges are identical in Free and Pro. Themes are keyed per theme for possible later products; none is sold.

## Currency registry source

- Source: ISO 4217 List One, maintenance agency SIX Group, `https://www.six-group.com/dam/download/financial-information/data-center/iso-currrency/lists/list-one.xml`, root attribute `Pblshd="2026-09-17"`. Fetched on 23 October 2026 and parsed with Python's `xml.etree` (output printed to the terminal, not saved). 178 distinct alphabetic codes.
- Selection rule (bundled, 155 codes): every entry with a numeric `CcyMnrUnts`, excluding `IsFund="true"` codes (BOV, CHE, CHW, CLF, COU, MXV, USN, UYI, UYW, XAD) and the `N.A.` minor-unit codes (metals XAU/XAG/XPD/XPT, bond units XBA–XBD, XDR, XSU, XUA, XTS, XXX). Exponents in the bundled set: 0, 2 and 3 only.
- `src/core/money/iso-4217.ts` is generated by that script from the XML (name, numeric code, exponent per code); it says not to edit by hand. Regenerating means rerunning the same selection on a newer List One, bumping `CURRENCY_REGISTRY.version` and recording the change in DECISIONS, because settings store code + exponent + registry version.
- Notable entries confirmed in the source: Bulgaria and Croatia list EUR (BGN and HRK are absent), Curaçao and Sint Maarten list XCG (ANG absent), Zimbabwe lists ZWG, Sierra Leone SLE.

## Verification

| Check | Environment | Result | Observed | Evidence / remaining action |
| --- | --- | --- | --- | --- |
| Baseline `npm run lint && npm run typecheck && npm test -- --runInBand` before changes | Node 22.16.0 | PASS | exit 0; 7 suites, 119 tests | Phase 03 tree intact |
| New suites, first run | Node 22.16.0 | FAIL (test bug) | 10 failures in `progression.test.ts`: the "one unit above" expectation assumed every threshold is more than one unit apart (false for target 10) and stepped past MAX_MINOR at the bound | Expectation fixed to use the next listed threshold and skip the step beyond the ceiling; implementation unchanged |
| New suites, rerun | Node 22.16.0 | PASS | 6 suites, 302 tests | — |
| `npm run lint` | final tree | PASS | exit 0, 0 warnings | includes the new `src/core` purity rules |
| `npm run typecheck` | final tree | PASS | exit 0 | — |
| `npm test -- --runInBand` | final tree | PASS | exit 0; 13 suites, 421 tests | — |
| `npm run deps:check` | final tree | PASS | "Dependencies are up to date" | no package changed |
| `npm run doctor` | final tree | PASS | 20/20 checks | — |
| Lint guard probe (`src/core/__lintprobe.ts` importing react and calling `Date.now()`) | ESLint | PASS | 2 expected errors | probe deleted |

Acceptance criteria:

| Criterion | Test | Result |
| --- | --- | --- |
| €2,000 examples: €199.99 → 0, €200 → 1, €1,000 → 5, €2,000 → 10, withdrawal to €1,800 → 9, €2,100 → 10 with €0 remaining and 105%; 9.99% stays at the base, 125% complete | `progression.test.ts` "the €2,000 example" | PASS |
| JPY/EUR/KWD-style inputs, malformed values and overflow are deterministic | `money.test.ts` parse tables (en, de, fr, de-CH, en-IN separators; 0/2/3 decimals; alternate separators, extra decimals, malformed grouping, scientific notation, `Infinity`/`NaN`, ceiling ±1) | PASS |
| R = 100.00, D = 30 → weekly 23.34 / monthly 100.00; deadline today → R; none/expired/R = 0; leap day; inclusive D | `deadline-estimate.test.ts` | PASS |
| Every k/10 boundary, one minor unit below/above, tiny targets (1, 3, 7, 10), zero, amounts at the 10^12 bound | `progression.test.ts` | PASS |
| Inclusive day counts across month ends, leap years, DST (Belgrade 29 Mar / 25 Oct 2026, Los Angeles 8 Mar / 1 Nov 2026) and time-zone travel with a fake clock; no contribution calendar | `calendar.test.ts`, `deadline-estimate.test.ts`; day numbers also checked against a UTC-midnight oracle for every day 1999-12-01..2101-03-01 | PASS |
| 99.999% never shows complete | `progression.test.ts` "amounts at the storage bound" | PASS |
| Formatting never changes digits (JPY/EUR/KWD, ±, 412 values up to 10^15) and edit-field text round-trips | `money.test.ts` "formatting" | PASS |
| Capability contract, Free default | `access.test.ts` | PASS |
| No React/database/native imports in pure modules | ESLint rule + probe | PASS |

## Limitations and carried checks

- **Hermes Intl on iOS (carried to Phase 06).** Jest runs on Node's ICU. `formatMoney` (currency style with `numberingSystem` and fixed fraction digits), `separatorsForLocale` and `today()` (`Intl.DateTimeFormat#formatToParts` with `timeZone`) have not run on Hermes in the dev build. Exactness does not depend on the engine's own rounding beyond correct round-to-nearest, but the output shape (symbol placement, separators) and `formatToParts` support must be observed on a simulator in Phase 06, the first phase that shows amounts and reads today's date. The check is added to the Phase 06 prompt and roadmap entry. BigInt itself is a standard Hermes feature in RN 0.88.
- The parser is strict by design: with a de-DE device, "12.50" is rejected (grouping) rather than read as 12.50 or 1250; "12." and ".5" are rejected as malformed. Phase 06/07 forms must show a clear message per error code and keep the typed text.
- `formatMoney` refuses magnitudes above 10^15 minor units. Single amounts stop at 10^12; only all-goal statistics could approach it (Phase 18 decides how to present such a total).
- `progressPercent` with 2 decimals is exact up to 2^53 scaled units; only an absurd ratio (balance/target above ~9 × 10^11 %) could lose the last digit, far from the 100% decision, which uses `isFunded`.

## Result

**VERIFIED COMPLETE.** Every Phase 04 acceptance criterion has automated evidence, the Phase 03 dependency was re-verified, standard checks pass, no native change was made and no required check is NOT RUN. The Hermes Intl observation is a carried check for Phase 06 (first on-device use), not a Phase 04 criterion. Decisions D50–D51. Next prompt: [PHASE_05](../prompts/PHASE_05.md).
