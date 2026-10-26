import { act, render, screen } from '@testing-library/react-native';
import { getAnimatedStyle } from 'react-native-reanimated';

import { ProgressBar } from '@/shared/ui/progress-bar';
import { setReduceMotionForTests } from '@/shared/ui/motion-preferences';

// The shared ProgressBar's glide with a start delay (Phase 13, D106: the quest card waits while the
// entry sheet closes, then glides over Home's count duration), on Reanimated's Jest timers. Frame
// smoothness is a simulator/device check (docs/evidence/PHASE_13.md).

jest.useFakeTimers();

// Reanimated's Jest helper; its published type is the web build's no-argument stub.
const animatedStyle = getAnimatedStyle as unknown as (node: ReturnType<typeof screen.getByTestId>) => { width?: string };

function fillPercent(): number {
  return Number.parseFloat(animatedStyle(screen.getByTestId('bar-fill')).width ?? '0');
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

afterEach(() => {
  setReduceMotionForTests(true);
});

it('holds during the delay, glides, and rests on the new value', async () => {
  setReduceMotionForTests(false);
  const bar = (fraction: number, percent: number) => (
    <ProgressBar fraction={fraction} percent={percent} milestones={1} delayMs={450} durationMs={700} resetKey="quest" testID="bar" />
  );
  await render(bar(0.2, 20));
  expect(fillPercent()).toBeCloseTo(20, 5);

  await screen.rerender(bar(0.48, 48));
  await advance(400);
  // Still waiting for the sheet to close.
  expect(fillPercent()).toBeCloseTo(20, 5);
  await advance(400);
  // Part of the way, moving toward the new value.
  const mid = fillPercent();
  expect(mid).toBeGreaterThan(20);
  expect(mid).toBeLessThan(48);
  await advance(800);
  expect(fillPercent()).toBeCloseTo(48, 5);
  expect(screen.getByTestId('bar')).toHaveAccessibilityValue({ now: 48, text: '48%' });
});

it('jumps under Reduce Motion', async () => {
  setReduceMotionForTests(true);
  await render(<ProgressBar fraction={0.2} percent={20} milestones={1} delayMs={450} durationMs={700} resetKey="quest" testID="bar" />);
  await screen.rerender(<ProgressBar fraction={0.6} percent={60} milestones={1} delayMs={450} durationMs={700} resetKey="quest" testID="bar" />);
  await advance(16);
  expect(fillPercent()).toBeCloseTo(60, 5);
});
