# In-App Purchase: Saving Worlds Pro

The one product of Release 1.0 (D113, D116, R18). Nothing about future themes is sold or promised (Q08).

| Field | Value | State in App Store Connect (APPLE_SETUP, 26 Oct 2026) |
| --- | --- | --- |
| Type | Non-Consumable | Created (IAP 6827087893) |
| Product ID | `com.bosko123.savingworlds.pro.lifetime` | Created; matches `PRO_PRODUCT_ID` in `src/features/billing/domain/entitlement.ts` |
| Reference name | Saving Worlds Pro (Lifetime) | Set |
| Display name (en-US, 2-30) | Saving Worlds Pro (17) | Set |
| Description (en-US, ≤ 45) | Unlimited goals, Garden and Pro statistics (42) | Set. Optional wording closer to the app: "Unlimited goals, the Garden and insights" (40) |
| Price | US$7.99, base territory United States, other storefronts by Apple's equalization (for example 8.99 in Serbia and Germany, 7.99 in the UK) | Set (D116, final) |
| Family Sharing | Off | Off (turning it on later cannot be undone) |
| App Review screenshot | `store/screenshots/iap-review-paywall.png` (the real Pro screen with the store price) | **Missing: the reason for "Missing Metadata"** |
| Review notes | "One-time non-consumable. Opens from Settings > Saving Worlds Pro, from Home > ... > New goal while one goal exists, or from the locked Garden card. Restore Purchases is on the same screen. Unlocks unlimited goals, the Garden world, Island/Garden switching per goal and the Savings insights screen." | Draft (the existing note covers the scope) |
| Submission | Must be added to the 1.0.0 version's "In-App Purchases" section and submitted together with the first app version | Not done |

## Localized price on the device

The app never writes a price. The paywall button shows `Unlock Pro for {displayPrice}` with the `displayPrice` StoreKit returns for the person's storefront (`PAYWALL_COPY.buyWithPrice`, `src/features/billing/presentation/billing-copy.ts`). Observed: $7.99 in the US sandbox storefront (Phase 15, simulator and iPhone). The listing text names no price (Apple asset rules; the store shows the price itself).

## In-app sale copy (approved, D125)

"Unlock more worlds". "Grow your Garden, save for unlimited goals, and enjoy your entire savings journey." Pro includes: Unlimited goals (Build as many worlds as you like.), Unlock the Garden (Grow a beautiful new world.), Switch worlds (Choose Island or Garden for each goal.), Savings insights (See your progress across all goals.). Footnote: "One-time purchase. No subscription."
