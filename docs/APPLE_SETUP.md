# Apple Developer and App Store Connect setup

Verified 26 October 2026, before Phase 15, through Apple's official App Store Connect API (team API key, Admin role) and the project files. This record holds public identifiers only. No credentials, private keys, passwords or tokens belong in this repository or in logs (DECISIONS D113).

## Verified identifiers

| Item | Value | Source and state |
| --- | --- | --- |
| Apple Developer Team ID | `86J9LHRPM3` | Owner; matches the bundle ID's seed ID in the API |
| Bundle ID (App ID) | `com.bosko123.savingworlds` | `app.config.ts` `ios.bundleIdentifier`; registered (resource `2WVF7Z5269`, name "SavingWorlds", platform universal). Kept by the owner (Q09 bundle part resolved) |
| App ID capability | In-App Purchase | Enabled on `2WVF7Z5269` |
| App Store Connect app | `6827062634` | Existing record, name "SavingWorlds", SKU `saving-worlds`, primary language English (U.S.). Not created again |
| App Store version | 1.0.0 | Waiting for Review (submitted by the owner 27 October 2026 with build 7 and the Pro IAP; release automatically after approval; Phase 22, D146) |
| Lifetime Pro product | `com.bosko123.savingworlds.pro.lifetime` | Created 26 October 2026: in-app purchase `6827087893`, **Non-Consumable**, reference name "Saving Worlds Pro (Lifetime)", Family Sharing off, review note on the Pro scope; price schedule set 26 October 2026 (D116): base territory United States at **US$7.99** (price point for 7.99, proceeds 5.60), 174 other storefronts by Apple's automatic equalization (e.g. 8.99 in Serbia, Bosnia and Herzegovina and Germany, 7.99 in the UK); state still **Missing Metadata** until the review screenshot (Phase 16) |
| Product localization (en-US) | "Saving Worlds Pro" / "Unlimited goals, Garden and Pro statistics" | Localization `f5507fbe-8765-48db-a16d-62f20d4b5dc3`, Prepare for Submission |
| EAS project | `@bosko123/saving-worlds` (`25d3089f-a32e-461f-baf2-7c95a396984e`) | `app.config.ts`; `eas.json` `submit.production.ios` holds `ascAppId` and `appleTeamId` only |
| Registered device | "Bosko's iPhone" (iPhone 14 Pro), enabled | For device development builds |
| Sandbox tester | One team tester (territory Serbia), created earlier for another app | Usable by every app of the team |
| Certificates | Apple Development (expires 18 July 2027); Apple Distribution "iPhone Distribution: Bosko Jaksic", serial 5C9E695B…, expires 26 October 2027 | Distribution certificate made by EAS on 26 October 2026 for the ad hoc device builds; reused for the Phase 22 App Store build |
| Provisioning profiles | Development and ad hoc (EAS); App Store "*[expo] com.bosko123.savingworlds AppStore 2026-10-27T17:22:36Z" (expires 26 October 2027) | Made by EAS (Phase 22 local store build, D146) |

## How it maps to the billing architecture

- One product only: `com.bosko123.savingworlds.pro.lifetime` grants `PRO_CAPABILITIES` (`src/core/access/capabilities.ts`): unlimited goals, Garden, open-goal Island/Garden switching and the four statistics (R18). Challenges and the reminder stay identical for Free.
- Non-consumable, no subscription, restorable (R18, R21); the per-theme capability keys stay addressable for later products, which are not created or promised (Q08).
- Phase 15's `entitlement_cache.product_id` (DATA_MODEL) stores this product ID; the PurchaseGateway queries it by this exact string (D10).
- Family Sharing is off. Turning it on later is possible in App Store Connect but cannot be undone; the "Family Sharing removed" loss path in the docs then applies.

## Access used and where secrets live

- The team API key file lives only at `~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8` on the owner's Mac (owner-only permissions), outside the repository; `.gitignore` also excludes `*.p8`/`*.p12`. Key ID and Issuer ID are not secret but are kept out of the repository; the next session gets them from the owner.
- EAS can use the same key for credentials without an Apple ID login, through shell environment variables set only for the command (`EXPO_ASC_API_KEY_PATH`, `EXPO_ASC_KEY_ID`, `EXPO_ASC_ISSUER_ID`, `EXPO_APPLE_TEAM_ID`). Never put them in `eas.json`, `app.config.ts` or a committed `.env`.
- No Apple ID password, two-factor code or private key content is ever needed in chat.

## What remains before Phase 15 (owner actions)

1. **Paid Applications agreement: done (owner, 26 October 2026; confirmed by the sandbox product load in Phase 15).** App Store Connect → Business. It must be active, with bank and tax information, before any purchase works, also in sandbox. The API cannot show or sign it.
2. **Price: done (D116).** US$7.99, final, set through the API on 26 October 2026 at the owner's instruction.
3. **Review screenshot**: required with the price before the product can be submitted with an app version; it needs the Phase 16 paywall, so it comes later.
4. **App name (Q09)**: the record is named "SavingWorlds"; the App Store name can change before the first submission. The store version string is 1.0 while `app.config.ts` says 1.0.0; align one of them before uploading a build.
5. **Sandbox tester (optional)**: a dedicated tester for Saving Worlds (Users and Access → Sandbox → Test Accounts) keeps purchase history separate from other apps. The existing team tester also works.
6. **Physical-device build**: the iPhone is registered. The first `development` profile build lets EAS create the development provisioning profile (Phase 15 or 19).

## What can be automated and what cannot

| Task | Automated with the team API key | Owner only |
| --- | --- | --- |
| Read bundle IDs, apps, versions, products, devices, testers, certificates | Yes (done) | |
| Register a bundle ID, edit capabilities | Yes (not needed: already registered) | |
| Create the app record | No: the API does not create apps | App Store Connect website (already exists) |
| Create/edit the in-app purchase and its localizations | Yes (done, after owner confirmation) | |
| Set or change the price, final sale copy | Technically yes | Owner decision (Q07); never set without explicit instruction |
| Paid Applications agreement, tax, banking | No | App Store Connect → Business |
| Create sandbox testers | No | App Store Connect → Users and Access → Sandbox |
| Distribution certificate, provisioning profiles | Through EAS during a build, with owner approval of that build | |
| Register a new device | `eas device:create` gives a link | Opening it on the iPhone |
| Submit for review, release, TestFlight upload | Never without explicit owner instruction | |
