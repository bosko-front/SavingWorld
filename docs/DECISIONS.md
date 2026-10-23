# Decision log

Updated 23 October 2026. [MVP plan v1.2](Saving_Worlds_MVP_Plan_v1_2.docx) is the supreme product source. D26 supersedes conflicting historical entries below. Product decisions cite owner sources. Architecture decisions are recommended baselines for future implementation, not proof that code exists. Accepted engineering choices may be revised with evidence and an entry here. Q01-Q06 are resolved by v1.2. Only the remaining commercial/operational dependencies stay open.

| ID | State | Decision and reason | Tradeoff or consequence |
| --- | --- | --- | --- |
| D01 | Product confirmed | iOS first; no app accounts, backend, AI or cloud sync. Product plan sections 1, 7, 8. | Device-local data; purchase operations depend on Apple separately. |
| D02 | Historical; superseded by D26 | Free: one active goal and Island. Pro: unlimited goals, Garden and one lifetime purchase. Plan sections 4, 12. | Free-limit lifecycle and revocation edge policies remain Q01/Q05. |
| D03 | Historical; superseded by D26 | Owner clarification adds Pro custom amount/frequency challenges and the four specific statistics views. | No XP, levels, complex missions or advanced analytics. |
| D04 | Historical; superseded by D26 | Personalization is Pro Island/Garden selection and later switching. | No color customization, object placement or editor. |
| D05 | Product confirmed | Zero-percent initial state plus ten exact unlocks at 10%-100%, as listed in requirements. | Eleven render states; base is not milestone 1. |
| D06 | Engineering baseline | Feature modules with domain/application/data/presentation boundaries, thin Expo Router route files. | Small explicit modules rather than a service framework or plugin engine. |
| D07 | Engineering baseline | SQLite is durable truth; Zustand holds small in-memory query snapshots and UI state. | Explicit invalidation after commits; no persisted duplicate ledger/balance store. |
| D08 | Engineering baseline | Integer minor units, validated currency exponent, BigInt intermediate arithmetic and bounded safe-integer persistence. | Text parsing/formatting and number conversion need deliberate tests. No FX rates. |
| D09 | Engineering baseline | Shared milestone engine; locally bundled static theme manifests and image layers; Reanimated transitions. | Simpler profiling and asset pipeline. Skia/Lottie excluded until measured need. |
| D10 | Engineering baseline | Native StoreKit 2 integration behind a small PurchaseGateway; evaluate expo-iap against the pinned Expo release. | No RevenueCat/IAPKit or custom receipt server by default. Native verification and revocation proof required in Phase 15; a small local native adapter may be needed. |
| D11 | Historical; superseded by D26 | Entitlements are capabilities, not one global isPro flag: goal limit, Garden, custom challenges, Pro stats. | Future theme products can map to independent theme rights. Final future entitlements remain open. |
| D12 | Product confirmed | Manual export/import deferred; no app-managed backup or cloud sync for release 1.0. Plan section 3. | Honest data-loss copy and tested local failure recovery are essential. |
| D13 | Historical; superseded by D26 | Goal deadline stored as civil date; audit timestamps UTC; weekly/monthly suggestions count calendar contribution opportunities starting today. | Transparent estimates, not forecasts or financial advice. Formula in DATA_MODEL. |
| D14 | Historical; superseded by D26 | Financial corrections keep revision history; voiding removes an entry from current sums without deleting audit records. | More storage than overwriting; much safer explanation and recovery. Explicit goal deletion remains possible with confirmation. |
| D15 | Historical; superseded by D26 | Completion souvenir records are structurally separate from live balances. | Exact award/retention policy is Q03; implementation cannot silently decide it. |
| D16 | Engineering baseline | Local notifications are scheduled by the OS and reconciled from preferences and persisted intent. | Delivery is best effort; no exact-time promise or background execution assumption. |
| D17 | Engineering baseline | English catalog and Intl foundation; no network analytics/crash SDK in MVP. | Device verification and redacted local diagnostics replace server monitoring initially. |
| D18 | Engineering baseline | npm lockfile, SDK-compatible native packages and iOS development builds. Pin versions in Phase 01 after verification. | Planning documents are not a package lockfile. Do not blindly install latest into later sessions. |

## Setup and layout additions confirmed 22 October 2026

| ID | State | Decision and reason | Tradeoff or consequence |
| --- | --- | --- | --- |
| D19 | Owner confirmed | Latest stable Expo SDK and compatible package installation in Phase 01; early palette/global styling and responsive/Duo setup. See the setup/layout source record. | Recheck latest stable at initial execution and lock it; no automatic SDK upgrade per chat or silent older-version fallback. |
| D20 | Engineering baseline | StyleSheet plus typed semantic palette/spacing/type/motion tokens and shared accessible controls in Phase 02. | No extra CSS engine; app palette selection is independent of excluded user color customization. Starting colors/contrast are in DESIGN_SYSTEM. |
| D21 | Owner requirement plus engineering baseline | iPhone Duo and varying window sizes use a shared Phase 03 layout foundation, native Router chrome, live local bounds and a narrow native adaptive-container adapter. | @expo/ui is justified by the adaptive region requirement. Guard API availability and verify the older-iOS fallback; no hinge angle as layout logic. |

## EAS additions confirmed 22 October 2026

| ID | State | Decision and reason | Tradeoff or consequence |
| --- | --- | --- | --- |
| D22 | Owner confirmed | EAS Build is the primary binary service and EAS Update the OTA service. Setup is Phase 01; preview delivery/recovery verification is Phase 20. | Developer cloud tooling does not add an in-app login or savings backend. Local Xcode remains diagnostic. |
| D23 | Engineering baseline | appVersion runtime policy with explicit native/persisted-data compatibility gate; MVP OTA keeps schema/data meaning compatible. | Native or persistence boundary changes need a new app version/runtime/binary. More explicit releases in exchange for predictable financial-data rollback. |
| D24 | Engineering baseline | Development/preview/production profiles use isolated channels. Release-mode preview uses the production export environment for artifact promotion parity. | Preview and production are different audiences, not necessarily different export values; document native/signing differences and use dedicated test installations. |
| D25 | Engineering baseline | Nonblocking cached/embedded startup, next-normal-launch update activation and tested compatible rollback. | No forced reload in financial flows; rollback does not restore a database. Production rollout remains a separately instructed operator action. |

## Product alignment confirmed 23 October 2026

| ID | State | Decision and reason | Tradeoff or consequence |
| --- | --- | --- | --- |
| D26 | Current product authority | MVP plan v1.2 replaces conflicting v1.1/22 October feature rules. It supersedes D02/D03/D04/D11/D13/D14/D15 where affected; their old text is retained above solely as history. | Implement PRODUCT_REQUIREMENTS/DATA_MODEL and updated prompts, never the superseded rows. No app implementation starts in this alignment. |
| D27 | Product confirmed | One global Settings currency, locked while any transaction or collectible exists; no per-goal currency/FX. No future entries or negative chronological subtotal. No entry audit/version history or whole-goal deletion. | Concurrency revisions/receipts remain technical safeguards without previous-entry payloads. |
| D28 | Product confirmed | active+paused consume Free's one slot. Finish explicitly sets completed at >=100%; Reopen checks limit and sets active, never auto-finishes. Closed goals read-only; paused editable. | First saved >=100% independently awards a unique permanent souvenir including Free, immune to later edits/regression/theme changes. |
| D29 | Product confirmed | Free/Pro share three fixed challenges and one global Sunday 18:00 local weekly reminder while an active goal exists. Exact v1.2 attempts, eligible records, frozen target/week/timezone and historical nonreactivation apply. | No custom capability/form, challenge pause/editor/schedule/evidence-link workflow. Challenges derive records and never create a deposit. |
| D=30 | Product confirmed | Inclusive-day deadline formula, four exact Pro statistics and verified-loss behavior follow v1.2 sections 4/7. | 30-day all-goal daily balance includes archived and opening balance; completed count uses goal status. Confirmed Pro loss requires at most one open Free goal and archival of others before entries, with Island live/Garden souvenir retained. |

## Phase 01 setup decisions 23 October 2026

Evidence: [PHASE_01](evidence/PHASE_01.md). These record engineering choices made while executing Phase 01; no product rule changed.

| ID | State | Decision and reason | Tradeoff or consequence |
| --- | --- | --- | --- |
| D31 | Engineering baseline | Locked Expo SDK 58 (expo 58.0.17, React Native 0.88.0, React 19.3.0, Expo Router 58.0.25) from npm dist-tag `latest` on 23 October 2026; no SDK 59 stable existed. Scaffolded from expo-template-default@sdk-58 in a scratch sibling and copied only conflict-checked files. | Web/demo template packages (react-native-web, expo-web-browser, expo-image, expo-device, expo-font, expo-glass-effect, expo-symbols) were not carried over; react-dom stays because @expo/ui requires it as a peer. Add feature packages in their owning phases with `npx expo install`. |
| D32 | Owner selected | EAS project `@bosko123/saving-worlds` (ID 25d3089f-a32e-461f-baf2-7c95a396984e) under the owner's personal account bosko123; iOS bundle identifier `com.bosko123.savingworlds`. | The bundle ID is baked into native builds and later App Store/IAP setup; changing it later means a new store record. |
| D33 | Engineering baseline | Pin EAS CLI 25.3.0 through the `npm run eas` script (`npx --yes eas-cli@25.3.0`) and `cli.version` `>= 25.3.0` in eas.json, not as a devDependency. | expo-doctor rejects eas-cli as a project dependency. A future CLI change is a reviewed edit of the script and this entry. |
| D34 | Engineering baseline | Add a `development-simulator` EAS profile extending `development` with `ios.simulator: true`, as EAS_AND_OTA allows. Remote app versioning (`appVersionSource: remote`) manages build numbers; `version` in app.config.ts remains the runtime source. | Simulator dev builds need no Apple signing; a device dev build still requires the owner's Apple Developer credentials and device registration. |
| D35 | Engineering baseline | Navigation shape: root Stack (single Expo Router owner) containing the `(tabs)` NativeTabs group plus root-level native form sheets; each tab owns a native Stack. Group anchors use `unstable_settings.anchor` (the SDK 58 replacement for `initialRouteName`). | Forms present above the tab bar; details push inside the current tab. Phase 03 may refine presentation but keeps one route hierarchy. |
| D36 | Engineering baseline | Pin react-native-gesture-handler (~3.3.0) directly even though no app code uses it, because expo-router pulls it in transitively and Expo autolinks it; unpinned it resolved to 3.4.0, outside SDK 58's expected range. | One extra direct dependency in exchange for an SDK-compatible native module set. |

## Open register

Q01-Q06 are RESOLVED in [SOURCE_RECONCILIATION](SOURCE_RECONCILIATION.md). Q07 price/sale configuration and Q09 identity/art/native/store/EAS access remain release dependencies. Q08 future-theme rights are future-only and do not block v1. Preserve compatible D01/D05-D10/D12/D16-D25 engineering choices; verify actual SDK/native APIs during implementation.

Append future decisions with date, evidence, rationale, tradeoffs, migration/test impact and affected phases. Preserve superseded entries with explicit replacement references. Update requirements, prompts/roadmap and handoff together. Code behavior alone does not resolve a product decision.
