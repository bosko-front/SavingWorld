import type { AmountParseError, CurrencyMetadata, NumberSeparators } from '@/core/money';
import { amountMessage as sharedAmountMessage } from '@/shared/i18n/amount-messages';

import type { CreateGoalError, EditGoalError, LifecycleError } from '../application/goal-commands';
import type { LifecycleAction } from '../domain/goal-lifecycle';

// English copy for goal forms and lifecycle actions. Every command error code has a message that
// says what happened and what to do; errors are shown inline next to the field or at the top of the
// form, never in a toast, and the person's input stays as typed.

export type GoalFormField = 'title' | 'target' | 'deadline' | 'theme';

export type FormMessage = { field: GoalFormField | null; message: string };

export const SAVE_FAILED = 'Couldn’t save. Nothing was changed. Try again.';

const FREE_LIMIT =
  'Free includes one open goal (active or paused). Archive your open goal first, then try again.';

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
    case 'open_goal_limit':
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
  archive: { label: 'Archive goal', done: 'Goal archived', failed: 'Goal not archived' },
  finish: { label: 'Finish goal', done: 'Goal finished', failed: 'Goal not finished' },
  reopen: { label: 'Reopen goal', done: 'Goal reopened', failed: 'Goal not reopened' },
};

export function lifecycleMessage(action: LifecycleAction, error: LifecycleError): string {
  switch (error.code) {
    case 'open_goal_limit':
      return action === 'reopen'
        ? 'Free includes one open goal (active or paused). Archive your open goal first, then reopen this one.'
        : FREE_LIMIT;
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
