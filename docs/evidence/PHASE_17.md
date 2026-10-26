# Phase 17 evidence: Garden and per-goal theme switching

Session date: 26 October 2026. State: **VERIFIED COMPLETE** by owner decision D130 (automated, native SQLite and simulator checks below PASS; the owner looked on his device after two paywall fixes and closed the phase; the Pro switch with a real purchase was not itemized; VoiceOver, felt haptics and physical-iPhone frames/memory carried to Phases 19/21, see "Not run and carried"). Decisions: D129 (engineering; no product rule changed), D130 (owner closes the phase).

## Context verified first

- Read the full v1.2 DOCX with `textutil -convert txt -stdout` (sections 3 "Scene i kolekcija", 4 "Ostrvo i Bašta; promjena teme otvorenog cilja", 5 table, 7, 10 "Scene", "Pro"), then README, PRODUCT_REQUIREMENTS (R09-R11, R13, R18, R20, R21, the D119 Garden column), SOURCE_RECONCILIATION, DECISIONS (D74, D75, D86, D90-D93, D97, D117-D128), DEVELOPMENT_RULES, PROJECT_STATUS, SESSION_HANDOFF, ARCHITECTURE, DATA_MODEL, ASSET_SPEC, UI_UX_GUIDELINES, TEST_PLAN (T09, T14, T15, T17, T19), the roadmap Phase 17 entry, DESIGN_SYSTEM ("World-first design direction", theme picker and paywall rows, Haptics, Motion budget) and the Garden README ("Layer export for the app", "Animation layer audit").
- Baseline: clean `main` at c768e1a ("Phase 16 verified complete by owner decision (D128)"). Baseline Jest 1080/1080 (46 suites) PASS before any change.
- Phase 16 verified from code: `goalUse`/`goal-access.ts` gate every command, `theme_locked` for a Garden goal without Pro, `createGoal`/`editGoal` refuse Garden without the capability, `/paywall` and `accessView` exist; reused, not rebuilt.
- Garden art verified: `assets/worlds/garden/export/garden_manifest.json` version 1 (D120/D123 provenance), 67 PNGs at 1536 and 2048, 16 `ambientExtensions` layers with the D124 milestones (butterflies 3, petals 4, water and koi 6, lantern glows 7, greenhouse glow 8).
- The D124 "gazebo" paywall line: `git log -S gazebo -- src` finds nothing and no file in `src`, `tests` or the bundled manifest contains "gazebo"; D125 replaced the feature copy ("Unlock the Garden – Grow a beautiful new world.") before Phase 16 was committed. No change was needed; `theme-picker-ui.test.tsx` and `garden-manifest.test.ts` assert there is no "gazebo".
- Another session's Metro server (`expo start --dev-client --clear`, started ~17 h earlier from this folder) served the simulators; four simulators were booted by earlier sessions, and host load reached ~370 during the simulator work.

## What was built

| Area | Module | Behavior |
| --- | --- | --- |
| Art | `assets/themes/garden/` (+ README), `src/features/worlds/themes/garden-assets.ts` | The approved export copied unchanged (manifest + 67 PNGs at 1536), one static `require` per file. |
| Registry | `src/features/worlds/registry.ts` | Garden loads through `manifestFromExport` like the Island; `themeManifestAt('garden', 1)` serves souvenirs; bundled art grants nothing. |
| Contract | `manifest.ts`, `theme-export.ts`, `ambient.ts` | Kinds `koi`, `glow`, `butterfly`, `petal`; water may belong to an unlock; `AMBIENT_REST` (visible: cloud, sway, koi; hidden: water, glow, butterfly, petal); `AMBIENT_LIMITS` (koi 60, glow 1, butterfly 120, petal 200); `ambientExtensions` read into the unlock of each layer's milestone, drawn after `drawAfterMilestone`; unknown kinds, a wrong `rest`, a non-unlock milestone or a koi without centre refused. `AMBIENT_PRESETS` and `AMBIENT_RELEASE_SWITCHES` per kind (D129). |
| Renderer | `world-scene.tsx` | Per-kind motion on one UI-thread shared value per layer (transforms/opacity only, D86/D90): koi loop through the resting place, glow warms then breathes 0.63-0.9, one butterfly flight / one petal fall at a time, water as on the Island. Hidden kinds are not drawn when switched off. `crossfadeTheme`: the old world stays fully drawn until the new stage has loaded, then a 450 ms crossfade (instant under Reduce Motion); no milestone replay. |
| Command | `goal-commands.ts` `changeGoalTheme`, `goal-repository.ts` `updateGoalTheme`, `@/core/access` `canChangeGoalTheme` | Theme as metadata (operation ID, revision check, receipt); refuses `goal_closed`, `goal_read_only`, `theme_unchanged`, `theme_unavailable`; Free may only move an unusable Garden goal to the Island (D75). `editGoal` shares the rule. |
| Picker | `src/features/worlds/presentation/theme-cards.tsx`, `theme-copy.ts`; `src/features/goals/presentation/theme-picker-screen.tsx`; route `src/app/theme-picker.tsx` | Picture cards (radio) drawn by `WorldScene`; locked card (lock + "Pro", button, hint "Opens Saving Worlds Pro.") opens `/paywall`; cards stack above text scale 1.35. Create form: inline cards, completed worlds, draft selection. Existing goal: `/theme-picker?goalId=` at the current stage, saves at once (selection haptic, shared toast), D75 confirmation for Garden → Island without Pro; closed/unknown/read-only goals explained. |
| Entry points | `goal-menu.tsx`, `home-screen.tsx`, `goal-form-screen.tsx` | Home ⋯ "Change world" (open, not read-only goals); Edit goal's World row opens the picker; the theme-locked note and the locked edit view offer "Choose a world". Home draws `useShownTheme` (`use-shown-theme.ts`) with the crossfade. |
| Paywall | `paywall-screen.tsx` | The Garden feature row shows the completed Garden (88 pt, still, decorative) in place of its tile; hero unchanged. |
| Copy | `billing-copy.ts`, `goal-copy.ts` | Theme-locked sentence names the Island path; `themeChangeMessage`; Create's theme error names Pro. |
| Dev | `src/dev/world-inspector.tsx`, `dev-world` route | `?theme=garden`, Island/Garden buttons (crossfade in the single view), Garden effect switches. |
| Checks | `scripts/check-still-stack.py` | Blender-Python pixel comparison of the app's resting stack with the approved renders. |

Scope mapping: the prompt's `src/features/worlds/presentation/` holds the reusable cards and copy; the goal-specific picker screen that calls the goals command lives in `src/features/goals/presentation/` (feature that owns the command), and the route is `src/app/theme-picker.tsx`.

## Checks

| Check | Environment | Result | Detail |
| --- | --- | --- | --- |
| `npm run lint` | host | PASS | exit 0 (after the final edits) |
| `npm run typecheck` | host | PASS | exit 0 |
| `npm test -- --runInBand` | host, Jest | PASS | 50 suites, 1133 passed, 1 skipped (the env-gated still-stack writer); baseline was 46 suites, 1080 |
| Garden manifest (unit) | `tests/unit/garden-manifest.test.ts` | PASS | version 1, D119 names, 51 + 16 layers, byte-identical to the workspace export, asset map = files on disk, PNG sizes, 15.4 + 4.8 MiB, one unit below/at/above every threshold (3 targets), 125% cap, 90% regression, no removals, extension milestones and z order, rest/limits/shared periods, refusals |
| Still stack vs approved renders | `STILL_STACK_OUT=… jest -t "writes the still stack"` + `Blender -b --factory-startup -P scripts/check-still-stack.py -- <stack> assets/worlds/garden/export/2048 assets/worlds/garden/renders/milestones garden` | PASS | mean/255 per stage 0-10: 0.000, 0.094, 0.124, 0.257, 0.399, 0.369, 0.470, 0.534, 0.504, 0.436, 0.485 (99.9% ≤ 23, max ≤ 105 = the known back-rim Freestyle line); the same figures as the export's own rebuild check |
| Change Theme (integration) | `tests/integration/theme-switching.test.ts`, host SQLite + real billing queue over the expo-iap fake | PASS 17/17 | 0, 999, 1000, 5000, 10000, 12500 of 10000: every table except the goal's theme/revision unchanged, same stage, survives restart; Garden souvenir keeps theme/version, no second souvenir; quest contract kept; paused stays paused; completed → `goal_closed`, Reopen then allowed; replay, stale, unchanged, invalid; Free refused on Create and Change; verified loss: Garden unchanged until the person moves it to the Island, never back without Pro, Garden again after Pro returns at the current stage; read-only goal refused; no rights change (refund, offline check, purchase, restart) changes any row |
| Native scenario G10 | `tests/native/goal-scenarios.ts` in Jest on host SQLite | PASS | metadata only, replay, injected failure rolls back, Garden souvenir version 1 kept after a switch at 100%, Free Garden → Island only, closed guard |
| `npm run test:db -- --device D4BA6D4D… --timeout 600` | 17 Pro Max iOS 26.0, dev build 7769c486, real expo-sqlite, Hermes | PASS | 52/52 (incl. G10 on native SQLite) + R2 restart verify 1/1; app database stays at schema 5 (`fromVersion 5 → 5`, nothing applied); exit 0 |
| Picker/paywall UI | `tests/integration/theme-picker-ui.test.tsx` | PASS 8/8 | Free Create: locked card announced ("Garden, part of Pro", hint), opens `/paywall`, Back returns with title/target/selection, purchase on that paywall → Garden selectable, selection haptic, saved as Garden; Pro: no lock; Change world: selection haptic, toast "Your goal now grows a Garden", Home keeps the Island until the Garden has loaded, then the outgoing world leaves; resize keeps world and numbers; Reduce Motion swap; Edit goal row → picker → locked Garden → paywall, nothing changed; closed/unknown deep links; D75 path with Cancel and confirm; paywall hero + decorative Garden preview inside the Garden feature, no "gazebo" |
| Garden motion | `tests/integration/garden-ambient.test.tsx` (Reanimated Jest timers) | PASS 8/8 | rest at 0 with the gate closed (60 s); every kind moves with it open, within limits; at most one butterfly and one petal at a time; glow never below 0.63 while running; flights end unseen at rest; gate close → rest at once; milestone gating; all switches off = still stack (koi drawn and still, hidden kinds not drawn); one kind off leaves the others |
| Existing suites | Home, goal, Collection UI | PASS | menu label lists gained "Change world" |
| Simulator: Garden contact sheet | 17 Pro Max iOS 26.0, dev build 7769c486, Metro | PASS | `phase-17/01` (0-50%; all eleven render in the inspector) |
| Simulator: Garden motion | same, inspector stage 10, gate open | PASS | `phase-17/02`, `03`; 40-frame burst: koi, water, butterfly and petal regions change across frames, a sky corner never does |
| Simulator: theme crossfade | same, inspector Island 7 → Garden 7 | PASS after a fix | first capture showed one empty frame (the outgoing world waited to "load" again); fixed (`alreadyShown`), recapture `phase-17/06`: Island fully drawn → crossfade → Garden, no blank frame |
| Simulator: Free picker | same, Home ⋯ → Change world | PASS | `phase-17/04` (Island at the goal's stage, Garden locked with "Pro"); locked card → paywall stacked over the sheet `05`; Not now → picker unchanged |
| Simulator: paywall | SE 3 iOS 18.5 (existing test data, dev build 7769c486 installed over the old Phase 09 build), default and accessibility-extra-large text | PASS | `07`/`08` default: hero first, pinned purchase block, compact Garden preview in its row; `09`-`11` AX-XL: footer moves inline, Garden row, Buy, footnote, Restore and Not now reachable; the SE simulator has no StoreKit product ("Pro isn't offered…", as in Phase 16). Text size reset to "large" afterwards |
| Simulator: picker at AX-XL | same SE | PASS | `12`: cards stack, Island at the goal's stage |
| Create form on the SE | new simulator "SW SE 3 Phase17" (iOS 18.5, same build; created for this check, onboarding with RSD, no goal, now shut down; the first boot failed with a CoreSimulator `server died` error under load and the second succeeded) | PASS | `13`: name, target, deadline row, the World cards (Island chosen, Garden locked "Pro") and Create goal visible without scrolling at default text (D67) |

## Owner feedback (same session)

- "The Done button on the Pro screen runs to the edges; it can be smaller." The pinned footer's Done (shown once Pro is active) is now a compact centered button (at least 200 pt, growing with large text up to the column width) instead of a full-width bar (`paywall-screen.tsx`). `paywall-ui` and `theme-picker-ui` PASS 20/20, lint and typecheck PASS. Not seen on a simulator: the simulators are Free, and the Pro state of the paywall cannot be shown without a purchase.
- "And the bottom margin seems to cut it." On iOS 26 the sheet's rounded bottom corners clipped a control placed close to the sheet's bottom edge. The shared pinned footer (`src/shared/layout/screen.tsx`) now keeps at least 16 pt (was 8 pt) under its last control, more where the safe area asks for it; this also gives the Free purchase block more room (`phase-17/14`). The owner confirmed on the device: "sad je ok" (now it's OK).

## Not run and carried

- **Pro switch and D75 path on a simulator/device with a real purchase: NOT RUN.** The simulators are Free (no sandbox purchase was made; Apple sandbox sign-in and purchases are the owner's to perform). Jest covers both journeys over the real billing queue; the crossfade itself was seen in the inspector.
- Reduce Motion on the simulator (relaunch with `ReduceMotionEnabled`): NOT RUN; Jest proves the gate (rest at 0, no motion, instant theme swap).
- VoiceOver of the picker cards, the locked card and the paywall preview, and the felt selection haptic: physical iPhone, carried to Phases 19/21 (as D102/D107/D128).
- Physical-iPhone frames, energy and memory with Garden motion on and off: Phase 21 (D90); simulator results are not performance results.

## Files changed

See the session diff: art and README under `assets/themes/garden/`; `src/features/worlds/` (manifest, export adapter, ambient, registry, world scene, garden assets, use-shown-theme, presentation/theme-cards, presentation/theme-copy); `src/core/access/` (canChangeGoalTheme); `src/data/repositories/goal-repository.ts`; `src/features/goals/` (commands, copy, form, menu, Home, theme picker screen); `src/features/billing/presentation/` (paywall preview, theme-locked sentence); routes `_layout.tsx`, `theme-picker.tsx`, `dev-world.tsx`; `src/dev/world-inspector.tsx`; `scripts/check-still-stack.py`; tests listed above; docs (DECISIONS D129, status, handoff, this file, ARCHITECTURE, ASSET_SPEC, DATA_MODEL, DESIGN_SYSTEM, CLAUDE.md). No dependency, native, config or schema change (schema 5); no new build.

## Next

[PHASE_18](../prompts/PHASE_18.md) (Phase 17 closed by owner decision D130).
