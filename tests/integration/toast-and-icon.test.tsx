import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Icon, ICON_SYMBOLS, iconSize } from '@/shared/ui/icon';
import { showToast, Toaster, toastDuration, toastTopOffset } from '@/shared/ui/toast';

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
    await render(<ToasterInApp />);
    await act(async () => {
      showToast({ tone: 'success', title: 'Goal created' });
    });
    expect(screen.getByLabelText('Goal created')).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('Goal created', { queue: true });
  });

  it('replaces the current toast instead of stacking', async () => {
    await render(<ToasterInApp />);
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
    // Errors stay longer, so their explanation can be read.
    expect(toastDuration('Goal not paused', 'error', 'Try again.')).toBe(6000);
    expect(toastDuration('Goal not reopened', 'error', 'x'.repeat(200))).toBe(8000);
  });

  it('passes a tap-to-dismiss handler and an auto-close duration to the engine', async () => {
    await render(<ToasterInApp />);
    await act(async () => {
      showToast({ tone: 'success', title: 'Goal deleted' });
    });
    const [item] = liveToasts();
    expect(item?.options).toMatchObject({ duration: 4000, dismissible: true });
    await act(async () => {
      (item?.options.onPress as () => void)();
    });
    expect(liveToasts()).toHaveLength(0);
  });
});

// The app renders the Toaster inside Expo Router's SafeAreaProvider; the test gives it an iPhone-like
// top inset (status bar 59 pt).
const SAFE_AREA = { frame: { x: 0, y: 0, width: 402, height: 874 }, insets: { top: 59, left: 0, right: 0, bottom: 34 } };

function ToasterInApp() {
  return (
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <Toaster />
    </SafeAreaProvider>
  );
}

describe('toast placement', () => {
  it('sits below the status bar and one navigation bar, never over the back button', () => {
    // The engine ignores the safe area when it gets an offset, so the offset must include it.
    expect(toastTopOffset(59)).toBe(59 + 44 + 8);
    expect(toastTopOffset(20)).toBe(72);
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
      delete: 'trash',
      reopen: 'arrow.uturn.backward.circle',
      finish: 'flag.checkered',
      lock: 'lock.fill',
      reminder: 'bell',
      settings: 'gearshape',
      souvenir: 'sparkles',
      pro: 'star.circle',
      edit: 'pencil',
      more: 'ellipsis.circle',
      chevron: 'chevron.right',
      milestone: 'leaf.fill',
      challenges: 'flag',
      currency: 'banknote',
      device: 'iphone',
      add: 'plus',
    });
  });

  it('is hidden from VoiceOver by default and sized from the text role and font scale', async () => {
    await render(<Icon name="delete" role="headline" testID="icon" />);
    const icon = screen.getByTestId('icon', { includeHiddenElements: true });
    expect(icon).toHaveProp('accessibilityElementsHidden', true);
    expect(icon).toHaveProp('name', 'trash');
    expect(iconSize('headline', 1)).toBe(17);
    expect(iconSize('headline', 1.5)).toBe(26);
  });

  it('can carry its own label when it stands alone', async () => {
    await render(<Icon name="lock" accessibilityLabel="Locked" />);
    expect(screen.getByLabelText('Locked')).toBeOnTheScreen();
  });
});
