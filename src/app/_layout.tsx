import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';

import { stackScreenOptions } from '@/shared/theme';

export { ErrorBoundary } from 'expo-router';

// Single navigation owner: one Expo Router hierarchy. Native tabs live in (tabs); app-wide forms
// are presented above the tabs as native sheets from this root Stack.
export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <>
      {/* The app ships one light appearance (userInterfaceStyle 'light' in app.config.ts). */}
      <StatusBar style="dark" />
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Development/test-only controlled form sample; unreachable in release builds. */}
        <Stack.Protected guard={__DEV__}>
          <Stack.Screen
            name="sample-form"
            options={{
              title: 'Sample form',
              presentation: 'formSheet',
              sheetGrabberVisible: true,
              sheetAllowedDetents: [0.5, 1.0],
            }}
          />
        </Stack.Protected>
      </Stack>
    </>
  );
}
