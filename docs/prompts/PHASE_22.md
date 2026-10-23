# Implement Phase 22 App Store release preparation and final handoff

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, the phase-specific documents below and its canonical roadmap entry. For any UI work, also read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; reuse their tokens/primitives and layout policy. For native, dependency, persistence or delivery changes, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies or entry audit history. Owner decision D74 (DECISIONS) overrides v1.2 on goals: Archive and Close goal are removed (statuses active, paused, completed), any goal can be deleted after a native confirmation (goal, entries and souvenir; no undo), Free may have one goal in total in any status, and loss of Pro keeps one chosen goal usable and the others read-only. Do not restore Archive or the old no-deletion rule. Read the compatible setup/layout and EAS/OTA source records for engineering only. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/TECH_STACK.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/UI_UX_GUIDELINES.md`, `docs/TEST_PLAN.md`, `docs/RELEASE_CHECKLIST.md`, `docs/TEST_PLAN.md` and the Phase 22 entry in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Prepare a reviewable first-release package and operator instructions without claiming an unperformed launch.

## Dependencies and decision gates

Phase 21

Final Pro price and sale details (Q07), identity/legal/URLs/toolchain (Q09), artwork approval and all native verification evidence must be resolved for release readiness.

## Exact scope

- Recheck current official Apple submission, IAP, privacy-manifest, privacy-label, age-rating and toolchain requirements against the actual release candidate.
- Finalize owner-approved name/publisher/bundle/support/privacy information and prepare truthful description, screenshots, age rating, review notes and privacy answers.
- Prepare the one-time Pro product description and localized price displays using the owner-finalized commercial decision. Leave future premium-theme rights/prices unresolved and avoid broad inclusion promises.
- Verify the Phase 20/21 EAS delivery evidence and prepare the exact production update promotion/rollout/recovery record with runtime/channel/environment and schema constraints. Do not publish it.
- Generate/verify the signed EAS distribution candidate and prepare TestFlight/review instructions, build/version mapping and installed-build smoke evidence as credentials permit.
- Produce a release handoff listing every artifact, verification result, known acceptable limitation, outstanding operational step and the exact manual submission procedure. Distinguish release-ready, submitted and live states.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `app.config.ts and EAS distribution/build profile configuration`
- `store/ metadata drafts, screenshots and review notes when created in this phase`
- `docs/evidence/PHASE_22.md signed build and store-readiness record`
- `docs/RELEASE_CHECKLIST.md and PROJECT_STATUS.md`
- `final SESSION_HANDOFF.md with operator steps`

## Technical requirements

- No production OTA publication/routing/rollout change, public submission, pricing change or external message without explicit owner authorization in that implementation session.
- Store/privacy claims describe observed shipped behavior, not a template. No financial advice claims, account registration or subscriptions.
- Unconfigured production IAP, missing policy URL, unapproved art or failed device tests block readiness; do not label them done.

## Acceptance criteria

- All release checklist items have verified evidence or a named blocking dependency; readiness is claimed only when required items are complete.
- Distribution build and store materials accurately show both themes and the exact Free/Pro feature matrix.
- Final handoff clearly says whether app is ready, uploaded/submitted or live; no automatic claim of App Store approval.

## Tests and verification

- Validate signed build installation and core airplane-mode journey plus real sandbox/TestFlight purchase/restore.
- Inspect archive manifests/permissions/dependency privacy behavior and run current official store requirement checklist.
- Review screenshots, metadata, product copy, URLs and final documentation links; standard checks after any app changes.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Automatic publication/submission, future theme product sales, unresolved future-theme entitlements, Android launch and post-launch features.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. Phase 01 establishes those scripts; later phases inspect and use the real scripts rather than replacing them with no-ops. If a command or tool cannot run, record NOT RUN with the exact reason and next action. A mocked native API does not prove SQLite, StoreKit, notification delivery or device performance.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, build/device/OS, files changed, dependency verification, manual checks and unresolved limitations. Update `docs/DECISIONS.md` for significant choices (or explicitly state none changed), and update any affected requirements, architecture, schema, roadmap or prompts in the same change. Preserve old evidence rather than rewriting a failed test as passed.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and dependency is verified. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation. Code complete with a pending required device check is not verified complete.

Finish by reporting: concrete behavior implemented, changed modules, checks and results, remaining work/blockers, documentation updated and the exact next prompt file. Do not claim the app is built, submitted or live unless the corresponding operation actually occurred.

Evidence path: `docs/evidence/PHASE_22.md` (create it during implementation; the planning baseline intentionally has no test evidence for this phase).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_22.md`. If verified complete: No later implementation phase. Use docs/RELEASE_CHECKLIST.md and the final operator handoff; publication still requires explicit authorization.
