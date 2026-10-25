import { getCurrency, type CurrencyMetadata } from '@/core/money';
import type { CollectibleRecord } from '@/data/repositories/collectible-repository';
import type { GoalStatus, GoalSummary } from '@/data/repositories/goal-repository';
import { CARD_FLOAT, cardCaption, cardFloatDelay, collectionEntries, earnedDate, souvenirDetail, statusLabel } from '@/features/collection/presentation/collection-model';

// The Collection's view model (Phase 11): which goals appear, in which order, and the captions that
// keep the souvenir (then) apart from the goal (now).

const EUR = getCurrency('EUR') as CurrencyMetadata;

function goal(id: string, status: GoalStatus, balanceMinor: number, targetMinor = 100_000): GoalSummary {
  return {
    goal: {
      id,
      title: id,
      targetMinor,
      deadlineDate: null,
      themeId: 'island',
      status,
      createdAtUtc: '2026-10-01T08:00:00.000Z',
      updatedAtUtc: '2026-10-01T08:00:00.000Z',
      revision: 1,
    },
    balanceMinor,
    entryCount: 1,
  };
}

function souvenir(goalId: string, earnedAtUtc: string, targetMinorAtAward = 100_000): CollectibleRecord {
  return { goalId, themeId: 'island', themeVersion: 2, targetMinorAtAward, earnedAtUtc };
}

describe('collectionEntries', () => {
  it('lists goals with a souvenir in the given (newest first) order, then completed goals without one; never an open goal without one', () => {
    const goals = [goal('a', 'active', 100_000), goal('b', 'completed', 120_000), goal('c', 'active', 40_000), goal('d', 'completed', 100_000)];
    const entries = collectionEntries(goals, [souvenir('b', '2026-10-20T08:00:00.000Z'), souvenir('a', '2026-10-10T08:00:00.000Z')]);
    expect(entries.map((entry) => [entry.summary.goal.id, entry.souvenir !== null])).toEqual([
      ['b', true],
      ['a', true],
      ['d', false],
    ]);
  });

  it('ignores a souvenir whose goal is not in the snapshot', () => {
    expect(collectionEntries([], [souvenir('gone', '2026-10-20T08:00:00.000Z')])).toEqual([]);
  });
});

describe('captions: then and now', () => {
  it('a reopened goal that saved less: the souvenir stays complete, the goal shows its live stage', () => {
    const [entry] = collectionEntries([goal('trip', 'active', 10_000)], [souvenir('trip', '2026-10-24T23:30:00.000Z')]);
    const detail = souvenirDetail(entry!, EUR, 'Europe/Belgrade', 'en-GB');
    expect(detail).toEqual({
      worldType: 'Island',
      completedOn: '25 Oct 2026',
      saved: '€100.00',
      status: { label: 'Still open', tone: 'neutral', icon: 'resume' },
      percent: 10,
      stage: 1,
      sinceThen: 'Its world on Home shows 1 of 10 milestones now; this souvenir stays complete.',
    });
    expect(cardCaption(entry!, 'Europe/Belgrade', 'en-GB')).toBe('Island · 25 Oct 2026');
  });

  it('the earned date follows the device zone (UTC instant → civil date)', () => {
    const late = souvenir('x', '2026-10-24T23:30:00.000Z');
    expect(earnedDate(late, 'Europe/Belgrade', 'en-GB')).toBe('25 Oct 2026');
    expect(earnedDate(late, 'America/New_York', 'en-GB')).toBe('24 Oct 2026');
  });

  it('a changed target is the only note when the world is still complete', () => {
    const [entry] = collectionEntries([goal('car', 'completed', 250_000, 250_000)], [souvenir('car', '2026-10-20T08:00:00.000Z', 200_000)]);
    expect(souvenirDetail(entry!, EUR, 'UTC', 'en-GB')).toMatchObject({
      saved: '€2,500.00',
      stage: 10,
      sinceThen: 'Completed at a target of €2,000.00; the target is €2,500.00 now.',
    });
  });

  it('nothing changed since: no note at all', () => {
    const [entry] = collectionEntries([goal('cam', 'completed', 120_000)], [souvenir('cam', '2026-10-20T08:00:00.000Z')]);
    expect(souvenirDetail(entry!, EUR, 'UTC', 'en-GB').sinceThen).toBeNull();
  });

  it('status words never rely on color', () => {
    expect(statusLabel('completed')).toEqual({ label: 'Completed', tone: 'success', icon: 'finish' });
    expect(statusLabel('paused').label).toBe('Paused');
    expect(statusLabel('active').label).toBe('Still open');
  });
});

describe('card float (D100)', () => {
  it('is a slow, small float', () => {
    expect(CARD_FLOAT).toEqual({ amplitude: 3, periodMs: 4400, stepMs: 1300 });
  });

  it('starts neighbouring cards at different points of the cycle, within one period', () => {
    const delays = Array.from({ length: 6 }, (_, index) => cardFloatDelay(index));
    expect(delays).toEqual([0, 1300, 2600, 3900, 800, 2100]);
    expect(new Set(delays).size).toBe(delays.length);
    delays.forEach((delay) => expect(delay).toBeLessThan(CARD_FLOAT.periodMs));
  });
});
