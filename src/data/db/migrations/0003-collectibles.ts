import type { Migration } from '../migration-runner';

// Schema 3 (Phase 11): the permanent souvenir, one per goal (v1.2 "Collectible: goalId unique,
// themeId, themeVersion, earnedAt", docs/DATA_MODEL.md "collectibles"). Keeps the table name the
// Phase 06 currency lock and the D74 goal deletion already use.
// - goal_id is the primary key, so a goal can never hold two souvenirs, whatever a command does.
//   The foreign key is RESTRICT: a goal is deleted only after its souvenir (deleteGoal, D74).
// - theme_id/theme_version are the art the goal had at the first saved B >= T; the Collection shows
//   that version even after a theme or art change. target_minor_at_award is the target at that
//   moment, an immutable caption ("target then"), never part of any money total.
// - A souvenir never changes: no update is allowed. Only the goal deletion command removes it.
// - Goals that already had B >= T before this schema (development databases only; no release
//   shipped schema 1 or 2) receive their souvenir now, so every funded goal has one. Their earned
//   time is the upgrade time and their version the art version current at schema 3 (Island 2,
//   Garden 1; no Garden goal can exist yet).
// Never edit this text after it ships; add a new migration instead.
const UTC = "'[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'";

export const migration0003: Migration = {
  version: 3,
  name: 'collectibles',
  sql: `
CREATE TABLE collectibles (
  goal_id TEXT PRIMARY KEY NOT NULL REFERENCES goals (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  theme_id TEXT NOT NULL CHECK (theme_id IN ('island', 'garden')),
  theme_version INTEGER NOT NULL CHECK (theme_version >= 1),
  target_minor_at_award INTEGER NOT NULL
    CHECK (target_minor_at_award > 0 AND target_minor_at_award <= 1000000000000),
  earned_at_utc TEXT NOT NULL CHECK (earned_at_utc GLOB ${UTC})
) STRICT;

CREATE TRIGGER collectibles_immutable BEFORE UPDATE ON collectibles
BEGIN
  SELECT RAISE(ABORT, 'souvenirs are permanent');
END;

INSERT INTO collectibles (goal_id, theme_id, theme_version, target_minor_at_award, earned_at_utc)
SELECT g.id,
       g.theme_id,
       CASE g.theme_id WHEN 'island' THEN 2 ELSE 1 END,
       g.target_minor,
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  FROM goals g
 WHERE (SELECT coalesce(sum(e.signed_amount_minor), 0) FROM ledger_entries e WHERE e.goal_id = g.id) >= g.target_minor;
`,
};
