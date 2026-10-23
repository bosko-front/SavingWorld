import { MAX_MINOR } from '@/core/money';
import {
  isFunded,
  isThemeId,
  nextThresholdMinor,
  progressPercent,
  remainingMinor,
  sceneFeedback,
  stageFor,
  stageThresholdMinor,
  THEME_IDS,
  type Stage,
} from '@/core/progression';

// Shared stage rules (TEST_PLAN T02, T03). Thresholds are written out by hand: the smallest
// balance B with 10 × B ≥ k × T.

const STAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const satisfies readonly Stage[];

describe('the €2,000 example from the requirements', () => {
  const target = 200_000; // €2,000.00

  it.each([
    [19_999, 0, '€199.99'],
    [19_980, 0, '9.99%'],
    [20_000, 1, '€200'],
    [100_000, 5, '€1,000'],
    [180_000, 9, 'withdrawal back to €1,800'],
    [199_999, 9, '€1,999.99'],
    [200_000, 10, '€2,000'],
    [210_000, 10, '€2,100, 105%'],
    [250_000, 10, '125%'],
  ])('balance %d shows stage %d (%s)', (balance, stage) => {
    expect(stageFor(balance, target)).toBe(stage);
  });

  it('keeps overfunding numeric while the scene stays complete', () => {
    expect(remainingMinor(210_000, target)).toBe(0);
    expect(progressPercent(210_000, target)).toBe(105);
    expect(progressPercent(250_000, target)).toBe(125);
    expect(isFunded(210_000, target)).toBe(true);
    expect(sceneFeedback(210_000, target)).toEqual({ stage: 10, fractionToNext: null, overall: 1 });
  });

  it('regresses with a withdrawal from €2,000 to €1,800', () => {
    expect(stageFor(200_000, target)).toBe(10);
    expect(stageFor(200_000 - 20_000, target)).toBe(9);
    expect(remainingMinor(180_000, target)).toBe(20_000);
    expect(progressPercent(180_000, target)).toBe(90);
    expect(isFunded(180_000, target)).toBe(false);
  });

  it('shows 9.99% at €199.80 and 10% at €200', () => {
    expect(progressPercent(19_980, target, 2)).toBe(9.99);
    expect(progressPercent(20_000, target, 2)).toBe(10);
  });
});

describe('every k/10 boundary', () => {
  const cases: [number, number[]][] = [
    [200_000, [20_000, 40_000, 60_000, 80_000, 100_000, 120_000, 140_000, 160_000, 180_000, 200_000]],
    [999, [100, 200, 300, 400, 500, 600, 700, 800, 900, 999]],
    [123_457, [12_346, 24_692, 37_038, 49_383, 61_729, 74_075, 86_420, 98_766, 111_112, 123_457]],
    [10, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]],
    [
      MAX_MINOR,
      [1e11, 2e11, 3e11, 4e11, 5e11, 6e11, 7e11, 8e11, 9e11, 1e12],
    ],
  ];

  describe.each(cases)('target %d', (target, thresholds) => {
    it.each(STAGES.map((stage) => [stage, thresholds[stage - 1] ?? Number.NaN] as const))(
      'stage %d starts at %d, not one minor unit earlier',
      (stage, threshold) => {
        expect(stageThresholdMinor(target, stage)).toBe(threshold);
        expect(stageFor(threshold, target)).toBe(stage);
        expect(stageFor(threshold - 1, target)).toBe(stage - 1);
        if (threshold < MAX_MINOR) {
          // One unit above stays in the stage unless the next threshold is that close (target 10).
          const next = thresholds[stage] ?? Number.POSITIVE_INFINITY;
          expect(stageFor(threshold + 1, target)).toBe(threshold + 1 >= next ? stage + 1 : stage);
        }
      },
    );
  });

  it('starts stage 0 at zero', () => {
    expect(stageThresholdMinor(200_000, 0)).toBe(0);
    expect(stageFor(0, 200_000)).toBe(0);
    expect(remainingMinor(0, 200_000)).toBe(200_000);
    expect(progressPercent(0, 200_000)).toBe(0);
    expect(sceneFeedback(0, 200_000)).toEqual({ stage: 0, fractionToNext: 0, overall: 0 });
  });
});

describe('tiny targets skip stages in one minor-unit step', () => {
  it('target 1: base, then complete', () => {
    expect(stageFor(0, 1)).toBe(0);
    expect(stageFor(1, 1)).toBe(10);
  });

  it('target 3: stages 3, 6 and 10', () => {
    expect([0, 1, 2, 3, 4].map((balance) => stageFor(balance, 3))).toEqual([0, 3, 6, 10, 10]);
    expect(STAGES.map((stage) => stageThresholdMinor(3, stage))).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3, 3]);
  });

  it('target 7', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((balance) => stageFor(balance, 7))).toEqual([0, 1, 2, 4, 5, 7, 8, 10]);
  });
});

describe('amounts at the storage bound', () => {
  it('never rounds 99.999…% up to complete', () => {
    for (const target of [100_000, MAX_MINOR]) {
      const balance = target - 1;
      expect(stageFor(balance, target)).toBe(9);
      expect(isFunded(balance, target)).toBe(false);
      expect(remainingMinor(balance, target)).toBe(1);
      expect(progressPercent(balance, target)).toBe(99);
      expect(progressPercent(balance, target, 2)).toBe(99.99);
      expect(sceneFeedback(balance, target).overall).toBeLessThan(1);
      expect(sceneFeedback(balance, target).fractionToNext).toBeLessThan(1);
    }
  });

  it('handles the largest balance against the smallest target', () => {
    expect(stageFor(MAX_MINOR, 1)).toBe(10);
    expect(progressPercent(MAX_MINOR, 1)).toBe(100_000_000_000_000);
    expect(remainingMinor(MAX_MINOR, 1)).toBe(0);
  });

  it('rejects inputs that are not valid stored amounts', () => {
    expect(() => stageFor(100, 0)).toThrow(RangeError);
    expect(() => stageFor(100, -5)).toThrow(RangeError);
    expect(() => stageFor(100, 1.5)).toThrow(RangeError);
    expect(() => stageFor(100, MAX_MINOR + 1)).toThrow(RangeError);
    expect(() => stageFor(Number.NaN, 100)).toThrow(RangeError);
    expect(() => stageFor(MAX_MINOR + 1, 100)).toThrow(RangeError);
    expect(() => remainingMinor(0.5, 100)).toThrow(RangeError);
  });
});

describe('next threshold (v1.2 ceil(T × (floor(10B/T) + 1) / 10))', () => {
  it.each([
    [0, 200_000, 20_000],
    [19_999, 200_000, 20_000],
    [20_000, 200_000, 40_000],
    [199_999, 200_000, 200_000],
    [200_000, 200_000, null],
    [210_000, 200_000, null],
    [150, 999, 200],
    [2, 3, 3],
  ])('balance %d of %d → %s', (balance, target, expected) => {
    expect(nextThresholdMinor(balance, target)).toBe(expected);
  });
});

describe('fractional scene feedback', () => {
  it('positions the balance between thresholds for animation only', () => {
    expect(sceneFeedback(30_000, 200_000)).toEqual({ stage: 1, fractionToNext: 0.5, overall: 0.15 });
    expect(sceneFeedback(200_000, 200_000)).toEqual({ stage: 10, fractionToNext: null, overall: 1 });
  });

  it('stays within 0 ≤ value < 1 and matches the integer stage for every balance of small targets', () => {
    for (const target of [1, 3, 7, 10, 999]) {
      for (let balance = 0; balance <= target + 2; balance += 1) {
        const feedback = sceneFeedback(balance, target);
        expect(feedback.stage).toBe(stageFor(balance, target));
        if (feedback.fractionToNext !== null) {
          expect(feedback.fractionToNext).toBeGreaterThanOrEqual(0);
          expect(feedback.fractionToNext).toBeLessThan(1);
        }
        expect(feedback.overall).toBeGreaterThanOrEqual(0);
        expect(feedback.overall).toBeLessThanOrEqual(1);
        expect(feedback.overall === 1).toBe(balance >= target);
      }
    }
  });
});

describe('themes', () => {
  it('has exactly Island and Garden and no theme-specific stage math', () => {
    expect(THEME_IDS).toEqual(['island', 'garden']);
    expect(isThemeId('island')).toBe(true);
    expect(isThemeId('garden')).toBe(true);
    expect(isThemeId('winter_village')).toBe(false);
    expect(isThemeId(undefined)).toBe(false);
    // The stage function takes no theme: one balance and target give one stage for every theme.
    expect(stageFor.length).toBe(2);
  });
});
