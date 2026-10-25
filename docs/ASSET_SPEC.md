# Visual asset and theme specification

Product scope follows [MVP plan v1.2](Saving_Worlds_MVP_Plan_v1_2.docx); this document adds compatible engineering detail only.

The exact progression is confirmed in [requirements](PRODUCT_REQUIREMENTS.md). This document defines the planned art handoff and renderer contract. No artwork or renderer is being produced during planning.

## Deliverables per theme

Provide one base scene and all ten unlock outcomes, in a consistent cozy isometric 2.5D style. Island and Garden are both complete release requirements. Supply editable source art, transparent object/layer exports, a scene preview contact sheet for all eleven states, license/ownership provenance, and a manifest mapping layers to states. Do not ship unlicensed art or temporary development rectangles as finished scenes.

| Stage | Island outcome | Garden outcome |
| --- | --- | --- |
| 0 | Empty island | Empty garden |
| 1 | First tree | First seedlings |
| 2 | Path | Small flower bed |
| 3 | Flowers and bushes | More flowers |
| 4 | Small house | Decorative tree |
| 5 | Bridge | Garden pathway |
| 6 | Pond | Small fountain |
| 7 | Additional trees | Bench and decorations |
| 8 | Larger house and details | Gazebo |
| 9 | Final decorations | Final plants and ornaments |
| 10 | Completed island | Completed garden |

Later stages usually retain previous elements. Island stage 8 replaces the small house. The stage 10 composition must visibly finish the scene without adding an eleventh milestone. Garden's stage-specific items coexist unless approved art specifies a replacement. No manual placement UI, decoration editor, color picker or destination-dependent art.

## Planned manifest contract

Each manifest declares `themeId`, integer `version`, localized name/description keys, base logical canvas size, aspect ratio, accessible stage descriptions, preview asset, base layers and exactly ten unlock entries. Each unlock has milestone index 1-10, threshold 10%-100%, stable layer IDs and explicit add/remove/replacement sets. Layers declare a static module reference, logical x/y/width/height, anchor and z-order. Pure validation checks duplicates, missing layers, ordering and unknown references.

Implemented for Island in Phase 09 (DECISIONS D77): `src/features/worlds/manifest.ts` is this contract and `theme-export.ts` maps the Blender layer export onto it (English names/descriptions instead of keys because the UI is English-only; the preview is the renderer at stage 10). Use explicit static import/require maps supported by Metro. Files live under the planned `assets/themes/island/` and `assets/themes/garden/` paths. Never construct runtime require paths from a stage number. Registry access and capabilities are independent: bundled Garden assets are not proof of Garden entitlement.

Store only theme IDs and version references in completion records. Keep backward-compatible manifests/assets for previously captured versions; a new art revision cannot make old collection records unrenderable. Future premium themes register another manifest and product capability mapping without changing money or progression code. That architecture does not grant Pro any unspecified future theme rights.

## Coordinates, exports and memory

Begin with a 1024-unit logical square/approved aspect ratio and consistent isometric projection. Match camera angle, lighting, horizon, object anchors and shadows across both themes. Cropping object exports to transparent bounds reduces texture memory; preserve coordinates in the manifest rather than manually aligning screenshots.

Use PNG or another Expo-supported alpha format validated on the chosen SDK. Verify actual device rendering before using a format purely to reduce file size. Prefer correctly sized base/object exports and appropriate scale variants. A compressed file's size is not its decoded texture footprint: estimate roughly width × height × 4 bytes for RGBA and account for overlapping transitions.

Initial engineering budgets, to confirm on the oldest supported device: no more than about 32 MiB decoded resident images for one world, about 64 MiB during a bounded crossfade, and 60 fps interaction/short transitions. These are profiling goals, not measured results. Adjust with evidence before final asset export. Keep only visible/adjacent scene data loaded; don't animate every world in a scrolling list.

## Animation hooks

Layers may provide a short reveal preset (fade, slight scale, gentle lift), but state eligibility comes exclusively from the shared engine. Every ten-percent boundary and a tiny between-stage deposit needs feedback. Run no network request or SQL write on an animation frame. A large deposit uses one bounded sequence; rapid revisions supersede older sequences; a withdrawal settles to current state. Reduced Motion uses an immediate stable composition and text feedback.

Use Reanimated first. A Skia or Lottie addition requires a measured rendering gap or an actual approved animation asset, a compatibility check, device memory/frame evidence and an ADR. Do not add either merely because it is popular.

## Art readiness and verification

Phase 09 accepts Island only after all eleven states have approved assets and correct alignment. Phase 17 does the same for Garden and confirms equivalent progression after theme switching. If art is missing, implementable independent validation/registry work may proceed, but visual acceptance stays pending and the same phase prompt remains next.

Verification includes contact sheets, all threshold boundaries, house replacement, tiny and large deposits, 100%-to-90% regression, rapid repeated writes, background/resume, high-density screens, small/large iPhones, memory and Reduce Motion. Scene descriptions must communicate progress without relying on visual inspection. Store provenance and measured budgets in phase evidence; do not claim that a renderer benchmark proves the art itself is approved.

## OTA asset compatibility

Both release themes are part of the embedded/native release asset set. An eligible OTA visual fix must preserve static references and historical theme-version lookup, include its full asset group and pass an offline relaunch after download. Do not make Garden access depend on a live asset server or remove assets still referenced by completed worlds. New incompatible manifest/persisted-version semantics follow the native-release gate in EAS_AND_OTA.
