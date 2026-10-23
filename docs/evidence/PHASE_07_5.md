# Phase 07.5 evidence: visual direction and design review checkpoint

- Session date: 23 October 2026. Phase state: **VERIFIED COMPLETE** (owner chose Home direction A and the honey accent; all acceptance checks below have evidence).
- Source: `main` at 73d14d3 plus this session's uncommitted working tree (no commit made in this session).
- Build: EAS development simulator build a8045c3a-2238-4043-9983-f522e1f2fd0b (Phase 07), JS served by Metro (`expo start --dev-client`, port 8081, already running). No native, dependency or config change in this phase, so no new build, no update publication and no store action. Runtime 1.0.0, schema 1 unchanged.
- Devices: iPhone SE (3rd gen) iOS 18.5 (small), iPhone 17 Pro Max iOS 26.1 (large), iPhone Duo iOS 27.1 open (inner display, portrait) and closed (outer display; Device Hub left it in landscape). Text sizes: default (`content_size large`) and largest (`accessibility-extra-extra-extra-large`), set with `xcrun simctl ui`.
- Owner decisions this session: D64 (Home direction A "Calm hero", honey accent). Engineering record: D65.
- TEST_PLAN: T21 (palette/contrast/large text), plus the existing ledger and navigation integration tests as regression.

## How the screenshots were taken

Screens were opened by deep link (`xcrun simctl openurl … savingworlds://<route>`), captured with `xcrun simctl io … screenshot` (Duo: `--display` with the inner or outer display ID) and stored as 1000-px JPEGs. Sample data was entered through the real forms on each simulator (SE: RSD "Summer trip" 1,500.00 with a 450.00 deposit and a 120.00 withdrawal; Duo: RSD "New bike" 800.00 with a 250.00 deposit; 17 Pro Max: the Phase 07 paused RWF goal). The floating gear "Tools" bubble in the screenshots is the Expo development client, not app UI. While the Duo is open, simulator input goes to the dark outer display, so the Duo goal was created while closed.

## Review of the current screens (before)

Before screenshots: [`phase-07-5/before/`](phase-07-5/before/) (70 files). Naming: `<device>-<text size>-<nn>-<screen>.jpg` with device `se`, `pm` (17 Pro Max), `duo-open`, `duo-closed`. Covered: onboarding/currency (SE), Home empty and with a goal (active and paused), Create/Edit Goal (with and without a deadline), Add savings and Edit entry sheets (also with the keyboard up), History (empty and with rows), Settings (unlocked and locked currency), Challenges and Collection shells, toasts ("Goal created", "Deposit saved").

Weaknesses found:

1. **Duplicated titles.** Settings, Challenges and Collection repeated the native large title as an in-content title ("Settings" twice, `se-default-10`, `se-largest-09`).
2. **Home is a stack of buttons.** Add savings, History, Edit goal, Pause/Resume and Archive were five full-width buttons of nearly equal weight, followed by the Free-limit notice, a Settings text button and two development links (`pm-default-13`, `se-default-11`). Archive looked as important as History; nothing was grouped.
3. **No visual progress and weak hierarchy on Home.** The saved amount sat inside a card with four lines of similar-weight text ("22% · RSD 1,170.00 to go"); no progress indicator; at the largest text size the actions started three screens down (`se-largest-13`).
4. **Settings in the content.** On iOS 26 the Settings text button sat under the floating tab bar until scrolled (`pm-default-13`).
5. **Free-limit notice always shown** as a large blue notice under Home whenever one goal existed: information, not an alert.
6. **Deadline label shown twice.** SwiftUI's inline "Deadline" label sat beside our own "Deadline (optional)" header (`se-default-04`, `pm-default-16`).
7. **Placeholder copy.** "Reminder and local-data settings will appear here.", "Souvenirs from finished worlds will appear here.", "Fixed savings challenges and their results will appear here." (`se-default-08/09/10`).
8. **Settings structure.** "Currency" appeared twice (card heading and picker label); "Change currency" rested as a disabled button; build information was an unlabelled card of label/value pairs; development links were loose text buttons.
9. **Read-only values styled like controls.** The goal form's "World: Island" was a soft card that looked tappable; Cancel was a second full-width outlined button competing with Create goal.
10. **Delete entry looked like Cancel.** A plain secondary button, no destructive cue.
11. **History rows as separate bordered cards**, which reads busier than one grouped list; empty history was two lines of text.
12. **Toast covers the back button.** sonner-native ignores the safe area when an offset is given, so the toast sat 52 pt from the top of the screen, over the navigation bar and Back for about 4 s (`se-default-12`).
13. **Color.** Forest green on cream only; the gold accent was decorative and unused; the only other color was the blue Free notice. No warm color with a role.
14. **Header consistency.** Pushed screens mixed large (Settings) and standard (History) titles.
15. Carried, not changed here: dates in our own text use the language tag while native pickers use the region ("Oct 23, 2026" next to "23. 10. 2026."; Phase 19).

## Home direction options

Development-only mocks at `/dev-home?option=a|b|c[&sample=paused]` (Settings → Development only → Home directions), `src/dev/home-directions.tsx` with `src/dev/placeholder-scene.tsx`, on `AdaptiveGoalLayout` with fixed sample values (EUR 330.00 of 1,500.00, stage 2) and a crude labelled placeholder scene. Every action is inert ("Mock only" toast). Screenshots: [`phase-07-5/mocks/`](phase-07-5/mocks/) (21 files: three options × SE, 17 Pro Max, Duo open at both text sizes; option A on the closed Duo; option A scrolled on the 17 Pro Max).

| Option | Composition | Observed |
| --- | --- | --- |
| A · Calm hero | Scene, goal title + status badge, display-size saved amount, 10-segment progress bar with percent and remaining, next-milestone callout, deadline line, Add savings, grouped rows (History, Edit goal, Pause or archive) | Reads well at the largest size (amount wraps, nothing clips) |
| B · Progress ring | Summary card with a % ring beside the amount, milestone dots, callout, Add savings, three tiles | The fixed 88-pt ring did not scale with text; at the largest size "22%" overflowed it (`se-largest-option-b`) |
| C · Ledger first | Three stat tiles, 10-step bar, Add savings + History side by side, text links for Edit/Pause/Archive | Most compact; lifecycle links small and easy to miss |

Common to all: Settings as a gear in Home's navigation bar; one primary action. On the SE the stacked fallback gives the scene up to 45% of the visible height, so Add savings starts below the fold at default text in every option (`se-default-option-a`); Phase 08 must check this with the real scene.

**Owner choice (23 October 2026): option A "Calm hero", with the honey accent for progress and milestones** (DECISIONS D64).

## Polish applied (after)

After screenshots: [`phase-07-5/after/`](phase-07-5/after/) (75 files), same naming, on SE, 17 Pro Max, Duo open and Duo closed at default and largest text, plus `se-default-15b` (destructive Delete), `se-default-18` (toast below the bar) and `se-default-19` (goal form with the keyboard up).

| Weakness | Change | Evidence |
| --- | --- | --- |
| 1 duplicated titles | In-content titles removed from Settings, Challenges and Collection; sections use `SectionHeader` | `*-17-settings-locked`, `*-08-challenges`, `*-09-collection-empty` |
| 2, 3 Home button stack / hierarchy | Direction A without the scene: title + Paused badge, display amount, `ProgressBar` with percent (accent) and remaining, deadline line, one primary Add savings, then `ListGroup` rows: History (entry count) and Edit goal; Pause/Resume and Archive… in a second group (both still one tap; Archive keeps its confirmation) | `*-13-home-goal` |
| 4 Settings placement | Gear `HeaderIconButton` in Home's navigation bar (`headerRight`) | `pm-default-13-home-goal`, `duo-open-default-13-home-goal` |
| 5 Free notice | One footnote line under the groups (same text) | `pm-default-13-home-goal` |
| 6 deadline label | `labelsHidden()` on the deadline DatePicker (as the entry date, D61) | `*-16-edit-goal` |
| 7 placeholder copy | `EmptyState` on Challenges (what challenges are), Collection (what moves there), empty History and empty Home; Settings placeholder line removed | `*-08`, `*-09` |
| 8 Settings | Current currency as the card's heading; Change appears only after picking a different currency; "About this build" and "Development only" as grouped rows; standard (non-large) title like other pushed screens | `*-17-settings-locked` |
| 9 forms | World shown as a static row under a "World" label; Cancel is a plain button in both forms | `*-03-new-goal-sheet`, `*-16-edit-goal` |
| 10 Delete entry | New `destructive` Button variant | `se-default-15b-edit-entry-delete-destructive` |
| 11 History | Rows inside one `ListGroup` with separators; `EmptyState` when empty | `*-14-history` |
| 12 toast over Back | Toaster offset = top safe area + 44 + 8 pt (`toastTopOffset`) | `se-default-18-toast-below-nav-bar` |
| 13 color | Honey accent with a role (progress fill, milestone markers, accent label, callout surface) | `*-13-home-goal` |
| 14 headers | Tab roots keep large titles; pushed screens (Settings, History, Details) use standard titles | — |

Development links (Open details, sample form) moved from Home to Settings → Development only. No product behavior, calculation, persistence, navigation destination or capability rule changed; the ledger form (draft, operation IDs, in-flight guard, toast + haptic only after commit) is unchanged except the Delete button's style.

## Verification

| Check | Environment | Result | Detail |
| --- | --- | --- | --- |
| Baseline `npm run lint`, `npm run typecheck`, `npm test -- --runInBand` | host, before changes | PASS | 22 suites, 565 tests |
| `npm run lint` | host, final | PASS | `expo lint --max-warnings 0`, exit 0 |
| `npm run typecheck` | host, final | PASS | `tsc --noEmit`, exit 0 |
| `npm test -- --runInBand` | host, final | PASS | 22 suites, 584 tests (contrast suite 73 tests incl. 18 new pairs; toast placement test; updated Home/History/Settings/navigation assertions) |
| Contrast of every new or changed pair | `tests/unit/contrast.test.ts` | PASS | accent fill ≥ 3:1 on canvas/surface/surfaceSoft/accentSurface/progressTrack (4.17/4.60/3.86/3.74/3.69); accentText ≥ 4.5 on the same surfaces (5.23/5.77/4.84/4.69); text on accentSurface 10.62/5.00; destructive label 6.54, pressed 5.61, outline 5.93/6.54; badge labels 5.94/5.89/5.16 |
| Release export `npx expo export --platform ios` | host | PASS | Hermes bundle: "Calm hero", "Placeholder art", "Mock only", "HomeDirections", "home-directions", "placeholder-scene", "Visual direction primitives", "Text roles", "dbtest-report", "Development only" all 0. Present only as guarded route titles in stack layouts (as before): "Home directions", "Layout lab", "Component gallery", "Database tests", "Sample form". Product strings ("Small steps toward a goal", "Nothing here yet", "About this build", "Entry updated") present |
| Before screenshots, device matrix | SE 18.5, 17 Pro Max 26.1, Duo 27.1 open + closed; default + largest | PASS | 70 files; closed Duo only in landscape (Device Hub pose as left by the owner; rotation not scriptable) |
| Mock screenshots | same matrix (closed Duo: option A) | PASS | 21 files |
| After screenshots, device matrix | same matrix | PASS | 75 files; no clipped amounts or controls at the largest size; all actions scroll-reachable |
| Keyboard after polish | SE, Edit goal, target field focused | PASS | form scrolls above the keyboard; Save changes and Cancel reachable (`se-default-19`) |
| Toast placement | SE, Edit entry → Save changes over History | PASS | "Entry updated" below the bar; Back ("Home") visible (`se-default-18`) |
| Committed write still confirms once | SE | PASS | one "Entry updated" toast after the commit; Jest ledger/goal UI suites unchanged in behavior |
| Inset/state preservation | Jest (`adaptive-layout`, ledger window sequence) | PASS | layout layer untouched; native rotation/fold with a draft remains the D63 physical-device/Duo gate |
| VoiceOver of the new rows, badges, progress bar, header button | — | NOT RUN (gate) | No VoiceOver in the iOS Simulator; covered by the existing physical-device gate (D60/D63, Phase 19/21). Jest checks roles/labels (`progressbar` with value, row labels "History, 2 entries", "Settings" header button) |
| `npm run deps:check`, `npm run doctor` | — | NOT RUN (not applicable) | No dependency or native change in this phase |

## Files changed

- Theme: `src/shared/theme/palette.ts` (honey600, honey800, sand100, sand200), `tokens.ts` (`accent`, `accentText`, `accentSurface`, `progressTrack`, `typography.display`, `radii.xl`).
- New shared UI: `src/shared/ui/progress-bar.tsx`, `list-row.tsx` (`ListGroup`, `ListRow`), `section-header.tsx`, `status-badge.tsx`, `empty-state.tsx`, `header-button.tsx`. Changed: `app-text.tsx` (`accent` tone, exported `toneColors`), `icon.tsx` (edit, more, chevron, milestone, challenges, currency, device; shares `toneColors`), `amount-text.tsx` (`display` size), `button.tsx` (`destructive`), `toast.tsx` (`toastTopOffset`).
- Screens (presentation only): `src/features/goals/presentation/home-screen.tsx`, `closed-goals.tsx`, `goal-form-screen.tsx`, `deadline-field.tsx`; `src/features/ledger/presentation/history-screen.tsx`, `entry-form-screen.tsx`; `src/features/settings/presentation/currency-settings.tsx`; routes `src/app/(tabs)/(home)/_layout.tsx`, `settings.tsx`, `(challenges)/challenges.tsx`, `(collection)/collection.tsx`.
- Development only: `src/app/(tabs)/(home)/dev-home.tsx`, `src/dev/home-directions.tsx`, `src/dev/placeholder-scene.tsx`, gallery section in `src/dev/component-gallery.tsx`.
- Tests: `tests/unit/contrast.test.ts`, `tests/integration/toast-and-icon.test.tsx`, `goal-ui.test.tsx`, `ledger-ui.test.tsx`, `navigation.test.tsx`.

## Owner follow-ups after the review (D66)

The owner asked for four changes after seeing the result; all applied the same session.

| Request | Change | Evidence |
| --- | --- | --- |
| Progress color by range (one color to 30%, another to 60%, light green to 99%, strong green at 100%) | `progressFillColor`: honey < 30%, olive 30-59%, soft green 60-99%, strong green ≥ 100%; percent text accentText < 60%, success from 60%. No red/orange. 16 fill pairs + 1 text pair in the contrast test | `after/se-default-20-progress-colors-by-range.jpg` (22/45/80/105% in the gallery) |
| Cancel sat unnaturally far left at the bottom of Add savings and the goal form | First moved to the sheet header; the owner preferred a centered plain Cancel directly under the primary button (Button `centered`), disabled while saving | `after/se-default-22-cancel-centered.jpg` |
| Haptics on the bottom tabs | `haptics.selection()` on `tabPress` unless prevented | `tests/integration/tab-haptics.test.tsx` (2 tests); the simulator has no Taptic Engine, felt check is Phase 19 on a device |
| An error toast | `error` tone with a message line (≥ 6 s); Pause/Resume/Archive/Reopen failures use it instead of inline notices; forms stay inline | `after/se-default-21-error-toast.jpg` (gallery demo); Jest: Reopen at the Free limit shows "Goal not reopened" + explanation and one warning haptic |

Checks after these changes: `npm run lint` PASS, `npm run typecheck` PASS, `npm test -- --runInBand` PASS (23 suites, 612 tests; contrast 95 pairs). After D68: 23 suites, 617 tests; contrast 100 pairs.

## Forms redesign (D67)

Owner asked to redesign the two forms in the same direction. Screenshots: [`phase-07-5/forms/`](phase-07-5/forms/) (Add savings, Edit entry, New goal, Edit goal on SE, 17 Pro Max and Duo open at default and largest text; plus `se-default-add-savings-keyboard` and `se-default-deposit-saved`).

| Check | Result |
| --- | --- |
| Save and Cancel visible without scrolling, SE default text, keyboard down | PASS (`se-default-add-savings`, `se-default-edit-goal`) |
| Largest text: amount fully visible | First FAIL: the display-size target showed "1…" (`pm-largest-edit-goal`, first capture). Fixed: title size above font scale 1.35, code wraps under the number. Then PASS |
| Native deposit through the new form (SE: 25 → Save deposit) | PASS: ledger 3 entries, balance 355.00, one "Deposit saved" toast, Home updated |
| Focus outline on the amount field with the keyboard up | PASS (`se-default-add-savings-keyboard`) |
| `npm test -- --runInBand` | PASS, 23 suites, 612 tests (one deadline-copy assertion updated) |
| Closed Duo forms | NOT RUN for the redesigned forms (Device Hub pose needs the owner); the old forms were captured closed earlier |

## Icon style and success haptics (D68)

- Haptics: one success haptic after each committed write with a success toast (goal created/saved, Pause, Resume, Archive, Reopen, currency changed, plus the existing ledger writes). Jest `goal-ui` asserts the sequences (created + paused, + archived; created + archived + reopened; currency changed) and a warning on the refused Reopen. Felt on device: Phase 19.
- Icons: dev comparison of A outline / B soft tiles / C solid tiles on the 17 Pro Max ([`mocks/pm-default-icons-a/b/c.jpg`](phase-07-5/mocks/)). Owner chose **B**. Applied through `IconTile` and `ListRow iconColor`; after screenshots on SE and 17 Pro Max were retaken, and the closed Duo was captured in **portrait** this time (`after/duo-closed-*`, `forms/duo-closed-*`).
- Incident: the Duo locked itself during a capture run, so `simctl openurl` failed (error 115) and the open-Duo after/forms screenshots were overwritten with black frames; the Duo was unlocked and the closed set retaken. The owner then reopened the Duo and the open set (`after/duo-open-*`, `forms/duo-open-*`) was retaken in landscape; every file checked non-black.

## Filled button symbols and centered empty states (D69)

- Buttons (Add savings, Save deposit, error/info notices unchanged), the Home Settings gear and status badges use the filled glyphs.
- Empty states on Home (no goal), Challenges and Collection are centered in the visible area. Two measuring approaches failed on the SE (iOS 18.5): `measureInWindow` ignores the scroll inset (probe at 16 pt instead of about 132), and a never-adjusted scroll view with a native SafeAreaView placed it low; the shipped approach uses 75% of the viewport (`centeredContentHeight`, unit-tested). Screens: `after/*-08-challenges`, `after/*-09-collection-empty`.
- Animated empty states and any Skia use are scheduled in the Phase 10 prompt and roadmap (Phase 09 supplies the stage-0 Island illustration).
- After shots retaken on SE, 17 Pro Max and the open Duo (landscape: no bottom bar, so the empty state sits slightly high, as expected). The closed-Duo shots (`after/duo-closed-*`, `forms/duo-closed-*`) predate D69 and still show outline symbols in buttons; the layouts are otherwise current.

## Limitations and follow-ups

1. Closed Duo was captured in landscape only (the pose Device Hub was in); Device Hub exposed no Accessibility controls this session.
2. On the SE the stacked fallback scene (≤ 45% of the visible height) pushes Add savings below the fold at default text. Phase 08 must keep Add savings reachable with the real scene region (named in the Phase 08 prompt).
3. The next-milestone callout, the scene and deadline estimates are Phase 08/09 work; Home now shows the same numbers as before in the new composition.
4. A deep link to `/goal-form` still opens the New goal sheet when the Free slot is taken (the command refuses the save with its inline explanation); unchanged Phase 06 behavior.
5. Date formats (language tag vs. region) unchanged: Phase 19.

Next prompt: [`docs/prompts/PHASE_08.md`](../prompts/PHASE_08.md).
