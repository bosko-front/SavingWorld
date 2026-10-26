# Saving Worlds product requirements

Baseline aligned 23 October 2026 to the local [MVP plan v1.2](Saving_Worlds_MVP_Plan_v1_2.docx), the supreme product authority for Release 1.0. It supersedes conflicting v1.1 text and 22 October feature decisions. [Setup/layout](sources/SETUP_AND_LAYOUT_DECISIONS_2026-10-22.md) and [EAS/OTA](sources/EAS_AND_OTA_DECISIONS_2026-10-22.md) remain compatible engineering instructions. See [reconciliation](SOURCE_RECONCILIATION.md). R01-R26 remain traceability IDs; their current definitions below are authoritative. Owner decision D74 (23 October 2026) overrides the v1.2 rules for Archive, whole-goal deletion, the Free goal limit and loss of Pro; the definitions below already include it.

Saving Worlds is an English-language iOS savings tracker. Users manually record money actually set aside and build cozy isometric worlds. The app does not hold/transfer money, connect to banks, verify bank balances or give financial advice.

## Confirmed release 1.0 scope

| ID | Requirement | Acceptance outcome |
| --- | --- | --- |
| R01 | iOS first, React Native, Expo and TypeScript | Installable iPhone app; Android deferred. Latest stable compatible SDK is selected and locked at setup. |
| R02 | No app account, backend, sync or AI | Core tracking works offline. Purchase and delivery services never gate the local ledger. |
| R03 | Local SQLite ledger | Balance is derived from saved transactions and survives restart; no editable balance replacement. |
| R04 | Explicit goal lifecycle and confirmed goal deletion | Positive target, free title, optional deadline and available theme. Statuses are active, paused and completed only: active/paused are open; completed is closed and read-only until Reopen. No Archive and no Close goal (D74). Any goal, Free or Pro, in any status, can be deleted after a clear native confirmation; deletion permanently removes the goal, all its ledger entries and its souvenir/finished world and cannot be undone (D74). No per-entry audit or history. |
| R05 | One Free goal | Free may have one goal in total, in any status (active, paused or completed); Pro has unlimited goals (D74). Create counts all goals atomically. Reopen adds no goal, so it is allowed while the person is within the limit. To start another goal, Free deletes the existing one (delete and start over) or buys Pro; a Free attempt to create a second goal opens the "Build another world" paywall entry. |
| R06 | Deposits, withdrawals, correction and confirmed deletion | Positive input amount plus kind; local date defaults to today, optional note. No future dates. Reject any mutation causing a negative current or chronological running balance, ordered by date, createdAt, id. No correction audit or previous-entry versions. |
| R07 | One global currency | Chosen during onboarding; later change only in Settings while no transaction and no collectible exists. Applies to every goal, including empty ones; disclose no conversion. Store integer minor units using that currency's exponent. No per-goal currency. |
| R08 | Free financial views and optional deadline | Current balance, percentage, remaining and history. Weekly/monthly estimates use the exact inclusive-day formulas below, not contribution schedules. Home presents them as a savings plan (owner decision D84): the remaining amount plus at most one per-period amount, a weekly one only with at least 14 days (D) and a monthly one from 60, none on or after the deadline. Overfunding remains numeric. |
| R09 | Shared live progression | Base at 0% plus ten unlocks at 10%-100%; derive from current balance/target. Withdrawals/corrections/target increases can regress the scene; scene caps at 100%. |
| R10 | Island | Complete Free theme with local assets and exact sequence below. |
| R11 | Garden | Complete Pro theme in the first public release with exact sequence below. |
| R12 | Scene experience | Cozy isometric 2.5D layers and short feedback using Reanimated; no full 3D engine. Reduced Motion remains fully usable. |
| R13 | Permanent souvenir and explicit Finish | First saved transaction mutation or target edit reaching >=100% atomically awards one immutable souvenir per goal, also Free, with theme/version at that time. It persists after corrections, withdrawals and theme/target changes and is removed only when its goal is deleted (D74). Finish separately sets completed at >=100%; Reopen sets active while within the limit, never auto-finishes. No duplicate souvenir. |
| R14 | Three fixed challenges for Free and Pro | First step, Next milestone, Weekly step only; at most one unfinished attempt per goal. Skip preserves history. No challenge pause, amount/rule/frequency editing or custom challenge. |
| R15 | Fixed attempt rules | Catalog, frozen targets, eligibility, stored week/timezone and historical-attempt behavior follow MVP v1.2 section 7 and DATA_MODEL. Historical attempts never automatically reactivate or consume the active slot. |
| R16 | Calculated challenge results | Challenge Add savings opens the same transaction form as Home. Derive progress from eligible saved records; no challenge creates or duplicates a transaction, money or reward. Corrections/deletions recalculate results without erasing attempt history or repeating notifications. |
| R17 | One optional global weekly local reminder | Sunday 18:00 device local time, permission requested on opt-in. Schedule only while at least one active goal exists; paused/completed do not trigger it. No per-goal/per-challenge schedule or challenge notification. |
| R18 | Pro lifetime | One restorable Apple non-consumable: unlimited goals, Garden, open-goal Island/Garden switching and the four R19 statistics. Same challenges as Free. No ads/subscriptions; price US$7.99, final (D116), always shown as the store's localized price. |
| R19 | Four precise Pro statistics | Current total across all goals; current calendar-month deposits and withdrawals; total daily balance for the last 30 calendar days including prior-window opening balance; count goals whose status is completed. Totals and chart include all existing goals (active, paused, completed); a deleted goal's entries are gone and no longer counted (D74). No forecasting. |
| R20 | Simple Pro theme switching | Island/Garden selection and switching on open active/paused goals only. Preserve ledger, target, live milestone and existing souvenir. No manual placement, scene editor or additional personalization. |
| R21 | Purchase resilience | Localized price, buy and Restore Purchases; handle verified/pending/cancel/error/offline/revocation. Offline failure retains prior verified rights. Confirmed loss (verified revocation/refund, Family Sharing removed) deletes or changes nothing: with several goals the person chooses one goal to keep using and the others stay visible but read-only (no new entries or edits) until Pro returns or they are deleted. A Garden goal is never changed; its world stays as it is but cannot progress further in Garden without Pro, and to continue saving the person switches that goal to Island (ledger, target and souvenir kept). Garden souvenirs persist (D74). Nothing switches the theme automatically (D75): without Pro the only theme change allowed is the person's own choice of Island for a Garden goal, after a confirmation; if Pro returns they may choose Garden again, and the Garden scene is computed from the goal's current balance and target with the shared stage function. No automatic data loss (D75): neither a lost entitlement nor any other automatic process deletes or changes goals, entries, souvenirs or theme choices; deletion happens only as the person's own confirmed action. Restore returns license, not local data. |
| R22 | English UI, accessibility and privacy | Readable contrast/text, VoiceOver, Reduce Motion and honest empty/error/complete states. No financial history sent to a server. |
| R23 | Local-data boundaries | No backup, export/import, sync or backup button in v1. Explain that deletion/loss of device may permanently remove data and the app cannot restore it. OS behavior is not an app recovery promise. |
| R24 | Early setup and global styling | Phase 01 installs the compatible foundation packages on the latest stable Expo SDK; Phase 02 chooses the app palette and shared typed style tokens/primitives. No per-screen copied palette or global screen-ratio scaling. |
| R25 | Shared adaptive iPhone/Duo layout | Phase 03 establishes live window/container layout, native navigation, four-edge safe-area behavior and runtime-guarded native adaptation. Later forms/scenes remain usable through resizing, fold, rotation and supported split view while preserving drafts and ledger state. Verify ordinary phones and Duo natively. |
| R26 | EAS build and compatible OTA delivery | EAS Build/Update configuration is required in Phase 01; release-mode update/rollback proof is Phase 20. Core savings stays offline. Same-runtime OTA preserves native and persisted-data contracts; no forced reload during financial work and no OTA-only schema migration. |

## Free and Pro (D74)

| Capability | Free | Pro |
| --- | --- | --- |
| Creating the first goal | Yes | Yes |
| More saved goals | No | Yes |
| Finishing a goal | Yes | Yes |
| Collection of finished worlds | One world | Unlimited |
| Delete and start over | Yes | Yes |
| Pause | Yes | Yes |
| Island theme | Yes | Yes |
| Garden theme | No | Yes |
| Island/Garden theme switching | No | Yes |
| Four R19 statistics | No | Yes |
| Three fixed challenges | Yes | Yes (identical) |
| Weekly reminder | Yes | Yes (identical) |
| Deadline estimates | Yes | Yes |

Free is a complete experience, not a demo: a Free person can finish the whole Island (all ten unlocks), keep that finished world in Collection, and delete it to start over. Pro is the reason to buy more: more goals, more worlds, Garden and statistics (D74, D75).

When Free tries to create a second goal, the Phase 16 paywall entry shows title "Build another world", message "You've already created your free savings goal. Unlock Pro to create more goals and grow your collection of worlds.", button "Explore Pro" and footnote "One-time purchase. No subscription.", with Garden shown as an extra Pro benefit. Until the paywall exists, Phase 08 shows the same text in a native alert.

## Exact progression content

Each row represents the resulting scene at that threshold. Previously earned elements persist unless a later state explicitly replaces them, such as the larger house replacing the small house. Art manifests define that replacement. State 0 is not one of the ten unlocks.

| State | Threshold | Island | Garden |
| --- | --- | --- | --- |
| 0 | 0% | Empty island | Empty garden |
| 1 | 10% | First tree | First seedlings |
| 2 | 20% | Path | Small flower bed |
| 3 | 30% | Flowers and bushes | More flowers |
| 4 | 40% | Small house | Decorative tree |
| 5 | 50% | Bridge | Garden pathway |
| 6 | 60% | Pond | Small fountain |
| 7 | 70% | Additional trees | Bench and decorations |
| 8 | 80% | Larger house and details | Gazebo |
| 9 | 90% | Final decorations | Final plants and ornaments |
| 10 | 100% | Completed island | Completed garden |

A €2,000 goal at €199.99 has state 0; at €200 it has state 1; at €1,000 it has state 5; at €2,000 it has state 10. A withdrawal to €1,800 shows state 9. At €2,100 it still shows state 10 and reports €2,100 saved, €0 remaining and 105% numerically. The first saved qualifying mutation awards one permanent souvenir per goal, without changing goal status.


## Main user journeys

1. Read the short introduction and select one global currency before goal creation. No account or notification permission wall.
2. Create a zero-balance goal with positive target, optional deadline and available theme; currency is read-only information from Settings.
3. Add a deposit/withdrawal through one form shared by Home and Challenges. Commit only after lifecycle, currency, amount, date and chronological-balance validation. Correct or confirm deletion from History; preserve retryable input on failure.
4. At the first saved >=100%, receive one Collection souvenir; the goal remains open. Finish explicitly closes it; Free keeps that one finished world in Collection. Reopen re-enables edits without automatic Finish. Any goal can be deleted after a native confirmation, which permanently removes its history and souvenir (D74).
5. Select a fixed challenge; eligible Home/Challenges records update its result automatically. Skip preserves history; closed attempts never reactivate automatically.
6. Optionally enable the single Sunday 18:00 global reminder. Editing a paused goal does not resume reminders.
7. Buy/restore Pro to use Garden, unlimited goals, simple theme switching and four statistics. A Free attempt to create a second goal opens the "Build another world" paywall entry. Restore Purchases never restores savings data.

## Exact deadline and challenge contracts

New/changed deadlines may be today or a future local date; existing deadlines can expire. With R=max(0,T-B) and D inclusive calendar days from today through an unexpired deadline, weekly=min(R,ceil(R*7/D)); monthly=min(R,ceil(R*30/D)), rounded upward in minor units. R=100.00,D=30 gives 23.34 weekly and 100.00 monthly. Deadline today gives R for both; no deadline gives no estimate; past deadline with R>0 gives Overdue without an estimate; R=0 gives zero estimates and no Overdue.

[DATA_MODEL](DATA_MODEL.md) specifies all three fixed challenge rules, transaction eligibility, frozen targets and stored calendar-week boundaries from v1.2 section 7. These are settled product rules, not Q04 questions.

## Screen inventory

Onboarding/global currency; Home/open-goal switcher with Pause/Resume, Finish and Delete; Create/Edit Goal; shared Add/Edit Transaction; History; fixed Challenges/detail/history; Collection/completed-goal detail with Reopen and Delete; one Pro Statistics screen; open-goal Theme picker; Pro paywall/restore; Settings/global currency lock, weekly reminder switch and local-data explanation. [UI contracts](UI_UX_GUIDELINES.md), [design system](DESIGN_SYSTEM.md) and [adaptive layout](ADAPTIVE_LAYOUT.md) define presentation.

## Explicit exclusions

Accounts, backend, banks, transfers, AI, Android launch, backup, export/import, sync, per-goal currencies, FX, separate correction audit, goal Archive or Close goal (D74), custom/advanced challenges, challenge pause or editable schedules, XP, punitive streaks, monetary rewards, extra themes, manual placement/editor/color customization, advanced analytics, forecasts, subscriptions and ads. Future theme rights are not promised.

## Remaining release dependencies

Q01-Q06 are resolved by v1.2, with the Q01/Q05 parts covered by D74 changed by the owner; no owner reapproval is needed for those behaviors. Final name/identity, Pro sale copy (price decided, D116), licensed art and actual store/native/EAS identifiers/access remain release dependencies in [reconciliation](SOURCE_RECONCILIATION.md). None changes the settled functional scope. Every R01-R26 must have appropriate real implementation/native evidence before release; no implementation has started.
