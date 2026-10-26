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

Approved Garden art and provenance plus verified implementation of v1.2 Q03 and the D74-changed Q05 policies are required for visual and access acceptance. The Garden stages follow owner decision D119 (80% greenhouse and vegetable beds; the 60% fountain brings all the water; the pergola is part of 90%); the art comes from the Garden art workstream ([GARDEN_ART](GARDEN_ART.md), D118). Art input (D120, D123, D124): `assets/worlds/garden/export/` is the approved visual baseline (copy it unchanged to `assets/themes/garden/`, never edit or re-export the PNGs) with `garden_manifest.json` version 1 (`CURRENT_THEME_VERSIONS.garden` stays 1), which the current contract already accepts (base, two drifting clouds, ten unlocks, 51 contract layers, twelve swaying trees; 15.4 MiB decoded at 1536 + 4.8 MiB extension). Its `ambientExtensions` (16 layers) hold Garden motion the contract does not express yet: water flow and pond ripples owned by milestone 6, two koi (rest visible), four path-lantern glows (milestone 7) and the greenhouse glow (milestone 8), three butterflies from milestone 3 (30%) and three falling petals from milestone 4 (40%); the milestones are decided (D124). The Garden README (`assets/worlds/garden/README.md`, "Layer export for the app" and "Animation layer audit") describes every layer.

## Exact scope

- Integrate approved Garden base and all ten exact outcomes from ASSET_SPEC through the existing renderer.
- Allow verified Pro users to select Island/Garden when creating a goal and change an existing open active/paused goal theme later; completed goals require Reopen before any edit.
- Persist theme changes as metadata through a capability-checked command while preserving target, currency, ledger, challenge evidence and current milestone.
- Keep completion snapshots on their historical theme/version; switching an open live goal already at100% does not rewrite its souvenir or award another.
- Use a brief bounded transition and accessible confirmation; verify all Garden states offline and implement the D74 verified-loss Garden rule: a Garden goal is never deleted or changed and its world stays visible as it is, but without Pro it cannot progress further in Garden; to continue saving the person switches that goal to Island (ledger, target and souvenir kept). Garden souvenirs stay. Nothing switches the theme automatically (D75): without Pro the only theme change allowed is the person's own choice of Island for a Garden goal, after a confirmation; if Pro returns they may choose Garden again, and the Garden scene is computed from the goal's current balance and target with the shared stage function. Test: no code path switches a theme or removes data on entitlement change.
- Call `haptics.selection()` when the user picks Island or Garden in a custom theme picker; the theme change confirmation uses the shared toast.
- Show Garden in the world picker to Free too, as a locked card (owner decision D122): the same completed-Garden picture card with a small neutral lock mark and a short "Pro" label, never selectable without Pro. Tapping it opens the existing Phase 16 paywall (`/paywall`); closing it or Done returns to the picker with the draft and selection unchanged, and after a verified purchase Garden is selectable right there. A Garden goal after a lost entitlement shows the same locked card while the person may still choose Island themselves. Calm promotion only: no animation, pop-up, repeated prompt or automatically opened paywall. The command checks stay as they are (Garden refused without the theme capability).
- The theme picker shows both themes as picture cards drawn by `WorldScene` at the goal's current stage (owner design direction D97); switching settles on Home with a brief crossfade, never a replay of milestones. Garden souvenirs appear in Collection exactly like Island ones (stored theme and version). The locked-Garden explanation after a verified loss is kind and short.
- Add a compact preview of the completed Garden to the Pro paywall once the Garden export is integrated into the theme registry (owner decision D121, design proposal V06): the person's current world at its actual stage stays the main hero; the Garden preview is the completed Garden (stage 10 from the registry, drawn by `WorldScene`, still), smaller than the hero and clearly marked as a Pro benefit (for example next to or inside the Garden feature), without making the paywall noticeably longer. Reuse the existing design system and responsive layout rules (small iPhones, Dynamic Type, safe areas). Do not change purchase or entitlement logic, the product or its pricing (the price stays the store's localized `displayPrice`).
- Integrate the Garden `ambientExtensions` where technically feasible with the existing React Native renderer (D124): extend `manifest.ts`/`theme-export.ts` with water owned by an unlock and the new kinds (koi, glow, butterfly, petal), each resting at 0 with presets in `AMBIENT_PRESETS`, limits in `AMBIENT_LIMITS` and a release switch in `AMBIENT_RELEASE_SWITCHES`; draw them in `WorldScene` with Reanimated transforms/opacity only (no new engine, Skia, Lottie or native module, D86) under the D90 rules (Home visible, app active, off under Reduce Motion). Motion per the export's `rule`: water layers faded in turn as on the Island (D93, never a blinking surface), koi a slow glide within about 60 canvas px of `center`, glows a little warmth very slowly (never a pulse), butterflies one at a time on an occasional short flight from their resting place, petals an occasional single fall from the blossom canopy. An extension that proves not feasible is left out with the still picture as the result and recorded in evidence; do not substitute another motion without the owner. Not in scope (D124): flower swaying, canopy-only sway, butterfly wing animation; trees keep the existing whole-tree sway.
- Correct the Phase 16 paywall copy (D124): in `src/features/billing/presentation/billing-copy.ts` the Garden benefit line "A second world to grow, from its first seedlings to a gazebo." becomes "A second world to grow, from its first seedlings to a greenhouse." (D119 has no gazebo); update any test or snapshot that quotes it and note the change in Phase 17 evidence (Phase 16 evidence keeps its historical quote).

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `assets/themes/garden/ approved production exports`
- `src/features/worlds/ Garden manifest and registry integration`
- `src/features/goals/ theme selection/change command`
- `src/features/worlds/presentation/ theme picker`
- `src/features/billing/presentation/ compact Garden preview on the Pro paywall (D121)`
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
- Free sees Garden in the world picker as a locked card that opens the Pro paywall and returns to the picker unchanged; Garden is selectable only with verified Pro, and the commands still refuse it without Pro (D122).
- The Pro paywall keeps the person's current world as its main hero and shows a compact completed-Garden preview marked as a Pro benefit; purchase, restore and price behavior are unchanged (D121).
- Garden ambient motion (D124): each `ambientExtensions` kind appears from its milestone (water and koi 60%, path-lantern glows 70%, greenhouse glow 80%, butterflies 30%, petals 40%), rests at 0 so the still stack equals the approved renders at every stage, stops under Reduce Motion, off-screen and in the background, and can be switched off per kind; any kind left out is recorded with its reason. The paywall Garden line says "greenhouse", not "gazebo".

## Tests and verification

- Review Garden eleven-state contact sheet, manifest validation and threshold boundaries.
- Manifest/adapter tests for the extension kinds (milestone gating, rest at 0, limits, unknown kinds rejected) and a still-stack comparison against `assets/worlds/garden/renders/milestones/` at every stage; simulator check of each motion with Reduce Motion on and off; physical-iPhone frames and memory stay a Phase 21 gate (D90).
- Native/theme-change tests check unchanged ledger/target/completion snapshots and command-level capability rejection and closed-goal read-only guards; a paused edit must not resume reminders.
- Paywall check on a small iPhone and at a large text size: current-world hero first, compact Garden preview, purchase button, footnote and Restore still reachable; the preview is decorative to VoiceOver or labelled as a Pro benefit.
- Free picker: the locked Garden card is announced with its Pro state, opens the paywall, Cancel/Done return with the draft intact, a purchase makes Garden selectable; a deep link or stale screen still cannot save Garden on Free.
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
