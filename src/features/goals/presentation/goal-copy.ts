import type { AmountParseError, CurrencyMetadata, NumberSeparators } from '@/core/money';
import { amountMessage as sharedAmountMessage } from '@/shared/i18n/amount-messages';

import type { GoalRecord } from '@/data/repositories/goal-repository';

import type { CreateGoalError, DeleteGoalError, EditGoalError, LifecycleError } from '../application/goal-commands';
import type { LifecycleAction } from '../domain/goal-lifecycle';

// English copy for goal forms and lifecycle actions. Every command error code has a message that
// says what happened and what to do; errors are shown inline next to the field or at the top of the
// form, never in a toast, and the person's input stays as typed.

export type GoalFormField = 'title' | 'target' | 'deadline' | 'theme';

export type FormMessage = { field: GoalFormField | null; message: string };

export const SAVE_FAILED = 'Couldn’t save. Nothing was changed. Try again.';

// Shown when a second goal is attempted on Free (D73-D74): from Home's goal menu while the goal is
// open, or from Home's empty state while Free's one goal is finished (Phase 11). Phase 16 turns this
// into the paywall entry with "Explore Pro".
export const ANOTHER_WORLD = {
  title: 'Build another world',
  message:
    'You’ve already created your free savings goal. Unlock Pro to create more goals and grow your collection of worlds. One-time purchase, no subscription. To start over instead, delete this goal from its menu.',
  finishedMessage:
    'You’ve already created your free savings goal. Unlock Pro to create more goals and grow your collection of worlds. One-time purchase, no subscription. To start over instead, delete your finished goal in Collection.',
} as const;

const FREE_LIMIT =
  'Free includes one goal. Delete your current goal to start over, or unlock Pro for more goals.';

export function goalCommandMessage(error: CreateGoalError | EditGoalError): FormMessage {
  switch (error.code) {
    case 'title_empty':
      return { field: 'title', message: 'Enter a name for this goal.' };
    case 'title_too_long':
      return { field: 'title', message: 'Use 100 characters or fewer.' };
    case 'title_invalid':
      return { field: 'title', message: 'Remove line breaks or unsupported characters from the name.' };
    case 'invalid_target':
      return { field: 'target', message: 'Enter a target greater than zero.' };
    case 'invalid_deadline':
      return { field: 'deadline', message: 'Choose a valid date.' };
    case 'past_deadline':
      return { field: 'deadline', message: 'Choose today or a later date.' };
    case 'invalid_theme':
    case 'theme_unavailable':
      return { field: 'theme', message: 'This world isn’t available for this goal. Island is.' };
    case 'goal_limit':
      return { field: null, message: FREE_LIMIT };
    case 'currency_missing':
      return { field: null, message: 'Choose a currency in Settings before creating a goal.' };
    case 'currency_invalid':
      return { field: null, message: 'The saved currency can’t be read, so nothing was saved. Your goals are unchanged.' };
    case 'goal_closed':
      return { field: null, message: 'This goal is closed. Reopen it from Collection to make changes.' };
    case 'stale_goal':
      return { field: null, message: 'This goal changed after you opened it. Close this form and open it again.' };
    case 'goal_not_found':
    case 'invalid_reference':
      return { field: null, message: 'This goal couldn’t be found. Close this form and try again.' };
    case 'operation_conflict':
    case 'invalid_operation_id':
      return { field: null, message: 'This form can’t be saved again. Close it and start over.' };
    case 'storage_failure':
      return { field: null, message: SAVE_FAILED };
  }
}

// Messages for a target amount the parser rejected. They name the global currency's own rules.
export function amountMessage(error: AmountParseError, currency: CurrencyMetadata, separators: NumberSeparators): string {
  return sharedAmountMessage(error, currency, separators, 'target');
}

export const LIFECYCLE_COPY: Record<LifecycleAction, { label: string; done: string; failed: string }> = {
  pause: { label: 'Pause goal', done: 'Goal paused', failed: 'Goal not paused' },
  resume: { label: 'Resume goal', done: 'Goal resumed', failed: 'Goal not resumed' },
  finish: { label: 'Finish goal', done: 'Goal finished', failed: 'Goal not finished' },
  reopen: { label: 'Reopen goal', done: 'Goal reopened', failed: 'Goal not reopened' },
};

export function lifecycleMessage(action: LifecycleAction, error: LifecycleError): string {
  switch (error.code) {
    case 'goal_limit':
      return FREE_LIMIT;
    case 'not_funded':
      return 'Finish becomes available when this goal reaches its target.';
    case 'invalid_transition':
    case 'stale_goal':
      return 'This goal changed in the meantime. Its latest state is shown; try again if you still want to.';
    case 'goal_not_found':
    case 'invalid_reference':
      return 'This goal couldn’t be found.';
    case 'operation_conflict':
    case 'invalid_operation_id':
    case 'storage_failure':
      return SAVE_FAILED;
  }
}

export const DELETE_COPY = { label: 'Delete goal', done: 'Goal deleted', failed: 'Goal not deleted' } as const;

// The native confirmation before a goal is deleted (owner decision D74). A completed goal also
// loses its finished world, so it says so in the owner's words.
export function deleteConfirmation(goal: Pick<GoalRecord, 'title' | 'status'>): { title: string; message: string } {
  return goal.status === 'completed'
    ? {
        title: 'Delete completed goal?',
        message:
          'This will permanently delete your savings history and the completed world from your Collection. This action cannot be undone.',
      }
    : {
        title: `Delete “${goal.title}”?`,
        message: 'This permanently deletes the goal and its savings history. This action cannot be undone.',
      };
}

export function deleteMessage(error: DeleteGoalError): string {
  switch (error.code) {
    case 'stale_goal':
      return 'This goal changed in the meantime. Its latest state is shown; try again if you still want to delete it.';
    case 'goal_not_found':
    case 'invalid_reference':
      return 'This goal couldn’t be found. It may already be deleted.';
    case 'operation_conflict':
    case 'invalid_operation_id':
    case 'storage_failure':
      return 'Couldn’t delete. Nothing was changed. Try again.';
  }
}
