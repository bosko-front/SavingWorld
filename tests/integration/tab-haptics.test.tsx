import type { ReactElement } from 'react';

import TabsLayout from '@/app/(tabs)/_layout';

import { playedHaptics, resetFakeHaptics } from '../support/expo-haptics-fake';

// A press on a bottom tab plays one light selection haptic (owner request, DECISIONS D66); a press
// the native side prevented plays nothing. The NativeTabs Jest mock does not emit native tab
// presses, so this calls the listener the layout hands to NativeTabs.
type TabPressListener = (event: { data?: { isPrevented: boolean } }) => void;

function tabPressListener(): TabPressListener {
  const element = TabsLayout() as ReactElement<{ screenListeners?: { tabPress?: TabPressListener } }>;
  const listener = element.props.screenListeners?.tabPress;
  if (!listener) {
    throw new Error('TabsLayout has no tabPress listener');
  }
  return listener;
}

beforeEach(() => {
  resetFakeHaptics();
});

it('plays one selection haptic per tab press', () => {
  const onTabPress = tabPressListener();
  onTabPress({ data: { isPrevented: false } });
  onTabPress({ data: { isPrevented: false } });
  expect(playedHaptics()).toEqual([{ kind: 'selection' }, { kind: 'selection' }]);
});

it('plays nothing when the native side prevented the selection', () => {
  tabPressListener()({ data: { isPrevented: true } });
  expect(playedHaptics()).toEqual([]);
});
