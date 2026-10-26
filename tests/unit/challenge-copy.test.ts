import type { CivilDate } from '@/core/calendar';
import type { Stage } from '@/core/progression';
import {
  challengeActionMessage,
  currentQuestCopy,
  historyRowCopy,
  milestoneGoal,
  offerCopy,
  RESULT_BADGES,
  unavailableCopy,
  type QuestFormatters,
  type QuestWorld,
} from '@/features/challenges/presentation/challenge-copy';
import type { AttemptView, UnavailableReason } from '@/features/challenges/domain/challenge-rules';

// Phase 13 quest wording over Phase 12 board values (D97: say what to do and how it helps the
// world; neutral history; never "failed", never new money).

const names: Partial<Record<Stage, string>> = { 1: 'First tree', 6: 'Pond', 9: 'Final decorations' };
const island: QuestWorld = { noun: 'island', stageName: (stage) => names[stage] ?? null };
// A civil date from its text, for fixtures.
const day = (text: string) => text as CivilDate;
const format: QuestFormatters = { amount: (minor) => `€${(minor / 100).toFixed(2)}`, date: (date) => date };

function attempt(overrides: Partial<AttemptView>): AttemptView {
  return {
    id: 'a',
    ruleId: 'next_milestone',
    state: 'active',
    result: null,
    progress: { kind: 'amount', targetMinor: 4_000, progressMinor: 1_000, remainingMinor: 3_000, met: false },
    milestoneStage: 6,
    startedAtUtc: '2026-10-21T10:00:00.000Z',
    startDate: day('2026-10-21'),
    weekStartDate: null,
    periodEndDate: null,
    periodEndAtUtc: null,
    periodTimezone: 'Europe/Belgrade',
    historicalAtUtc: null,
    ...overrides,
  };
}

describe('quest copy', () => {
  it('names the unlock from the manifest, completes the world at stage 10 and falls back to a percent', () => {
    expect(milestoneGoal(6, island)).toBe('Unlock the pond');
    expect(milestoneGoal(9, island)).toBe('Unlock the final decorations');
    expect(milestoneGoal(10, island)).toBe('Complete your island');
    expect(milestoneGoal(4, island)).toBe('Reach 40% of your goal');
  });

  it('states the frozen amount and saved week a start would fix', () => {
    expect(offerCopy({ ruleId: 'next_milestone', targetMinor: 4_000, thresholdMinor: 60_000, milestoneStage: 6 }, island, format)).toEqual({
      title: 'Next milestone',
      headline: 'Unlock the pond',
      detail: 'Save €40.00 more · no deadline',
    });
    expect(offerCopy({ ruleId: 'weekly_step', targetMinor: 2_334, weekStartDate: day('2026-10-19'), periodEndDate: day('2026-10-25') }, island, format).detail).toBe(
      '2026-10-19 – 2026-10-25',
    );
  });

  it('explains every reason a quest cannot start, without blame', () => {
    const reasons: UnavailableReason[] = ['goal_closed', 'attempt_active', 'already_used', 'target_reached', 'no_deadline', 'deadline_passed', 'used_this_week'];
    const texts = reasons.map((reason) => unavailableCopy(reason, 'weekly_step', island));
    expect(new Set(texts).size).toBe(reasons.length);
    for (const text of texts) {
      expect(text).not.toMatch(/fail|missed|late|penalt/i);
    }
    expect(unavailableCopy('attempt_active', 'first_step', island)).toBe('One quest at a time. Finish or skip your current quest first.');
  });

  it('shows counted progress against the frozen target', () => {
    const copy = currentQuestCopy(attempt({}), island, format);
    expect(copy.progress).toEqual({ kind: 'amount', fraction: 0.25, percent: 25, saved: '€10.00', target: '€40.00', toGo: '€30.00 to go', label: '€10.00 of €40.00 saved, €30.00 to go' });
    expect(copy.period).toBe('No deadline');
  });

  it('keeps past quests neutral: only Completed is green, an expired quest has "Ended", and nothing shows "0 of"', () => {
    expect(RESULT_BADGES.completed.tone).toBe('success');
    expect(RESULT_BADGES.not_completed).toEqual({ label: 'Ended', tone: 'neutral' });
    expect(RESULT_BADGES.skipped).toEqual({ label: 'Skipped', tone: 'neutral' });
    const row = historyRowCopy(
      attempt({ ruleId: 'weekly_step', state: 'historical', result: 'not_completed', milestoneStage: null, weekStartDate: day('2026-10-19') }),
      island,
      format,
    );
    expect(row.label).toBe('Weekly step, Ended. €10.00 saved · Week of 2026-10-19.');
    const empty = historyRowCopy(
      attempt({
        ruleId: 'weekly_step',
        state: 'historical',
        result: 'skipped',
        milestoneStage: null,
        weekStartDate: day('2026-10-19'),
        progress: { kind: 'amount', targetMinor: 4_000, progressMinor: 0, remainingMinor: 4_000, met: false },
      }),
      island,
      format,
    );
    expect(empty.detail).toBe('Week of 2026-10-19');
  });

  it('turns command refusals into the next step', () => {
    expect(challengeActionMessage('start', { code: 'challenge_unavailable', reason: 'used_this_week' }, 'weekly_step', island)).toBe(
      'Done for this week. A new one opens Monday.',
    );
    expect(challengeActionMessage('skip', { code: 'attempt_not_active' }, 'first_step', island)).toBe('This quest has already ended. You’ll find it in Past quests.');
    expect(challengeActionMessage('skip', { code: 'storage_failure', message: 'disk' }, 'first_step', island)).toBe('Nothing was changed. Try again.');
  });
});
