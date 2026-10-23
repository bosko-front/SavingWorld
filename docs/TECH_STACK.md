# Technology choices

Product scope follows [MVP plan v1.2](Saving_Worlds_MVP_Plan_v1_2.docx); this document adds compatible engineering detail only.

Research date: 22 October 2026. These are recommendations for a new app, not installed packages. Phase 01 must use the latest stable Expo SDK available at setup, with compatible package patches, supported Node/Xcode/iOS toolchain and one lockfile. Beta/canary builds and a silent older-SDK fallback are excluded. Later sessions use that lockfile and re-check compatibility only when changing a native dependency.

## Recommended choices

| Area | Choice | Reason and limit |
| --- | --- | --- |
| App | React Native + Expo + TypeScript strict | Matches the product and supports native iPhone distribution. Use the React/RN versions supplied by the latest stable Expo SDK selected in Phase 01. |
| Navigation | Expo Router native Stack and NativeTabs | One route hierarchy, with OS-native chrome that adapts to Duo; no fixed custom bottom-bar replacement. |
| Styling | React Native StyleSheet and typed semantic tokens | One app palette and shared accessible controls; no additional CSS framework. See DESIGN_SYSTEM. |
| Adaptive layout | Shared window/container primitives and a narrow @expo/ui ArrangementView/RNHostView adapter | Native size/environment adaptation for scene/controls with an explicit older-iOS fallback. See ADAPTIVE_LAYOUT; no hinge-driven layout engine. |
| Persistence | expo-sqlite, parameterized SQL, small repositories | Direct control over atomic financial writes and migrations; no ORM needed for this schema. |
| State | Zustand with selected slices | Small in-memory UI/query state. SQLite remains the durable source. |
| Animation | react-native-reanimated with SDK-compatible dependencies | Short layer reveals, numeric feedback and transitions. Respect Reduce Motion. |
| World rendering | React Native image layers with static manifests | Ten unlocks per theme fit a small layered renderer. Profile before adding a canvas engine. |
| Skia | Not in the initial dependency set | Reconsider only if measured image-layer performance or chart needs justify it. Record package cost and accessibility fallback. |
| Lottie | Not in the initial dependency set | Reanimated is sufficient for planned effects. Avoid a second animation pipeline without an actual asset requirement. |
| Images/assets | Expo-compatible local image/asset tools | Bundle both themes; no runtime remote asset dependency. Use static import/require references. |
| Charts | Minimal SVG line/bar primitives using react-native-svg | One simple progress chart and monthly summary do not justify a chart framework. Accessible text/table is required. |
| Purchases | Evaluate expo-iap with native StoreKit 2 verification behind PurchaseGateway | Fits no-backend scope. A supported package version must prove required verified APIs, updates and restore before adoption. |
| Notifications | expo-notifications local scheduling | No remote push service or token registration. |
| Localization | expo-localization, Intl, a small typed English message catalog | Launch English; prepare text and monetary/calendar formatting for later languages. No large localization service. |
| Testing | jest-expo, Jest, React Native Testing Library; real-native scenarios; Maestro | Distinguish mocked logic/UI tests from SQLite, StoreKit, notifications and device evidence. |
| Tooling | npm lockfile, ESLint, TypeScript, formatting | One package manager. Install Expo native libraries with expo install. |
| Builds | EAS Build with Expo development/release builds and CNG | Required primary build service; local Xcode remains useful for native diagnostics. EAS Submit is an optional explicitly authorized upload method. |
| OTA updates | EAS Update + expo-updates with appVersion runtime policy | Required compatible JS/asset delivery; schema-preserving OTA only, isolated preview routing, nonblocking offline launch and tested recovery. See EAS_AND_OTA. |

Do not add AsyncStorage for the ledger, Redux, TanStack Query, a game engine, RevenueCat/IAPKit, remote analytics, authentication or a cloud database without a new requirement and decision.

## Version policy and facts checked

The latest stable release verified for this planning update is Expo SDK 58. Phase 01 must recheck the official release at execution time and choose the latest stable SDK then, including compatible patch updates. Do not silently downgrade the SDK to accommodate a package; resolve the package/adapter or document the blocker. See the [SDK 58 release notes](https://expo.dev/changelog/sdk-58). Use the supported template and package matrix at implementation time and record exact resolved versions.

The IAP guide lists expo-iap and react-native-purchases and requires development builds for custom native purchase code. Our no-backend recommendation selects the former for evaluation and excludes the latter's hosted service by default. See [Expo in-app purchases](https://docs.expo.dev/guides/in-app-purchases/). A [development build](https://docs.expo.dev/develop/development-builds/introduction/) is the native test target from the beginning.

The SQLite API provides persisted storage, exclusive transactions and database backup support. Verify the pinned version's exact APIs before writing the adapter. See [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/). This plan deliberately avoids depending on web SQLite behavior.

Use SDK-compatible animation packages and current configuration instructions, not an old manually copied Babel setup. See [Expo Reanimated](https://docs.expo.dev/versions/latest/sdk/reanimated/). Zustand supports slice selection; keep subscriptions focused on the values a screen needs. See [Zustand state updates](https://zustand.docs.pmnd.rs/learn/guides/updating-state.html).

Expo provides a Jest preset for native mocks and integration with React Native Testing Library. Those mocks make UI tests convenient; they are not native database verification. See [Expo unit testing](https://docs.expo.dev/develop/unit-testing/).

StoreKit returns verified/unverified transaction results, and current entitlements exclude refunded/revoked products. The adapter must preserve those distinctions and observe updates. See [Apple transaction verification](https://developer.apple.com/documentation/storekit/transaction?changes=_9) and [current entitlements](https://developer.apple.com/documentation/storekit/transaction/currententitlements?changes=_7). The package's [source and API documentation](https://github.com/hyochan/expo-iap) must be checked at the exact selected tag; an event callback alone is insufficient evidence of verification.

Local scheduling uses OS notification behavior. Check trigger support for the pinned SDK and test on a phone. See [Expo notifications](https://docs.expo.dev/versions/latest/sdk/notifications/). Avoid assuming delivery is guaranteed or that a task executes while the app is terminated.

Currency metadata must come from a versioned official ISO 4217 source, with the supported subset and minor-unit exponents recorded in Phase 04. [SIX financial data standards](https://www.six-group.com/en/products-services/financial-information/market-reference-data/data-standards.html) is the reference starting point. Keep unsupported/fund/metal codes out of a user-facing savings-currency list unless deliberately supported.

## Initial package installation and ownership

Phase 01 records every selected version, why it is needed, whether the template already supplies it, its compatibility source and native rebuild requirements. Install SDK-native dependencies with the current Expo install workflow; use the existing npm lockfile for reproducibility. Never hide incompatible peers with forced installation flags.

| When | Required or conditional packages | Installation boundary |
| --- | --- | --- |
| Phase 01 foundation | expo-router, expo-dev-client, react-native-safe-area-context, react-native-screens, react-native-reanimated and the worklets support required by that version, zustand, expo-sqlite, expo-localization, expo-updates, @expo/ui | Verify template-installed versions first; installing a package does not implement its financial/native feature. |
| Phase 01 tooling | TypeScript, SDK-compatible ESLint config, jest-expo/Jest/types, React Native Testing Library and reproducible EAS CLI | Create real lint/typecheck/test scripts and a small meaningful smoke suite. |
| Phase 01 EAS configuration | eas.json profiles, project/update URL and runtime configuration | Link the intended owner/project, configure explicit channels/environments and produce a real EAS dev build. No production OTA publish. |
| Phase 20 OTA verification | Existing expo-updates/EAS tooling and release-mode preview artifact | Actual compatible update, offline activation and recovery proof; a dev-client bundle load is insufficient. |
| Phase 02 styling | No extra styling package | Shared StyleSheet tokens/primitives and native appearance integration. The UX library plan (versions, uses, rejected options) is in DESIGN_SYSTEM and DECISIONS D41. |
| Phase 03 adaptation | Use the foundation safe-area and @expo/ui packages | No new package. ArrangementView/RNHostView adapter and older-iOS fallback in `src/shared/layout/` (D44); ArrangementView needs an Xcode 27.1 SDK build. No expo-hinge requirement. |
| Phase 03 forms (conditional) | react-native-keyboard-controller | Not installed: built-in `automaticallyAdjustKeyboardInsets` kept Save/errors reachable in native checks (D46). |
| Phase 06 feedback | sonner-native, react-native-svg, expo-symbols | Shared `src/shared/ui/toast.tsx` wrapper per DESIGN_SYSTEM toast rules, first SF Symbols; native rebuild. |
| Phase 07 feedback | expo-haptics | Success haptic after committed financial writes; reuses the Phase 06 toast; native rebuild. |
| Phase 06/07/14 native inputs | Existing @expo/ui (DatePicker, Picker, Switch) | No extra date-picker package. |
| Phase 09 scenes | expo-image, when the approved renderer needs it | Validate static asset references and memory; avoid an unused second image pipeline. |
| Phase 14 reminders | expo-notifications | Add its actual local scheduling/native configuration when reminders are implemented. |
| Phase 15 purchases | Selected compatible expo-iap or the bounded verified StoreKit adapter | Add purchase native configuration and rebuild when it can be tested. No hosted service by default. |
| Phase 18 statistics | react-native-svg (installed in Phase 06 for toasts) for the minimal chart | No general chart framework. |

Phase 01 locked Expo SDK 58.0.17 with React Native 0.88.0, React 19.3.0 and Expo Router 58.0.25 on 23 October 2026. The exact install matrix, template-supplied packages, removed template packages and EAS CLI pin are in [PHASE_01 evidence](evidence/PHASE_01.md) and DECISIONS D31-D36.

Version locking does not mean each fresh chat upgrades Expo. Initial setup uses the latest stable release; later upgrades are explicit reviewed changes with compatibility, migration and native checks.

## EAS Build and Update policy

EAS is required delivery tooling. [EAS_AND_OTA](EAS_AND_OTA.md) owns the profile/channel/environment matrix, runtime/data compatibility policy, next-normal-launch activation and preview/production workflow. The preview profile deliberately uses the production export environment on an isolated preview channel for promotion parity; do not substitute a differently compiled preview artifact unnoticed.

Phase 01 configures EAS and records the real owner/project/build IDs. Phase 20 tests release-mode OTA and rollback against actual persisted fixtures. Phase 21 repeats delivery checks for the release candidate and Phase 22 prepares production actions. All are future implementation work.

Official implementation references: [build profiles](https://docs.expo.dev/build/eas-json/), [Update setup](https://docs.expo.dev/eas-update/getting-started/), [runtime compatibility](https://docs.expo.dev/eas-update/runtime-versions/), [environment export](https://docs.expo.dev/eas/environment-variables/usage/) and [update recovery](https://docs.expo.dev/eas-update/error-recovery/). The chosen appVersion gate is intentional for explicit native/persistence release boundaries; do not assume a native fingerprint alone makes database rollback safe.

## Adaptive platform references

The native navigation/safe-area starting points are in [Expo's SDK 58 platform notes](https://expo.dev/changelog/sdk-58), [native tabs](https://docs.expo.dev/versions/v58.0.0/sdk/router/native-tabs/) and [safe areas](https://docs.expo.dev/develop/user-interface/safe-areas/). Product-specific behavior and the simulator/device matrix are in [ADAPTIVE_LAYOUT](ADAPTIVE_LAYOUT.md). Review actual availability before adopting a newer SDK API; a width-only screenshot is not a native fold test.

## Adoption checkpoints

Phase 01 locks the latest stable Expo/React/RN/Router/Reanimated package set and reviews planned IAP compatibility. Phase 02 chooses the palette/tokens; Phase 03 proves the shared native adaptive/Duo layout before feature UI. Phase 05 proves native SQLite transactions. Phase 09 measures the static scene. Phase 15 proves native purchases and verified state; if the package cannot expose them reliably, document a narrow StoreKit 2 Expo-module adapter rather than inventing a backend. Reassess scope before writing broad native infrastructure.

EAS account/project/roles, development builds, signing credentials, product setup, production artwork and store URLs are external dependencies to track in status. A missing credential is a named pending check, not a reason to claim the phase passed.

## Store and privacy sources

Digital feature purchases and restoration must follow current [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/). [Apple's IAP guidance](https://developer.apple.com/in-app-purchase/) describes current entitlement access and restore. Privacy answers must match shipped app/SDK data behavior, per [App privacy details](https://developer.apple.com/app-store/app-privacy-details/); inspect [privacy manifests](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files) as part of release preparation. Re-check these at Phase 22 because store requirements and accepted toolchains change.
