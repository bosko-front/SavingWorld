import type { GoalStatus } from '@/data/repositories/goal-repository';

// Explicit goal lifecycle (v1.2 section 3, docs/DATA_MODEL.md "goals"). Pure rules; the commands
// apply them inside the serialized write transaction together with the Free slot and balance.
//
//   active ──Pause──▶ paused ──Resume──▶ active
//   active/paused ──Archive──▶ archived            (any progress; history kept)
//   active/paused ──Finish (B ≥ T)──▶ completed     (UI arrives with souvenirs in Phase 11)
//   completed/archived ──Reopen (open slot)──▶ active  (never finishes again by itself)
//
// active and paused are open: they take the Free slot and accept edits and entries; paused only
// stops reminder eligibility. completed and archived are closed and read-only until Reopen. There
// is no transition that deletes a goal.

export type LifecycleAction = 'pause' | 'resume' | 'archive' | 'finish' | 'reopen';

export const LIFECYCLE_ACTIONS: readonly LifecycleAction[] = ['pause', 'resume', 'archive', 'finish', 'reopen'];

const TRANSITIONS: Record<LifecycleAction, { from: readonly GoalStatus[]; to: GoalStatus }> = {
  pause: { from: ['active'], to: 'paused' },
  resume: { from: ['paused'], to: 'active' },
  archive: { from: ['active', 'paused'], to: 'archived' },
  finish: { from: ['active', 'paused'], to: 'completed' },
  reopen: { from: ['completed', 'archived'], to: 'active' },
};

// The status an action leads to from `from`, or null when the action does not apply there.
export function lifecycleTarget(action: LifecycleAction, from: GoalStatus): GoalStatus | null {
  const transition = TRANSITIONS[action];
  return transition.from.includes(from) ? transition.to : null;
}

// Reopen is the only transition that takes a slot: Pause/Resume keep the goal open, and Archive or
// Finish release one.
export function needsOpenSlot(action: LifecycleAction): boolean {
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
