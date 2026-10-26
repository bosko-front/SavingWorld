# Data model and invariants

Contract aligned 23 October 2026 to [MVP plan v1.2](Saving_Worlds_MVP_Plan_v1_2.docx), especially sections 3/4/7. Phase 05 implemented schema 1 (`src/data/db/migrations/0001-initial-ledger.ts`): migrations, settings, goals, ledger_entries and operation_receipts as STRICT tables with the constraints and triggers in DECISIONS D53. Schema 2 (Phase 08) allows goal deletion, schema 3 (Phase 11) adds collectibles and schema 4 (Phase 12) adds challenge_attempts; the reminder and entitlement tables below are still planned. Apply tables only in their owning phases. Q01-Q06 are resolved; owner decision D74 changes the goal status set, adds whole-goal deletion and makes the Free limit one goal in total; [reconciliation](SOURCE_RECONCILIATION.md) records authority.

## Money and date types

- Persist SQLite INTEGER amounts as bounded safe-integer minor units; engineering ceiling for a single amount, target and current goal balance is 1,000,000,000,000 minor units. Use BigInt for sums/products/range checks, then checked number conversion. Do not serialize BigInt directly to JSON.
- AppSettings owns the one global ISO 4217 currencyCode and versioned exponent metadata. Goal and Transaction have no currency field. Bundle validated currency metadata; test 0/2/3-decimal choices in separate whole-app fixtures, never mixed currencies in one database. Unsupported codes fail validation.
- Parse text with known locale separators, rejecting ambiguous/malformed grouping, extra decimals, exponent notation and non-finite values. Deposit/withdrawal kind determines sign; user-entered amount must be >0. No float-based financial parsing.
- createdAt/startedAt/earnedAt are UTC timestamps; entry_date/deadline_date/start_date/period_end_date are local YYYY-MM-DD civil dates. Do not reinterpret civil dates through midnight UTC. Inject clock/timezone at calendar boundaries; test leap days and DST.
- Entry date defaults to today; future dates are rejected. Backdated entries and edits recalculate affected balances, challenge results and statistics. New/changed goal deadlines must be today or later; an existing deadline may naturally expire.

## Derived values and chronological validation

For each goal B=sum(saved signed_amount_minor), T=target_minor>0, R=max(0,T-B). No authoritative balance/progress column on goals. Numeric percent=100*B/T may exceed 100; floor display precision to avoid falsely showing 100.00%. Scene stage=min(10,floor(10*B/T)), computed with integer/BigInt thresholds. A tiny target may skip visual thresholds in one minor-unit step.

Every create/correct/delete transaction command computes the candidate history ordered by entry_date, immutable created_at_utc, then id. Reject if any running subtotal or final B is negative. A positive final total is insufficient. A withdrawal before the first deposit, or deletion of a deposit needed by a later withdrawal, fails atomically with a brief explanation. Confirm transaction deletion. No correction audit, soft-delete history UI, ledger revision table or previous-entry snapshots.

## Global currency lock

Choose currency during onboarding before creating a goal. A later Settings-only change is allowed iff the database contains zero transactions and zero collectibles across all goals, including closed ones. Recheck this inside the same serialized write boundary as financial mutations. It is not a lifetime lock after a deleted transaction or a deleted goal (D74). A retained collectible still locks it. Apply a permitted choice to all existing empty goals; explain and confirm that no amounts are converted. Validate any newly interpreted target against the selected metadata without inventing FX behavior.

Implemented in Phase 06 (DECISIONS D56): `setGlobalCurrency` serves onboarding and Settings, counts ledger entries and souvenirs inside its exclusive transaction, and rewrites each empty goal's target to the same written amount in the new exponent (1,000.00 EUR → 1,000 JPY). A target the new currency cannot show exactly, or one above 10^12, refuses the change instead of rounding. Since schema 3 (Phase 11) the souvenir count reads the real `collectibles` table; a souvenir kept after every transaction was deleted still locks the currency.

## Exact deadline estimate

For an unexpired deadline D=count of calendar days from today through deadline inclusive, D>=1. Weekly=min(R,ceil(R*7/D)); monthly=min(R,ceil(R*30/D)), ceil in minor units. These are alternative approximate paces, not calendar contribution schedules. R=10000 minor, D=30 gives weekly 2334 and monthly 10000. Deadline today gives R for both. No deadline means no estimate. Past deadline with R>0 shows Overdue and R without estimates; R=0 yields zero and no Overdue. No anchored month-end opportunity-count formula.

## Tables and planned migration ownership

### migrations (Phase 05)

version INTEGER PRIMARY KEY, name, checksum, applied_at_utc. Ordered immutable migrations execute transactionally. An unknown newer schema fails safely. Never rewrite a released migration or reset user data.

### settings (Phase 05; global currency UI in 06)

key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at_utc. Typed keys: `currency` = {code, exponent, registryVersion} (implemented Phase 05; the global currencyCode with versioned exponent metadata), `selectedGoalId` = a JSON string (implemented Phase 06; a hint that falls back to the oldest open goal), weeklyReminderEnabled and optional additional reduce-motion preference. Onboarding is complete once a valid `currency` exists; no separate onboardingCompleted key is stored (D56). UI is English with locale-aware numeric/date formatting. No preferred-new-goal currency or purchase override. Missing/invalid currency gates goal creation; no silent default reinterpretation of financial data.

### goals (Phase 05; lifecycle in 06, deletion and migration 2 from D74, Finish integration in 11)

id TEXT PRIMARY KEY, title TEXT NOT NULL, target_minor INTEGER CHECK(target_minor>0 AND target_minor<=1000000000000), deadline_date TEXT NULL, theme_id TEXT NOT NULL, status TEXT CHECK(status IN ('active','paused','completed','archived')), created_at_utc, updated_at_utc, revision INTEGER CHECK(revision>=1).

Start at zero; no currency/exponent/balance column. Index status/updated time. Statuses are active, paused and completed (D74): active and paused are open; completed is read-only until Reopen sets active. The CHECK keeps the legacy value 'archived' so schema 1 stays valid, but no code writes it. Free may have one goal in total in any status; Pro has no goal limit. Create checks the limit by counting all goals inside its exclusive transaction. Reopen adds no goal, so it is allowed while the person is within the limit. paused permits editing and transactions without resuming reminder eligibility. Finish requires an open goal and B>=T and sets completed. Reopen at >=100% never auto-finishes. Target/theme/deadline/ledger edits share the closed-goal guard. Phase 06 implemented Edit, Pause, Resume, Finish (its UI, Home's ⋯ menu at B ≥ T, came in Phase 11) and Reopen with revision checks and receipts (DECISIONS D57), plus an Archive command that D74 removed; Finish starts from an open goal, and an unchanged expired deadline may be kept on edit.

Goal deletion (D74): any goal, in any status, Free or Pro, can be deleted after a native confirmation. One command, in one exclusive transaction with a stable operation ID, a goal revision check and an identifiers-only receipt, deletes the goal's ledger entries, its collectible (when the `collectibles` table exists), its challenge attempts (when the Phase 12 table exists) and then the goal. It cannot be undone and keeps no copy, audit or history of the deleted rows. Deleting the last transaction or souvenir can unlock the global currency, because the currency lock only counts what exists. Schema 1 has a trigger that blocks goal deletion; migration 2 drops that trigger and converts any pre-existing development rows with status 'archived' to 'paused'. Schema 1 itself and its pinned checksum are unchanged.

### ledger_entries (Phase 05; UI in 07)

id TEXT PRIMARY KEY, goal_id TEXT NOT NULL REFERENCES goals(id), signed_amount_minor INTEGER CHECK(signed_amount_minor!=0 AND abs(signed_amount_minor)<=1000000000000), entry_date TEXT NOT NULL, note TEXT NULL, created_at_utc TEXT NOT NULL, updated_at_utc TEXT NOT NULL, revision INTEGER CHECK(revision>=1).

Phase 07 added the UI (DECISIONS D61): one Add/Edit Entry form and History on the unchanged Phase 05 commands; History shows current rows newest first, the exact reverse of the validation order. Index (goal_id,entry_date,created_at_utc,id). Currency comes only from AppSettings. created_at_utc is immutable on correction. Current values overwrite on edit; confirmed deletion removes the entry. No ledger_revisions table, before/after snapshots or audit UI. Row revision is concurrency protection, not retained financial history. Validate date/length/Unicode and chronological balance at the command boundary.

### operation_receipts (Phase 05; extended by later commands)

operation_id TEXT PRIMARY KEY, command_kind, request_hash, result_json, created_at_utc. Same transaction as the effect. Same ID/payload returns the prior minimal result; changed payload fails. Receipts retain identifiers/outcome needed for safe retry, not previous financial entry versions or a correction journal. Never log note/amount payloads. Serialized writes and stale-row checks remain implementation safeguards.

### collectibles (Phase 11)

Implemented in Phase 11 as schema 3 (`src/data/db/migrations/0003-collectibles.ts`, DECISIONS D95), read and written only through `src/data/repositories/collectible-repository.ts`.

goal_id TEXT PRIMARY KEY REFERENCES goals(id) ON DELETE RESTRICT, theme_id TEXT NOT NULL CHECK island/garden, theme_version INTEGER NOT NULL ≥ 1, target_minor_at_award INTEGER NOT NULL (money range), earned_at_utc TEXT NOT NULL; STRICT; a trigger refuses every UPDATE. `target_minor_at_award` is the one immutable display snapshot kept (the Collection's "Target then"); no title snapshot. It is not an entry audit or a financial total. Currency is global; a collectible locks Settings currency changes. The version stored is `CURRENT_THEME_VERSIONS` (`src/core/progression/theme-ids.ts`, Island 2). The schema 3 upgrade gave a souvenir to every goal already at B ≥ T (development databases only).

After a saved transaction mutation or target edit first yields B>=T, insert exactly once by unique goal_id, in that same transaction (`awardSouvenirIfFirstFunded`, called by `createEntry`, `correctEntry`, `deleteEntry` and `editGoal`). Also Free. Goal status is unchanged. Withdrawal, correction (including an initial mistake), target/theme changes, Finish and Reopen never remove/replace the souvenir. Only deleting its goal deletes it, in the same transaction (D74). Repeat threshold crossings cannot add another. Preserve referenced historical theme manifests; no screenshot blob needed. Live scene always follows current B/T.

### challenge_attempts (Phase 12)

Implemented in Phase 12 as schema 4 (`src/data/db/migrations/0004-challenge-attempts.ts`, checksum `4255b9a308e7cb0c`, DECISIONS D103), read and written only through `src/data/repositories/challenge-attempt-repository.ts`.

id TEXT PRIMARY KEY, goal_id REFERENCES goals(id) ON DELETE RESTRICT, rule_id CHECK IN ('first_step','next_milestone','weekly_step'), target_minor INTEGER NULL, milestone_stage INTEGER NULL (1..10, Next milestone only), started_at_utc TEXT NOT NULL, start_date TEXT NOT NULL, period_end_date TEXT NULL, period_timezone TEXT NOT NULL, period_end_at_utc TEXT NULL, week_start_date TEXT NULL, state CHECK IN ('active','historical'), result CHECK IN ('completed','not_completed','skipped') NULL, historical_at_utc TEXT NULL. STRICT. CHECKs tie the shape to the rule (First step: no target, milestone or period; Next milestone: target and milestone, no period; Weekly step: target, saved week, end date, end instant, no milestone) and the result to the state (active: no result and no end time; historical: both). Triggers refuse any change to the started contract (rule, target, milestone, startedAt, start date, week, zone, end), a historical attempt becoming active again or changing its end time, any change to or from skipped, and a new attempt on a completed goal.

target_minor is frozen positive money for next_milestone/weekly_step; first_step checks existence of a positive deposit instead. milestone_stage is the stage a Next milestone aims at, floor(10B/T)+1 at start, frozen with its target so Phase 13 can name it after a later target edit (an addition to the v1.2 field list, D103). period_end_at_utc is the first instant of the Monday after the saved Sunday in period_timezone (local midnight, or the first minute after a DST gap). historical_at_utc is when the attempt stopped being current: the committing change for Completed, the skip for Skipped, and the saved week end for an expired Weekly step. state distinguishes an unfinished current attempt from historical presentation, independently of a corrected result. Partial unique index on goal_id WHERE state='active' enforces one unfinished attempt. Check first_step's once-per-goal availability and weekly_step's once-per-goal/calendar-week availability in the serialized start command. Store the original local Monday-Sunday interval/timezone; travel never shifts a saved attempt or creates a second current one. No custom definitions, schedule versions, editable amount/frequency, separate challenge pause, reminder or transaction-link table.

## Three fixed challenge rules

| Rule | Availability and frozen target | End |
| --- | --- | --- |
| First step | Once per goal; one eligible positive deposit after start. No money target configuration. | No deadline |
| Next milestone | Only while B<T; next threshold=ceil(T*(floor(10*B/T)+1)/10), target=threshold-B at start. | No deadline |
| Weekly step | Only with unexpired goal deadline and R>0. Freeze the exact weekly estimate at start; at most once per goal/calendar week. | That week's Sunday even when started midweek; no automatic target increase |

Eligibility: original createdAt strictly after startedAt, entry_date>=start_date and <=period_end_date if present. For weekly attempts the original entry must also have been created before the saved end of that period (createdAt < period_end_at_utc). Once an attempt is historical, records created after historical_at_utc no longer count for it; corrections and deletions of records that counted still do (D103). A transaction newly created after the week ended cannot retroactively complete it even with a backdated entry date. Corrections to existing eligible records preserve createdAt and can change their contribution/result.

Next milestone and Weekly step progress=max(0,sum eligible signed amounts); completed when it reaches the frozen target. First step checks an eligible positive deposit. Eligible withdrawals reduce net progress; edits/deletions recompute results for affected current and historical attempts. Goal target/deadline edits do not rewrite a started attempt's frozen target/period. An expired unsuccessful period is Not completed. Skip stores historical Skipped without punishment; select an allowed fixed type for a new attempt rather than editing the old one.

An active attempt becomes historical Completed in the same transaction as the change that meets it, and an active Weekly step becomes historical at its saved end (Completed if the records counted by then met it, otherwise Not completed): inside any later ledger change or challenge command for that goal, and through `closeEndedAttempts` on foreground; the board query already presents an ended week as history before that write. Completed, Not completed and Skipped are historical presentations. Once historical, an attempt never automatically returns to active, never consumes the current slot and never repeats a completion notification after a correction. Corrections may change a historical Completed/Not completed result; Skipped remains skipped and history is retained. Challenges have no notification schedule. Add savings opens the same transaction form/command as Home; the challenge start/skip/result engine never creates, copies or double-books a transaction. No manual evidence confirmation/linking flow is required.

### reminder intent and notification_requests (Phase 14)

Use settings.weeklyReminderEnabled as the single global opt-in, plus durable request intent/logical_key/native_request_id/revision/error status for OS reconciliation. No goal_id, challenge_id, editable cadence or time controls in reminder preferences. Desired schedule is one global local weekly Sunday 18:00 device-time notification iff opt-in, permission and at least one active goal exist. paused/completed do not qualify. Editing a paused goal does not resume it.

Persist intent before OS scheduling, reconcile pending requests at launch/foreground and after settings/lifecycle/permission/timezone changes, cancel duplicates/orphans. Native OS calls cannot join SQLite transactions. Use generic text and a safe Home/current-active-goal fallback on tap. No financial data in notifications or server push.

### entitlement_cache and purchase_events (Phase 15)

Cache: product_id PRIMARY KEY, status CHECK IN ('verified','not_owned','revoked','unknown'), native_transaction_id, verified_at_utc, last_attempt_at_utc, last_error_code. Events: native_transaction_id PRIMARY KEY, product_id, verification_state, processed_at_utc, finished_at_utc, revoked_at_utc. Re-delivery reconciles by ID. No raw receipt payload in normal logs. Native verified state is authoritative; pending/unverified never unlocks Pro.

Pro maps only to unlimited goals, Garden/open-goal switching and four statistics. Retain prior verified rights through temporary network failure. If StoreKit confirms no right (verified revocation/refund, Family Sharing removed), delete or change nothing (D74). With several goals the person chooses one goal to keep using; the others stay visible but read-only (no new entries or edits) until Pro returns or they are deleted. A goal on the Garden theme keeps its world as it is but cannot progress further in Garden without Pro; to continue saving on it the person switches that goal to Island, keeping ledger, target and souvenir. Retain Garden souvenirs. Nothing switches the theme automatically (D75): without Pro the only theme change allowed is the person's own choice of Island for a Garden goal, after a confirmation; if Pro returns they may choose Garden again, and the Garden scene is computed from the goal's current balance and target with the shared stage function. The theme command therefore accepts Garden → Island without the Pro switching capability, and never the reverse. Never alter amounts or delete records on entitlement change. Restore restores license only.

## Four Pro statistics

1. Current total B across every existing goal (active, paused, completed). A deleted goal's entries are gone and no longer counted (D74).
2. Gross deposits and withdrawals in the current local calendar month by saved entry_date.
3. One total daily-balance line for the last 30 calendar days, today and the preceding 29 dates. Include all valid entries before the window as opening balance, then each day's entries across all existing goals. No selected-goal chart or currency grouping.
4. Count goals whose current status is completed; souvenir count is not this count. Reopen changes the status count without removing the souvenir; deleting a completed goal removes it from the count and removes its souvenir.

Backdated corrections/deletions update totals/month/chart. No double-counted collectible snapshot money. Use BigInt aggregates with checked presentation; provide readable chart text.

## Write invariants and deletion

No automatic data loss (D75): neither a lost entitlement nor any other automatic process deletes or changes goals, entries, souvenirs or theme choices; deletion happens only as the person's own confirmed action. Enable foreign keys on every connection and WAL normally. Parameterize inputs. Serialize financial/lifecycle/currency writes in explicit exclusive transactions; query through their transaction handle. Validate lifecycle/capability/Free goal limit/currency-lock and candidate chronological history against current data. Row revisions prevent stale overwrites; operation receipts make retries safe. No optimistic financial success before commit.

The ledger mutation, eligible challenge result changes, unique collectible award and receipt commit together or roll back together. Failure/busy/low storage cannot partly create effects. Animation and notifications run after commit and cannot change money. Whole-goal deletion is the only command that removes a goal; it runs only after a native confirmation and removes the goal's entries, souvenir and attempts with it in one transaction (D74). No correction audit, no automatic database reset and no loss of records on entitlement change.

## OTA and persisted-data compatibility

[EAS_AND_OTA](EAS_AND_OTA.md) applies to migrations and codecs. Once shared, native/persisted-data incompatibilities require a new appVersion/runtime/native release. Same-runtime OTA preserves schema/data meaning for candidate and embedded/known-good fallback. Rollback does not reverse ledger writes. Unknown newer schema retains the database and shows safe recovery; never reset it to launch older code.

## Migration and recovery verification

Keep fixtures for shipped schemas. Test fresh/repeated startup, every supported upgrade, failure midway, newer unknown schema, foreign_key_check/quick_check and Unicode notes on the real iOS Expo SQLite adapter. Future destructive migrations may need a tested SQLite-consistent internal safety snapshot; an open WAL main-file copy is insufficient. This engineering safeguard does not add customer backup, export/import, sync or a restore-data button in v1. Settings/help explains permanent local-data loss risk and license-only Restore Purchases.
