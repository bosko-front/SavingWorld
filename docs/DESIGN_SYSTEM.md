# App palette and global styling system

Product scope follows [MVP plan v1.2](Saving_Worlds_MVP_Plan_v1_2.docx); this document adds compatible engineering detail only.

Create the styling foundation in Phase 02, before implementing financial screens. This is the React Native equivalent of the requested global CSS system. [Adaptive layout](ADAPTIVE_LAYOUT.md) is a separate concern implemented in Phase 03. No styling code is being written during planning.

## Choice and scope

Use React Native StyleSheet with typed shared tokens and a small app-theme context when needed. It fits native components, Reanimated and the existing TypeScript architecture without introducing another compiler or styling runtime. Do not add NativeWind, Tailwind, styled-components, CSS-in-JS or web CSS files for this app without a concrete new need and a recorded decision.

The app's visual palette is separate from its Island/Garden world themes. Changing a world does not change financial meanings or allow users to recolor the app. Choosing the product palette is part of implementation; user-facing color customization remains out of scope.

Phase 02 may refine the recommended palette below to fit approved branding, then records exact final values and contrast pairs. It does not need to turn routine color choices into a separate approval gate. Brand/name availability is still a release decision. Launch with one coherent light palette; full dark-mode styling is not being added as an unrequested feature. Explicitly configure/test the supported appearance so native bars, sheets and app surfaces remain legible with either system preference. Do not claim dark-mode support without its own complete palette and verification.

## Recommended starting palette

| Semantic role | Initial value | Use |
| --- | --- | --- |
| canvas | #F6F4EA | Warm background |
| surface | #FFFFFF | Cards, form panels and readable surfaces |
| text.primary | #20352D | Financial amounts, headings and primary labels |
| text.secondary | #53665A | Supporting copy and date labels |
| action.primary | #256447 | Main saving action and selected controls |
| action.onPrimary | #FFFFFF | Text/icons over the primary action |
| surface.soft | #E5EEDF | Quiet highlights and selected card surfaces |
| accent.decorative | #D7B66B | Small decorative accents; not normal text on white |
| money.withdrawal | #9B403D | Withdrawal cue alongside an explicit sign/label |
| feedback.error | #B3261E | Errors with text/icon, never color alone |
| focus | #245C92 | Visible focus/selection cue where supported |
| border.control | #6A7A70 | Necessary input/control outlines |

Planning calculations using the sRGB relative-luminance contrast formula give: primary text/canvas 11.84:1, secondary text/white 6.15:1, white/primary action 7.02:1, withdrawal/white 6.57:1, error/white 6.54:1, focus/white 6.95:1 and control border/white 4.54:1. These are mathematical pair checks, not device or visual approval. Phase 02 checks the final actual pairings, including pressed, disabled and translucent states. Decorative gold has no blanket contrast approval.

## Token contract

Keep raw palette values private to the theme/token module. Screens refer to semantic colors rather than scattered hex literals. Reanimated/native APIs may receive resolved values from that same source. Avoid dozens of single-use tokens that merely rename a local number.

Define small typed scales for spacing, typography, radii, borders, elevation/shadows, motion and layout constraints. A reasonable spacing seed is 4, 8, 12, 16, 24 and 32 logical points. Use platform system fonts and semantic text roles with font scaling; let text wrap and controls grow vertically. Define numeric amount styles with readable digit alignment where supported. Do not multiply all font sizes, paddings or touch targets by a screen-width ratio.

Motion tokens cover brief feedback and reduced-motion alternatives. Layout constraints describe readable form/column limits and gaps; they do not contain iPhone model widths or a guessed Duo fold position. Put all adaptation rules in the Phase 03 layout layer.

## Shared primitives and ownership

Planned files, intentionally not created in this documentation task:

- `src/shared/theme/` for palette, semantic tokens, theme access and native appearance integration.
- `src/shared/ui/` for AppText, Button, TextField, Card, AmountText and consistent feedback/error surfaces.
- `src/shared/layout/` in Phase 03 for Screen, FormScreen, ContentColumn and AdaptiveGoalLayout.
- A development/test-only component gallery, excluded from distribution routes.

Define a few purposeful variants instead of allowing arbitrary style props to bypass accessibility and tokens. Button variants share minimum touch targets, disabled/loading behavior and readable labels. TextField retains input semantics and error linkage. AmountText formats through core money helpers once Phase 04 exists; Phase 02 uses display samples only and must not implement competing money logic.

Screen-level composition uses StyleSheet.create and a small set of measured dynamic styles. Do not encode layout decisions separately in every component. Native bars and modals use supported tint/background APIs; native navigation may retain platform materials where they remain readable. There is no requirement to recolor every system-provided element.

## Phase 02 acceptance

The chosen palette and token API are documented. Existing shell screens use the shared primitives. A component gallery demonstrates normal, pressed, disabled, loading, error and focus states, long labels and large text. Contrast checks use actual foreground/background pairings. No feature screen relies on private copied palette constants or a general scale(width) function. Financial fields remain Free; styling never adds Pro personalization controls.

Run relevant component interaction checks, TypeScript, lint and existing tests. Review rendered controls on small/large iPhone simulators with increased text size and the supported native appearance. Record measured mathematical contrast separately from native/visual evidence.

## Change policy

Later feature phases reuse this system. Add a token or primitive only when an actual repeated need exists. Update this document when values or conventions change. Recheck contrast and affected screens after palette edits; preserve independent adaptive-layout and world-asset contracts.
