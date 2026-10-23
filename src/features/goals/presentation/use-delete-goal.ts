import { useRef, useState } from 'react';
import { Alert } from 'react-native';

import { goalCommandDeps, refreshAppData } from '@/bootstrap/app-data';
import { randomUuid } from '@/data/ids';
import type { GoalRecord } from '@/data/repositories/goal-repository';
import { haptics } from '@/shared/ui/haptics';
import { showToast } from '@/shared/ui/toast';

import { deleteGoal } from '../application/goal-commands';

import { DELETE_COPY, deleteConfirmation, deleteMessage } from './goal-copy';

// Delete Goal for a menu row or button (owner decision D74): a native destructive confirmation that
// names what is lost, then one deletion. One operation ID per confirmed attempt, so a retry after a
// lost acknowledgment replays instead of failing; a second confirmation while one runs is ignored.
// Success: the data is re-read, one "Goal deleted" toast and one success haptic. Failure: an error
// toast (a one-tap action has no form, D66) and nothing else.
export function useDeleteGoal() {
  const [deleting, setDeleting] = useState<string | null>(null);
  const running = useRef(false);

  const remove = async (goal: GoalRecord) => {
    if (running.current) {
      return;
    }
    running.current = true;
    setDeleting(goal.id);
    const result = await deleteGoal(goalCommandDeps(), {
      operationId: randomUuid(),
      goalId: goal.id,
      expectedRevision: goal.revision,
    });
    await refreshAppData();
    running.current = false;
    setDeleting(null);
    if (!result.ok) {
      showToast({ tone: 'error', title: DELETE_COPY.failed, message: deleteMessage(result.error) });
      return;
    }
    showToast({ tone: 'success', title: DELETE_COPY.done });
    haptics.success();
  };

  const confirmDelete = (goal: GoalRecord) => {
    const { title, message } = deleteConfirmation(goal);
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void remove(goal) },
    ]);
  };

  return { deleting, confirmDelete };
}
