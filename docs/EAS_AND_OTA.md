# EAS build and OTA delivery plan

Product scope follows [MVP plan v1.2](Saving_Worlds_MVP_Plan_v1_2.docx); this document adds compatible engineering detail only.

The owner selected EAS. Configure EAS Build and EAS Update in Phase 01, then prove the complete delivery/recovery workflow in Phase 20 before final integrated verification in Phase 21 and release preparation in Phase 22. Local Xcode remains a diagnostic tool. This document plans future work; no EAS account/project/build/update has been created or changed by this documentation task.

## Tool ownership and project setup

EAS Build is the primary producer of development, preview and distribution binaries. EAS Update distributes compatible JavaScript and static asset updates through expo-updates. These developer services are not a savings backend: the ledger stays on the device and there is no in-app Expo login.

Phase 01 verifies the owner's Expo account/organization and intended project before linking it. Record the public project ID, slug, account owner, update URL and bundle identifier; never fabricate a project ID or attach an unrelated project. Install the selected compatible expo-updates and a pinned/reproducible EAS CLI tool version, then verify the result of the current EAS configuration commands. Authentication/signing/account role gaps are explicit dependencies, not something to bypass or label complete.

Build configuration belongs in the future eas.json and app.config.ts. EAS credentials and tokens stay in the service/keychain or approved ignored local environment. EXPO_PUBLIC values are embedded client data, not secrets. Do not add EAS Hosting, API routes, EAS Observe/Insights, GitHub deployment automation or a remote database merely because EAS is now selected.

References: [EAS build profiles](https://docs.expo.dev/build/eas-json/) and [Update setup](https://docs.expo.dev/eas-update/getting-started/).

## Build profiles channels and environments

Keep the initial matrix small. Profile names, update channels and EAS environments are separate concepts; set each explicitly.

| Build profile | Artifact and use | Channel | EAS environment |
| --- | --- | --- | --- |
| development | Native dev client for Metro and native feature development | development | development |
| preview | Release-mode internal-distribution app for OTA QA on test devices | preview | production |
| production | Release-mode store distribution candidate | production | production |

Preview intentionally uses the production export environment so a tested update artifact can be promoted without silently rebuilding it with different configuration. Its channel remains preview and cannot target production installations. The app has no backend/staging dataset to configure. Test only with synthetic data on dedicated test installations. The baseline preview and production builds share bundle identifier/native feature configuration apart from documented signing/distribution/channel differences; they are not assumed to co-install. Do not replace an installation containing real financial data to perform a test.

If a distinct preview environment or bundle identifier is later needed, record the difference and add a production-equivalent candidate check before promotion. Do not claim a differently compiled preview bundle is the exact production artifact.

A simulator helper may extend a base profile with ios.simulator true. Phase 01 added `development-simulator` (extends development, so channel development and environment development) for unsigned simulator dev clients; see D34 and [PHASE_01 evidence](evidence/PHASE_01.md). The linked project is `@bosko123/saving-worlds`. For OTA acceptance it must be a release-mode preview artifact, not simply a Metro session or normal dev client. Device distribution/signing and App Store purchase tests have their own evidence.

Use fixed development/preview/production channel names and a simple matching branch convention. Channels route installed builds to branches; branch names are not Git branches or access rights. Do not use automatic branch inference or user-accessible channel surfing. Record the actual channel-to-branch mapping before publication. See [channel concepts](https://docs.expo.dev/eas-update/eas-cli/).

Build and update exports use the same selected environment. The current CLI requires --environment for update publication on the chosen modern SDK; [EAS environment usage](https://docs.expo.dev/eas/environment-variables/usage/) explains how export values are embedded. Never depend only on eas.json build-profile env to configure a separate update export.

## Runtime compatibility policy

Engineering baseline: use runtimeVersion policy appVersion, with an explicit compatibility gate. Once a runtime has been shared, every native dependency/configuration/permission/Expo SDK change or persisted-data compatibility change requires a new app version, runtime and native build. Incrementing only ios.buildNumber does not change this runtime. Ordinary compatible JS fixes keep the existing runtime.

The gate compares the release's native package/configuration contract and persistence contract, not only the JavaScript diff. Do not reuse an existing appVersion for incompatible binaries or manually override a mismatch to force an update through. Include exact app version, iOS build number, runtime, platform, EAS build ID, source revision and schema range in release evidence.

This choice makes database release boundaries explicit. Fingerprint is a valid alternative for native compatibility, but a native fingerprint alone does not prove SQLite/data-format rollback safety. Do not change runtime policy casually; any future fingerprint adoption must still encode/review persistence compatibility. The policy and tradeoff are a project decision, not a claim that only one runtime policy works. See [Expo runtime versions](https://docs.expo.dev/eas-update/runtime-versions/).

## What may use OTA

| Change | Delivery rule |
| --- | --- |
| JS-only UI, copy, layout or bug fix using existing native APIs and stable persisted contracts | Eligible after checks against the exact installed runtime and preview artifact |
| Compatible local image asset correction | Eligible only with complete downloaded asset group, offline launch and historical theme-version verification |
| Native package/plugin/permission/entitlement/SDK/config change | New app version/runtime and EAS native build; distribute through the appropriate native channel |
| SQLite migration, stored JSON shape/meaning change or destructive repair | New app version/runtime/native build under the conservative MVP policy; never an OTA-only migration |
| New store product or materially changed reviewed paid-feature scope | Separate product/native/store review work; not silently enabled as an OTA shortcut |

For this MVP, same-runtime OTA updates must preserve schema and data meaning for both the candidate and its known-good/embedded fallback. The existing database runner still rejects an unknown newer schema without erasing records. A native runtime match does not validate data compatibility.

Example: runtime 1.0.0/schema 1 can receive a schema-preserving copy/layout fix. Schema 2 ships with a 1.1.0 runtime/native build and tested migration, not a 1.0.0 OTA bundle. Old-runtime updates cannot be made compatible by ignoring a schema failure. Developments before a runtime is shared remain local work; all published/shared artifacts use this gate.

## Update activation and offline launch

Baseline: native check on launch, immediate startup from a compatible cached/embedded update, zero additional network wait, and adoption of a newly downloaded update on a later normal restart. Verify the pinned SDK's ON_LOAD/fallback-to-cache configuration rather than copying an old setting blindly. Do not await an update fetch before opening the local ledger.

No forced reload during a transaction/challenge form, database write/migration, permission dialog or purchase/restore. There is no required Update Now product flow. Let the next cold launch activate a compatible downloaded update. First install in airplane mode and later offline launches must remain usable from the embedded/cached bundle with both shipped themes available.

Record app/native version and update ID/channel in redacted support diagnostics when available; absence of an update ID for an embedded launch is valid. Never send goal names, amounts, notes or ledger records as update metadata. Audit actual expo-updates request/diagnostic behavior before final privacy answers. See [download/launch behavior](https://docs.expo.dev/eas-update/download-updates/).

## Preview verification and promotion

Phase 20 uses a release-mode preview build with a known embedded baseline, compatible runtime and synthetic financial fixture. Its focused test includes:

1. Install and launch offline; record the embedded update, schema, selected goal and ledger fixture.
2. Prepare a harmless visibly identifiable JS-only update from reviewed source; run the real checks, export with the production environment and inspect runtime/platform/assets. Publish only to the isolated preview channel when executing that implementation phase.
3. Verify online download and normal-restart activation. Confirm no forced reload, duplicate transaction, draft corruption, missing asset or entitlement change.
4. Verify incompatible runtime is not loaded, interrupted/failed download preserves a working baseline, preview does not affect production routing, and subsequent offline launch uses complete cached content.
5. Exercise rollback to a known-good compatible update or embedded baseline using a disposable test installation. Verify ledger/receipts/challenge/collectible data remains accurate and actual StoreKit sandbox verified rights remain correct. Financial records may be synthetic fixtures; do not fabricate purchase verification by seeding an entitlement cache. Keep intentionally failing updates confined to the test channel/fixture.
6. Record the exact source revision, EAS build and update group/IDs, runtime, channel mapping, environment, schema compatibility, observed activation and rollback results. A development client loading a bundle is insufficient release-mode OTA proof.

Commands such as `eas build --platform ios --profile preview` and `eas update --platform ios --channel preview --environment production --message 'preview OTA verification'` are future implementation examples, not commands to execute during planning. Use the pinned CLI's current syntax and selected project. Preview publication goes only to the named test audience; no production command is run as a side effect.

Before a production update, identify the exact tested artifact, production channel/branch/runtime/platform, environment, compatibility evidence, intended audience/rollout percentage, baseline and recovery action. Prefer promoting/republishing the tested artifact with the supported CLI after verifying the same export environment, rather than producing untested output. Keep production publishing and channel remapping an explicit owner/operator action. Prepare the complete reviewable release record first.

## Rollout and recovery

For production, prepare a small initial staged rollout with a concrete observation interval, responsible operator and criteria to continue/stop. Select values for the actual release/audience; do not invent monitoring that nobody runs. Consult available EAS delivery/error data and manual beta reports, audit any data collection, and do not add an analytics SDK automatically. Promotion to 100 percent is a recorded operator action, not a timer-based assumption. See [rollouts](https://docs.expo.dev/eas-update/rollouts/).

EAS supports prior-update and embedded rollback, but reverting code does not undo SQLite writes or restore deleted savings. Confirm the known-good bundle can read current persisted state before rollback; otherwise prepare a tested forward fix/new native release. Expo error recovery is a last resort with limits, not a backup system. Keep embedded fallback and normal anti-bricking mechanisms enabled. See [rollback operations](https://docs.expo.dev/eas-update/rollbacks/) and [error recovery limits](https://docs.expo.dev/eas-update/error-recovery/).

## Authorization and handoff

Starting a phase whose scope explicitly includes EAS setup, development/preview builds or preparation of a signed production-candidate build authorizes those named preparation operations in the selected project. A scoped preview OTA drill authorizes publishing only to its isolated test channel. Missing account/project/signing information requires clarification, not repeated generic confirmation once it is known. Production publication, changing production routing/rollout and App Store upload/submission require the owner's explicit instruction for that operation. No such external action is performed by this planning task.

After every relevant session, handoff records account/project/profile/environment, binary version/build/runtime, branch/channel, source revision, schema contract and build/update IDs with actual results. Never include credentials. Keep prepared, built, preview-tested, production-published, TestFlight-uploaded, submitted and live states distinct. EAS Submit is an optional upload tool, not authorization to upload.
