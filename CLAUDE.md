# Saving Worlds — start here

Saving Worlds is an offline, iOS-first Expo app for manually tracking real savings toward goals that grow small worlds. Every session starts from the repository documentation, not from earlier chats.

## Authority

1. The owner's current instruction in this session.
2. **`docs/Saving_Worlds_MVP_Plan_v1_2.docx` (23 October 2026) is the supreme product authority.** Read its full text and tables with a local reader, for example `textutil -convert txt -stdout docs/Saving_Worlds_MVP_Plan_v1_2.docx`. If it cannot be read, report that blocker; never fall back to v1.1.
3. Current normalized docs: `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md` and the engineering documents they link.
4. Historical sources (`docs/sources/`, v1.1, 22 October feature decisions, old evidence) never override v1.2, even where they say "confirmed".

Q01–Q06 are **resolved** by v1.2. Do not ask for reapproval and do not restore custom challenges, per-goal currencies, entry audit/version history or whole-goal deletion. Only Q07 (price/sale copy) and Q09 (identity/operational access) remain release dependencies; Q08 is future-only.

## Session workflow

1. Read the v1.2 DOCX, then `docs/README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/SOURCE_RECONCILIATION.md`, `docs/DECISIONS.md`, `docs/DEVELOPMENT_RULES.md`.
2. Read `docs/PROJECT_STATUS.md` and `docs/SESSION_HANDOFF.md`, including verification gaps. They name the current phase and the exact next prompt in `docs/prompts/`.
3. Read the phase prompt and its phase-specific documents. UI work also reads `docs/DESIGN_SYSTEM.md` and `docs/ADAPTIVE_LAYOUT.md`; native, dependency, persistence or delivery work also reads `docs/EAS_AND_OTA.md`.
4. Inspect actual files, scripts, lockfile, tests and working tree before changing anything. Verify evidence; a checked box or handoff label is not proof. Preserve unrelated owner work.
5. Do only the current phase. Close the session by updating `docs/PROJECT_STATUS.md`, `docs/SESSION_HANDOFF.md`, `docs/evidence/PHASE_NN.md` and `docs/DECISIONS.md` (or state that no decision changed), and name the exact next prompt. A phase with a required check NOT RUN is not verified complete.

## Project facts (Phases 01-04)

- Expo SDK 58 (`expo` 58.0.17), React Native 0.88.0, React 19.3.0, Expo Router 58.0.25. One npm lockfile. Do not upgrade the SDK as a side effect; an upgrade is its own reviewed change.
- Install native packages with `npx expo install <pkg>`. Feature packages (notifications, purchases, images, charts) are installed in their owning phases.
- Routes live in `src/app/` and stay thin; non-route code lives in `src/` modules (`src/bootstrap/`, `src/shared/`, later `src/core/`, `src/features/`). Navigation is native Expo Router Stack + NativeTabs only.
- EAS project `@bosko123/saving-worlds` (ID in `app.config.ts`), bundle ID `com.bosko123.savingworlds`, runtime policy `appVersion`. Profiles/channels/environments follow `docs/EAS_AND_OTA.md`. Run EAS with `npm run eas -- <command>` (pinned eas-cli 25.3.0). Never publish a production update or submit to the store without explicit owner instruction.
- `ios/` and `android/` are generated (CNG) and ignored; configure native behavior in `app.config.ts` and config plugins.
- Checks: `npm run lint`, `npm run typecheck`, `npm test -- --runInBand`, `npm run deps:check`, `npm run doctor`. Jest mocks do not prove native SQLite, StoreKit, notifications or device behavior.
- Styling (Phase 02): use semantic tokens from `@/shared/theme` and primitives in `src/shared/ui/` (AppText, Button, TextField, Card, AmountText, Notice); raw colors live only in `src/shared/theme/palette.ts`. ESLint blocks color literals, disabled font scaling and `Dimensions.get` in `src/`. The app ships one forced light appearance. Conventions and contrast results: `docs/DESIGN_SYSTEM.md`. Development-only component gallery: Settings → Component gallery (`/dev-gallery`). Toasts, haptics and icons (SF Symbols only) follow the DESIGN_SYSTEM rules through shared wrappers; UX packages are installed in the phase listed in the DESIGN_SYSTEM UX library plan.
- Layout (Phase 03): screens use `Screen`, `FormScreen`, `ContentColumn` or `AdaptiveGoalLayout` from `@/shared/layout`, never their own ScrollView/safe-area code, window reads, device branches or scale functions. Inset ownership, the ArrangementView adapter (iOS 27.1+, explicit fallback) and the adoption contract are in `docs/ADAPTIVE_LAYOUT.md`. Development-only layout lab: Settings → Layout lab (`/dev-layout`). Inner split view on iPhone Duo is a physical-device release check (DECISIONS D48).
- Domain (Phase 04): all money, date, stage and capability rules come from `@/core/money`, `@/core/calendar`, `@/core/progression` and `@/core/access` (pure TypeScript; ESLint blocks React/native/store imports and real-time reads there). Amounts are integer minor units (max 10^12) with BigInt sums; parse user text only with `parseAmount`, display only with `formatMoney`; take a `Clock`, never `Date.now()`. Currency registry: ISO 4217 List One 2026-09-17, version 1 (DECISIONS D50).
- After moving or renaming route files, restart Metro with `npx expo start --dev-client --clear`; the route cache can otherwise serve the old tree.
- No credentials, signing material, tokens or real financial data in the repository.
