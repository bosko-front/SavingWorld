# Implement Phase 01 Latest Expo EAS setup packages and native navigation

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, the phase-specific documents below and its canonical roadmap entry. For any UI work, also read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; reuse their tokens/primitives and layout policy. For native, dependency, persistence or delivery changes, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies, entry audit history or goal deletion. Read the compatible setup/layout and EAS/OTA source records for engineering only. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/EAS_AND_OTA.md`, `docs/TECH_STACK.md`, `docs/DESIGN_SYSTEM.md`, `docs/ADAPTIVE_LAYOUT.md`, `docs/ARCHITECTURE.md`, `docs/TEST_PLAN.md` and the Phase 01 entry in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Create a reproducible project on the latest stable Expo SDK, with EAS Build/Update configuration, required foundation packages and native navigation, while preserving the existing documentation.

## Dependencies and decision gates

V1.2-aligned documentation baseline only. No implementation phase is complete yet; this prompt authorizes setup only when the owner actually starts it.

The owner's Expo organization/project choice and valid account/signing access are needed to link EAS and produce the required EAS development build. Ask only for genuinely missing identity/access; continue local setup and record pending evidence if access is unavailable.

## Exact scope

- Inspect the docs-only project and preserve every source/document. If the scaffold tool cannot use a nonempty folder, create a temporary sibling and copy only conflict-checked application files; never replace SavingWorld.
- Check official stable Expo releases at execution time and use the latest stable SDK and compatible patch set. The planning research identifies SDK 58 on 22 October 2026; recheck rather than treating that number as permanent. Pin the SDK/React/RN/Router versions in one npm lockfile.
- Install or verify the required foundation set: Expo Router/dev client, safe-area-context, screens, Reanimated and its currently required worklets support, Zustand, expo-sqlite, expo-localization, expo-updates and @expo/ui for the planned adaptive container. Pin a reproducible EAS CLI version as development tooling. Use the Expo-compatible installation method for native packages; inspect template-provided packages first.
- Configure strict TypeScript, ESLint, meaningful noninteractive Jest/React Native Testing Library checks and the lint/typecheck/test scripts. Record Node/npm/Xcode/Device Hub requirements and supported older-iPhone/Duo simulator availability.
- Create thin Home, Challenges and Collection native tab routes with native Stack form/detail routing and a Settings entry. Keep a single navigation owner and simple temporary display content; the palette/components belong to Phase 02 and global adaptation to Phase 03.
- Verify/select the intended Expo account/organization and project, link only that project and configure eas.json plus the public EAS project ID/update URL. Define development/preview/production profiles with explicit channels/environments from EAS_AND_OTA. Configure appVersion runtime policy and nonblocking next-launch update activation; do not publish a production update.
- Produce and launch an EAS development build, recording its real build ID/profile/runtime and toolchain results. Local Xcode is supplementary for simulator/native diagnosis. Record the package/version/install matrix and native rebuild instructions. Add the root CLAUDE.md documentation entry point naming v1.2 as supreme product authority, Q01-Q06 as resolved, and the required status/handoff/current-prompt workflow; historical sources cannot override it. Feature-specific notifications, purchases, images and charts are installed in their owning phases rather than implementing those systems now.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `package.json, package-lock.json and SDK-compatible lint/test/TypeScript configuration`
- `app.config.ts, eas.json and native development-build/update configuration`
- `src/app/_layout.tsx and src/app/(tabs)/ native navigation layouts`
- `src/bootstrap/ and minimal src/shared/ shell files`
- `root CLAUDE.md and .gitignore`
- `docs/evidence/PHASE_01.md package/toolchain matrix and build evidence`

## Technical requirements

- Latest stable means no beta/canary and no silent downgrade to an older SDK. Resolve compatible package versions or document the exact blocker; do not hide peer conflicts with force flags.
- Use native Router Stack/NativeTabs supported by the locked SDK so the OS can adapt navigation chrome. No fixed custom bottom tab bar or native lifecycle opt-out.
- Package installation does not implement database tables, billing, reminders or financial calculations. Configure only required native plugins/permissions; no credentials or secrets in the repository.
- EAS Build/Update is required developer tooling, not a savings backend. Keep the ledger local, no in-app Expo login, no client secrets and no forced reload while editing/saving. A dev client is not release-mode OTA acceptance.
- No CSS framework, whole-screen scaling library, Skia, Lottie or expo-hinge dependency is needed for the planned foundation.

## Acceptance criteria

- All documentation/source copies survive scaffolding and no unrelated user file is overwritten. Root CLAUDE.md directs a fresh session to v1.2 and the current docs, never historical feature scope.
- The locked package set matches the latest official stable Expo SDK at setup time, with compatible native peers and a documented version/install matrix.
- An EAS iOS development build starts, native tabs/stack/back navigation work, and required packages link without native errors; its actual project/profile/build ID is recorded.
- EAS profiles/channels/environments, project/update config and appVersion runtime policy are present and validated; no live production update or routing change occurred.
- Lint, TypeScript, meaningful tests and Expo dependency validation pass; simulator/toolchain coverage and any later physical-device checks are recorded.

## Tests and verification

- Run npm run lint, npm run typecheck and npm test -- --runInBand after configuring real scripts.
- Run npx expo-doctor@latest and the selected SDK's package compatibility check; record exact results without forced peer overrides.
- Build/open an ordinary supported iPhone simulator; test cold launch, native tab/stack transitions and back. Confirm the selected toolchain can run the intended Duo simulator or record that missing environment as an early blocker.
- Inspect EAS build/app configuration for correct account/project, native ID, profile/channel/environment, compatible runtime and nonblocking offline startup; record cloud build results. Actual OTA publish/rollback verification belongs to Phase 20.
- Inspect the dependency/permission diff: only the foundation packages and required native configuration are present.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Final palette/global component styling (Phase 02), responsive/Duo layout implementation (Phase 03), goal/ledger/database features, world assets, challenge behavior, IAP, notification scheduling, full release-mode OTA/rollback drill (Phase 20), production publication and store submission.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. Phase 01 establishes those scripts; later phases inspect and use the real scripts rather than replacing them with no-ops. If a command or tool cannot run, record NOT RUN with the exact reason and next action. A mocked native API does not prove SQLite, StoreKit, notification delivery or device performance.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, build/device/OS, files changed, dependency verification, manual checks and unresolved limitations. Update `docs/DECISIONS.md` for significant choices (or explicitly state none changed), and update any affected requirements, architecture, schema, roadmap or prompts in the same change. Preserve old evidence rather than rewriting a failed test as passed.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and dependency is verified. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation. Code complete with a pending required device check is not verified complete.

Finish by reporting: concrete behavior implemented, changed modules, checks and results, remaining work/blockers, documentation updated and the exact next prompt file. Do not claim the app is built, submitted or live unless the corresponding operation actually occurred.

Evidence path: `docs/evidence/PHASE_01.md` (create it during implementation; the planning baseline intentionally has no test evidence for this phase).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_01.md`. If verified complete, the next prompt is `docs/prompts/PHASE_02.md`.
