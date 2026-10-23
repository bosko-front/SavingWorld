# Implement Phase 21 Resilience performance and release candidate

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, the phase-specific documents below and its canonical roadmap entry. For any UI work, also read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; reuse their tokens/primitives and layout policy. For native, dependency, persistence or delivery changes, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies, entry audit history or goal deletion. Read the compatible setup/layout and EAS/OTA source records for engineering only. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/TEST_PLAN.md`, `docs/RELEASE_CHECKLIST.md`, `docs/TEST_PLAN.md` and the Phase 21 entry in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Verify the integrated MVP under realistic data, interruption and device performance conditions.

## Dependencies and decision gates

Phase 20

All prior native/device/art checks must be truly complete. Required devices, signing and sandbox accounts may be external blockers.

## Exact scope

- Automate core journeys: Free create/deposit/withdraw/correct/restart, deadline, challenge recording, first-souvenir/Finish/Reopen/Archive/Collection, fixed challenge attempts, global currency lock, global reminder, verified Pro/confirmed-loss handling, open-goal theme change and four exact statistics.
- Exercise actual SQLite migrations and financial commands under interruption, repeated taps, stale edits, low-storage/write failures and foreground date changes.
- Profile local launch, goal/history queries and both worlds on the oldest supported iPhone using realistic multi-goal data, including a 10,000-entry fixture in the one global currency. Test alternate currency exponents in separate whole-app fixtures only.
- Fix measured bottlenecks with indexes, bounded query results, memoized layers and stopped offscreen effects; record before/after evidence without redesigning the app.
- Repeat the proven OTA/offline/runtime and known-good fallback checks against the actual release-candidate EAS binary, including the relevant persisted financial fixture.
- Create an installable release candidate with no debug routes, entitlement overrides, placeholder art or leaked logs. Audit every R01-R26 acceptance scenario and unresolved blocker.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `tests/native/ financial and native failure scenarios`
- `maestro/ critical iOS user journeys`
- `performance fixes in measured query/scene modules only`
- `build/test scripts and release configuration validation`
- `docs/evidence/PHASE_21.md release-candidate test matrix`

## Technical requirements

- Native tests and release build results are distinct from mocked tests and development performance.
- Preserve migrations and user data during fixes; do not reset fixtures to hide a failure.
- Initial budgets: aim for cold local readiness within about 3 seconds and 60 fps short scene transitions on the selected baseline; record measured outcomes and any agreed revised budget.

## Acceptance criteria

- No known critical financial/data-loss/startup defects; all blocking acceptance checks have actual evidence.
- Release candidate passes the documented offline and native test matrix, including real purchase/restore and notifications.
- Performance is measured on the supported baseline and unresolved failures have owner/impact/next action recorded; failed mandatory checks keep phase incomplete.

## Tests and verification

- Run ordinary-iPhone and Duo resize/fold/split-view scenarios from ADAPTIVE_LAYOUT against the release candidate, including physical-only gaps carried from Phase 03: inner split view with the app on both sides on a physical iPhone Duo (DECISIONS D48), plus the closed-display collapse fallback and focus behavior (D47). Repeat the Phase 06 VoiceOver walkthrough on a physical iPhone if Phase 19 did not already record it (D60). Rotate an ordinary iPhone and fold/unfold/rotate a Duo with a typed draft in `/entry-form` (draft, kind, date and operation ID kept, no extra ledger write), and repeat the Phase 07 ledger VoiceOver walkthrough if Phase 19 did not record it (D63).

- Run standard checks, actual test:db suite and established test:e2e critical flows on iOS.
- Run interruption/rollback/migration scenarios and device memory/launch/frame profiling; record build identifier and fixture size.
- Run full regression only now after integration, not repeatedly after every unchanged earlier phase; update requirements traceability.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Public App Store submission, unrelated refactors, new features, remote crash/analytics services and unsupported device claims.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. Phase 01 establishes those scripts; later phases inspect and use the real scripts rather than replacing them with no-ops. If a command or tool cannot run, record NOT RUN with the exact reason and next action. A mocked native API does not prove SQLite, StoreKit, notification delivery or device performance.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, build/device/OS, files changed, dependency verification, manual checks and unresolved limitations. Update `docs/DECISIONS.md` for significant choices (or explicitly state none changed), and update any affected requirements, architecture, schema, roadmap or prompts in the same change. Preserve old evidence rather than rewriting a failed test as passed.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and dependency is verified. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation. Code complete with a pending required device check is not verified complete.

Finish by reporting: concrete behavior implemented, changed modules, checks and results, remaining work/blockers, documentation updated and the exact next prompt file. Do not claim the app is built, submitted or live unless the corresponding operation actually occurred.

Evidence path: `docs/evidence/PHASE_21.md` (create it during implementation; the planning baseline intentionally has no test evidence for this phase).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_21.md`. If verified complete, the next prompt is `docs/prompts/PHASE_22.md`.
