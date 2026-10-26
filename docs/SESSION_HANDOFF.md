# Latest session handoff

Session date: 26 October 2026. Session kind: Phase 15 (verified StoreKit purchases and entitlement adapter). Result: **Phase 15 VERIFIED COMPLETE** (D115-D116). Code, Jest, Xcode StoreKit tests, simulator build and native SQLite checks, and the owner's iPhone runs (local StoreKit configuration and App Store sandbox; owner-reported). Next prompt: [PHASE_16](prompts/PHASE_16.md).

The previous handoff (Phase 14) is superseded; its record remains in [PHASE_14 evidence](evidence/PHASE_14.md) and DECISIONS D108-D113.

## Parallel workstream: Garden art (26 October 2026)

A separate session in the `claude/garden-theme-56e130` worktree ran Steps 1-2 of the owner's Garden brief ([GARDEN_ART](prompts/GARDEN_ART.md), D118). It changed no app code and nothing in Phase 15's area.

- Built: `assets/worlds/garden/` (README, `scripts/swg/` on the Island's shared rig, storybook pass and shaders, `source/garden.blend` with `SWG_00`-`SWG_10` and `SWG_Ambient`), the 100% review render and a reference comparison in `renders/review/`.
- Decided (D119, owner): the Garden milestone order is v1.2 except 80% greenhouse and vegetable beds; the 60% fountain brings all the water; the pergola is part of 90%. PRODUCT_REQUIREMENTS, ASSET_SPEC, SOURCE_RECONCILIATION, docs/README, CLAUDE.md and the Phase 17 prompt/roadmap follow it.
- Approved by the owner: the completed Garden's appearance (Step 2).
- Step 3 done: 0%, 50% and 100% rendered (`assets/worlds/garden/renders/milestones/`, sheet `garden_milestones.png`); `verify_stages.py` PASS (one rig/terrain fingerprint, add-only, nothing floating after four small fixes) and `milestone_report.py` PASS (identical underside 0% → 50%). Approved by the owner.
- Step 4 done (D120): all eleven states rendered; `render_ambient.py` and `export_layers.py` produced `assets/worlds/garden/export/` (79 PNGs per size, `garden_manifest.json` version 1). Rebuild mean ≤ 0.54/255 on every stage; the app's `manifestFromExport`/`validateManifest` accept it unchanged (throwaway Jest run); 16.1 MiB decoded at 1536 + 4.8 MiB for the `ambientExtensions` layers (water/ripples at 60%, koi, glows, butterflies, petals). At the owner's request the 10% seedlings and 20% flower bed were enlarged and everything re-rendered and re-exported; `milestone_report.py` PASS (0.65% and 0.68% change, threshold 0.4%). **Approved by the owner (Step 4): the Garden art workstream is complete and the export is ready for Phase 17.**
- Next for this workstream: nothing until brief Step 5, which is Phase 17 ([PHASE_17](prompts/PHASE_17.md), after Phases 15-16): copy the export to `assets/themes/garden/`, register Garden, and extend the manifest contract for the `ambientExtensions` layers.
- Not run: any app or device check of the Garden (Phase 17/21).

## Completed

- Read the v1.2 DOCX (sections 3, 4, 7, 10) and the required docs; verified Phase 14 and the D113 Apple setup. Baseline: clean `main` at dca3fa0; the owner committed 37366ad (Garden reference image) during the session.
- Package review and install: `expo-iap` 6.3.0, exact pin (OpenIAP Apple 4.0.5). Findings in [PHASE_15 evidence](evidence/PHASE_15.md) "Package selection and native API proof"; no custom StoreKit module needed.
- `src/features/billing/`: `domain/entitlement.ts` (product ID, `decideEntitlement`, `accessLevelFor`, outcomes), `application/entitlement-reconciler.ts` (process/finish order, launch sync, purchase, restore), `native/store-gateway.ts` (only expo-iap importer, lazy, validated).
- Schema 5 `src/data/db/migrations/0005-entitlements.ts` (checksum `84b68261720ce88d` pinned) and `src/data/repositories/entitlement-repository.ts`.
- `src/bootstrap/billing.ts` (serialized queue; launch, foreground, Transaction.updates, Buy, Restore), `app-data.ts` (stored status in the snapshot; `currentCapabilities()` Pro only for `verified`), `foreground.ts`, `src/app/_layout.tsx`.
- Development only: Store lab `src/dev/store-lab.tsx`, route `/dev-store`, Settings link.
- Config: `app.config.ts` plugins `expo-iap` and `./plugins/with-storekit-test-config` (attaches `storekit/SavingWorlds.storekit` to Xcode runs only); ESLint restricts expo-iap to the gateway; `.gitignore` for Xcode user data.
- Native tests: `native-tests/storekit/` (minimal host app + hosted XCTests, OpenIAP 4.0.5 via SwiftPM), `scripts/test-storekit.mjs`, `npm run test:storekit`.
- Tests: `tests/unit/entitlement.test.ts` (42), `tests/integration/billing-reconcile.test.ts` (22), `tests/support/expo-iap-fake.ts` (Jest mapping), schema-version assertions made version-agnostic in `tests/native/*` and the gate test.
- EAS development simulator build **7769c486-2e85-441b-8c2b-b5464fdf7eb6** (adds expo-iap), installed on the 17 Pro Max simulator.
- Docs: evidence `PHASE_15.md` (+ `phase-15/01`-`04`), DECISIONS D115, DATA_MODEL, ARCHITECTURE, TECH_STACK, PROJECT_STATUS, README, CLAUDE.md.

## Decisions

- D116 (owner): Pro Lifetime price US$7.99, final; set in App Store Connect (base USA, other storefronts equalized); sale copy still open (Q07).

- D115 (engineering; no product rule changed): expo-iap 6.3.0 exact; schema 5 with "last confirmed state" semantics; record + snapshot before finishing; `revoked` only on a verified revocation date, background "nothing found" keeps rights until an explicit Restore; capabilities from the stored snapshot; one billing queue; Store lab, local StoreKit configuration (price 7.99 USD per D116), Xcode StoreKit tests.
- Coordination: another session added D114 (Phase 19.5 app icon and launch screen, docs only) at the same time; its uncommitted doc edits were kept as they are.

## Checks

- `npm run lint` PASS; `npm run typecheck` PASS; `npm test -- --runInBand` PASS (43 suites, 1030 tests). Mutation check (offline treated as loss) fails 6 tests as expected.
- `npm run test:storekit` PASS 9/9 (Xcode 27.1, 17 Pro Max simulator iOS 26.0).
- `npm run test:db` PASS 51/51 + restart on build 7769c486; the real app database upgraded 4 → 5 with its goal and entries.
- Store lab on the simulator's real StoreKit: product not offered (no price), Buy → `unavailable`, Restore → Apple Account sign-in, Cancel → `cancelled`; nothing stored or granted.
- `npx expo export --platform ios`: PASS, no Store lab content.
- `npm run deps:check`: the same six SDK 58 patch notices as since Phase 09; expo-iap not flagged.
- Owner-reported on the iPhone 14 Pro (Xcode run, local StoreKit configuration): Buy, Restore, repeat Buy, restart, offline launch, refund PASS.
- Owner-reported on the iPhone 14 Pro against the App Store sandbox (scheme StoreKit configuration None, owner's sandbox account): product $7.99, Buy, restart, delete + reinstall + Restore → Pro, no savings data restored. PASS.

## Incomplete work and blockers

1. No Phase 15 blocker. Owner actions done: price US$7.99 (D116), Paid Applications agreement, device credentials in EAS (distribution certificate 6G6ATU6VUC, ad hoc profile ZV8FXLV6GD with the iPhone 14 Pro; no push key, local notifications only).
2. EAS iPhone development build **456c2b30-36e8-411b-a239-8a347e3734d0** was still building at the close; install it with Expo Orbit when it finishes. The device tests used the Xcode build of the same source.
3. Not run, by design: TestFlight (Phases 21/22), a sandbox refund on the device (Xcode StoreKit K04 and the owner's local-configuration refund cover it).
4. Phase 16 consumes this: paywall, Settings Restore entry, sale copy (Q07, owner approval), the read-only rule after a confirmed loss with several goals (D74), person-facing outcome text and the App Store review screenshot of the paywall (the product stays Missing Metadata until then).
5. Jest at session close: 1030/1030 PASS. Four `reminder-ui`/`ledger-ui` timeouts seen at 15:10 (also on the last commit) came from host overload during the Xcode device build and EAS upload (15-minute load average about 134); they pass with normal load. If they recur, check `uptime` before changing tests.
6. Git: Phase 15 and the Phase 19.5 planning docs are committed on `main` ("Phase 15: verified StoreKit entitlement adapter (D115), Pro price US$7.99 (D116); Phase 19.5 planning (D114)"); not pushed. Local state: generated `ios/` (ignored) with the owner's scheme edits; 17 Pro Max simulator has build 7769c486 at schema 5 (`not_owned`).

## Exact next session

In ~/Desktop/SavingWorld, start Claude Code with the full `docs/prompts/PHASE_16.md` (Pro paywall and capability enforcement). Verify Phase 15 from [PHASE_15 evidence](evidence/PHASE_15.md) first; do not rebuild the entitlement engine. The App Store Connect API key stays in ~/.appstoreconnect/private_keys/; never enter Apple Account passwords or codes on the owner's behalf.
