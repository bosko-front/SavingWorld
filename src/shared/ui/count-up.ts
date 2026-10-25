import { useEffect, useRef, useState } from 'react';

import { useReduceMotion } from './motion-preferences';

// Numeric feedback (Phase 10): a number that counts up to a larger value instead of jumping, for
// the saved amount and the percent after a committed deposit. Presentation only: it returns whole
// in-between values to display (integer minor units stay integers) and always ends exactly on
// `value`. A smaller value, `enabled: false`, Reduce Motion or a new `resetKey` (another goal) show
// the value at once. VoiceOver labels use the committed value, never these in-between numbers.

export const COUNT_UP_MS = 700;

type CountUpOptions = { enabled: boolean; durationMs?: number; resetKey?: string };

export function useCountUp(value: number, { enabled, durationMs = COUNT_UP_MS, resetKey }: CountUpOptions): number {
  const reduced = useReduceMotion();
  const [shown, setShown] = useState({ value, key: resetKey });
  // The number on screen, for the effect: a count interrupted by a newer value continues from it.
  const shownRef = useRef({ value, key: resetKey });

  useEffect(() => {
    const from = shownRef.current.value;
    const sameKey = shownRef.current.key === resetKey;
    const show = (next: number) => {
      shownRef.current = { value: next, key: resetKey };
      setShown(shownRef.current);
    };
    if (!enabled || reduced || !sameKey || value <= from) {
      show(value);
      return;
    }
    const start = performance.now();
    let frame = requestAnimationFrame(function tick() {
      const progress = Math.min(1, Math.max(0, (performance.now() - start) / durationMs));
      // Ease out: fast at first, settling on the final value.
      const eased = 1 - (1 - progress) ** 3;
      show(progress >= 1 ? value : Math.round(from + (value - from) * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [value, enabled, reduced, resetKey, durationMs]);

  // Before the effect runs, a rise keeps showing the old number (the count starts from there); any
  // other change is shown at once.
  if (!enabled || reduced || shown.key !== resetKey || value < shown.value) {
    return value;
  }
  return shown.value;
}
