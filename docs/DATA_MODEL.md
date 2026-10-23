# Data model and invariants

Contract aligned 23 October 2026 to [MVP plan v1.2](Saving_Worlds_MVP_Plan_v1_2.docx), especially sections 3/4/7. Phase 05 implemented schema 1 (`src/data/db/migrations/0001-initial-ledger.ts`): migrations, settings, goals, ledger_entries and operation_receipts as STRICT tables with the constraints and triggers in DECISIONS D53; the other tables below are still planned. Apply tables only in their owning phases. Q01-Q06 are resolved; [reconciliation](SOURCE_RECONCILIATION.md) records authority.

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

Choose currency during onboarding before creating a goal. A later Settings-only change is allowed iff the database contains zero transactions and zero collectibles across all goals, including closed ones. Recheck this inside the same serialized write boundary as financial mutations. It is not a lifetime lock after a deleted transaction. A retained collectible still locks it. Apply a permitted choice to all existing empty goals; explain and confirm that no amounts are converted. Validate any newly interpreted target against the selected metadata without inventing FX behavior.

Implemented in Phase 06 (DECISIONS D56): `setGlobalCurrency` serves onboarding and Settings, counts ledger entries and souvenirs inside its exclusive transaction, and rewrites each empty goal's target to the same written amount in the new exponent (1,000.00 EUR → 1,000 JPY). A target the new currency cannot show exactly, or one above 10^12, refuses the change instead of rounding. Until Phase 11 creates `collectibles`, the souvenir count is 0 when the table is absent.

## Exact deadline estimate

For an unexpired deadline D=count of calendar days from today through deadline inclusive, D>=1. Weekly=min(R,ceil(R*7/D)); monthly=min(R,ceil(R*30/D)), ceil in minor units. These are alternative approximate paces, not calendar contribution schedules. R=10000 minor, D=30 gives weekly 2334 and monthly 10000. Deadline today gives R for both. No deadline means no estimate. Past deadline with R>0 shows Overdue and R without estimates; R=0 yields zero and no Overdue. No anchored month-end opportunity-count formula.

## Tables and planned migration ownership

### migrations (Phase 05)

version INTEGER PRIMARY KEY, name, checksum, applied_at_utc. Ordered immutable migrations execute transactionally. An unknown newer schema fails safely. Never rewrite a released migration or reset user data.

### settings (Phase 05; global currency UI in 06)

key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at_utc. Typed keys: `currency` = {code, exponent, registryVersion} (implemented Phase 05; the global currencyCode with versioned exponent metadata), `selectedGoalId` = a JSON string (implemented Phase 06; a hint that falls back to the oldest open goal), weeklyReminderEnabled and optional additional reduce-motion preference. Onboarding is complete once a valid `currency` exists; no separate onboardingCompleted key is stored (D56). UI is English with locale-aware numeric/date formatting. No preferred-new-goal currency or purchase override. Missing/invalid currency gates goal creation; no silent default reinterpretation of financial data.

### goals (Phase 05; lifecycle in 06, Finish integration in 11)

id TEXT PRIMARY KEY, title TEXT NOT NULL, target_minor INTEGER CHECK(target_minor>0 AND target_minor<=1000000000000), deadline_date TEXT NULL, theme_id TEXT NOT NULL, status TEXT CHECK(status IN ('active','paused','completed','archived')), created_at_utc, updated_at_utc, revision INTEGER CHECK(revision>=1).

Start at zero; no currency/exponent/balance column. Index status/updated time. active and paused are open and count against Free's one slot; Pro has no open-goal limit. paused permits editing and transactions without resuming reminder eligibility. Archive preserves all records. No whole-goal deletion command or UI. completed/archived are read-only until Reopen passes the current Free limit and sets active. Finish requires open goal and B>=T, sets completed and releases a slot. Reopen at >=100% never auto-finishes. Target/theme/deadline/ledger edits share the closed-goal guard. Phase 06 implements Edit, Pause, Resume, Archive, Finish (command only; UI in Phase 11) and Reopen with revision checks and receipts (DECISIONS D57); Archive and Finish start from an open goal, and an unchanged expired deadline may be kept on edit.

### ledger_entries (Phase 05; UI in 07)

id TEXT PRIMARY KEY, goal_id TEXT NOT NULL REFERENCES goals(id), signed_amount_minor INTEGER CHECK(signed_amount_minor!=0 AND abs(signed_amount_minor)<=1000000000000), entry_date TEXT NOT NULL, note TEXT NULL, created_at_utc TEXT NOT NULL, updated_at_utc TEXT NOT NULL, revision INTEGER CHECK(revision>=1).

Phase 07 added the UI (DECISIONS D61): one Add/Edit Entry form and History on the unchanged Phase 05 commands; History shows current rows newest first, the exact reverse of the validation order. Index (goal_id,entry_date,created_at_utc,id). Currency comes only from AppSettings. created_at_utc is immutable on correction. Current values overwrite on edit; confirmed deletion removes the entry. No ledger_revisions table, before/after snapshots or audit UI. Row revision is concurrency protection, not retained financial history. Validate date/length/Unicode and chronological balance at the command boundary.

### operation_receipts (Phase 05; extended by later commands)

operation_id TEXT PRIMARY KEY, command_kind, request_hash, result_json, created_at_utc. Same transaction as the effect. Same ID/payload returns the prior minimal result; changed payload fails. Receipts retain identifiers/outcome needed for safe retry, not previous financial entry versions or a correction journal. Never log note/amount payloads. Serialized writes and stale-row checks remain implementation safeguards.

### collectibles (Phase 11)

The Phase 06 currency lock already reads this table through `src/data/repositories/collectible-repository.ts` when it exists; keep the name `collectibles`.

goal_id TEXT PRIMARY KEY REFERENCES goals(id), theme_id TEXT NOT NULL, theme_version INTEGER NOT NULL, earned_at_utc TEXT NOT NULL. Optional immutable display snapshots of title/target at award may be retained for honest Collection captions; they are not an entry audit or an authoritative financial total. Currency is global; a collectible locks Settings currency changes.

After a saved transaction mutation or target edit first yields B>=T, insert exactly once by unique goal_id, in that same transaction. Also Free. Goal status is unchanged. Withdrawal, correction (including an initial mistake), target/theme changes, Archive, Finish and Reopen never remove/replace the souvenir. Repeat threshold crossings cannot add another. Preserve referenced historical theme manifests; no screenshot blob needed. Live scene always follows current B/T.

### challenge_attempts (Phase 12)

id TEXT PRIMARY KEY, goal_id REFERENCES goals(id), rule_id CHECK IN ('first_step','next_milestone','weekly_step'), target_minor INTEGER NULL, started_at_utc TEXT NOT NULL, start_date TEXT NOT NULL, period_end_date TEXT NULL, period_timezone TEXT NOT NULL, period_end_at_utc TEXT NULL, week_start_date TEXT NULL, state CHECK IN ('active','historical'), result CHECK IN ('completed','not_completed','skipped') NULL, historical_at_utc TEXT NULL.

target_minor is frozen positive money for next_milestone/weekly_step; first_step checks existence of a positive deposit instead. state distinguishes an unfinished current attempt from historical presentation, independently of a corrected result. Partial unique index on goal_id WHERE state='active' enforces one unfinished attempt. Check first_step's once-per-goal availability and weekly_step's once-per-goal/calendar-week availability in the serialized start command. Store the original local Monday-Sunday interval/timezone; travel never shifts a saved attempt or creates a second current one. No custom definitions, schedule versions, editable amount/frequency, separate challenge pause, reminder or transaction-link table.

## Three fixed challenge rules

| Rule | Availability and frozen target | End |
| --- | --- | --- |
| First step | Once per goal; one eligible positive deposit after start. No money target configuration. | No deadline |
| Next milestone | Only while B<T; next threshold=ceil(T*(floor(10*B/T)+1)/10), target=threshold-B at start. | No deadline |
| Weekly step | Only with unexpired goal deadline and R>0. Freeze the exact weekly estimate at start; at most once per goal/calendar week. | That week's Sunday even when started midweek; no automatic target increase |

Eligibility: original createdAt strictly after startedAt, entry_date>=start_date and <=period_end_date if present. For weekly attempts the original entry must also have been created before the saved end of that period. A transaction newly created after the week ended cannot retroactively complete it even with a backdated entry date. Corrections to existing eligible records preserve createdAt and can change their contribution/result.

Next milestone and Weekly step progress=max(0,sum eligible signed amounts); completed when it reaches the frozen target. First step checks an eligible positive deposit. Eligible withdrawals reduce net progress; edits/deletions recompute results for affected current and historical attempts. Goal target/deadline edits do not rewrite a started attempt's frozen target/period. An expired unsuccessful period is Not completed. Skip stores historical Skipped without punishment; select an allowed fixed type for a new attempt rather than editing the old one.

Completed, Not completed and Skipped are historical presentations. Once historical, an attempt never automatically returns to active, never consumes the current slot and never repeats a completion notification after a correction. Corrections may change a historical Completed/Not completed result; Skipped remains skipped and history is retained. Challenges have no notification schedule. Add savings opens the same transaction form/command as Home; the challenge start/skip/result engine never creates, copies or double-books a transaction. No manual evidence confirmation/linking flow is required.

### reminder intent and notification_requests (Phase 14)

Use settings.weeklyReminderEnabled as the single global opt-in, plus durable request intent/logical_key/native_request_id/revision/error status for OS reconciliation. No goal_id, challenge_id, editable cadence or time controls in reminder preferences. Desired schedule is one global local weekly Sunday 18:00 device-time notification iff opt-in, permission and at least one active goal exist. paused/completed/archived do not qualify. Editing a paused goal does not resume it.

Persist intent before OS scheduling, reconcile pending requests at launch/foreground and after settings/lifecycle/permission/timezone changes, cancel duplicates/orphans. Native OS calls cannot join SQLite transactions. Use generic text and a safe Home/current-active-goal fallback on tap. No financial data in notifications or server push.

### entitlement_cache and purchase_events (Phase 15)

Cache: product_id PRIMARY KEY, status CHECK IN ('verified','not_owned','revoked','unknown'), native_transaction_id, verified_at_utc, last_attempt_at_utc, last_error_code. Events: native_transaction_id PRIMARY KEY, product_id, verification_state, processed_at_utc, finished_at_utc, revoked_at_utc. Re-delivery reconciles by ID. No raw receipt payload in normal logs. Native verified state is authoritative; pending/unverified never unlocks Pro.

Pro maps only to unlimited open goals, Garden/open-goal switching and four statistics. Retain prior verified rights through temporary network failure. If StoreKit confirms no right, preserve all data/souvenirs, require selection of at most one open Free goal and archival of others before further entries, and use Island for the open Free goal. Retain Garden souvenirs. Never alter amounts or delete records. Restore restores license only.

## Four Pro statistics

1. Current total B across every goal, including active/paused/completed/archived.
2. Gross deposits and withdrawals in the current local calendar month by saved entry_date.
3. One total daily-balance line for the last 30 calendar days, today and the preceding 29 dates. Include all valid entries before the window as opening balance, then each day's entries across all goals, including archived. No selected-goal chart or currency grouping.
4. Count goals whose current status is completed; souvenir count is not this count. Reopen/Archive changes the status count without removing the souvenir.

Backdated corrections/deletions update totals/month/chart. No double-counted collectible snapshot money. Use BigInt aggregates with checked presentation; provide readable chart text.

## Write invariants and deletion

Enable foreign keys on every connection and WAL normally. Parameterize inputs. Serialize financial/lifecycle/currency writes in explicit exclusive transactions; query through their transaction handle. Validate lifecycle/capability/Free-slot/currency-lock and candidate chronological history against current data. Row revisions prevent stale overwrites; operation receipts make retries safe. No optimistic financial success before commit.

The ledger mutation, eligible challenge result changes, unique collectible award and receipt commit together or roll back together. Failure/busy/low storage cannot partly create effects. Animation and notifications run after commit and cannot change money. No whole-goal deletion, no correction audit, no automatic database reset and no loss of records on entitlement change.

## OTA and persisted-data compatibility

[EAS_AND_OTA](EAS_AND_OTA.md) applies to migrations and codecs. Once shared, native/persisted-data incompatibilities require a new appVersion/runtime/native release. Same-runtime OTA preserves schema/data meaning for candidate and embedded/known-good fallback. Rollback does not reverse ledger writes. Unknown newer schema retains the database and shows safe recovery; never reset it to launch older code.

## Migration and recovery verification

Keep fixtures for shipped schemas. Test fresh/repeated startup, every supported upgrade, failure midway, newer unknown schema, foreign_key_check/quick_check and Unicode notes on the real iOS Expo SQLite adapter. Future destructive migrations may need a tested SQLite-consistent internal safety snapshot; an open WAL main-file copy is insufficient. This engineering safeguard does not add customer backup, export/import, sync or a restore-data button in v1. Settings/help explains permanent local-data loss risk and license-only Restore Purchases.
