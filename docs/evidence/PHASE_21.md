# Phase 21 evidence: resilience, performance and release candidate

Session date: 27 October 2026. State: **IN PROGRESS**. The automated, native-SQLite and simulator parts below are done and the RC builds exist (5e207eba simulator, 9a42b94e device building); the checks on the RC, the OTA repeat on it and every physical-iPhone/Duo check are NOT RUN (see "Not run and blockers"). Prompt: [PHASE_21](../prompts/PHASE_21.md). Decision: D144.

## Starting point and dependencies

- Read v1.2 in full (textutil) and the required documents (README, PRODUCT_REQUIREMENTS, SOURCE_RECONCILIATION, DECISIONS, DEVELOPMENT_RULES, PROJECT_STATUS, SESSION_HANDOFF, ARCHITECTURE, DATA_MODEL, TEST_PLAN, RELEASE_CHECKLIST, ASSET_SPEC, EAS_AND_OTA runbook, the Phase 21 roadmap entry).
- Baseline `main` 92e7586, clean. Phase 20 VERIFIED COMPLETE (D143). Phases 06-19.5 were closed with physical-device checks carried to this phase (D60, D63, D83, D88, D90, D102, D107, D109, D114, D133, D138): none of those carried checks is itemized yet.
- Tooling found: Maestro 2.6.1 (Java 17), Xcode simulators iOS 18.5-27.1, a paired physical iPhone 14 Pro (the owner's; not touched), Metro already running on 8081 from another session in this folder (used read-only for `test:db`), a booted "iPhone Duo" and "SW iPhone SE 3 iOS 18.5" used by that other session (not touched after the first `test:db` run).
- Runtime gate before any change: `node scripts/release-check.mjs` PASS (runtime 1.0.0, fingerprint c83b89a5…, schema 5).

## Expected modules → actual files

| Planned | Actual |
| --- | --- |
| `tests/native/` financial and native failure scenarios | `tests/native/resilience-scenarios.ts` (RS01), `tests/native/performance-scenarios.ts` (PF01-PF03); registered in `src/dev/db-test-runner.tsx` (native) and `tests/integration/database-scenarios.test.ts` (host) |
| `maestro/` critical iOS journeys | `maestro/journeys/01-05`, `maestro/subflows/`, `maestro/perf/`, `maestro/README.md`; runner `scripts/test-e2e.mjs` (the `test:e2e` check, not an npm script: package.json "scripts" are part of the native fingerprint) |
| performance fixes in measured modules only | `src/features/challenges/domain/challenge-rules.ts` (date-indexed counting), `src/data/repositories/ledger-repository.ts` + `src/features/ledger/application/ledger-queries.ts` (bounded History read), `src/features/ledger/presentation/history-screen.tsx` (+ `ledger-copy.ts` "Show older entries"), `src/bootstrap/app-data.ts` (`useCommittedRead` `keepWhileLoading`) |
| build/test scripts and release configuration validation | `scripts/release-audit.mjs`; `src/app/(tabs)/(home)/details.tsx` reduced to a `__DEV__` stub (the audit's one finding) |
| fixtures | `tests/integration/performance-fixture.test.ts` (writes app-database files with `PERF_FIXTURE_DIR`, seeded on simulators with `node scripts/ota-drill.mjs seed`) |

## Fixtures

- **PF01 (native SQLite, EUR):** 8 goals, 10,004 entries (10,000 seeded over 1 Nov 2023 - 22 Oct 2026, one goal with 7,000; 4 funding deposits through `createEntry` award 4 souvenirs; 3 goals finished through `finishGoal`), 52 Weekly steps started through `startChallenge` on the 7,000-entry goal (one per week, 27 Oct 2025 - 19 Oct 2026). Deposits 5-200 major units, every tenth entry a withdrawal of at most 5% of the running balance. Database 2.16 MB. Totals checked against the generator's own BigInt sums: every goal balance and entry count, souvenirs, statistics total €192,786.53, October deposits/withdrawals, completed = 3, last daily balance = total, formatted digits = minor units.
- **PF02 / PF03:** separate whole-app databases in JPY (0 decimals, ¥9,120,634) and BHD (3 decimals, BHD 91,205.886), 2,004 entries each, same checks.
- **UI fixtures (app database files):** `ui-free-10k` = Free, one Island goal "House deposit" with 10,000 entries (€33,720.23 of €67,440.46, 50%) and 52 weekly quests; `ui-collection` = 13 goals, 12 souvenirs, 9 finished, no entitlement row (the app shows the lost-Pro state, which lists every souvenir). Synthetic only; Pro is never seeded.

## Measurements

Simulator timings are not device results (TEST_PLAN). They locate bottlenecks and show before/after on the same machine; the device budget (cold local readiness ≈ 3 s, 60 fps short transitions) is a physical-iPhone check, NOT RUN.

### Native SQLite (Expo SQLite, Hermes, development build on "SW iPhone SE 3 iOS 18.5" / "SW P21 Perf SE" iOS 18.5), PF01 medians

| Operation | Before (`test-db-se-ios18_5-before.json`) | After (`test-db-se-ios18_5-after.json`) |
| --- | --- | --- |
| Open existing database (migration check) | 6.8 ms | 8.1 ms |
| Home snapshot (`refreshAppData` reads) | 5.6 ms | 6.6 ms |
| Whole 7,000-entry ledger (commands, Edit Entry) | 69.2 ms | 82.6 ms |
| History page (newest 100 + SQL count/sum) | — (did not exist) | **4.2 ms** |
| Savings insights (four statistics) | 8.2 ms | 10.7 ms |
| Quest board, 52 quests × 7,000 entries | **154.7 ms** | **97.7 ms** |
| Deposit on the 7,000-entry goal | **117.3 ms** | **97.3 ms** |
| Correction of its oldest entry | **114.5 ms** | **90.2 ms** |
| Confirmed deletion | **127.6 ms** | **86.2 ms** |
| Deposit on a 350-entry goal | 5.5 ms | 6.4 ms |

Fixture seeding (52 quest starts on the 7,000-entry goal) 11.1 → 5.2 s. What remains in each heavy-goal write is the whole-ledger read and chronological check (~80 ms here), which the nonnegative-subtotal rule needs. Host SQLite (Node, Jest) gave the same picture: board 162 → 35 ms, heavy-goal writes ~130 → ~30 ms, seeding 7.2 → 2.6 s.

Cause and fix (measured, D144): every ledger write and the quest board settled every quest against every entry (O(quests × entries), 52 × 7,000 string comparisons ×5, twice per quest on the board). `attemptProgress` now orders a goal's entries by date once per entry list (a `WeakMap` on the list) and each quest visits only the entries dated inside its own window; `countsForAttempt` still decides each entry, so results are unchanged. `tests/unit/challenge-rules.test.ts` "date-indexed counting" compares it with the full check on 40 random unsorted ledgers × 3 rules and checks that a new list is never read from an older list's order.

### UI in a release-mode build ("SW P21 Perf SE", iPhone SE 3rd gen iOS 18.5, `ui-free-10k`)

| Screen | Before: Phase 20 preview-simulator build e86513c7 | After: measurement build |
| --- | --- | --- |
| History of the 10,000-entry goal | **Nothing drawn after 10+ minutes** (screenshot 01; the app stayed responsive, Back worked, the accessibility hierarchy request timed out). Critical defect. | First 100 rows visible **0.33 s** after the tap (Maestro assert), "Show older entries" adds the next 100 in 0.77 s (screenshots 02, 03) |
| Challenges with 52 past quests | Drawn; Past quests reachable | Drawn; Past quests reachable in 2.3 s of scrolling |
| Collection with 12 souvenir worlds (`ui-collection`) | Gallery drawn at once (screenshot 04); footprint 247 MB on Home → 261 MB on Collection (simulator `footprint`, not device memory) | unchanged code |

Measurement build: a copy of e86513c7 (same native fingerprint c83b89a5…) with `main.jsbundle` replaced by the Hermes bundle exported from this tree (`npx expo export --platform ios`) and re-signed ad hoc for the simulator. It is a measurement aid only, not the release candidate.

Cause and fix (D144): History rendered every entry inside the shared scrolling `Screen`. It now reads one bounded page (`readHistoryPage`: newest `limit` rows by the reverse chronological order through the goal index, plus the goal's entry count and balance from SQL over all entries) and shows `HISTORY_PAGE_SIZE` = 100 rows, with "Show older entries" adding 100 at a time; the shown rows stay while a longer page loads (`useCommittedRead(..., { keepWhileLoading: true })`). Count, balance, newest-first order, row labels, corrections and read-only states are unchanged. `tests/integration/ledger-ui.test.tsx` "shows a long history one page at a time" (230 entries: 100, 200, 230, balance from every entry).

Not measured: cold launch on a device (simulator Maestro launches took 1.8-3.5 s to the first assert, but include the driver), frame pacing, energy, decoded image memory, ambient motion on/off (D90), unlock moment (D88), Collection float (D100) and celebrations: physical iPhone with Instruments, NOT RUN.

## Resilience (native SQLite)

RS01 (new, real SQLite, not an injected throw): `PRAGMA max_page_count` caps the app's own write connection at the file's current size. After 6 saved long-note deposits the next `createEntry` failed with `storage_failure` "database or disk is full" (SQLite code 13); the entry, its receipt and the quest result were all rolled back, reads and the Home snapshot kept working, `quick_check` = ok, a correction needing a page failed the same way with the entry unchanged; after space returned the same operation ID committed exactly once and a second retry replayed; the state survived a reopen. Existing native scenarios already cover the other interruption cases and were rerun: S03 failed migration rollback, S04 unknown/edited schema, S11/L06 lost acknowledgment replay after reopen, S12/L07 stale revisions, double tap, failed write keeps the operation ID, S13/G02 concurrent writes, S15/C02/H05 forced mid-transaction failure with souvenir/quest rollback, R1/R2 kill-and-restart replay. Foreground date change: Jest `home-dashboard.test.tsx` (Overdue after a foreground past midnight, one re-read) and `challenge-foreground.test.tsx`.

## Release-candidate audit (`node scripts/release-audit.mjs`)

Exports the production iOS bundle (plain JS and Hermes) and checks:

| ID | Check | Result |
| --- | --- | --- |
| A1 | Distinctive strings of `src/dev/**` and `tests/native/**` absent from the release bundle | FAIL first (4 stage names: false positives from the theme manifests), then PASS after counting manifest text as product text |
| A2 | Every development route inside `Stack.Protected guard={__DEV__…}` with its body behind `if (__DEV__)` | FAIL first: `details.tsx` (Phase 03 layout-lab sample) rendered its text in release; made a stub → PASS |
| A3 | No app log prefix (`[app-data]`, `[billing]`, `[database]`, `[reminders]`, `[worlds]`) or Jest fake in the bundle; every console call in `src/` under `__DEV__` | PASS |
| A4 | No entitlement override (`capabilitiesFor('pro')` outside the domain, test imports); `currentCapabilities()` derives only from the stored verified status | PASS |
| A5 | Bundled images only from `assets/themes/{island,garden}/{1536,previews}` and expo-router's icons; no template/placeholder names | PASS (67 Garden + 49 Island layers, 20 previews, 12 router icons) |
| A6 | Production config: update URL, appVersion runtime, bundle ID, light/dark/tinted icons, splash mark, no ATS exception, version = package.json | PASS |

Also seen in e86513c7's Info.plist: `NSAllowsLocalNetworking` true (Expo's default ATS entry; no `NSLocalNetworkUsageDescription`/Bonjour in release). Recorded for the Phase 22 privacy review. Release bundle: "Show older entries" present, "Detail screen", "Run all scenarios", "dbtest-report" absent.

## Critical journeys (Maestro, release-mode build, "SW P21 E2E" iPhone 17 Pro iOS 26.0, Reduce Motion on)

`node scripts/test-e2e.mjs --device <SW P21 E2E> --report docs/evidence/phase-21/e2e-e86513c7.xml` → **test:e2e PASS, 5/5** on the Phase 20 release-mode build e86513c7 (the RC does not exist yet; the journeys do not touch the changed History paging beyond two entries). The region proposed RSD, so amounts are matched without a symbol.

| Journey | Result | Time |
| --- | --- | --- |
| 01 Free ledger + cold restart (50 − 20 = 30, 31 refused with draft kept and nothing written, 50 → 60 = 40, restart keeps 40.00) | PASS | 2m 43s |
| 02 First step from Challenges, deposit counted once, "History (1 entry)" | PASS | 1m 40s |
| 03 First 100% → Finish → Collection → Reopen at 100% ("Still open") | PASS | 1m 59s |
| 04 Second Create → "Build another world", confirmed Delete, new goal | PASS | 2m 34s |
| 05 Currency picker offered without transactions, locked after one; reminder switch on | PASS | 1m 48s |

Flow lessons recorded in `maestro/`: the number pad has no return key (never tap a control it covers: the tap types a key), the souvenir detail has no tab bar (D112), Maestro pre-grants notification permission (the opt-in dialog stays a device check). Seen on the way: the paywall on a simulator release build shows the real localized price ($7.99).

## Verification

| Check | Environment | Result | Detail |
| --- | --- | --- | --- |
| `npm run lint` | host | PASS (exit 0) | after all changes |
| `npm run typecheck` | host | PASS (exit 0) | |
| `npm test -- --runInBand` | host | PASS (exit 0) | 61 suites, 1,625 passed, 1 env-gated skip. A first run under a load average of ~265 (four simulators) failed only with 5 s test timeouts; rerun after shutting two simulators down passed |
| `npm run test:db` before the fixes | "SW iPhone SE 3 iOS 18.5", dev build 0799fb03 | PASS 59/59 + R2 1/1 | `docs/evidence/phase-21/test-db-se-ios18_5-before.json` |
| `npm run test:db` after the fixes | "SW P21 Perf SE" iOS 18.5, dev build 0799fb03 | PASS 59/59 + R2 1/1 (a first after-run during a Maestro run on another simulator also passed; its timings, about 3× slower across untouched reads too, were replaced by this quiet run) | `docs/evidence/phase-21/test-db-se-ios18_5-after.json` |
| `node scripts/release-check.mjs` | host | PASS | fingerprint unchanged, stored-data contract unchanged: the changes are OTA-compatible with runtime 1.0.0 |
| `node scripts/release-audit.mjs` | host | PASS (A1-A6) | see above |
| `node scripts/test-e2e.mjs` | "SW P21 E2E" | PASS 5/5 (exit 0) | |
| `npm run deps:check`, `npm run doctor` | — | NOT RUN | no dependency change |
| `npm run test:storekit` | — | NOT RUN | billing unchanged |

Test IDs exercised this session: T01 (exponents in separate whole-app fixtures), T04, T05, T06, T07, T09, T12, T16, T19 (journeys), T27, plus the performance item of "Failure injection and performance".

## Release-candidate builds (owner-approved, 27 October 2026)

Committed locally as **ce46419** on `main` (not pushed). EAS builds from that commit, profile → channel preview, environment production, 1.0.0 (1), runtime 1.0.0:

| Build | Profile | State at session end | Fingerprint |
| --- | --- | --- | --- |
| **5e207eba-847f-47c0-98a9-9a7725aec0eb** | `preview-simulator` | FINISHED; recorded with `node scripts/release-check.mjs --record` (gate PASS) | c83b89a5d246 = shared runtime |
| **9a42b94e-26eb-415a-8aca-1b0698d84f56** | `preview` (ad hoc device) | FINISHED; recorded with `--record` (gate PASS); install page https://expo.dev/accounts/bosko123/projects/saving-worlds/builds/9a42b94e-26eb-415a-8aca-1b0698d84f56 | c83b89a5d246 (computed at upload) |

The owner's EAS free plan is at about 80% of its build allowance: no further EAS build without explicit approval; Phase 22 still needs the `production` build. Not yet run on the RC: `test:e2e`, `release-audit` against its embedded bundle, the Phase 20 OTA/offline runbook, and the device matrix.

## Not run and blockers

Every item below is mandatory for Phase 21; each keeps the phase IN PROGRESS.

| Item | Owner | Impact | Next action |
| --- | --- | --- | --- |
| Owner smoke test of device RC 9a42b94e on the iPhone 14 Pro | Owner | RC not yet seen on a device | Install from the EAS build page; open with existing data, History, one entry + one correction, Pro still active, Restore, Airplane Mode launch, ambient motion heat/battery impression |
| `test:e2e`, `release-audit` and the offline/OTA/known-good fallback repeat on the RC binary with the release fixture | Agent after the RC build | T24-T26 on the RC | Rerun the Phase 20 runbook against the RC simulator build; publish one preview update and roll back to embedded |
| Oldest supported iPhone for profiling | Owner | The only device available is an iPhone 14 Pro; "oldest supported" is not established | Owner names the baseline (or accepts the 14 Pro plus a recorded limitation) |
| Device profiling with Instruments: cold launch, History/Home/Challenges/Collection with the 10,000-entry fixture, both worlds stage 0 → 10, decoded image memory vs ~32 MiB/world, ambient on/off energy and hitches (D90 keep/simplify/off decision), unlock moment and rapid deposits (D88), Collection float (D100), celebrations | Owner's device + agent | Release performance unproven; D90 decision open | Development-signed Release build on the device (Instruments needs `get-task-allow`); fixture through the dev runner or the app |
| Real purchase and Restore on the RC (sandbox), confirmed-loss handling on device | Owner | R18/R21 on the RC | Owner runs the paywall/Restore steps on the RC |
| Weekly reminder on the RC: real Sunday 18:00 delivery (or a zone change that reaches it), travel, DST, reinstall leaves one request (D109) | Owner | R17 on device | Owner, with the RC installed |
| VoiceOver walkthroughs on the RC (D60, D63, D83, D88, D102, D107, D133), felt haptics | Owner | R22 itemized evidence | Owner, itemized per screen |
| Duo: inner split view both sides, fold/unfold/rotate with an entry draft (D47, D48, D63), release-mode cold launch carried from Phase 20 | Owner (physical Duo) | R25 | Owner's Duo or recorded unsupported-device limitation |
| App icon light/dark/tinted and launch screen on a physical iPhone with the RC (D114) | Owner | R01 store readiness | Owner, after installing the RC |
| Pro journeys in Maestro (purchase, Garden switch, statistics) | — | Covered by Jest over the real billing path only | Device steps above |

## R01-R26 audit

Status words: **auto** = Jest/host, **native** = Expo SQLite on a simulator, **sim** = simulator UI/release build, **device** = physical iPhone (owner-reported where marked), **open** = still required for release.

| ID | Evidence now | Open for Phase 21 |
| --- | --- | --- |
| R01 iOS Expo TS | Installable preview builds e86513c7/638cba93 (Phase 20); gate PASS | RC build; icon/launch on a physical iPhone (D114) |
| R02 no account/backend | No network code besides StoreKit and expo-updates (D137); J01-J05 run with no account; audit A4 | Airplane-mode journeys on the RC device |
| R03 SQLite ledger | native 59+1 (restart), RS01, PF01-03; J01 cold restart | — (device SQLite seen on the owner's iPhone through Phases 15-20, owner-reported) |
| R04 lifecycle/deletion | native G01/G07/G09/C04/C05; J03, J04 | VoiceOver of the delete confirmation (D60) |
| R05 one Free goal | native G01/G02; J04 "Build another world" | — |
| R06 entries/corrections | native S06-S19, L01-L08; J01 (50 − 20 = 30, 31 refused, 50 → 60 = 40) | Draft through rotation/fold on device (D63) |
| R07 one currency | native G04; PF02 JPY, PF03 BHD whole-app fixtures; J05 lock | — |
| R08 views/deadline | auto `home-dashboard`, `savings-plan`; not in Maestro (native date picker) | Deadline journey on device |
| R09 progression | auto world tests, still-stack checks (Phases 09/17) | Frames on device (D83, D88) |
| R10 Island | approved art bundled (audit A5) | Decoded memory/frames stage 0-10 on device (D83); ambient keep/off decision (D90) |
| R11 Garden | approved art bundled (A5), Phase 17 | Garden on device with a real Pro right, motion energy |
| R12 scene experience | auto motion tests, Reduce Motion | Unlock recording, energy, hitches (D88, D90, D100) |
| R13 souvenir/Finish | native C01-C06; J03 | Collection VoiceOver/haptics (D102) |
| R14-R16 challenges | native H01-H07, PF01 (52 quests, faster counting), auto equivalence test; J02 | Challenges VoiceOver/haptics, glide/sparkle frames (D107) |
| R17 reminder | auto + Phase 14 simulator delivery; J05 opt-in permission | Real Sunday 18:00, travel, DST, reinstall on the RC (D109) |
| R18 Pro lifetime | Phase 15 StoreKit 9/9, sandbox owner-reported | Purchase/Restore on the RC |
| R19 statistics | native P01-P03, PF01-03 totals and month sums | Statistics VoiceOver with Pro on device (D133) |
| R20 theme switching | native G10, auto | Pro switch on device |
| R21 purchase resilience | auto billing lifecycle, StoreKit tests, audit A4 | Offline/confirmed loss on the RC device |
| R22 English/a11y/privacy | ESLint catalog guard, catalog test, audit A3 (no logs) | Itemized VoiceOver on the RC (D60, D63, D83, D88, D102, D107, D133) |
| R23 local-data boundaries | Settings "Your data" (Phase 19), no backup control | — |
| R24 setup/styling | Phases 01-02, contrast tests | — |
| R25 adaptive/Duo | Phase 03 simulator matrix | Physical Duo split view, fold/rotate with a draft, Duo release cold launch (D47, D48, D63) |
| R26 EAS/OTA | Phase 20 drill; gate PASS (changes are OTA-compatible) | OTA/offline/known-good repeat on the RC with the release fixture |

No known critical financial, data-loss or startup defect remains in code: the one critical defect found (History unusable with a large ledger) is fixed and verified in a release-mode measurement build, pending the RC.

## Files changed

- New: `tests/native/performance-scenarios.ts`, `tests/native/resilience-scenarios.ts`, `tests/integration/performance-fixture.test.ts`, `scripts/release-audit.mjs`, `scripts/test-e2e.mjs`, `maestro/` (README, 5 journeys, 3 subflows, 2 perf flows), `docs/evidence/PHASE_21.md`, `docs/evidence/phase-21/` (screenshots 01-04, `test-db` records).
- Changed: `src/features/challenges/domain/challenge-rules.ts`, `src/data/repositories/ledger-repository.ts`, `src/features/ledger/application/ledger-queries.ts`, `src/features/ledger/presentation/history-screen.tsx`, `src/features/ledger/presentation/ledger-copy.ts`, `src/bootstrap/app-data.ts`, `src/app/(tabs)/(home)/details.tsx`, `src/dev/db-test-runner.tsx`, `tests/integration/database-scenarios.test.ts`, `tests/integration/ledger-ui.test.tsx`, `tests/unit/challenge-rules.test.ts`; docs PROJECT_STATUS, SESSION_HANDOFF, DECISIONS (D144), TEST_PLAN, RELEASE_CHECKLIST, CLAUDE.md fact line.
- No dependency, native, config, migration or stored-data change; committed locally as ce46419 (not pushed); two EAS RC builds (above); no update published.
- Simulators created (synthetic data only, can be deleted): "SW P21 Perf SE" (iPhone SE 3rd gen iOS 18.5, development build 0799fb03 now installed) and "SW P21 E2E" (iPhone 17 Pro iOS 26.0, e86513c7).
