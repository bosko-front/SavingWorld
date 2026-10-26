# Phase 15 evidence: Verified StoreKit purchases and entitlement adapter

Session date: 26 October 2026. State: **VERIFIED COMPLETE**. The entitlement engine, schema 5, the expo-iap store adapter, launch/foreground/update/Buy/Restore reconciliation and the capability wiring are built, with Jest evidence (host SQLite, real adapter over an expo-iap fake), native Xcode StoreKit evidence (9 hosted tests through the exact native library the app links), simulator evidence on EAS build 7769c486 (native SQLite, real-StoreKit failure paths, sandbox product load at $7.99), and the owner's physical-iPhone runs: first with the local StoreKit configuration, then against the App Store sandbox (purchase, restart, restore after reinstall). The iPhone runs are owner-reported: Claude did not observe them and no screenshot was recorded.

## Context verified first

- Read the full v1.2 DOCX with `textutil` (sections 3 "Lokalni podaci", 4 "Monetizacija i precizan obim Pro paketa", 7 "Purchase entitlement: productId, verifiedStatus, lastVerifiedAt", 10 "Pro: kupovina, otkazivanje kupovine, Restore Purchases i privremeni offline rad imaju jasne rezultate"). Read README, PRODUCT_REQUIREMENTS (R18, R21), SOURCE_RECONCILIATION (Q05, Q07, Q09), DECISIONS (D10, D41, D51, D74, D75, D113), DEVELOPMENT_RULES, PROJECT_STATUS, SESSION_HANDOFF, ARCHITECTURE, DATA_MODEL, TECH_STACK, TEST_PLAN, EAS_AND_OTA, APPLE_SETUP and the Phase 15 roadmap entry.
- Baseline: clean `main` at dca3fa0 (Apple setup, D113). Phase 14 verified complete per its evidence. Another session worked in the same folder at the same time (owner-added Phase 19.5, D114, docs only); its uncommitted doc edits were kept, and this phase's decision is D115.
- Dependencies verified: `PRO_CAPABILITIES`/`FREE_CAPABILITIES`, `hasGoalSlot`, `withinGoalLimit`, `canUseTheme` in `src/core/access/capabilities.ts`; `currentCapabilities()` returned Free unconditionally (`src/bootstrap/app-data.ts`); goal commands take `capabilities` as a dependency; no billing code, no expo-iap, no entitlement table existed. Bundle ID and product ID per D113.

## Package selection and native API proof

`npx expo install expo-iap@6.3.0` (exact pin; not in Expo's bundled module list, so `expo install` takes the version given). Lockfile adds only `expo-iap` 6.3.0. Its podspec depends on `openiap` = `openiap-versions.json` `apple` 4.0.5, fetched from the Git tag 4.0.5; `ios/Podfile.lock` after a local prebuild: `ExpoIap (6.3.0)` → `openiap (= 4.0.5)`.

Reviewed source (npm tarball 6.3.0 and `hyodotdev/openiap` at tags `expo-iap-6.3.0` and `4.0.5`; the Apple sources differ only in a generated version constant):

| Question | Finding (file) |
| --- | --- |
| Is every returned/emitted transaction StoreKit-verified? | Yes. `checkVerified` returns the value only for `.verified`; `.unverified` throws `transaction-validation-failed`. Used in requestPurchase, Transaction.updates listener, getAvailablePurchases (currentEntitlements / all), unfinished, latest, currentEntitlementIOS (`OpenIapStoreKitModule.swift`). |
| Pending / cancelled? | `.pending` → `deferred-payment`; `.userCancelled` → `user-cancelled`; neither returns a transaction. |
| Automatic finishing? | Only with `andDangerouslyFinishTransactionAutomatically`; the app never sets it. finishTransaction finishes by ID from the pending map, `Transaction.unfinished` or `Transaction.latest`. |
| Revocation? | The `Transaction.updates` listener skips revoked transactions; `Transaction.currentEntitlements` excludes them; `Transaction.all` keeps them with `revocationDateIOS`. |
| Offline? | currentEntitlements/all read StoreKit's local signed cache; product loading and `AppStore.sync` need the network. `currentEntitlementIOS`/`latestTransactionIOS` first load the product (network), so the adapter uses `getAvailablePurchases` instead. |
| Duplicates? | Per-connection dedupe by transaction ID on the listener (default). The app is idempotent anyway (purchase_events primary key). |
| Logging/privacy? | Native logs only in DEBUG with token/JWS/receipt keys redacted (`ExpoIapLog.swift`); a debug-only "first purchase" console notice; no network calls except StoreKit's and the opt-in IAPKit/verification APIs, which the app never calls. |

Conclusion: expo-iap supplies verifiable native semantics; no custom StoreKit 2 module was written (D115 (1)).

## What was built

| Area | Module | Behavior |
| --- | --- | --- |
| Rules | `src/features/billing/domain/entitlement.ts` | `PRO_PRODUCT_ID`; `decideEntitlement` (entitled → verified; failed → keep confirmed state, record code; verified revocation → revoked; nothing found → keep verified with `entitlement_not_found` unless the check came from Restore → not_owned; never verified before → not_owned); `accessLevelFor` (Pro only for verified); purchase and restore outcomes; `newestTransaction`; `StoreProduct` (storefront metadata, no price constant). |
| Schema 5 | `src/data/db/migrations/0005-entitlements.ts` | `entitlement_cache` (status CHECK, revision trigger +1, verified needs ID and time) and `purchase_events` (one row per verified transaction ID, identity immutable). No reference to savings tables. Checksum `84b68261720ce88d` pinned. |
| Repository | `src/data/repositories/entitlement-repository.ts` | read/write snapshot with revision check; record event once; mark finished/revoked keeping first times; list events. |
| Store adapter | `src/features/billing/native/store-gateway.ts` (only expo-iap importer, ESLint) | Lazy `require('expo-iap')` (a build without the module still opens: `unavailable`); one connection; `loadProduct` (fetchProducts), `checkEntitlement` (currentEntitlements, then history for a revocation), `purchase`, `sync` (AppStore.sync), `unfinished`, `finish` (by the delivered native object), `subscribe` (Transaction.updates + errors). Validates every native value; maps native error codes to short codes; keeps no JWS/receipt. |
| Reconciler | `src/features/billing/application/entitlement-reconciler.ts` | `processTransaction`: entitlement query → record event + snapshot in one exclusive transaction → finish → mark finished; offline/inconclusive leaves it unfinished. `syncStoredEntitlement` (launch/foreground: unfinished first, then check), `purchasePro`, `restorePurchases`. Touches no goal, entry, souvenir or theme. |
| App driver | `src/bootstrap/billing.ts`, `foreground.ts`, `app-data.ts`, `src/app/_layout.tsx` | One serialized queue for launch, foreground, Transaction.updates, Buy, Restore; refreshes the app-data snapshot when the stored status changes. The stored status is part of the snapshot (`AppData.entitlement`), so rights are known offline before StoreKit answers; `currentCapabilities()` → `capabilitiesFor(accessLevelFor(status))`, last read kept through a failed read. |
| Development only | `src/dev/store-lab.tsx`, route `/dev-store`, Settings link | Product metadata as returned, stored snapshot, processed transactions, capability level; Buy Pro, Restore Purchases, Check now. No switch that grants Pro. Absent from release bundles. |
| Config | `app.config.ts`, `plugins/with-storekit-test-config.js`, `storekit/SavingWorlds.storekit` | `expo-iap` plugin (no entitlement or Info.plist key needed for IAP). The local StoreKit configuration (the one Non-Consumable, en_US name/description from App Store Connect, 7.99 USD, the D116 price) is attached to the generated scheme's Run action for Xcode runs only. |
| Native tests | `native-tests/storekit/` (`StoreKitHost.xcodeproj`, `HostApp/`, `Tests/ProStoreKitTests.swift`), `scripts/test-storekit.mjs`, `npm run test:storekit` | Hosted XCTests with SKTestSession on OpenIAP 4.0.5 via SwiftPM (exact version). A package-only test bundle could not purchase (`StoreKitError.unknown`, host `com.apple.dt.xctest.tool`), so a minimal host app (bundle `com.bosko123.savingworlds.storekithost`) hosts them. |

Mapping to the planned paths: `src/features/billing/ PurchaseGateway and expo-iap/native adapter` → `native/store-gateway.ts`; `entitlement repository and capability mapping` → `src/data/repositories/entitlement-repository.ts` (data layer, as for every other table) + `domain/entitlement.ts` + `currentCapabilities()`; `src/data/db/ entitlement/purchase event migration` → `0005-entitlements.ts`; `src/bootstrap/ StoreKit launch/foreground/update reconciliation` → `src/bootstrap/billing.ts`; `app.config.ts native configuration and StoreKit test setup` → plugin entries above.

Decision: D115 (engineering; no product rule changed).

## Acceptance criteria → evidence

| Criterion | Evidence | State |
| --- | --- | --- |
| A native verified non-consumable purchase persists rights across restart; unverified/pending/cancelled never grant them | Jest `billing-reconcile`: purchase → verified stored before finish (entitlement query ran before finish), restart of the database → Pro from SQLite before StoreKit answers; pending, cancelled, unverified, network purchase results → no row, no event, no finish; a delivered transaction with an unverified entitlement query → unknown, unfinished. Xcode StoreKit K02/K08 (verified purchase returned/delivered, unfinished until finished, current entitlement), K05 (Ask to Buy → deferred-payment, no entitlement until approved), K06 (unverified → query fails, no update), K09 (failed purchase → nothing). App on the simulator (build 7769c486): an unavailable purchase stores nothing. iPhone 14 Pro, owner-reported: local StoreKit run (Buy, repeat Buy, restart, offline) and App Store sandbox (Buy, restart). | PASS (device part owner-reported) |
| Restore from the same App Store account works after reinstall, leaving savings data out of scope | Jest: restore on an empty database restores `verified` and creates no goal/entry/souvenir; failed sync never confirms loss; cancelled sign-in changes nothing; account without the purchase → nothing to restore. iPhone 14 Pro, owner-reported: app deleted and reinstalled, Restore Purchases against the sandbox → Pro again, no goals restored. | PASS (device part owner-reported) |
| Duplicate updates, interrupted finishing, offline startup and refund/revocation reconcile without deleting user data | Jest: three deliveries → one event row; finish failure → rights stored, transaction unfinished, finished at the next launch; offline start keeps verified (`network`); refund → `revoked` with every goal/entry/souvenir/attempt/setting row byte-identical; "nothing found" keeps rights until Restore. Xcode StoreKit K03 (unfinished until finished), K04 (refund removes the entitlement, history keeps the revocation date), K07 (product load fails offline, entitlement still readable). Owner-reported on the iPhone: Airplane Mode launch keeps Pro; refund from Xcode's transaction manager → Free with savings untouched. | PASS (device part owner-reported) |

## Automated checks

| Check | Environment | Result |
| --- | --- | --- |
| `npm run lint` | macOS, Node 22 | PASS |
| `npm run typecheck` | tsc 6.0.3 | PASS |
| `npm test -- --runInBand` | Jest 30, host `node:sqlite` | PASS: 43 suites, 1030 tests (new: `tests/unit/entitlement.test.ts` 42, `tests/integration/billing-reconcile.test.ts` 22) |
| `npm test -- --runInBand` reruns at session close | same host | 15:10: 4 failures in `reminder-ui` and `ledger-ui` (Jest 5 s timeouts, one slow test pushing the next ones over), identical on the last commit 37366ad without Phase 15 changes (git worktree). Cause: host overload while the owner's Xcode device build/run and the EAS upload ran (load averages 44-56 at 15:11, 15-minute average about 134-139 at 15:44). 15:44 with load back to about 5: each suite alone, both together and the full suite PASS 1030/1030 (43 suites). No code or test change; the failures were environmental. |
| Mutation check | `decideEntitlement` changed to treat a failed check as `not_owned` | 6 tests fail as expected; reverted |
| `npm run test:storekit` | Xcode 27.1, iPhone 17 Pro Max simulator iOS 26.0, SKTestSession, OpenIAP 4.0.5 | PASS 9/9 (K01-K09, below) |

Xcode StoreKit tests (`native-tests/storekit/Tests/ProStoreKitTests.swift`):

| ID | Scenario | Result |
| --- | --- | --- |
| K01 | Product loads with storefront name, description, non-empty display price, type non-consumable | PASS |
| K02 | `buyProduct` → one verified update, `purchaseState` purchased, unfinished until `finishTransaction`, current entitlement before and after finishing | PASS |
| K03 | An unfinished transaction stays in `Transaction.unfinished` across reads until finished | PASS |
| K04 | Refund → not a current entitlement; history keeps it with `revocationDateIOS` | PASS |
| K05 | Ask to Buy via `requestPurchase` → `deferred-payment`, no entitlement, no verified transaction; approval → verified update → entitled | PASS |
| K06 | Simulated invalid signature → the entitlement query throws `transaction-validation-failed`; no update delivered | PASS |
| K07 | Offline product load fails; the entitlement still reads from the local cache | PASS |
| K08 | `requestPurchase` in an app with a window scene → verified purchase returned, unfinished until finished | PASS |
| K09 | Simulated network failure on purchase → error, no entitlement, no transaction | PASS |

First runs, kept for the record: as a SwiftPM test bundle only K01 passed (no app bundle, `StoreKitError.unknown` on every purchase); hosted, K05 failed because `SKTestSession.buyProduct` ignores Ask to Buy (rewritten through `requestPurchase`), K06 failed when the signature error was set after the purchase (set before it now), and ending/restarting the OpenIAP connection inside the test crashed XCTest's async runner (`swift_task_localValuePopImpl`, SIGSEGV in XCTestCore), so K03 no longer reconnects.

## Native app run

| Check | Environment | Result |
| --- | --- | --- |
| EAS development simulator build | `npm run eas -- build --profile development-simulator --platform ios --non-interactive --no-wait`; build **7769c486-2e85-441b-8c2b-b5464fdf7eb6**, channel development, runtime 1.0.0, fingerprint 01ebc4ce…, working tree on 37366ad (the owner's Garden reference commit) | PASS: finished 12:45; the bundle contains `openiap-versions.json` (apple 4.0.5) and OpenIAP/ExpoIap symbols in `SavingWorlds.debug.dylib` |
| Local prebuild + Debug build | `npx expo prebuild --platform ios` (pod install rerun with `LANG=en_US.UTF-8` after a CocoaPods locale error), `xcodebuild build` for the 17 Pro Max simulator | PASS: `ExpoIap (6.3.0)` → `openiap (= 4.0.5)`; scheme carries `StoreKitConfigurationFileReference ../storekit/SavingWorlds.storekit` from the plugin |
| `npm run test:db` | Build 7769c486 on iPhone 17 Pro Max iOS 26.0, Metro 8081 (already running, not started by this session) | PASS 51/51 + restart 1/1; the scenario databases are created at schema 5 |
| Real app database upgrade 4 → 5 | Same simulator, read-only `sqlite3` on the app container | PASS: migrations 1-4 at 07:39Z, `5 entitlements` at 10:58Z; the existing goal and its 7 entries kept |
| Launch/foreground reconciliation against the simulator's real StoreKit (no StoreKit configuration, no sandbox account) | Build 7769c486 | PASS: `entitlement_cache` row `not_owned`, no error, revision 4 → 5; capabilities Free; no crash with the native module present |
| Store lab: product, Buy, Restore | Build 7769c486, screenshots `phase-15/01`-`04` | PASS for the reachable paths: product "Not offered by this storefront" (no price in App Store Connect), Buy Pro → `unavailable`, nothing stored; Restore → iOS "Sign in to Apple Account" (AppStore.sync), Cancel → `cancelled`, status unchanged. No credentials entered. |
| Release export | `npx expo export --platform ios` | PASS: no Store lab content in the bytecode ("Check StoreKit now" 0); only the guarded route title remains, as for the Reminder lab |
| Sandbox product load after the owner activated the Paid Applications agreement and the price was set (D116) | Build 7769c486 on the 17 Pro Max simulator, App Store sandbox, relaunch → Store lab, screenshot `phase-15/05` | PASS: "Saving Worlds Pro · $7.99 · Unlimited goals, Garden and Pro statistics" straight from the storefront; launch checks still `not_owned` without error (revision 9) |
| App purchase/restore/restart/offline/refund under the local StoreKit configuration (Xcode Run) | **Physical iPhone 14 Pro**, run by the owner from Xcode on the generated `ios/` workspace (whose scheme uses `storekit/SavingWorlds.storekit`, so StoreKit's Xcode test environment, not the sandbox). Owner-reported; not observed by Claude and no screenshot recorded | PASS (owner-reported): Store lab Buy Pro → Pro; Restore Purchases works; Buy Pro again on the owned purchase → no new charge, the check runs again (last check and revision move), still Pro; Reload product reloads metadata only; app fully closed and reopened → still Pro; Airplane Mode launch → still Pro; refund from Xcode's transaction manager + Check StoreKit now → Free, savings data untouched. |
| App Store sandbox on the iPhone (the Phase 15 sandbox check) | **Physical iPhone 14 Pro**, run by the owner from Xcode with the scheme's StoreKit configuration set to None (App Store sandbox), signed in with the owner's sandbox Apple Account (entered by the owner) | PASS (owner-reported, "sve radi sve ok"): Store lab product at $7.99 from the sandbox storefront; Buy Pro → Pro; app fully closed and reopened → still Pro; app deleted, reinstalled from Xcode, Restore Purchases → Pro again with no savings data restored. |

## Not run

- TestFlight: not required by the phase once the sandbox check passed; Phase 21/22 repeat purchases on a signed distribution build (RELEASE_CHECKLIST).
- Refund and Ask to Buy against the App Store sandbox on the device: covered by the Xcode StoreKit tests (K04, K05) and the owner's local-configuration refund on the iPhone; a sandbox refund needs Apple's sandbox tooling and was not run.
- EAS development build for the iPhone **456c2b30-36e8-411b-a239-8a347e3734d0** (ad hoc profile ZV8FXLV6GD) was still building at the close; the device tests used the Xcode build of the same source.
- VoiceOver: no person-facing purchase UI exists yet (Phase 16).

## Files changed

New: `src/features/billing/domain/entitlement.ts`, `src/features/billing/application/entitlement-reconciler.ts`, `src/features/billing/native/store-gateway.ts`, `src/bootstrap/billing.ts`, `src/data/db/migrations/0005-entitlements.ts`, `src/data/repositories/entitlement-repository.ts`, `src/dev/store-lab.tsx`, `src/app/(tabs)/(home)/dev-store.tsx`, `plugins/with-storekit-test-config.js`, `storekit/SavingWorlds.storekit`, `native-tests/storekit/**`, `scripts/test-storekit.mjs`, `tests/support/expo-iap-fake.ts`, `tests/unit/entitlement.test.ts`, `tests/integration/billing-reconcile.test.ts`, this file.
Changed: `package.json`/`package-lock.json` (expo-iap 6.3.0, `test:storekit`, Jest mapping), `app.config.ts`, `eslint.config.js`, `.gitignore`, `src/bootstrap/app-data.ts`, `src/bootstrap/foreground.ts`, `src/app/_layout.tsx`, `src/app/(tabs)/(home)/_layout.tsx`, `src/dev/settings-development.tsx`, `src/data/db/migrations/index.ts`, schema-version assertions in `tests/native/*-scenarios.ts`, `tests/integration/database-gate.test.tsx`, `tests/unit/ledger-history.test.ts`, `tests/support/app-fixture.ts`; docs (DECISIONS D115, DATA_MODEL, ARCHITECTURE, TECH_STACK, PROJECT_STATUS, SESSION_HANDOFF, README, CLAUDE.md).
