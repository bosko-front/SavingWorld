import { assertMinorAmount, assertPositiveMinorAmount } from '../money/minor-units';

// The one progression function every theme uses (v1.2 section 7, docs/DATA_MODEL.md). With
// B = current balance and T = target, both integer minor units:
//
//   stage      = min(10, floor(10 × B / T))      0 is the base scene, 1..10 the ten unlocks
//   threshold k = ceil(T × k / 10)               smallest B that shows stage k
//   remaining  = max(0, T − B)
//   percent    = 100 × B / T                     may exceed 100; floored for display
//
// Every decision runs on BigInt, so 99.999% can never show stage 10, 100% or "funded". Floats
// appear only in SceneFeedback, which drives animation and never a financial or unlock decision.
// Themes supply art for the stages; none has its own math.

export const MILESTONE_COUNT = 10;

export type Stage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

function checkInputs(balanceMinor: number, targetMinor: number): void {
  assertMinorAmount(balanceMinor, 'balance');
  assertPositiveMinorAmount(targetMinor, 'target');
}

// Ceiling division for a nonnegative numerator and positive denominator.
function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator - 1n) / denominator;
}

export function stageFor(balanceMinor: number, targetMinor: number): Stage {
  checkInputs(balanceMinor, targetMinor);
  if (balanceMinor <= 0) {
    return 0;
  }
  const stage = (10n * BigInt(balanceMinor)) / BigInt(targetMinor);
  return (stage >= 10n ? 10 : Number(stage)) as Stage;
}

// Smallest balance that shows `stage` for this target. Stage 0 is 0.
export function stageThresholdMinor(targetMinor: number, stage: Stage): number {
  assertPositiveMinorAmount(targetMinor, 'target');
  return Number(ceilDiv(BigInt(targetMinor) * BigInt(stage), 10n));
}

// The next unlock threshold above the current stage, or null at stage 10. This is v1.2's
// ceil(T × (floor(10 × B / T) + 1) / 10), also used by the Next milestone challenge.
export function nextThresholdMinor(balanceMinor: number, targetMinor: number): number | null {
  const stage = stageFor(balanceMinor, targetMinor);
  return stage === 10 ? null : stageThresholdMinor(targetMinor, (stage + 1) as Stage);
}

export function remainingMinor(balanceMinor: number, targetMinor: number): number {
  checkInputs(balanceMinor, targetMinor);
  return balanceMinor >= targetMinor ? 0 : targetMinor - balanceMinor;
}

// B ≥ T: the condition for Finish and for the one permanent souvenir.
export function isFunded(balanceMinor: number, targetMinor: number): boolean {
  checkInputs(balanceMinor, targetMinor);
  return balanceMinor >= targetMinor;
}

export type PercentDecimals = 0 | 1 | 2;

// Numeric progress floored to `decimals`: 99.999% → 99.99 (never 100), 105% stays 105. The
// result has at most `decimals` decimals and is exact up to 2^53 scaled units, far beyond any
// percentage near 100.
export function progressPercent(balanceMinor: number, targetMinor: number, decimals: PercentDecimals = 0): number {
  checkInputs(balanceMinor, targetMinor);
  if (balanceMinor <= 0) {
    return 0;
  }
  const scale = 10n ** BigInt(decimals);
  const scaled = (100n * scale * BigInt(balanceMinor)) / BigInt(targetMinor);
  return Number(scaled) / Number(scale);
}

export type SceneFeedback = {
  stage: Stage;
  // Position between the current and the next threshold, 0 ≤ value < 1; null at stage 10.
  fractionToNext: number | null;
  // B / T clamped to 0..1, and strictly below 1 while B < T.
  overall: number;
};

// Bounded fractional progress for micro-animations between thresholds. Visual only.
export function sceneFeedback(balanceMinor: number, targetMinor: number): SceneFeedback {
  const stage = stageFor(balanceMinor, targetMinor);
  const funded = isFunded(balanceMinor, targetMinor);
  const overall = funded ? 1 : belowOne(Math.max(0, balanceMinor) / targetMinor);
  if (stage === 10) {
    return { stage, fractionToNext: null, overall };
  }
  const low = stageThresholdMinor(targetMinor, stage);
  const high = stageThresholdMinor(targetMinor, (stage + 1) as Stage);
  const fraction = Math.max(0, balanceMinor - low) / (high - low);
  return { stage, fractionToNext: belowOne(fraction), overall };
}

// Keeps a float strictly below 1 so a rounding step can never look complete.
function belowOne(value: number): number {
  return value >= 1 ? 1 - Number.EPSILON : value;
}
