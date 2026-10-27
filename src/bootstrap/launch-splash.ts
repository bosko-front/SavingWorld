import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

// The native launch screen stays up until the first screen is really drawn (D141): the database is
// open and Home shows its world with every layer of the current stage loaded, so the Island never
// pops in after the sky. Screens with nothing to wait for (onboarding, failures, notices) release it
// as soon as they render. The wait for the world is capped once the database is open, so a slow or
// failed image can never keep the launch screen up; the world then appears as it loads.
export const FIRST_SCREEN_WAIT_MS = 1500;

// A rejected call only means the splash was already gone, which changes nothing about readiness.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

let released = false;
let waitMs = FIRST_SCREEN_WAIT_MS;
let cap: ReturnType<typeof setTimeout> | null = null;

// Hides the launch screen once; later calls (every world shown after launch) do nothing.
export function releaseLaunchSplash() {
  if (released) {
    return;
  }
  released = true;
  if (cap !== null) {
    clearTimeout(cap);
    cap = null;
  }
  SplashScreen.hideAsync().catch(() => undefined);
}

// Called when the database is open: from now on the first screen has at most FIRST_SCREEN_WAIT_MS.
export function startFirstScreenWait() {
  if (released || cap !== null) {
    return;
  }
  cap = setTimeout(releaseLaunchSplash, waitMs);
}

// For a screen that is complete as soon as it renders.
export function useReleaseLaunchSplash(ready = true) {
  useEffect(() => {
    if (ready) {
      releaseLaunchSplash();
    }
  }, [ready]);
}

// Tests of the screens' own release pass a long cap, so a slow test machine never hides it first.
export function resetLaunchSplashForTests(capMs = FIRST_SCREEN_WAIT_MS) {
  released = false;
  waitMs = capMs;
  if (cap !== null) {
    clearTimeout(cap);
    cap = null;
  }
}
