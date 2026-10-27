import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { useState } from 'react';
import { AccessibilityInfo, Alert, Dimensions, Linking, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

import { useReminderStore } from '@/bootstrap/reminders';
import { useAccessibilityFocusOnChange } from '@/shared/ui/accessibility-focus';
import { AmountText } from '@/shared/ui/amount-text';
import { Button } from '@/shared/ui/button';
import { Notice } from '@/shared/ui/notice';

import { APP_DIR, chooseCurrency, freshAppDatabase, resetApp } from '../support/app-fixture';

// Phase 19: the Settings "Your data" explanation (R23), and the shared accessibility behavior added
// in this phase (focus after a content swap, spoken form errors, display amounts at large text).
// Screen-reader operation itself is a physical-iPhone check (docs/evidence/PHASE_19.md).

const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions');
const sendEvent = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent');

async function setFontScale(fontScale: number) {
  await act(async () => {
    Dimensions.set({ window: { width: 375, height: 667, scale: 2, fontScale }, screen: { width: 375, height: 667, scale: 2, fontScale } });
  });
}

beforeEach(() => {
  announce.mockClear();
  sendEvent.mockClear();
});

describe('Settings › Your data (R23)', () => {
  beforeEach(async () => {
    await freshAppDatabase('accessibility-settings');
    await chooseCurrency('EUR');
  });

  afterAll(async () => {
    await resetApp();
  });

  it('explains local storage and loss, and offers no backup, export, import or sync control', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await renderRouter(APP_DIR, { initialUrl: '/settings' });
    await waitFor(() => expect(useReminderStore.getState().status).not.toBeNull());

    const headers = screen.getAllByRole('header').map((header) => header.props.children);
    expect(headers.indexOf('Pro')).toBeLessThan(headers.indexOf('Your data'));
    expect(headers.indexOf('Your data')).toBeLessThan(headers.indexOf('About'));

    expect(screen.getByTestId('local-data-stored')).toHaveTextContent(/Saved on this iPhone.*no account and no cloud copy/);
    expect(screen.getByTestId('local-data-loss')).toHaveTextContent(
      /Deleting Saving Worlds or losing this iPhone can remove your savings records for good\. The app can’t bring them back\./,
    );
    // Static rows: nothing here can be pressed.
    expect(screen.getByTestId('local-data-stored')).not.toHaveProp('accessibilityRole', 'button');
    expect(screen.getByTestId('local-data-loss')).not.toHaveProp('accessibilityRole', 'button');

    // No backup/export/import/sync action anywhere on the screen.
    const buttons = screen.getAllByRole('button').map((button) => String(button.props.accessibilityLabel ?? ''));
    expect(buttons.filter((label) => /backup|export|import|sync/i.test(label))).toEqual([]);
    expect(screen.queryByText(/^(Back up|Export|Import|Sync)/)).toBeNull();

    // Restore Purchases is explained as returning Pro only.
    expect(screen.getByTestId('pro-settings-footnote')).toHaveTextContent(/brings back Pro, not savings data/);

    await fireEvent.press(screen.getByTestId('local-data-footnote-info'));
    const [title, message] = alert.mock.calls.at(-1) ?? [];
    expect(title).toBe('About your data');
    expect(message).toMatch(/There is no backup, export or sync in Saving Worlds/);
    expect(message).toMatch(/the app can’t restore them/);
    expect(message).toMatch(/iPhone and iCloud backups are made by iOS, not by Saving Worlds, so the app can’t promise/);
    expect(message).toMatch(/Restore Purchases on the Pro screen brings back Pro, not your goals or entries\./);
    alert.mockRestore();
  });

  it('About links to the public Privacy Policy and Support pages in Safari (D137)', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderRouter(APP_DIR, { initialUrl: '/settings' });
    await waitFor(() => expect(useReminderStore.getState().status).not.toBeNull());
    expect(screen.getByTestId('settings-about')).toHaveTextContent(/Privacy Policy.*Support/);
    expect(screen.getByTestId('settings-privacy')).toHaveProp('accessibilityHint', 'Opens in Safari.');
    await fireEvent.press(screen.getByTestId('settings-privacy'));
    await fireEvent.press(screen.getByTestId('settings-support'));
    expect(openURL.mock.calls).toEqual([
      ['https://bosko-front.github.io/SavingWorld/PRIVACY.html'],
      ['https://bosko-front.github.io/SavingWorld/SUPPORT.html'],
    ]);
    openURL.mockRestore();
  });

  it('Version shows the redacted build details on press-and-hold or the VoiceOver action, and nothing on a tap (D142)', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await renderRouter(APP_DIR, { initialUrl: '/settings' });
    await waitFor(() => expect(useReminderStore.getState().status).not.toBeNull());
    const version = screen.getByTestId('settings-version');
    expect(version).toHaveProp('accessibilityActions', [{ name: 'longpress', label: 'Show build details' }]);
    expect(version).toHaveProp('accessibilityHint', 'Shows the app’s version and update details for support.');

    await fireEvent.press(version);
    expect(alert).not.toHaveBeenCalled();

    await fireEvent(version, 'longPress');
    await fireEvent(version, 'accessibilityAction', { nativeEvent: { actionName: 'longpress' } });
    expect(alert).toHaveBeenCalledTimes(2);
    const [title, message] = alert.mock.calls[0] ?? [];
    expect(title).toBe('Build details');
    expect(message).toMatch(/^App version: .+\nRuntime: .+\nChannel: .+\nUpdate: .+/);
    // Identity only: no currency, goal, amount or other savings data.
    expect(message).not.toMatch(/€|EUR|goal|saved|entr/i);
    alert.mockRestore();
  });
});

function Swapping() {
  const [step, setStep] = useState(0);
  const ref = useAccessibilityFocusOnChange(step);
  return (
    <View>
      <Text ref={ref} accessibilityRole="header" testID="step-title">
        {`Step ${step}`}
      </Text>
      <Button label="Next" onPress={() => setStep((value) => value + 1)} testID="next" />
    </View>
  );
}

describe('shared accessibility behavior', () => {
  it('moves VoiceOver to the new heading after a swap, never on first render', async () => {
    jest.useFakeTimers();
    await render(<Swapping />);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(sendEvent).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('next'));
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(sendEvent).toHaveBeenCalledTimes(1);
    expect(sendEvent.mock.calls[0]?.[1]).toBe('focus');
    jest.useRealTimers();
  });

  it('speaks a form error notice once when it appears, and a plain notice not at all', async () => {
    const { rerender } = await render(<Notice tone="info" title="Paused" />);
    expect(announce).not.toHaveBeenCalled();
    await rerender(<Notice tone="error" title="Not saved" message="Try again." announce />);
    await rerender(<Notice tone="error" title="Not saved" message="Try again." announce />);
    expect(announce.mock.calls).toEqual([['Not saved. Try again.', { queue: true }]]);
  });

  it('steps a display amount down to the large title above 1.35× text', async () => {
    const original = Dimensions.get('window').fontScale;
    await setFontScale(1);
    const { rerender } = await render(<AmountText formatted="€1,234.50" size="display" testID="amount" />);
    const fontSize = () => (StyleSheet.flatten(screen.getByText('€1,234.50').props.style as StyleProp<TextStyle>) ?? {}).fontSize;
    const regular = fontSize();
    await setFontScale(2);
    await rerender(<AmountText formatted="€1,234.50" size="display" testID="amount" />);
    expect(fontSize()).toBeLessThan(regular ?? 0);
    await setFontScale(original);
  });
});
