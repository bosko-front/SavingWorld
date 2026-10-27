import type { AmountParseError, CurrencyMetadata, NumberSeparators } from '@/core/money';
import { amountMessage as sharedAmountMessage } from '@/shared/i18n/amount-messages';

import type { GoalRecord } from '@/data/repositories/goal-repository';
import { entryCountText } from '@/features/ledger/presentation/ledger-copy';

import type { ChangeThemeError, CreateGoalError, DeleteGoalError, EditGoalError, LifecycleError } from '../application/goal-commands';
import type { LifecycleAction } from '../domain/goal-lifecycle';

// English copy for goal forms and lifecycle actions. Every command error code has a message that
// says what happened and what to do; errors are shown inline next to the field or at the top of the
// form, never in a toast, and the person's input stays as typed.

export type GoalFormField = 'title' | 'target' | 'deadline' | 'theme';

export type FormMessage = { field: GoalFormField | null; message: string };

export const SAVE_FAILED = 'Couldn’t save. Nothing was changed. Try again.';

// A second goal on Free opens the "Build another world" paywall entry (D74, Phase 16; the copy lives
// in billing-copy.ts) instead of a form that would be refused; this message remains for a create
// refused by the command itself.
const FREE_LIMIT =
  'Free includes one goal. Delete your current goal to start over, or unlock Pro for more goals.';

// After a lost Pro entitlement (D74): only the goal the person keeps using accepts changes.
export const READ_ONLY_MESSAGE = 'Without Pro this goal is read-only, so nothing was changed. Your savings here are kept as they are.';
const THEME_LOCKED_MESSAGE = 'This Garden is kept as it is without Pro, so nothing was changed.';
const REOPEN_LIMIT = 'Without Pro, only the goal you keep using can be reopened. Your goals are unchanged.';

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
      return { field: 'theme', message: 'The Garden is part of Pro. Choose the Island, or unlock Pro for the Garden.' };
    case 'goal_limit':
      return { field: null, message: FREE_LIMIT };
    case 'currency_missing':
      return { field: null, message: 'Choose a currency in Settings before creating a goal.' };
    case 'currency_invalid':
      return { field: null, message: 'The saved currency can’t be read, so nothing was saved. Your goals are unchanged.' };
    case 'goal_closed':
      return { field: null, message: 'This goal is closed. Reopen it from Collection to make changes.' };
    case 'goal_read_only':
      return { field: null, message: READ_ONLY_MESSAGE };
    case 'theme_locked':
      return { field: null, message: THEME_LOCKED_MESSAGE };
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
      return action === 'reopen' ? REOPEN_LIMIT : FREE_LIMIT;
    case 'goal_read_only':
      return READ_ONLY_MESSAGE;
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

// Why Change Theme refused, in the picker (inline, the world shown is unchanged).
export function themeChangeMessage(error: ChangeThemeError): string {
  switch (error.code) {
    case 'theme_unavailable':
    case 'invalid_theme':
      return 'The Garden is part of Pro. Your goal keeps its world.';
    case 'theme_unchanged':
      return 'Your goal already grows this world.';
    case 'goal_read_only':
      return READ_ONLY_MESSAGE;
    case 'goal_closed':
      return 'This goal is closed. Reopen it from Collection to change its world.';
    case 'stale_goal':
      return 'This goal changed in the meantime. Its latest world is shown; try again if you still want to.';
    case 'goal_not_found':
    case 'invalid_reference':
      return 'This goal couldn’t be found. Close this screen and try again.';
    case 'operation_conflict':
    case 'invalid_operation_id':
    case 'storage_failure':
      return 'Couldn’t change the world. Nothing was changed. Try again.';
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

const EDIT_GOAL = 'Edit goal';
const NEW_GOAL = 'New goal';
const GOAL_NOT_FOUND = 'Goal not found';
const TARGET_REACHED = 'Target reached';

// A goal's status in a list (Keep goal) and on Home's badge.
export const GOAL_STATUS_LABEL: Record<GoalRecord['status'], string> = { active: 'Active', paused: 'Paused', completed: 'Finished' };

// Home: the load failure, the empty state, the goal summary, the next milestone and the goal switcher.
export const HOME_COPY = {
  loadFailedTitle: 'Couldn’t load your goals',
  finishedTitle: 'Your world is finished',
  newGoalTitle: 'Start a new goal',
  firstGoalTitle: 'Start your first goal',
  finishedMessage: (world: string) => `You reached your goal. Your finished ${world} is kept in Collection.`,
  firstGoalMessage: 'Name something you are saving for and set a target. Each amount you record grows a small world.',
  finishedInCollection: (count: number) => `Your finished ${count === 1 ? 'goal is' : 'goals are'} in Collection.`,
  finishedAtLimit: 'Unlock Pro to build another world, or delete your finished goal in Collection to start over.',
  targetReached: TARGET_REACHED,
  savedOfTargetLabel: (saved: string, target: string) => `Saved ${saved} of ${target}`,
  savedOfTarget: (target: string) => `saved of ${target}`,
  overTarget: (over: string) => `${over} over target`,
  toGo: (remaining: string) => `${remaining} to go`,
  nextNamed: (name: string) => `Next: ${name}`,
  nextPercent: (percent: number) => `Next milestone: ${percent}%`,
  toNext: (amount: string, percent: number) => `${amount} more to reach ${percent}%`,
  openGoals: 'Open goals',
  shown: 'Shown',
  shownLabel: (title: string) => `${title}, shown on Home`,
  showLabel: (title: string) => `Show ${title}`,
  showReadOnlyLabel: (title: string, badge: string) => `Show ${title}, ${badge}`,
} as const;

// Home's ⋯ goal options menu.
export const GOAL_MENU_COPY = {
  label: 'Goal options',
  history: (entryCount: number) => (entryCount === 0 ? 'History' : `History (${entryCountText(entryCount)})`),
  statistics: 'Savings insights',
  edit: EDIT_GOAL,
  changeWorld: 'Change world',
  newGoal: NEW_GOAL,
  delete: `${DELETE_COPY.label}…`,
} as const;

// The optional deadline row of the goal form.
export const DEADLINE_COPY = {
  add: 'Add a deadline',
  addDetail: 'Optional. Gives a weekly and monthly estimate.',
  label: 'Deadline',
  passed: (date: string) => `Passed on ${date}. Keep it, pick a new date or remove it.`,
  saveBy: (date: string) => `Save by ${date}`,
  errorLabel: (message: string) => `Error: ${message}`,
  remove: 'Remove deadline',
} as const;

// Home's savings plan cards (D84).
export const SAVINGS_PLAN_COPY = {
  header: 'Savings plan',
  deadline: 'Deadline',
  needed: 'Savings needed',
  completeLabel: 'Savings needed: none, target reached',
  targetReached: TARGET_REACHED,
  nothingMore: 'Nothing more to save',
  neededLabel: (amount: string) => `Savings needed ${amount}`,
} as const;

// The goal form (create and edit) and the states in which it can't be used.
export const GOAL_FORM_COPY = {
  editTitle: EDIT_GOAL,
  newTitle: NEW_GOAL,
  noCurrencyTitle: 'No currency yet',
  noCurrencyMessage: 'Choose a currency in Settings before creating a goal.',
  closedTitle: 'This goal is closed',
  closedMessage: 'Closed goals are read-only. Reopen it from Collection to make changes.',
  notFoundTitle: GOAL_NOT_FOUND,
  notFoundMessage: 'Close this form and try again.',
  saved: 'Goal saved',
  created: 'Goal created',
  unlockedTitle: 'Pro is unlocked',
  unlockedMessage: 'Name your next goal and its world starts growing.',
  nameLabel: 'Goal name',
  namePlaceholder: 'For example “Summer trip”',
  targetLabel: 'Target',
  targetSpoken: (code: string) => `Target amount (${code})`,
  targetHint: (code: string, name: string) => `Every goal uses ${code} – ${name}, set in Settings.`,
  saveChanges: 'Save changes',
  create: 'Create goal',
} as const;

// The Keep goal list (D74): one row per goal.
export const KEEP_GOAL_ROW_COPY = {
  saved: (balance: string, target: string) => `${balance} of ${target} saved`,
  hint: 'Keeps this goal in use',
} as const;

// The world picker screen when the goal's world can't be changed, and a refused change.
export const THEME_PICKER_SCREEN_COPY = {
  unavailableTitle: 'This world can’t be changed now',
  notFoundTitle: GOAL_NOT_FOUND,
  notFoundMessage: 'Close this screen and try again.',
  readOnlyMessage: 'Without Pro this goal is read-only. Its world is kept just as it is.',
  closedMessage: 'Closed goals keep their world. Reopen the goal from Collection to change it.',
  notChanged: 'World not changed',
} as const;
