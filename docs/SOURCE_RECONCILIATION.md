# Source reconciliation

Updated 23 October 2026 after reading the complete local [MVP plan v1.2](Saving_Worlds_MVP_Plan_v1_2.docx), including every table. Version 1.2 is the supreme product source for Release 1.0 and explicitly supersedes conflicting v1.1 text and earlier explanations.

## Authority

1. The user's current instructions govern the authorized operation. This session authorizes documentation alignment only, not application implementation, installs, builds or publishing.
2. [MVP plan v1.2](Saving_Worlds_MVP_Plan_v1_2.docx), dated 23 October 2026, governs all product behavior. Active requirements, schemas, tests, roadmap and prompts normalize it without expanding its scope.
3. Compatible [setup/layout](sources/SETUP_AND_LAYOUT_DECISIONS_2026-10-22.md) and [EAS/OTA](sources/EAS_AND_OTA_DECISIONS_2026-10-22.md) instructions govern engineering preparation, not new product features.
4. The [planning request](sources/PLANNING_REQUEST.md) supplies the 22-phase multi-session documentation workflow and preferred technology where compatible with v1.2.
5. [Version 1.1 and the earlier feature decisions](sources/README.md) are historical only. They do not override v1.2 even where they use the words confirmed or later owner decision. [DECISIONS](DECISIONS.md) explicitly supersedes affected old entries.

## Product questions resolved by v1.2

| ID | Final rule and authority | Affected phases |
| --- | --- | --- |
| Q01 RESOLVED | v1.2 sections 3/6: Free counts active+paused; completed/archived do not count. Finish at >=100% explicitly sets completed. Reopen checks the limit and sets active without auto-Finish. Closed goals are read-only; paused goals remain editable. No whole-goal deletion. | 05-07,11,16,17 |
| Q02 RESOLVED | sections 3/7: one AppSettings currency, selected in onboarding and changed only in Settings when no transaction or collectible exists; no conversion. Positive amounts, no future entry dates, no negative current or chronological subtotal under date/createdAt/id order. No entry audit/version history. | 04-08,19 |
| Q03 RESOLVED | sections 3/10: first saved qualifying transaction mutation or target edit awards exactly one permanent souvenir per goal, including Free. Store theme/version at award; retain after corrections/withdrawals/theme/target changes. Finish/Reopen never duplicate it. | 10,11,17 |
| Q04 RESOLVED | sections 3/7: three fixed rules shared by Free/Pro, one unfinished attempt per goal, calculated eligible-ledger progress, frozen target/period/timezone. No custom editor, challenge pause, editable frequency/amount or challenge reminders. Historical attempts never auto-reactivate. | 12-14 |
| Q05 RESOLVED | section 4: preserve prior verified rights through temporary offline failure. On verified loss retain all data; user chooses at most one open goal and archives others before further entries. Open Free goal uses Island; Garden souvenirs persist. | 15-17 |
| Q06 RESOLVED | sections 4/7: all-goal current total, current-month deposit/withdrawal totals, all-goal daily balance for last 30 calendar days with opening balance, count status=completed. Include archived ledger in totals/chart; one global currency. | 18 |

These are requirements, not recommendations awaiting owner approval. [DATA_MODEL](DATA_MODEL.md) carries the exact deadline formulas and challenge eligibility rules. The same corrections appear in the 22 canonical prompts and matching roadmap sections.

## Compatible engineering details

The 22-phase decomposition, strict TypeScript, native Router navigation, shared StyleSheet palette, adaptive iPhone/Duo foundation, exact integer arithmetic, transactional SQLite commands, idempotency, Reanimated/local assets, EAS delivery and real native verification remain. No app backend or mandatory network tracking flow is added. SDK/API availability is verified at implementation time, not asserted by documentation checks.

## Remaining release decisions and dependencies

- Q07 OPEN: final Pro price/storefronts and sale copy; exact product ID/store test setup before Phase 15. Always show the actual localized store price. Core testing does not wait for final commercial price.
- Q08 FUTURE ONLY: future theme prices/rights are outside v1 and do not block it. Do not create extra products or promise future themes.
- Q09 OPERATIONAL: final name/identity, legal publisher, support/privacy URLs, bundle identifier, supported iPhone/iOS/toolchain and actual native/device verification. Resolve identifiers before purchase testing, release materials before Phase 22.
- Licensed approved Island/Garden artwork is required for visual acceptance in 09/17; independent registry work can proceed while art evidence remains pending.
- EAS owner/project/roles, signing and test-device/store access are external execution dependencies. None has been configured or verified by this documentation alignment.

Keep original historical source files and prior evidence intact. Future changes update DECISIONS, requirements, affected prompts/roadmap and status/handoff together. A later chat must not reopen Q01-Q06 by reading superseded sources.
