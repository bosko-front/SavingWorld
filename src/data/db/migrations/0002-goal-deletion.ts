import type { Migration } from '../migration-runner';

// Schema 2 (Phase 08, owner decision D74): Archive is removed and whole goals may be deleted.
// - Drops schema 1's `goals_no_delete` trigger. The goal deletion command removes a goal's ledger
//   entries, its souvenir and the goal in one exclusive transaction (foreign keys stay RESTRICT, so
//   a goal can never be deleted while entries still reference it).
// - Turns any 'archived' goal into 'paused', keeping every record; no code writes 'archived' any
//   more. Only development databases can contain one (no release shipped schema 1 to users).
// The goals CHECK still lists 'archived'; rebuilding the table only to drop that value would need
// every goal trigger recreated, so the legacy value stays allowed but unused. The closed-goal ledger
// triggers keep protecting completed goals.
// Never edit this text after it ships; add a new migration instead.
export const migration0002: Migration = {
  version: 2,
  name: 'goal_deletion',
  sql: `
DROP TRIGGER goals_no_delete;

UPDATE goals
   SET status = 'paused',
       updated_at_utc = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
       revision = revision + 1
 WHERE status = 'archived';
`,
};
