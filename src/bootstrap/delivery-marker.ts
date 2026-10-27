// Delivery drill marker (Phase 20, docs/EAS_AND_OTA.md "Preview verification and promotion").
// Always null on main and in every store build. A preview-channel drill update is exported from a
// drill commit that sets it, so the build details show which JavaScript bundle is running.
export const DELIVERY_DRILL_MARKER: string | null = null;
