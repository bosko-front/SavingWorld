import { act } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';

import {
  FIRST_SCREEN_WAIT_MS,
  releaseLaunchSplash,
  resetLaunchSplashForTests,
  startFirstScreenWait,
} from '@/bootstrap/launch-splash';

// D141: the wait for the first screen is capped after the database opens, and the launch screen is
// hidden only once whoever releases it first (the cap or the first screen).

jest.mock('expo-splash-screen', () => ({
  ...jest.requireActual<object>('expo-splash-screen'),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

const hideAsync = jest.mocked(SplashScreen.hideAsync);

beforeEach(() => {
  jest.useFakeTimers();
  hideAsync.mockClear();
  resetLaunchSplashForTests();
});

afterEach(() => {
  resetLaunchSplashForTests();
  jest.useRealTimers();
});

it('hides the splash when the wait for the first screen runs out, and only once', () => {
  startFirstScreenWait();
  act(() => jest.advanceTimersByTime(FIRST_SCREEN_WAIT_MS - 1));
  expect(hideAsync).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(1));
  expect(hideAsync).toHaveBeenCalledTimes(1);
  releaseLaunchSplash();
  expect(hideAsync).toHaveBeenCalledTimes(1);
});

it('a release before the cap hides the splash once and cancels the cap', () => {
  startFirstScreenWait();
  releaseLaunchSplash();
  act(() => jest.advanceTimersByTime(FIRST_SCREEN_WAIT_MS * 2));
  expect(hideAsync).toHaveBeenCalledTimes(1);
});
