# Implement Phase 17 Garden and per-goal theme switching

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, the phase-specific documents below and its canonical roadmap entry. For any UI work, also read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; reuse their tokens/primitives and layout policy. For native, dependency, persistence or delivery changes, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies or entry audit history. Owner decision D74 (DECISIONS) overrides v1.2 on goals: Archive and Close goal are removed (statuses active, paused, completed), any goal can be deleted after a native confirmation (goal, entries and souvenir; no undo), Free may have one goal in total in any status, and loss of Pro keeps one chosen goal usable and the others read-only. Do not restore Archive or the old no-deletion rule. Read the compatible setup/layout and EAS/OTA source records for engineering only. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/ASSET_SPEC.md`, `docs/UI_UX_GUIDELINES.md`, `docs/TEST_PLAN.md` and the Phase 17 entry in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Deliver the complete Pro Garden theme and the full confirmed personalization scope.

## Dependencies and decision gates

Phase 16

Approved Garden art and provenance plus verified implementation of v1.2 Q03 and the D74-changed Q05 policies are required for visual and access acceptance.

## Exact scope

- Integrate approved Garden base and all ten exact outcomes from ASSET_SPEC through the existing renderer.
- Allow verified Pro users to select Island/Garden when creating a goal and change an existing open active/paused goal theme later; completed goals require Reopen before any edit.
- Persist theme changes as metadata through a capability-checked command while preserving target, currency, ledger, challenge evidence and current milestone.
- Keep completion snapshots on their historical theme/version; switching an open live goal already at100% does not rewrite its souvenir or award another.
- Use a brief bounded transition and accessible confirmation; verify all Garden states offline and implement the D74 verified-loss Garden rule: a Garden goal is never deleted or changed and its world stays visible as it is, but without Pro it cannot progress further in Garden; to continue saving the person switches that goal to Island (ledger, target and souvenir kept). Garden souvenirs stay. Nothing switches the theme automatically (D75): without Pro the only theme change allowed is the person's own choice of Island for a Garden goal, after a confirmation; if Pro returns they may choose Garden again, and the Garden scene is computed from the goal's current balance and target with the shared stage function. Test: no code path switches a theme or removes data on entitlement change.
- Call `haptics.selection()` when the user picks Island or Garden in a custom theme picker; the theme change confirmation uses the shared toast.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `assets/themes/garden/ approved production exports`
- `src/features/worlds/ Garden manifest and registry integration`
- `src/features/goals/ theme selection/change command`
- `src/features/worlds/presentation/ theme picker`
- `theme switching, asset and capability tests`

## Technical requirements

- Reuse the shared palette/layout and verify Garden theme switching during a resize without resetting financial state or covering actions with native side chrome.

- No copy of progression math, no theme-specific financial query and no backend assets.
- No object placement, decoration editing, color customization or advanced editor.
- Both complete themes must use approved licensed assets and survive historical-version lookup.

## Acceptance criteria

- Garden has the exact base plus ten milestone outcomes, with coherent regression and 100% cap.
- Theme switching at 0/10/50/100/over100% preserves every financial value and chooses equivalent stage.
- Free access and verified Pro access behave correctly after restart and capability changes.

## Tests and verification

- Review Garden eleven-state contact sheet, manifest validation and threshold boundaries.
- Native/theme-change tests check unchanged ledger/target/completion snapshots and command-level capability rejection and closed-goal read-only guards; a paused edit must not resume reminders.
- Device memory/transition/Reduce Motion/VoiceOver checks and standard checks.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Additional theme packs, manual art editing, color controls and selling future themes.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. Phase 01 establishes those scripts; later phases inspect and use the real scripts rather than replacing them with no-ops. If a command or tool cannot run, record NOT RUN with the exact reason and next action. A mocked native API does not prove SQLite, StoreKit, notification delivery or device performance.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, build/device/OS, files changed, dependency verification, manual checks and unresolved limitations. Update `docs/DECISIONS.md` for significant choices (or explicitly state none changed), and update any affected requirements, architecture, schema, roadmap or prompts in the same change. Preserve old evidence rather than rewriting a failed test as passed.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and dependency is verified. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation. Code complete with a pending required device check is not verified complete.

Finish by reporting: concrete behavior implemented, changed modules, checks and results, remaining work/blockers, documentation updated and the exact next prompt file. Do not claim the app is built, submitted or live unless the corresponding operation actually occurred.

Evidence path: `docs/evidence/PHASE_17.md` (create it during implementation; the planning baseline intentionally has no test evidence for this phase).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_17.md`. If verified complete, the next prompt is `docs/prompts/PHASE_18.md`.
