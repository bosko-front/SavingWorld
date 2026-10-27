# Saving Worlds development guide

Product authority is the local [MVP plan v1.2](Saving_Worlds_MVP_Plan_v1_2.docx), dated 23 October 2026. It supersedes conflicting v1.1 and earlier feature text; Q01-Q06 are resolved. Owner decision D74 (23 October 2026) later overrode v1.2 on goals: Archive removed, confirmed whole-goal deletion added, Free limited to one goal in total, and a new loss-of-Pro rule (see [reconciliation](SOURCE_RECONCILIATION.md)). Owner decision D119 (26 October 2026) changed the Garden's 80% unlock from a gazebo to the greenhouse and vegetable beds. This folder is the persistent context for building Saving Worlds with Claude Code across independent sessions. It contains product requirements, architecture, 22 bounded implementation prompts and honest progress records. Planning is complete once the documentation checks pass. Application implementation has not started.

## Privacy and support

- [Saving Worlds Privacy Policy](../PRIVACY.md)
- [Saving Worlds Support](../SUPPORT.md)

## Start here

1. Read the full [MVP plan v1.2](Saving_Worlds_MVP_Plan_v1_2.docx), including its tables, then [product requirements](PRODUCT_REQUIREMENTS.md) and [source reconciliation](SOURCE_RECONCILIATION.md). Historical v1.1/22 October feature files never override v1.2. Use a local DOCX reader such as macOS textutil; report an unreadable primary source instead of falling back to v1.1.
2. Read [architecture](ARCHITECTURE.md), [technology choices](TECH_STACK.md), [data model](DATA_MODEL.md), [design system](DESIGN_SYSTEM.md), [adaptive layout](ADAPTIVE_LAYOUT.md), [EAS delivery](EAS_AND_OTA.md) and [development rules](DEVELOPMENT_RULES.md).
3. Check [project status](PROJECT_STATUS.md) and [latest handoff](SESSION_HANDOFF.md). They say what is actually verified, which checks are pending and which prompt comes next.
4. Use the [roadmap](DEVELOPMENT_ROADMAP.md) to find the current phase and copy its complete prompt from [prompts](prompts/README.md).

## Early foundation phases

1. [Phase 01](prompts/PHASE_01.md): latest stable Expo SDK, required packages, EAS Build/Update profiles/runtime setup, native navigation and checks.
2. [Phase 02](prompts/PHASE_02.md): palette selection, shared semantic tokens and native StyleSheet controls.
3. [Phase 03](prompts/PHASE_03.md): global screen/container behavior and native iPhone Duo adaptation.
4. [Phase 04](prompts/PHASE_04.md): exact financial/date/progression domain, followed by the remaining feature phases.

The current plan has 22 numbered phases plus three owner-added checkpoints, [Phase 07.5](prompts/PHASE_07_5.md) (visual direction and design review before the Home dashboard) [Phase 10.5](prompts/PHASE_10_5.md) (Living Island ambient motion, kept only if it performs; D90) and [Phase 19.5](prompts/PHASE_19_5.md) (owner-approved app icon and launch screen before the first preview build; D114). EAS Build/Update setup belongs to Phase 01; [Phase 20](prompts/PHASE_20.md) proves preview OTA/recovery, followed by final QA in 21 and release preparation in 22. Initial setup uses the latest stable SDK at execution time, then locks it for reproducible sessions. The current SDK verified during planning is 58; do not treat the planning number as a permanent latest-version guarantee. No package has been installed in this documentation task.

## First Claude Code session

Open a terminal and run:

```sh
cd ~/Desktop/SavingWorld
claude
```

In Claude Code, paste the full contents of [PHASE_01.md](prompts/PHASE_01.md). Equivalent opening instruction: “Read docs/prompts/PHASE_01.md and carry out only that phase, following its verification and handoff instructions.” Phase 01 is the first authorization to implement; this planning session has created documentation only.

Phase 01 must preserve this nonempty docs folder while scaffolding Expo. Do not run a generator that replaces the project directory. No package.json, node_modules, app code, native project or Git repository was created by planning.

## Moving between sessions

At session end Claude Code records changes, exact checks, remaining work and the next prompt in status/handoff. Start a new conversation in the same project folder and paste that next prompt. The agent verifies repository files and evidence rather than trusting a “done” label. Partial phases resume their missing work. A mandatory native check that could not run keeps that phase incomplete, so the next prompt remains the same one.

You may repeat a phase across multiple focused sessions. The 22-phase plan describes the scope. It does not promise a fixed number of chats or a delivery date. If a context window runs low, stop at a coherent checkpoint and write the handoff before continuing with the same prompt.

## Document map

| Document | Purpose |
| --- | --- |
| [PRODUCT_REQUIREMENTS](PRODUCT_REQUIREMENTS.md) | Confirmed R01-R26 release scope and exact milestones |
| [SOURCE_RECONCILIATION](SOURCE_RECONCILIATION.md) | Authority, resolved differences and remaining questions |
| [ARCHITECTURE](ARCHITECTURE.md) | Boundaries, flows, persistence, scenes and native adapters |
| [TECH_STACK](TECH_STACK.md) | Technology rationale, compatibility policy and official sources |
| [DATA_MODEL](DATA_MODEL.md) | Planned schemas, migrations, exact money/date invariants |
| [UI_UX_GUIDELINES](UI_UX_GUIDELINES.md) | Screen contracts, accessibility and interaction behavior |
| [DESIGN_SYSTEM](DESIGN_SYSTEM.md) | Palette, semantic tokens, native StyleSheet conventions and shared controls |
| [ADAPTIVE_LAYOUT](ADAPTIVE_LAYOUT.md) | Global window/safe-area/container rules, Duo native adapter and verification matrix |
| [ASSET_SPEC](ASSET_SPEC.md) | Both eleven-state scene compositions and art handoff |
| [DEVELOPMENT_ROADMAP](DEVELOPMENT_ROADMAP.md) | Each phase's objective, scope, dependencies and verification |
| [DEVELOPMENT_RULES](DEVELOPMENT_RULES.md) | Coding rules and session completion protocol |
| [DECISIONS](DECISIONS.md) | Product decisions, engineering baselines and change policy |
| [PROJECT_STATUS](PROJECT_STATUS.md) | Current verified phase, issues and recommended actions |
| [SESSION_HANDOFF](SESSION_HANDOFF.md) | Latest session changes and exact continuation instructions |
| [TEST_PLAN](TEST_PLAN.md) | Financial/native/UX scenarios and requirement traceability |
| [APPLE_SETUP](APPLE_SETUP.md) | Verified Apple team, bundle ID, App Store Connect app and Lifetime Pro product; owner-only steps |
| [EAS_AND_OTA](EAS_AND_OTA.md) | Required EAS build/update setup, channels/environments, runtime/schema safety and delivery/recovery workflow |
| [RELEASE_CHECKLIST](RELEASE_CHECKLIST.md) | Native/store/data/privacy readiness and operator boundaries |
| [prompts/README](prompts/README.md) | Ordered independent phase prompts |
| [evidence/README](evidence/README.md) | Evidence record structure and planning checks |
| [sources/README](sources/README.md) | Portable copies of the product plan, brief and owner clarification |

## What exists now

Documentation and preserved product sources, including the local v1.2 DOCX, plus the Phase 01 Expo SDK 58 project shell (package.json/lockfile, app.config.ts, eas.json, native tab/stack routes, lint/typecheck/test scripts), the Phase 02 palette, typed tokens, shared native controls and development-only component gallery, the Phase 03 shared layout layer (`src/shared/layout/`), the Phase 04 pure money/calendar/progression/access domain (`src/core/`), the Phase 05 SQLite data layer, ledger/goal commands, startup gate and native `test:db` runner, the Phase 06 onboarding/global currency, goal form, lifecycle commands, basic Home and Collection Reopen, shared toast and SF Symbols icons, the Phase 07 shared Add/Edit Entry form, History with corrections and confirmed deletion, and haptics wrapper, the Phase 08-10.5 Home dashboard, Island renderer and world motion, the Phase 11 souvenirs (schema 3), Finish and Collection, the Phase 12 fixed challenge engine (schema 4 attempts, rules, start/skip and in-ledger recalculation), the Phase 13 Challenges tab (quest cards, Add savings through the shared form, Skip, collapsible past quests; VoiceOver deferred to Phases 19/21 by D107), the Phase 14 weekly reminder (one Settings switch, expo-notifications local scheduling and reconciliation, D108; physical-iPhone notification checks deferred to Phases 19/21 by D109), the Phase 15 Pro entitlement engine (expo-iap 6.3.0 store adapter, schema 5 entitlement snapshot and processed transactions, launch/foreground/update/Buy/Restore reconciliation, development-only Store lab and Xcode StoreKit tests, D115; price US$7.99, D116; verified with iPhone sandbox runs), the Phase 16 Pro paywall and enforcement (goal-use rule in every command, "Build another world" entry in the goal form, `/paywall`, Settings Pro row to the paywall (one Restore, D126), kept-goal choice and read-only goals after a lost entitlement, D117; verified complete by owner decision D128), the Phase 17 Garden theme and per-goal theme switching (bundled Garden art and motion, Change Theme, the world picker with the locked Pro card, Home crossfade and the paywall's Garden preview, D129; verified complete by owner decision D130), the Phase 18 Pro statistics (all-goal total, current-month deposits/withdrawals, 30-day all-goal line with text alternative, completed-goal count on the "Savings insights" screen, D131-D133; verified complete by owner decision D133), the Phase 19 accessibility, catalog and Settings review (English catalog with its ESLint guard, Settings "Your data" and About links to the public Privacy Policy and Support pages, VoiceOver focus/announcement fixes, milestone previews on the Next milestone quest, English dates; verified complete by owner decision D138), and the root CLAUDE.md entry point. See [project status](PROJECT_STATUS.md) for what is verified. Remaining planned source paths in architecture/phase documents are future targets and are labelled accordingly. Links between current documentation must resolve now. Evidence files for implementation phases are created when those phases run, not pre-filled with invented passing results.

Planning revisions added early styling/adaptive phases and a focused EAS delivery phase; use the current prompt index rather than old saved phase numbers.

All docs are in English for consistent implementation context. The original product plan's language is preserved in its source transcript. Final Pro price and future premium-theme rights remain unresolved. The functional scope is fixed by v1.2. Actual art/identity/store/EAS/toolchain access is checked at its execution gate; no app implementation or native verification is implied.
