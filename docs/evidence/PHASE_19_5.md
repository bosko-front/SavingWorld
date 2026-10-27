# Phase 19.5 evidence: app icon and launch screen

Session date: 27 October 2026. Phase state: **VERIFIED COMPLETE** (owner chose concept B and approved the final light, dark and tinted icons and the launch screen on the simulators, DECISIONS D139). Physical-iPhone look joins the Phase 21 release-candidate check (RELEASE_CHECKLIST).

Baseline: `main` at 6550911 (Phase 19 closed), clean working tree. Product authority: [MVP plan v1.2](../Saving_Worlds_MVP_Plan_v1_2.docx), read in full with `textutil` this session (section 11 lists the final visual identity as a pre-release decision; no product rule touched). Decision recorded: D139.

## Dependency verification

- Phase 19 is verified complete (D138). The app still shipped the Expo template `assets/images/icon.png` (1024 px with alpha) and `splash-icon.png` (228 × 213), referenced from `app.config.ts`.
- Island art approved (D76): the source `assets/worlds/island/source/island.blend` and the `swi` scripts are present; the icon reuses them read-only. The Garden was not used.
- Pinned SDK support, read from `node_modules/@expo/config-types` and `@expo/prebuild-config/build/plugins/icons/withIosIcons.js` (Expo 58.0.17): `ios.icon` accepts a path, an object `{ light, dark, tinted }` (iOS 18+), or one Icon Composer `.icon` folder as a string (not inside the object). `expo-splash-screen` takes `backgroundColor`, `image`, `imageWidth`, `resizeMode` and an optional `dark` entry.
- `DatabaseGate` (`src/bootstrap/database-gate.tsx`) keeps the native splash with `preventAutoHideAsync` and calls `hideAsync` only when the database is ready or failed. Unchanged.

## Concepts and the owner's choice

Rendered by `assets/branding/scripts/render_icon.py` from the Island scene (stage, square orthographic camera on the frozen 57°/0°/45° view and lights, storybook pass; the `.blend` is never saved), composed by `icon_compose.py`, review quality 1024 px / 128 samples, in `assets/branding/renders/concepts/`:

| Concept | What it shows |
| --- | --- |
| A `finished_island` | The completed Island floating on its sky (stage 10, side islets hidden) |
| B `cottage_closeup` | Close crop of the cottage, the big tree and the stream (stage 10) |
| C `first_tree` | The Island with its first tree (stage 1) |

`assets/branding/review/icon_concepts_sheet.png` (made by `review_sheet.py`, @3x) shows each concept at 60, 40 and 29 pt on a light, a dark and a tinted home screen between plain stand-in tiles (no trademarks). Observed: A and C read as a floating island at 29 pt but their detail turns to texture; B keeps one clear shape (roof, crown, stream).

**Owner choice (27 October 2026): B, cottage close-up, with the night-blue dark sky.**

## Final art

| File | Source | Check |
| --- | --- | --- |
| `assets/images/icon-light.png` | `renders/final/cottage_closeup_light.png` (2048 px, 256 samples, scaled to 1024) on the day sky `#9FD2EA` → `#FBF0DC` | 1024 × 1024, RGB, no alpha, sRGB |
| `assets/images/icon-dark.png` | same art at 90% on the night sky `#0E1B2E` → `#2C4363` | 1024 × 1024, RGB, no alpha, sRGB |
| `assets/images/icon-tinted.png` | the art's brightness in grayscale on black (levels 0.10-0.95, gamma 1.1) | 1024 × 1024, RGB, no alpha, sRGB |
| `assets/images/splash-mark.png` | `renders/final/cottage_mark_mark.png`: only the cottage and the big tree, cut out, 4% margin | 600 × 600 RGBA (shown at 120 pt; @3x needs 360) |

`sips -g pixelWidth -g pixelHeight -g hasAlpha -g profile assets/images/*.png`: icons 1024/1024/`hasAlpha: no`/`sRGB IEC61966-2.1`; mark 600/600/`hasAlpha: yes`/sRGB. Render times on the M4 with five simulators booted: icon 1020 s, mark 299 s. The template `icon.png` and `splash-icon.png` are deleted (`git rm`).

Variant choice (D139): the PNG set `{ light, dark, tinted }`, not an Icon Composer `.icon`. The SDK supports both, but not together; the PNG set comes from the same scripted source for iOS 16.4-27, and the painted illustration is not a set of flat layers that Liquid Glass is designed for. iOS 26/27 show the PNG icon with the system's glass edge (screenshots 06, 09).

## Configuration

- `app.config.ts`: `APP_ICONS = { light, dark, tinted }`; top-level `icon: APP_ICONS.light`; `ios.icon: APP_ICONS`; `expo-splash-screen` `{ backgroundColor: LAUNCH_BACKGROUND, image: './assets/images/splash-mark.png', imageWidth: 120, resizeMode: 'contain' }`. One light entry (D37 forces light); no animation.
- `.easignore`: `assets/branding/` (build tooling; the app reads only `assets/images/`).
- No dependency, runtime or JavaScript change. The native change needs a new build (done) and, after runtime 1.0.0 is shared, a new app version for any later icon change.

## Throwaway prebuild (asset catalog)

Copy of the project (without `.git`, `.claude`, `ios`, `android`, `docs`) in the session scratchpad; `CI=1 npx expo prebuild --platform ios --no-install`: Finished prebuild.

- `Images.xcassets/AppIcon.appiconset/Contents.json`: three 1024 universal entries: `App-Icon-1024x1024@1x.png` (any), `App-Icon-dark-1024x1024@1x.png` (luminosity dark), `App-Icon-tinted-1024x1024@1x.png` (luminosity tinted).
- Generated files: any and tinted `hasAlpha: no`; dark `hasAlpha: yes`, because Expo keeps the dark variant's channel on purpose (`removeTransparency: appearance !== 'dark'` in `withIosIcons.js`). Every pixel is opaque (Blender numpy: minimum alpha 1.0).
- `SplashScreenLogo.imageset`: `image.png` 120, `@2x` 240, `@3x` 360 px. `SplashScreenBackground.colorset`: sRGB 0.9647/0.9569/0.9176 = `#F6F4EA`. `SplashScreen.storyboard`: 120 × 120 `scaleAspectFit`, centered. `Info.plist`: `UILaunchStoryboardName` SplashScreen, `UIUserInterfaceStyle` Light. Deployment target 16.4.
- `xcrun actool Images.xcassets --compile … --platform iphoneos --minimum-deployment-target 16.4 --app-icon AppIcon --target-device iphone`: no warnings or errors; produced `Assets.car`, `AppIcon60x60@2x.png`, `AppIcon76x76@2x~ipad.png`.
- The throwaway copy is not in the repository; `ios/` was never created in the project.

## EAS development build

| Field | Value |
| --- | --- |
| Command | `npm run eas -- build --platform ios --profile development-simulator --non-interactive --no-wait --message "Phase 19.5: app icon and launch screen"` (EAS CLI 25.3.0) |
| Build | **0799fb03-84c4-4b0e-91fa-e9d05a19def8**, finished 27 October 2026 11:02 |
| App version / build / runtime | 1.0.0 / 1 / 1.0.0 (appVersion policy), channel development, SDK 58.0.0 |
| Fingerprint | 935de421f2ebc2211f966ce6211adeed900b016b |
| Source | uncommitted working tree on 6550911 (archive 577 MB, uploaded before `assets/branding/` joined `.easignore`) |
| Artifact | `CFBundleIcons` → `AppIcon`; `xcrun assetutil --info Assets.car`: AppIcon renditions for `UIAppearanceAny`, `UIAppearanceDark`, `ISAppearanceTintable`; `SplashScreenLogo` (3 scales) and `SplashScreenBackground` |

Installed with `xcrun simctl install` over the existing app (test data kept) on: SW iPhone SE 3 iOS 18.5 (66F6F9E8), iPhone 17 Pro Max iOS 26.0 (D4BA6D4D), SW iPhone Duo iOS 27.1 (E273F5F5). Metro from the project was running for the dev client.

## Simulator results (`docs/evidence/phase-19-5/`)

| Check | Result | Files |
| --- | --- | --- |
| Cold launch SE iOS 18.5 | PASS: cream `#F6F4EA` from the first frame, the cottage mark centered, held while the database opens, then Home with its data; no other color between | 01, 02 |
| Cold launch 17 Pro Max iOS 26.0 | PASS: cream + mark, the dev client's launcher panel shows faintly over it for a moment (development builds only), then Home | 04, 05 |
| Cold launch Duo iOS 27.1 | PASS on the recorded sequence (8 frames cream + mark, then Home; captured with `simctl io --display=1`, the default display is black on the Duo). In one earlier launch a plain white frame with the dev client's Tools button appeared before Home; it did not recur and is attributed to the development client; re-check in the Phase 20 release-mode build | 07, 08 |
| Home screen light | PASS on all three (iOS 18.5, 26.0, 27.1 with the system glass edge) | 03, 06, 09 |
| Home screen dark (Customize → Dark) | PASS on the 17 Pro Max iOS 26.0: the night-sky variant | 10 |
| Home screen tinted (Customize → Tinted) | PASS on the 17 Pro Max: cottage, crown and stream read in one color | 11 |
| Spotlight | PASS: Top Hit "Saving Worlds" with the icon (tinted mode; cropped to the top hit) | 12 |
| App switcher | PASS: "Saving Worlds" title with the icon above the card | 13 |
| Settings › Apps | PASS: the icon at list size next to "Saving Worlds" | 14 |

Not covered on the simulators: dark/tinted on the SE iOS 18.5 (its Customize sheet froze and never drew the options); Spotlight, Settings and the app switcher in the light style (taken in tinted mode). The iOS 26.0 simulator was left in the Tinted home-screen style. The 29 pt light look is in the concept sheet and screenshot 14.

## Checks

| Command | Result |
| --- | --- |
| `npm run lint` | PASS (`--max-warnings 0`) |
| `npm run typecheck` | PASS |
| `npm test -- --runInBand` | PASS: 56 suites, 1577 passed, 1 env-gated skip |
| `npx jest tests/unit/delivery-config.test.ts tests/unit/contrast.test.ts` (after the final art was copied) | PASS: 138 tests, incl. the new icon file checks (config paths, template files gone, 1024 × 1024, color type RGB, no `tRNS`, sRGB tag, mark RGBA ≥ @3x) and the launch color guard |
| `npm run deps:check`, `npm run doctor` | NOT RUN: no dependency or SDK change |
| `test:db` | NOT RUN: no persistence change |

## Files changed

- Added: `assets/branding/README.md`, `assets/branding/scripts/render_icon.py`, `icon_compose.py`, `review_sheet.py`, `assets/branding/renders/concepts/*` (art + light/dark/tinted for A, B, C), `assets/branding/renders/final/*` (B art and icons, mark art and mark), `assets/branding/review/icon_concepts_sheet.png`, `assets/images/icon-light.png`, `icon-dark.png`, `icon-tinted.png`, `splash-mark.png`, `docs/evidence/PHASE_19_5.md`, `docs/evidence/phase-19-5/01-14`.
- Deleted: `assets/images/icon.png`, `assets/images/splash-icon.png` (Expo template).
- Changed: `app.config.ts`, `.easignore`, `tests/unit/delivery-config.test.ts`, `docs/DECISIONS.md` (D139), `docs/DESIGN_SYSTEM.md` (Icons), `docs/RELEASE_CHECKLIST.md`, `docs/PROJECT_STATUS.md`, `docs/SESSION_HANDOFF.md`, `CLAUDE.md` (fact line).
- Not changed: app source under `src/`, the Island and Garden sources and exports, migrations, dependencies.

## Unresolved limitations

- Physical-iPhone look of the icon (home screen light/dark/tinted, Spotlight, Settings, app switcher) and the cold launch: Phase 21 release candidate.
- The Duo's single white launch frame in the development client: confirm absent in the Phase 20 release-mode preview build.
- No Icon Composer `.icon` version; iOS 26+ applies its own glass edge to the PNG icon. Adding one later is a separate reviewed native change (new app version once runtime 1.0.0 is shared).

## Follow-up the same day: sky launch color and local Xcode builds (D140)

- The owner's local Xcode build still showed the placeholder icon: the project's `ios/` folder was generated on 26 October (one AppIcon entry, the Expo image). `npx expo prebuild --platform ios --clean` regenerated it; its `pod install` failed on CocoaPods 1.16.2 / Ruby 3.4 with `Unicode Normalization not appropriate for ASCII-8BIT` and passed when rerun with `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install`. New `ios/`: AppIcon any/dark/tinted, `SplashScreenBackground` 0.8118/0.9020/0.9333 = `#CFE6EE`, splash logo 120/240/360 px, StoreKit scheme kept.
- Launch background changed to `palette.skyTop` `#CFE6EE` at the owner's choice; root view stays cream. Commit 48be676 had picked up an unrelated local edit of the launch color (`#2d96cb`) made during the session; it is replaced by this change. A committed `__pycache__` file is removed and `__pycache__/` ignored.
- Checks: `delivery-config` + `contrast` 138/138, lint and typecheck PASS. The sky launch screen and the icon from the regenerated `ios/` are checked by the owner in his own Xcode build (not run in this session).
