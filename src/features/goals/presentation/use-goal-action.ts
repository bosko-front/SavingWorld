import { useState } from 'react';

import { goalCommandDeps, refreshAppData } from '@/bootstrap/app-data';
import { randomUuid } from '@/data/ids';
import type { GoalRecord } from '@/data/repositories/goal-repository';
import { showToast } from '@/shared/ui/toast';

import { changeGoalStatus } from '../application/goal-commands';
import { selectGoal } from '../application/goal-selection';
import type { LifecycleAction } from '../domain/goal-lifecycle';

import { LIFECYCLE_COPY, lifecycleMessage } from './goal-copy';

// Runs one lifecycle command for a button: one write at a time, the screen's data refreshed from
// SQLite after the commit, a confirmation toast only on success, and an inline message otherwise.
// The goal revision the person saw is the expected revision, so a double tap or an outdated screen
// is refused instead of applied twice.
export function useGoalAction() {
  const [pending, setPending] = useState<{ goalId: string; action: LifecycleAction } | null>(null);
  const [failure, setFailure] = useState<{ goalId: string; message: string } | null>(null);

  const run = async (action: LifecycleAction, goal: GoalRecord): Promise<boolean> => {
    if (pending) {
      return false;
    }
    setPending({ goalId: goal.id, action });
    setFailure(null);
    const deps = goalCommandDeps();
    const result = await changeGoalStatus(deps, action, {
      operationId: randomUuid(),
      goalId: goal.id,
      expectedRevision: goal.revision,
    });
    if (result.ok && action === 'reopen') {
      // Home shows the reopened goal; the reopen itself is already saved.
      await selectGoal(deps, goal.id);
    }
    await refreshAppData();
    setPending(null);
    if (!result.ok) {
      setFailure({ goalId: goal.id, message: lifecycleMessage(action, result.error) });
      return false;
    }
    showToast({ tone: 'success', title: LIFECYCLE_COPY[action].done });
    return true;
  };

  return { pending, failure, run };
}
