import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { refreshAppData, useAppDataStore } from '@/bootstrap/app-data';
import { DatabaseGate } from '@/bootstrap/database-gate';
import { StorageFailureScreen } from '@/bootstrap/storage-failure-screen';
import { stackScreenOptions } from '@/shared/theme';
import { Toaster } from '@/shared/ui/toast';

export { ErrorBoundary } from 'expo-router';

// Single navigation owner: one Expo Router hierarchy. Native tabs live in (tabs); app-wide forms
// are presented above the tabs as native sheets from this root Stack. The navigator renders only
// after DatabaseGate has opened and migrated the local database (or shows its recovery screen).
// Until a global currency is chosen, onboarding is the only reachable screen (v1.2 section 2).
export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <>
      {/* The app ships one light appearance (userInterfaceStyle 'light' in app.config.ts). */}
      <StatusBar style="dark" />
      <DatabaseGate>
        <AppNavigator />
      </DatabaseGate>
      <Toaster />
    </>
  );
}

function AppNavigator() {
  const state = useAppDataStore((store) => store.state);

  useEffect(() => {
    if (state.status === 'idle') {
      void refreshAppData();
    }
  }, [state.status]);

  if (state.status === 'failed') {
    return <StorageFailureScreen code="unknown" retrying={false} onRetry={() => void refreshAppData()} />;
  }
  if (state.status !== 'ready') {
    return null;
  }
  const onboarded = state.data.currency.currency.status !== 'missing';
  return (
    <Stack screenOptions={stackScreenOptions}>
      {/* A guarded deep link redirects to the first available route in file order; the (onboarding)
          group sorts before the development-only dev-db route, so a new install lands here. */}
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="(onboarding)/onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="goal-form"
          options={{
            title: 'New goal',
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            sheetAllowedDetents: [1.0],
          }}
        />
      </Stack.Protected>
      {/* Development/test-only native database runner (`npm run test:db`), reachable before
          onboarding so a fresh install can run it; unreachable in release builds. */}
      <Stack.Protected guard={__DEV__}>
        <Stack.Screen name="dev-db" options={{ title: 'Database tests' }} />
      </Stack.Protected>
      {/* Development/test-only controlled form sample; unreachable in release builds. */}
      <Stack.Protected guard={__DEV__ && onboarded}>
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
  );
}
