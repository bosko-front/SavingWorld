# Phase 20 evidence: EAS preview delivery and OTA recovery verification

Session date: 27 October 2026. State: **VERIFIED COMPLETE** by owner decision D143 (simulator release-mode drill recorded here; the physical-iPhone drill with the real StoreKit sandbox right and real Airplane Mode passed, owner-reported, see "Device drill"). Prompt: [PHASE_20](../prompts/PHASE_20.md). Decision: [D142](../DECISIONS.md).

## Starting point and dependencies

- Read v1.2 in full (textutil) and the required documents. Baseline `main` 269cba0, clean; Phase 19.5 VERIFIED COMPLETE (D139-D141).
- EAS before this phase (read-only, eas-cli 25.3.0): account bosko123 (Owner), project `@bosko123/saving-worlds` 25d3089f-a32e-461f-baf2-7c95a396984e. One channel `development` → branch `development` (no updates). No preview/production channel, no preview or production build, no update ever published. EAS environment variables: none in production, preview or development.
- Runtime 1.0.0 was not shared: only development clients existed (last 0799fb03, fingerprint 935de421…). The local fingerprint at 269cba0 was already different (D140 launch color), so a new build was required anyway.
- Native/persistence changes since Phase 01 all happened before any runtime was shared (expo-image, expo-notifications, expo-iap, schema 2-5, icon/splash); runtime 1.0.0 is shared for the first time by this phase's preview builds.

## What was built

| Area | Files | Result |
| --- | --- | --- |
| Release-build diagnostics (D142) | `src/bootstrap/build-info.ts`, `build-info-copy.ts`, `read-build-info.ts`, `delivery-marker.ts`, `src/shared/ui/list-row.tsx` (`onLongPress`, `longPressActionLabel`), `src/app/(tabs)/(home)/settings.tsx` | Press and hold Settings › About › Version (or its VoiceOver action "Show build details") shows app version, runtime, channel, update ID or "Embedded bundle", publish time (UTC), launch kind (normal / emergency + reason) and, only in drill bundles, the delivery marker. Visible About unchanged (D110). No savings data. |
| Preview simulator profile | `eas.json` `preview-simulator` (extends `preview`, `ios.simulator: true`) | Same channel `preview` and environment `production` as the device build. |
| Compatibility gate and release record | `scripts/release-check.mjs`, `scripts/release/release-contract.js`, `delivery/runtime-contracts.json` | Checks the delivery config, native fingerprint and stored-data contract against the recorded shared runtime; `--eas` reads channels/branches/builds/updates; `--publish` requires a clean tree; `--record` writes the runtime contract after matching EAS's fingerprint. |
| Drill tooling | `scripts/ota-drill.mjs`, `scripts/release/persisted-digest.js` (+ `.d.ts`) | `snapshot` (redacted ledger hash and stored rights from a copy of the simulator's database), `updates` (expo-updates' own database: status, runtime, launches, assets on disk), `seed`, `point`, `proxy` (fault proxy: offline, interrupt, throttle, corrupt, wrong-runtime; serves the update's exact bytes from its local export). |
| Synthetic fixture | `tests/native/release-fixture.ts`, `tests/integration/release-fixture.test.ts` | One Island goal built through the real commands on host SQLite: €1,000.00 target, deposits 600 + 450, withdrawal 300 corrected to 250 = €800.00 (80%), souvenir (Island v2), First step and Next milestone completed, Next milestone active, 9 receipts, no entitlement rows. |
| Tests | `tests/unit/build-info.test.ts`, `tests/unit/release-contract.test.ts`, `tests/unit/delivery-config.test.ts`, `tests/unit/english-catalog.test.ts`, `tests/integration/accessibility-settings.test.tsx` | Diagnostics rules, gate rules (blocking launch, runtime override, preview routed to production, native/schema/stored-data change under a shared runtime), profile matrix, catalog, press-and-hold and VoiceOver action. |

## Artifacts and identifiers

| Item | Value |
| --- | --- |
| EAS project | `@bosko123/saving-worlds` 25d3089f-a32e-461f-baf2-7c95a396984e, bundle ID `com.bosko123.savingworlds` |
| Runtime contract | runtime 1.0.0 (appVersion policy), iOS, fingerprint c83b89a5d24660fbb150b4b77e20fdf4c969aee3, schema 5 (migrations 0001-0005), stored-data contract 5e4b7f952c7e…, recorded from e86513c7 in `delivery/runtime-contracts.json` |
| Preview build, simulator | **e86513c7-111c-4e28-b85d-ab04d36bf4a3**, profile `preview-simulator`, channel preview, environment production, Release, 1.0.0 (1), commit 6abd498, fingerprint c83b89a5…, artifact sha256 eff15038…febde, embedded update e5193fd7-7630-4efb-a462-c48ce74bd1e2 (158 assets, Hermes bytecode 5.45 MB) |
| Preview build, device | **638cba93-4d79-4db1-ac85-b1744a94a885**, profile `preview`, internal (ad hoc) distribution, channel preview, environment production, 1.0.0 (1), recorded commit 692abd9 (app inputs identical to 6abd498: `git diff 6abd498 692abd9 -- src app.config.ts eas.json package.json package-lock.json assets` is empty), fingerprint c83b89a5… |
| Channel → branch | preview → preview (created by the first preview build); development → development; **no production channel** |
| OTA-1 | group c49dc07b-3527-4802-9bf5-96ee00e68187, iOS update 01a17d61-dac0-794e-88ac-208761282f21, runtime 1.0.0, commit 6a40478 (drill commit: only `DELIVERY_DRILL_MARKER = 'OTA-1 (Phase 20 drill)'`), 160 assets |
| Incompatible test update | group 3859b02e-1ecc-4c23-8f78-79216505c404, update 01a17d6a-c2eb-768c-bcaf-b6c35a0f4cf6, runtime `phase20-incompatible`, commit 6fb83a9 |
| OTA-2 | group e647be4f-11d9-48b8-8918-fc7378f55212, update 01a17d73-73d0-7a29-9a89-2705fd684c33, runtime 1.0.0, commit 1246d8a (marker 'OTA-2') |
| Rollback to OTA-1 | republished group 1a6b5b59-1168-4049-8b2b-2950dcd1ef09, update 01a17d7b-ae85-790f-be64-a6e1e13d94b3 |
| Rollback to embedded | group 802ac048-dcf0-40a0-9d4f-7f506439d051, update 01a17d7c-beca-7a2d-a4ea-665584c39e0f (`isRollBackToEmbedded`) |
| OTA-1 for the iPhone drill | republished group 09c72f72-b93f-48ee-b6ff-729e68f47b73, update 01a17d7d-a9fe-73d5-b4db-0cccb4d720a2 |

All publications: `eas update --platform ios --channel preview --environment production` (no `--auto`, no branch inference, no runtime override), `update:republish --group`, `update:roll-back-to-embedded --branch preview --runtime-version 1.0.0 --platform ios`. The drill commits live on side branches `phase20-ota-drill` and `phase20-ota-incompatible` and are never merged.

## Verification

Simulators: two dedicated iPhone 17 Pro iOS 26.0 simulators created for this phase, "SW P20 A" (F2004769…, unmodified install, talks to EAS directly) and "SW P20 B" (BE992E11…, its installed test copy's `Expo.plist` points at the local fault proxy with the scope key kept as `https://u.expo.dev`; done before first launch). Both installed from artifact e86513c7 and seeded with the synthetic fixture before first launch. Ledger hash = sha256 of the redacted savings record (goals, entries, receipts, souvenirs, attempts, currency, migrations); full table in [phase-20/digests.txt](phase-20/digests.txt), proxy log with the app's request headers in [phase-20/proxy-log.jsonl](phase-20/proxy-log.jsonl) (install IDs redacted).

| Check | Environment | Result | Observed |
| --- | --- | --- | --- |
| `npm run lint`, `npm run typecheck` | Mac, after the final edits | PASS | exit 0, exit 0 |
| `npm test -- --runInBand` | Jest, after the final edits | PASS | 60 suites, 1615 passed, 1 env-gated skip (was 58 / 1581 at 19.5) |
| Final gate | `node scripts/release-check.mjs --eas --publish` at b5703ba | PASS | exit 0; [record](phase-20/release-record-final.json) |
| Release gate on each published commit | `node scripts/release-check.mjs --eas --publish` | PASS (OTA-1 6a40478, [record](phase-20/release-record-ota1.json)); **FAIL as intended** on the incompatible commit (runtime policy and fingerprint 152430203661 ≠ c83b89a5…); OTA-2 see deviation below | Both preview builds' EAS fingerprints = local |
| Artifact inspection | e86513c7 | PASS | `Expo.plist`: URL u.expo.dev/25d3089f…, `expo-channel-name: preview`, runtime 1.0.0, CheckOnLaunch ALWAYS (= ON_LOAD), LaunchWaitMs 0. Hermes bytecode. Dev module code absent (only the known unreachable route titles, D39). ATS: `NSAllowsArbitraryLoads false`, `NSAllowsLocalNetworking true`; no Bonjour/local-network usage keys. |
| T24 first launch, update server unreachable | B, proxy `offline` | PASS | Embedded bundle, Home €800.00 of €1,000.00, 80%, stage 8 Island; paywall's Garden preview drawn; build details "preview / 1.0.0 / Embedded bundle / Normal" ([02](phase-20/02-B-offline-first-launch-home.png), [03](phase-20/03-B-offline-paywall-garden.png), [04](phase-20/04-B-build-details-embedded.png)). Ledger e8082baab0b3 = fixture file. |
| T24 online download, next-normal-start activation | A, direct to EAS | PASS | Launch: OTA-1 downloaded in the background, status ready, 160/160 assets on disk, embedded still running. Next cold start: OTA-1 launched (1 ok); build details show update 01a17d61…, published 12:42 UTC, marker "OTA-1 (Phase 20 drill)" ([05](phase-20/05-A-build-details-ota1.png)). Ledger unchanged. No reload in the running session. |
| T24 offline launch from cache, complete assets | B, proxy `pass` then `offline` | PASS | After a clean download (status ready), a cold start with the server unreachable launched OTA-1; Island and Garden drawn ([06](phase-20/06-B-offline-cached-ota1-island-garden.png)); ledger unchanged. |
| T25 interrupted download | B, proxy `interrupt` (exact bytes, cut after 64 KiB of the 4,482,100-byte bundle) | PASS | OTA-1 stays `pending` with 0 launches; next launches (online and offline) run the embedded bundle; ledger unchanged. |
| T25 corrupted download | B, proxy `corrupt` (exact bytes with flipped bytes) | PASS | Hash check refuses the assets; OTA-1 stays `pending`; embedded keeps launching; ledger unchanged. |
| T25 app killed mid-download | B, proxy `throttle`, app terminated after 90 KiB of the bundle | PASS | Client aborted; update `pending`; offline relaunch runs embedded; ledger unchanged. |
| T25 incompatible runtime, server side | A, direct to EAS, two cold starts after publishing runtime `phase20-incompatible` to preview | PASS | Never offered: A stays on OTA-1. |
| T25 incompatible runtime, client side | B, proxy asks EAS for runtime `phase20-incompatible` and serves the complete update | PASS | The app downloaded it completely (status ready, newer commit time) and still launched OTA-1 on every cold start (launches 6 → 7); the incompatible update has 0 launches. |
| Rollback to prior known-good | A: OTA-2 active → €50.00 deposit saved through the UI on OTA-2 → `update:republish` OTA-1 → two cold starts | PASS | Republished OTA-1 (01a17d7b…) launched; ledger fe2c192038ef (4 entries, 10 receipts, €850.00) identical before and after: the newer write stays, readable, no duplicate. |
| Rollback to embedded | A: `update:roll-back-to-embedded` → two cold starts | PASS | expo-updates marked the embedded update newest; second cold start launched it (3 launches); ledger fe2c192038ef unchanged. |
| No forced reload during work | code review + drill | PASS | The app never calls `reloadAsync`, `checkForUpdateAsync` or `fetchUpdateAsync` (only reads in `read-build-info.ts`); every activation happened on a cold start. |
| Production isolation | `eas channel:view production`, `branch:list` | PASS | "Could not find channel with the name production"; branches: preview (6 groups), development (0). No production build. |
| Update request metadata (privacy) | proxy log | Recorded | Headers sent: user-agent (app name/build, CFNetwork, Darwin version), accept-language, accept, if-none-match, expo-runtime-version, expo-channel-name, expo-platform, expo-current-update-id, expo-embedded-update-id, expo-updates-environment, expo-protocol-version, expo-api-version, expo-json-error, eas-client-id (random install ID); after a crash `Expo-Fatal-Error` (≤ 1024 chars, source). No savings data. PRIVACY.md does not mention the user agent or language: owner to decide wording. |
| Duo release-mode cold launch (carried from 19.5) | new "SW P20 Duo" iOS 27.1 | NOT RUN | The first create failed to boot (launchd_sim); the second booted and installed e86513c7 but `simctl launch` never returned (8 min), so no recording. The owner's existing Duo simulator holds the dev build other sessions use and was not touched. Carried to Phase 21 (release candidate, physical Duo). |
| `npm run test:db` | — | NOT RUN | No schema, migration or repository change (gate: stored-data contract unchanged, schema 5). The release build read the host-built fixture with the native expo-sqlite and wrote through it (StoreKit check, a deposit); last native run Phase 19 (55/55 + R2). Phase 21 runs it on the release candidate. |
| `npm run deps:check`, `npm run doctor` | — | NOT RUN | No dependency change. |

### Deviations and fixes found during the drill (kept as history)

1. **CDN refuses non-app clients.** The first interrupt/corrupt/throttle runs fed the app the CDN's 403 HTML (1,724 bytes) because the proxy re-fetched assets itself. The app refused them too, but that was not the intended test. Fixed: the proxy serves the update's exact bytes from the local export (matched by the manifest SHA-256) and never forwards `If-None-Match` (a 304 made the app reuse a cached manifest). All three cases were rerun with real bytes (PASS above); the first runs are kept in the digest table as "(pre-fix)" steps 12:43-12:46.
2. **Node connect timeout.** `eas update` failed six times with ETIMEDOUT after ~500 ms: Node gives each address family 250 ms, connects took 0.4-0.9 s on this network. Workaround for every EAS command: `NODE_OPTIONS=--network-family-autoselection-attempt-timeout=3000`; the gate sets it for its child processes.
3. **OTA-2 published before its gate finished.** The gate's own EAS query hit the timeout (exit 2) and the shell chain did not stop on it. The gate was rerun afterwards on 8c7054a, whose app inputs are byte-identical to the published 1246d8a (empty diff of src, config, package files, assets): PASS. Runbook rule added: check the gate's exit code itself, never through a pipe.
4. **Launch writes the rights row.** The first launch stored `not_owned` (StoreKit answered on the simulator); the digest was split so the ledger hash excludes stored rights and settings records.
5. **Simulator A wedged** (`simctl` calls hung after a killed `terminate` while the Mac's load average was 200-477); rebooted, data kept.

## Device drill (owner, iPhone 14 Pro, StoreKit sandbox)

Steps 1-5 reported by the owner on 27 October 2026 as "sve je ok" (all fine); step 6: "Update shows Embedded bundle, no Delivery check line, data and Pro are the same." Recorded as owner-reported, without screenshots in the repository. The preview branch now ends with roll-back-to-embedded 91bb041d, so preview installs run their embedded bundle.

Required by the prompt and not replaceable by a simulator: real Airplane Mode, the actual verified StoreKit sandbox right through an update and a rollback.

| Step | Expected | Result |
| --- | --- | --- |
| 1. Note state in the dev build (Pro, goals) | — | PASS (owner-reported) |
| 2. Install preview build 638cba93 over the dev build | data kept | PASS (owner-reported) |
| 3. Airplane Mode on, open | embedded launch, same goals/amounts, Pro active; build details "preview / 1.0.0 / Embedded bundle" | PASS (owner-reported: "sve je ok") |
| 4. Airplane off, open, wait, swipe away, open | update 01a17d7d-a9fe-73d5-b4db-0cccb4d720a2, marker OTA-1; same data; Pro active | PASS (owner-reported) |
| 5. Airplane on, swipe away, open | same update from cache; Island and Garden drawn; Pro active | PASS (owner-reported) |
| 6. Rollback to embedded (operator), Airplane off, open twice | Embedded bundle; same data; Pro active | Operator step done: roll-back-to-embedded group 91bb041d-9bcd-42b6-9026-836dec2bbb13 (update 01a17d91-7ffd-756a-9360-f7a363c50e94); phone: Update "Embedded bundle", no Delivery check line, same data and Pro — PASS (owner-reported) |

## Not done / limitations

- Simulator "offline" is the update server made unreachable through the proxy, not a full network loss; StoreKit stayed reachable on the simulators (Free there). The device drill covers real Airplane Mode.
- `updates_assets` rows in expo-updates' database are duplicated per retry (624 → 1096 links for 160 assets on B); files on disk are complete. expo-updates behavior, no impact seen.
- The project archive for EAS Build is 619 MB (Blender sources under `assets/worlds/` are uploaded; the app reads only `assets/themes/`); excluding them in `.easignore` would cut upload time, not done in this phase.
- Changing package.json "scripts" changes the native fingerprint (`packageJson:scripts` source), so the drill tools are run with `node scripts/…`, not npm scripts.

## Closing

The owner closed the phase after the device drill (D143). Carried, not passed: the Duo release-mode cold launch (Phase 21 on the release candidate); PRIVACY.md wording for the user agent and language headers (owner; before Phase 22 App Privacy answers). Next prompt: [PHASE_21](../prompts/PHASE_21.md).
