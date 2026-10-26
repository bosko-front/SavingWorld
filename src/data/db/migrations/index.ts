import type { Migration } from '../migration-runner';

import { migration0001 } from './0001-initial-ledger';
import { migration0002 } from './0002-goal-deletion';
import { migration0003 } from './0003-collectibles';
import { migration0004 } from './0004-challenge-attempts';
import { migration0005 } from './0005-entitlements';

// Ordered, immutable list of shipped schema versions. Append only; a new version needs a new app
// version/runtime and native build under docs/EAS_AND_OTA.md (never an OTA-only migration).
export const MIGRATIONS: readonly Migration[] = [migration0001, migration0002, migration0003, migration0004, migration0005];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;
