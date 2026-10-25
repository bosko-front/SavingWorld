import { useIsFocused } from 'expo-router';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';

// When motion may run (DESIGN_SYSTEM "Motion"): the OS Reduce Motion setting, whether the app is in
// the foreground and whether the screen is focused. Animations use these to show a still, final
// frame instead of moving, and to stop looping while nobody can see them.

// Reduce Motion as the OS reports it, kept from the first read so a screen knows the setting on its
// first frame instead of moving before a late answer arrives. The Toaster host reads it from app
// start (root layout), so the value is known before any screen animates.
let reduceMotion = false;
let tracking = false;
const listeners = new Set<() => void>();

function track(): void {
  if (tracking) {
    return;
  }
  tracking = true;
  const update = (value: boolean) => {
    if (value !== reduceMotion) {
      reduceMotion = value;
      listeners.forEach((listener) => listener());
    }
  };
  AccessibilityInfo.isReduceMotionEnabled()
    .then(update)
    .catch(() => undefined);
  AccessibilityInfo.addEventListener('reduceMotionChanged', update);
}

// The last known value, for code that runs outside React (the toast card's first frame).
export function isReduceMotionEnabled(): boolean {
  return reduceMotion;
}

// Tests only: the value a test runs with, without waiting for the OS.
export function setReduceMotionForTests(value: boolean): void {
  tracking = true;
  reduceMotion = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  track();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useReduceMotion(): boolean {
  return useSyncExternalStore(subscribe, isReduceMotionEnabled);
}

// Whether the app is in the foreground; inactive (app switcher, Control Center) and background count
// as not visible. An unknown first state counts as visible until the first change says otherwise.
export function useAppActive(): boolean {
  const [active, setActive] = useState(() => isVisibleState(AppState.currentState));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => setActive(isVisibleState(next)));
    return () => subscription.remove();
  }, []);
  return active;
}

function isVisibleState(state: unknown): boolean {
  return state !== 'background' && state !== 'inactive';
}

// Decorative loops (animated empty states, D69) run only on the focused screen of the foreground
// app, and never with Reduce Motion.
export function useAmbientMotion(): boolean {
  const focused = useIsFocused();
  const active = useAppActive();
  const reduced = useReduceMotion();
  return focused && active && !reduced;
}
