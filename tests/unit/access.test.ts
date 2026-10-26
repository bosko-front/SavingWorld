import {
  canOpenStatistics,
  canReopenGoal,
  canUseTheme,
  capabilitiesFor,
  DEFAULT_ACCESS_LEVEL,
  FREE_CAPABILITIES,
  goalUse,
  hasGoalSlot,
  needsKeptGoalChoice,
  PRO_CAPABILITIES,
  withinGoalLimit,
} from '@/core/access';

// Capability contract (v1.2 section 4 as changed by D74; TEST_PLAN T15 starts here, enforcement is
// Phase 16).

describe('capabilities', () => {
  it('defaults production behavior to Free', () => {
    expect(DEFAULT_ACCESS_LEVEL).toBe('free');
    expect(capabilitiesFor(DEFAULT_ACCESS_LEVEL)).toBe(FREE_CAPABILITIES);
  });

  it('gives Free one goal in any status, Island only, no theme switching and no Pro statistics', () => {
    expect(FREE_CAPABILITIES).toEqual({
      level: 'free',
      goalLimit: 1,
      themes: { island: true, garden: false },
      switchOpenGoalTheme: false,
      proStatistics: false,
    });
    expect(hasGoalSlot(FREE_CAPABILITIES, 0)).toBe(true);
    expect(hasGoalSlot(FREE_CAPABILITIES, 1)).toBe(false);
    // Reopen adds no goal: allowed with the one goal, refused when more exist (after losing Pro).
    expect(withinGoalLimit(FREE_CAPABILITIES, 1)).toBe(true);
    expect(withinGoalLimit(FREE_CAPABILITIES, 2)).toBe(false);
    expect(canUseTheme(FREE_CAPABILITIES, 'island')).toBe(true);
    expect(canUseTheme(FREE_CAPABILITIES, 'garden')).toBe(false);
  });

  it('gives Pro unlimited goals, both themes, switching and the four statistics', () => {
    expect(capabilitiesFor('pro')).toBe(PRO_CAPABILITIES);
    expect(PRO_CAPABILITIES).toEqual({
      level: 'pro',
      goalLimit: null,
      themes: { island: true, garden: true },
      switchOpenGoalTheme: true,
      proStatistics: true,
    });
    expect(hasGoalSlot(PRO_CAPABILITIES, 1)).toBe(true);
    expect(hasGoalSlot(PRO_CAPABILITIES, 10_000)).toBe(true);
    expect(withinGoalLimit(PRO_CAPABILITIES, 10_000)).toBe(true);
    expect(canUseTheme(PRO_CAPABILITIES, 'garden')).toBe(true);
  });

  it('has no challenge capability: the three fixed challenges are the same in Free and Pro', () => {
    const capabilityKeys = Object.keys(FREE_CAPABILITIES).sort();
    expect(capabilityKeys).toEqual(['goalLimit', 'level', 'proStatistics', 'switchOpenGoalTheme', 'themes']);
    expect(Object.keys(PRO_CAPABILITIES).sort()).toEqual(capabilityKeys);
  });

  it('cannot be changed at runtime', () => {
    expect(Object.isFrozen(FREE_CAPABILITIES)).toBe(true);
    expect(Object.isFrozen(FREE_CAPABILITIES.themes)).toBe(true);
    expect(Object.isFrozen(PRO_CAPABILITIES)).toBe(true);
  });

  it('rejects an impossible goal count', () => {
    expect(() => hasGoalSlot(FREE_CAPABILITIES, -1)).toThrow(RangeError);
    expect(() => withinGoalLimit(FREE_CAPABILITIES, 0.5)).toThrow(RangeError);
  });
});

// Phase 16 (D74, D75; TEST_PLAN T15): which goals accept changes. Pure rules; the commands enforce
// them inside their transactions (tests/integration/access-enforcement.test.ts).
describe('goal use after a lost entitlement', () => {
  const island = (goalId: string, goalCount: number, keptGoalId: string | null = null) => ({ goalId, goalCount, keptGoalId, themeId: 'island' as const });
  const garden = (goalId: string, goalCount: number, keptGoalId: string | null = null) => ({ goalId, goalCount, keptGoalId, themeId: 'garden' as const });

  it('keeps Free with its one goal fully usable, in any status', () => {
    expect(goalUse(FREE_CAPABILITIES, island('a', 1))).toBe('usable');
    expect(needsKeptGoalChoice(FREE_CAPABILITIES, 1, null)).toBe(false);
    expect(needsKeptGoalChoice(FREE_CAPABILITIES, 0, null)).toBe(false);
    expect(canReopenGoal(FREE_CAPABILITIES, 1, null, 'a')).toBe(true);
  });

  it('makes every goal read-only after a loss with several goals until the person chooses one', () => {
    expect(needsKeptGoalChoice(FREE_CAPABILITIES, 3, null)).toBe(true);
    for (const id of ['a', 'b', 'c']) {
      expect(goalUse(FREE_CAPABILITIES, island(id, 3))).toBe('read_only');
      expect(canReopenGoal(FREE_CAPABILITIES, 3, null, id)).toBe(false);
    }
  });

  it('keeps exactly the chosen goal usable; the others stay read-only until Pro returns or goals are deleted', () => {
    expect(needsKeptGoalChoice(FREE_CAPABILITIES, 3, 'b')).toBe(false);
    expect(goalUse(FREE_CAPABILITIES, island('b', 3, 'b'))).toBe('usable');
    expect(goalUse(FREE_CAPABILITIES, island('a', 3, 'b'))).toBe('read_only');
    expect(canReopenGoal(FREE_CAPABILITIES, 3, 'b', 'b')).toBe(true);
    expect(canReopenGoal(FREE_CAPABILITIES, 3, 'b', 'a')).toBe(false);
    // Deleting down to one goal ends the restriction for the goal that remains.
    expect(goalUse(FREE_CAPABILITIES, island('a', 1, 'b'))).toBe('usable');
    // Pro returns: everything usable again, whatever was chosen.
    expect(goalUse(PRO_CAPABILITIES, island('a', 3, 'b'))).toBe('usable');
    expect(needsKeptGoalChoice(PRO_CAPABILITIES, 3, null)).toBe(false);
  });

  it('locks a Garden goal without Pro, even the kept one, and never a Pro one (D75)', () => {
    expect(goalUse(FREE_CAPABILITIES, garden('a', 1))).toBe('theme_locked');
    expect(goalUse(FREE_CAPABILITIES, garden('b', 2, 'b'))).toBe('theme_locked');
    expect(goalUse(FREE_CAPABILITIES, garden('a', 2, 'b'))).toBe('read_only');
    expect(goalUse(PRO_CAPABILITIES, garden('a', 5))).toBe('usable');
  });

  it('opens the Pro statistics only with Pro', () => {
    expect(canOpenStatistics(FREE_CAPABILITIES)).toBe(false);
    expect(canOpenStatistics(PRO_CAPABILITIES)).toBe(true);
  });
});
