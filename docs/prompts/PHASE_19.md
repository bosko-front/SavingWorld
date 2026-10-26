# Implement Phase 19 Accessibility localization and Settings review

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, the phase-specific documents below and its canonical roadmap entry. For any UI work, also read `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; reuse their tokens/primitives and layout policy. For native, dependency, persistence or delivery changes, read `docs/EAS_AND_OTA.md` and preserve its runtime/schema and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies or entry audit history. Owner decision D74 (DECISIONS) overrides v1.2 on goals: Archive and Close goal are removed (statuses active, paused, completed), any goal can be deleted after a native confirmation (goal, entries and souvenir; no undo), Free may have one goal in total in any status, and loss of Pro keeps one chosen goal usable and the others read-only. Do not restore Archive or the old no-deletion rule. Read the compatible setup/layout and EAS/OTA source records for engineering only. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

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
- Audit every implemented screen against the D97 world-first direction (identity, empty states, celebrations, motion budget, encouraging copy) and present Settings as calm grouped rows in the shared look. Apply only owner-approved D97 proposals (V01-V08) to existing screens; record the others as not applied. Changing Home needs an explicit owner request.

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
- Carried from Phase 06 (DECISIONS D60): on a physical iPhone, run the VoiceOver walkthrough of onboarding, Create/Edit Goal (inline errors read with the field), Home Pause/Resume and Delete goal (Archive was removed by D74), Collection Reopen and Delete and the Settings currency lock; each confirmation toast is announced once and never takes focus.
- Carried from Phase 07 (DECISIONS D63): on a physical iPhone, run the VoiceOver walkthrough of the Add/Edit Entry form (`/entry-form`: amount/note labels and inline errors read with their field, the Deposit/Withdrawal control, the date picker, the delete confirmation) and History (`/history`: rows read as "Deposit/Withdrawal, signed amount, date, note", closed-goal read-only state); each ledger toast is announced once and never takes focus. Feel the haptics: one success after each committed write, one warning per rule rejection, none otherwise.
- Carried from Phase 10 (DECISIONS D88): on a physical iPhone, VoiceOver hears "New milestone unlocked! {stage}." (or "{n} milestones unlocked! …") exactly once after an unlocking deposit, can focus the in-scene message and dismiss it with a double-tap; nothing is announced for a withdrawal or a deposit inside one interval. Also: the milestone haptic is felt once for an unlocking deposit and the success haptic is not (felt haptics, Phase 19 haptics check).
- Carried from Phase 09 (DECISIONS D83): on a physical iPhone, VoiceOver of the world scene on Home: one image element read as "Island world, n of 10 milestones unlocked" with the stage description as its value, decorative layers silent, the empty-state Island hidden, the scene fallback ("Your world can’t be shown right now", Try again) and the milestone card at 100% ("Your island is complete!"). Mandatory before release; deferred from Phase 09, not passed.
- Carried from Phase 11 (DECISIONS D102): on a physical iPhone, the Collection VoiceOver walkthrough. Each gallery card is one button whose label carries the full goal name, its status and "Island · {date}"; the floating world and the sparkle burst are silent. In the souvenir detail, the world is one labelled image, the achievement block reads "{status}. Saved {amount}. Island completed on {date}.", the "since then" note is read when shown, and Reopen and Delete…, with the "Delete completed goal?" confirmation, are reachable in order. "Your island is complete! Its souvenir is now in your Collection." is heard once after the first 100%. Also: the success haptic of the first 100%, Finish, Reopen and Delete, and the warning of a refused Reopen, are each felt once.
- Carried from Phase 13 (DECISIONS D107): on a physical iPhone, the Challenges VoiceOver walkthrough. Check:
  - each available quest is one radio ("{quest}. {headline}. {detail}") with its checked state, and Start is a separate button inside the chosen card;
  - a quest that can't start reads "{quest}, not available now. {reason}";
  - the active card reads its headline, "{saved} of {target} saved, {to go}" and the quest progress bar with its percent;
  - the info button reads "How quests work";
  - the Past quests heading reads "Past quests, {n}" with its expanded state, and each row reads "{title}, {result}. {detail}";
  - a completed quest is announced once;
  - the reached-target hero reads "Your island is complete!".
  Felt haptics: selection on changing the chosen quest, one success when a quest completes from Challenges, none for Start or Skip.
- Carried from Phase 14 (DECISIONS D109): on a physical iPhone with a device development build, the weekly reminder checks. Check:
  - turning the Settings switch on shows the iOS permission dialog once, only after the opt-in; Allow schedules one request (Reminder lab: one repeating Sunday 18:00 calendar trigger, no time zone, next fire next Sunday 18:00 local);
  - a controlled delivery (Reminder lab test copy) in the foreground goes to Notification Center without a banner or sound; in the background and with the app terminated it shows a banner with the default sound and the generic text only;
  - tapping the banner and the Notification Center row opens Home from the background and from a cold start (terminated); a tap while the Add savings sheet is open keeps the sheet and its draft;
  - switch off cancels the request; Pause of the last active goal cancels it and Resume restores it; a deposit and an edit on the paused goal keep it paused with no request;
  - Don't Allow keeps the switch on with the notice, saving still works, and Open Settings reaches the app's notification settings; allowing there and returning schedules the request;
  - VoiceOver reads the switch as "Weekly reminder, Sundays at {time}" with its on/off state and the explanation line; the success haptic is felt on turning it on or off.
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

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_19.md`. If verified complete, the next prompt is `docs/prompts/PHASE_19_5.md`.
