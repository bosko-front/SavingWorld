// Jest stand-in for expo-haptics (mapped in package.json `moduleNameMapper`). It records every
// call our wrapper makes so tests can assert "exactly one success haptic after a commit, none after
// a failure". Real Taptic Engine output is a device check; the simulator has no haptics.

export enum NotificationFeedbackType {
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
}

export enum ImpactFeedbackStyle {
  Light = 'light',
  Medium = 'medium',
  Heavy = 'heavy',
  Soft = 'soft',
  Rigid = 'rigid',
}

export type FakeHaptic = { kind: 'notification'; type: NotificationFeedbackType } | { kind: 'impact'; style: ImpactFeedbackStyle } | { kind: 'selection' };

let played: FakeHaptic[] = [];

export function notificationAsync(type: NotificationFeedbackType = NotificationFeedbackType.Success): Promise<void> {
  played = [...played, { kind: 'notification', type }];
  return Promise.resolve();
}

export function impactAsync(style: ImpactFeedbackStyle = ImpactFeedbackStyle.Medium): Promise<void> {
  played = [...played, { kind: 'impact', style }];
  return Promise.resolve();
}

export function selectionAsync(): Promise<void> {
  played = [...played, { kind: 'selection' }];
  return Promise.resolve();
}

// Test helpers.
export function playedHaptics(): FakeHaptic[] {
  return played;
}

export function resetFakeHaptics(): void {
  played = [];
}
