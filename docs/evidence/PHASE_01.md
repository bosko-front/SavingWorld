# Phase 01 evidence: Latest Expo EAS setup packages and native navigation

Session date: 23 October 2026. Product authority: [MVP plan v1.2](../Saving_Worlds_MVP_Plan_v1_2.docx), read in full (text and tables) with `textutil` before any change. Phase state at close: VERIFIED COMPLETE (see [Result](#result)). Applicable test IDs: T21 (latest stable/compatible peers locked), T24 (Phase 01 configuration part only; release-mode OTA is Phase 20).

## Starting state and dependency evidence

- Working tree before changes: Git repository on `main` with no commits; untracked `.DS_Store` and `docs/` only. No package.json, lockfile, source, tests, native project or EAS config existed. No implementation phase had evidence.
- Docs preservation: SHA-1 of all 51 files under `docs/` (excluding .DS_Store) recorded before scaffolding and compared after scaffolding and install: identical. Both DOCX sources unchanged (v1.2 SHA-1 `641b5e6b1e2afcd0e03d90e360c29124489406c4`). Later edits in this session are the deliberate documentation updates listed under Files changed.
- Scaffold method: `npx create-expo-app@latest saving-worlds --yes --no-install` in the session scratch directory (template `expo-template-default@sdk-58`), never in SavingWorld. Copied only conflict-checked files: package.json (then rewritten), tsconfig.json, .gitignore, `.claude/settings.json`, `.vscode/*`, `assets/images/icon.png`, `assets/images/splash-icon.png`. No existing file was overwritten. Template LICENSE (MIT), README, AGENTS.md, demo components, web files and template `.git` were not copied.
- A `.idea/` folder appeared in the project during the session; it was not created by this work and was left untouched.

## Latest stable SDK check

| Source | Observation |
| --- | --- |
| `npm view expo dist-tags` (23 Oct 2026) | `latest: 58.0.17`; `next: 58.0.11`; `canary: 58.0.0-canary-…`; highest `sdk-*` tag is `sdk-57`. No SDK 59 stable or beta. |
| create-expo-app default | Resolved `expo-template-default@sdk-58` |
| `npx expo config` | `sdkVersion: 58.0.0` |

Selected: Expo SDK 58, `expo` 58.0.17. No beta/canary, no downgrade, no forced peer flags (`--force`/`--legacy-peer-deps` never used).

## Toolchain

| Tool | Version / availability |
| --- | --- |
| macOS | 27.0.1 (26A434) |
| Node / npm | v22.16.0 / 10.9.2 (package.json `engines.node >=22.13.0`) |
| Xcode | 27.1 (27A9275), `/Applications/Xcode.app` |
| iOS simulator runtimes | 18.5, 26.0, 26.1, 26.4, 26.5, 27.0 |
| SDK 58 native minimum | iOS 16.4 (ExpoModulesCore/@expo/ui/expo-sqlite podspecs); React Native 0.88 min Xcode 16.1 |
| Older-iPhone simulator | iPhone SE (3rd generation) supported on every installed runtime including iOS 18.5; created `SW iPhone SE 3 iOS 18.5` (66F6F9E8-A5F1-499F-BBA7-1D61CA7AC729) |
| iPhone Duo simulator | Device type `com.apple.CoreSimulator.SimDeviceType.iPhone-Duo` exists, but **no installed runtime supports it**: `simctl create … iPhone-Duo … iOS-27-0` → "Incompatible device". Early blocker for Phase 03 (see Blockers). |
| Device Hub | Not found as a separate app in /Applications; Xcode 27.1 is the only Apple developer app installed. Duo access is via simulator runtime download. |
| watchman | Not installed (optional; Metro works without it) |
| EAS CLI | 25.3.0 (latest on npm at setup), pinned via `npm run eas` |

## Package and install matrix

All native packages installed with `npx expo install` (SDK-resolved), dev tooling with `npx expo install … -- --save-dev` then moved to devDependencies; one npm lockfile (`package-lock.json`, lockfileVersion 3).

| Package | Declared | Locked | Source | Why |
| --- | --- | --- | --- | --- |
| expo | ~58.0.17 | 58.0.17 | template | SDK |
| react / react-native | 19.3.0 / 0.88.0 | 19.3.0 / 0.88.0 | template | SDK-supplied |
| expo-router | ~58.0.25 | 58.0.25 | template | Routes, native Stack, NativeTabs |
| react-native-screens | ~4.30.0 | 4.30.0 | template | Native stack/tabs |
| react-native-safe-area-context | ~5.10.1 | 5.10.1 | template | Safe areas (Phase 03 policy) |
| react-native-reanimated | 4.7.1 | 4.7.1 | template | Animations (Phase 10) |
| react-native-worklets | 0.13.0 | 0.13.0 | template | Required by Reanimated 4.7 (peer `0.13.x`) |
| @expo/ui | ~58.0.22 | 58.0.22 | template | Planned adaptive container (Phase 03) |
| react-dom | 19.3.0 | 19.3.0 | template | Required (non-optional) peer of @expo/ui |
| expo-constants, expo-linking | ~58.0.13, ~58.0.14 | 58.0.13, 58.0.14 | template | Router peers |
| expo-splash-screen, expo-status-bar, expo-system-ui | ~58.0.11, ~58.0.4, ~58.0.6 | same | template | Launch/appearance |
| react-native-gesture-handler | ~3.3.0 | 3.3.0 | expo install | Transitive expo-router dependency that Expo autolinks; pinned to SDK range (D36) |
| expo-dev-client | ~58.0.14 | 58.0.14 | expo install | Development builds |
| expo-sqlite | ~58.0.13 | 58.0.13 | expo install | Local ledger (Phase 05); config plugin added |
| expo-localization | ~58.0.5 | 58.0.5 | expo install | Locale/currency formatting (Phase 04/19); config plugin added |
| expo-updates | ~58.0.18 | 58.0.18 | expo install | EAS Update |
| zustand | ^5.0.16 | 5.0.16 | expo install | In-memory UI/query state |
| typescript, @types/react | ~6.0.3, ~19.3.0 | 6.0.3, 19.3.0 | template | Strict TS |
| eslint, eslint-config-expo | ^9.39.5, ~58.0.4 | 9.39.5, 58.0.4 | expo install | `expo lint` |
| jest, jest-expo, @types/jest | ~30.5.2, ~58.0.12, 30.0.0 | same | expo install | Tests (`jest-expo/ios` preset) |
| @testing-library/react-native | ^14.1.0 | 14.1.0 | expo install | Router/UI tests |
| @types/node | ^22.20.5 | 22.20.5 | npm | Node types for tests (matches Node 22) |
| eas-cli | 25.3.0 | not in lockfile | `npx --yes eas-cli@25.3.0` script | expo-doctor rejects eas-cli as a dependency (D33) |

Template packages not carried over: react-native-web, expo-web-browser, expo-image, expo-device, expo-font, expo-glass-effect, expo-symbols (removed after expo-doctor flagged its missing expo-font peer; NativeTabs SF Symbol icons do not need it). Not installed by design: notifications, IAP, image, SVG/chart, Skia, Lottie, expo-hinge, CSS framework, scaling library.

Native rebuild rule: any change to a native package, config plugin, app.config.ts native field or SDK requires a new development build (`npm run eas -- build --platform ios --profile development-simulator`, or the `development` profile for devices) and, once a runtime is shared, a new `version` per the appVersion policy. JS-only changes reload through Metro (`npm start`).

## EAS project and configuration

| Item | Value |
| --- | --- |
| Expo account / owner | bosko123 (owner selected in chat; logged-in user bosko123 also owns `beautify`, not used) |
| Project | `@bosko123/saving-worlds`, created by `eas init --non-interactive --force` after confirming it did not exist |
| Project ID | 25d3089f-a32e-461f-baf2-7c95a396984e |
| Update URL | https://u.expo.dev/25d3089f-a32e-461f-baf2-7c95a396984e |
| Bundle identifier | com.bosko123.savingworlds (owner selected) |
| App version / runtime | 1.0.0 / `runtimeVersion.policy: appVersion` → runtime 1.0.0 |
| Update activation | `checkAutomatically: ON_LOAD`, `fallbackToCacheTimeout: 0`, embedded update enabled: start immediately from embedded/cached bundle, adopt a downloaded update on a later launch. No reload code exists in the app. |
| Build numbers | `appVersionSource: remote`; EAS initialized buildNumber 1 |

| Profile | Distribution | Channel | Environment | Notes |
| --- | --- | --- | --- | --- |
| development | internal | development | development | developmentClient |
| development-simulator | internal | development | development | extends development, `ios.simulator: true` |
| preview | internal | preview | production | release mode |
| production | store | production | production | autoIncrement build number |

Service side effects: EAS created update channel `development` and branch `development` during the first build. No preview/production build, no update publication, no channel remapping, no submission.

## Native navigation shell

Routes (thin, temporary display content):

- `src/app/_layout.tsx` root Stack; `(tabs)` without header; `sample-form` as native `formSheet` (grabber, 50%/100% detents); re-exports Router `ErrorBoundary`.
- `src/app/(tabs)/_layout.tsx` NativeTabs: Home `(home)`, Challenges `(challenges)`, Collection `(collection)` with SF Symbol icons.
- `(home)` Stack: `index` (/), `details` (/details, pushed), `settings` (/settings, pushed; shows app version/runtime/channel/update via `src/bootstrap/`). `unstable_settings.anchor` keeps Home under deep-linked routes.
- `(challenges)/challenges` (/challenges), `(collection)/collection` (/collection), each in its own Stack.

## EAS development builds

| Build ID | Profile | Result | Notes |
| --- | --- | --- | --- |
| f34f4f2e-af87-41de-8f01-512b64860c0b | development-simulator | CANCELED (superseded) | Started before react-native-gesture-handler was pinned; its lockfile autolinked RNGH 3.4.0, outside SDK 58's ~3.3.0. Cancelled so the evidence build matches the final lockfile. |
| **bdbf2303-bcd2-4b92-980c-2fca9e98d949** | development-simulator | **FINISHED** 10:09:56→10:16:47 | iOS, internal, channel `development`, SDK 58.0.0, runtime 1.0.0, version 1.0.0, build number 1, fingerprint 9bc7aaf4f9b535f343277ff193f029ec4319865d. [Logs](https://expo.dev/accounts/bosko123/projects/saving-worlds/builds/bdbf2303-bcd2-4b92-980c-2fca9e98d949) |

Both builds were uploaded with `EAS_NO_VCS=1` because the Git repository has no commits; `.easignore` (a copy of .gitignore plus `docs/`, `.claude/`, `.vscode/`) controls the archive. Once the owner commits, normal VCS mode can be used.

Artifact inspection (`SavingWorlds.app`): CFBundleIdentifier `com.bosko123.savingworlds`, version 1.0.0 (1), MinimumOSVersion 16.4. Embedded `Expo.plist`: `EXUpdatesEnabled true`, `EXUpdatesRuntimeVersion 1.0.0`, `EXUpdatesURL https://u.expo.dev/25d3089f-…`, request header `expo-channel-name: development`, `EXUpdatesCheckOnLaunch ALWAYS` (ON_LOAD), `EXUpdatesLaunchWaitMs 0` (no network wait at startup).

## Verification

| Check | Environment | Result | Evidence / remaining action |
| --- | --- | --- | --- |
| `npm run lint` (`expo lint --max-warnings 0`) | Node 22.16.0 | PASS, exit 0 | Final run after last edit |
| `npm run typecheck` (`tsc --noEmit`, strict + noUncheckedIndexedAccess etc.) | TypeScript 6.0.3 | PASS, exit 0 | |
| `npm test -- --runInBand` | jest-expo/ios 58.0.12 | PASS, 3 suites / 18 tests | Unit: EAS/app config contract (project, runtime policy, ON_LOAD/0 ms, bundle ID, profile channel/environment matrix); build-info formatter. Integration: real `src/app` routes via expo-router `renderRouter` (root, push/back, sheet present/dismiss, Settings, tab switching, deep-link back target). Mutation check: removing the Home `anchor` made the deep-link back test fail. |
| `npx expo install --check` (`npm run deps:check`) | SDK 58 | PASS: "Dependencies are up to date" | |
| `npx expo-doctor@latest` (1.21.5) | | First run FAIL 17/20 (eas script name clash, eas-cli dependency, missing expo-font peer of expo-symbols). Fixed by removing the eas-cli dependency (which also resolved the script clash) and expo-symbols. Final: PASS 20/20 | No forced peers or overrides |
| `eas config` for development, development-simulator, preview, production | eas-cli 25.3.0 | PASS | Resolved channel/environment/distribution exactly as the table above; runtime `{policy: appVersion}` |
| `npx expo export --platform ios` | local Metro | PASS | Hermes bundle 2.5 MB, 1307 modules |
| Native permissions/config (`expo config --type introspect`) | | PASS for Phase 01 scope | No camera/photo/notification/tracking usage strings or entitlements. Present: `NSLocalNetworkUsageDescription` + `_expo._tcp` Bonjour (expo-dev-client) and Expo default ATS (`NSAllowsArbitraryLoads` + localhost). Release privacy review of these belongs to Phase 20/22. `UIRequiresFullScreen false`, all four orientations, `ITSAppUsesNonExemptEncryption false`. |
| EAS dev build cold launch + navigation | iPhone 17 simulator, iOS 26.0 (CE4A4384-…), build bdbf2303, Metro dev server | PASS | Two cold launches; native liquid-glass NativeTabs; large-title native Stack; Home→Details push and native Back; sample form as native form sheet (grabber, 50% detent) and Done dismiss; Home→Settings push; Challenges and Collection tabs; returning to Home restored its stack (Settings) |
| EAS dev build on older iPhone | iPhone SE (3rd gen) simulator, iOS 18.5 (66F6F9E8-…), same build | PASS | Launch, classic native tab bar, Details push/back, Collection tab |
| Native errors | both simulators | PASS | No crash reports; no `fault` log entries for SavingWorlds; Metro showed one dev-only RN warning ("Sending `onAnimatedValueUpdate` with no listeners registered") |
| Settings build diagnostics in dev client | iPhone 17 | FAIL then PASS | First launch showed a blank Channel (native value is `''`) and "Not available" for a Metro-served launch. Fixed `describeBuildInfo` (empty string → Not available; no update ID → "No update loaded") with a regression test; re-verified on device: App version 1.0.0, Runtime 1.0.0, Channel Not available, Update No update loaded. |
| iPhone Duo simulator | Xcode 27.1, runtimes ≤ 27.0 | NOT RUN (environment missing) | Device type exists but `simctl create` → "Incompatible device" on iOS 27.0; no installed runtime supports it. Early blocker for Phase 03. |
| Physical iPhone dev build | | NOT RUN (not required for Phase 01) | Needs the owner's Apple Developer account, device registration and `development` profile build; record when performed. |
| Release-mode OTA / offline launch | | NOT RUN (Phase 20 scope) | Config inspected only; a dev client is not OTA acceptance. |

Observations for later phases: on iOS 26 the two unselected native tab labels were briefly truncated ("Challen…", "Collecti…") right after launch and rendered fully after the first tab switch; re-check in Phase 03 with larger text sizes. Temporary screens repeat their title as a large header and a heading; Phase 02 replaces the placeholder content.

## Dependency and permission diff review

Dependencies are exactly the Phase 01 foundation set, the template-supplied SDK/router/launch packages listed above, react-dom (required @expo/ui peer) and react-native-gesture-handler (autolinked transitive, pinned). Config plugins: expo-router, expo-splash-screen, expo-sqlite, expo-localization. No database tables, billing, reminders, financial calculations, credentials or secrets were added. No CSS framework, scaling library, Skia, Lottie or expo-hinge.

## Files changed

Added: `CLAUDE.md`, `package.json`, `package-lock.json`, `app.config.ts`, `eas.json`, `tsconfig.json`, `eslint.config.js`, `.gitignore`, `.easignore`, `.claude/settings.json`, `.vscode/extensions.json`, `.vscode/settings.json`, `assets/images/icon.png`, `assets/images/splash-icon.png` (Expo template placeholders), `src/app/_layout.tsx`, `src/app/sample-form.tsx`, `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/(home)/{_layout,index,details,settings}.tsx`, `src/app/(tabs)/(challenges)/{_layout,challenges}.tsx`, `src/app/(tabs)/(collection)/{_layout,collection}.tsx`, `src/bootstrap/build-info.ts`, `src/bootstrap/read-build-info.ts`, `src/shared/ui/placeholder-screen.tsx`, `src/shared/ui/shell-link.tsx`, `tests/unit/delivery-config.test.ts`, `tests/unit/build-info.test.ts`, `tests/integration/navigation.test.tsx`, `tests/expo-router-matchers.d.ts`, this evidence file.

Documentation updated: `docs/DECISIONS.md` (D31-D36), `docs/EAS_AND_OTA.md`, `docs/TECH_STACK.md`, `docs/ARCHITECTURE.md`, `docs/README.md`, `docs/PROJECT_STATUS.md`, `docs/SESSION_HANDOFF.md`. Mapping to the planned paths: `app.config.ts`, `eas.json`, `src/app/_layout.tsx`, `src/app/(tabs)/`, `src/bootstrap/`, `src/shared/` all as planned; no duplicate modules.

Generated/ignored (not committed): `node_modules/`, `.expo/`, `expo-env.d.ts`. No Git commit was made; the repository still has no commits.

## Blockers and limitations

1. **iPhone Duo simulator unavailable (Phase 03 blocker).** Install a simulator runtime that supports the iPhone Duo device type (iOS 27.1 or later, matching Xcode 27.1), for example Xcode → Settings → Components, or `xcodebuild -downloadPlatform iOS`. Then `xcrun simctl create "Duo" com.apple.CoreSimulator.SimDeviceType.iPhone-Duo <runtime>` should succeed. ArrangementView also needs iOS 27.1+.
2. No physical-device development build yet (owner Apple credentials/device registration). Not a Phase 01 acceptance item.
3. Placeholder Expo app icon/splash image until branding (Q09).
4. Dev-client local-network/ATS Info.plist entries need release review (Phase 20/22).

## Result

**VERIFIED COMPLETE** for Phase 01 acceptance: docs preserved and CLAUDE.md added; latest stable SDK 58 locked with a documented matrix; a real EAS iOS development build (bdbf2303-bcd2-4b92-980c-2fca9e98d949, development-simulator, runtime 1.0.0) launches with working native tabs/stack/back/sheet and no native errors; EAS profiles/channels/environments, project/update URL and appVersion policy validated with no update published; lint, TypeScript, tests, expo install --check and expo-doctor pass; simulator/toolchain coverage recorded with the Duo runtime gap flagged as an early Phase 03 blocker.

Next prompt: [PHASE_02](../prompts/PHASE_02.md).
