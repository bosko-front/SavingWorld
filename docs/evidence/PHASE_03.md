# Phase 03 evidence: Global adaptive layout and iPhone Duo foundation

Session date: 23 October 2026. Product authority: [MVP plan v1.2](../Saving_Worlds_MVP_Plan_v1_2.docx), read in full (text and tables) with `textutil` before any change. Phase state at close: **VERIFIED COMPLETE** after the continuation (inner split view moved to the physical-Duo release gate by owner decision D48, see [Result](#result)). Applicable test IDs: T22 (ordinary iPhone/Duo/fallback layout), T23 (resize/fold/rotation state preservation), T18 (large text, partial), T21 (no regression of shared controls).

## Starting state and dependency evidence

- Working tree: `main` at `d7dd23c` (Phase 02), clean. No Phase 03 files existed.
- Phase 01/02 dependencies re-verified before changes: `npm run lint` PASS, `npm run typecheck` PASS, `npm test -- --runInBand` PASS (5 suites, 84 tests). Native Stack/NativeTabs shell, `@expo/ui` 58.0.22, `react-native-safe-area-context` 5.10.1 and the Phase 02 tokens/primitives (`src/shared/theme/`, `src/shared/ui/`) present as documented.
- Installed development build `ab77dda9-8c1c-4a2e-92be-db22cbef9960` (Phase 02, development-simulator, runtime 1.0.0). Its EAS log shows image `macos-tahoe-26.6-xcode-27.1` (Xcode 27.1), so `@expo/ui`'s `ArrangementViewView.swift` compiled the real `ArrangementView` branch (`#if canImport(SwiftUICore, _version: 8.0.85)`); an older-SDK build would compile only its uncontained `Children()` fallback. No native dependency or config changed in this phase, so no rebuild was needed; all native checks below ran on this build through Metro (`npx expo start --dev-client --clear`).
- Locked API verification (`node_modules/@expo/ui` 58.0.22): `ArrangementView` with `ArrangementView.Primary/Secondary` slots and `arrangementViewStyle('automatic'|'split'|'overlay')`; native view renders children "without a container" below iOS 27.1. `RNHostView` hosts exactly one `ReactElement`, `matchContents` default `false` (takes the SwiftUI parent size), fixed on mount. `Host` supports `ignoreSafeArea: 'all'|'container'|'keyboard'`. `react-native-safe-area-context` native `SafeAreaView` supports per-edge modes `off|additive|maximum` (`maximum` = max(inset, style padding), confirmed in `ios/RNCSafeAreaShadowView.m`).

## Toolchain and devices

| Item | Value |
| --- | --- |
| Xcode / macOS | Xcode 27.1 (27A9275); macOS 27.0.1 |
| Node / Expo | Node 22.16.0; Expo SDK 58 (expo 58.0.17), RN 0.88.0 |
| SW iPhone Duo iOS 27.1 | E273F5F5-A352-4903-8891-1457DE5E96DC. Displays (simctl io enumerate): outer 1398×2034 px (466×678 pt), inner 2007×2853 px (669×951 pt). The inner display was active throughout. |
| SW iPhone SE 3 iOS 18.5 | 66F6F9E8-A5F1-499F-BBA7-1D61CA7AC729 (oldest supported OS here; fallback path) |
| iPhone 17 Pro Max iOS 26.1 | CE4A7B1E-A08C-426E-8C0B-B6C71ECE687C (fallback path) |
| iPhone 17 iOS 26.0 | CE4A4384-B4C1-42B6-83B7-A752D80B8358 (lab opened once; log line only) |
| Ordinary iPhone on iOS 27.1 | Not available: `simctl create … iPhone-17 … iOS-27-1` → "Incompatible device". The 27.1 runtime supports only iPhone Duo, so every ordinary iPhone here runs iOS ≤ 27.0 and takes the fallback. |

Tooling limits found: Device Hub fold/rotation/split controls are not scriptable here (`osascript is not allowed assistive access`; no posture/rotation subcommand in `simctl`, `xcdevice` or `devicectl`). The simulator tap tool is intermittent on the Duo and on non-attached simulators; text injection lands only once a field is focused. A development-only `?focus=draft` lab link was added so keyboard checks do not depend on taps.

## Implementation

| Planned path | Actual module |
| --- | --- |
| `src/shared/layout/` Screen, FormScreen, ContentColumn, metrics | `screen.tsx` (Screen, FormScreen, internal ScrollingScreen), `content-column.tsx`, `metrics.ts` (inset ownership, `safeAreaEdges`, `sharedPadding`, `readableColumnWidth`, `fitAspect`, `stackedSceneHeight`), `use-measured-size.ts`, `index.ts` |
| `src/shared/layout/` AdaptiveGoalLayout and adapter | `adaptive-goal-layout.tsx` (contract + explicit stacked fallback), `arrangement-adapter.tsx` (only importer of `ArrangementView`/`RNHostView`; `isArrangementViewSupported`, `arrangementViewAvailable()`, `NativeArrangement`) |
| `src/app/` shell adoption | Home, Details, Settings, Challenges, Collection use `Screen`; gallery uses `FormScreen`; `PlaceholderScreen` deleted |
| dev/test-only samples | `src/dev/layout-lab.tsx` (route `/dev-layout`), `src/dev/sample-form-sheet.tsx` (route `/sample-form`, now dev-only), `src/dev/mount-count.ts` |
| `tests/integration/` | `tests/integration/adaptive-layout.test.tsx`; `tests/unit/layout-metrics.test.ts`; `tests/integration/navigation.test.tsx` extended |

Behavior:

- **Inset ownership.** Vertically scrolling screens: the native scroll view (`contentInsetAdjustmentBehavior="automatic"`) owns top/bottom (header, tab bar, home indicator); a native `SafeAreaView` inside the scroll content owns left/right with `maximum` mode, padding each side by max(its own measured overlap, 16 pt gutter). This is the fix for the Phase 01 finding (text under the Duo side-controls column), because a vertical `UIScrollView` never adjusts horizontal insets. No hook-derived window insets are added as padding, so a region away from the window edge gets no inset and nothing is applied twice.
- **Readable width.** `ContentColumn` fills narrow windows and stops at `layout.readableMaxWidth` (680) or `layout.formMaxWidth` (560), centered. No breakpoints, device names, `Dimensions.get` or scale function.
- **Keyboard.** `FormScreen` uses React Native's built-in iOS `automaticallyAdjustKeyboardInsets`, `keyboardShouldPersistTaps="handled"` and `keyboardDismissMode="interactive"`. Native checks showed the focused field scrolled above the keyboard and the Save-position button scroll-reachable, so `react-native-keyboard-controller` was not installed (DECISIONS D46).
- **AdaptiveGoalLayout.** Props `scene`, `controls`, `sceneAspectRatio` (plus a tests/lab-only `arrangement` override). iOS ≥ 27.1: `Host` (flex 1, `ignoreSafeArea="keyboard"`) → `ArrangementView` with `arrangementViewStyle('automatic')` → one `RNHostView` per slot → one React Native `View` per region; the controls region scrolls with FormScreen keyboard behavior. Older iOS: one scrolling column, scene first at column width and 4:3-style aspect, capped at 45% of the visible height, controls below. The branch is fixed per process (OS version), so geometry changes never switch it or remount regions. The route owns selection and drafts above the layout.
- **Guardrails.** ESLint now blocks `useWindowDimensions` outside `src/shared/layout/**` and `src/dev/**`, and `ArrangementView`/`RNHostView` imports outside the layout layer (existing color, font-scaling and `Dimensions.get` rules unchanged).
- **Dev samples.** Layout lab: sample scene (decorative background fills the region, 4:3 box fitted with `fitAspect`), three sample goals, a draft field, a "Pretend save" counter, links to the sample sheet and a detail push, an ephemeral measurement card (arrangement mode, window, safe area, controls column, mount counts) and one `[layout-lab]` Metro log line per layout change. Sample form sheet: native `formSheet` (50%/100% detents) with two draft fields on `FormScreen`, a press counter and a mount count. Both are `Stack.Protected guard={__DEV__}` routes whose modules are required only inside `if (__DEV__)`. `TextField` gained an optional `inputRef`.
- No financial calculation, persistence or mutation exists or depends on size or pose.

## Verification

| Check | Environment | Result | Evidence / remaining action |
| --- | --- | --- | --- |
| Baseline lint/typecheck/tests before changes | Node 22.16.0 | PASS (84 tests) | Phase 02 state confirmed |
| `npm run lint` (final) | | PASS, exit 0 | |
| `npm run typecheck` (final) | TS 6.0.3 | PASS, exit 0. Initially FAIL on stale typed routes for `/dev-layout`; regenerated by starting Metro | |
| `npm test -- --runInBand` (final) | jest-expo/ios | PASS: 7 suites, 114 tests | New: 17 layout-policy unit tests (asymmetric left/right insets incl. mirrored side column, no double top/bottom, readable bounds, aspect fit, short-window cap, ArrangementView version guard 18.5/26.x/27.0 false, 27.1/27.10/28 true, non-iOS false); 10 layout integration tests (Screen/FormScreen props, fallback column sizing 270→135 pt in a short window, native tree has exactly one hosted element per region with `matchContents` false and keyboard-ignoring Host, draft/selection/press count/mount count unchanged through six window sizes incl. font ×3.1 in both arrangements, sample sheet draft through detent-like resizes); navigation: lab reachable, draft/selection survive a pushed detail, a tab switch and the sheet; release (`__DEV__` false) hides and redirects `/dev-layout` and `/sample-form` |
| `npm run deps:check` | SDK 58 | PASS "Dependencies are up to date" | No package changes |
| `npm run doctor` (expo-doctor) | | PASS 20/20 | |
| Release export `npx expo export --platform ios` | Hermes bundle | PASS | Strings `Pretend save`, `layout-lab`, `Sample draft`, `Native form sheet`, `Text roles` absent; only guarded route titles `Layout lab`/`Component gallery` remain (stub pattern, D39). ArrangementView adapter present (production code). |
| Duo inner portrait, native arrangement | Duo 27.1, build ab77dda9 | PASS | Mode "Native ArrangementView"; window 669×951, insets 82/0/83/0; system chose a vertical split: scene region 669×393 below the native header, scene 524×393 (4:3); controls column 637 pt (16 pt gutters), scrolls independently, clipped at its region, last action clears the tab bar. Screenshots `phase-03/duo-271-inner-native-arrangement.png`, `duo-271-inner-measurements.png` |
| Duo keyboard, native arrangement | Duo 27.1 | PASS | Focused draft field sits above the software keyboard inside the controls region; typed text "Duo" kept. `phase-03/duo-271-keyboard-draft.png` |
| Duo native form sheet | Duo 27.1 | PASS | Presents at 50% detent with grabber over the lab; form content limited to the 560 pt form column; at the largest accessibility size text wraps and scrolls. `duo-271-form-sheet.png`, `duo-271-form-sheet-ax3xl.png` |
| Duo shell screen (Settings) | Duo 27.1 | PASS | `Screen` with native large title, bottom NativeTabs, gutters; dev entries present |
| Duo inner landscape rotation | Duo 27.1 | PARTIAL (log only) | During the capture window a rotation to 951×669 occurred in Device Hub. `[layout-lab]` log: insets 0/84/34/0 (84 pt right inset = side-controls column), system switched to side-by-side: scene region 434×553 → scene 434×325, controls column 334 pt; back to portrait 669×951 with mounts 1/1 (no remount). The periodic screenshots from that window were deleted before review, so there is no visual record; repeat with screenshots. |
| Duo outer display (folded), side-controls column | Duo 27.1 | **NOT RUN** | Needs Device Hub fold; verifies the Phase 01 right-column overlap fix visually on every shell screen |
| Duo partial fold / tabletop | Duo 27.1 | **NOT RUN** | Unknown whether Device Hub offers it; record what it offers |
| Duo inner split view, app left and right, divider drag | Duo 27.1 | **NOT RUN** | Needs Device Hub multitasking |
| Resize/fold/rotation while typing, sheet re-presentation during rotation/fold | Duo 27.1 | **NOT RUN** natively | Covered in Jest only (no remount, no submission) |
| Older iOS fallback | SE iOS 18.5 | PASS | Mode "Fallback composition"; scene 343×257 (4:3) above controls; insets 20/0/49/0; controls 343 pt. `se-185-fallback.png` |
| Fallback keyboard | SE iOS 18.5 | PASS | `?focus=draft` focuses the field; iOS scrolls it above the keyboard; "Pretend save" and the next actions scroll into view with the keyboard up; Pretend saves 0. `se-185-keyboard-reachable.png` |
| Largest text, live change with draft | SE iOS 18.5 | PASS | `simctl ui … content_size accessibility-extra-extra-extra-large` while typing: text and buttons grow and wrap, keyboard stays up, draft "…4711 kept" and focus retained. `se-185-ax3xl-draft-kept.png` |
| Fallback on a large phone | iPhone 17 Pro Max iOS 26.1 | PASS | Scene 408×306, controls 408 pt, iOS 26 glass header/tab bar. `pro-max-261-fallback.png` |
| Ordinary iPhone rotation (landscape side insets) | | **NOT RUN** | No rotation automation; needs Device Hub |
| Popover sizing | | NOT APPLICABLE yet | The app has no popover; first popover phase checks anchoring |
| VoiceOver | | NOT RUN | Later UI phases / Phase 19 |
| Physical iPhone Duo | | **NOT RUN** | Release/device gate (owner device + Apple credentials) |

Remount observations: lab log lines on SE/Duo/Pro Max showed controls mounts 2-3 with the lab at 1 and the draft intact. These coincide with Fast Refresh after this session's edits added hooks to `SampleControls` (React Fast Refresh remounts a component whose hook signature changed). They show the draft held above the layout surviving a region remount; they are not a layout-driven remount. After a clean relaunch, Duo rotation logged mounts 1/1.

## Files changed

Added: `src/shared/layout/{index.ts,metrics.ts,content-column.tsx,screen.tsx,use-measured-size.ts,arrangement-adapter.tsx,adaptive-goal-layout.tsx}`, `src/dev/{layout-lab.tsx,sample-form-sheet.tsx,mount-count.ts}`, `src/app/(tabs)/(home)/dev-layout.tsx`, `tests/unit/layout-metrics.test.ts`, `tests/integration/adaptive-layout.test.tsx`, `docs/evidence/phase-03/*.png` (9 downscaled screenshots), this file.

Modified: `src/app/_layout.tsx` (sample-form guarded), `src/app/sample-form.tsx` (dev-only stub), `src/app/(tabs)/(home)/{_layout,index,details,settings}.tsx`, `src/app/(tabs)/(challenges)/challenges.tsx`, `src/app/(tabs)/(collection)/collection.tsx`, `src/dev/component-gallery.tsx`, `src/shared/ui/text-field.tsx` (`inputRef`), `eslint.config.js`, `tests/integration/navigation.test.tsx`. Deleted: `src/shared/ui/placeholder-screen.tsx`.

Docs: ADAPTIVE_LAYOUT (implementation and adoption contract), DESIGN_SYSTEM, ARCHITECTURE, TECH_STACK, DECISIONS (D44-D46), CLAUDE.md, PROJECT_STATUS, SESSION_HANDOFF. No package, native config, app.config.ts or EAS change; no build, update or store action.

## Continuation: native Duo pose checks (same day, later session)

The owner granted macOS Accessibility to the Claude Code process (`~/Library/Application Support/Claude/claude-code/2.1.308/…/claude.app`; Accessibility for `/Applications/Claude.app` alone was not enough because commands run under that helper). With it, small development tools in the session scratch directory (not in the repository) drove Device Hub through the macOS Accessibility API: its **Rotate Left/Right** button, the **Closed / Partially Open / Open** pose buttons (shown after "Enter resize mode"), and the in-app buttons/text fields that Device Hub exposes. Setting the hinge slider's AX value did not reliably change the pose (one fold worked, unfolding did not); the owner dragged the slider open once and the pose buttons were used afterwards. Same build ab77dda9 through Metro; no native change. Text injection still lands only partly (first characters), so some drafts are short; what counts is that the text stays.

### Defects found and fixed

1. **Double horizontal inset inside the native arrangement.** Folded Duo, portrait (466×678, side-controls column 84 pt on the right): the controls column was 282 pt instead of 350 pt, because the SwiftUI host had already kept the region clear of the column and the hosted `SafeAreaView` added the 84 pt again (`duo-closed-portrait-before-inset-fix.png`). Fix: a `container` inset owner; hosted regions use `contentInsetAdjustmentBehavior="never"` and no SafeAreaView edges, keeping only the gutter. After: controls 350 pt = 382 − 2×16 (`duo-closed-portrait-native-split.png`).
2. **Controls unreachable when the system collapses the arrangement.** Folded Duo, landscape (678×466): ArrangementView gave the scene region the whole container (594×350 for both slots) and the controls were not visible or scrollable (`duo-closed-landscape-collapsed-before-fix.png`). `arrangementViewStyle('split'|'overlay', { axes: 'both' })`, `splitArrangementLayoutRatio` and `splitArrangementLayoutSize` limits were tried after clean relaunches and changed nothing in this pose. Fix: `AdaptiveGoalLayout` compares the host's SwiftUI content size (`Host onLayoutContent`) with the scene region; when the scene covers the whole container it renders the stacked composition for that window size, and any window change (rotate, unfold) retries the native arrangement. After: scene 280×210 above, every control scrollable below, clear of the side column on either edge (`duo-closed-landscape-stacked-fallback.png`, `duo-closed-landscape-left-column.png`). Tradeoff: the switch rebuilds the two regions (controls mount count rises, keyboard focus is lost); drafts and selection are owned above the layout and survive.

Experiments that were reverted: split limits via `Group` modifiers and explicit split/overlay styles (no effect in the failing pose). Fast Refresh while changing the native adapter left stale native trees once (blank screen); every result below comes from a clean relaunch after the last code change.

### Pose matrix (Duo iOS 27.1, after both fixes)

| Pose | Window / insets (t/r/b/l) | Arrangement and regions | State | Evidence |
| --- | --- | --- | --- | --- |
| Closed, portrait (outer display) | 466×678; 0/84/34/0 | Native vertical split: scene 382×281 (375×281 at 4:3), controls 350 pt; side column right, nothing under it | draft kept, saves 0 | `duo-closed-portrait-native-split.png` |
| Closed, landscape, column right | 678×466; 0/84/34/0 | Collapsed by system → stacked fallback: scene 280×210, controls scroll, text clear of column | draft kept, saves 0 | `duo-closed-landscape-stacked-fallback.png` |
| Closed, landscape, column left | 678×466; 0/0/34/84 | Stacked fallback, content starts right of the column | draft kept | `duo-closed-landscape-left-column.png` |
| Open, landscape | 951×669; 0/84/34/0 | Native side by side: scene 434×553 (434×325), controls 402 pt | draft "Keep 4711" kept and still focused, lab mounts 1 | `duo-open-landscape-side-by-side.png` |
| Open, portrait | 669×951; 82/0/83/0 | Native vertical split: scene 669×393 (524×393), controls 637 pt, NativeTabs at the bottom | draft kept and focused | `duo-open-portrait-draft-kept.png` |
| Partially Open, portrait | 669×951 | Native split; system shrank the scene to 669×374 and left a gap at the fold | draft kept | `duo-partially-open-portrait.png` |
| Partially Open, landscape | 951×669; 0/84/34/0 | Native side by side with a gap at the fold: scene 456×553, controls 340 pt | draft kept | `duo-partially-open-landscape.png` |
| Native sheet open: rotate → Closed → Open | inner landscape → outer → inner portrait | Sheet re-presented at each size, form column kept | amount field kept "2", "Form mounted 1 time", saves 0; keyboard focus lost on fold | `duo-sheet-open-landscape.png`, `duo-sheet-after-rotate-fold-open.png` |
| Shell screen (Settings, `Screen`), closed, landscape and portrait | 678×466 (column left), 466×678 (column right) | `Screen` SafeAreaView pads past the side column on either edge; text and the card wrap before the column. This is the visual confirmation of the Phase 01 right-overlap fix | | `duo-closed-settings-column-left.png`, `duo-closed-settings-column-right.png` |
| Repeated changes while typing | all of the above | | Lab mounted once throughout; draft and selected sample goal survived every pose; no Pretend save ever happened by itself | `[layout-lab]` log lines |
| Inner split view, app left and right | | **Moved to the physical-Duo release gate (DECISIONS D48)** | Device Hub for iPhone Duo offers Home, Screenshot, Record, Rotate and the three poses; no split-view or multitasking control (owner screenshot), and no in-OS gesture was found | Phase 21 / RELEASE_CHECKLIST on a physical Duo |
| Ordinary iPhone landscape | iPhone 17 Pro Max iOS 26.1, 956×440; insets 0/62/64/62 | Selected in the Device Hub sidebar and rotated through AX. Settings: readable 680 pt column, clear of the Dynamic Island side and corners. Lab (fallback): scene capped at 45% of the height (264×198), controls scroll below | PASS | `pro-max-261-landscape-settings.png`, `pro-max-261-landscape-lab-fallback.png` |

### Checks after the fixes

| Check | Result |
| --- | --- |
| `npm run lint` | PASS, exit 0 |
| `npm run typecheck` | PASS, exit 0 |
| `npm test -- --runInBand` | PASS: 7 suites, 119 tests (new: contained-region inset policy, collapse detection incl. unmeasured sizes, native tree uses `contentInsetAdjustmentBehavior="never"` and no SafeAreaView edges in hosted regions, collapse → stacked → native on a window change) |
| `npm run deps:check` / `npm run doctor` | PASS / PASS 20/20 |
| Release export | PASS; no lab, sample or debug strings |

## Result

**VERIFIED COMPLETE** (23 October 2026, after the continuation and the owner's decision D48).

- Shared layout primitives (Screen, FormScreen, ContentColumn, AdaptiveGoalLayout with the guarded ArrangementView adapter, the stacked fallback and the collapse rule), development samples, guardrails and 119 passing tests.
- Native evidence: every Duo simulator pose Device Hub offers (closed / partially open / open, portrait and landscape, side-controls column on either edge, shell screen and lab), the native sheet through rotate/fold/unfold, repeated changes while typing without draft loss or submission, the older-iOS fallback on iOS 18.5 and 26.1 with keyboard and largest text, and ordinary-iPhone landscape side insets.
- Two defects found natively were fixed with tests (D47). Known limitation: the collapse fallback rebuilds both regions and drops keyboard focus; drafts and selection are kept.
- Release gates carried forward (not simulator passes): inner split view on both sides and all poses on a **physical iPhone Duo** (D48, RELEASE_CHECKLIST, Phase 21); VoiceOver (Phase 19); popover anchoring (first popover phase).

Rows earlier in this file that say NOT RUN are kept as history; the continuation section supersedes them.

Next prompt: [PHASE_04](../prompts/PHASE_04.md).
