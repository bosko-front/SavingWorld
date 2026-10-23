import type { GoalStatus } from '@/data/repositories/goal-repository';

// Explicit goal lifecycle (v1.2 section 3 as changed by owner decision D74, docs/DATA_MODEL.md
// "goals"). Pure rules; the commands apply them inside the serialized write transaction together
// with the goal limit and balance.
//
//   active ──Pause──▶ paused ──Resume──▶ active
//   active/paused ──Finish (B ≥ T)──▶ completed     (UI arrives with souvenirs in Phase 11)
//   completed ──Reopen (within the goal limit)──▶ active  (never finishes again by itself)
//
// active and paused are open: they accept edits and entries; paused only stops reminder
// eligibility. completed is closed and read-only until Reopen. Archive was removed (D74): a goal
// the person gives up on is deleted with its history by `deleteGoal`, which is not a status change.

export type LifecycleAction = 'pause' | 'resume' | 'finish' | 'reopen';

export const LIFECYCLE_ACTIONS: readonly LifecycleAction[] = ['pause', 'resume', 'finish', 'reopen'];

const TRANSITIONS: Record<LifecycleAction, { from: readonly GoalStatus[]; to: GoalStatus }> = {
  pause: { from: ['active'], to: 'paused' },
  resume: { from: ['paused'], to: 'active' },
  finish: { from: ['active', 'paused'], to: 'completed' },
  reopen: { from: ['completed'], to: 'active' },
};

// The status an action leads to from `from`, or null when the action does not apply there.
export function lifecycleTarget(action: LifecycleAction, from: GoalStatus): GoalStatus | null {
  const transition = TRANSITIONS[action];
  return transition.from.includes(from) ? transition.to : null;
}

// Reopen is the only transition checked against the goal limit (it adds no goal, so it passes while
// the existing goals fit the limit).
export function needsGoalLimit(action: LifecycleAction): boolean {
  return action === 'reopen';
}

// Finish closes only a funded goal; reaching 100% alone never changes the status.
export function needsFunding(action: LifecycleAction): boolean {
  return action === 'finish';
}

// Actions offered for a goal in a given status, in display order. Finish is offered only when the
// goal is funded; Phase 11 shows it.
export function availableActions(status: GoalStatus, funded: boolean): LifecycleAction[] {
  return LIFECYCLE_ACTIONS.filter(
    (action) => lifecycleTarget(action, status) !== null && (!needsFunding(action) || funded),
  );
}
