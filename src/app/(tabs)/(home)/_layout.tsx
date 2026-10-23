import { Stack } from 'expo-router/stack';

import { stackScreenOptions } from '@/shared/theme';

export const unstable_settings = {
  anchor: 'index',
};

export default function HomeStackLayout() {
  return (
    <Stack screenOptions={{ ...stackScreenOptions, headerLargeTitleEnabled: true }}>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="details" options={{ title: 'Details', headerLargeTitleEnabled: false }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      {/* Development/test-only gallery. Unreachable in release builds, where __DEV__ is false. */}
      <Stack.Protected guard={__DEV__}>
        <Stack.Screen name="dev-gallery" options={{ title: 'Component gallery', headerLargeTitleEnabled: false }} />
      </Stack.Protected>
    </Stack>
  );
}
