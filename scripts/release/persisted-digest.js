// Redacted digest of the app's persisted state (Phase 20, docs/EAS_AND_OTA.md "Preview verification").
// Used by scripts/ota-drill.mjs on a copy of a simulator's app database and by the release fixture
// test on host SQLite, so an update, rollback or relaunch can be shown to leave the ledger, receipts,
// souvenirs, challenge attempts and stored Pro rights exactly as they were.
//
// Redacted: no goal titles, entry notes, receipt payloads or native transaction IDs. Amounts are kept
// because the drill runs on synthetic fixtures only; never run it on a real person's data.
// CommonJS without dependencies: `db` is anything with prepare(sql).all() (node:sqlite DatabaseSync).
const crypto = require('node:crypto');

const TABLES = [
  'settings',
  'goals',
  'ledger_entries',
  'operation_receipts',
  'collectibles',
  'challenge_attempts',
  'entitlement_cache',
  'purchase_events',
];

function rows(db, sql) {
  return db.prepare(sql).all().map((row) => ({ ...row }));
}

function tableNames(db) {
  return new Set(rows(db, "SELECT name FROM sqlite_master WHERE type = 'table'").map((row) => row.name));
}

// Plain data in a stable order, then sha256 over its JSON: equal digests mean equal persisted state.
function persistedDigest(db) {
  const present = tableNames(db);
  const has = (name) => present.has(name);
  const summary = {
    migrations: has('migrations') ? rows(db, 'SELECT version, name, checksum FROM migrations ORDER BY version') : [],
    settings: has('settings') ? rows(db, 'SELECT key FROM settings ORDER BY key').map((row) => row.key) : [],
    currency: has('settings')
      ? (rows(db, "SELECT json_extract(value_json, '$.code') AS code FROM settings WHERE key = 'currency'")[0]?.code ?? null)
      : null,
    goals: has('goals')
      ? rows(
          db,
          `SELECT g.id, g.status, g.theme_id AS themeId, g.target_minor AS targetMinor, g.deadline_date AS deadlineDate,
                  g.revision, COUNT(e.id) AS entries, COALESCE(SUM(e.signed_amount_minor), 0) AS balanceMinor
             FROM goals g LEFT JOIN ledger_entries e ON e.goal_id = g.id
            GROUP BY g.id ORDER BY g.created_at_utc, g.id`,
        )
      : [],
    entries: has('ledger_entries')
      ? rows(
          db,
          `SELECT id, goal_id AS goalId, signed_amount_minor AS signedMinor, entry_date AS entryDate,
                  note IS NOT NULL AS hasNote, revision
             FROM ledger_entries ORDER BY goal_id, entry_date, created_at_utc, id`,
        )
      : [],
    receipts: has('operation_receipts')
      ? rows(db, 'SELECT command_kind AS kind, COUNT(*) AS count FROM operation_receipts GROUP BY command_kind ORDER BY command_kind')
      : [],
    collectibles: has('collectibles')
      ? rows(
          db,
          `SELECT goal_id AS goalId, theme_id AS themeId, theme_version AS themeVersion,
                  target_minor_at_award AS targetMinorAtAward, earned_at_utc AS earnedAtUtc
             FROM collectibles ORDER BY goal_id`,
        )
      : [],
    attempts: has('challenge_attempts')
      ? rows(
          db,
          `SELECT id, goal_id AS goalId, rule_id AS ruleId, target_minor AS targetMinor, state, result
             FROM challenge_attempts ORDER BY started_at_utc, id`,
        )
      : [],
    entitlements: has('entitlement_cache')
      ? rows(
          db,
          `SELECT product_id AS productId, status, verified_at_utc AS verifiedAtUtc,
                  native_transaction_id IS NOT NULL AS hasTransaction, revision
             FROM entitlement_cache ORDER BY product_id`,
        )
      : [],
    purchaseEvents: has('purchase_events')
      ? rows(
          db,
          `SELECT product_id AS productId, COUNT(*) AS count, SUM(finished_at_utc IS NOT NULL) AS finished,
                  SUM(revoked_at_utc IS NOT NULL) AS revoked
             FROM purchase_events GROUP BY product_id ORDER BY product_id`,
        )
      : [],
    missingTables: TABLES.filter((name) => !has(name)),
  };
  const hash = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
  // The savings record alone: launches may legitimately rewrite the stored rights (each StoreKit check)
  // and settings records (reminder reconciliation), never these.
  const ledger = {
    migrations: summary.migrations,
    currency: summary.currency,
    goals: summary.goals,
    entries: summary.entries,
    receipts: summary.receipts,
    collectibles: summary.collectibles,
    attempts: summary.attempts,
  };
  return { sha256: hash(summary), ledgerSha256: hash(ledger), summary };
}

// A short human line for evidence tables: the ledger hash that must never change across an update,
// rollback or relaunch, and the stored rights.
function describeDigest({ ledgerSha256, summary }) {
  const balances = summary.goals.map((goal) => `${goal.themeId}:${goal.status}:${goal.balanceMinor}/${goal.targetMinor}`).join(', ');
  const attempts = summary.attempts.map((attempt) => `${attempt.ruleId}=${attempt.result ?? attempt.state}`).join(', ');
  const rights = summary.entitlements.map((row) => row.status).join(', ') || 'none';
  const receipts = summary.receipts.reduce((total, row) => total + row.count, 0);
  return [
    `ledger ${ledgerSha256.slice(0, 12)}`,
    `schema ${summary.migrations.at(-1)?.version ?? 0}`,
    `goals [${balances}]`,
    `entries ${summary.entries.length}`,
    `receipts ${receipts}`,
    `souvenirs ${summary.collectibles.length}`,
    `attempts [${attempts}]`,
    `rights ${rights}`,
  ].join(' · ');
}

module.exports = { persistedDigest, describeDigest };
