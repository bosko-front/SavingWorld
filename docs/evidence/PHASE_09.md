# Phase 09 evidence: Island theme assets and static world renderer

Session: 25 October 2026. Result: **IN PROGRESS** (code complete; owner Home review and the physical-iPhone memory/frame and VoiceOver checks are pending). Next prompt: [PHASE_09](../prompts/PHASE_09.md) (continuation).

## Context verified first

- Read the full v1.2 DOCX (textutil, all tables), README, PRODUCT_REQUIREMENTS, SOURCE_RECONCILIATION, DECISIONS (D64-D76 in full), DEVELOPMENT_RULES, PROJECT_STATUS, SESSION_HANDOFF, ASSET_SPEC, the Phase 09 roadmap entry, the scene parts of ARCHITECTURE, DATA_MODEL, UI_UX_GUIDELINES, TEST_PLAN, DESIGN_SYSTEM and ADAPTIVE_LAYOUT, EAS_AND_OTA.
- Dependencies: Phase 08 VERIFIED COMPLETE (commit 4cf1a59); working tree clean at start (`main`, 7515e02). The Phase 08 `WorldScene` was the temporary box; the shared stage function (`stageFor`, `stageThresholdMinor`) is unchanged and is the only source of the stage.
- Art input (D76): `assets/worlds/island/export/` (manifest, 2048 and 1536 PNGs, review sheet) and its README (provenance: procedural Blender 5.2.3 scripts, no third-party assets; owner approval of all eleven states on 24 October 2026). Licensed/approved art dependency: **met** (D76).

## What was built

| Area | Files | Behavior |
| --- | --- | --- |
| Approved art in the app | `assets/themes/island/` (`island_manifest.json`, `1536/*.png` ×33, README) | Unchanged copy of the D76 export at the one app resolution, 1536×1152 (0.75 of the master canvas). A test proves byte identity with the workspace export. |
| Manifest contract | `src/features/worlds/manifest.ts` | Typed theme manifest (themeId, version, name, 4:3 canvas, base, exactly ten unlocks with milestone, threshold, id, name, description, `adds` layers and explicit `removes`; layers with file key, x/y/width/height, anchor, z, incidental). `validateManifest` (all problems, not just the first), `visibleLayers`, `unlockAt`, `sceneDescription`. Pure TypeScript. |
| Export adapter | `src/features/worlds/theme-export.ts` | Reads the export JSON as untrusted input; maps `hides` (unlock ids) to `removes` (their layer ids) and requires the hidden unlock's `hiddenFromMilestone` to agree; z = milestone × 1000 + part; base anchor = bottom centre. Any shape problem → list of problems, never a throw. |
| Static assets and registry | `src/features/worlds/themes/island-assets.ts`, `src/features/worlds/registry.ts` | Explicit `require` per PNG (no path built from a stage); manifest parsed and validated once per process; Garden returns "no art yet" (Phase 17) so its scene shows the fallback; `stageName(themeId, stage)`. |
| Renderer | `src/features/worlds/world-scene.tsx` (same `themeId`/`stage` props, `WORLD_SCENE_ASPECT`, accessibility label) | Measures its region (`useMeasuredSize`/`fitAspect`), rounded `radii.xl` 4:3 box, layers as `expo-image` views at manifest positions × (box width / 2048), keyed by layer id, `contentFit="contain"` + `enforceEarlyResizing` so images decode at displayed size. No caption or icon inside the world (D73). Label "Island world, n of 10 milestones unlocked" (unchanged); accessibility value = the stage description; layers hidden from VoiceOver. Fallback: invalid manifest or no art → "Your world can’t be shown right now / Your savings are safe and up to date."; a failed image or a throwing layer (error boundary) → same plus Try again. Optional `backdrop` (cream, sky, none), `decorative`, and a `manifest` override for the inspector/tests. |
| Home | `src/features/goals/presentation/home-dashboard.ts`, `home-screen.tsx`, `src/shared/ui/empty-state.tsx` | Next-milestone callout "Next: {stage name}" with "{amount} more to reach {n}%" (percent-only title only for a theme without art); empty Home shows the stage-0 Island as a decorative, frameless illustration (max 360 pt) instead of the icon tile (D69, for Phase 10 to animate). |
| Tokens | `palette.ts`, `tokens.ts` | `sceneBackground` (#FBF3E4, the Blender preview cream), `sceneSkyTop`/`sceneSkyBottom` (gradient option). |
| Development inspection | `src/dev/world-inspector.tsx`, route `src/app/(tabs)/(home)/dev-world.tsx`, Settings → Development only → World inspector | Stage stepper, backdrop choice, contact sheet of all eleven states, visible layer ids and decoded-size estimate. `Stack.Protected guard={__DEV__}`, module required only inside `if (__DEV__)`. Deep links `?stage=`, `?backdrop=`, `?view=sheet` (keyed so a new link restarts it). |
| Dependency | `package.json`, `package-lock.json`, `app.config.ts` | `expo-image` ~58.0.17 via `npx expo install` (planned for Phase 09 in DESIGN_SYSTEM's UX library plan); config plugin added. |

## EAS development build

- Project `@bosko123/saving-worlds`, profile `development-simulator`, channel `development`, environment `development`, runtime 1.0.0 (not yet shared; no version bump), schema 2 unchanged.
- Build **405064a9-5b87-4292-a407-c943256db4f8** (`npm run eas -- build --platform ios --profile development-simulator --non-interactive --no-wait --message "Phase 09: expo-image for the layered Island scene"`), uploaded from the uncommitted working tree on 7515e02, fingerprint 7b96243e…. Archive inspected: `Frameworks/ExpoImage.framework` and `SDWebImage.framework` present. Installed with `xcrun simctl install` on SE iOS 18.5, 17 Pro Max iOS 26.1, Duo iOS 27.1 and (fresh) iPhone 17 iOS 26.0.

## Automated checks

| Check | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test -- --runInBand` | PASS, 27 suites, 694 tests (was 654; +22 `tests/unit/world-manifest.test.ts`, +9 `tests/integration/world-scene.test.tsx`; 4 Home tests updated for stage names and the spoken world label; contrast +9 scene pairs) |
| `npm run test:db` | PASS on SE iOS 18.5, 17 Pro Max iOS 26.1, Duo iOS 27.1 with build 405064a9 (37/37 + restart R2) |
| `npm run deps:check` / `npm run doctor` | **FAIL, not caused by this phase:** 19/20; six already-installed packages have newer SDK 58 patch releases published since Phase 08 (`@expo/ui` 58.0.23, `expo` 58.0.19, `expo-dev-client` 58.0.15, `expo-font` 58.0.10, `expo-router` 58.0.26, `expo-sqlite` 58.0.14). `expo-image` is at the expected version. Not upgraded here (no unrelated dependency upgrades; an SDK patch bump is its own reviewed change with a new build). |
| Release export (`npx expo export --platform ios`) | PASS: Hermes bundle has no `WorldInspector` module code ("files decode to" absent; only the route title/link label, as for the gallery); fallback copy and all 33 Island PNGs present (56 PNG assets in total, 2.6 MB). |

Unit coverage: bundled manifest valid (version 1, 2048×1536, ten unlocks 10..100%, approved names), 33 unique layer ids and z, the single replacement (stage 8 removes `small_house_1`, `small_house_2`), asset map = files on disk = manifest references, PNG sizes = 0.75 × boxes, byte identity with the workspace export; visibility at every stage (each stage = previous + its unlock − its removes; cabin only at 40-79%); **one minor unit below, at and above every threshold** for targets 150,000, 1,003 and 333,333; the €2,000 examples (199.99 → 0, 200 → 1, 1,000 → 5, 1,800 → 9, 2,000 and 2,100 → 10; 9.99% base; 125% complete); refusals for non-object, missing asset, nine unlocks, wrong threshold, order, duplicate id, out-of-canvas layer, anchor outside its layer, one-sided or forward replacement, non-4:3 canvas, wrong theme, missing field; Garden → fallback.

Integration coverage (Jest, real routes, host SQLite): nothing drawn before measurement; 4:3 box and scaled positions; label/value/role and hidden layers; relayout (343×257 → 640×480) keeps the same stage; invalid manifest → fallback with the stage still spoken and no retry; failed image → fallback, Try again redraws; throwing layer contained by the boundary; decorative illustration hidden; Home deposit → stage 4 and "Next: Bridge. €150.00 more to reach 50%", withdrawal → stage 3, **database closed and reopened → stage 3 again**, 125% → complete island, "All 10 milestones unlocked", "€375.00 over target"; empty Home shows the empty island.

## Native checks (simulators)

Screenshots in [`phase-09/`](phase-09/) (1000-px JPEGs from `xcrun simctl io … screenshot`; Duo inner display `--display 9BF0CE1D…`). The gear "Tools" bubble is the Expo development client.

| Check | Device | Result |
| --- | --- | --- |
| Home with the real Island (stage 2, "Next: Flowers and bushes") | SE iOS 18.5 default text | PASS (`se-home-default.jpg`) |
| Home at the largest accessibility text size | SE | PASS: scene unchanged, numbers scroll, + button visible (`se-home-largest-text.jpg`) |
| Home | 17 Pro Max iOS 26.1 | PASS (`pro-max-home-default.jpg`) |
| Home in the native arrangement, stage 3 ("Next: Small house") | Duo iOS 27.1 open | PASS (`duo-open-home.jpg`); scene box about 1,466 × 1,100 px, the largest region measured |
| Empty Home after a fresh install and onboarding | iPhone 17 iOS 26.0 | PASS: stage-0 Island above "Start your first goal" and Create a goal, all in view (`iphone17-empty-home.jpg`) |
| All eleven states in the app (inspector, cream) | 17 Pro Max | PASS (`pro-max-stage00.jpg` … `pro-max-stage10.jpg`; contact sheet on SE `se-inspector-contact-sheet.jpg`); stage 8 shows the cottage and no cabin |
| Backdrops for the owner review: cream, sky gradient, none | 17 Pro Max, stage 10 | Rendered (`pro-max-stage10-backdrop-*.jpg`); choice pending (owner) |

**Alignment against the approved renders.** A Blender/numpy script (session scratchpad `align_check.py`) found the cream box in each 17 Pro Max screenshot, composited the approved 2048×1536 master of that stage (`assets/worlds/island/renders/milestones/island_stageNN_preview.png`) over the same cream, area-downsampled it to the box and compared (80 px corner inset):

| Stage | Box (px) | Mean abs error /255 | p99 | Max | Best offset |
| --- | --- | --- | --- | --- | --- |
| 0 | 48,746 1224×918 | 0.58 | 8.4 | 61 | 0,0 |
| 1 | same | 0.68 | 9.0 | 77 | 0,0 |
| 2 | same | 0.71 | 9.4 | 77 | 0,0 |
| 3 | same | 0.83 | 10.8 | 77 | 0,0 |
| 4 | same | 0.90 | 11.7 | 77 | 0,0 |
| 5 | same | 0.94 | 12.0 | 77 | 0,0 |
| 6 | same | 0.97 | 12.1 | 77 | 0,0 |
| 7 | same | 1.11 | 12.9 | 91 | 0,0 |
| 8 | same | 1.11 | 12.9 | 107 | 0,0 |
| 9 | same | 1.07 | 12.8 | 107 | 0,0 |
| 10 | same | 1.17 | 13.7 | 107 | 0,0 |

Every stage aligns at offset 0,0; the 408 × 306 pt box is exactly 4:3. The maxima match the known Freestyle rim-outline difference recorded in D76 (export rebuild max up to 112/255); the rest is resampling (1536 → 1224 in the app vs 2048 → 1224 here).

**Memory, first observations (simulator only).** `footprint` on the app process, fresh launch → Home → inspector at a fixed stage, twice each: stage 0 303 MB, stage 10 305-306 MB (CG Raster Data 544 KB → 1,200 KB, CoreAnimation 1,040 → 1,584 KB). The simulator draws on the Mac's GPU, so image backing is not representative of a device. Estimates from the manifest: all 31 stage-10 layers decode to 9.6 MiB at the file size; with display-size decoding about 6.1 MiB in the 17 Pro Max box and about 2 MiB on the SE, inside the ASSET_SPEC budget of ~32 MiB per world.

**Resolution choice.** 1536 is the one app resolution: the largest measured scene box (Duo open, ~1,466 px wide) is just below it, so nothing upscales; 2048 would cost 17.4 MiB instead of 9.8 MiB decoded at file size with no visible gain at that size.

## Owner review, part 1 (D78, same session)

The owner looked at Home on the simulator screenshots and their iPhone and asked for: the Island's visual progress capped at 100% while the money shows 120% (already so: stage 10 and a full bar, "120%" and "over target" as numbers; no change), Completed offered after 100% instead of automatic completion (already so: nothing auto-completes; the Finish button is Phase 11), the Island 10-15% larger without a taller section and nothing cut off on small iPhones, no piece-by-piece loading, and no "Home" title.

| Change | Evidence |
| --- | --- |
| Viewport framing, ~11% larger (`sceneViewport`, margin 12 canvas units → viewport x 105.33, y 32, 1845.33 × 1384) | Unit: 4:3, inside the canvas, contains every layer of every stage, zoom 1.11; a huge margin gives the whole canvas. Integration: positions from the viewport. Simulator: SE box still 343 × 257 pt, tree crown and island tip inside (`d78-se-home.jpg`); 17 Pro Max (`d78-pro-max-home.jpg`); Duo open (`d78-duo-open-home.jpg`). The alignment table above was measured before this framing; the framing is one uniform scale and offset for all layers. |
| A stage shows only when all its layers loaded | Integration: nothing visible until the last layer loads; 4 → 8 keeps stage 4 (with the cabin) until the cottage layers load, then switches at once; 8 → 7 waits for the cabin to load again. Not observable in a screenshot; the owner's device is the check. |
| No Home title, transparent bar with the gear only | Simulator: SE, 17 Pro Max, Duo; scene size unchanged on the SE; Settings shows "Back" (`d78-se-settings-back.jpg`). |

Checks after these changes: lint PASS, typecheck PASS, `npm test -- --runInBand` PASS (27 suites, 698 tests). No dependency or native change (no new build).

## Owner review, part 2 (D79)

The owner chose the soft sky gradient. `WorldScene` now defaults to `backdrop="sky"` (Home uses the default; the empty state keeps none; the inspector lists sky first). Test: the default scene style is the `sceneSkyTop` → `sceneSkyBottom` gradient. Simulator: gradient drawn on SE iOS 18.5, 17 Pro Max iOS 26.1 and Duo iOS 27.1 (`d79-*-sky.jpg`). Checks: lint PASS, typecheck PASS, `npm test -- --runInBand` PASS (27 suites, 699 tests).

## Owner review, part 3 (D80)

The owner did not want the box edges: the sky should run full width and from the top of the screen down to the first text, with the Island kept inside the safe area and as large as possible.

| Change | Evidence |
| --- | --- |
| Tight art viewport (x 196, y 32, 1664 × 1384; aspect ≈ 1.2), `worldArtAspect` | Unit: bounds of every layer of every stage plus 12, inside the canvas; whole canvas for a huge margin. |
| `AdaptiveGoalLayout sceneBleed` (stacked): scene region outside the column, `marginTop` = −header height, height = header + 4 + art; art = (width − gutters) / aspect, ≤ half the visible height; `useSceneInsets()` | Integration: 375 × 618 with a 64 pt header → region margin −64, height 68 + 286, insets {top 68, left/right 16}; short window caps the art at half. |
| `WorldScene fill`: backdrop on the whole region, no frame, art inside the insets; gradient ends in the canvas color | Integration: region padding and gradient, art box 343 × 285 without radius. Simulator: SE (`d80-se-home.jpg`), 17 Pro Max (`d80-pro-max-home.jpg`), SE at the largest text (`d80-se-largest-text.jpg`), iPhone 17 with the owner's 1,200/1,000 RSD goal: complete Island, full bar, "120%" and "RSD 200.00 over target" (`d80-iphone17-120-percent.jpg`). |
| Native arrangement: `sceneBleedColor` paints the band behind the bars | Duo open portrait: one continuous sky from the top (`d80-duo-open-home.jpg`). Duo landscape/side-by-side not run. |

Checks: lint PASS, typecheck PASS, `npm test -- --runInBand` PASS (27 suites, 701 tests). No dependency or native change.

## Owner review, part 4 (D81)

The owner did not want "Add savings" to float. It is now a full-width primary button in the content: Home under the progress bar (before the next milestone and the deadline card), History under the goal summary above the entries. Tests: no floating slot on Home or History; Home's reading order is progress → Add savings → next milestone; every existing Add savings flow (Home, History, entry form) still passes. Simulator: SE default text, button fully visible above the tab bar (`d81-se-home.jpg`); iPhone 17 at 120% (`d81-iphone17-home.jpg`); Duo open (`d81-duo-open-home.jpg`). Checks: lint PASS, typecheck PASS, `npm test -- --runInBand` PASS (27 suites, 701 tests).

## Owner review, part 5 (D82)

Home's scroll indicator is hidden, and pulling down past the top shows the sky's top color instead of the canvas. Test: the full-bleed scroll view has `showsVerticalScrollIndicator` false and an overscroll view (`bottom: 100%`, one visible height, sky top color). Simulator: SE held mid-pull about 90 pt, sky continuous above the Island, no indicator (`d82-se-pull-down.jpg`). Checks: lint PASS, typecheck PASS, 701 tests PASS.

## Not run / pending

| Check | Status | Reason and next action |
| --- | --- | --- |
| Rest of the owner's Home review (D73): whether cards/text can go | **PENDING (owner)**; parts 1-4 done (D78 framing/loading/title, D79 sky backdrop, D80 full-bleed sky and largest Island, which also replaced the 40% cap with half the visible height for the art, D81 Add savings in the content instead of floating, D82 no scroll indicator and sky on pull-down) | Needs the owner on the device matrix; screenshots are in `phase-09/`. Default stays cream until decided. Phase 10 may not finish before it. |
| Decoded memory and frame observations on a physical iPhone; VoiceOver of the scene label/value and the fallback | **NOT RUN** | No physical-device development build exists (needs the owner's Apple Developer credentials and device registration, as for D60/D63). The simulator has no VoiceOver; Jest checks label, value, role and hidden layers. Either a physical-device build or an owner decision to move these to the Phase 19/21 device gate. |
| Duo fold/unfold/rotate with the scene | NOT RUN natively | Device Hub not scripted this session; Jest relayout keeps the stage; the scene only measures its own region. |
| `deps:check`/`doctor` | FAIL (pre-existing drift) | Owner decision on a separate SDK 58 patch update with a new build. |

## Limitations

- Image loading is asynchronous: on a cold screen the layers appear within a frame or two of each other, not as one picture. Phase 10 handles reveals.
- The fallback message is in English only and short at large text (title only above text scale 1.35).
- During the session the app was uninstalled and freshly installed on the iPhone 17 simulator (iOS 26.0) for the empty-state check without first checking whether it held earlier test data; any synthetic data there was removed. No other simulator data was changed; the SE, 17 Pro Max and Duo kept their goals.
