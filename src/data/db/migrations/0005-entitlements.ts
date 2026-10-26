import type { Migration } from '../migration-runner';

// Schema 5 (Phase 15): the stored Pro entitlement and the store transactions already processed
// (docs/DATA_MODEL.md "entitlement_cache and purchase_events", DECISIONS D115).
// - entitlement_cache holds one row per product: the last state StoreKit confirmed ('verified',
//   'not_owned', 'revoked'), or 'unknown' while nothing was ever confirmed. A failed or offline
//   check only records last_attempt_at_utc and last_error_code; it never replaces a confirmed state,
//   so earlier verified rights survive network failures. It is a snapshot of StoreKit for a quick
//   start, never an editable flag: only the entitlement reconciler writes it.
// - purchase_events records each StoreKit-verified transaction once, by its native ID, before the
//   app finishes it with StoreKit. A replayed or duplicate delivery finds its row and is only
//   finished again. Unverified results never reach storage (the native layer refuses them).
// - Neither table refers to goals, entries or souvenirs: a change of rights can never touch savings
//   (D74, D75). No raw receipt or signed payload is stored.
// Never edit this text after it ships; add a new migration instead.
const UTC = "'[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'";

export const migration0005: Migration = {
  version: 5,
  name: 'entitlements',
  sql: `
CREATE TABLE entitlement_cache (
  product_id TEXT PRIMARY KEY NOT NULL CHECK (length(product_id) BETWEEN 1 AND 200),
  status TEXT NOT NULL CHECK (status IN ('verified', 'not_owned', 'revoked', 'unknown')),
  native_transaction_id TEXT CHECK (native_transaction_id IS NULL OR length(native_transaction_id) BETWEEN 1 AND 64),
  verified_at_utc TEXT CHECK (verified_at_utc IS NULL OR verified_at_utc GLOB ${UTC}),
  last_attempt_at_utc TEXT NOT NULL CHECK (last_attempt_at_utc GLOB ${UTC}),
  last_error_code TEXT CHECK (last_error_code IS NULL OR length(last_error_code) BETWEEN 1 AND 64),
  revision INTEGER NOT NULL CHECK (revision >= 1),
  CHECK (status <> 'verified' OR (native_transaction_id IS NOT NULL AND verified_at_utc IS NOT NULL))
) STRICT;

CREATE TRIGGER entitlement_cache_revision BEFORE UPDATE ON entitlement_cache
WHEN NEW.revision <> OLD.revision + 1 OR NEW.product_id <> OLD.product_id
BEGIN
  SELECT RAISE(ABORT, 'entitlement revision must step by one');
END;

CREATE TABLE purchase_events (
  native_transaction_id TEXT PRIMARY KEY NOT NULL CHECK (length(native_transaction_id) BETWEEN 1 AND 64),
  product_id TEXT NOT NULL CHECK (length(product_id) BETWEEN 1 AND 200),
  verification_state TEXT NOT NULL CHECK (verification_state = 'verified'),
  processed_at_utc TEXT NOT NULL CHECK (processed_at_utc GLOB ${UTC}),
  finished_at_utc TEXT CHECK (finished_at_utc IS NULL OR finished_at_utc GLOB ${UTC}),
  revoked_at_utc TEXT CHECK (revoked_at_utc IS NULL OR revoked_at_utc GLOB ${UTC})
) STRICT;

CREATE TRIGGER purchase_events_identity BEFORE UPDATE ON purchase_events
WHEN NEW.native_transaction_id <> OLD.native_transaction_id
  OR NEW.product_id <> OLD.product_id
  OR NEW.processed_at_utc <> OLD.processed_at_utc
BEGIN
  SELECT RAISE(ABORT, 'a processed transaction keeps its identity');
END;
`,
};
