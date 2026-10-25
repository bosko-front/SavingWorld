# Phase 10.5 evidence: Living Island ambient motion

Session date: 25 October 2026. State: **VERIFIED COMPLETE**: the owner approved the re-exported Island and the D93 motion (25 October 2026); art, renderer, switches, inspector, Jest (768/768) and simulator checks (17 Pro Max, SE, Duo open) pass. The physical-iPhone energy/memory/smoothness measurement is the Phase 21 gate (D90), not part of this phase. Next prompt: [PHASE_11](../prompts/PHASE_11.md).

## Context verified first

- Read the full v1.2 DOCX (textutil) and README, PRODUCT_REQUIREMENTS, SOURCE_RECONCILIATION, DECISIONS (D76-D77, D85-D90), DEVELOPMENT_RULES, PROJECT_STATUS, SESSION_HANDOFF, ASSET_SPEC, `assets/worlds/island/README.md`, PHASE_09/PHASE_10 evidence, the Phase 10.5 and 21 roadmap/prompt entries.
- Baseline: clean tree on `main` at e386419 ("Phase 10: world transitions and unlock moment; plan Phase 10.5"). (The Phase 10 handoff still said "uncommitted"; the commit exists.)
- Phase 10 dependencies verified in code: `WorldScene` per-layer boxes with `transformOrigin` at the anchor, `useAmbientMotion`/`useReduceMotion`/`useAppActive` in `src/shared/ui/motion-preferences.ts`, `layerMotion` and the reveal in `world-transition.ts`/`use-world-motion.ts`.
- No native dependency, config, schema or persistence change: Reanimated 4.7.1 was already in the build. Development build **405064a9** runs the new code through Metro. No Skia (D86 holds).

## Art (Blender workspace, D76 workflow)

| Step | Command / file | Result |
| --- | --- | --- |
| New render inputs | `Blender -b source/island.blend -P scripts/render_ambient.py` (new script) | `renders/ambient/island_stage00_noclouds.png` (stage 0, 256 spp, same rig and storybook pass, `Clouds_Base.visible_camera = False`: the clouds cast no shadows and still light their surroundings), `island_mask_stage00.png` (flat, point-sampled IDs: stream/foam, waterfall, clouds) and `island_mask_stage07.png` (tree numbers 1-9). 66 s + 2 × 2 s on the M4. The cloud-free render equals the approved stage 0 outside the clouds except 155 px (the known Freestyle rim). |
| Layer export | `Blender -b --factory-startup -P scripts/export_layers.py` (extended) | Version 2: base without clouds (in the approved base's box), `island_cloud_1..3.png`, `island_water_a/b.png` (sparkle dabs on the stream, short streaks on the waterfall, from two seeds), milestones 1 and 7 split into one layer per tree (`ambient: {kind: 'sway', pivot}` at the trunk base) plus plain parts for shadows/bushes; a back tree continues 4 px under the tree in front so swaying never opens a gap. Over a cloud, unchanged milestone pixels are dropped (the stage 10 islet over cloud 3) so the cloud can drift under it. 48 files (was 33). Review sheets `export/island_layers_review.png`, new `export/island_ambient_review.png`. |
| Stacking check (ambient at rest) | printed by the export, stored in the manifest provenance | Stage 0 mean 0.004/255 (99.9% 0, max 32); stages 1-10 mean 0.181-0.522/255, 99.9% ≤ 17.1, max 99/112 (the known back-rim Freestyle line; v1 was 0.177-0.518 with max 65.8-112.2). All eleven approved renders reproduced. |
| Framing | export check "layer bounds" | (208, 44, 1848, 1404) = the v1 export, so `sceneViewport` and the Home framing are unchanged. |
| Clouds vs Phase 10 (owner question) | 1536 composite of the v1 base vs v2 base + cloud layers | cloud_1 and cloud_3: same alpha, max 2.9/255, mean 0.01; cloud_2: max 50/255, mean 0.5/255 in a few pixels where the faint waterfall crosses it. The clouds at rest are the approved clouds; the sky gradient was not changed (no theme diff). |
| `verify_stages.py` | not run | The Blender scene (`island.blend`, geometry, rig, collections) is unchanged; only new renders were made from it. The stacking check above is the art verification for this re-export. |
| Memory | manifest `decodedBytesAllLayers` | All layers of all stages at 1536: 12.4 MiB (was 9.8 at v1 with every layer; ambient layers 2.7 MiB of it). Budget ~32 MiB per world (ASSET_SPEC). Home decodes at displayed size (`enforceEarlyResizing`), so actual use is lower; device measurement is Phase 21. |
| App copy | `assets/themes/island/` | `island_manifest.json` and `1536/*.png` copied unchanged; `themes/island-assets.ts` lists all 48 files; tests prove map = files = references and byte identity with the workspace export. |

Canopies: not exported. With one layer per tree, rotating the whole tree around its trunk base looks right on the simulator (the shadow stays in a separate, still part).

## What was built (app)

| Area | Module | Behavior |
| --- | --- | --- |
| Manifest contract | `src/features/worlds/manifest.ts` | `SceneLayer.ambient: AmbientMark \| null` (`kind` cloud/water/sway, `amplitude`, `periodMs`, `phase`, `pivot`); validation: cloud/water only on the base, sway only on unlock layers (not incidental) with a pivot inside the layer, amplitudes within `AMBIENT_LIMITS` (cloud 160 canvas units, water 1, sway 4°), period 2-120 s, phase 0..1, a cloud's drift stays inside the art's bounds. `sceneViewport` unchanged in result. |
| Export adapter | `src/features/worlds/theme-export.ts` | Reads `ambient` (cloud/water layers → base.layers z 1..5) and per-part `ambient` marks; applies `AMBIENT_PRESETS` (cloud 90 units ≈ 22 pt over 24 s, water opacity 1 over 3 s, sway 2.5° over 5 s), a per-layer period spread and golden-ratio phase; clouds drift toward the middle. |
| Switches | `src/features/worlds/ambient.ts` | `AMBIENT_RELEASE_SWITCHES` (`enabled`, `clouds`, `water`, `trees`): the one place to switch the effect off for release; `ambientKindOn`; an in-memory development override (`setAmbientSwitches`, `useAmbientSwitches`). |
| Driver | `src/features/worlds/world-scene.tsx` | `WorldScene ambient` prop; `AmbientBox` nested inside each layer's reveal box (pop and sway compose); one shared value per layer driven by `withRepeat`/`withSequence`/`withTiming` on the UI thread (clouds and water half-cosine out and back, trees a sine around the pivot); cancelled and back at rest at once when the gate closes or on unmount; starts from rest after its phase delay; a newly revealed tree waits for its pop (`delay + popMs`). Water layers are not drawn at all when water is switched off. No React render per frame, no timer, no frame limiter. |
| Home | `home-screen.tsx` | Passes `useAmbientMotion()` (focused, active, no Reduce Motion). The empty-state Island keeps its Phase 10 float and gets no ambient motion (D91). |
| Inspector | `src/dev/world-inspector.tsx` | Single view plays ambient motion under the same gate; "Ambient on/off", Clouds, Water, Trees, Reset (app-wide until relaunch); gate state line. Absent from the release export. |

Mapping to planned paths: the "ambient driver inside WorldScene; feature flags" → `world-scene.tsx` (`AmbientBox`, `ambientLoop`) + `ambient.ts`.

## Automated checks

| Check | Result |
| --- | --- |
| `npm run lint` | PASS (0 warnings) |
| `npm run typecheck` | PASS |
| `npm test -- --runInBand` | PASS: 31 suites, 768 tests (was 755). New: `tests/integration/world-ambient.test.tsx` (7: rest while closed, all kinds move while open and stay in range, back to rest at once and restart from rest, global switch = static Island without water layers, one effect off, kind→switch mapping, a 70% tree pops then sways and the scene ends on the committed stage after a rapid change); `tests/unit/world-manifest.test.ts` (+6 ambient: marks and kinds, z order, ranges/stagger/inward drift, 12 MiB decoded under 32, refusals, numeric limits); updated layer counts/ids for version 2. |
| Release export (`npx expo export --platform ios`) | PASS: 71 assets (56 + 15 new Island files); no inspector strings ("files decode to", "Ambient gate", "dev-world-ambient" absent); the ambient driver is present. |
| `test:db`, `deps:check`, `doctor` | NOT RUN: no persistence or dependency change. |

## Simulator checks

iPhone 17 Pro Max simulator (iOS 26.1) and iPhone SE 3 (iOS 18.5), development build 405064a9, Metro is the owner's `expo start`, test goal "Summer trip12.345" (paused, RWF 12,345). Motion measured by differencing screenshots (scene region) and AVFoundation frame extraction (no ffmpeg).

| Scenario | Result | Evidence |
| --- | --- | --- |
| Home, ambient on (first values) | PASS technically (tree edge, clouds, water dabs change between screenshots), but the owner found it invisible to the eye. | [home-ambient-17promax.mp4](phase-10-5/home-ambient-17promax.mp4), [heat map](phase-10-5/ambient-motion-heatmap-17promax.png), [water](phase-10-5/water-shimmer-zoom-17promax.png) |
| Home, ambient on (D92 values) | PASS: clouds visibly drift (cloud 3 moves well within 6 s), the tree tilts, water glints. Awaiting owner review. | [home-ambient-tuned-17promax.mp4](phase-10-5/home-ambient-tuned-17promax.mp4), [6 s apart](phase-10-5/ambient-tuned-6s-apart-17promax.png), [heat map](phase-10-5/ambient-tuned-heatmap-17promax.png) |
| Threshold deposit with ambient on: RWF 900, 4,050 → 4,950 (32% → 40%) | PASS: sheet closes, "Deposit saved", the small house pops, "New milestone unlocked! / Small house", scene ends on stage 4 at 40%. | [unlock-ambient-17promax.mp4](phase-10-5/unlock-ambient-17promax.mp4), [frames 0.5 s](phase-10-5/unlock-ambient-frames-0.5s.jpg) |
| Reduce Motion on (`com.apple.Accessibility ReduceMotionEnabled`, relaunch) | PASS: scene pixels identical across 8 s; only the dev client's Tools button differs. | [still heat map](phase-10-5/reduce-motion-still-heatmap-17promax.png) |
| Reduce Motion switched off by `defaults write` while running | Not observed: `simctl` writes the default without posting the change notification, so the app keeps the old value until relaunch (relaunch then moves). A real Settings toggle posts it; Jest covers the gate change. | — |
| SE 3, iOS 18.5 (stage 1 goal) | PASS: tree sways, clouds drift (the left cloud passes in front of the rock), water glints. | screenshots not kept |
| Leave Home / background and resume | PASS on the open Duo (iOS 27.1): Settings pushed over Home and the app sent to the background (Home button), then back to Home in the same process (pid unchanged): clouds, tree and water move again. Stopping while hidden and returning to rest are proven in Jest (the gate is Phase 10's `useAmbientMotion`). | [resumed, two frames](phase-10-5/d93-duo-resumed-after-settings-and-background.png) |
| Duo open (iOS 27.1, native side-by-side arrangement) | PASS: the Island moves in the scene column (clouds drift, tree leans, water streaks change), controls column unchanged. | [two frames](phase-10-5/d93-duo-open-two-frames.png) |
| Static Island with switches off | Jest PASS (with `enabled: false` the drawn stack is exactly the approved layers, no water layers, every value at rest; one effect off leaves the others moving); the export check proves the resting stack reproduces the approved renders. The inspector buttons were not tapped on the simulator. | — |

## Owner review

- 25 October 2026, first look (simulator): "it is imperceptible to the human eye that anything moves; the gradient and the clouds look lighter, the clouds are barely visible." Response: motion enlarged (D92); clouds measured identical to the approved art and the sky unchanged (above). If the owner wants stronger clouds, that is an art change (cloud opacity/shade in `materials.soft_cloud`) and a new D76 approval.
- 25 October 2026, second look at the D92 motion (relayed from the owner's other session): "zavrsio je animacije ali nista se ne primejcuje, jedva nesto kad se drveca njisu / voda skoro nista se ne vidi" (translated: the animations are done but nothing is noticeable, barely anything when the trees sway, the water shows almost nothing). The owner also dropped the separate SpriteKit/Swift renderer evaluation entirely: no native renderer, nothing about it now. Response: D93 (water redesigned as three flow layers whose streaks travel down the stream and the waterfall; trees lean 5° by a skew from the trunk base), see "Second tuning (D93)" below.
- 25 October 2026, owner approval: "Odobravam: voda i drveće se sada jasno vide, i odobravam ponovo izvezeno ostrvo. Zatvori Phase 10.5." (I approve: the water and the trees are now clearly visible, and I approve the re-exported island. Close Phase 10.5.) **APPROVED.**

## Second tuning (D93), after the owner's second review

| Step | Result |
| --- | --- |
| Flow pass | `render_ambient.py -- flow-only` (new `flow-only` option): `renders/ambient/island_flow_stage00.png`, 16-bit U/V of `Stream_Water` and `Waterfall` (clouds hidden), 21 s. The earlier full run was stopped: the machine was overloaded (load average 580-700, see below) and the cloud-free render had not changed. |
| Export | Three flow layers `island_water_a/b/c` (streak tiles periodic along V: stream 0.36, waterfall 0.30; 16/14 lanes; a third of a period further downstream each; alpha 0.85, 92% white). Tree areas (26 px) added to the "drop unchanged pixels" rule. Stacking check now uses the app's real stack (cabin hidden from 80%): stage 0 mean 0.004/255 (max 32), stages 1-10 mean 0.18-0.51/255, 99.9% ≤ 17, max 66-98. Layer bounds unchanged. 49 files; all-layer decode 13.7 MiB at 1536 (ambient 4.0). |
| App | `AMBIENT_PRESETS`: water 1.0 opacity, one shared 2.4 s round, phases 0, 1/3, 2/3; sway 5° skew over 4.4 s (± spread); clouds unchanged (90 units / 24 s). `AMBIENT_LIMITS.sway` 8. `AmbientBox` uses `skewX` for sway. |
| Tests | `world-ambient.test.tsx`: lean read from `skewX`, each new tree checked against its own pop end (`layerMotion` delays), shorter simulated times, 120 s timeout; `world-manifest.test.ts`: three water layers with shared period and phases 0, 1/3, 2/3, 49 layers, 47 at stage 10, 14 MiB. |

Simulator (17 Pro Max iOS 26.1, build 405064a9, stage 4 test goal): white streaks are clearly visible along the stream and down the waterfall and change from frame to frame; the first tree's crown visibly shifts. [Three frames](phase-10-5/d93-water-flow-three-frames-17promax.png), [the three flow layers](phase-10-5/d93-water-flow-layers-a-b-c.png). The simulator recorder hung under the machine load (0-byte file), so this pass has screenshots, not a video. Owner review of D93: **approved** (see Owner review).

Checks after D93: `npm run lint` PASS, `npm run typecheck` PASS, release export (`npx expo export --platform ios`) PASS: 72 assets (one more water layer), no inspector strings, the ambient driver present.

Machine state during this pass: load average 150-700 with ~94 MB free memory at the worst (three booted simulators, 28 Metal compiler services, other apps); a plain unit suite took 18 s instead of ~1 s, and several existing scene tests hit Jest's 5 s timeout. Full suite after D93 (`npm test -- --runInBand`, 1,353 s on the loaded machine): 752 passed, 16 failed, all Jest 5 s timeouts in Home/ledger/navigation/onboarding integration suites (none of them assertions). Rerun of the five failing suites: `world-ambient` 7/7 PASS, the other four again only 5 s timeouts. Control: `tests/integration/navigation.test.tsx` with a 60 s timeout took 493 s with 1 timeout on this tree and 481 s with the same 1 timeout on the Phase 10 commit (e386419, scratch worktree), so the slowdown is the machine, not this phase. Rerun once the load fell (load average ~12-50): `npm test -- --runInBand --testTimeout=60000` PASS, 31 suites, 768 tests (295 s); then the standard `npm test -- --runInBand` PASS, 768/768 (closing checks below).

## Closing checks (after the owner's approval)

| Check | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test -- --runInBand --testTimeout=60000` | PASS: 31 suites, 768 tests |
| `npm test -- --runInBand` | PASS: 31 suites, 768 tests (131 s, load average ~16) |
| Release export | PASS: 72 assets, no inspector code |
| Simulator | 17 Pro Max (ambient, unlock with ambient on, Reduce Motion still, D93 water/trees), SE 3 iOS 18.5, Duo open iOS 27.1 (motion, leave Home + background and resume) PASS |
| Physical iPhone | NOT RUN, by design: Phase 21 measures energy, memory and smoothness with ambient on/off (D90) |

## Limitations and follow-ups

- Performance is not decided on the simulator: Phase 21 measures energy, memory and smoothness on a physical iPhone with ambient on/off (`AMBIENT_RELEASE_SWITCHES`); water first, then all off if it costs too much (D90).
- The low cloud (cloud_2) carries a faint sliver of the waterfall at its top edge, which moves with it (~0.3 pt); judge on the owner pass.
- Clouds now drift far enough to pass in front of the island's rock face (cloud 1 and 2); this is the intended look of clouds around a floating island, to confirm with the owner.
