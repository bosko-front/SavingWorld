# App Privacy answers (App Store Connect › App Privacy)

Checked 27 October 2026 against Apple's "App privacy details on the App Store" definitions and the shipped release candidate (device build 9a42b94e, the same native fingerprint c83b89a5… as the store build). The owner enters these answers; the App Store Connect API does not change them.

## What the build actually does (evidence)

| Source | Observed | Evidence |
| --- | --- | --- |
| App code | No network code in `src/`; goals, entries, notes, souvenirs, quests and settings stay in the local SQLite database | D137 review, `src/data/` |
| StoreKit (expo-iap / OpenIAP Apple) | Apple's own purchase flow; product and transaction details stay on the device. `verifyPurchaseWithProvider` (kit.openiap.dev) is never called | D115, D137 |
| Notifications | Local only (`enableRemoteNotifications: false`); no push token; no `aps-environment` entitlement | `app.config.ts`, RC entitlements |
| EAS Update (expo-updates) | Each launch may ask `u.expo.dev` for an update. Headers: user agent (app name/build, iOS network library and Darwin version), device language, runtime version, channel, platform, current/embedded update IDs, protocol values and `eas-client-id`, a random ID created at install and kept in UserDefaults. After a failed launch, one `Expo-Fatal-Error` message (≤ 1,024 characters, no savings data). The device IP reaches Expo | Phase 20 proxy capture (PHASE_20 evidence, "Update request metadata") |
| Privacy manifests in the archive | 16 manifests; none declares collected data or tracking; `NSPrivacyTracking` false everywhere; required-reason APIs: UserDefaults CA92.1, file timestamp C617.1/0A2A.1/3B52.1, system boot time 35F9.1, disk space E174.1/85F4.1 | PHASE_22 evidence, archive inspection |
| SDKs for analytics, crash reporting, ads, attribution | None | `package.json`, archive |

Expo keeps the `eas-client-id` beyond the single request (it counts the installs that received each update, which the owner sees on the EAS dashboard). That makes it "collected" under Apple's definition, and it is not optional for the user, so it must be disclosed. The same applies to the fatal-error message.

## Recommended answers

**Do you or your third-party partners collect data from this app?** Yes.

| Data type | Collected | Linked to the person | Used for tracking | Purposes |
| --- | --- | --- | --- | --- |
| Identifiers › Device ID | Yes (random per-install update ID sent to Expo) | No | No | App Functionality (delivering updates and staged rollouts); Analytics (Expo counts installs per update) |
| Diagnostics › Crash Data | Yes (one short error message after a failed launch, sent with the next update check) | No | No | App Functionality |

Every other data type: **not collected**. In particular:

- Financial Info, User Content, Contact Info, Location, Contacts, Browsing/Search History, Health, Sensitive Info: not collected. Savings records never leave the device.
- Purchases › Purchase History: not collected by the app. Apple processes purchases; Apple's own collection is not the developer's to disclose. The transaction IDs the app stores stay on the device.
- Usage Data › Product Interaction: not collected (no analytics events).
- Location: Apple's privacy definitions count only precise or coarse location the app or partners determine; nothing in the app derives a location from the IP address.

Tracking: **No**. No App Tracking Transparency prompt is needed.

Privacy Policy URL: https://bosko-front.github.io/SavingWorld/PRIVACY.html (live since D137).

## Open owner choice

- "Analytics" as a second purpose for the Device ID is the conservative reading (Expo's dashboard counts installs). If the owner reads the install counting as part of update delivery only, App Functionality alone is defensible. Both keep the label truthful. "Data Not Collected" is **not** recommended.
- PRIVACY.md now names the user agent and device language (Phase 22 wording, see the diff); it needs the owner's approval and a push to GitHub Pages before the App Privacy answers are published.
