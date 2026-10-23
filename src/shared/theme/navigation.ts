import type { ComponentProps } from 'react';
import type { Stack } from 'expo-router/stack';

import { colors } from './tokens';

// Native navigation appearance from the same tokens. Only supported tint/surface options are set;
// the system keeps its own bar materials (iOS 26+ draws the tab bar background itself).

type StackOptions = Exclude<ComponentProps<typeof Stack>['screenOptions'], ((...args: never[]) => unknown) | undefined>;

export const stackScreenOptions = {
  headerTintColor: colors.actionPrimary,
  headerTitleStyle: { color: colors.textPrimary },
  headerLargeTitleStyle: { color: colors.textPrimary },
  contentStyle: { backgroundColor: colors.canvas },
} satisfies StackOptions;

export const nativeTabsAppearance = {
  tintColor: colors.actionPrimary,
} as const;
