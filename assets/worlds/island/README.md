# Island world — Blender source workspace

Source art for the Free **Island** theme (docs/ASSET_SPEC.md, PRODUCT_REQUIREMENTS R10). This folder holds the editable Blender scene and the scripts that generate it. It is **not** read by the app: approved exports for the app go to the planned `assets/themes/island/` folder in Phase 09, with a manifest.

Status: **all eleven states approved by the owner (24 October 2026, D76) and exported as layers for Phase 09.** Milestone renders and layer exports have not been made yet.

## Layout

| Path | What it is |
| --- | --- |
| `scripts/build_island.py` | Rebuilds the whole scene from scratch and saves `source/island.blend` |
| `scripts/swi/` | Generator package: `layout.py` (every position, single source of truth), `terrain.py`, `nature.py`, `structures.py`, `props.py`, `materials.py`, `rig.py` (frozen camera, lights, render settings), `stages.py` (collections and stage visibility) |
| `scripts/render_preview.py` | High-quality render of one stage at 100% (2048×1536), plus phone-size copies (`swi/preview.py` `PHONE_SIZES`: about 368×276 pt at @3x and 267×200 pt at @2x, the estimated Home world region on an iPhone 17 Pro and an SE) |
| `scripts/draft_render.py` | Fast low-sample render for iteration |
| `scripts/swi/stylize.py` | Storybook rendering pass in the compositor: stepped light bands, soft Freestyle outlines, Kuwahara painterly filter (`SW_STYLE=0` renders the plain image) |
| `scripts/verify_stages.py` | Per-stage checks: identical camera/lights/terrain fingerprint, unlock order (only the stage 8 house replacement removes anything), no floating pieces |
| `scripts/milestone_report.py` | Measures the visible change between consecutive milestone renders and writes the 11-state contact sheet `renders/milestones/island_milestones_all.png` |
| `scripts/export_layers.py` | Exports the approved milestone renders as stacked layers plus `export/island_manifest.json` and checks the rebuild |
| `export/` | Phase 09 input: `2048/` and `1536/` layer PNGs, `island_manifest.json`, `island_layers_review.png` |
| `scripts/check_framing.py` | Reports whether a stage's geometry stays inside the fixed camera frame |
| `source/island.blend` | Editable scene (generated, compressed) |
| `renders/preview/` | Ad-hoc preview renders (default output of `render_preview.py`; not committed) |
| `renders/milestones/` | Approved milestone renders: one transparent 2048×1536 master per stage (input of `export_layers.py`) and `island_milestones_all.png` (all eleven states). The backdrop and iPhone-size review copies are made locally by `render_preview.py` / `milestone_report.py` and not committed |

## Rebuild and render

Blender 5.2.3 LTS (`/Applications/Blender.app`), Cycles on the Apple M4 GPU (Metal).

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P assets/worlds/island/scripts/build_island.py
```

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b assets/worlds/island/source/island.blend -P assets/worlds/island/scripts/render_preview.py -- 10 256 renders/milestones
```

256 samples is the default: against 512 the phone-size images differ by 0.17/255 on average (99th percentile 3/255), with no visible change, and the render takes 267 s instead of 448 s on the M4.

The build is deterministic (seeded random numbers, fixed noise offsets), so the same scripts always produce the same scene. Edit the scripts, not the `.blend`, so changes stay reproducible. If something is changed by hand in Blender, port it back into the scripts.

## Stages and collections

One collection per Island state. Stage *n* shows collections `SW_00` to `SW_nn`. The stage 8 larger house replaces the stage 4 small house, so `SW_04_SmallHouse` is hidden from stage 8 on (`stages.REPLACES`, also stored as the `sw_replaces` property on the collection). Each collection carries `sw_stage`, `sw_label` and `sw_threshold_percent` custom properties.

| Stage | Threshold | Collection | Contents |
| --- | --- | --- | --- |
| 0 | 0% | `SW_00_Base_EmptyIsland` | Terraced island, grass lip with grass fringe and moss overhangs, tapered rock underside with layered stone shelves, stream with cascades and foam, waterfall, base rocks, grass tufts, soft clouds |
| 1 | 10% | `SW_01_FirstTree` | Large broadleaf tree on the back terrace |
| 2 | 20% | `SW_02_Path` | Sand path with flagstones and stone stairs from the front edge up to the house site |
| 3 | 30% | `SW_03_FlowersBushes` | Flowering bushes with large pink, white and yellow blossom clusters and flower patches along the path and stream (west side; the east-side ones arrive at 60%) |
| 4 | 40% | `SW_04_SmallHouse` | Small cabin with shingle roof (hidden from stage 8) |
| 5 | 50% | `SW_05_Bridge` | Arched wooden bridge and the west branch path from the main path to the bridge |
| 6 | 60% | `SW_06_Pond` | Pond with bank, rocks, lily pads and reeds; the east branch path past the pond; the flowers and bushes along it and around the pond (owner decision 24 October 2026, so the 50% state has no path leading into empty meadow) |
| 7 | 70% | `SW_07_MoreTrees` | Five pines, three broadleaf trees and bushes |
| 8 | 80% | `SW_08_LargerHouseDetails` | Cottage with tiled roof, chimney, shutters, flower boxes, lantern and vines (replaces stage 4) |
| 9 | 90% | `SW_09_FinalDecorations` | Sturdy fences, three tall lamp posts with large bright lanterns, bench, barrels, crates and more flowers |
| 10 | 100% | `SW_10_CompletedIsland` | Vegetable garden, dock with a striped awning and a rowing boat, three floating islets, more flowers |

`SW_Rig` holds the camera and lights. Terrain, camera, lights and world are shared by every stage and must not change between milestone renders. Base terrain parameters (`layout.py` terrain/stream values and `terrain.py`) and the rig (`rig.py`) are frozen once milestone renders exist; changing them means re-rendering every stage.

## Materials

All surface detail is procedural shader work on top of per-vertex painted colors (`swi/materials.py`): painterly brush dabs and strokes on grass, strata lines, large cracks and worn edges on rock, grain on wood, worn edges and spots on roof tiles, leaf-cluster cells and a warm sun-side rim on tree crowns. Ambient occlusion has a broad soft term and a tight contact term. Broadleaf crowns are single merged surfaces built from a temporary metaball (core plus lobes); `common.metaball_object` converts it to a mesh, so the `.blend` contains only meshes.

## Storybook rendering pass

`swi/stylize.py` runs after Cycles in the compositor node group `SW_Stylize`, set up by `rig.configure_render`:

1. **Light bands:** the denoised direct diffuse light is stepped into three soft levels (shadow, half light, full light; `BAND_LEVELS`, mixed in at `BAND_AMOUNT`) and the image is rebuilt from the diffuse, glossy, transmission and emission passes, so colors stay painted while light reads in clear shapes.
2. **Outlines:** thin warm-brown Freestyle silhouettes on their own pass, laid over at `LINE_OPACITY`. Meshes listed in `NO_OUTLINE` (water, foam, clouds, grass, flowers, path sand) get the Freestyle face mark and no lines.
3. **Painterly filter:** anisotropic Kuwahara (`KUWAHARA_SIZE`), with the transparent background inpainted first so the island edge keeps its color.

Sizes scale with the render percentage. Clouds and foam are self-lit (emission), so the light bands never cut them into hard shapes. Set `SW_STYLE=0` in the environment to render the plain Cycles image for comparison.

## Fixed rig

- Orthographic camera, rotation 57° / 0° / 45° (2.5D dimetric view from the front corner), ortho scale 35.2, frame 2048×1536 (4:3, matching Home's world region).
- Warm, fairly low sun from the upper left (2.5° soft shadows), cool sky and fill from the camera side, a shadowless warm bounce that lights the underside. Shader ambient occlusion (16 samples, includes nearby objects) gives contact shading where objects meet the ground.
- Cycles, AgX "Punchy", transparent film. The backdrop color in `*_backdrop.png` is for previews only.

## Provenance and licensing

- Every mesh, material and texture in this scene is generated by the scripts in this folder: procedural geometry (bmesh), per-vertex painted colors and Blender's built-in procedural shader nodes. No third-party models, textures, HDRIs, fonts or add-ons are used, and nothing is downloaded.
- The scripts and the generated `.blend` and renders are original work for Saving Worlds, owned by the project owner. Per the Blender Foundation's license FAQ, output made with Blender (renders and `.blend` content) belongs to its creator and is not covered by Blender's GPL, so using the renders commercially in the app has no third-party license dependency. The scripts call Blender's Python API; the Foundation considers bpy scripts that are distributed to others to fall under GPL terms. They stay in this repository as build tooling and are never shipped in the app, where only exported images ship.
- The reference image used for style direction (cozy isometric floating island) is used for direction only. No part of it is traced, sampled or embedded.
- If third-party assets are added later, record each one here with source URL, author, license (for example CC0) and download date before use.

## Layer export for the app (Phase 09 input)

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P assets/worlds/island/scripts/export_layers.py
```

- `export/<size>/island_base.png` is stage 0; `island_sNN_pK.png` is part K of milestone NN, holding only the pixels that changed from the previous stage (render noise filtered out, 2 px soft edge). Each separate object is its own part (each new tree, the garden, the boat, the islets), so Phase 10 can animate them one by one.
- `export/island_manifest.json`: canvas 2048×1536 (4:3), for each milestone its id, name, threshold, draft VoiceOver description and layers (`x`, `y`, `width`, `height` top-left in the canvas, `anchor` ground point to grow from, `incidental` for side-effect pieces to show without animation), the stage 8 replacement (`hides` / `hiddenFromMilestone`), decoded memory and provenance.
- Stack rule: draw the base, then the layers of milestones 1..n in order. Hiding the small house from 80% on gives the same image (checked: max 2.3/255), because the 80% layer covers everything the 40% layer drew.
- Rebuild check against the renders: mean error 0.2–0.5/255 per stage. The largest single-pixel errors (up to 112/255, about 1,000 pixels) are the thin Freestyle outline along the island's back rim, which Freestyle redraws slightly differently in every render; the layers keep the stage 0 rim line, so the rim never flickers. Visually the stacked image matches the render.
- Sizes: `2048/` master and `1536/` (0.75, the suggested app size). Crop boxes snap to a 4 px grid, so positions scale to whole pixels. Decoded RGBA with every layer loaded: 17.4 MiB at 2048, 9.8 MiB at 1536 (ASSET_SPEC budget: about 32 MiB per world).
- Re-render a stage only together with the stages after it, then re-run the export; never edit the exported PNGs by hand.
