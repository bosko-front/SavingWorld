import { isPositiveMinorAmount } from '@/core/money';
import { THEME_IDS, type ThemeId } from '@/core/progression';

import type { SqlExecutor, SqlRow } from '../db/sql';

import { CorruptRowError, rowReader } from './row-codec';

// Souvenir storage (docs/DATA_MODEL.md "collectibles", schema 3). One permanent souvenir per goal:
// the goal id is the primary key and the schema refuses every update. A souvenir is historical
// metadata, never money: nothing adds `targetMinorAtAward` to a balance or total. It locks the
// global currency while it exists, and only the D74 goal deletion removes it, together with its
// goal.

export const COLLECTIBLES_TABLE = 'collectibles';

export type CollectibleRecord = {
  goalId: string;
  // The art the goal had when it first reached its target; the Collection draws that version.
  themeId: ThemeId;
  themeVersion: number;
  // The goal's target at that moment (a caption: "target then").
  targetMinorAtAward: number;
  earnedAtUtc: string;
};

const COLUMNS = 'goal_id, theme_id, theme_version, target_minor_at_award, earned_at_utc';

function decodeCollectible(row: SqlRow): CollectibleRecord {
  const r = rowReader(COLLECTIBLES_TABLE, row);
  const themeVersion = r.integer('theme_version');
  if (themeVersion < 1) {
    throw new CorruptRowError(COLLECTIBLES_TABLE, 'theme_version');
  }
  const targetMinorAtAward = r.minor('target_minor_at_award');
  if (!isPositiveMinorAmount(targetMinorAtAward)) {
    throw new CorruptRowError(COLLECTIBLES_TABLE, 'target_minor_at_award');
  }
  return {
    goalId: r.text('goal_id'),
    themeId: r.oneOf('theme_id', THEME_IDS),
    themeVersion,
    targetMinorAtAward,
    earnedAtUtc: r.text('earned_at_utc'),
  };
}

export async function getCollectible(executor: SqlExecutor, goalId: string): Promise<CollectibleRecord | null> {
  const row = await executor.get(`SELECT ${COLUMNS} FROM ${COLLECTIBLES_TABLE} WHERE goal_id = ?`, [goalId]);
  return row ? decodeCollectible(row) : null;
}

// Every souvenir, newest first (earned time, then goal id).
export async function listCollectibles(executor: SqlExecutor): Promise<CollectibleRecord[]> {
  const rows = await executor.all(`SELECT ${COLUMNS} FROM ${COLLECTIBLES_TABLE} ORDER BY earned_at_utc DESC, goal_id`);
  return rows.map(decodeCollectible);
}

// Inside the transaction of the saved change that first made B >= T. A second insert for the same
// goal fails on the primary key, so a bug can never store two.
export async function insertCollectible(tx: SqlExecutor, record: CollectibleRecord): Promise<void> {
  await tx.run(`INSERT INTO ${COLLECTIBLES_TABLE} (${COLUMNS}) VALUES (?, ?, ?, ?, ?)`, [
    record.goalId,
    record.themeId,
    record.themeVersion,
    record.targetMinorAtAward,
    record.earnedAtUtc,
  ]);
}

// Only inside the goal deletion transaction (owner decision D74), after the goal's entries and
// before the goal row.
export async function deleteCollectiblesForGoal(tx: SqlExecutor, goalId: string): Promise<void> {
  await tx.run(`DELETE FROM ${COLLECTIBLES_TABLE} WHERE goal_id = ?`, [goalId]);
}

export async function countCollectibles(executor: SqlExecutor): Promise<number> {
  const row = await executor.get(`SELECT count(*) AS count FROM ${COLLECTIBLES_TABLE}`);
  return rowReader(COLLECTIBLES_TABLE, row ?? {}).integer('count');
}
