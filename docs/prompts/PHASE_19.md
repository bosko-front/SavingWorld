# Implement Phase 19 Accessibility localization and Settings review

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, the phase-specific documents below and its canonical roadmap entry. For any UI work, also read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; reuse their tokens/primitives and layout policy. For native, dependency, persistence or delivery changes, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies, entry audit history or goal deletion. Read the compatible setup/layout and EAS/OTA source records for engineering only. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/UI_UX_GUIDELINES.md`, `docs/RELEASE_CHECKLIST.md`, `docs/TEST_PLAN.md` and the Phase 19 entry in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Finish the first-release usability and data explanations across completed product screens.

## Dependencies and decision gates

Phase 18

Production support/privacy destinations and publisher information from Q09 are needed to finish release-facing links.

## Exact scope

- Audit every implemented screen for Dynamic Type, small-screen reflow, VoiceOver order/labels/actions, keyboard navigation and modal focus restoration.
- Apply Reduce Motion across both worlds/chart transitions, preserve all information without color, and verify contrast/touch target sizes.
- Move remaining user-visible strings and accessibility descriptions into the English catalog; test longer strings/RTL layout readiness and alternate numeric/date locales without claiming translations.
- Complete Settings/help explanation that app deletion/device loss may permanently remove local data and the app cannot restore it. Restore Purchases returns the license only. No backup/export/import/sync button or recovery promise; OS backup caveats cannot imply app data restoration.
- Check global currency is editable only in Settings with zero transactions and zero collectibles, applies to every empty goal without conversion, and never appears as an editable goal field; verify the single Sunday 18:00 global reminder switch, permission-denial paths remain usable, and privacy/support links use resolved legitimate destinations or remain explicitly pending release dependencies.
- Audit haptics and icons against DESIGN_SYSTEM: every haptic has a matching visual/text confirmation, at most one per action, none on navigation/regression/purchase; every icon is decorative or labelled, uses the shared map and scales with text.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `src/shared/ui/ accessibility and adaptive layout fixes`
- `src/shared/i18n/ English catalog and formatting audit`
- `src/features/settings/ local data, privacy, support and restore information`
- `all affected screen accessibility props and focus handling`
- `accessibility and formatting regression evidence`

## Technical requirements

- No paid accessibility features, new customization controls or manual backup/import implementation.
- Explain the actual data behavior and SDK practices; do not claim no data collection until the shipped dependency audit supports it.
- Avoid fragile screenshot-only verification of focus, keyboard and screen-reader interactions.

## Acceptance criteria

- Critical journeys work with VoiceOver and supported largest text sizes on the selected iPhone matrix.
- Both themes and charts remain understandable with Reduce Motion and color-independent descriptions.
- Settings accurately explains local persistence, purchases and available recovery without fake backup buttons.

## Tests and verification

- Repeat the shared Duo matrix with actual forms, both themes, charts and native sheets; record focused-draft preservation and four-edge safe-area results.

- Manual iPhone VoiceOver/text-size/Reduce Motion checklist with screen-by-screen evidence.
- Formatting tests for at least two numeric/date locales, currency exponents and all user-facing catalog keys.
- Contrast/touch/layout review, relevant interaction regressions and standard checks.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES.

## Out of scope

- New languages for launch, cloud sync, app lock, custom colors, export/import and new premium features.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. Phase 01 establishes those scripts; later phases inspect and use the real scripts rather than replacing them with no-ops. If a command or tool cannot run, record NOT RUN with the exact reason and next action. A mocked native API does not prove SQLite, StoreKit, notification delivery or device performance.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, build/device/OS, files changed, dependency verification, manual checks and unresolved limitations. Update `docs/DECISIONS.md` for significant choices (or explicitly state none changed), and update any affected requirements, architecture, schema, roadmap or prompts in the same change. Preserve old evidence rather than rewriting a failed test as passed.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and dependency is verified. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation. Code complete with a pending required device check is not verified complete.

Finish by reporting: concrete behavior implemented, changed modules, checks and results, remaining work/blockers, documentation updated and the exact next prompt file. Do not claim the app is built, submitted or live unless the corresponding operation actually occurred.

Evidence path: `docs/evidence/PHASE_19.md` (create it during implementation; the planning baseline intentionally has no test evidence for this phase).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_19.md`. If verified complete, the next prompt is `docs/prompts/PHASE_20.md`.
