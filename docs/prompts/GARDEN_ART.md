# Garden art workstream (owner brief, 26 October 2026)

A parallel art workstream before Phase 17, like the Island art before Phase 09 (D76). It produces the approved Garden art and layer export that Phase 17 integrates; Phase 17 itself (theme registry, switching, entitlement) stays in [PHASE_17](PHASE_17.md).

Every session first follows CLAUDE.md (read the v1.2 DOCX and the normalized docs), then reads `assets/worlds/garden/README.md` (current step, review log, milestone sequence) and DECISIONS D117 onward. Steps advance only on the owner's explicit approval; each step updates PROJECT_STATUS, SESSION_HANDOFF, DECISIONS, ASSET_SPEC and the Garden README.

Decided since the first session: the milestone sequence (D118): v1.2 except 80% greenhouse and vegetable beds; the 60% fountain brings all the water; the pergola is part of 90%. Steps 1-4 are complete and approved (26 October 2026, D117-D119): the approved export is `assets/worlds/garden/export/`. Step 5 is Phase 17 ([PHASE_17](PHASE_17.md)), which starts after Phases 15-16.

## Owner additions for the first session

- The product authority (MVP plan v1.2) and ASSET_SPEC fix the Garden sequence as 0 empty garden, 10% first seedlings, 20% small flower bed, 30% more flowers, 40% decorative tree, 50% garden pathway, 60% small fountain, 70% bench and decorations, 80% gazebo, 90% final plants and ornaments, 100% completed garden. The proposed table below differs. Show both side by side and get an explicit owner decision before finalizing; record a change as a new DECISIONS entry and update ASSET_SPEC and PRODUCT_REQUIREMENTS together.
- Another session may work on Phase 15 (billing) at the same time. Do not touch `src/features/billing/`, migrations or Phase 15 files.

## The brief (verbatim)

We are ready to start working on the **Garden theme**, which is the second visual world in Saving Worlds and will be available to Pro users.

I have attached a reference image showing the desired visual direction, environment, objects, and possible animations. (In the repository: `assets/worlds/garden/reference/garden-reference.webp`.)

**Your task is to create a production-quality Garden theme using our existing Blender asset-generation pipeline.**

Before making any changes, read the project documentation and inspect the existing Island implementation.

### 1. Important context

The Island theme is already implemented with:

- A Blender scene and reproducible generation scripts.
- A fixed isometric camera.
- A PNG layer export pipeline.
- A versioned layer manifest.
- Ten milestone unlocks, plus the initial 0% state.
- React Native rendering and milestone animations.
- Ambient animations for selected elements.
- Existing lifecycle, performance, and Reduce Motion rules.

**Reuse the existing architecture and conventions.**

Garden should become another theme supported by the same rendering and progression system.

Do not create a separate rendering engine or duplicate the Island's business logic.

### 2. Visual direction

Use the attached reference image as the primary artistic reference.

Garden should feel like a beautiful, cozy, magical floating garden that gradually comes to life as the user saves money.

Visual characteristics:

- Cozy isometric 2.5D appearance.
- Warm, soft, painterly materials.
- Rich but balanced pastel colors.
- Lush vegetation and flowers.
- Natural stone paths and terraces.
- A greenhouse.
- Decorative garden beds.
- A small pond and waterfall.
- A flower-covered pergola.
- Trees, bushes, lanterns, fences, and small decorative objects.

The visual quality should be comparable to or better than our existing Island.

Garden must have its own identity. It should not simply look like the Island with different trees.

Keep the scene readable at actual iPhone display sizes.

### 3. Garden milestone progression

Garden must support the same progression rules as Island:

- 0% is the initial scene.
- Every additional 10% unlocks a milestone.
- 100% represents the completed Garden.
- Progress above 100% remains visually capped at stage 10.
- Withdrawals and goal changes can reduce the visible progression without deleting transaction history.

Proposed milestone sequence:

| Progress | Garden unlock |
|---|---|
| 0% | Base floating terrain, grass and basic landscape |
| 10% | First seedlings and small plants |
| 20% | Stone paths and first flower bed |
| 30% | Additional flowers and bushes |
| 40% | Decorative tree and garden details |
| 50% | Main garden pathway and small bridge |
| 60% | Pond, stream and waterfall |
| 70% | Garden bench, lanterns and decorative details |
| 80% | Greenhouse and vegetable beds |
| 90% | Flower-covered pergola and additional decorations |
| 100% | Completed garden with final flowers and finishing details |

Treat this as the proposed visual progression. Check it against the existing product documentation and decisions before finalizing.

If a different unlock order produces a better composition, explain your recommendation before changing the milestones.

### 4. Plan animations from the beginning

Unlike Island, where we added ambient animations later, Garden should be designed with animation-ready assets from the start.

Prepare independent layers and suitable anchor points for:

**Trees and vegetation**
- Separate trunks and canopies where appropriate.
- Gentle canopy movement.
- Subtle flower and plant swaying.
- Avoid rigid rotation of entire trees.

**Water**
- Separate water surfaces and masks where appropriate.
- Gentle pond ripples.
- Subtle waterfall movement or shimmering highlights.
- Avoid unnatural opacity effects that make the water appear to blink.

**Butterflies**
- Occasional, subtle butterfly movement.
- Use a small number of animated elements.
- Avoid continuous visual clutter.

**Flower petals**
- Occasional falling petals in later milestones.
- Gentle movement with minimal particle count.

**Lanterns**
- Very subtle warm glow where appropriate.
- Avoid excessive pulsing or distracting effects.

All ambient animations must:
- Run only while the relevant screen is visible and the application is active.
- Stop when Reduce Motion is enabled.
- Avoid unnecessary GPU and battery usage.
- Preserve existing milestone unlock animations.

Use the existing React Native renderer and Reanimated architecture unless a specific limitation is demonstrated.

Do not introduce SpriteKit or additional native rendering engines.

### 5. Blender implementation

Create the Garden in a separate workspace under the existing world assets structure.

Requirements:

1. Preserve the existing Island files.
2. Reuse the existing Blender generation/export architecture where practical.
3. Create an editable Garden `.blend` scene.
4. Keep the scene reproducible through scripts.
5. Use a fixed orthographic camera.
6. Organize objects into milestone collections.
7. Ensure identical terrain, camera and lighting across all stages.
8. Export transparent PNG layers compatible with the current renderer.
9. Produce a compatible versioned layer manifest.
10. Preserve layer ordering, positions, anchors and milestone metadata.

Do not introduce unnecessary dependencies.

### 6. Implementation workflow

Do not attempt to build and render everything in one pass.

Work in stages.

**Step 1 — Inspect and plan**

- Review the existing Island Blender pipeline and manifest.
- Review the attached Garden reference.
- Propose the Garden scene composition and object hierarchy.
- Identify reusable code and required changes.
- Identify animation-ready assets and export requirements.

**Step 2 — Build the complete Garden**

- Create the Garden at 100%.
- Render a high-quality preview.
- Compare the result against the reference image.
- Show me the render and explain any major visual differences.

**Stop here and wait for my approval.**

Do not proceed to all milestone renders until I approve the completed Garden's appearance.

**Step 3 — Milestone validation**

After approval, render 0%, 50%, and 100% states.

Verify consistent terrain, lighting, perspective and object placement.

Wait for approval again.

**Step 4 — Full export**

After approval, generate all eleven progression states and required animation layers.

Validate the manifest and assets.

**Step 5 — Application integration**

Only after the assets are approved, integrate Garden into the existing theme system.

Preserve:
- Existing savings calculations.
- Existing Free/Pro entitlements.
- Island behavior.
- Theme-switching rules.
- Milestone animation rules.
- Existing performance and accessibility requirements.

### 7. Performance and asset quality

Garden should not become significantly heavier than Island without justification.

Inspect:
- PNG dimensions.
- Decoded memory usage.
- Number of layers.
- Texture reuse.
- Animation count.
- Render performance.
- Asset loading behavior.

Reuse existing optimizations where possible.

Physical-device performance verification can remain in the designated QA phase, but record the requirement.

### 8. Scope and project documentation

This work is focused on Garden visual assets and their eventual integration.

Do not change unrelated application functionality.

Do not modify the current Island appearance.

Do not expand the MVP scope.

Read and follow the current project documentation, including:

- Product requirements.
- Design system.
- Architecture.
- Development roadmap.
- Project status.
- Session handoff.
- Relevant decisions and asset-generation documentation.

Update the appropriate documentation after each completed step.

Do not mark any phase complete without its required verification evidence.

### 9. First deliverable

Start with Step 1 and Step 2 only.

Create the editable Garden Blender scene and render a complete 100% Garden preview.

Show me the result for visual approval.

Do not render all milestones or integrate Garden into the React Native application yet.

The goal is to create a beautiful, polished Garden world that feels like a natural premium companion to Island, while remaining technically compatible with the existing Saving Worlds architecture.
