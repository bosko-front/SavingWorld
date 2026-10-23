# Implement Phase 10 World transitions and progress feedback

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, the phase-specific documents below and its canonical roadmap entry. For any UI work, also read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; reuse their tokens/primitives and layout policy. For native, dependency, persistence or delivery changes, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies, entry audit history or goal deletion. Read the compatible setup/layout and EAS/OTA source records for engineering only. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/ASSET_SPEC.md`, `docs/UI_UX_GUIDELINES.md`, `docs/TEST_PLAN.md` and the Phase 10 entry in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Make committed savings updates visibly rewarding while keeping scenes deterministic.

## Dependencies and decision gates

Phase 09

Phase 09 must have verified production Island assets.

## Exact scope

- Connect post-commit old/new stage and mutation revisions to short Reanimated reveals and bounded completion feedback.
- Provide small numerical/progress feedback for savings changes inside a milestone interval.
- Coalesce large deposits crossing several thresholds into a short final-state-correct sequence; quiet regression on withdrawals and target edits.
- Cancel/supersede stale animations on rapid commits, navigation, background or theme changes; reload directly into the persisted final stage.
- Respect OS Reduce Motion and avoid any financial writes or eligibility logic inside animation callbacks.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `src/features/worlds/ transition planner and Reanimated coordinator`
- `src/features/goals/ committed mutation scene integration`
- `src/shared/ui/ numeric/progress feedback`
- `tests/unit/world transition state-machine scenarios`
- `docs/evidence/PHASE_10.md device motion and frame evidence`

## Technical requirements

- Animation is a presentation effect; query data is authoritative.
- No unbounded celebration queue, offscreen loops or replayed fake deposit on every launch.
- Completion souvenir storage remains Phase 11; this phase must not create a competing completion history.

## Acceptance criteria

- At animation end the scene always equals the current committed stage, including 100% -> 90%.
- Rapid updates and background/resume cannot resurrect removed layers or replay a stale completion.
- Reduced Motion delivers immediate stable state plus concise accessible feedback.

## Tests and verification

- Deterministic transition tests for multi-stage jumps, decreases, superseded revisions and no-op stage changes.
- Real device recordings/frame inspection during rapid changes and offscreen navigation.
- VoiceOver/Reduce Motion checks and standard checks.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- Completion storage/Collection, Garden, physics engines and a general particle system.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. Phase 01 establishes those scripts; later phases inspect and use the real scripts rather than replacing them with no-ops. If a command or tool cannot run, record NOT RUN with the exact reason and next action. A mocked native API does not prove SQLite, StoreKit, notification delivery or device performance.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, build/device/OS, files changed, dependency verification, manual checks and unresolved limitations. Update `docs/DECISIONS.md` for significant choices (or explicitly state none changed), and update any affected requirements, architecture, schema, roadmap or prompts in the same change. Preserve old evidence rather than rewriting a failed test as passed.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and dependency is verified. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation. Code complete with a pending required device check is not verified complete.

Finish by reporting: concrete behavior implemented, changed modules, checks and results, remaining work/blockers, documentation updated and the exact next prompt file. Do not claim the app is built, submitted or live unless the corresponding operation actually occurred.

Evidence path: `docs/evidence/PHASE_10.md` (create it during implementation; the planning baseline intentionally has no test evidence for this phase).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_10.md`. If verified complete, the next prompt is `docs/prompts/PHASE_11.md`.
