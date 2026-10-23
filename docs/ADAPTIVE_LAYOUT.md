# Shared layout and iPhone Duo support

Product scope follows [MVP plan v1.2](Saving_Worlds_MVP_Plan_v1_2.docx); this document adds compatible engineering detail only.

Establish the shared layout foundation in Phase 03, after setup and design tokens. Every later screen uses it. Layout changes must preserve the selected goal, transaction draft, navigation and committed savings. This is a plan; no device support is claimed as tested yet.

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
