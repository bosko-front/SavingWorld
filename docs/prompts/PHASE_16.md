# Implement Phase 16 Pro paywall and capability enforcement

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, the phase-specific documents below and its canonical roadmap entry. For any UI work, also read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; reuse their tokens/primitives and layout policy. For native, dependency, persistence or delivery changes, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies, entry audit history or goal deletion. Read the compatible setup/layout and EAS/OTA source records for engineering only. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/TECH_STACK.md`, `docs/TEST_PLAN.md` and the Phase 16 entry in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Connect verified purchases to the complete Free/Pro access rules and a truthful paywall.

## Dependencies and decision gates

Phase 15

Q05 is resolved by v1.2; use its confirmed-loss policy without reapproval. Test paywall pricing may use configured sandbox data; public-release sale copy waits for final Q07 price.

## Exact scope

- Implement lifetime paywall with exact included features, localized product price and buy/restore controls; handle loading/offline/pending/cancelled/owned/error states.
- Replace all temporary test capability wiring with the verified production provider; inspect every command entry point for duplicate/free-limit bypasses.
- Enable unlimited open Pro goals and statistics navigation; fixed challenges remain identical in both tiers; Garden becomes selectable only when Phase 17 is complete.
- Implement v1.2 verified-loss behavior: retain all goals/history/souvenirs, require the user to choose at most one open Free goal and archive the others before further entries, and use Island on the open Free goal while Garden souvenirs persist. Temporary offline failure retains previously verified rights; never alter amounts or delete data.
- Provide restore from both paywall and Settings, distinguish purchase rights from data recovery, and return users to the action that opened the paywall.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `src/features/billing/presentation/ paywall and restore states`
- `src/features/goals/ multi-goal selection and command gates`
- `src/core/access/ open-goal limit and read-only paid-statistics gates`
- `src/features/settings/ Restore Purchases entry`
- `capability and purchase user-journey tests`

## Technical requirements

- Do not gate Free deadline estimates, history, goal editing, basic challenges or accessibility.
- Check capabilities in application commands as well as UI; preserve rights during unknown network state.
- Do not promise all future themes, subscriptions, advanced analytics, rewards or unimplemented functionality.

## Acceptance criteria

- Free and Pro feature matrix matches R05/R14/R15/R18/R19/R20 across cold restart and deep-link entry.
- Restore/error/cancellation states are understandable and do not trap the user.
- Verified revocation preserves records and Garden souvenirs, blocks further entries until the user leaves at most one open goal, and shows Island for that Free goal. Unknown offline state does not revoke.

## Tests and verification

- Unit/integration access matrix, deep-link and repeated goal-create tests.
- Device purchase/restore/cancel/offline/pending walkthrough; all three fixed challenges stay Free before/after Pro.
- Resolved v1.2 revocation/over-limit and archived-before-further-entry behavior, accessibility checks and standard checks.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Garden artwork, final commercial price selection, future-theme entitlement promises and external payment systems.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. Phase 01 establishes those scripts; later phases inspect and use the real scripts rather than replacing them with no-ops. If a command or tool cannot run, record NOT RUN with the exact reason and next action. A mocked native API does not prove SQLite, StoreKit, notification delivery or device performance.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, build/device/OS, files changed, dependency verification, manual checks and unresolved limitations. Update `docs/DECISIONS.md` for significant choices (or explicitly state none changed), and update any affected requirements, architecture, schema, roadmap or prompts in the same change. Preserve old evidence rather than rewriting a failed test as passed.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and dependency is verified. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation. Code complete with a pending required device check is not verified complete.

Finish by reporting: concrete behavior implemented, changed modules, checks and results, remaining work/blockers, documentation updated and the exact next prompt file. Do not claim the app is built, submitted or live unless the corresponding operation actually occurred.

Evidence path: `docs/evidence/PHASE_16.md` (create it during implementation; the planning baseline intentionally has no test evidence for this phase).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_16.md`. If verified complete, the next prompt is `docs/prompts/PHASE_17.md`.
