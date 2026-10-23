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
      {/* Development/test-only gallery and layout lab. Unreachable in release builds (__DEV__ false).
          The native database runner is a root route (src/app/dev-db.tsx). */}
      <Stack.Protected guard={__DEV__}>
        <Stack.Screen name="dev-gallery" options={{ title: 'Component gallery', headerLargeTitleEnabled: false }} />
        <Stack.Screen name="dev-layout" options={{ title: 'Layout lab', headerLargeTitleEnabled: false }} />
      </Stack.Protected>
    </Stack>
  );
}
