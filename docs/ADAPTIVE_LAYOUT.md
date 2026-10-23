# Shared layout and iPhone Duo support

Product scope follows [MVP plan v1.2](Saving_Worlds_MVP_Plan_v1_2.docx); this document adds compatible engineering detail only.

Establish the shared layout foundation in Phase 03, after setup and design tokens. Every later screen uses it. Layout changes must preserve the selected goal, transaction draft, navigation and committed savings. Phase 03 implemented the foundation (see [Implementation](#implementation-phase-03) and [PHASE_03 evidence](evidence/PHASE_03.md)); the Duo pose checks it still lacks are listed there, and no physical-device support is claimed.

## Verified platform direction

Apple describes iPhone Duo as a resizable environment with compact and regular width presentations, changing control placement and partially folded use. Its guidance prioritizes layout margins and the current environment rather than separate designs keyed to each pose or device dimensions. Read [Apple's design talk](https://developer.apple.com/videos/play/tech-talks/111466/) and [iPhone Duo HIG](https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo).

Expo's SDK 58 guidance recommends native Router Stack/NativeTabs and updated safe-area handling for Duo. Use its supported APIs and verify the actual locked build. See [Expo SDK 58 platform notes](https://expo.dev/changelog/sdk-58). These platform facts inform the product-specific layout contracts below; the contracts are our architecture choices, not a claim that arbitrary React Native screens automatically handle every fold.

## Global layout contract

1. Navigation uses the supported native Expo Router Stack and NativeTabs. Keep one route hierarchy. Do not draw a fixed custom bottom tab bar that assumes all controls remain at the bottom.
2. Own safe-area behavior in shared Screen/FormScreen primitives. Consider all four edges, including asymmetric horizontal insets, and coordinate with native navigator/scroll insets to avoid both overlap and double padding. Background artwork may extend behind chrome; actionable controls and text stay in the usable region.
3. Read current application window geometry with useWindowDimensions; measure a nested region with onLayout. Never cache Dimensions.get('screen') at module scope or persist geometry in Zustand/SQLite. The hook updates when size/font scale changes; see [React Native window dimensions](https://reactnative.dev/docs/usewindowdimensions).
4. Use flex layout, readable column constraints, wrapping/growing content and native adaptation. No global percentage-based scale for all measurements, model-name switch, guessed physical fold coordinate, fixed full-screen height or hard-coded 600-point phone/tablet classification.
5. Let the native compact/regular environment or the system adaptive container select primary/secondary arrangement. Runtime window/container measurements size the contents within that arrangement. Do not infer the device pose or native size class from a device model/physical width. A compatibility adapter, if genuinely required, belongs in one shared layout module.
6. Keep native resizing enabled. An orientation lock or requireFullScreen flag is not a substitute for adaptation. Verify supported orientations/OS behavior in the chosen toolchain instead of using a lock to hide layout defects.

The [Expo safe-area guide](https://docs.expo.dev/develop/user-interface/safe-areas/) is the implementation reference. The values returned by layout APIs are used in React Native layout units, not as physical image-pixel coordinates.

## Primary and secondary regions

Create a narrow `AdaptiveGoalLayout` contract accepting a primary scene region and a secondary financial/control region. In a constrained window it forms a readable scrolling composition; where native adaptation offers more space it can present both regions without stretching forms across the entire display. All existing actions stay available in either arrangement. A partially folded/tabletop pose must not be required to reach a feature.

For a fold-aware two-region composition, validate Expo UI ArrangementView with RNHostView around the existing React Native regions. [ArrangementView](https://docs.expo.dev/versions/v58.0.0/sdk/ui/swift-ui/arrangementview/) supports adaptive primary/secondary content and requires iOS 27.1 or later; older versions need an explicit usable fallback rather than relying on its uncontained children. Keep that fallback inside the shared adapter.

[RNHostView](https://docs.expo.dev/versions/v58.0.0/sdk/ui/swift-ui/rnhostview/) connects SwiftUI region sizing to React Native layout. Use one parent React Native element per hosted region and verify its actual sizing mode. Phase 03 proves this integration with development-only scene/control samples before financial features depend on it. This does not migrate the app to SwiftUI or introduce another navigation owner. Do not use the experimental Router Split View merely to obtain a two-region Home layout.

Do not install expo-hinge for layout. Saving Worlds has no hinge-driven effect requirement. Let the supported adaptive container handle hardware-sensitive arrangement; keep world placement based on its measured region. If an API cannot meet a required partial-fold behavior, document the exact failing scenario and a bounded compatibility fix. Do not label width-only reflow as verified fold avoidance.

## Screen behavior rules

| Surface | Compact or short region | More available space |
| --- | --- | --- |
| Home/world | Keep saved amount and savings actions reachable; scene scales to its own measured region | Use the adaptive scene/control regions and readable financial column |
| Create/Edit and transaction forms | Scroll with keyboard, growing labels and errors; no fixed-height dialog | Constrain readable form width; use native sheets/popovers where appropriate |
| History/challenges | Readable rows and explicit actions, dynamic row heights | Preserve row readability; collections may use measured columns without new functionality |
| Collection | One coherent card/detail flow | Adaptive card grouping; native margins; historical world keeps aspect ratio |
| Statistics | Global-currency text summary remains visible; chart fits its local region | More chart space without unreadably long lines or a different calculation |
| Paywall/Settings | Purchase/restore/error actions remain scroll-reachable | Constrained content and correct native sheet/popover anchoring |

Use one shared policy for readable widths/gutters. Component layout can react to measured available space, but must not proliferate separate per-screen device breakpoints. Numerical layout bounds are content constraints, not labels for specific iPhone models.

## State and financial safety during adaptation

Keep route identity and form state above presentation arrangement changes. Avoid distinct keyed route trees for folded/unfolded screens. A resize/rotation/keyboard event must not submit a form, clear entered data, change currency/goal, replay a savings command, rerun migrations or award completion. Stable mutation IDs and post-commit scene behavior continue to apply. A scene relayout uses the same progress state and new local bounds; it does not recalculate savings from geometry.

Handle a focused input across a resize and return focus meaningfully if native presentation changes. Changing sheet presentation must not create a second form instance with an independent draft. Text remains scalable; do not disable Dynamic Type to fit the outer display. Font scaling and wrapping also influence whether a side region remains usable.

## Verification matrix

| Environment or event | Required evidence |
| --- | --- |
| Small, standard and large supported iPhones | All edges, smallest usable window, increased text size, keyboard and scroll behavior |
| Duo outer display | Native side controls/insets; essential actions are visible or scroll-reachable |
| Duo fully open, supported orientations | Native arrangement, readable columns, world aspect ratio and local chart/scene sizing |
| Duo partial fold/tabletop, where supported | Text and controls avoid unusable fold areas; same functionality and no guessed hinge position |
| Inner-display split view, left/right app positions | Reflow under actual app window size; asymmetric native chrome does not cover controls |
| Repeated resize/fold/rotation while editing | Draft, navigation, selection, focus and operation ID remain correct; no financial mutation |
| Short viewport/PiP/keyboard/native sheet | No clipped primary actions, sheet content or duplicated inset |
| Older supported iOS without ArrangementView | Explicit single-composition fallback works and preserves state |

Use actual Xcode/Device Hub simulator capabilities and record supported states; do not invent a simulator API. Phase 03 requires the available Duo native simulator checks and ordinary iPhone fallback checks. If a physical Duo or a pose unavailable in the simulator cannot be checked yet, record it explicitly for the final device/release gate. Generic resized screenshots alone do not establish full Duo support. No separate iPad launch is added by this requirement.

Before release, repeat the matrix using real feature forms, both worlds, challenges, charts and paywall. Record toolchain, OS/device, window/pose, text size and result. Missing mandatory device coverage remains a release blocker, not a green check.

## Implementation (Phase 03)

Module: `src/shared/layout/` (public API in `index.ts`). Evidence and the native matrix status: [PHASE_03](evidence/PHASE_03.md). Decisions: D44-D46.

| Primitive | Contract |
| --- | --- |
| `Screen` | Vertical scrolling screen inside native Stack/NativeTabs chrome. Readable column (680 pt max), 16 pt gutters, growing text. |
| `FormScreen` | Same as Screen plus keyboard-safe scrolling (`automaticallyAdjustKeyboardInsets`, `keyboardShouldPersistTaps="handled"`, interactive dismissal). Form column 560 pt. Used for screens and native sheets with inputs. |
| `ContentColumn` | Centered column, `readable` or `form` maximum width; fills narrower windows. `Screen centered` (D69) gives it the visible share of the viewport (`centeredContentHeight`) to center an empty state; content taller than that scrolls as usual. |
| `AdaptiveGoalLayout` | `scene` (primary), `controls` (secondary), optional `floatingAction` (Phase 08, D72), `sceneAspectRatio`. iOS 27.1+: system `ArrangementView` through `arrangement-adapter.tsx`; the floating action floats over the controls region (contained, no extra inset). Older iOS, and any window where the system collapses the arrangement to the scene alone: one scrolling column, scene first (column width, aspect ratio, at most 40% of the visible height), controls below, the floating action at the bottom trailing corner. |
| `floatingAction` on `Screen` and `AdaptiveGoalLayout` (Phase 08, D72) | A `FloatingActionButton` drawn over the bottom trailing corner of the scroll view, above the tab bar and home indicator, in a full-width slot aligned to the trailing edge whose empty area passes touches through (`floatingActionEdges`: bottom `additive`, sides `maximum`, 16 pt margin); the scroll content gets the button's height as `contentInset.bottom` (`floatingActionInset`). The wrapper around the scroll view and the button stays layout-only so Fabric flattens it: a drawn wrapper hid the scroll view from UIKit and the large title stopped collapsing (D70 finding on the SE). |
| `useMeasuredSize`, `fitAspect` | Local onLayout size in component state; largest box of a given aspect ratio inside a measured region. |
| `useFontScale` | Current text-size multiplier (Phase 06), for shared controls that size a non-text element such as an icon to match text. |

Inset ownership (`metrics.ts`): in scrolling screens the native scroll view owns top/bottom insets (header, tab bar, home indicator, keyboard) and a native `SafeAreaView` inside the scroll content owns left/right with `maximum` mode, so each side gets max(its own measured overlap, gutter). The native view measures its own frame, which covers the Duo side-controls column, landscape sensor housing and split view without reading window values or adding a hook inset twice. Static regions own all four edges. Inside the native arrangement the SwiftUI host keeps both regions inside the container safe area (bars, side-controls column), so hosted content is `container`-owned: no SafeAreaView edges and `contentInsetAdjustmentBehavior="never"`, only the gutter. Adding the inset there doubled the 84 pt Duo side column (fixed in Phase 03). The host ignores only the keyboard safe area, because the controls region's scroll view adjusts for the keyboard itself.

ArrangementView adapter: `arrangementViewAvailable()` is true only on iOS 27.1+ (checked once per process from `Platform.Version`, so geometry never switches the branch). The binary must be built with the iOS 27.1 SDK; the project's EAS image is Xcode 27.1. Each slot hosts one `RNHostView` (`matchContents` false, so the hosted view takes the size SwiftUI gives it) with exactly one React Native `View`. Observed on the Duo simulator: open or closed portrait → vertical split (scene above, controls below); open landscape → side by side; partially open → the same arrangements with a gap at the fold. On the closed display in landscape (678×466) the system collapses the arrangement to the scene alone, whatever the style or split limits, so the controls are unreachable. `AdaptiveGoalLayout` detects this (`isArrangementCollapsed`: the scene region covers the whole `Host onLayoutContent` size), renders the stacked composition for that window size, and retries the native arrangement on the next window change. The switch rebuilds both regions, so keyboard focus is lost, but drafts and selection live above the layout. The iOS 27.1 simulator runtime supports only iPhone Duo, so ordinary iPhones in this toolchain run the fallback.

Device Hub automation (for later verification): with macOS Accessibility granted to the Claude Code helper process, Device Hub's Rotate button, the Closed / Partially Open / Open pose buttons (visible after "Enter resize mode") and the app's own controls can be pressed through the Accessibility API. Device Hub offers no split-view control for iPhone Duo, so inner split view is a physical-Duo release check (DECISIONS D48).

Guardrails (ESLint, `src/**`): `useWindowDimensions` only in `src/shared/layout/**` and `src/dev/**`; `ArrangementView`/`RNHostView` only in the layout layer; no `Dimensions.get`, no disabled or capped font scaling.

Development samples: Settings → "Layout lab (development only)" (`/dev-layout`, `?focus=draft` focuses the draft field) and the sample form sheet (`/sample-form`). The lab shows arrangement mode, window, safe area, column size and mount counts, and logs one `[layout-lab]` line per layout change to the Metro console. Both routes are development-only and absent from release bundles.

## Adoption contract for later screens

| Screen (phase) | Use | Rules |
| --- | --- | --- |
| Home dashboard (08), scene (09/10) | `AdaptiveGoalLayout` | Saved amount, remaining, percentage, the deadline card and the grouped rows live in `controls`, Add savings in `floatingAction`; the scene component fills `scene`, measures itself with `useMeasuredSize` and draws art with `fitAspect`; decorative background may fill the region, text and actions may not leave it. Goal selection lives in the route/store, never in a region. |
| Create/Edit Goal (06, `/goal-form` sheet), Add/Edit Transaction (07), Settings (06/14/19), Paywall (16) | `FormScreen` (inside the existing native `formSheet` where presented modally) | Draft and operation ID owned by the route component or its store above FormScreen. No fixed-height dialog; Save and errors scroll-reachable with the keyboard up. |
| History (07), Challenges (13), Collection (11), Statistics (18), Onboarding (06) | `Screen` (or a list with the same inset policy) | History's Add savings is `Screen floatingAction` (D72). Rows grow with text. A list (FlatList) uses `contentInsetAdjustmentBehavior="automatic"` and puts its left/right inset in a `SafeAreaView` with `safeAreaEdges(scrollingScreenOwnership)`, not hook values. Charts and cards size from `useMeasuredSize`. |
| Native sheets and popovers | Native presentation | Sheet content uses FormScreen; a later popover is anchored natively and checked on regular width. |

No screen reads window geometry directly, branches on a device model or fold position, scales by screen ratio, or lets size/pose change any financial value, command or navigation. A new layout need is added to `src/shared/layout/` with a test, not to a feature screen.

