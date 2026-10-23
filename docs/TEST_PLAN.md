# Test and verification plan

Test the failure boundaries that could misstate money, lose records, grant wrong rights or misrepresent a world. Product authority is [MVP plan v1.2](Saving_Worlds_MVP_Plan_v1_2.docx). This is a plan; no app checks have run yet. Evidence starts in [PROJECT_STATUS](PROJECT_STATUS.md) and [evidence](evidence/README.md).

## Test layers

| Layer | Purpose | What it cannot establish |
| --- | --- | --- |
| Pure Jest tests | Exact money, date/schedule/stage calculations and capability policy | Native SQLite, store purchases or device rendering |
| React Native Testing Library | Forms, messages, navigation/focus intent and state handling | Actual screen-reader operation, native transaction behavior or notification delivery |
| Repository/command integration | Atomic ledger/receipt/fixed-attempt/collectible behavior | Native adapter correctness if storage is replaced by a fake |
| Real iOS Expo SQLite suite | Migrations, SQL constraints, transaction context/rollback, persistence and concurrency | Actual StoreKit or accessible scene quality |
| StoreKit + sandbox/TestFlight | Native verification, purchase lifecycle, restore/revocation and product availability | Restoration of savings data or guaranteed review approval |
| iPhone manual + Maestro | Real journeys, interruption, accessibility, notifications and offline behavior | All financial edge cases without independent unit fixtures |
| Device profiling | Launch, memory, frames and query performance in a release build | Financial correctness or artwork approval |

Use deterministic fixtures and isolated test databases. Native test entry points must be development/test-only and absent from distribution builds. Never test with real customer financial records. The SQLite suite must hit the actual Expo native adapter, not just host sqlite3 SQL or Jest mocks.

## Required scenario catalog and traceability

| Test ID | Scenario with expected outcome | Requirements | Primary phases |
| --- | --- | --- | --- |
| T01 | Exact amount parsing: 0.10+0.20=30 minor; 0/2/3 decimals in separate global-currency app fixtures; invalid/overflow rejected | R07 | 04,07 |
| T02 | €2,000 target: €199.99 stage0, €200 stage1, €1,000 stage5, €2,000 stage10, €2,100 stage10 and numeric105%; withdrawal to €1,800 stage9 | R08-R12 | 04, 08-10, 17 |
| T03 | Tiny target, all ten boundary neighbors, target change, multi-threshold jump and rapid supersession settle to exact current state | R09, R12 | 04, 10 |
| T04 | Fresh DB, repeated startup, upgrade from each released schema, interrupted migration and unknown newer schema preserve data or fail safely | R03, R23 | 05, 21 |
| T05 | Double submit/retry/stale edit/kill after commit has one effect; no previous-entry audit versions | R03,R06 | 05,07,21 |
| T06 | Deposit50-withdraw20=30; withdraw31 rejected. Correct deposit60=>40; confirmed delete withdrawal=>60. Reject deletion of funding deposit or a withdrawal before it, including positive-final-total counterexamples | R03,R06-R08 | 05,07,08 |
| T07 | Free counts active+paused; Finish at>=100% explicitly sets completed/releases slot; closed goals read-only; Reopen checks limit and stays active at100%; paused remains editable; no whole-goal delete. Currency/future-date rules are resolved | R04-R07,R13 | 06,07,11,16 |
| T08 | Inclusive D: R=100.00,D=30=>weekly 23.34/monthly 100.00; deadline today=>R; no deadline=>no estimate; overdue R>0=>Overdue; R=0=>zero/no Overdue; month/leap/DST boundaries | R08 | 04,08 |
| T09 | First saved>=100% gives one permanent unique souvenir even Free, status unchanged until Finish. Mutation+award rollback together; initial mistake correction/withdrawal/target/theme edit/Archive/Reopen/re-crossing never removes or duplicates it | R13 | 11,21 |
| T10 | Both manifests have one base plus ten exact milestones; static assets exist, replacements are correct and historical versions render | R09-R12, R20 | 09, 17 |
| T11 | Exactly First step/Next milestone/Weekly step, identical tiers, one unfinished attempt; First once per goal; frozen Next target; Weekly eligible deadline/frozen estimate/once per week. No custom editor, challenge pause or editable cadence | R14,R15 | 12,13 |
| T12 | Eligible Home/Challenges transaction counted once, createdAt>startedAt and date in saved period; late-created backdated record cannot finish ended week. Net withdrawal/edit/delete recalculates result; historical attempts never reactivate/displace current/re-notify; Skip retained | R06,R15,R16 | 12,13,21 |
| T13 | One global opt-in Sunday 18:00 device-time local request only with active goal; none for only paused/completed/archived or disabled/denied. Pause edit stays paused; duplicate/orphan/error/reconcile/tap/DST work without extra schedules | R17,R22 | 14 |
| T14 | Native verified/pending/unverified/cancel/error/replay/restore/offline outcomes; restore license only. Offline retains prior verified right. Confirmed loss retains data/souvenirs, requires choose<=1 open and archive others before entries, Island live/Garden souvenir | R18,R21 | 15,16 |
| T15 | Command/deep-link capability matrix: unlimited open goals, Garden/open-goal switching and four stats only; all fixed challenges/ledger/history/deadlines/accessibility Free; closed edit guard and confirmed-loss resolution enforced | R05,R14-R21 | 16,17 |
| T16 | One-currency current total across all goals, current-month gross deposits/withdrawals, total daily balance today+prior29 days including pre-window opening and archived ledger, count status=completed rather than souvenirs; edits refresh all | R19 | 18 |
| T17 | Pro open-goal theme switching preserves ledger/target/attempt/souvenir and stage; closed requires Reopen; Free Garden denied; confirmed-loss Island live/Garden souvenir retained | R09,R11,R20,R21 | 17 |
| T18 | VoiceOver, supported Dynamic Type, Reduce Motion, contrast and chart text work on all critical journeys; locale formatting never changes underlying amount | R22 | every UI phase, 19 |
| T19 | Airplane-mode create/save/correct/delete/withdraw/fixed challenge/Finish/Reopen/theme with known rights/restart keeps exact ledger/global currency without app account | R01-R03,R06,R13-R16,R20 | 07,11,13,17,21 |
| T20 | Device build/permissions/privacy manifest/IAP products/store copy/URLs and both final themes agree with release requirements | R18, R21-R23 | 22 |
| T21 | Latest stable Expo/compatible peers are locked; shared palette/control states meet documented contrast and remain legible at large text | R01, R22, R24 | 01, 02, 19 |
| T22 | Ordinary iPhone/Duo outer/open/split/available partial-fold states use native layout/insets; older supported OS fallback is usable | R01, R22, R25 | 03, 08, 09, 19, 21 |
| T23 | Repeated resize/fold/rotation/keyboard changes preserve route, selected goal, focused draft and operation ID with zero extra ledger writes | R03, R06, R25 | 03, 07, 08, 21 |
| T24 | A real EAS release-mode preview receives the intended compatible update with correct profile/channel/environment/platform/runtime, then works offline with complete assets | R02, R23, R26 | 01, 20, 21 |
| T25 | Incompatible runtime and interrupted/failed download retain a usable cached/embedded app; no forced reload or duplicate financial action during a form/write/IAP | R03, R06, R21, R26 | 20, 21 |
| T26 | Known-good/embedded rollback preserves accurate ledger/receipts/fixed-attempts/collectibles/rights under the same persistence contract; incompatible schema requires native release/forward fix | R03, R23, R26 | 05, 20, 21, 22 |
| T27 | Global currency selected in onboarding; no goal picker. Empty goals adopt permitted Settings change without conversion; any transaction or collectible locks. Delete last transaction without souvenir unlocks; collectible alone still locks | R07,R13,R23 | 06,11,19 |
| T28 | Weekly attempt Monday-Sunday saved timezone: midweek start ends Sunday without target increase; travel/DST does not move stored interval; historical Completed/Not completed correction remains historical while another attempt is current | R14-R16 | 12,13,21 |

Each phase evidence record lists applicable test IDs, not merely “all tests pass.” Requirement coverage is planned here; status must distinguish planned, automated-pass, native-pass, manual-pass and pending.

## Financial fixture detail

Use separately calculated minor-unit expectations. Include positive deposits, withdrawals, corrections that change date/sign/amount, voids, same-day ordering and overfunding. Ensure exact values survive SQLite read/write conversion. Confirm stage calculation uses integers even if progress animation uses a float.

Global EUR fixture: goal A net 375 minor and archived goal B net 600 minor yield total 975 minor=EUR9.75. Alternate currency exponents use separate entire-app fixtures. Include a transaction before the 30-day window in every subsequent daily opening balance. Gross current-month inflow/outflow are separate from current net. A goal with a permanent souvenir but active or archived status is not counted as completed. Q06 is resolved; archived ledger contributes to all money totals/chart.

## Styling and adaptive verification

Use DESIGN_SYSTEM for final palette pairing checks and ADAPTIVE_LAYOUT for the native matrix. Include ordinary small/large iPhones, Duo outer/open, supported rotation, inner split view on either side, available partial-fold/tabletop states, native sheets, keyboard and older-iOS fallback. Do not substitute a hard-coded resized screenshot for native inset/fold behavior. A geometry event must never submit, change ledger state or discard a form draft.

Phase 03 validates the shell and samples; later UI phases validate real controls and scenes; Phase 21 closes the release-candidate device matrix. Record physical-only gaps explicitly. Mathematical contrast is separate from native appearance/VoiceOver approval.

## EAS release-mode delivery checks

Phase 20 uses the exact selected project's release-mode preview binary and synthetic persisted financial state. Validate compatible download/normal-start activation, wrong runtime rejection, missing network/interrupted download, complete static assets, no forced reload and a controlled known-good/embedded rollback. Record actual build/update IDs, source revision, profile/channel/branch/environment/platform/runtime and schema contract. The normal development client/Metro path does not prove this behavior.

The preview artifact uses the production export environment on its isolated channel. Check parity before promotion; do not re-export untested configuration or change production routing during QA. Same-runtime tests preserve schema and stored-data meaning. New native/persistence incompatibilities require a new runtime/native artifact. Rollback checks never expect SQLite writes to be automatically undone. Phase 21 repeats the relevant matrix on the actual release candidate; production rollout is prepared in Phase 22, not executed without an operator instruction.

## Failure injection and performance

Inject errors before/after each multi-record write step and between native processing and finishing. Reopen after a completed SQLite commit but before UI acknowledgment. Test migration safety and notification scheduling interruption. Simulate unavailable/unknown store state without revoking trusted rights. Verify explicit verified revocation preserves user records.

Profile a release candidate on the oldest supported iPhone and one recent iPhone. Include ten thousand ledger entries, multiple Pro goals in one global currency and both themes; alternate exponents use separate whole-app fixtures. Capture launch-to-local-ready, query latency, frame observations, decoded image memory and peak theme-transition memory. Initial budgets are defined in ASSET_SPEC/roadmap and may be revised with documented device evidence. Simulator speed is not a device performance result.

## Evidence and execution policy

Run relevant checks after each phase's final changes. Record commands and results, build identifier, native toolchain, device/OS, fixture/schema version, scenarios and limitations. Broaden testing when integration or failures justify it; Phase 21 is the full release-candidate regression. Unknown/unavailable results stay NOT RUN and cannot satisfy mandatory native criteria.

All app/native tests are currently NOT RUN because no application has been implemented. The only current checks are v1.2 scope/source alignment and document/link/phase consistency in [planning evidence](evidence/PLANNING_CHECKS.md).
