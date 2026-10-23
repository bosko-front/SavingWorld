# Technical architecture

Build a single offline iPhone application with small feature modules. SQLite owns financial records under [MVP v1.2](Saving_Worlds_MVP_Plan_v1_2.docx). Pure TypeScript owns calculations. Screens consume application commands and queries. World themes supply assets to one renderer. This keeps the core savings experience testable without adding a server or a general game framework.

Read [requirements](PRODUCT_REQUIREMENTS.md), [data model](DATA_MODEL.md), [tech stack](TECH_STACK.md), [asset specification](ASSET_SPEC.md), [design system](DESIGN_SYSTEM.md), [adaptive layout](ADAPTIVE_LAYOUT.md), [EAS delivery](EAS_AND_OTA.md) and [decisions](DECISIONS.md) together. This is a design, not an implemented architecture.

## Boundaries and dependency direction

```mermaid
flowchart TD
  Routes[Expo Router routes] --> UI[Feature screens and shared UI]
  UI --> App[Application commands and queries]
  App --> Domain[Pure money calendar and progression rules]
  App --> Repos[SQLite repositories]
  App --> Gateways[Purchase and notification adapters]
  Repos --> DB[(SQLite)]
  UI --> Style[Shared palette tokens and adaptive layout]
  UI --> Scene[Shared world renderer]
  Scene --> Themes[Bundled theme manifests and assets]
```

- Domain modules import no React, SQLite or native APIs. They accept clocks, policy values and inputs explicitly.
- Application commands validate input/capabilities, run atomic repository operations and invalidate affected query snapshots after commit. Queries return typed view models. Use explicit functions and constructors, not a dependency injection container or global event bus.
- Database access stays in data adapters; feature screens never execute SQL. A repository interface is justified at the SQLite/native boundary, not for every helper.
- Expo Router files compose screens and validate route IDs. They contain no business decisions. Features may use another feature's small public API, never its private store or SQL tables directly.
- Zustand holds selected goal ID, load/error state, query snapshots and session UI preferences. Durable preferences are loaded from SQLite. No persisted balance or separate JSON goal store.

## Planned code layout

All paths below are future implementation targets unless noted. Actual documentation links resolve now; future code paths are not broken documentation links.

Phase 01 created the shell that exists today: `src/app/_layout.tsx` (root Stack and root-level native form sheets), `src/app/(tabs)/_layout.tsx` (NativeTabs), one native Stack per tab in `src/app/(tabs)/(home)/`, `(challenges)/` and `(collection)/` with Settings and a temporary detail route in the Home stack, `src/bootstrap/` (redacted build/update diagnostics). Phase 02 added `src/shared/theme/` (private palette, semantic tokens, native navigation appearance), `src/shared/ui/` (AppText, Button, TextField, Card, AmountText, Notice and the temporary PlaceholderScreen) and the development-only gallery (`src/dev/` behind the guarded Home-stack route `dev-gallery`); see [DESIGN_SYSTEM](DESIGN_SYSTEM.md). Phase 03 added `src/shared/layout/` (Screen, FormScreen, ContentColumn, AdaptiveGoalLayout, the ArrangementView adapter and inset policy) and replaced PlaceholderScreen with it; the development-only layout lab (`/dev-layout`) and sample form sheet (`/sample-form`) live in `src/dev/`; see [ADAPTIVE_LAYOUT](ADAPTIVE_LAYOUT.md#implementation-phase-03). Tests live in `tests/unit/` and `tests/integration/`.

```text
src/app/                         route adapters and navigation layouts
src/bootstrap/                   composition, migrations, startup and foreground reconciliation
src/core/money/                  minor units, currency metadata, parsing and formatting
src/core/calendar/               civil dates, clock boundary, cadence calculations
src/core/progression/            shared milestone and transition rules
src/core/access/                 capability contracts and Free baseline
src/data/db/                     connection, versioned migrations, write serialization
src/data/repositories/           SQLite goal, ledger, completion and challenge adapters
src/features/goals/              domain, application, presentation
src/features/ledger/             commands, history and correction UI
src/features/worlds/             manifests, shared renderer and animation coordinator
src/features/collection/         immutable completion views and archived-goal views
src/features/challenges/         three fixed rules, attempts, calculated progress and UI
src/features/reminders/          persisted preferences and OS scheduling adapter
src/features/billing/            native adapter, entitlement reconciliation and capability queries
src/features/statistics/         global-currency totals, 30-day series and Pro UI
src/features/settings/           local preferences and privacy/data screens
src/shared/theme/                palette, typed semantic tokens and native appearance (exists)
src/shared/ui/                   accessible native controls (exists)
src/dev/                         development-only tools such as the component gallery (exists)
src/shared/layout/               screen/inset policy, measured regions and adaptive adapter (exists)
src/shared/i18n/                 English strings and formatting helpers
assets/themes/island/            approved local layered exports
assets/themes/garden/            approved local layered exports
tests/unit/                      deterministic financial and schedule rules
tests/integration/               command/repository behavior
tests/native/                    actual Expo SQLite/native adapter scenarios
maestro/                         critical device user journeys
```

Avoid empty layer folders for trivial modules. Start with the necessary files; split when there is more than one real concern. A monorepo, ORM, remote cache, plugin loader and analytics platform are unnecessary here.

## Early styling and adaptive foundation

The first three implementation phases establish the latest stable Expo project/package set, the app palette/shared StyleSheet system, then native responsive/Duo layout. They precede financial feature UI. Reuse shared theme/ui/layout modules in every later phase; do not recreate per-feature scaling or palette logic.

Native Stack and NativeTabs own navigation chrome. A small layout adapter composes scene and financial controls through the supported native adaptive container, with an explicit older-OS fallback. Live window measurements and local onLayout bounds size content; they never enter financial domain modules, SQLite or a persisted UI store. Four-edge inset ownership, keyboard/short-window behavior and draft preservation are defined in ADAPTIVE_LAYOUT.

Worlds render into their measured region, not physical screen dimensions. Palette changes do not change a goal's scene theme or paid rights. A resize/fold can update presentation only: it cannot create a transaction, change a target, reset a draft or award completion. All native integration facts require actual locked-build/device verification.

## Startup and offline behavior

1. Open one managed database connection, configure integrity settings, and migrate before reading feature data. Serialize writes. Block mutation UI while migrations run.
2. Read settings, selected goal and goal summaries. Invalid or unavailable selected IDs fall back deterministically to an available goal or the empty Home state.
3. Render local state without waiting for store connectivity. Load world assets locally. Reconcile native entitlements and reminders as independent work.
4. On foreground, re-read the civil date/time zone, close expired fixed challenge attempts and recalculate results and estimates, reconcile notification intent and query StoreKit state. A failed native call does not erase local data or previously verified rights.
5. If a migration/storage read fails, show a retryable recovery state. Never reset the database automatically. Capture a redacted error code for support.

Purchase/restore, OTA download checks and external support/privacy links may use networking. OTA availability never gates opening the local ledger or rendering the embedded/cached app. No networking dependency belongs in deposit, withdrawal, history, progression, basic challenges or already unlocked world rendering.

## EAS build and update boundary

EAS Build produces the native binaries; EAS Update supplies compatible JS/assets through expo-updates. These delivery services receive no savings payload from application commands. The app has no in-app Expo account or custom backend. Configuration begins in Phase 01; focused release-mode delivery/recovery acceptance is Phase 20.

Use appVersion runtime policy with explicit native/persistence compatibility checks. A shared-runtime OTA must preserve SQLite schema and persisted data meaning for the candidate, known-good and embedded fallbacks. New native APIs/config or incompatible data changes require a new app version/runtime/native binary. A build-number bump alone does not make them compatible. Keep the profile/channel/environment contract in EAS_AND_OTA authoritative.

Update checks run without blocking local startup and a fetched update activates at a later normal launch. Never force reload a draft, write/migration or store transaction. A rollback changes executable code, not ledger data; preserve records and verify the previous reader before any rollback. Keep working embedded/cached assets, including both release themes, available offline. Audit EAS update metadata in privacy preparation rather than asserting no network traffic.

## Financial mutation flow

A submitted shared Home/Challenges transaction form retains one operation ID for retries. The command validates the global AppSettings currency, positive amount/kind, nonfuture civil date, open goal status and capability. In an exclusive serialized write transaction, recheck the current row revision and candidate goal history ordered by entry_date, createdAt, id. Every subtotal and final balance must stay nonnegative. Apply the current entry edit or confirmed deletion without retaining previous entry versions. No correction audit or independent challenge-created deposit.

In the same commit, recalculate eligible challenge results and insert the unique permanent collectible if the saved mutation or target edit first qualifies at >=100%. Receipt results support retry without a financial journal. All effects commit or roll back together. Goal/Settings commands enforce the one global currency lock and explicit lifecycle from DATA_MODEL. Finish/Reopen are explicit commands; completed/archived are read-only until Reopen. paused remains editable without resuming reminder eligibility. No whole-goal deletion.

After commit, invalidate affected goal/home/history/challenge/statistics queries. Return old/new balance/stage and a mutation revision for presentation. Animations never write financial state; notification/animation failure cannot duplicate or undo a committed operation. Restart derives the current scene from saved history without replaying a fake deposit.

## World and collection design

The pure engine returns milestone 0-10 from the current net amount and target. See exact arithmetic in DATA_MODEL. The renderer receives theme ID/version, milestone, fractional progress for minor feedback, motion preference and an optional committed transition. The same engine and renderer serve Island and Garden.

A static typed manifest declares a 0% base and ten threshold definitions with stable layer IDs, placement, z-order, reveal/hide/replacement sets, accessible scene description and static asset references. The 80% Island replacement hides the small house and reveals the larger house; do not simply accumulate every layer forever. No dynamic file-path require or remote asset download.

A multi-threshold deposit settles on the correct final scene, with one bounded reveal sequence. Decreases remove/reverse the affected layers with a quiet transition. Target edits can change stage; switching theme keeps stage. Rapid commits cancel/coalesce older animations by revision. Offscreen scenes stop ambient work. Reduced Motion updates immediately with a short accessible status message.

A collectible stores the theme/version at the first saved >=100% mutation, uniquely per goal including Free. Optional immutable title/target captions describe that moment; currency remains global. It persists even if the first entry was a mistake. A live 60% world and its permanent finished souvenir are both valid. No correction, withdrawal, theme/target change, Finish or Reopen removes/replaces it. Reaching 100% does not close the goal: explicit Finish sets completed, and Reopen sets active after the Free-limit check without auto-Finish. Closed goals are read-only. Collection also lists completed/archived goals honestly, keeping souvenir and current status distinct.

MVP achievement feedback consists of milestone reveals, completed-world souvenirs and calculated fixed challenge results. There is no separate badge/XP/level schema or general rewards engine.

## Challenges

Free and Pro share exactly First step, Next milestone and Weekly step. Persist attempts with frozen targets, start timestamps/dates and saved week/timezone boundaries as specified in DATA_MODEL and v1.2 section 7. At most one unfinished attempt per goal; First step once per goal and Weekly step at most once per goal/calendar week. No custom definitions, editable amounts/frequency, separate challenge pause, notification schedule or rewards economy.

Derive results from eligible saved ledger records, including eligible Home entries. Challenge Add savings opens the same form/command as Home; the challenge engine never creates or duplicates a transaction and does not require a separate evidence-link/confirmation action. Net eligible deposits minus withdrawals determine money-target progress; First step checks for a positive deposit. Edits/deletions recalculate both current and historical results. New records created after an ended week cannot retroactively complete it.

Completed/Not completed/Skipped are historical attempts. Corrections may change a historical Completed/Not completed result but never reactivate the attempt, take the active slot or repeat a notification. Skip retains history without punishment; use another available fixed type for a new attempt. Goal target/deadline changes never rewrite a started attempt's frozen contract.

## Purchases and capabilities

A PurchaseGateway hides native package APIs. It supplies product metadata, verified current entitlements, transaction updates, purchase initiation, explicit restore and finishing/acknowledgment. Phase 15 must prove actual StoreKit verification, completed non-consumable handling, duplicate delivery, pending outcomes, cold-start recovery and revocation for the pinned library. A purchase event or a decoded JWS string alone is not verification.

Map the single Pro product to unlimited open goals, Garden, open-goal Island/Garden switching and the four Pro statistics. Challenges are identical in Free and Pro. Keep independently addressable theme capability keys for later products; do not sell or assign future theme rights now. SQLite stores an entitlement snapshot for responsiveness, never an authoritative editable Boolean. Reconcile with StoreKit at launch, foreground and transaction updates. An offline/network failure is unknown, not verified revocation. No app login, subscription, RevenueCat service or IAPKit service is introduced by default.

A completed store response is processed durably and idempotently before transaction finishing. Restore is available on the paywall and Settings. Explicit store sync may prompt for Apple credentials; ordinary startup only queries current state. Rights restoration never restores a deleted savings database. Confirmed loss preserves all goals, transactions and souvenirs. Require selection of at most one open Free goal and archival of others before further entries; the open Free goal uses Island and Garden souvenirs remain. Temporary network failure alone retains prior verified rights.

## Deadline and statistics queries

Deadline estimates are Free and use the inclusive-day formulas in DATA_MODEL: weekly=min(R,ceil(R*7/D)), monthly=min(R,ceil(R*30/D)). No contribution-opportunity calendar. Handle absent/today/expired deadlines and R=0 without division by zero or punitive language.

Pro has exactly four views on one screen: current all-goal total; current-calendar-month deposit/withdrawal totals; total daily balance for the last 30 calendar days including opening balance from earlier records; count goals with status completed. Use one global currency. Include active/paused/completed/archived ledger values, never add souvenir snapshots. The line is all-goal, not selected-goal. Backdated corrections update chart/monthly summaries; provide accessible text. Q06 is resolved by v1.2.

## Reminders, recovery and security

Notification preferences are durable intent. Reconcile OS IDs on launch/foreground and after changes; schedule a bounded set and cancel orphaned requests. Use exactly one optional global Sunday 18:00 device-local weekly reminder, with generic privacy-preserving text. Schedule only while at least one active goal exists; paused/completed/archived never trigger it. Settings has one switch, no goal/challenge cadence or time controls. Editing a paused goal does not resume reminders. No push registration, APNs service or assumption that JavaScript runs while terminated. OS delivery is best effort.

Use iOS sandbox protection, minimal permissions, parameterized SQL and redacted diagnostics. No API secret, receipt-signing key or financial notes in logs. Validate native file availability in the locked-device/background scenarios actually used. No SQLCipher/key-management system without a requirement.

Manual export/import is deferred. A future export should use a consistent logical schema-versioned snapshot of a read transaction, excluding authoritative purchase rights and device notification IDs. Future import validates into a temporary database, verifies invariants and uses a recoverable replacement process. Never copy only an open WAL database file. In MVP, OS device backup may include app data depending on user/system settings; it is not app cloud sync and cannot be promised. Test and document the chosen OS behavior rather than advertising a guarantee.

## Error handling and quality

Typed command failures distinguish validation, unavailable paid capability, stale edit, storage failure and native-service failure. Present specific recovery steps and preserve form input. Put a React error boundary around the app shell and retryable scene fallbacks around asset loading. A missing asset must not hide the ledger.

Every phase adds suitable domain, native or interaction verification. Actual SQLite, StoreKit sandbox/TestFlight, local notifications, VoiceOver and device performance need their own evidence; Jest mocks do not prove them. See [TEST_PLAN](TEST_PLAN.md) and [RELEASE_CHECKLIST](RELEASE_CHECKLIST.md).
