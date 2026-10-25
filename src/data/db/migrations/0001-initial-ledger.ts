import type { Migration } from '../migration-runner';

// Schema 1 (Phase 05): settings, goals, ledger_entries and operation_receipts. Never edit this text
// after it ships; add a new migration instead (tests/unit/ledger-history.test.ts pins the checksum).
// Later phases own collectibles (11), challenge_attempts (12), notification requests (14) and the
// entitlement cache (15). There is no ledger revision/audit table and no balance column
// (docs/DATA_MODEL.md).
//
// Constraints and triggers defend the same invariants the commands check, so a bug in a command
// cannot store an impossible row: positive targets, nonzero bounded amounts, the four goal statuses,
// immutable createdAt/goal links, revision steps of exactly one, no goal deletion and no ledger
// change on a completed/archived goal. Chronological nonnegative balances need the whole candidate
// history and are enforced by the ledger commands inside the same exclusive transaction.
const DATE = "'[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'";
const UTC = "'[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'";

export const migration0001: Migration = {
  version: 1,
  name: 'initial_ledger',
  sql: `
CREATE TABLE settings (
  key TEXT PRIMARY KEY NOT NULL,
  value_json TEXT NOT NULL CHECK (json_valid(value_json)),
  updated_at_utc TEXT NOT NULL CHECK (updated_at_utc GLOB ${UTC})
) STRICT;

CREATE TABLE goals (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  target_minor INTEGER NOT NULL CHECK (target_minor > 0 AND target_minor <= 1000000000000),
  deadline_date TEXT CHECK (deadline_date IS NULL OR deadline_date GLOB ${DATE}),
  theme_id TEXT NOT NULL CHECK (theme_id IN ('island', 'garden')),
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  created_at_utc TEXT NOT NULL CHECK (created_at_utc GLOB ${UTC}),
  updated_at_utc TEXT NOT NULL CHECK (updated_at_utc GLOB ${UTC}),
  revision INTEGER NOT NULL CHECK (revision >= 1)
) STRICT;

CREATE INDEX goals_status_updated ON goals (status, updated_at_utc);

CREATE TRIGGER goals_no_delete BEFORE DELETE ON goals
BEGIN
  SELECT RAISE(ABORT, 'goals are archived, never deleted');
END;

CREATE TRIGGER goals_immutable_identity BEFORE UPDATE OF id, created_at_utc ON goals
WHEN NEW.id IS NOT OLD.id OR NEW.created_at_utc IS NOT OLD.created_at_utc
BEGIN
  SELECT RAISE(ABORT, 'goal id and created_at_utc are immutable');
END;

CREATE TRIGGER goals_revision_step BEFORE UPDATE ON goals
WHEN NEW.revision IS NOT OLD.revision + 1
BEGIN
  SELECT RAISE(ABORT, 'goal revision must increase by one');
END;

CREATE TABLE ledger_entries (
  id TEXT PRIMARY KEY NOT NULL,
  goal_id TEXT NOT NULL REFERENCES goals (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  signed_amount_minor INTEGER NOT NULL
    CHECK (signed_amount_minor <> 0 AND abs(signed_amount_minor) <= 1000000000000),
  entry_date TEXT NOT NULL CHECK (entry_date GLOB ${DATE}),
  note TEXT CHECK (note IS NULL OR length(note) BETWEEN 1 AND 500),
  created_at_utc TEXT NOT NULL CHECK (created_at_utc GLOB ${UTC}),
  updated_at_utc TEXT NOT NULL CHECK (updated_at_utc GLOB ${UTC}),
  revision INTEGER NOT NULL CHECK (revision >= 1)
) STRICT;

CREATE INDEX ledger_entries_goal_chronology ON ledger_entries (goal_id, entry_date, created_at_utc, id);

CREATE TRIGGER ledger_entries_immutable_identity BEFORE UPDATE OF id, goal_id, created_at_utc ON ledger_entries
WHEN NEW.id IS NOT OLD.id OR NEW.goal_id IS NOT OLD.goal_id OR NEW.created_at_utc IS NOT OLD.created_at_utc
BEGIN
  SELECT RAISE(ABORT, 'ledger entry id, goal_id and created_at_utc are immutable');
END;

CREATE TRIGGER ledger_entries_revision_step BEFORE UPDATE ON ledger_entries
WHEN NEW.revision IS NOT OLD.revision + 1
BEGIN
  SELECT RAISE(ABORT, 'ledger entry revision must increase by one');
END;

CREATE TRIGGER ledger_entries_open_goal_insert BEFORE INSERT ON ledger_entries
WHEN (SELECT status FROM goals WHERE id = NEW.goal_id) IN ('completed', 'archived')
BEGIN
  SELECT RAISE(ABORT, 'goal is closed');
END;

CREATE TRIGGER ledger_entries_open_goal_update BEFORE UPDATE ON ledger_entries
WHEN (SELECT status FROM goals WHERE id = OLD.goal_id) IN ('completed', 'archived')
BEGIN
  SELECT RAISE(ABORT, 'goal is closed');
END;

CREATE TRIGGER ledger_entries_open_goal_delete BEFORE DELETE ON ledger_entries
WHEN (SELECT status FROM goals WHERE id = OLD.goal_id) IN ('completed', 'archived')
BEGIN
  SELECT RAISE(ABORT, 'goal is closed');
END;

CREATE TABLE operation_receipts (
  operation_id TEXT PRIMARY KEY NOT NULL,
  command_kind TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  result_json TEXT NOT NULL CHECK (json_valid(result_json)),
  created_at_utc TEXT NOT NULL CHECK (created_at_utc GLOB ${UTC})
) STRICT;

CREATE TRIGGER operation_receipts_immutable BEFORE UPDATE ON operation_receipts
BEGIN
  SELECT RAISE(ABORT, 'operation receipts are immutable');
END;
`,
};
