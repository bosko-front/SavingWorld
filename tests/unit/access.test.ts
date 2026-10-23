import {
  canUseTheme,
  capabilitiesFor,
  DEFAULT_ACCESS_LEVEL,
  FREE_CAPABILITIES,
  hasOpenGoalSlot,
  PRO_CAPABILITIES,
} from '@/core/access';

// Capability contract (v1.2 section 4; TEST_PLAN T15 starts here, enforcement is Phase 16).

describe('capabilities', () => {
  it('defaults production behavior to Free', () => {
    expect(DEFAULT_ACCESS_LEVEL).toBe('free');
    expect(capabilitiesFor(DEFAULT_ACCESS_LEVEL)).toBe(FREE_CAPABILITIES);
  });

  it('gives Free one open goal, Island only, no theme switching and no Pro statistics', () => {
    expect(FREE_CAPABILITIES).toEqual({
      level: 'free',
      openGoalLimit: 1,
      themes: { island: true, garden: false },
      switchOpenGoalTheme: false,
      proStatistics: false,
    });
    expect(hasOpenGoalSlot(FREE_CAPABILITIES, 0)).toBe(true);
    expect(hasOpenGoalSlot(FREE_CAPABILITIES, 1)).toBe(false);
    expect(canUseTheme(FREE_CAPABILITIES, 'island')).toBe(true);
    expect(canUseTheme(FREE_CAPABILITIES, 'garden')).toBe(false);
  });

  it('gives Pro unlimited open goals, both themes, switching and the four statistics', () => {
    expect(capabilitiesFor('pro')).toBe(PRO_CAPABILITIES);
    expect(PRO_CAPABILITIES).toEqual({
      level: 'pro',
      openGoalLimit: null,
      themes: { island: true, garden: true },
      switchOpenGoalTheme: true,
      proStatistics: true,
    });
    expect(hasOpenGoalSlot(PRO_CAPABILITIES, 1)).toBe(true);
    expect(hasOpenGoalSlot(PRO_CAPABILITIES, 10_000)).toBe(true);
    expect(canUseTheme(PRO_CAPABILITIES, 'garden')).toBe(true);
  });

  it('has no challenge capability: the three fixed challenges are the same in Free and Pro', () => {
    const capabilityKeys = Object.keys(FREE_CAPABILITIES).sort();
    expect(capabilityKeys).toEqual(['level', 'openGoalLimit', 'proStatistics', 'switchOpenGoalTheme', 'themes']);
    expect(Object.keys(PRO_CAPABILITIES).sort()).toEqual(capabilityKeys);
  });

  it('cannot be changed at runtime', () => {
    expect(Object.isFrozen(FREE_CAPABILITIES)).toBe(true);
    expect(Object.isFrozen(FREE_CAPABILITIES.themes)).toBe(true);
    expect(Object.isFrozen(PRO_CAPABILITIES)).toBe(true);
  });

  it('rejects an impossible open-goal count', () => {
    expect(() => hasOpenGoalSlot(FREE_CAPABILITIES, -1)).toThrow(RangeError);
    expect(() => hasOpenGoalSlot(FREE_CAPABILITIES, 0.5)).toThrow(RangeError);
  });
});
