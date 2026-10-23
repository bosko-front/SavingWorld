# Latest session handoff

Session date: 23 October 2026. Session kind: Phase 03 implementation (global adaptive layout and iPhone Duo foundation). Result: **Phase 03 VERIFIED COMPLETE** after a same-day continuation and the owner's decision to move inner split view to the physical-Duo release gate (DECISIONS D48). Next prompt: [PHASE_04](prompts/PHASE_04.md).

The previous handoff (Phase 02) is superseded; its record remains in [PHASE_02 evidence](evidence/PHASE_02.md).

## Completed

- Read the full v1.2 DOCX and the required docs; re-ran the Phase 02 checks (lint, typecheck, 84 tests PASS) before changing anything. Confirmed from the EAS log that the installed dev build `ab77dda9` was built with Xcode 27.1, so `@expo/ui` ArrangementView is compiled in.
- Built `src/shared/layout/`: `Screen`, `FormScreen`, `ContentColumn`, `AdaptiveGoalLayout`, `useMeasuredSize`, pure `metrics.ts` (inset ownership, readable width, aspect fit, short-window scene cap) and `arrangement-adapter.tsx` (the only ArrangementView/RNHostView user; iOS 27.1 guard; explicit stacked fallback below it).
- Inset policy: native scroll view owns top/bottom; a native `SafeAreaView` (`maximum` mode) inside the content owns left/right. This addresses the Phase 01 Duo finding (text under the side-controls column) without window values or double padding.
- Shell screens (Home, Details, Settings, Challenges, Collection) and the gallery use the primitives; `PlaceholderScreen` deleted. `/sample-form` is now a development-only controlled form sheet; a development-only layout lab is at `/dev-layout` (Settings → Layout lab). `TextField` gained `inputRef`.
- ESLint guardrails: `useWindowDimensions` only in the layout layer and `src/dev`; ArrangementView/RNHostView only in the layout layer.
- Tests: 17 layout-policy unit tests, 10 layout integration tests, extended navigation tests (114 total).
- Native checks (Metro + build ab77dda9): Duo iOS 27.1 inner portrait native arrangement, keyboard, native sheet and largest text PASS; SE iOS 18.5 and 17 Pro Max iOS 26.1 fallback, keyboard reachability and live largest-text change with draft kept PASS. One Duo landscape rotation is in the lab log (side-by-side arrangement, 84 pt right inset, no remount) but has no screenshots.
- Docs: ADAPTIVE_LAYOUT (implementation + adoption contract for later screens), DESIGN_SYSTEM, ARCHITECTURE, TECH_STACK, DECISIONS D44-D46, CLAUDE.md, README, PROJECT_STATUS, this file, [PHASE_03 evidence](evidence/PHASE_03.md).

## Continuation (same day): native Duo poses

- The owner granted macOS Accessibility to the Claude Code helper process; Device Hub was then driven through the Accessibility API (Rotate button, Closed / Partially Open / Open pose buttons, app buttons and fields). The owner dragged the hinge slider open once; AX value changes on the slider do not move the device.
- Fixed in `src/shared/layout/`: (1) hosted regions in the native arrangement no longer add the safe-area inset a second time (controls were 282 pt instead of 350 pt beside the 84 pt side column); (2) when the system collapses ArrangementView to the scene alone (closed Duo, landscape), AdaptiveGoalLayout uses the stacked composition for that window size and retries native on the next window change. Split limits and split/overlay styles were tried and did nothing in that pose. Tests added (119 total). DECISIONS D47.
- PASS with screenshots and logs: closed portrait (native split), closed landscape with the side column left and right (stacked fallback), open portrait and landscape (vertical split / side by side), partially open portrait and landscape (gap at the fold), Settings shell screen on the closed display on both column sides, native sheet through rotate → closed → open (value kept, mounted once, no submission), and repeated changes while typing (lab mounted once, draft and selection kept, Pretend saves 0).
- Limitation: the collapse fallback rebuilds both regions, so keyboard focus is lost; text and selection stay.
- Ordinary-iPhone landscape: iPhone 17 Pro Max iOS 26.1 selected in Device Hub and rotated through AX; Settings and the lab stay clear of the 62 pt side insets, the fallback scene is capped at 45% of the height. PASS.
- Owner decision D48: inner split view (no Device Hub control for iPhone Duo) moves to the physical-Duo check before release; RELEASE_CHECKLIST and the Phase 21 prompt/roadmap name it.

## Planning addition (after Phase 03, docs only)

At the owner's request, checkpoint [Phase 07.5](prompts/PHASE_07_5.md) "Visual direction and design review" now sits between Phase 07 and 08 (DECISIONS D49): review the real screens, choose a Home direction with the owner from development-only mocks, refine tokens/primitives with contrast tests, and polish existing screens without behavior changes. Updated: roadmap, prompt index, PHASE_07 next-prompt pointer, PHASE_08 dependency, PROJECT_STATUS register, DESIGN_SYSTEM, README, SOURCE_RECONCILIATION, TEST_PLAN. The next prompt is still PHASE_04.

## Decisions

D44 (inset ownership and ArrangementView adapter), D45 (dev-only samples, lint guardrails, PlaceholderScreen removed), D46 (no react-native-keyboard-controller; built-in keyboard insets), D47 (container-owned hosted regions and the collapse fallback), D48 (owner: inner split view verified on a physical Duo before release), D49 (owner: Phase 07.5 design checkpoint). No product decision changed.

## Checks

lint PASS, typecheck PASS, `npm test -- --runInBand` PASS (7 suites, 119 tests after the continuation), `npm run deps:check` PASS, expo-doctor 20/20 PASS, release export contains no lab/sample code. No package, native config or EAS change; no build, update or store action. Details: [PHASE_03 evidence](evidence/PHASE_03.md).

## Incomplete work and blockers

None for Phase 03. Carried gates (not simulator passes):

1. Physical iPhone Duo: inner split view with the app on both sides plus a divider drag, and the full pose matrix (D48; RELEASE_CHECKLIST; Phase 21). Needs the owner's device build (Apple credentials, device registration).
2. VoiceOver (Phase 19) and popover anchoring (first phase that adds a popover).
3. Known limitation: on the closed Duo in landscape the stacked fallback rebuilds both regions, so keyboard focus is lost (drafts and selection kept). Revisit if @expo/ui/iOS lets the secondary region show in compact height.
4. Phase 03 is committed on `main` at the owner's request (nothing pushed). macOS Accessibility for the Claude Code helper can be switched off when not testing.

## Exact next session

1. In ~/Desktop/SavingWorld start Claude Code with the full `docs/prompts/PHASE_04.md` (exact money, calendar and progression rules; pure domain code, no screens).
2. Read v1.2 and the required docs, rerun lint/typecheck/tests to confirm the committed Phase 03 tree, and do not change `src/shared/layout/` unless Phase 04 genuinely needs it.
