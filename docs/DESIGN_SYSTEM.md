# App palette and global styling system

Product scope follows [MVP plan v1.2](Saving_Worlds_MVP_Plan_v1_2.docx); this document adds compatible engineering detail only.

Phase 02 created the styling foundation (evidence: [PHASE_02](evidence/PHASE_02.md)). It is the React Native equivalent of the requested global CSS system. [Adaptive layout](ADAPTIVE_LAYOUT.md) is a separate concern implemented in Phase 03.

## Choice and scope

Use React Native StyleSheet with typed shared tokens. No theme context exists because the app has exactly one palette; screens import tokens directly from `@/shared/theme`. Add a context only if a real second runtime theme is approved. Do not add NativeWind, Tailwind, styled-components, CSS-in-JS or web CSS files for this app without a concrete new need and a recorded decision.

The app's visual palette is separate from its Island/Garden world themes. Changing a world does not change financial meanings or allow users to recolor the app. User-facing color customization remains out of scope.

Brand/name availability is still a release decision (Q09); the palette can be refined then, followed by the contrast tests and this document.

## Launch appearance

Release 1.0 supports one light appearance (DECISIONS D37). `app.config.ts` sets `userInterfaceStyle: 'light'` (Info.plist `UIUserInterfaceStyle = Light`), so native bars, sheets, keyboards and system controls stay light and legible over the light app surfaces even when the OS is set to Dark. The root view background (`backgroundColor`) and splash background use `palette.cream`. The root layout renders a dark-content status bar. The app does not support dark mode and has no appearance toggle; switching to `automatic` requires a complete dark palette, contrast checks and device verification.

## Final palette

Raw values live only in `src/shared/theme/palette.ts`. Semantic names in `src/shared/theme/tokens.ts` (`colors`) are the only colors screens may use. The starting recommendation was kept unchanged; Phase 02 added the pressed, disabled, subtle-border and feedback-surface roles that the shared controls actually need.

| Semantic token | Value | Use |
| --- | --- | --- |
| canvas | #F6F4EA | Screen background, launch background |
| surface | #FFFFFF | Cards, fields, secondary buttons |
| surfaceSoft | #E5EEDF | Quiet highlight, soft card, pressed secondary/plain fill, success notice |
| textPrimary | #20352D | Headings, body, amounts, field values |
| textSecondary | #53665A | Supporting copy, hints, placeholders |
| textOnAction | #FFFFFF | Label and spinner on primary buttons |
| actionPrimary | #256447 | Primary fill, secondary/plain labels, header and tab tint |
| actionPrimaryPressed | #1B4D36 | Primary fill while pressed |
| borderControl | #6A7A70 | Field and secondary button outlines |
| borderSubtle | #DCE1D6 | Decorative card hairline only |
| focus | #245C92 | Field focus outline, button keyboard-focus outline |
| disabledSurface / disabledBorder / disabledText | #E6E8E1 / #A3ADA6 / #5C6860 | Inactive controls (border decorative) |
| moneyDeposit | #256447 | Deposit amounts, always with a sign or word |
| moneyWithdrawal | #9B403D | Withdrawal amounts, always with a sign or word |
| error / errorSurface | #B3261E / #FBEAE8 | Error text, outline, notice |
| success / successSurface | #256447 / #E5EEDF | Success notice |
| info / infoSurface | #245C92 / #E7EEF6 | Information notice |
| accent | #A9651A | Progress fill and milestone markers (Phase 07.5); graphics only, ≥ 3:1 on every surface and on progressTrack |
| accentText | #8F5A14 | Short accent labels such as the Home percent; ≥ 4.5:1 on canvas, surface, surfaceSoft and accentSurface |
| accentSurface | #F3E7C9 | Next-milestone callout and other warm highlights (Phase 08) |
| progressTrack | #ECE6D3 | Unfilled part of a progress bar (decorative; the fill carries the value, the percent is always in text) |
| progressLow / progressMid / progressHigh / progressComplete | #A9651A / #857516 / #4F8A4B / #256447 | Progress fill by floored percent (D66): honey below 30%, olive 30-59%, soft green 60-99%, strong green at 100% or more. No red or orange: low progress is never a warning. The percent text is `accentText` below 60% and `success` from 60% |
| accentDecorative | #D7B66B | Decorative accents only; 1.95:1 on white, never text or a necessary boundary |
| shadow | #20352D | Card shadow color (8% opacity) |

All semantic colors are opaque. No token uses transparency, so every rendered pair can be checked exactly. The only translucent surfaces are the system's own bar materials (iOS 26 glass tab bar/back button), which the OS draws in the forced light appearance.

## Contrast results

Mathematical WCAG 2.x relative-luminance ratios, recalculated by `tests/unit/contrast.test.ts` on every test run from the actual token and control state tables (`buttonColors`, `disabledButtonColors`, `fieldColors`, `noticeColors`). Targets: 4.5:1 for text, 3:1 for large text and necessary graphical boundaries. Disabled controls are exempt under WCAG, but we still hold their labels to 4.5:1. All 100 pairs pass (51 from Phase 02, 18 added in Phase 07.5, 26 for the progress ranges and toast tones in D66, 5 icon tiles in D68). These are not device or visual approval; see the evidence for simulator checks.

| Foreground on background | Ratio | Target |
| --- | --- | --- |
| textPrimary on canvas / surface / surfaceSoft | 11.84 / 13.06 / 10.96 | 4.5 |
| textSecondary on canvas / surface / surfaceSoft | 5.58 / 6.15 / 5.16 | 4.5 |
| actionPrimary label (secondary, plain, header tint) on canvas / surface / surfaceSoft | 6.36 / 7.02 / 5.89 | 4.5 |
| textOnAction on actionPrimary / actionPrimaryPressed | 7.02 / 9.72 | 4.5 |
| disabledText on disabledSurface / canvas / surface / surfaceSoft | 4.72 / 5.28 / 5.83 / 4.89 | 4.5 |
| moneyDeposit on canvas / surface / surfaceSoft | 6.36 / 7.02 / 5.89 | 4.5 |
| moneyWithdrawal on canvas / surface / surfaceSoft | 5.96 / 6.57 / 5.52 | 4.5 |
| error on canvas / surface / surfaceSoft / errorSurface | 5.93 / 6.54 / 5.49 / 5.61 | 4.5 |
| success title on successSurface | 5.89 | 4.5 |
| info title on infoSurface | 5.94 | 4.5 |
| textPrimary on errorSurface / successSurface / infoSurface | 11.21 / 10.96 / 11.16 | 4.5 |
| borderControl on surface / canvas | 4.54 / 4.11 | 3 |
| focus outline on surface / canvas | 6.95 / 6.30 | 3 |
| error outline on surface | 6.54 | 3 |
| actionPrimary button shape on canvas; selected tab tint on light bar | 6.36; 7.02 | 3 |
| Notice accent bars (error / success / info) | 5.61 / 5.89 / 5.94 | 3 |
| accentText on canvas / surface / surfaceSoft / accentSurface (Phase 07.5) | 5.23 / 5.77 / 4.84 / 4.69 | 4.5 |
| accent (progress fill) on canvas / surface / surfaceSoft / accentSurface / progressTrack | 4.17 / 4.60 / 3.86 / 3.74 / 3.69 | 3 |
| textPrimary / textSecondary on accentSurface | 10.62 / 5.00 | 4.5 |
| destructive button label on surface / pressed errorSurface | 6.54 / 5.61 | 4.5 |
| destructive button outline on canvas / surface | 5.93 / 6.54 | 3 |
| Status badge labels: info on infoSurface / success on successSurface / textSecondary on surfaceSoft | 5.94 / 5.89 / 5.16 | 4.5 |
| Progress fill low / mid / high / complete on progressTrack (D66) | 3.69 / 3.70 / 3.32 / 5.62 | 3 |
| Same fills on canvas / surface / surfaceSoft | 4.17-6.36 / 4.14-7.02 / 3.48-5.89 (lowest: progressHigh) | 3 |
| Error toast: title error on errorSurface / message textPrimary / accent bar | 5.61 / 11.21 / 5.61 | 4.5 / 4.5 / 3 |
| Icon tile glyphs (D68): green / honey / blue / red / neutral | 5.89 / 4.69 / 5.94 / 5.61 / 5.16 | 3 |

## Token contract

`src/shared/theme/index.ts` exports `colors`, `spacing` (4, 8, 12, 16, 24, 32), `radii` (8, 12, 16, 24, pill), `borders` (hairline, control 1, emphasis 2), `elevation.card`, `typography`, `motion` and `layout`, plus `stackScreenOptions` and `nativeTabsAppearance`. The raw palette is not exported.

Typography uses the system font. Each role (`display` 40/46 bold for the Home saved amount, added in Phase 07.5, `largeTitle`, `title`, `headline`, `body`, `callout`, `label`, `footnote`, `caption`) has the iOS default size/line height at the standard content size and a `ramp` naming the UIFont text style that Dynamic Type scales it with (React Native `dynamicTypeRamp`). Text wraps and controls grow; nothing caps or disables font scaling. Amounts use `tabular-nums` digits.

`motion` holds brief durations (120/220/360 ms) and `reduced: 0` for Reduce Motion. `layout` holds content constraints only (44 pt minimum touch target, readable/form maximum widths, screen gutter). It contains no device widths, breakpoints or fold positions; Phase 03 owns window and safe-area adaptation. Since Phase 10, `src/shared/ui/motion-preferences.ts` says when motion may run: `useReduceMotion()` (OS setting, shared with the toast), `useAppActive()` and `useAmbientMotion()` (focused screen, foreground app, no Reduce Motion). World timings live in `WORLD_MOTION` (`src/features/worlds/world-transition.ts`, D85). Ambient scene motion (Phase 10.5, D90: clouds, water shimmer, tree sway) uses `useAmbientMotion()` too, transforms and opacity only, no frame limiter, and ships only if the Phase 21 device measurement passes. Implemented (D91-D92): `WorldScene ambient` (Home only) drives each marked layer in an inner view of its reveal box: clouds drift ≈ 22 pt out and back over 24 s, three water flow layers take turns on a 2.4 s round so white streaks travel down the stream and the waterfall, trees lean 5° either side (a skew from the trunk base) over ~4.4 s, clouds and trees staggered (D93); rest pose = the approved picture, back to rest at once when the gate closes. Release kill switches: `AMBIENT_RELEASE_SWITCHES` (`src/features/worlds/ambient.ts`); the World inspector toggles them for review.

## Shared primitives

| Module | Contract |
| --- | --- |
| `src/shared/ui/app-text.tsx` `AppText` | All app text. `role` picks typography and Dynamic Type ramp; `tone` picks a semantic text color. `style` is for layout or a token-derived color only. |
| `src/shared/ui/button.tsx` `Button` | Variants `primary`, `secondary`, `plain`, `destructive` (Phase 07.5: error label and outline, for Delete entry after a confirmation), optional leading `icon` (Phase 06), `centered` for a plain button under a full-width one (D66). 44 pt minimum, wrapping label, pressed fill, `disabled` (disabled look, `accessibilityState.disabled`) and `loading` (spinner, label kept, `busy`, presses ignored). Keyboard-focus outline where focus events arrive. Works inside `Link asChild`. |
| `src/shared/ui/text-field.tsx` `TextField` | Variants (D67): `default` outlined; `amount` (the money field of a form: display-size number with the currency code as `suffix` inside the outline; at text scales above 1.35 the number uses the still-scaling title size so the whole amount stays visible, and the code wraps under it); `inset` (borderless with a small caption label, for a `ListCell` row). Optional `accessibilityLabel` when the spoken name is fuller than the visible label ("Amount (EUR)"). Visible label that is also the input's accessibility label; hint; `error` replaces the hint with the `error` SF Symbol (Phase 06) and message, a 2 pt error outline and an "Error: …" accessibility hint; 2 pt focus outline; `disabled`; optional `inputRef` so a form can move focus. Raw text only, no parsing. |
| `src/shared/ui/card.tsx` `Card` | `surface` (white, hairline, soft shadow) or `soft` (surfaceSoft). |
| `src/shared/ui/amount-text.tsx` `AmountText` | Display styling for an already formatted amount (`balance`, `deposit`, `withdrawal`; `regular`, `large` or `display`). Phase 04 money helpers produce the string, including the explicit sign or word; this component never parses or calculates. |
| `src/shared/ui/notice.tsx` `Notice` | Inline `error` / `success` / `info` feedback with the tone's icon and a title that states the outcome in words; error notices use the `alert` role. |
| `src/shared/ui/icon.tsx` `Icon`, `src/shared/ui/toast.tsx` `showToast` / `Toaster` | SF Symbols by semantic name; transient confirmations (Phase 06, see below). |
| `src/shared/ui/progress-bar.tsx` `ProgressBar` (Phase 07.5) | Range-colored fill (`progressFillColor`, D66) on a progressTrack with nine marks at the 10% milestones. Takes the visual `fraction` from `sceneFeedback().overall` and the floored `percent`; `progressbar` role with the percent as its value. The percent is always also written next to it. | Since Phase 10 a change of `fraction` glides on the UI thread (`durationMs`, Home 700 ms) and the fill blends into the next range color just before it crosses 30%, 60% or 100% (`fillColorStops`), always resting on the exact D66 color; `animated: false`, Reduce Motion or a new `resetKey` jump. Optional `delayMs` (Phase 13, D106) waits before a glide; the active quest card uses Home's 450 ms sheet pause. `useCountUp` (`count-up.ts`) counts the saved amount and the percent up in whole units next to it; VoiceOver labels stay on the committed values.
| `src/shared/ui/list-row.tsx` `ListGroup`, `ListRow`, `ListCell` (Phase 07.5; `ListCell` for custom row content such as a date picker or an inset field, D67) | Inset-grouped rows on one rounded surface with hairline separators. Row: optional icon, title, `detail`, trailing `value`, `chevron` for navigation, `tone="destructive"`, `loading`, `disabled`; pressable when it gets `onPress` (also inside `Link asChild`), otherwise a static readable row. Use for secondary actions and settings instead of stacked buttons. |
| `src/shared/ui/section-header.tsx` `SectionHeader` (Phase 07.5) | The one in-content heading (headline + optional caption). Screens never repeat their native title in the content. |
| `src/shared/ui/status-badge.tsx` `StatusBadge` (Phase 07.5) | Soft pill with a status word (`info`, `success`, `neutral`), e.g. Paused, Completed. |
| `src/shared/ui/empty-state.tsx` `EmptyState` (Phase 07.5) | Icon in a soft circle, a title that says what belongs here, one sentence on how it fills, optional single action. Replaces "will appear here" copy. | Since Phase 10 its picture (icon tile or illustration) floats 4 pt on a 3.6 s cycle through `AmbientFloat` (`ambient-float.tsx`), decorative and hidden from VoiceOver, only on the focused screen of the foreground app and still under Reduce Motion (D69, D85); Home's empty Island adds `AmbientSparkles`.
| `src/shared/ui/icon-tile.tsx` `IconTile` (D68) | Filled SF Symbol on a pastel rounded-square tile in `green`, `honey`, `blue`, `red` or `neutral` (`tileColors`), scaled with the text role; decorative. |
| `src/shared/ui/header-button.tsx` `HeaderIconButton` (Phase 07.5) | Icon-only 44 pt button for a navigation-bar slot, with a required accessibility label (Settings on Home). |
| `src/shared/ui/floating-action-button.tsx` `FloatingActionButton` (Phase 08, D72-D73) | The screen's one primary action as an `actionPrimary` pill (min 56 pt) with a white SF Symbol and a visible label ("+ Add savings"), which is also its spoken name. Above text scale 1.35 it shows only the icon (growing with text). Placed only through the `floatingAction` slot of `Screen`/`AdaptiveGoalLayout`. Works inside `Link asChild`. |

Screens are composed with the Phase 03 layout primitives (`Screen`, `FormScreen`, `ContentColumn`, `AdaptiveGoalLayout` in `src/shared/layout/`); see [ADAPTIVE_LAYOUT](ADAPTIVE_LAYOUT.md#implementation-phase-03). The temporary `PlaceholderScreen` was removed in Phase 03.

## Conventions

- **Semantic colors only.** Pick a token by meaning (`error`, `moneyWithdrawal`), never by hue. Money and error colors always accompany a sign, word, glyph or outline. `accentDecorative` never carries meaning.
- **Purposeful variants.** Shared controls expose a few named variants and states, not arbitrary style overrides. A new variant needs a real repeated need, its state colors added to the component's color table and a contrast pair in the test.
- **Local StyleSheet composition.** Each screen/component declares `StyleSheet.create` styles from tokens; a small number of dynamic styles (pressed, focused) is fine. Do not copy palette values or build per-component scaling.
- **Add tokens only for repeated needs.** One-off numbers stay local. Changing or adding a color means: update `palette.ts`/`tokens.ts`, run the contrast tests, update the tables above.
- **Guardrails (ESLint, `src/**`).** Hex and `rgb()/hsl()` literals are errors outside `palette.ts`; importing the raw palette, `PlatformColor` or `DynamicColorIOS` is an error; `allowFontScaling={false}`, `maxFontSizeMultiplier` and `Dimensions.get` are errors. `app.config.ts` keeps one launch-color literal because the Expo config loader cannot import TypeScript modules; a test asserts it equals `palette.cream`.
- **Native navigation.** Stacks spread `stackScreenOptions` (tint, title colors, canvas content). NativeTabs uses `nativeTabsAppearance.tintColor`. On iOS 26+ the system draws the tab bar and back-button glass itself; we do not recolor it.

## Transient feedback (toasts)

The owner approved toasts for feedback where they follow UX best practice (23 October 2026, DECISIONS D40). A toast is a short, self-dismissing confirmation; it never replaces the screen's own state.

Use a toast for a low-priority confirmation of something the user just did and can already see reflected on screen: "Deposit saved", "Withdrawal saved", "Entry updated", "Entry deleted", "Goal deleted", "Reminder turned on". Do not use one for:

- Form errors and validation. Keep those inline (`Notice` / TextField `error`) and preserve the user's input. Since D66 an **error toast** (title + one sentence on what to do) is used only for a refused or failed one-tap action that has no form: Pause, Resume, Reopen, Delete goal (later Finish, Skip).
- Destructive confirmation. Deleting an entry or a whole goal (D74) still needs a native confirmation first; there is no Undo, because v1.2 keeps no entry history and a deleted goal is gone.
- Essential information, money amounts or anything the screen does not also show. Updated balances appear on screen; the toast only confirms the action.
- Milestone, souvenir or completion celebrations. Those are the world's job (Phases 10/11) and stay dismissible and accessible on their own. Phase 10's "New milestone unlocked!" is an in-scene message (`unlock-banner.tsx`), not a toast.
- Purchase results. The paywall shows them in place (Phase 16).

Behavior rules:

1. One toast at a time; a new one replaces the current one. No stacking of financial messages.
2. Short text that states the outcome in words, with a semantic icon. Success tone uses `success`/`successSurface`; an informational toast uses `info`/`infoSurface`; the error tone (D66) uses `error`/`errorSurface` with the title in `error` and an optional message line in `textPrimary`.
3. Visible for about 4 seconds (error toasts at least 6), longer for longer text, at most 8; swipe or tap to dismiss. With VoiceOver running, do not rely on the timer: the announcement carries the message.
4. Every toast is announced once to VoiceOver (`AccessibilityInfo.announceForAccessibility`, queued so it does not interrupt), and never steals focus.
5. Reduce Motion: no slide or spring; appear and disappear with a short fade or instantly (`motion.reduced`).
6. Placement: near the top, below the navigation bar with a clear gap (offset = top safe area + 44 + 32 pt since owner decision D89, before that + 8 pt, which touched Home's gear; the engine ignores the safe area when given an offset, which made the toast cover Back until Phase 07.5), so it never covers Back, the tab bar, the keyboard, Add savings or a form's Save button. Text uses AppText roles and grows with Dynamic Type; the toast wraps instead of truncating.
7. Pair a toast with `haptics.success()` only where the Haptics table says so (committed financial writes, Finish), never for every tap.
8. Shown only after the write has committed, never optimistically. A form that stays open after saving shows its result inline instead.

Implemented in Phase 06 (DECISIONS D58): `src/shared/ui/toast.tsx` exposes `showToast({ tone, title })` (`tone` is `success` or `info`; there is no error tone) and the `<Toaster />` host rendered once in the root layout inside a `FullWindowOverlay`, so a toast also shows above native sheets. One visible toast; the previous one is dismissed before the next. Duration 4 s, plus 60 ms per character beyond 40, at most 8 s. Tap or swipe up dismisses. Announcement: `AccessibilityInfo.announceForAccessibilityWithOptions(title, { queue: true })`. Reduce Motion: the engine skips its slide and the card fades in over `motion.standard` with React Native `Animated`. ESLint allows `sonner-native` only in this file. Phase 06 confirmations: Goal created, Goal saved, Goal paused, Goal resumed, Goal archived (removed with Archive by D74; goal deletion confirms with Goal deleted), Goal reopened, Currency changed to XXX. Original plan: a shared `src/shared/ui/toast.tsx` exposes `showToast({ tone, title })` and the `<Toaster />` host in the root layout, so screens never import a toast library directly. It renders with our tokens and AppText, adds the VoiceOver announcement and enforces the rules above. The planned engine is `sonner-native` (see the UX library plan below); its own styling, icons and stacking are overridden or disabled. Phase 06 (the first phase that saves something) installs the engine, creates this module and adds a gallery demo; Phase 07 reuses it for financial writes and adds the success haptic. Both prompts name this explicitly.

## Haptics

Haptics confirm a meaningful moment the user caused; they are never the only feedback and never decoration (DECISIONS D42). Screens call a shared `src/shared/ui/haptics.ts` helper with four semantic functions, never `expo-haptics` directly. iOS applies the user's System Haptics setting automatically; there is no in-app haptics toggle. Haptic calls are fire-and-forget and must never block or fail a flow.

| Helper | iOS feedback | Use | Phase |
| --- | --- | --- | --- |
| `haptics.success()` | Notification success | Rule since D68: once after every committed write confirmed by a success toast: deposit, withdrawal, entry edit, entry delete, goal created, goal saved, Pause, Resume, Reopen, goal deleted, currency changed; after Finish; when a challenge attempt becomes Completed while its screen is visible (Phase 13, D104: the quest card plays it when the entry was saved from Challenges and the entry form then skips its own; Start and Skip play none) | 07, 11, 13 |
| `haptics.warning()` | Notification warning | Once per submit when a save is rejected by a rule (negative running balance, future date, Free goal limit on Create/Reopen), together with the inline explanation | 07, 11 (06 adds the call once the helper exists) |
| `haptics.milestone()` | Impact, medium | Once per committed stage unlock, coalesced when several thresholds are crossed; the first 100% uses `success` instead because the souvenir moment is the same event | 10, 11 | Phase 10 (D85): Home's unlock moment plays it, and the entry form then skips its `success` for that commit (`unlocksStage`), so the action still has one haptic. Phase 11 (D96): when that commit also stores the goal's souvenir, Home plays `success` instead and the in-scene message reads "Your island is complete! / Its souvenir is now in your Collection."; a souvenir earned by a lower target shows the message with no Home haptic (the goal form already played `success`).
| `haptics.selection()` | Selection changed | Custom selection controls only: Home goal switcher, theme picker, challenge type choice; and each press on a bottom tab (owner request, D66, `screenListeners.tabPress` in `src/app/(tabs)/_layout.tsx`). Native `@expo/ui` pickers and switches already give system feedback, so do not add more | 08, 13, 17 |

Never: on other navigation (push, back, sheets), scrolling, every button tap, press-in, Skip, refused or failed actions (those get `warning` only for rule refusals), info toasts on their own, withdrawal or target-edit scene regression (no punitive feel), purchase or restore results (StoreKit has its own), animation frames or loops, or while the app is in the background. Fire after the commit, in the same place the confirmation toast is shown. One user action produces at most one haptic.

Implemented in Phase 07 (DECISIONS D62): `src/shared/ui/haptics.ts` exports `haptics.success/warning/milestone/selection` over `expo-haptics` ~58.0.7; ESLint allows `expo-haptics` only in that file, and Jest maps it to a recording fake. `success()` follows each committed deposit, withdrawal, entry edit and entry delete together with its toast ("Deposit saved", "Withdrawal saved", "Entry updated", "Entry deleted"). `warning()` plays once per submit refused by `negative_balance`, `negative_running_balance`, `balance_limit`, `future_date`, or the Free goal limit on Create Goal and Reopen (one goal in total since D74). Amount format errors, stale or closed-goal refusals and storage failures play nothing. The simulator has no Taptic Engine; the felt result is a physical-device check.

## Icons

Decided (DECISIONS D43): Saving Worlds uses **SF Symbols only**, so icons match iOS, scale with text and render the same weight as system UI.

- Tabs already use SF Symbols through NativeTabs (`house`, `flag`, `square.grid.2x2`, with `.fill` when selected).
- In-app icons use `expo-symbols` (`SymbolView`) behind one shared `src/shared/ui/icon.tsx` component and a semantic name map, created in Phase 06. Screens write `<Icon name="deposit" />`, never raw symbol names.
- Implemented in Phase 06: `<Icon name role tone weight accessibilityLabel? />`. Size is the `role`'s font size multiplied by the current font scale (`useFontScale` from `@/shared/layout`), `tone` is one of the AppText tones, and the icon is hidden from VoiceOver unless it gets an `accessibilityLabel`. `Button` takes an optional `icon`, `Notice` shows its tone icon before the title, and `TextField` errors use the `error` icon. ESLint allows `expo-symbols` only in `icon.tsx`.
- No icon fonts (`@expo/vector-icons` is not installed and should not be added), no custom SVG icon set, no emoji. The TextField warning glyph is replaced by the `error` icon in Phase 06.
- Island/Garden art, souvenirs and the app icon are not part of this system: world art follows ASSET_SPEC, and the app icon and splash stay Expo placeholders until Phase 19.5 (D114) replaces them with owner-approved art before the first preview build.

Rules:

1. Icons support text; they are hidden from VoiceOver by default. Meaning is always also in words (and color is never the only cue).
2. Icon-only buttons are limited to standard navigation/toolbar spots; they need an `accessibilityLabel` and a 44 pt target.
3. Color comes from semantic tokens (`textSecondary` for neutral, `actionPrimary` for actions, `success`/`error`/`info` for status, money colors only next to an amount with its sign).
4. Size follows the adjacent text role and grows with the user's text size (the base size multiplied by the current font scale); weight matches the text (regular or semibold).
5. Filled variants for status, outlined variants for actions. Every name must exist in SF Symbols 4 (iOS 16.4, the SDK 58 minimum).
6. **Icon tiles (owner choice D68).** Leading icons of list rows, form rows, History entries and empty states are `IconTile`s: the filled glyph (`FILLED_SYMBOLS`) in semibold on a small pastel rounded square, sized from the text role. Colors by meaning: blue History; honey Pause/Resume and withdrawals (warm, never an alarm color); green deposits, World, New goal and the default; red dates; neutral Edit; red Delete goal (destructive row); honey souvenirs. `ListRow` draws its `icon` as a tile (`iconColor`; destructive rows red, disabled neutral). Buttons, the header button and status badges use the same filled glyphs (D69); notices and toasts keep their status symbols, the tab bar its system symbols. A fully custom icon set remains possible later (with the Island artist, Phase 09) but needs a new decision.

Initial semantic map (extend only for a real repeated need):

| Name | SF Symbol | Where |
| --- | --- | --- |
| success / error / info | `checkmark.circle.fill` / `exclamationmark.triangle.fill` / `info.circle.fill` | Toasts, Notice, field errors |
| deposit / withdrawal | `arrow.down.circle` / `arrow.up.circle` | Transaction kind, history rows (with explicit sign/word) |
| history | `clock.arrow.circlepath` | History entry point |
| calendar | `calendar` | Date and deadline fields |
| pause / resume | `pause.circle` / `play.circle` | Goal lifecycle actions |
| delete / reopen | `trash` / `arrow.uturn.backward.circle` | Lifecycle, Collection (D74) |
| finish | `flag.checkered` | Finish action |
| lock | `lock.fill` | Locked global currency explanation; Read-only badge after a lost Pro entitlement (Phase 16) |
| reminder | `bell` | Weekly reminder setting |
| settings | `gearshape` | Settings entry |
| souvenir | `sparkles` | Collection souvenirs |
| pro | `star.circle` | Paywall and Pro-only entry points |
| edit | `pencil` | Edit goal row (Phase 07.5) |
| more | `ellipsis.circle` | Grouped goal options |
| chevron | `chevron.right` | Disclosure in navigating rows |
| milestone | `leaf.fill` | Next-milestone callout, New goal, empty Home |
| challenges | `flag` | Challenges empty state (matches the tab) |
| add | `plus` | "+ Add savings" on Home and History, New goal in the goal menu (Phase 08, D72-D73) |
| unlocked | `sparkles` | "New milestone unlocked!" message in the world (Phase 10) |
| goals | `square.stack.3d.up` | Paywall: unlimited goals (Phase 16) |
| switchWorld | `arrow.triangle.2.circlepath` | Paywall: switch worlds (Phase 16) |
| statistics | `chart.line.uptrend.xyaxis` | Paywall: savings at a glance (Phase 16; Statistics in 18) |
| restore | `arrow.clockwise` | Settings: Restore Purchases (Phase 16) |
| sparkle | `sparkle` | Twinkling sparkles over Home's empty Island (Phase 10) |
| currency / device | `banknote` / `iphone` | Reserved for Settings rows (Phases 14/19) |

## UX library plan

Researched 23 October 2026 against the locked SDK 58 (`expo/bundledNativeModules.json`) and npm. Each package is installed with `npx expo install` in the phase that first uses it, never ahead of time, and native ones need a new development build. Details and rejected options: DECISIONS D41.

| Package | SDK 58 version | Use in Saving Worlds | Phase |
| --- | --- | --- | --- |
| `@expo/ui` (installed) | ~58.0.22 | Native SwiftUI DatePicker for transaction and deadline dates, Picker for the global currency, ArrangementView for adaptive layout. Prefer it over `@react-native-community/datetimepicker`. | 03, 06, 07 (the Phase 14 reminder uses React Native's `Switch`, D108) |
| `react-native-keyboard-controller` | 1.22.7 | Not installed: Phase 03 found React Native's built-in `automaticallyAdjustKeyboardInsets` sufficient for FormScreen (DECISIONS D46). Reconsider only for a sticky footer above the keyboard. | (03, not needed) |
| `expo-symbols` | ~58.0.4 | SF Symbols in buttons, notices, toasts and rows; replaces the text warning glyph with a real symbol that follows Dynamic Type. | 06 |
| `expo-haptics` | ~58.0.7 | Light success haptic after a committed deposit/withdrawal and at milestone unlocks; selection feedback in pickers. Never the only feedback. | 07, 10 |
| `sonner-native` + `react-native-svg` | 0.27.0 (npm, MIT, updated Aug 2026) + 15.16.0 | Toast engine behind `src/shared/ui/toast.tsx`. Peers already installed except `react-native-svg`, which Phase 18 needs anyway. Honors Reduce Motion; does not announce to VoiceOver itself, so the wrapper does. | 06 |
| `expo-image` (installed, ~58.0.17) | ~58.0.16 | Layered Island/Garden scene images and Collection thumbnails: display-size decoding (`contain` + `enforceEarlyResizing`), `accessible={false}` decorative layers (D77). | 09 |
| `react-native-svg` | 15.16.0 | Toast icons from Phase 06; minimal 30-day chart in Phase 18. | 06, 18 |
| `expo-notifications` | ~58.1.6 | The single weekly local reminder. | 14 |
| `expo-iap` | 6.1.1 (npm) | StoreKit purchase/restore evaluation per D10. | 15 |

Not planned: `burnt` (last release March 2025, wraps old native toast pods; too stale for React Native 0.88), Lottie and Skia (D09; Reanimated covers planned motion), `expo-blur`/`expo-glass-effect` (the system bars already provide the material), `expo-font` (system font with Dynamic Type), `expo-store-review` (no rating prompt in v1.2 scope), any UI kit or second styling engine.

## Development component gallery

`src/dev/component-gallery.tsx` (on `FormScreen`) shows every text role, all button variants in normal/disabled/loading states (press and hold for pressed), a live loading demo, long labels, fields (hint, error, disabled, long label/error, multiline, focus by tapping), cards, amount samples, notices, toast demos (success, info, long text) and every semantic icon (Phase 06), the visual-direction primitives (display amount, progress bars, badges, grouped rows, empty state; Phase 07.5), and the semantic swatches with the current font scale. It is reached from Settings → "Component gallery (development only)" at `/dev-gallery`, a route in the Home stack wrapped in `Stack.Protected guard={__DEV__}`. The route file requires the gallery module only inside `if (__DEV__)`, so release bundles do not contain the gallery code; the release export check is in the Phase 02 evidence. Review large text by changing the simulator or device text size.

## Visual direction (Phase 07.5)

Approved by the owner on 23 October 2026 (DECISIONS D64): Home direction **A "Calm hero"** and the warm **honey accent**. Review, options and before/after screenshots: [PHASE_07_5 evidence](evidence/PHASE_07_5.md). The development mocks stay available at Settings → Development only → Home directions (`/dev-home?option=a|b|c`, `src/dev/home-directions.tsx`).

### Home composition (Phase 08 builds this on AdaptiveGoalLayout)

1. **Scene region** (primary): the world, full bleed since D80: the sky gradient fills the top of the screen edge to edge, from behind the status bar to just above the goal title, with no frame; before D80 it was a rounded (`radii.xl`) 4:3 box that measures itself (`WorldScene`, `src/features/worlds/world-scene.tsx`). Since Phase 09 it draws the approved layered Island art, framed to the art's tight viewport and fitted between the side gutters below the bars, as large as the width allows (D78, D80) and shown only once a stage's layers have all loaded, on the soft `sceneSky*` gradient (owner choice D79; the `sceneBackground` cream and no backdrop remain inspector options), with no text or icon inside the world; VoiceOver hears "Island world, n of 10 milestones unlocked" and the stage description. A broken manifest or image shows a short message in the region only (D77).
2. **Controls region** (secondary), top to bottom, gap `spacing.md`–`lg`:
   - Goal title (`title`) with a `StatusBadge` when paused and "Target reached" (success) at 100% or more, and the ⋯ goal menu at the trailing end (native SwiftUI `Menu`: History, Edit goal, Pause/Resume, Delete goal…, New goal; D73, Archive removed by D74); the Pro goal switcher as grouped rows under a `SectionHeader` (selection haptic on a change).
   - Saved amount as the largest text: `AmountText size="display"`, then "saved of {target}" in `textSecondary`.
   - `ProgressBar` (ten milestone segments, fill colored by range: honey, olive, soft green, strong green at 100%; D66), with the floored percent (`progressTextTone`) on the left and "{remaining} to go" on the right, or "{amount} over target" when overfunded (125% stays numeric, the scene stops at 10).
   - Next-milestone callout on `accentSurface` with the `milestone` icon: "Next: {stage name}" from the theme manifest (Phase 09; "Next milestone: {n}%" only for a theme without art) and "{amount} more to reach {n}%"; at 100% or more "Your island is complete!" / "You’ve unlocked every part of your world.", worded by theme (D83).
   - Savings plan (D84, replacing the D72 card and the D83 line; `src/features/goals/presentation/savings-plan-cards.tsx`), only when the goal has a deadline: `SectionHeader` "Savings plan", then two small KPI cards side by side (surface, `radii.lg`, hairline border, `spacing.md` padding; stacked above text scale 1.35). Deadline: calendar symbol, the date (headline) and "29 days left"/"Tomorrow"/"Today"/"Deadline passed". Savings needed: the remaining amount (headline) with one per-period amount ("€273.00 a week", only from 14 days; "€98.37 a month" from 60) and an info button for the calculation, or "Choose a new date in Edit goal" after the deadline, or "Target reached · Nothing more to save".
   - One primary action: **Add savings**, a full-width primary `Button` with the + symbol directly under the progress bar, before the next-milestone callout (owner decision D81; D72/D73's floating pill was removed). History has the same button above its entries.
3. **Settings** is a gear `HeaderIconButton` in Home's navigation bar. Home has no title: its bar is transparent with no hairline, so only the gear shows above the world (owner, D78; an exception to "one title" below).

Phase 08 completed this composition (DECISIONS D70-D73); Phase 09 replaced the temporary scene with the Island and added stage names (D77). Home without a goal shows the stage-0 Island as a frameless, decorative illustration above the empty-state text (D69). The owner's Home review with the real Island (D73) is pending; it decides the backdrop and which text/cards can go.

### World-first direction (owner, D73)

Saving Worlds should feel like a small game, not a finance app: the world first, the numbers second. Home holds only the world, progress, the next milestone, the deadline and "+ Add savings"; goal administration lives in the ⋯ menu (or a later goal detail screen). Phase 09 makes the real Island the star of the scene region and then reviews Home with the owner, expecting less text and fewer cards. Phase 10's milestone unlock moment (count-up, bar, stage reveal, new object, in-world "New milestone unlocked!", one haptic) is the app's signature moment. Do not polish cards before the Island exists.

### Shared look for later screens

- **One title.** The native navigation title names the screen; content never repeats it. Tab roots keep large titles; pushed screens use standard titles.
- **One primary action per screen** (filled button). Other actions are grouped rows (`ListGroup`/`ListRow`); destructive actions use the `destructive` button or row tone after a confirmation; Cancel in forms is a `plain` button with `centered`, directly under the primary button (D66).
- **Forms** (D67): a one-line context (goal name and saved amount) instead of a summary card; the money value as `TextField variant="amount"`; secondary inputs (date, note, deadline, world) as rows of one `ListGroup` card with the native pickers at the trailing edge; hints only where they add information (placeholders carry examples); the primary button, then a centered plain Cancel, then any destructive action. Save is visible without scrolling on the iPhone SE at default text with the keyboard down.
- **Sections** use `SectionHeader`; **lists** (History, Settings, Collection, Challenges history) use `ListGroup` with separators rather than separate bordered cards; read-only values are static rows, not soft cards that look tappable. Exception (Phase 11, D96): Collection's finished worlds are pressable surface cards with the still souvenir world, because the picture is the content; the detail uses `ListGroup` rows.
- **Empty states** use `EmptyState` on `Screen centered` (middle of the visible area, D69): what belongs here and how it fills, no "will appear here" copy. Since Phase 10 the picture floats gently (D85).
- **Status** words use `StatusBadge`; color never carries meaning alone.
- **Accent role.** `accent`/`accentText`/`accentSurface`/`progressTrack` and the four progress-range fills mark progress and milestones only. Money keeps `moneyDeposit`/`moneyWithdrawal`, actions keep `actionPrimary`, errors keep `error`. `accentDecorative` stays decorative.
- **Large text.** Every composition is checked at the largest accessibility size; anything with a fixed size next to text (rings, badges, icons) must scale with `useFontScale` or wrap. Option B's fixed ring failed this check, one reason it was not chosen.

Not changed: one forced light appearance (D37), system font, SF Symbols only, the Phase 02 palette for everything except the new accent roles.

## World-first design direction (owner, D97)

Decided by the owner on 25 October 2026, after Phase 11. It applies to every screen built from Phase 12 on, and to later polish of existing screens. It changes no product rule, scope or acceptance criterion. Home and the Island (Phases 08-10.5, approved in D83/D94) are the visual reference; **Home itself is not changed by this direction**.

### Philosophy

Saving Worlds is **a cozy savings game with useful financial tracking**, not a finance app with game graphics added on top. Every screen should make saving feel like growing something. Aim for cozy, warm and welcoming; playful but not childish; premium and polished; calm and motivating; simple; emotionally rewarding; and consistent across screens.

Usability, readability, accessibility and financial accuracy always win over decoration. Every number stays exact, readable and available to VoiceOver.

### Visual identity (reuse, do not reinvent)

| Element | Use | Where it comes from |
| --- | --- | --- |
| Warm cream background | Every screen | `canvas` |
| Deep forest-green text and actions | Titles, amounts, primary buttons | `textPrimary`, `actionPrimary` |
| Soft gold accents | Progress, milestones, souvenirs, celebration highlights | `accent`, `accentText`, `accentSurface`, `accentDecorative` (decorative only) |
| Pastel tiles | Row and empty-state icons | `IconTile` colors (D68) |
| Gentle gradients | Behind world pictures only | the `sceneSky*` gradient (D79) |
| Rounded white surfaces with a soft shadow | Cards that hold a world or a key number | `Card`, `radii.lg`, `elevation.card` |
| Illustrated worlds | The emotional content of Home, Collection, empty states, paywall and theme picker | the approved Island export (later Garden) through `WorldScene`; no new art required |
| Calm, purposeful motion | Feedback for what the person did | Reanimated, `WORLD_MOTION`, `AmbientFloat`/`AmbientSparkles`, `motion` tokens |

No new palette, font, icon set or styling engine. A new token still needs a repeated need and a contrast test (Conventions above). Challenges, Collection, the paywall, Statistics, Settings and every empty state use this same identity: the app is one world, not a set of templates.

### Patterns

1. **World pictures before icons.** When a screen or empty state has an emotional moment, show a world (`WorldScene`, `decorative` when text beside it says the same) before reaching for an icon tile.
   - Use the person's own goal world at its real stage when one exists, otherwise the stage 0 Island.
   - A picture never replaces a number or an action.
   - Plain icon tiles remain right for utility rows (Settings, History rows, lists).
2. **Empty states are invitations, not absences.** Each one:
   - says what will grow here and the one next step, in an encouraging sentence;
   - uses a world picture or the matching icon tile;
   - floats gently (`AmbientFloat`, D69);
   - offers at most one action.
   No "No data", no "Nothing here yet" as the whole message, no "will appear here". The owner's examples are the targets:
   - no goal: the empty Island as a starting point (exists);
   - no transactions: the world is waiting for its first savings;
   - no completed worlds: an undiscovered gallery of future worlds;
   - no available challenge: what the person can do next.
3. **Celebrate in place, once.** A celebration lives in the world or the card it is about (Phase 10's in-scene message, the souvenir moment). Never a toast, never a blocking modal, never required to continue.
   - One message, one announcement and at most one haptic per action (Haptics above).
   - Brief and dismissible.
   - Never replayed after a relaunch or retry.
   - Under Reduce Motion it is the final state and the words at once.
4. **Progress is shown, not scored.** Use the shared `ProgressBar` (honey → green, never red, D66), amounts and milestone names. Do not use points, XP, levels, streak counters, ranks, coins, badges collections or leaderboards (v1.2 section 8).
5. **Encourage, never shame.**
   - Missed or skipped things are neutral history: neutral badge tone, no red, no "failed", no countdown pressure.
   - Withdrawals and regressions settle quietly (D85).
   - Copy speaks to what the person can do next.
6. **Lists are galleries or grouped rows, never tables.**
   - Worlds (Collection, theme picker) are picture cards.
   - Secondary actions and facts are `ListGroup` rows.
   - No dense multi-column tables or KPI walls.
7. **Numbers in words first.** Where several amounts appear (Statistics, savings plan), lead with one clear sentence or headline amount, then supporting values. Charts are minimal, soft and accompanied by text (R19/R22).
8. **Utility screens stay calm.** Settings, forms and Pro restore are tidy grouped rows with the same tiles, tone and spacing. A small world touch is welcome only where it explains something (for example local data living on this iPhone). Never decoration that hides a control.

### Motion budget

- Continuous motion only while its screen is focused and the app is active, and never under Reduce Motion. Use `useAmbientMotion()` for scenes and `AmbientFloat` for pictures.
- At most one continuous ambient effect per screen besides empty-state floats. Lists of worlds stand still (D90), with one owner exception: Collection card worlds float slowly as a whole, out of step (3 pt over 4.4 s, D100), never pulse.
- One-shot motion (entrances, pops, count-ups, a sparkle burst on a completed card) is short (≤ ~600 ms per element, ≤ ~1.5 s overall), uses transforms and opacity, coalesces, and ends on the committed state.
- Button feedback stays the shared pressed states; no bounce on every tap.
- No SpriteKit, Skia (D86), Lottie, new native module or second animation engine without owner approval.
- No new Blender art unless genuinely necessary; reuse the Island export and its manifest (stage names, layers).
- Phase 21 measures the cost on a physical iPhone (D90); anything that costs too much is simplified, never kept at the price of battery or frames.

### Avoid

- Generic finance dashboards and corporate cards.
- KPI grids and excessive statistics.
- Repetitive identical lists.
- Template empty states.
- Productivity-app task lists (checkboxes, overdue red).
- Confetti storms, fireworks, screen shakes.
- Looping attention-seekers.
- Fake urgency, discounts or countdowns on the paywall.
- Gamification systems outside v1.2 (XP, levels, currencies, leaderboards, missions).
- Any visual that implies money was added when it was not.

### Per-screen direction (future phases)

| Screen | Direction | Phase |
| --- | --- | --- |
| Challenges (built, D104; polished D105: quest identities, selected card holds Start, tinted In-progress card, info button for rules, collapsible Past quests with "Ended"/"Skipped", finished-world hero at the target; D106: "Unlock the {unlock}" titles, delayed glide of the active bar) | A small set of quests for the selected open goal, not a task manager. One quest card per fixed type (First step, Next milestone, Weekly step), each saying what to do, why it helps the world and its availability in plain words. The Next milestone quest names the object it unlocks ("Bring the Pond to your island", from the manifest's stage name). The current attempt shows the shared `ProgressBar` and amounts from saved entries. Completion is celebrated in its card once (success haptic, D62/D68), never with new money. Past attempts are a calm `ListGroup` with neutral `StatusBadge`s (Completed success; Not completed and Skipped neutral). Empty and unavailable states (no open goal, goal closed, nothing available this week) are encouraging and say what to do next. | 13 |
| Weekly reminder (built, D108) | One Settings row ("Reminder" section) with the `reminder` tile (honey) and the native iOS switch (React Native `Switch`, D108), its time in the region's clock style ("Sundays at 6:00 PM" / "18:00"), and one explanation line under it that follows the state (off, on, resting without an active goal, waiting for permission, denied). Denied shows a calm info `Notice` and an "Open Settings" button; never red. Toasts "Reminder turned on"/"Reminder turned off" with the success haptic. Notification text is the owner-approved copy (D110): "A little progress goes a long way 🌱" / "Ready to grow your world? Check in on your savings this week.", with no amount or goal title (R17). | 14 |
| Pro paywall | World-first and honest. A hero with the person's own world at its actual stage, never replaced by Garden art (D121); from Phase 17 a compact completed-Garden preview from the registry, smaller than the hero and marked as a Pro benefit, without lengthening the paywall noticeably; the "Build another world" message (D74 copy). The exact included features as a short list with tiles; the store's localized price; one primary purchase button; Restore as a plain button; the footnote "One-time purchase. No subscription." No comparison tables, discounts, timers or pressure. Every purchase state has calm in-place text, never a toast (D40). Built in Phase 16 (D117, polished by D125: "Unlock more worlds", four short feature lines, the purchase block as a pinned footer that moves into the content at large text sizes, no Restore explanation on the paywall): still hero world at its current stage, "Build another world" intro with Explore Pro inside the goal form, offer with four feature tiles, Buy with the store price, Restore plain, Not now; read-only goals show a neutral Read-only badge and one sentence. | 16 |
| Theme picker | Island and Garden previews drawn by `WorldScene` at the goal's current stage, as picture cards with the selection haptic. Switching is a brief crossfade on Home; never a replay of milestones. A locked Garden goal is explained kindly (D75). Without Pro, Garden is still shown as a picture card with a small neutral lock mark and "Pro" label; tapping it opens the Pro paywall and returns to the picker unchanged; no animation, pop-up or repeated prompt (D122). Built in Phase 17 (D129): `ThemeCards` radio picture cards (completed worlds in Create, the goal's stage in `/theme-picker`), locked card = button with lock + "Pro", stacked above text scale 1.35; selection haptic on the pick, the shared toast on commit (no second haptic); 450 ms Home crossfade. | 17 |
| Statistics (built, D131: "Savings insights", headline total, This month cards, soft honey→green line with summary and collapsible daily list, Completed goals → Collection) | "Your savings at a glance", not a dashboard. The all-goal total as the headline; this month's deposits and withdrawals in one sentence or two small cards like the savings plan (D84); one soft 30-day line in the accent/green ramp with a text summary and data list; the completed-goal count, linked to Collection (it counts goals whose status is completed, never souvenirs, R19). Exactly the four views. | 18 |
| Collection (built, D98-D101; detail summary D112: no tab bar, "{World} completed", "yours to keep", saved now, Earned / Target when completed / Target now only when changed, open status only) | A gallery of achievements: intro line "Every world tells a story of something you achieved.", a featured card for a single world, two measured columns for several, still-picture worlds that float slowly (D100), subtle 1 pt gold frames on completed worlds, captions "Island · {date}". The detail is Home-like (full-bleed sky, D99) with the achievement first (status, saved amount, "Island completed on {date}") and Reopen/Delete. | 11 |
| Settings and secondary screens (Settings built and approved, D110-D111: Preferences, Reminders, About; one short line per card with details behind an info button (`FootnoteWithInfo`); no tab bar on Settings; diagnostics development-only) | Grouped rows with tiles, one calm explanation per topic (local data on this iPhone, currency lock, Restore Purchases returns Pro only). Same title, spacing and tone as the rest. Phase 19 audits every screen against this section. | 19 |
| App Store material | Screenshots show the real app in this direction (worlds first, honest numbers); no mock features. | 22 |

### Proposals awaiting owner approval

Proposals become part of the app only once the owner approves them. V01-V04 and V09 were approved and built in Phase 11 (D98); V08 was replaced by owner-approved copy (D110); V05-V07 are still open. Each would change an existing, already-accepted screen or add visible behavior. Defaults if not approved: leave as is.

| ID | Proposal | Affects | Notes |
| --- | --- | --- | --- |
| V01 | Collection empty state as an "undiscovered gallery": the stage 0 Island (existing asset), softly faded, with copy about future finished worlds, instead of the sparkle tile. | Phase 11 Collection | Copy only plus an existing picture; no new art. **Approved and built (D98).** |
| V02 | A subtle completion effect in Collection: a short one-shot sparkle (`AmbientSparkles`) over a souvenir world when its detail opens, and a thin gold (`accentDecorative`) frame on completed cards. | Phase 11 Collection | No stored "seen" state; plays on each focus of the detail, off under Reduce Motion. **Approved and built (D98).** |
| V03 | History's empty state: the goal's own world at stage 0 with "Your island is waiting for its first savings", instead of the clock tile. | Phase 07 History | Existing screen. **Approved and built (D98).** |
| V04 | Home's empty state while Free's one goal is finished: title "Your world is finished" (instead of "Start a new goal"). | Phase 11 Home empty state | Owner said not to change Home without a request. **Approved and built (D98).** |
| V05 | Next milestone quest cards show a small crop of the object they unlock, cut from the existing manifest layer bounds. | Phase 13 | New rendering code (a cropped layer view); otherwise the quest names the object in words only. |
| V06 | Paywall hero uses the person's own current world plus the Garden preview. | Phase 16/17 | Confirmed by the owner (D121): the current world stays the main hero (built in Phase 16); Phase 17 adds the compact completed-Garden preview once the Garden export is in the registry. Until then Garden is described in words. |
| V07 | Statistics wording "finished worlds" for the completed-goal count, with a link to Collection. | Phase 18 | The count stays status = completed (R19). |
| V08 | Weekly reminder notification text "Your world is ready for this week's savings." | Phase 14 | **Replaced by owner-approved copy (D110):** title "A little progress goes a long way 🌱", body "Ready to grow your world? Check in on your savings this week." |
| V09 | Onboarding opens with the finished Island (still, decorative), the world a goal grows into. Redesigned by D132: three steps, the Island on a full-screen sky. | Phase 06 onboarding | **Added by the owner review, approved and built (D98).** |

## Change policy

Later feature phases reuse this system. Update this document when values or conventions change. Recheck contrast and affected screens after palette edits; preserve independent adaptive-layout and world-asset contracts.
