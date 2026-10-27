# App Store materials for Saving Worlds 1.0.0 (Phase 22)

Drafts prepared on 27 October 2026 from the shipped release candidate. Nothing in this folder is in App Store Connect until the owner approves it and says go (Phase 22 owner answer: "after I review drafts"). Evidence: [PHASE_22](../docs/evidence/PHASE_22.md).

| File | What it is | State |
| --- | --- | --- |
| [listing.en-US.json](listing.en-US.json) | Name "Saving Worlds", subtitle, promotional text, description, keywords, categories, URLs, copyright | Draft, limits checked |
| [review-notes.txt](review-notes.txt) | App Review notes (no account, how to reach every paid screen, network use) | Draft, 2 KB of 4 KB |
| [age-rating.md](age-rating.md) | Answers to Apple's current age-rating questionnaire, expected 4+ | Draft |
| [app-privacy.md](app-privacy.md) | App Privacy answers with the evidence behind them (Device ID and Crash Data via EAS Update, not linked, no tracking) | Draft; one owner choice |
| [in-app-purchase.md](in-app-purchase.md) | Saving Worlds Pro product fields, price, review screenshot | Product exists; review screenshot missing in App Store Connect |
| [header/](header/) | Product page header (iOS 27 creative asset): `header-21x9.png` 3840 × 1646 and `header-16x9.png` 5244 × 2950, built by [scripts/compose_header.py](scripts/compose_header.py) from the approved stage 10 renders | Owner-approved 27 October 2026 (D146) |
| [screenshots/en-US/](screenshots/en-US/) | Five framed screenshots, 1206 × 2622 RGB without alpha ("iPhone with Dynamic Island, medium display", the required set), built by [scripts/frame_screenshots.py](scripts/frame_screenshots.py) from the unedited captures in `screenshots/raw/` with the owner's headlines ([shots.json](screenshots/shots.json)): 1 Home "Watch your savings come to life", 2 Add savings "Every little saving counts", 3 Challenges "Make saving a little adventure", 4 History "Keep track of every step", 5 Collection "Every goal becomes a world". Side-by-side check: [preview.png](screenshots/preview.png) (with a thumbnail strip) | Owner-approved 27 October 2026 (D146) |
| Optional 6th, Garden Pro "Unlock a whole new world" | Not made | Dropped by the owner (27 October 2026) |
| [screenshots/iap-review-paywall.png](screenshots/iap-review-paywall.png) | Unframed Pro screen with the store price ($7.99) and Restore Purchases, for App Review only | Ready to upload |

## How the screenshots were made

- Build: the release-candidate simulator build `5e207eba` (commit ce46419 JS, runtime 1.0.0, Release configuration, production export), installed on a throwaway iPhone 17 Pro simulator "SW P22 Store" (iOS 27.0, region en_US, status bar 9:41).
- Data: `tests/native/store-fixture.ts`, one Free goal "Summer trip" (no deadline) written only by the app's own commands (`STORE_FIXTURE_DIR=<dir> npx jest tests/integration/store-fixture.test.ts`, then `node scripts/ota-drill.mjs seed --device <udid> --db <dir>/saving-worlds.db --replace-test-data`). Every number on screen is what the app computed: $1,300.00 of $1,500.00, 86%, the cottage stage, Next milestone $85.00 of $135.00, five History entries (one withdrawal). Screens 1-4 were captured in that state.
- Collection: the same goal finished in the app itself: Add savings $200.00 through the real form (the first 100% awards the souvenir, "Your island is complete!"), then ⋯ › Finish goal. So the story stays one goal from 86% to its finished world, Free, with nothing seeded. `raw/spare-island-complete.png` is the completion moment, kept as a spare.
- Add savings: $50 typed into the amount field, keyboard lowered with the form's own interactive dismissal, then Cancel (nothing saved).
- Frames: `python3 store/scripts/frame_screenshots.py` (Pillow) scales each capture, rounds its corners and adds one caption on the icon's sky. Nothing inside a capture is painted over. Captions contain no price, URL or award (Apple asset rules); a `\n` in shots.json sets the line break.

The optional Garden screenshot was dropped by the owner. Any future Pro screenshot must come from a real sandbox/TestFlight purchase, never a seeded entitlement.

**In App Store Connect since 27 October 2026** (owner's go; details in PHASE_22 "App Store Connect entry"): version 1.0.0 with build 7, app info, categories, keywords, URLs, age rating 4+, the five screenshots (`APP_IPHONE_61`), the header (`PRODUCT_PAGE_HEADER_ASSET`) and the 16:9 file as search-results asset, the IAP review screenshot. The description and promotional text in App Store Connect are the owner's own wording (copied back into `listing.en-US.json`); never overwrite them from a draft. Still empty: App Review information (contact + notes) and App Privacy.

## Release states (keep them separate)

| State | Meaning | Now |
| --- | --- | --- |
| Release-ready | Every RELEASE_CHECKLIST item has evidence or an owner-accepted limitation; signed store build verified | No (see PHASE_22 "Blocking items") |
| Signed candidate prepared | Store-signed build of the release commit exists and was inspected | See PHASE_22 |
| Uploaded to TestFlight | Build processed in App Store Connect | Yes: 1.0.0 (7) VALID, internal testing |
| Submitted for review | Version 1.0.0 with the IAP submitted | Yes: by the owner, 27 October 2026 20:57 UTC (Waiting for Review; release automatically after approval) |
| Approved / Live | Apple approved; released on the store | No |

## Manual submission procedure (owner or a named operator)

Each step that changes App Store Connect or the store needs the owner's explicit go in that session.

1. **Approve the drafts** in this folder (listing, review notes, age rating, App Privacy; the header and five screenshots are already approved) and the PRIVACY.md wording change; push PRIVACY.md so GitHub Pages shows it.
2. **App Store Connect › App Information**: name "Saving Worlds", subtitle, category Finance (secondary Lifestyle), content rights, age rating answers ([age-rating.md](age-rating.md)), Privacy Policy URL.
3. **App Privacy**: enter [app-privacy.md](app-privacy.md) and publish.
4. **Pricing and Availability**: app Free; choose storefronts.
5. **Version**: rename the version from 1.0 to **1.0.0** (the binary's `CFBundleShortVersionString`; changing the app instead would change runtime 1.0.0). Enter description, keywords, promotional text, support URL, copyright; upload the five screenshots (and the Pro ones when captured) to "iPhone 6.3-inch (Dynamic Island, medium)"; optional: the header in Creative Assets.
6. **In-App Purchases**: open Saving Worlds Pro, upload `screenshots/iap-review-paywall.png` as the review screenshot (clears "Missing Metadata"), then add it to version 1.0.0's In-App Purchases section.
7. **Build**: choose the TestFlight build of 1.0.0 (build number in PHASE_22), export compliance is already answered in the binary (`ITSAppUsesNonExemptEncryption` false).
8. **App Review information**: contact name, phone (international format), email; paste [review-notes.txt](review-notes.txt); no sign-in needed.
9. **Release option**: manual release recommended (release when approved, by the owner).
10. **Submit for Review** (owner only). After approval: release manually; the state becomes Live only when the product page is public.

Production OTA updates are separate: see [EAS_AND_OTA "Production promotion"](../docs/EAS_AND_OTA.md) and the release record in PHASE_22. The first production build's embedded bundle is the baseline; no update is published with the launch.
