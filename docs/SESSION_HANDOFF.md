# Latest session handoff

Session date: 25 October 2026. Session kind: Phase 10.5 (Living Island ambient motion). Result: **Phase 10.5 VERIFIED COMPLETE**: the owner approved the re-exported Island and the D93 motion (D94); lint, typecheck, Jest 768/768, release export and simulator checks (17 Pro Max, SE, Duo open) PASS. Next prompt: [PHASE_11](prompts/PHASE_11.md).

The previous handoff (Phase 10) is superseded; its record remains in [PHASE_10 evidence](evidence/PHASE_10.md) and DECISIONS D85-D90.

## Completed

- Read the full v1.2 DOCX and the required docs; verified Phase 10 in code. Baseline: clean tree on e386419 (Phase 10 is committed; the old handoff said uncommitted).
- Art (D76 workflow): new `assets/worlds/island/scripts/render_ambient.py` (stage 0 with clouds invisible to the camera, flat ID masks for clouds, stream, waterfall and trees, in `renders/ambient/`); `export_layers.py` extended to manifest **version 2**: base without clouds (same box), `island_cloud_1..3`, `island_water_a/b` (invisible at rest), one layer per tree for milestones 1 and 7 with `ambient: {kind: 'sway', pivot}`; stacking at rest reproduces all eleven renders (stage 0 mean 0.004/255, others as v1), layer bounds unchanged. Review sheet `export/island_ambient_review.png`. Copied unchanged to `assets/themes/island/` (48 files) and listed in `themes/island-assets.ts`.
- `manifest.ts`: `AmbientMark`, `AMBIENT_LIMITS`, ambient validation; `theme-export.ts`: `ambient` list → base layers z 1..5, sway marks, `AMBIENT_PRESETS` with per-layer spread/phase, inward cloud drift.
- `ambient.ts`: `AMBIENT_RELEASE_SWITCHES` (all, clouds, water, trees), `ambientKindOn`, in-memory development override.
- `world-scene.tsx`: `ambient` prop, `AmbientBox` nested in each reveal box (UI-thread `withRepeat`, rest = 0, cancel to rest when the gate closes, start from rest, a revealed tree sways after its pop), water layers not drawn when water is off.
- Home passes `useAmbientMotion()`; the empty-state Island keeps its Phase 10 float (D91).
- World inspector: Ambient on/off, Clouds, Water, Trees, Reset, gate state.
- Tests: new `tests/integration/world-ambient.test.tsx` (7); ambient block in `tests/unit/world-manifest.test.ts`; version 2 counts/ids in the manifest and scene tests.
- Owner feedback mid-session: motion invisible → enlarged (D92); clouds/sky "lighter" → measured identical to the approved art, sky unchanged.
- Owner's second review (relayed by the owner's other session): trees barely, water almost not visible; SpriteKit/Swift evaluation dropped. D93: `render_ambient.py -- flow-only` adds a 16-bit Flow-UV pass; the export makes three flow layers `island_water_a/b/c` (streaks a third of a period further downstream each), drops unchanged later-layer pixels over earlier trees, and checks the stack exactly as the app draws it; the app fades the water layers in turn (shared 2.4 s round) and leans trees 5° with `skewX`. Simulator screenshots show clearly visible flowing streaks and leaning crowns.
- Docs: evidence PHASE_10_5 (+ `docs/evidence/phase-10-5/` recordings and frame/heat-map images), DECISIONS D91-D92, ASSET_SPEC, DESIGN_SYSTEM, ARCHITECTURE, Phase 21 prompt + roadmap (switch location), Island READMEs, CLAUDE.md, PROJECT_STATUS, this file.

## Decisions

D91 (engineering): ambient layers, manifest version 2, marks, driver, switches, no canopies, empty state keeps its float. D92 (owner feedback): larger motion. D93 (owner feedback, second review): flowing water (three flow layers), trees lean 5° by skew, limits sway 8°, tree-area clearing in the export. D94 (owner): Living Island approved, Phase 10.5 closed. No product rule changed.

## Checks

Final state (D93): lint PASS, typecheck PASS, `npm test -- --runInBand` PASS (31 suites, 768 tests, 131 s once the Mac's load fell; also PASS with `--testTimeout=60000` during the overload). Release export PASS (72 assets, no inspector code). Export stacking check PASS (each stage as the app draws it). Simulator (build 405064a9): 17 Pro Max iOS 26.1 (ambient on, threshold deposit RWF 900 32% → 40% with ambient on, Reduce Motion still, D93 water/trees), SE 3 iOS 18.5, Duo open iOS 27.1 (motion; leave Home + background and resume) PASS. `verify_stages.py`, `test:db`, `deps:check`, `doctor`: NOT RUN (scene, persistence and dependencies unchanged). Physical iPhone: NOT RUN (Phase 21).

## Incomplete work and blockers

1. No Phase 10.5 blocker. By design (D90): Phase 21 measures energy, memory and smoothness with ambient on and off on a physical iPhone and keeps the effect only if it passes (`AMBIENT_RELEASE_SWITCHES`: water first, then a static Island).
2. Minor, noted in evidence: the low cloud carries a faint waterfall sliver (~0.3 pt); clouds pass in front of the rock face; the inspector toggle buttons were not tapped on the simulator (Jest covers the switches).
3. Git: Phase 10.5 is committed on `main` ("Phase 10.5: Living Island ambient motion, owner-approved (D91-D94)"); not pushed. Simulator state: the 17 Pro Max test goal "Summer trip12.345" is at RWF 4,950 (stage 4) after this session's RWF 900 deposit; the 17 Pro Max simulator was shut down outside this session; Reduce Motion is off. The Duo shows the goal "New bike" (RSD 250 of 800) on Home. Metro is the owner's own `expo start`. The Mac was heavily loaded during part of the session (load average up to ~700).

## Exact next session

In ~/Desktop/SavingWorld, start Claude Code with the full `docs/prompts/PHASE_11.md` (permanent souvenirs, Finish/Reopen and Collection). Verify Phase 10.5 from this file and [PHASE_10_5 evidence](evidence/PHASE_10_5.md) first; do not redo it. Souvenirs store the Island theme version 2 (no version 1 was ever stored); Phase 11 replaces the first-100% `milestone` haptic with `success` (D85).
