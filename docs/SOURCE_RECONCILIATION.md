# Source reconciliation

Updated 23 October 2026 after reading the complete local [MVP plan v1.2](Saving_Worlds_MVP_Plan_v1_2.docx), including every table. Version 1.2 is the supreme product source for Release 1.0 and explicitly supersedes conflicting v1.1 text and earlier explanations.

## Authority

1. The user's current instructions govern the authorized operation. This session authorizes documentation alignment only, not application implementation, installs, builds or publishing.
2. [MVP plan v1.2](Saving_Worlds_MVP_Plan_v1_2.docx), dated 23 October 2026, governs all product behavior. Active requirements, schemas, tests, roadmap and prompts normalize it without expanding its scope.
3. Compatible [setup/layout](sources/SETUP_AND_LAYOUT_DECISIONS_2026-10-22.md) and [EAS/OTA](sources/EAS_AND_OTA_DECISIONS_2026-10-22.md) instructions govern engineering preparation, not new product features.
4. The [planning request](sources/PLANNING_REQUEST.md) supplies the 22-phase multi-session documentation workflow and preferred technology where compatible with v1.2.
5. [Version 1.1 and the earlier feature decisions](sources/README.md) are historical only. They do not override v1.2 even where they use the words confirmed or later owner decision. [DECISIONS](DECISIONS.md) explicitly supersedes affected old entries.

Owner decision D74 (23 October 2026) is a current owner instruction that overrides the matching v1.2 rules: Archive is removed, whole-goal deletion is allowed after confirmation, Free may have one goal in total in any status, and loss of Pro keeps one chosen goal usable and the others read-only. Where this file quotes those v1.2 rules, D74 wins.

Owner decision D119 (26 October 2026) overrides v1.2 section 5 at one point: the Garden's 80% unlock is the greenhouse and vegetable beds instead of the gazebo. The other Garden labels stay v1.2 (the 60% small fountain brings all the water; the pergola is part of 90%).

## Product questions resolved by v1.2

| ID | Final rule and authority | Affected phases |
| --- | --- | --- |
| Q01 RESOLVED, CHANGED BY D74 | v1.2 sections 3/6, changed by D74: statuses are active, paused and completed (no archived, no Archive, no Close goal). Free may have one goal in total in any status; Pro unlimited. Finish at >=100% explicitly sets completed. Reopen adds no goal, is allowed within the limit and sets active without auto-Finish. Completed goals are read-only; paused goals remain editable. Any goal can be deleted after confirmation, removing its entries and souvenir (replaces v1.2 "no whole-goal deletion"). | 05-08,11,16,17 |
| Q02 RESOLVED | sections 3/7: one AppSettings currency, selected in onboarding and changed only in Settings when no transaction or collectible exists; no conversion. Positive amounts, no future entry dates, no negative current or chronological subtotal under date/createdAt/id order. No entry audit/version history. | 04-08,19 |
| Q03 RESOLVED | sections 3/10: first saved qualifying transaction mutation or target edit awards exactly one permanent souvenir per goal, including Free. Store theme/version at award; retain after corrections/withdrawals/theme/target changes. Finish/Reopen never duplicate it. | 10,11,17 |
| Q04 RESOLVED | sections 3/7: three fixed rules shared by Free/Pro, one unfinished attempt per goal, calculated eligible-ledger progress, frozen target/period/timezone. No custom editor, challenge pause, editable frequency/amount or challenge reminders. Historical attempts never auto-reactivate. | 12-14 |
| Q05 RESOLVED, CHANGED BY D74 | section 4, changed by D74: preserve prior verified rights through temporary offline failure. On verified loss nothing is deleted or changed; with several goals the person chooses one goal to keep using and the others stay visible but read-only until Pro returns or they are deleted. A Garden goal keeps its world but cannot progress in Garden without Pro; to keep saving the person switches it to Island. Garden souvenirs persist. D75: nothing switches a theme or removes data automatically; Garden → Island only by the person's confirmed choice, and Garden can be chosen again after Pro returns. | 15-17 |
| Q06 RESOLVED | sections 4/7: all-goal current total, current-month deposit/withdrawal totals, all-goal daily balance for last 30 calendar days with opening balance, count status=completed. Totals/chart include all existing goals (active, paused, completed); a deleted goal's entries are gone (D74). One global currency. | 18 |

These are requirements, not recommendations awaiting owner approval. [DATA_MODEL](DATA_MODEL.md) carries the exact deadline formulas and challenge eligibility rules. The same corrections appear in the 22 canonical prompts and matching roadmap sections.

## Compatible engineering details

The 22-phase decomposition (plus the owner-added design checkpoint 07.5, DECISIONS D49), strict TypeScript, native Router navigation, shared StyleSheet palette, adaptive iPhone/Duo foundation, exact integer arithmetic, transactional SQLite commands, idempotency, Reanimated/local assets, EAS delivery and real native verification remain. No app backend or mandatory network tracking flow is added. SDK/API availability is verified at implementation time, not asserted by documentation checks.

## Remaining release decisions and dependencies

- Q07 PARTLY RESOLVED: the price is decided (D116: US$7.99 Lifetime, final; base territory United States, other storefronts by Apple's equalization). The in-app sale copy is approved (D125, paywall headline and four feature lines); only App Store product metadata/review text remains for Phase 22. The product ID is decided and the product exists (`com.bosko123.savingworlds.pro.lifetime`, D113, [APPLE_SETUP](APPLE_SETUP.md)). Always show the actual localized store price. Core testing does not wait for final commercial price.
- Q08 FUTURE ONLY: future theme prices/rights are outside v1 and do not block it. Do not create extra products or promise future themes.
- Q09 OPERATIONAL: final name/identity, legal publisher, support/privacy URLs (resolved by D137: https://bosko-front.github.io/SavingWorld/PRIVACY.html and …/SUPPORT.html, publisher Bosko Jaksic; App Store Connect entry pending), supported iPhone/iOS/toolchain and actual native/device verification. The bundle identifier is decided and registered (`com.bosko123.savingworlds`, D113). The app icon and launch screen are made and approved (Phase 19.5, D114, D139: the Island cottage close-up), before the first preview build. Resolve identifiers before purchase testing, release materials before Phase 22.
- Licensed approved Island/Garden artwork is required for visual acceptance in 09/17; independent registry work can proceed while art evidence remains pending.
- EAS owner/project/roles, signing and test-device/store access are external execution dependencies. None has been configured or verified by this documentation alignment.

Keep original historical source files and prior evidence intact. Future changes update DECISIONS, requirements, affected prompts/roadmap and status/handoff together. A later chat must not reopen Q01-Q06 by reading superseded sources, and must not restore v1.2 Archive or the no-deletion rule over D74.
