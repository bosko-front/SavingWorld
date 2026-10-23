# Phase 02 evidence: Palette design tokens and global native styling

Session date: 23 October 2026. Product authority: [MVP plan v1.2](../Saving_Worlds_MVP_Plan_v1_2.docx), read in full (text and tables) with `textutil -convert txt -stdout` before any change. Phase state at close: VERIFIED COMPLETE, with the noncritical limitations listed under [Limitations](#limitations). Applicable test IDs: T21 (palette/control contrast and large-text legibility), T18 (contrast and Dynamic Type part only; VoiceOver is not covered here).

## Starting state and dependency evidence

- Git `main` at `23ca7a6` (two commits: Phase 01 and its Duo record), clean working tree. PROJECT_STATUS still said "no commits"; that line was stale and is corrected.
- Phase 01 verified before changes: `npm run lint` PASS, `npm run typecheck` PASS, `npm test -- --runInBand` PASS (3 suites, 18 tests). Locked package set unchanged (expo 58.0.17, React Native 0.88.0, React 19.3.0, Expo Router 58.0.25). Dev build `bdbf2303` was installed on the iPhone SE (iOS 18.5), iPhone 17 (iOS 26.0) and Duo (iOS 27.1) simulators.
- Existing shell inspected: `src/app` routes, temporary `src/shared/ui/placeholder-screen.tsx` and `shell-link.tsx` using `PlatformColor`, `userInterfaceStyle: 'automatic'` left for Phase 02.
- No package was added, removed or upgraded. `package.json` and `package-lock.json` are unchanged.

## Files changed

| Path | Change |
| --- | --- |
| `src/shared/theme/palette.ts` | New. Raw palette (only file with color literals in `src`). |
| `src/shared/theme/tokens.ts` | New. Semantic `colors`, `spacing`, `radii`, `borders`, `elevation`, `typography` (with Dynamic Type ramps), `motion`, `layout`. |
| `src/shared/theme/navigation.ts`, `index.ts` | New. `stackScreenOptions`, `nativeTabsAppearance`; public theme API (palette not exported). |
| `src/shared/ui/app-text.tsx`, `button.tsx`, `text-field.tsx`, `card.tsx`, `amount-text.tsx`, `notice.tsx` | New shared primitives with exported state color tables. |
| `src/shared/ui/placeholder-screen.tsx` | Restyled with tokens and AppText. |
| `src/shared/ui/shell-link.tsx` | Removed; replaced by `Link asChild` + `Button`. |
| `src/app/_layout.tsx` | Dark-content status bar; root stack uses `stackScreenOptions`. |
| `src/app/(tabs)/_layout.tsx` | NativeTabs `tintColor` from tokens. |
| `src/app/(tabs)/(home|challenges|collection)/_layout.tsx` | Stacks spread `stackScreenOptions`; Home stack adds the guarded `dev-gallery` screen. |
| `src/app/(tabs)/(home)/index.tsx`, `settings.tsx`, `src/app/sample-form.tsx` | Use Button, Card and AppText; Settings shows the gallery entry only in `__DEV__`. |
| `src/app/(tabs)/(home)/dev-gallery.tsx`, `src/dev/component-gallery.tsx` | New development-only gallery route and module. |
| `app.config.ts` | `userInterfaceStyle: 'light'`; root `backgroundColor` and splash background from one `LAUNCH_BACKGROUND` constant equal to `palette.cream`. |
| `eslint.config.js` | Styling guardrails for `src/**`. |
| `tests/unit/contrast.test.ts`, `tests/integration/shared-controls.test.tsx` | New. |
| `tests/integration/navigation.test.tsx` | Gallery reachable in development; hidden and deep link redirected when `__DEV__` is false. |
| `docs/evidence/phase-02/*.png` | 14 simulator screenshots (downscaled). |
| Docs | DESIGN_SYSTEM, DECISIONS (D37-D39), ARCHITECTURE, CLAUDE.md, PROJECT_STATUS, SESSION_HANDOFF, this file. |

Mapping to the prompt's planned paths: `src/shared/theme/` and `src/shared/ui/` as planned; the gallery is `src/dev/component-gallery.tsx` behind route `src/app/(tabs)/(home)/dev-gallery.tsx`; shared-control tests are in `tests/integration/`, contrast in `tests/unit/`.

## Native build

| Item | Value |
| --- | --- |
| EAS build | `ab77dda9-8c1c-4a2e-92be-db22cbef9960`, profile `development-simulator`, FINISHED (created 09:24:06Z, completed 09:31:05Z) |
| Command | `EAS_NO_VCS=1 npm run eas -- build --platform ios --profile development-simulator --non-interactive --message "Phase 02: light appearance and launch background"` (EAS CLI 25.3.0, account bosko123) |
| App / runtime / SDK | 1.0.0 / 1.0.0 / 58.0.0; channel `development` |
| Why a rebuild | `userInterfaceStyle` and `backgroundColor` change Info.plist. Runtime 1.0.0 has not been shared (only development builds), so EAS_AND_OTA's rule that native changes need a new version does not apply yet; no version bump. |
| Artifact inspection | `Info.plist`: `UIUserInterfaceStyle = Light`, `RCTRootViewBackgroundColor = 4294374634` (0xFFF6F4EA), `CFBundleShortVersionString = 1.0.0`, bundle ID `com.bosko123.savingworlds`; `Expo.plist` runtime 1.0.0. `npx expo config --type introspect` showed the same before the build. |
| Installed on | SW iPhone SE 3 (iOS 18.5), iPhone 17 (iOS 26.0), iPhone 17 Pro Max CE4A7B1E (iOS 26.1), SW iPhone Duo (iOS 27.1) |

## Automated checks (final run after the last code edit)

| Check | Environment | Result | Detail |
| --- | --- | --- | --- |
| `npm run lint` | Node 22.16.0 | PASS | exit 0, 0 warnings |
| `npm run typecheck` | TypeScript 6.0.3 | PASS | exit 0 |
| `npm test -- --runInBand` | jest-expo/ios | PASS | 5 suites, 84 tests |
| `npm run deps:check` | expo install --check | PASS | Dependencies are up to date |
| `npm run doctor` | expo-doctor@latest | PASS | 20/20 checks |
| Lint guardrail probe | temporary `src/__lint_probe.tsx`, deleted afterwards | PASS | 7/7 rules fired: PlatformColor import, raw palette import, hex literal, rgba literal, `Dimensions.get`, `allowFontScaling={false}`, `maxFontSizeMultiplier` |
| Test sensitivity | Button temporarily changed to ignore `disabled`/`accessibilityState`, then restored | PASS | 3 tests failed as expected; 9/9 after restore |
| Release exclusion | `npx expo export --platform ios` (Hermes) and `--no-bytecode` (plain JS) into the session scratch directory | PASS | Gallery-only strings ("Tap to simulate saving", "Text roles", gallery long copy, "Component gallery (development only)") 0 matches in both bundles; shell strings ("Open sample form", Home description) 1 match each. The guarded route stub and its name `dev-gallery` remain, unreachable. |
| Source inspection | grep over `src` and `app.config.ts` | PASS | Only color literal outside `palette.ts` is `LAUNCH_BACKGROUND` in app.config.ts (asserted equal to `palette.cream`). No `allowFontScaling`, `maxFontSizeMultiplier`, `Dimensions.get`, `PixelRatio`, `scale(`, `PlatformColor`, `DynamicColorIOS` or `rgba(` usage. |

### Shared-control interactions (Jest, React Native Testing Library)

Button runs its action; disabled button reports disabled and ignores presses; loading button keeps its label, reports busy and disabled, ignores presses; a caller switching to loading prevents a second submission. TextField is found by its visible label and accepts typing; hint is its accessibility hint; an error replaces the hint, is exposed as "Error: …" on both the input hint and the message; disabled field is not editable. Error Notice is exposed with the `alert` role and full label. AmountText renders the formatted string unchanged. Gallery opens from Settings in development; with `__DEV__` false the entry is absent and navigating to `/dev-gallery` does not land there.

A Jest check of the pressed fill was attempted and removed: `fireEvent(…, 'pressIn')` does not reach Pressable's internal responder, so it could not test real behavior.

### Contrast (mathematical, separate from visual checks)

`tests/unit/contrast.test.ts`: formula matches WCAG reference values (21:1, 4.48:1, 1:1); 51 required pairs pass; decorative gold is not used in any required pair (1.95:1 on white); every semantic color comes from the palette; launch background equals `palette.cream`; config declares `light`. Full table in [DESIGN_SYSTEM](../DESIGN_SYSTEM.md#contrast-results). Lowest values: disabled label on disabled fill 4.72:1, borderControl on canvas 4.11:1 (3:1 target).

## Simulator review (Xcode 27.1, Metro dev server, development build)

Taps from the automation tool were intermittent (as in Phase 01); deep links (`savingworlds://dev-gallery`, `savingworlds://settings`) and swipes were used where taps did not register.

| Device / OS | OS appearance / text size | Build | Observed | Evidence |
| --- | --- | --- | --- | --- |
| iPhone SE 3rd gen, iOS 18.5 | Light / default (Large) | bdbf2303 (JS identical) | Home: cream canvas, forest text, secondary/plain buttons, green selected tab and header tint. Gallery: all button variants and disabled/loading states, fields with hint, error glyph + 2 pt outline, disabled field. Tapping a field shows the blue 2 pt focus outline without shifting text; typing works. | `se-ios18-home-default.png`, `se-ios18-gallery-buttons-default.png`, `se-ios18-gallery-fields-default.png`, `se-ios18-gallery-field-focus.png` |
| iPhone SE 3rd gen, iOS 18.5 | **Dark** / AX XXXL (×3.57) | ab77dda9 | Launch screen cream with dark status bar. Home, header and tab bar stay light; title, description and buttons wrap and grow, nothing clipped. Gallery title/description wrap. | `se-ios18-osdark-launch.png`, `se-ios18-osdark-ax3-home.png` |
| iPhone 17 Pro Max, iOS 26.1 | Light / default | ab77dda9 | Home, Settings (Card with diagnostics, gallery entry), gallery text roles, buttons, fields, amounts. iOS 26 glass tab bar and back button readable; tab selection tinted green. | `promax-ios26-home-default.png`, `promax-ios26-settings-default.png`, `promax-ios26-gallery-default.png`, `promax-ios26-gallery-fields-amounts-default.png` |
| iPhone 17 Pro Max, iOS 26.1 | **Dark** / AX XXXL (×3.57) | ab77dda9 | App, header and glass tab bar stay light; text roles, buttons (labels wrap to several lines), field labels, values and hints scale without clipping. | `promax-ios26-osdark-ax3-gallery-top.png`, `promax-ios26-osdark-ax3-buttons.png`, `promax-ios26-osdark-ax3-fields.png` |
| iPhone Duo, iOS 27.1 (no-regression look) | **Dark** / default | ab77dda9 | Home light with palette and light tab bar. Controls stretch across the open display; readable width/insets are Phase 03. | `duo-ios27-osdark-home.png` |

All simulators were returned to Light appearance and default text size afterwards.

Issue found and fixed during review: the gallery was first a root-stack route pushed over NativeTabs and its native back button read "(tabs)". `headerBackButtonDisplayMode`, a `(tabs)` title and `headerBackTitle` did not change the label; it was then found that Metro's route cache had not picked up later route edits. The gallery now lives in the Home stack next to Settings (back reads "Home", tabs stay visible), verified after restarting Metro with `--clear`. Lesson: restart Metro with `--clear` after moving route files.

## Decisions

D37 (single light launch appearance and final palette), D38 (ESLint styling guardrails and the test-guarded launch-color literal), D39 (development gallery in the Home stack behind `Stack.Protected` and an `if (__DEV__)` require). No product decision changed.

## Limitations

1. Pressed state was not captured on the simulator: the automation tool cannot hold a press and take a screenshot at the same time, and a background screenshot loop did not land on the button. Pressed colors are contrast-checked; owner can confirm by pressing and holding any gallery button. Not a release blocker.
2. Button keyboard-focus outline (Full Keyboard Access) was not exercised; TextField focus was verified. On iOS 26 the system's own focus ring also applies.
3. VoiceOver reading order and announcements were not run on a simulator (Jest checks the accessibility tree only). Required by later UI phases and Phase 19.
4. On iOS 26 the system draws the back button glass with its own label color, so `headerTintColor` shows only on iOS 18 (green chevron) and in the tab selection.
5. Splash image is still the Expo placeholder (white on cream reads poorly) until branding (Q09).
6. iOS 26 transparent headers let scrolled content pass under the title (system scroll-edge effect). Phase 03 owns screen/header inset policy.

## Follow-up: toast policy and UX library research

After the phase checks, the owner allowed toasts that follow UX best practice and asked for Expo UX library research. Documentation only; no package or code changed, so the checks above still apply.

| Source checked | Finding |
| --- | --- |
| `node_modules/expo/bundledNativeModules.json` (SDK 58) | expo-haptics ~58.0.7, expo-symbols ~58.0.4, expo-image ~58.0.16, react-native-keyboard-controller 1.22.7, react-native-svg 15.16.0, expo-notifications ~58.1.6, @react-native-community/datetimepicker 9.2.1 (not chosen; @expo/ui DatePicker instead) |
| `npm view` (23 Oct 2026) | sonner-native 0.27.0 (MIT, updated 2026-08-15; peers reanimated ^4.1.1, gesture-handler >=2.28, safe-area ^5.6, screens ^4.16, svg ^15.12.1, worklets >=0.6.1, all satisfied by the lock except svg); burnt 0.13.0, last updated 2025-03-10; expo-iap 6.1.1; react-native-keyboard-controller 1.22.8 |
| sonner-native 0.27.0 source (`npm pack`, scratch dir) | Uses Reanimated `useReducedMotion`; no `announceForAccessibility` or live-region handling, so the wrapper must announce; `toast.custom`, `unstyled`, `duration`, `position` support token-based rendering; icons use react-native-svg |
| Web: toast UX guidance (gov.sg design system, Coloplast, LogRocket, W3C WAI thread) and burnt README/npm | Toasts suit low-priority confirmations, a few seconds, screen-reader announced, never for errors or essential information, limit simultaneous toasts; keyboard-only access to toast actions is unresolved, so our toasts carry no actions. Burnt wraps SPIndicator/AlertKit and needs a dev build. |

Recorded as DESIGN_SYSTEM "Transient feedback (toasts)", "Haptics", "Icons" and "UX library plan", TECH_STACK ownership rows, DECISIONS D40-D43, and explicit tasks in the PHASE_06/07/08/10/11/13/17/19 prompts and roadmap entries.

## Result

Every Phase 02 acceptance criterion has evidence: token-driven shell and native tint/surface configuration with no copied hex values in feature UI; shared controls with consistent disabled/loading/error/accessibility behavior; long and large text readable on a small (SE) and a large (Pro Max) iPhone; contrast passes for all required pairs and decorative gold is never used for meaning; the gallery exists only in development builds; conventions and launch appearance are documented. Next prompt: [PHASE_03](../prompts/PHASE_03.md).
