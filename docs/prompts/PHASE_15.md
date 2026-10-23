# Implement Phase 15 Verified StoreKit purchases and entitlement adapter

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, the phase-specific documents below and its canonical roadmap entry. For any UI work, also read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; reuse their tokens/primitives and layout policy. For native, dependency, persistence or delivery changes, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies or entry audit history. Owner decision D74 (DECISIONS) overrides v1.2 on goals: Archive and Close goal are removed (statuses active, paused, completed), any goal can be deleted after a native confirmation (goal, entries and souvenir; no undo), Free may have one goal in total in any status, and loss of Pro keeps one chosen goal usable and the others read-only. Do not restore Archive or the old no-deletion rule. Read the compatible setup/layout and EAS/OTA source records for engineering only. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/TECH_STACK.md`, `docs/TEST_PLAN.md` and the Phase 15 entry in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Prove a restorable lifetime purchase and native verified entitlement state without an application backend.

## Dependencies and decision gates

Phase 14

Q07 product ID/store setup and Q09 bundle identifier are required; a configured test price is not a decision on the final Pro price. Native sandbox credentials/device access are external dependencies.

## Exact scope

- Resolve native identifiers with the owner and configure one non-consumable Pro product. Review the pinned package source/API for native verification, current entitlements and revocation.
- Implement event-driven purchase states, verified/unverified/pending distinction and product metadata. Do not grant rights from callback success or JWS decoding alone.
- Persist idempotent transaction processing and entitlement snapshots before finishing/acknowledging store transactions; handle replay after interruption.
- Implement current-entitlement queries, transaction update listeners, explicit restore and foreground reconciliation. Treat network failure as unknown rather than revocation.
- Map Pro to unlimited goals, Garden/open-goal theme switching and the four precise statistics; fixed challenges are identical for Free/Pro, with theme rights addressable independently. Pro price remains storefront-sourced and commercially undecided.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `src/features/billing/ PurchaseGateway and expo-iap/native adapter`
- `src/features/billing/ entitlement repository and capability mapping`
- `src/data/db/ entitlement/purchase event migration`
- `src/bootstrap/ StoreKit launch/foreground/update reconciliation`
- `app.config.ts native configuration and StoreKit test setup`

## Technical requirements

- Use an iOS development build, not Expo Go, and no RevenueCat/IAPKit/backend by default.
- If expo-iap cannot supply verifiable native semantics, document and implement only a narrow StoreKit 2 adapter after reviewing that evidence.
- Do not commit credentials, server API signing keys, raw receipts in logs or release entitlement bypasses.

## Acceptance criteria

- A native verified non-consumable purchase persists rights across restart; unverified/pending/cancelled results never grant them.
- Restore from the same App Store account works after reinstall while correctly leaving savings-data restoration out of scope.
- Duplicate updates, interrupted finishing, offline startup and refund/revocation reconcile without deleting user data.

## Tests and verification

- Contract/state-machine tests for all native outcomes and capability mapping.
- Xcode StoreKit tests plus actual sandbox/TestFlight product load, purchase, restore and restart on iPhone.
- Record selected package/native API proof, transaction lifecycle evidence, standard checks and pending credential dependencies honestly.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Paywall polish, subscription products, consumables, external payment links and sale of future premium themes.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. Phase 01 establishes those scripts; later phases inspect and use the real scripts rather than replacing them with no-ops. If a command or tool cannot run, record NOT RUN with the exact reason and next action. A mocked native API does not prove SQLite, StoreKit, notification delivery or device performance.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, build/device/OS, files changed, dependency verification, manual checks and unresolved limitations. Update `docs/DECISIONS.md` for significant choices (or explicitly state none changed), and update any affected requirements, architecture, schema, roadmap or prompts in the same change. Preserve old evidence rather than rewriting a failed test as passed.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and dependency is verified. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation. Code complete with a pending required device check is not verified complete.

Finish by reporting: concrete behavior implemented, changed modules, checks and results, remaining work/blockers, documentation updated and the exact next prompt file. Do not claim the app is built, submitted or live unless the corresponding operation actually occurred.

Evidence path: `docs/evidence/PHASE_15.md` (create it during implementation; the planning baseline intentionally has no test evidence for this phase).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_15.md`. If verified complete, the next prompt is `docs/prompts/PHASE_16.md`.
