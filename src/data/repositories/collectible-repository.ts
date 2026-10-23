import type { SqlExecutor } from '../db/sql';

import { rowReader } from './row-codec';

// Souvenir storage boundary (docs/DATA_MODEL.md "collectibles"). Phase 11 adds the `collectibles`
// table with its own migration and the award logic. The global currency lock already needs to know
// whether any souvenir exists, so this boundary answers that question now: with no table there is
// no souvenir. Once the table exists (Phase 11, or a test fixture that creates it) every row counts,
// including souvenirs of completed and archived goals.

export const COLLECTIBLES_TABLE = 'collectibles';

export async function countCollectibles(executor: SqlExecutor): Promise<number> {
  const table = await executor.get("SELECT 1 AS present FROM sqlite_schema WHERE type = 'table' AND name = ?", [
    COLLECTIBLES_TABLE,
  ]);
  if (!table) {
    return 0;
  }
  const row = await executor.get(`SELECT count(*) AS count FROM ${COLLECTIBLES_TABLE}`);
  return rowReader(COLLECTIBLES_TABLE, row ?? {}).integer('count');
}
