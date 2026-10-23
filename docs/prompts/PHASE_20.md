# Implement Phase 20 EAS preview delivery and OTA recovery verification

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, the phase-specific documents below and its canonical roadmap entry. For any UI work, also read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; reuse their tokens/primitives and layout policy. For native, dependency, persistence or delivery changes, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies or entry audit history. Owner decision D74 (DECISIONS) overrides v1.2 on goals: Archive and Close goal are removed (statuses active, paused, completed), any goal can be deleted after a native confirmation (goal, entries and souvenir; no undo), Free may have one goal in total in any status, and loss of Pro keeps one chosen goal usable and the others read-only. Do not restore Archive or the old no-deletion rule. Read the compatible setup/layout and EAS/OTA source records for engineering only. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/EAS_AND_OTA.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/TECH_STACK.md`, `docs/TEST_PLAN.md`, `docs/RELEASE_CHECKLIST.md` and the Phase 20 entry in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Prove the actual EAS release-mode preview/update/recovery path against the completed MVP and its local financial data before the final release-candidate regression.

## Dependencies and decision gates

Phase 19. Verify the actual Phase 01 EAS project/profiles/runtime configuration and all intervening native/persistence changes as well as the completed feature/accessibility state.

The selected Expo account/project, required signing/test-device access and permitted EAS build/update operations must be available. Executing this phase authorizes only the named development/preview builds and preview-channel OTA drill, using synthetic fixtures. No production publication, production routing change or App Store upload is part of it.

## Exact scope

- Audit the actual EAS project, eas.json/app config, explicit development/preview/production channels/environments and appVersion runtime policy. Verify native package/config and persistence changes have not reused an incompatible shared runtime; document profile/native parity and current channel-to-branch mappings.
- Produce/install a release-mode EAS preview build with a known embedded baseline and the complete current native/SQLite feature set. Use the production export environment on the isolated preview channel as specified in EAS_AND_OTA; use dedicated test installations, not real savings data.
- Implement a small repeatable compatibility/release-record check and redacted version/update diagnostics using existing modules. Review app version/runtime, native contract, schema/data semantics, environment and artifact IDs before an update may be considered publishable.
- Export and publish a harmless clearly identifiable JS-only update to preview with the explicit iOS platform, preview channel and production environment. Verify download, next-normal-start activation, cached/embedded offline launches and complete asset availability; do not force reload an active form, write or purchase.
- Test incompatible runtime rejection and interrupted/failed update behavior. Exercise prior-known-good and embedded rollback on disposable fixtures where supported, proving ledger/receipts/collectibles/challenge-attempt data and actual verified StoreKit sandbox rights remain correct; financial data may use synthetic fixtures, ownership may not be fabricated. Schema/persistence changes are native-release work, never an OTA-only migration.
- Prepare a concrete production promotion/rollout/recovery runbook identifying the exact tested artifact, runtime/platform/environment, baseline, responsible operator and stop/continue evidence. Leave actual production promotion, rollout and store submission to an explicit later operator instruction.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `eas.json and app.config.ts verified build/update/runtime configuration`
- `scripts/ small compatibility/release-record check, only as needed for repeatability`
- `src/bootstrap/ and src/features/settings/ redacted native/update version diagnostics`
- `tests/native/ release-mode update, offline and persisted-state scenarios`
- `docs/EAS_AND_OTA.md validated runbook and release metadata contract`
- `docs/evidence/PHASE_20.md EAS build/update IDs and actual QA results`

## Technical requirements

- Use release-mode preview artifact evidence, not Expo Go, Metro hot reload or a normal dev client as OTA proof. Do not infer production runtime parity from a matching version string alone.
- Same-runtime OTA may change compatible JS/assets only; a shared native or persisted-schema/meaning incompatibility requires a new app version/runtime/native build. Native buildNumber-only increments are not runtime changes.
- Preview and production routing remain isolated. Match build/update export environments; no --auto branch inference, client channel switching, forced runtime override or production publish during tests.
- Update checks do not block the local database. No application-triggered reload during editing, database work or IAP. Code rollback does not revert database writes and must be checked against current persisted state.
- No new backend, analytics SDK, EAS Workflows pipeline, credential export or real financial-data upload. Audit the actual update-service metadata before privacy declarations.

## Acceptance criteria

- A real EAS release-mode preview build and compatible preview OTA update have recorded project/build/update IDs, runtime/channel/environment/platform, source revision and schema contract.
- Installed preview app downloads and activates the expected compatible update at normal restart and remains usable offline with both themes and the same accurate ledger/rights state.
- Incompatible/interrupted/failed update and rollback scenarios have actual recorded results without data reset, duplicate financial effects or unverified ownership changes.
- A reproducible compatibility check and concrete production promotion/recovery record are reviewable; no production channel, rollout or store state was changed by the drill.

## Tests and verification

- Run standard lint/typecheck/tests and the actual native SQLite/financial regression relevant to the baseline and candidate. Any changes to shared financial behavior require independent fixtures, not just a visual marker test.
- On a release-mode preview installation, test first offline embedded launch, online download, normal-start activation, subsequent offline launch and all required static assets. Record native/update identifiers before and after.
- Exercise incompatible runtime and failed/interrupted download. Run a controlled known-good/embedded rollback with synthetic ledger, receipts, collectible/fixed-attempt fixtures and actual verified StoreKit sandbox purchase state; verify persisted-state compatibility. Do not substitute a seeded isPro/cache value for native ownership proof.
- Inspect EAS project/profile/channel/branch/environment evidence, public configuration/secrets exposure and absence of accidental production publication. Record unavailable native/EAS/device checks as NOT RUN; required gaps keep the phase incomplete.

## Definition of Done

Every acceptance criterion above has actual evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Production OTA publishing/rollout/channel remapping, App Store/TestFlight upload, automatic CI deployments, new features/products, destructive OTA migrations, a hosted savings backend and adding a remote analytics service.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. Phase 01 establishes those scripts; later phases inspect and use the real scripts rather than replacing them with no-ops. If a command or tool cannot run, record NOT RUN with the exact reason and next action. A mocked native API does not prove SQLite, StoreKit, notification delivery or device performance.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, build/device/OS, files changed, dependency verification, manual checks and unresolved limitations. Update `docs/DECISIONS.md` for significant choices (or explicitly state none changed), and update any affected requirements, architecture, schema, roadmap or prompts in the same change. Preserve old evidence rather than rewriting a failed test as passed.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and dependency is verified. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation. Code complete with a pending required device check is not verified complete.

Finish by reporting: concrete behavior implemented, changed modules, checks and results, remaining work/blockers, documentation updated and the exact next prompt file. Do not claim the app is built, submitted or live unless the corresponding operation actually occurred.

Evidence path: `docs/evidence/PHASE_20.md` (create it during implementation; planning has no EAS runtime evidence).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_20.md`. If verified complete, the next prompt is `docs/prompts/PHASE_21.md`.
