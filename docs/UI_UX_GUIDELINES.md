# UI and UX guidelines

The world is the main emotional reward, and the savings ledger must remain readable and dependable. Use a calm English interface, comfortable touch areas and short factual feedback. The [MVP plan v1.2](Saving_Worlds_MVP_Plan_v1_2.docx) and its [normalized requirements](PRODUCT_REQUIREMENTS.md) govern feature scope; these guidelines propose interaction details rather than new paid features.

## Shared foundation

[DESIGN_SYSTEM](DESIGN_SYSTEM.md) owns the chosen palette, semantic tokens, native controls and StyleSheet conventions from Phase 02. [ADAPTIVE_LAYOUT](ADAPTIVE_LAYOUT.md) owns global screen/inset/container behavior from Phase 03, including iPhone Duo. Every feature UI phase adopts those modules; no device-model width switches, duplicated palette constants or screen-ratio font scaling.

Native Stack/NativeTabs remain the navigation owner as available window geometry changes. Forms use the shared scroll/keyboard/inset contract, and scene/financial regions use the adaptive layout contract. A fold, split-view change, rotation or native sheet re-presentation must preserve route, selection, transaction draft and operation ID. Device verification includes Duo outer/open/partial-fold configurations and asymmetric horizontal safe areas, with unavailable checks recorded honestly.

## Navigation and screen contracts

Use three main destinations: Home, Challenges and Collection. Settings is reachable from Home. Pro statistics opens from Home; it does not need another permanent tab. Home includes a goal switcher for multiple goals. Push detail screens and present focused forms modally where dismissal/cancel behavior is obvious. Preserve unsaved input on recoverable write failures; confirm destructive abandonment only for meaningful edits.

| Screen | Required content and actions | States and checks |
| --- | --- | --- |
| Introduction | Short manual/local-tracking explanation and one global currency selection | Continue after valid currency; no account/purchase/notification wall. |
| Home | Selected open goal, current scene, balance/target, percentage, remaining, next milestone, Add savings, Withdraw, History, Pause/Resume, Archive, Finish at >=100% | Empty/loading/paused/achieved/overfunded/error. Reaching 100% awards a souvenir without changing status. Amount stays accessible if scene fails. |
| Create/Edit Goal | Name, positive target, optional today/future deadline, available theme; global currency shown read-only | Free count active+paused<=1; closed goal cannot edit until Reopen. No goal currency picker or whole-goal delete action. |
| Add/Edit Transaction | Shared Home/Challenges form: positive amount, deposit/withdrawal kind, local date default today, optional note, explicit save | Reject future dates/negative chronological subtotals; stable retry ID, confirmed deletion, error preserves input. No audit history or separate challenge deposit. |
| History | Current dated signed entries and notes; edit and confirmed delete for open goals | Deterministic display; closed history is read-only until Reopen. No corrected/voided audit labels or previous-entry versions. |
| Challenges | First step, Next milestone, Weekly step; one unfinished attempt per goal and historical results | Same for Free/Pro; eligibility and frozen attempts from DATA_MODEL. Skip/history and shared Add savings. No custom form, challenge pause, amount/frequency editor or notifications. |
| Collection | Permanent unique souvenirs and completed/archived goal views with distinct labels | First saved >=100% gives one souvenir even Free. Finish closes separately. Reopen checks limit and sets active without auto-Finish; closed goals remain read-only. Souvenir survives regression/edit. |
| Statistics | One Pro screen: all-goal current total, current-month deposits/withdrawals, total daily balance for last 30 days, count status=completed | One global currency; include archived ledger and prior-window opening balance. No per-goal chart/currency selector. Provide text alternative. |
| Theme picker | Island/Garden previews and simple Pro selection/change on open goals | Preserve ledger/stage/souvenir. Closed goals require Reopen. No future-theme ownership promise. |
| Pro paywall | Lifetime wording, exact included features, store price, purchase and restore | Loading products, unavailable/offline, pending, cancelled, success, error, already owned. Cancel returns to prior task. |
| Settings | One global currency with lock explanation; single weekly reminder switch; motion, Restore Purchases, data/privacy/support | Currency editable only with no transaction and no souvenir; permitted change covers empty goals with no conversion. Reminder Sunday 18:00 device time only while an active goal exists. No backup/export/import button. |

Pro paywall copy names only unlimited open goals, Garden and open-goal theme switching, and the four precise statistics views. The three fixed challenges are identical in Free and Pro. Use the localized store price, never a guessed euro amount. Do not imply all future premium themes are included.

## Visual language and scene behavior

Use soft natural colors, readable neutral text, rounded controls and restrained shadows. The cozy art may be pastel; financial labels and controls must meet contrast requirements. Use semantic tokens for surface, text, primary action, deposit, withdrawal, error and focus. Product color customization is out of scope.

Home should give the scene meaningful space without pushing Add savings or the saved amount off small screens. Keep the world in a consistent aspect ratio and anchor; prefer composited local images to a 3D camera. Every stage must read as a coherent scene. Island's 80% house upgrade replaces the smaller house. See [asset specification](ASSET_SPEC.md).

Confirm a financial write with updated text immediately after commit. A small deposit that crosses no milestone still gets gentle numeric/progress feedback. Unlock animations should be brief and coalesce multiple thresholds. Withdrawals quietly settle to the lower stage with factual wording such as “Your world now reflects your current savings.” Do not use shame, damage, punitive effects or loss of transaction history.

Theme switching keeps the same current stage and progress; never replay ten fake deposits. Completion celebration is dismissible and never required to navigate. The finished world in Collection describes when it was completed and, if needed, distinguishes its snapshot target from the goal's current target.

## Forms, numbers and dates

Always show currency code when a symbol could be ambiguous. Use locale-aware formatting with the global currency's exponent. Keep raw text while typing; validate without fighting the decimal keyboard. Label withdrawals explicitly. Explain that the app tracks money the user records and cannot perform a real payment.

Show overfunding accurately, for example €2,100 saved of €2,000 and 105%; the world remains complete. Deadline suggestions explain “If you start today” and are alternative weekly/monthly estimates. Overdue is informational, not a failed streak. Started money-target challenges keep their frozen target and stored period; the UI offers no amount/rule/frequency editor.

## Accessibility and localization

Target at least 44 by 44 point actionable areas. Honor Dynamic Type and system font scaling without clipping amounts or buttons. Test VoiceOver order, labelled inputs, focus after modal dismissal, and announcements after successful financial writes. Do not announce each animation frame or every intermediate milestone. Scene art can be one labelled image with textual stage and next milestone descriptions; decorative layers are excluded from the accessibility tree.

Honor OS Reduce Motion and an optional additional reduce-animation preference. No paid tier gates accessibility. Provide chart summaries and a data list; use labels/patterns as well as color. Use WCAG AA contrast as a test target, including at least 4.5:1 for normal text and 3:1 for large text and necessary graphical controls.

All visible strings, plurals, accessibility names and errors go through a small English catalog. Keep layout ready for longer text and right-to-left direction without claiming translated languages at launch. Format civil dates and currencies through shared helpers. Test en-US and another numeric/date locale plus enlarged text even when all UI strings are English.

## Privacy and feedback

Notification permission appears only after enabling the one global Sunday 18:00 weekly reminder in Settings. Default lock-screen content is generic and contains no savings amount or goal title. Denial has a usable Settings path and does not block saving.

Settings states that deletion or loss of the device may permanently remove local savings data and the app cannot restore it. OS backup behavior is not an app recovery promise. Restore Purchases restores Pro rights rather than goals. Never advertise cloud sync or manual backup in release 1.0. Error messages expose no SQL/receipt internals and keep enough detail to retry. Support diagnostics use redacted codes.

## OTA behavior visible to users

A compatible update may download after launch, but the current app remains usable and a new bundle activates on a later normal start. Do not add a blocking checking-for-updates screen, mandatory Update Now flow or forced reload during entry, saving, challenge transaction entry or purchases. In airplane mode the embedded/cached app and both shipped themes remain available.

Settings/support may show redacted app/build/runtime/update identifiers, with an embedded-build label when appropriate. Data/privacy explanation distinguishes update-service requests from device-local savings; audit actual metadata rather than promising zero network communication. Restore Purchases still restores rights, not goals, and OTA rollback is not a data backup. See [EAS_AND_OTA](EAS_AND_OTA.md).

## UX acceptance record

For each implemented screen capture the build/device, normal and error states, largest supported text size and VoiceOver result in phase evidence. A static screenshot is not proof of keyboard, focus, notification or transaction behavior. Phase 21 assesses complete user journeys and [release checks](RELEASE_CHECKLIST.md).
