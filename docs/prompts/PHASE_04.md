# Implement Phase 04 Exact money calendar and progression rules

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, the phase-specific documents below and its canonical roadmap entry. For any UI work, also read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; reuse their tokens/primitives and layout policy. For native, dependency, persistence or delivery changes, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies, entry audit history or goal deletion. Read the compatible setup/layout and EAS/OTA source records for engineering only. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/TECH_STACK.md`, `docs/TEST_PLAN.md` and the Phase 04 entry in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Build the deterministic domain calculations used by all financial and visual features.

## Dependencies and decision gates

Phase 03

None beyond verified dependencies.

## Exact scope

- Implement strict text-to-minor-unit parsing, formatting, checked sums and BigInt intermediates with the documented storage ceiling.
- Bundle a supported currency/exponent registry with source/version evidence. Include zero-, two- and three-decimal behavior and never assume every currency has cents.
- Implement validated civil-date helpers, injected clock boundaries and v1.2 weekly=min(R,ceil(R*7/D)) and monthly=min(R,ceil(R*30/D)) estimates with inclusive civil-day D from DATA_MODEL, with no automatic deposits.
- Implement one shared stage 0-10 function, exact thresholds, numeric overfunding and bounded fractional scene feedback. Do not introduce theme-specific math.
- Define the small capability input used by commands: open-goal count limit, Garden/open-goal theme switching and the four Pro statistics; challenges are the same in Free/Pro. Default production behavior is Free until native verification is integrated.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `src/core/money/`
- `src/core/calendar/`
- `src/core/progression/`
- `src/core/access/ capability contracts and Free baseline`
- `tests/unit/money, calendar and progression scenarios`

## Technical requirements

- No React, database or native imports in pure calculation modules.
- All financial math stays exact through parsing, sum and threshold checks. Float values may drive only visual interpolation.
- Numeric progress must not round 99.999% to a false completed state.

## Acceptance criteria

- The €2,000 threshold examples in requirements are correct, including a withdrawal and 105% overfunding.
- JPY/EUR/KWD-style inputs, malformed values and overflow produce deterministic results/errors.
- Deadline absent/today/expired, leap day and inclusive D match v1.2: remaining 100.00 and D=30 gives weekly 23.34/monthly 100.00; R=0 gives zero and no Overdue.

## Tests and verification

- Table tests for every k/10 boundary, one minor unit below/above, tiny targets, zero and amounts at the bound.
- Parsing tests include alternate locale separators, extra decimals, malformed grouping, scientific notation and non-finite strings.
- Calendar tests cover inclusive day counts across month ends, leap years and DST/time-zone changes with a fake clock, never a contribution-opportunity calendar. Run standard checks.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Screens, persisted records, live currency exchange, forecasts and theme art.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. Phase 01 establishes those scripts; later phases inspect and use the real scripts rather than replacing them with no-ops. If a command or tool cannot run, record NOT RUN with the exact reason and next action. A mocked native API does not prove SQLite, StoreKit, notification delivery or device performance.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, build/device/OS, files changed, dependency verification, manual checks and unresolved limitations. Update `docs/DECISIONS.md` for significant choices (or explicitly state none changed), and update any affected requirements, architecture, schema, roadmap or prompts in the same change. Preserve old evidence rather than rewriting a failed test as passed.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and dependency is verified. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation. Code complete with a pending required device check is not verified complete.

Finish by reporting: concrete behavior implemented, changed modules, checks and results, remaining work/blockers, documentation updated and the exact next prompt file. Do not claim the app is built, submitted or live unless the corresponding operation actually occurred.

Evidence path: `docs/evidence/PHASE_04.md` (create it during implementation; the planning baseline intentionally has no test evidence for this phase).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_04.md`. If verified complete, the next prompt is `docs/prompts/PHASE_05.md`.
