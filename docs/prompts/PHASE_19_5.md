# Implement Phase 19.5 App icon and launch screen

You are implementing one phase of Saving Worlds in a fresh Claude Code session. Repository documentation and inspected code are your context; do not rely on any earlier chat.

## Start by verifying context

1. Read the full text and tables of `docs/Saving_Worlds_MVP_Plan_v1_2.docx` with a local reader (for example macOS `textutil -convert txt -stdout`); if unreadable, report that blocker instead of substituting v1.1. Then read `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. Read `docs/ARCHITECTURE.md`, the phase-specific documents below and its canonical roadmap entry. This is an art and native-configuration phase: read `docs/DESIGN_SYSTEM.md`, `docs/ADAPTIVE_LAYOUT.md` and `docs/EAS_AND_OTA.md`, and preserve the runtime and activation contracts.
3. Inspect the existing files, package scripts, lockfile, migrations, tests and working tree before changing anything. Preserve unrelated owner work. If Git is absent, inspect the directory and say so; do not assume a clean Git history.
4. Verify actual dependency code and evidence against acceptance criteria. A checked box, previous handoff or earlier chat is insufficient. Resume missing work if this phase is partially complete. If already complete, verify that fact and report it without reimplementation or silently starting the next phase.
5. Product authority is `docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026). It supersedes conflicting v1.1 and 22 October feature text, even when historical files say confirmed. Q01-Q06 are resolved; do not request reapproval or restore custom challenges, per-goal currencies or entry audit history. Owner decision D74 (DECISIONS) overrides v1.2 on goals: Archive and Close goal are removed (statuses active, paused, completed), any goal can be deleted after a native confirmation, Free may have one goal in total in any status. Do not restore Archive or the old no-deletion rule. Ask only for a genuinely missing operational dependency, continue independent authorized work and leave its evidence pending.

Phase-specific reading: `docs/ASSET_SPEC.md`, `assets/worlds/island/README.md` (Blender source, rebuild/render commands, provenance), the Garden art README if it exists, `docs/APPLE_SETUP.md`, `app.config.ts` (`icon`, `expo-splash-screen` plugin, `LAUNCH_BACKGROUND`), `src/bootstrap/database-gate.tsx` (when the splash hides), `tests/unit/delivery-config.test.ts` and `tests/unit/contrast.test.ts` (launch color guard), DECISIONS D37, D43, D76, D97 and D114, and the Phase 19.5, 20 and 22 entries in `docs/DEVELOPMENT_ROADMAP.md`.

## Objective

Replace the Expo placeholder app icon and launch screen with owner-approved Saving Worlds artwork before the first release-mode preview build (Phase 20), so every build tested from then on carries the real identity. Owner request, 26 October 2026 (DECISIONS D114).

## Dependencies and decision gates

Phase 19. The Island art is approved (D76); the Garden art may be used only once the owner has approved it. The app's store name (Q09) does not block the icon: the icon carries no text.

Owner gates: the owner chooses one icon direction from the concepts, then approves the final light, dark and tinted icons and the launch screen on the simulator before the phase closes. Changing the icon and launch screen is a native configuration change: it needs a new development build, and once runtime 1.0.0 is shared (Phase 20 onward) a new app version (EAS_AND_OTA). Doing it here, before Phase 20, avoids that.

## Exact scope

- **Concepts.** Two or three icon directions drawn from the existing world art and the D97 direction (cozy, world first): for example the finished Island on its sky gradient, a close crop of the Island, or a small symbol from it. No text, no "Pro", no price, no Apple symbols or other trademarks. Show them to the owner at real home-screen sizes (60, 40 and 29 pt) next to typical iOS icons before producing the final one.
- **Final icon, reproducible.** Produce it from a script, like the world art (a Blender icon scene/camera that reuses the Island source, or a vector source), never by hand-editing exported PNGs (D76). Store the source, script and provenance under `assets/branding/` with a README (original work only). Output a 1024 × 1024 PNG in sRGB with no alpha channel and square corners (iOS applies the mask). Readable at 29 pt: one clear shape, no fine detail at the edges.
- **Dark and tinted variants.** Check what the pinned Expo SDK supports (`ios.icon` with light/dark/tinted images, and whether an Icon Composer `.icon` file for iOS 26 Liquid Glass is supported). Produce what the SDK supports and record the choice. The dark variant suits a dark home screen; the tinted variant must read well in one color.
- **Launch screen.** Configure `expo-splash-screen` in `app.config.ts`: the cream `LAUNCH_BACKGROUND` (the palette guard test stays green) and a small centered mark from the icon art, not the full icon and no text. The app forces the light appearance (D37), so one light launch screen is enough unless the SDK needs a dark entry. No animated splash. The splash still hides only after `DatabaseGate` settles.
- **Placeholders gone.** Remove the Expo template `assets/images/icon.png` and `splash-icon.png` contents (replace them or point the config at the new files), so no placeholder remains in any build.
- **Build.** New EAS development simulator build (and a device build when a physical iPhone build is available), installed over existing test data, to see the real icon and launch screen.

## Expected files and modules

These are planned code paths, not claims that the files exist. Reuse the actual repository structure if equivalent modules already exist, and document any mapping. Do not create duplicate implementations just to match a proposed name.

- `assets/branding/ icon source, generation script, concept renders, README with provenance`
- `assets/images/ final icon (light, dark, tinted as supported) and launch mark`
- `app.config.ts icon and expo-splash-screen configuration`
- `tests/unit/delivery-config.test.ts icon files exist, 1024 × 1024, no alpha; launch color guard`
- `docs/evidence/PHASE_19_5.md concepts, owner choice, simulator screenshots, build ID`

## Technical requirements

- Icon PNGs: exactly 1024 × 1024, sRGB, opaque (no alpha), no rounded corners or drop shadow baked in. Check with `sips -g pixelWidth -g pixelHeight -g hasAlpha`.
- Launch background equals `LAUNCH_BACKGROUND` in `src/shared/theme/palette.ts`; the existing contrast test keeps them in sync.
- Verify the generated asset catalog in a throwaway prebuild (never commit `ios/`): the AppIcon set holds the expected images and Xcode reports no missing or alpha icons.
- No new runtime dependency. A native config change follows EAS_AND_OTA; record the build ID, app version and runtime.

## Acceptance criteria

- The owner chose one concept and approved the final light, dark and tinted icons and the launch screen (recorded in DECISIONS and the evidence).
- The icon reads clearly on the simulator home screen, in Spotlight, in Settings and in the app switcher, in light and dark home-screen appearance and in tinted mode where the OS offers it.
- A cold start shows the new launch screen on the SE, 17 Pro Max and the Duo, then the app as before; no flash of a different color.
- No Expo placeholder icon or splash remains in the app config, the asset catalog or any build.
- Standard checks pass, including the icon file test and the launch color guard.

## Tests and verification

- Run lint, typecheck and `npm test -- --runInBand`; the icon file test (size, opaque) and the launch color guard.
- A throwaway `npx expo prebuild --platform ios` in a temporary copy to inspect the asset catalog.
- New EAS development simulator build; screenshots of the home screen (light, dark, tinted), Spotlight, Settings, the app switcher and a cold launch on three simulators.
- The physical-iPhone look of the icon joins the Phase 21 release-candidate check.

## Definition of Done

Every acceptance criterion above has evidence; required dependencies are verified; relevant automated/native/manual checks pass; no known critical regression remains; documentation and handoff reflect actual state. Required external checks marked NOT RUN keep the phase incomplete. Use the detailed common Definition of Done in DEVELOPMENT_RULES. The owner's approval of the icon and launch screen is mandatory; without it the phase stays IN PROGRESS.

## Out of scope

- App Store screenshots, description and other store metadata (Phase 22), the final App Store name (Q09, Phase 22), alternate app icons chosen in the app, an animated or interactive launch screen, new in-app art, marketing or web assets.

## Verification and session close

Run `npm run lint`, `npm run typecheck` and `npm test -- --runInBand` after implementation, plus the phase-specific checks above. If a command or tool cannot run, record NOT RUN with the exact reason and next action.

Review the diff against this phase's scope. Fix regressions caused by the work. Do not upgrade unrelated dependencies or begin the next phase. Keep all existing money, accessibility, capability and migration invariants. Follow the common Definition of Done in `docs/DEVELOPMENT_RULES.md` in addition to the phase acceptance criteria.

Update `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md` after this session even if incomplete. Add the verification record at the evidence path below, with exact commands/results, build ID, device/OS, files changed, the concepts, the owner's choice and approval and unresolved limitations. Update `docs/DECISIONS.md` for the chosen direction and variants, and DESIGN_SYSTEM ("Icons") and RELEASE_CHECKLIST in the same change. Preserve old evidence.

A phase is VERIFIED COMPLETE only when every mandatory acceptance check and the owner's approval are recorded. Otherwise mark IN PROGRESS or BLOCKED, identify the missing work, and recommend the same prompt for continuation.

Finish by reporting: concrete behavior implemented, changed files and art, checks and results, remaining work/blockers, documentation updated and the exact next prompt file.

Evidence path: `docs/evidence/PHASE_19_5.md` (create it during implementation).

If this phase is incomplete, the next prompt is `docs/prompts/PHASE_19_5.md`. If verified complete, the next prompt is `docs/prompts/PHASE_20.md`.
