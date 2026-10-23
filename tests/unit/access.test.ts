import {
  canUseTheme,
  capabilitiesFor,
  DEFAULT_ACCESS_LEVEL,
  FREE_CAPABILITIES,
  hasGoalSlot,
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
