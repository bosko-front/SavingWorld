import { getCurrency, separatorsForLocale, type AmountParseError, type CurrencyMetadata } from '@/core/money';
import type { GoalStatus, GoalSummary } from '@/data/repositories/goal-repository';
import type { CreateGoalError, EditGoalError, LifecycleError } from '@/features/goals/application/goal-commands';
import { resolveSelectedGoalId } from '@/features/goals/application/goal-queries';
import { availableActions, lifecycleTarget, LIFECYCLE_ACTIONS, needsOpenSlot } from '@/features/goals/domain/goal-lifecycle';
import { amountMessage, goalCommandMessage, lifecycleMessage } from '@/features/goals/presentation/goal-copy';
import { rescaleTarget } from '@/features/settings/domain/currency-change';
import { currencyErrorMessage, noConversionMessage } from '@/features/settings/presentation/currency-copy';

const EUR = getCurrency('EUR') as CurrencyMetadata;
const JPY = getCurrency('JPY') as CurrencyMetadata;
const STATUSES: GoalStatus[] = ['active', 'paused', 'completed', 'archived'];

describe('goal lifecycle transitions (v1.2 section 3)', () => {
  it('allows exactly the documented transitions', () => {
    const table = Object.fromEntries(
      LIFECYCLE_ACTIONS.map((action) => [action, Object.fromEntries(STATUSES.map((status) => [status, lifecycleTarget(action, status)]))]),
    );
    expect(table).toEqual({
      pause: { active: 'paused', paused: null, completed: null, archived: null },
      resume: { active: null, paused: 'active', completed: null, archived: null },
      archive: { active: 'archived', paused: 'archived', completed: null, archived: null },
      finish: { active: 'completed', paused: 'completed', completed: null, archived: null },
      reopen: { active: null, paused: null, completed: 'active', archived: 'active' },
    });
  });

  it('only Reopen takes a slot; Reopen never leads to completed', () => {
    expect(LIFECYCLE_ACTIONS.filter(needsOpenSlot)).toEqual(['reopen']);
    expect(lifecycleTarget('reopen', 'completed')).toBe('active');
  });

  it('offers Finish only for a funded open goal', () => {
    expect(availableActions('active', false)).toEqual(['pause', 'archive']);
    expect(availableActions('active', true)).toEqual(['pause', 'archive', 'finish']);
    expect(availableActions('paused', true)).toEqual(['resume', 'archive', 'finish']);
    expect(availableActions('completed', true)).toEqual(['reopen']);
    expect(availableActions('archived', false)).toEqual(['reopen']);
  });
});

describe('currency change keeps written amounts (DECISIONS D56)', () => {
  it.each([
    [100_000, 2, 0, 1_000],
    [100_000, 2, 3, 1_000_000],
    [1_000, 0, 2, 100_000],
    [1_250_000, 3, 2, 125_000],
    [7, 2, 2, 7],
  ] as const)('%i minor units, exponent %i → %i gives %i', (target, from, to, expected) => {
    expect(rescaleTarget(target, from, to)).toEqual({ ok: true, value: expected });
  });

  it('reports targets the new currency cannot show exactly, or above the ceiling', () => {
    expect(rescaleTarget(100_050, 2, 0)).toEqual({ ok: false, error: 'not_representable' });
    expect(rescaleTarget(1_001, 3, 2)).toEqual({ ok: false, error: 'not_representable' });
    expect(rescaleTarget(1_000_000_000_000, 0, 2)).toEqual({ ok: false, error: 'too_large' });
    expect(rescaleTarget(10_000_000_000, 0, 2)).toEqual({ ok: true, value: 1_000_000_000_000 });
  });
});

function summary(id: string, status: GoalStatus): GoalSummary {
  return {
    goal: {
      id,
      title: id,
      targetMinor: 100,
      deadlineDate: null,
      themeId: 'island',
      status,
      createdAtUtc: '2026-10-23T08:00:00.000Z',
      updatedAtUtc: '2026-10-23T08:00:00.000Z',
      revision: 1,
    },
    balanceMinor: 0,
    entryCount: 0,
  };
}

describe('Home selection fallback', () => {
  const goals = [summary('a', 'archived'), summary('b', 'paused'), summary('c', 'active'), summary('d', 'completed')];

  it('keeps a stored open goal', () => {
    expect(resolveSelectedGoalId(goals, 'c')).toBe('c');
    expect(resolveSelectedGoalId(goals, 'b')).toBe('b');
  });

  it('falls back to the oldest open goal for a missing, unknown or closed choice', () => {
    expect(resolveSelectedGoalId(goals, null)).toBe('b');
    expect(resolveSelectedGoalId(goals, 'zzz')).toBe('b');
    expect(resolveSelectedGoalId(goals, 'a')).toBe('b');
  });

  it('returns null when no goal is open', () => {
    expect(resolveSelectedGoalId([summary('a', 'archived'), summary('d', 'completed')], 'a')).toBeNull();
    expect(resolveSelectedGoalId([], null)).toBeNull();
  });
});

describe('every command error has inline copy', () => {
  const goalErrors: (CreateGoalError | EditGoalError)[] = [
    { code: 'invalid_operation_id' },
    { code: 'title_empty' },
    { code: 'title_too_long' },
    { code: 'title_invalid' },
    { code: 'invalid_target' },
    { code: 'invalid_deadline' },
    { code: 'past_deadline' },
    { code: 'invalid_theme' },
    { code: 'theme_unavailable' },
    { code: 'operation_conflict' },
    { code: 'currency_missing' },
    { code: 'currency_invalid' },
    { code: 'open_goal_limit' },
    { code: 'invalid_reference' },
    { code: 'goal_not_found' },
    { code: 'stale_goal', currentRevision: 3 },
    { code: 'goal_closed' },
    { code: 'storage_failure', message: 'disk I/O error' },
  ];

  it.each(goalErrors.map((error) => [error.code, error] as const))('%s', (_code, error) => {
    const message = goalCommandMessage(error);
    expect(message.message.length).toBeGreaterThan(10);
    expect(message.message).not.toMatch(/disk|SQL|undefined/);
  });

  it('puts field errors next to their field', () => {
    expect(goalCommandMessage({ code: 'title_too_long' })).toEqual({ field: 'title', message: 'Use 100 characters or fewer.' });
    expect(goalCommandMessage({ code: 'past_deadline' }).field).toBe('deadline');
    expect(goalCommandMessage({ code: 'invalid_target' }).field).toBe('target');
    expect(goalCommandMessage({ code: 'open_goal_limit' }).field).toBeNull();
  });

  it('explains every amount parse error with the currency rules', () => {
    const errors: AmountParseError[] = ['empty', 'signed', 'invalid_character', 'malformed', 'malformed_grouping', 'too_many_decimals', 'not_positive', 'too_large'];
    const us = separatorsForLocale('en-US');
    for (const error of errors) {
      expect(amountMessage(error, EUR, us).length).toBeGreaterThan(10);
    }
    expect(amountMessage('too_many_decimals', JPY, us)).toBe('JPY amounts have no decimals.');
    expect(amountMessage('too_many_decimals', EUR, us)).toBe('EUR amounts have at most 2 decimal places.');
    expect(amountMessage('too_large', EUR, us)).toBe('Enter at most €10,000,000,000.00.');
  });

  it('explains every lifecycle refusal, including Reopen at the Free limit', () => {
    const errors: LifecycleError[] = [
      { code: 'invalid_operation_id' },
      { code: 'invalid_reference' },
      { code: 'operation_conflict' },
      { code: 'goal_not_found' },
      { code: 'stale_goal', currentRevision: 2 },
      { code: 'invalid_transition', status: 'archived' },
      { code: 'open_goal_limit' },
      { code: 'not_funded' },
      { code: 'storage_failure', message: 'x' },
    ];
    for (const error of errors) {
      expect(lifecycleMessage('reopen', error).length).toBeGreaterThan(10);
    }
    expect(lifecycleMessage('reopen', { code: 'open_goal_limit' })).toMatch(/Archive your open goal first, then reopen this one/);
  });

  it('explains currency refusals and that nothing is converted', () => {
    const title = () => 'Trip';
    expect(currencyErrorMessage({ code: 'target_not_representable', goalId: 'g' }, JPY, title)).toBe(
      '“Trip” has a target that JPY can’t show exactly (JPY has no decimals). Edit that goal’s target first.',
    );
    expect(currencyErrorMessage({ code: 'currency_locked', transactionCount: 1, souvenirCount: 0 }, JPY, title)).toMatch(/stays as it is/);
    expect(noConversionMessage(EUR, JPY, 2)).toBe(
      'Amounts are not converted: there is no exchange rate in Saving Worlds. Your 2 goals keep their target numbers and use JPY instead of EUR.',
    );
  });
});
