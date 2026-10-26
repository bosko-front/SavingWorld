import type { Migration } from '../migration-runner';

// Schema 4 (Phase 12): fixed challenge attempts (v1.2 section 7 "Tri gotova izazova", docs/DATA_MODEL.md
// "challenge_attempts"). An attempt is one run of First step, Next milestone or Weekly step on one
// goal. It stores only its frozen contract and its outcome; progress is always recalculated from
// the goal's saved ledger entries, so there is no link table and no copy of any entry.
// - The contract never changes once started: rule, frozen target, the milestone a Next milestone
//   aims at, startedAt, the local start date, and for Weekly step the saved Monday-Sunday week, its
//   time zone and the instant that week ends there (`period_end_at_utc`, Monday 00:00 local).
// - state 'active' is the one unfinished attempt; 'historical' is Completed, Not completed or
//   Skipped. A historical attempt never becomes active again and keeps the time it ended; a
//   correction may move its result between completed and not_completed, never to or from skipped.
// - Partial unique indexes: one active attempt per goal, First step once per goal, Weekly step once
//   per goal and saved calendar week. The commands check the same rules first and report why.
// - The foreign key is RESTRICT: deleteGoal (D74) deletes a goal's attempts before the goal.
// Never edit this text after it ships; add a new migration instead.
const DATE = "'[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'";
const UTC = "'[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'";

export const migration0004: Migration = {
  version: 4,
  name: 'challenge_attempts',
  sql: `
CREATE TABLE challenge_attempts (
  id TEXT PRIMARY KEY NOT NULL,
  goal_id TEXT NOT NULL REFERENCES goals (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  rule_id TEXT NOT NULL CHECK (rule_id IN ('first_step', 'next_milestone', 'weekly_step')),
  target_minor INTEGER CHECK (target_minor IS NULL OR (target_minor > 0 AND target_minor <= 1000000000000)),
  milestone_stage INTEGER CHECK (milestone_stage IS NULL OR milestone_stage BETWEEN 1 AND 10),
  started_at_utc TEXT NOT NULL CHECK (started_at_utc GLOB ${UTC}),
  start_date TEXT NOT NULL CHECK (start_date GLOB ${DATE}),
  period_end_date TEXT CHECK (period_end_date IS NULL OR period_end_date GLOB ${DATE}),
  period_timezone TEXT NOT NULL CHECK (length(period_timezone) BETWEEN 1 AND 64),
  period_end_at_utc TEXT CHECK (period_end_at_utc IS NULL OR period_end_at_utc GLOB ${UTC}),
  week_start_date TEXT CHECK (week_start_date IS NULL OR week_start_date GLOB ${DATE}),
  state TEXT NOT NULL CHECK (state IN ('active', 'historical')),
  result TEXT CHECK (result IS NULL OR result IN ('completed', 'not_completed', 'skipped')),
  historical_at_utc TEXT CHECK (historical_at_utc IS NULL OR historical_at_utc GLOB ${UTC}),
  CHECK ((state = 'active') = (result IS NULL)),
  CHECK ((state = 'active') = (historical_at_utc IS NULL)),
  CHECK (
    CASE rule_id
      WHEN 'first_step' THEN target_minor IS NULL AND milestone_stage IS NULL AND period_end_date IS NULL
        AND period_end_at_utc IS NULL AND week_start_date IS NULL
      WHEN 'next_milestone' THEN target_minor IS NOT NULL AND milestone_stage IS NOT NULL AND period_end_date IS NULL
        AND period_end_at_utc IS NULL AND week_start_date IS NULL
      ELSE target_minor IS NOT NULL AND milestone_stage IS NULL AND period_end_date IS NOT NULL
        AND period_end_at_utc IS NOT NULL AND week_start_date IS NOT NULL
        AND week_start_date <= start_date AND start_date <= period_end_date
    END
  )
) STRICT;

CREATE UNIQUE INDEX challenge_attempts_one_active ON challenge_attempts (goal_id) WHERE state = 'active';
CREATE UNIQUE INDEX challenge_attempts_first_step_once ON challenge_attempts (goal_id) WHERE rule_id = 'first_step';
CREATE UNIQUE INDEX challenge_attempts_weekly_once ON challenge_attempts (goal_id, week_start_date)
  WHERE rule_id = 'weekly_step';
CREATE INDEX challenge_attempts_goal_started ON challenge_attempts (goal_id, started_at_utc, id);

CREATE TRIGGER challenge_attempts_contract_immutable
BEFORE UPDATE OF id, goal_id, rule_id, target_minor, milestone_stage, started_at_utc, start_date, period_end_date,
  period_timezone, period_end_at_utc, week_start_date ON challenge_attempts
WHEN NEW.id IS NOT OLD.id OR NEW.goal_id IS NOT OLD.goal_id OR NEW.rule_id IS NOT OLD.rule_id
  OR NEW.target_minor IS NOT OLD.target_minor OR NEW.milestone_stage IS NOT OLD.milestone_stage
  OR NEW.started_at_utc IS NOT OLD.started_at_utc OR NEW.start_date IS NOT OLD.start_date
  OR NEW.period_end_date IS NOT OLD.period_end_date OR NEW.period_timezone IS NOT OLD.period_timezone
  OR NEW.period_end_at_utc IS NOT OLD.period_end_at_utc OR NEW.week_start_date IS NOT OLD.week_start_date
BEGIN
  SELECT RAISE(ABORT, 'a started challenge keeps its rule, target and period');
END;

CREATE TRIGGER challenge_attempts_history_kept BEFORE UPDATE ON challenge_attempts
WHEN OLD.state = 'historical' AND (
  NEW.state IS NOT 'historical'
  OR NEW.historical_at_utc IS NOT OLD.historical_at_utc
  OR (OLD.result = 'skipped') <> (NEW.result = 'skipped')
)
BEGIN
  SELECT RAISE(ABORT, 'a historical challenge attempt stays historical');
END;

CREATE TRIGGER challenge_attempts_open_goal_insert BEFORE INSERT ON challenge_attempts
WHEN (SELECT status FROM goals WHERE id = NEW.goal_id) IN ('completed', 'archived')
BEGIN
  SELECT RAISE(ABORT, 'goal is closed');
END;
`,
};
