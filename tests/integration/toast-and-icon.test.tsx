import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { Icon, ICON_SYMBOLS, iconSize } from '@/shared/ui/icon';
import { showToast, Toaster, toastDuration } from '@/shared/ui/toast';

import { liveToasts, resetFakeToasts } from '../support/sonner-native-fake';

// The shared feedback wrappers (docs/DESIGN_SYSTEM.md "Transient feedback", "Icons"). The toast
// engine is the Jest fake (tests/support/sonner-native-fake.tsx); real presentation, gestures,
// Reduce Motion and VoiceOver are simulator checks in docs/evidence/PHASE_06.md.

const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions');

beforeEach(() => {
  announce.mockClear();
  resetFakeToasts();
});

describe('showToast', () => {
  it('shows one toast and announces it once, queued', async () => {
    await render(<Toaster />);
    await act(async () => {
      showToast({ tone: 'success', title: 'Goal created' });
    });
    expect(screen.getByLabelText('Goal created')).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('Goal created', { queue: true });
  });

  it('replaces the current toast instead of stacking', async () => {
    await render(<Toaster />);
    await act(async () => {
      showToast({ tone: 'success', title: 'Goal paused' });
      showToast({ tone: 'info', title: 'Goal resumed' });
    });
    expect(liveToasts()).toHaveLength(1);
    expect(screen.queryByLabelText('Goal paused')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Goal resumed')).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledTimes(2);
  });

  it('stays about four seconds, longer for longer text, at most eight', () => {
    expect(toastDuration('Goal created')).toBe(4000);
    expect(toastDuration('x'.repeat(60))).toBe(5200);
    expect(toastDuration('x'.repeat(400))).toBe(8000);
  });

  it('passes a tap-to-dismiss handler and an auto-close duration to the engine', async () => {
    await render(<Toaster />);
    await act(async () => {
      showToast({ tone: 'success', title: 'Goal archived' });
    });
    const [item] = liveToasts();
    expect(item?.options).toMatchObject({ duration: 4000, dismissible: true });
    await act(async () => {
      (item?.options.onPress as () => void)();
    });
    expect(liveToasts()).toHaveLength(0);
  });
});

describe('Icon', () => {
  it('maps every DESIGN_SYSTEM semantic name to its SF Symbol', () => {
    expect(ICON_SYMBOLS).toEqual({
      success: 'checkmark.circle.fill',
      error: 'exclamationmark.triangle.fill',
      info: 'info.circle.fill',
      deposit: 'arrow.down.circle',
      withdrawal: 'arrow.up.circle',
      history: 'clock.arrow.circlepath',
      calendar: 'calendar',
      pause: 'pause.circle',
      resume: 'play.circle',
      archive: 'archivebox',
      reopen: 'arrow.uturn.backward.circle',
      finish: 'flag.checkered',
      lock: 'lock.fill',
      reminder: 'bell',
      settings: 'gearshape',
      souvenir: 'sparkles',
      pro: 'star.circle',
    });
  });

  it('is hidden from VoiceOver by default and sized from the text role and font scale', async () => {
    await render(<Icon name="archive" role="headline" testID="icon" />);
    const icon = screen.getByTestId('icon', { includeHiddenElements: true });
    expect(icon).toHaveProp('accessibilityElementsHidden', true);
    expect(icon).toHaveProp('name', 'archivebox');
    expect(iconSize('headline', 1)).toBe(17);
    expect(iconSize('headline', 1.5)).toBe(26);
  });

  it('can carry its own label when it stands alone', async () => {
    await render(<Icon name="lock" accessibilityLabel="Locked" />);
    expect(screen.getByLabelText('Locked')).toBeOnTheScreen();
  });
});
