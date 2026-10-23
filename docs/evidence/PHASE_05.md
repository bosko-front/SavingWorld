# Phase 05 evidence: SQLite migrations and ledger repositories

Session date: 23 October 2026. Product authority: [MVP plan v1.2](../Saving_Worlds_MVP_Plan_v1_2.docx), read in full (text and tables) with `textutil -convert txt -stdout` before any change. Phase state at close: **VERIFIED COMPLETE** (see [Result](#result)). Applicable test IDs: T04 (fresh DB, repeated startup, upgrade, interrupted migration, unknown newer schema), T05/T06 ledger rules at the repository/command level (positive amounts, future dates, chronological nonnegative balances, corrections, confirmed deletion; the form/History UI is Phase 07), T26 groundwork (schema refusal without data loss).

## Starting state and dependency evidence

- Working tree: `main` at `13dddd7` (Phase 04), clean. No `src/data/`, no `src/features/`, no migration, no database code; `expo-sqlite` 58.0.13 was already installed in Phase 01 and its config plugin is in `app.config.ts`, so the Phase 02 development build (`ab77dda9-8c1c-4a2e-92be-db22cbef9960`, runtime 1.0.0) already contains the native module. No native dependency or config changed in this phase, so no rebuild.
- Phase 04 dependency re-verified by use: the commands build on `@/core/money` (`isPositiveMinorAmount`, `signedAmount`, `sumMinor`, `toMinorAmount`, `MAX_MINOR`, `getCurrency`, `CURRENCY_REGISTRY`), `@/core/calendar` (`parseCivilDate`, `validateEntryDate`, `validateNewDeadline`, `today`, `utcTimestamp`, `Clock`) and `@/core/access` (`hasOpenGoalSlot`, `canUseTheme`, `capabilitiesFor`). The 421 Phase 04 tests still pass inside the 467 below.
- Verified the pinned expo-sqlite 58.0.13 API in `node_modules/expo-sqlite/build/SQLiteDatabase.js`: `withExclusiveTransactionAsync` opens a **new connection per transaction** and runs `BEGIN` before the task, so `PRAGMA foreign_keys = ON` (a no-op inside a transaction) could never be enabled on it. The app therefore does not use it (DECISIONS D52). iOS stores databases in `Documents/SQLite`; `deleteDatabaseAsync` removes `-wal/-shm/-journal` sidecars and refuses an open connection.

## Toolchain

| Item | Value |
| --- | --- |
| Node / Jest | Node 22.16.0, Jest 30 via `jest-expo/ios`; host SQLite for Jest = `node:sqlite` (SQLite 3.49.1, built into Node) |
| Expo | SDK 58 (expo 58.0.17), RN 0.88.0, expo-sqlite 58.0.13 (bundled SQLite **3.53.3**, reported by `sqlite_version()` on every simulator) |
| Native build | Existing development build `ab77dda9-8c1c-4a2e-92be-db22cbef9960` (Phase 02, EAS, Xcode 27.1). JS served by Metro `npx expo start --dev-client --clear`. Host Xcode 27.1. No new EAS build or update. |
| Simulators | iPhone 17 Pro Max iOS 26.1 (CE4A7B1E-…), SW iPhone SE 3 iOS 18.5 (66F6F9E8-…), SW iPhone Duo iOS 27.1 (E273F5F5-…). Hermes on all (`HermesInternal` present). |

## Implementation

| Planned path | Actual module |
| --- | --- |
| `src/data/db/` connection, runner, migrations | `sql.ts` (SqlExecutor/SqlConnection/SqlDriver boundary), `expo-driver.ts` (production adapter, `useNewConnection` per open; `deleteTestDatabase` only for `dbtest-` names), `database.ts` (`AppDatabase`: write connection + serialized `BEGIN EXCLUSIVE` queue, query-only read connection with read snapshots, pragmas, open/migrate/close, `DatabaseOpenError`, test hook `beforeCommit`), `migration-runner.ts` (`runMigrations`, `MigrationError`, checksums), `hash.ts` (FNV-1a 64 over UTF-8), `migrations/0001-initial-ledger.ts`, `migrations/index.ts` (`MIGRATIONS`, `LATEST_SCHEMA_VERSION = 1`) |
| `src/data/repositories/` | `goal-repository.ts` (statuses, insert/get/count open/summaries with recomputed balance, revision-checked `updateGoalStatus`; no delete), `ledger-repository.ts` (chronological reads, insert, revision-checked update/delete), `receipt-repository.ts` (`requestHash`, lookup → none/replay/conflict, insert), `settings-repository.ts` (typed `currency` key codec, read/write), `row-codec.ts` (row validation, `CorruptRowError`) |
| shared command plumbing | `src/data/command.ts` (`executeCommand`, `reject`, `storage_failure`, operation-ID check), `src/data/ids.ts` (UUID v4 generator, ID pattern) |
| `src/features/ledger/` | `domain/candidate-history.ts` (`validateCandidateHistory`, date/createdAt/id order, BigInt running sums), `application/ledger-commands.ts` (`createEntry`, `correctEntry`, `deleteEntry`), `application/ledger-queries.ts` (`readGoalLedger`) |
| `src/features/goals/application/` | `goal-commands.ts` (`createGoal`: currency gate, Free slot check, theme capability, today/future deadline), `goal-queries.ts` (`readGoalSummaries`) |
| `src/core/text/` | `normalizeUserText` (NFC, trim, code-point length, controls/unpaired surrogates rejected) |
| `src/bootstrap/` | `database-readiness.ts` (zustand store: idle/opening/ready/failed, `getAppDatabase`, Jest-only driver swap/reset), `database-gate.tsx` (splash held until settled, renders the app only when ready), `storage-failure-screen.tsx` (retryable, redacted `SW-DB-<CODE>`, no reset/delete action); `src/app/_layout.tsx` wraps the root Stack in `DatabaseGate` |
| `tests/native/` | `scenario-harness.ts` (Jest-free assertions/runner), `database-scenarios.ts` (S01–S19, restart pair R1/R2) |
| native runner | `src/dev/db-test-runner.tsx` + guarded route `src/app/(tabs)/(home)/dev-db.tsx` (Stack.Protected + `if (__DEV__)` require, as D39), Settings link in development only; `scripts/test-db.mjs` = `npm run test:db` |
| `tests/integration/`, `tests/unit/`, `tests/support/` | `database-scenarios.test.ts` (same scenarios on host SQLite), `database-gate.test.tsx`, `ledger-history.test.ts`, `node-sqlite-driver.ts`, `jest-setup.ts` (Jest `setupFiles`); `navigation.test.tsx` now opens the app database first |
| guardrail | `eslint.config.js`: `expo-sqlite` may be imported only under `src/data/db/` (probe file in `src/features/` → 1 expected error, then deleted) |

Schema 1 (`initial_ledger`, checksum `f060530662e52157`, pinned by a unit test): STRICT tables `settings`, `goals`, `ledger_entries`, `operation_receipts` plus the runner's `migrations` table. No collectibles/challenges/reminders/billing tables, no balance/currency columns, no ledger revision or audit table. CHECKs: target 1..10^12, nonzero |amount| ≤ 10^12, four statuses, two theme IDs, `YYYY-MM-DD` dates, ISO millisecond UTC timestamps, title 1..100 and note 1..500 characters, JSON settings/receipt values. Triggers: no goal DELETE; immutable goal id/createdAt and entry id/goal_id/createdAt; revisions step by exactly one; no ledger insert/update/delete on a completed/archived goal; immutable receipts. FK `ledger_entries.goal_id → goals.id` (RESTRICT). Index `(goal_id, entry_date, created_at_utc, id)` and `(status, updated_at_utc)`.

Command behavior: input validated first (positive minor amount + kind, real civil date not after `today(clock)`, normalized note, operation ID `[A-Za-z0-9_-]{1,64}`, delete needs `confirmed: true`); then in one exclusive transaction: receipt replay or `operation_conflict`, global currency present and valid, goal exists and is open, entry revision equals `expectedRevision` (`stale_entry` with the current revision), the whole candidate history in date/createdAt/id order keeps every subtotal in 0..10^12 (`negative_balance` for the final total, `negative_running_balance` with the dip date, `balance_limit`), then the current-value write and an identifiers-only receipt. Success (`balanceMinor`, `previousBalanceMinor`, `entryRevision`) is returned only after COMMIT. Any other exception rolls back and returns `storage_failure`.

## Checks

| Command | Result |
| --- | --- |
| `npm run lint` | PASS (0 warnings) |
| `npm run typecheck` | PASS |
| `npm test -- --runInBand` | PASS: 16 suites, 467 tests (was 14/441 before the final unit/gate suites; 13/421 at Phase 04 close). First runs had two test-side faults, fixed in the tests: an operation ID in S15 collided with the harness naming (`op-rollback-1`), and navigation tests rendered before the database gate opened (they now open it first). One implementation fault found: a `setImmediate` yield in the Jest host driver stalled under fake timers; switched to a microtask yield. |
| `npm run deps:check` | PASS ("Dependencies are up to date") |
| `npm run doctor` | PASS (20/20) |
| `npm run test:db` | PASS on three simulators, below |
| Release export `npx expo export --platform ios` (production) | Bytecode contains the data layer (`BEGIN EXCLUSIVE`, `initial_ledger`, `operation_receipts`, recovery copy) and none of the runner/scenario strings (`Restart seed`, `dbtest-report.db`, `Run all scenarios`, S19 title: 0 hits) |

## Native SQLite results (`npm run test:db`)

The script picks the simulator, requires Metro, launches the dev client, opens `savingworlds://dev-db?run=<id>`, reads the report the app stored in its container (`Documents/SQLite/dbtest-report.db`, read-only with host `sqlite3`), then terminates the app, relaunches it as a **new process** and runs R2 against the database R1 left. Every scenario statement runs in the device's expo-sqlite (driver `expo-sqlite`, SQLite 3.53.3). Machine-readable reports:

| Simulator | Record | Launch 1 | Launch 2 | App database migration at launch 1 → 2 |
| --- | --- | --- | --- | --- |
| iPhone SE 3, iOS 18.5, `--fresh-install` (app uninstalled and the same bundle reinstalled first) | [JSON](phase-05/test-db-iphonese3-ios18.5-fresh-install.json) | 20/20 | R2 1/1 | `applied [1]` → `applied []` |
| iPhone Duo, iOS 27.1 | [JSON](phase-05/test-db-iphoneduo-ios27.1.json) | 20/20 | R2 1/1 | `applied [1]` → `applied []` |
| iPhone 17 Pro Max, iOS 26.1 (re-run on final code) | [JSON](phase-05/test-db-iphone17promax-ios26.1.json) | 20/20 | R2 1/1 | `[]` → `[]` (its first run earlier in the session, `rmvl0xexha`, showed `applied [1]` on the then-new app database; superseded file, same 21/21 result) |

Scenarios (all PASS on every simulator): S01 fresh schema, exact table list, WAL, `foreign_keys` on writer and reader, `synchronous=FULL`, `quick_check ok`, empty `foreign_key_check`, query-only reader; S02 three reopenings, no re-migration, `applied_at_utc` unchanged, data intact; S03 failing migration 2 (DDL + data update + error) rolls back entirely, then a valid migration 2 upgrades with data intact; S04 newer schema, edited migration and a foreign database are refused and left unchanged; S05 FK, CHECK, STRICT and trigger rejections (including closed-goal ledger delete); S06 v1.2 example 0 + 50 − 20 = 30, withdrawal 31 rejected with no entry or receipt; S07 withdrawal before the first deposit rejected despite a positive final total; S08 deleting a deposit needed by a later withdrawal rejected although a later deposit leaves the total positive, v1.2 "delete initial deposit while withdrawal 20 remains", unconfirmed delete; S09 corrections overwrite, keep createdAt, step revision, revalidate amount/date/sign, no copies; S10 future dates on create/correct, impossible date, Belgrade vs Los Angeles local today at 23:30 UTC; S11 replay of create/correct/delete, payload and command-kind conflicts, receipts without amounts/notes; S12 stale correction/delete, missing entry/goal; S13 5 concurrent 20.00 withdrawals from 50.00 → exactly 2, 20 concurrent deposits exact, 3 concurrent corrections → 1 wins/2 stale, 3 concurrent identical operation IDs → 1 write; S14 SQL-special, Croatian/Serbian, emoji/ZWJ, RTL, CJK, line-break notes byte-exact, NFC + trim, SQLite `length()` = code points, 501 rejected, 500 astral accepted, unpaired surrogate and control char rejected, blank → null; S15 forced failure before COMMIT on create/correct/delete leaves no entry, receipt or change, then the same operation ID succeeds once; raw mid-write throw rolled back; S16 read connection does not see an open write; S17 completed goal rejects create/correct/delete, paused accepts, missing/invalid currency gates goal creation, Free second open goal, target 0, past deadline, Garden on Free, blank title rejected, archive frees the slot, Pro allows more goals and Garden; S18 10^12 ceiling exact, above-ceiling/fractional/zero amounts rejected; S19 same-date same-createdAt ordered by id; R1/R2 currency, goal, entries, correction and receipts identical after a process restart, receipt replays.

## Manual native checks

| Check | Simulator | Result | Evidence |
| --- | --- | --- | --- |
| Startup gating refuses a newer schema and keeps data | SE iOS 18.5 | PASS: with the app terminated, a `currency` settings row and a `migrations` version-2 row were inserted into the simulator's app database (synthetic data) with host `sqlite3`; launch showed the recovery screen ("saved by a newer version", `SW-DB-NEWER_SCHEMA`, Try again, no reset action); both rows still present afterwards | [se-185-newer-schema-recovery.png](phase-05/se-185-newer-schema-recovery.png) |
| Retry opens the app once the cause is gone | SE iOS 18.5 | PASS: removed the version-2 row from the host, tapped Try again → Home with native tabs; `currency` row intact, schema 1 | [se-185-retry-opens-app.png](phase-05/se-185-retry-opens-app.png) |
| Native runner screen | 17 Pro Max iOS 26.1 | PASS: "20 of 20 passed" | [promax-261-runner-summary.png](phase-05/promax-261-runner-summary.png) |
| App database on disk | SE iOS 18.5 | `Documents/SQLite/saving-worlds.db` in WAL with `-wal/-shm`, migrations `1 initial_ledger f060530662e52157`, the five tables, two indexes and nine triggers; scenario `dbtest-` files all removed after runs | host `sqlite3 -readonly` output in session |

## Dependency and native verification

No package, plugin, native configuration or EAS change; `deps:check` and expo-doctor pass. The installed dev build already contained ExpoSQLite (shown by every native run). Persisted-data contract: schema 1 is the first persisted format; runtime 1.0.0 has not been shared, so no app-version bump is needed now. Any later migration follows EAS_AND_OTA (new app version/runtime/native build, never OTA-only).

## Unresolved limitations

- `crypto.randomUUID`/`getRandomValues` are absent on this Hermes build; IDs fall back to `Math.random` UUID v4 (122 random bits). Adequate for local uniqueness, not for secrets (DECISIONS D54). Revisit if `expo-crypto` is added for another reason.
- Opening a database sets `journal_mode=WAL` before the history check, so an unreadable newer/foreign file may get its journal-mode header flag changed; schema and rows are never changed (Jest gate test and S04 check them).
- A Settings currency-change command with the lock, goal edit/lifecycle commands and any UI that writes data are Phase 06/07 scope; only `createGoal` and the ledger commands exist. Phase 05 adds no financial form.
- Physical-device SQLite (file protection, low storage) is not covered by simulators; Phase 21 resilience checks own it.
- Carried, unchanged: Phase 04 Hermes `Intl` observation (Phase 06), Phase 03 physical-Duo split view (D48).

## Result

Every Phase 05 acceptance criterion has native evidence: fresh install and repeated startup produce schema 1 without resetting data (SE fresh install and Duo `[1] → []`, S01/S02, R1/R2); duplicate operation IDs do not duplicate, payload mismatch and stale edits fail clearly, current/chronological negative balances and future dates are rejected atomically with no audit versions (S06–S13, S17); forced mid-write and migration errors leave prior data intact (S03, S15, S04 and the manual newer-schema check). Standard checks pass. **Phase 05 VERIFIED COMPLETE.** Next prompt: [PHASE_06](../prompts/PHASE_06.md).
