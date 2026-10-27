import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { refreshAppData, useAppDataStore } from '@/bootstrap/app-data';
import { useBillingReconciliation } from '@/bootstrap/billing';
import { DatabaseGate } from '@/bootstrap/database-gate';
import { useForegroundReconciliation } from '@/bootstrap/foreground';
import { useReminderReconciliation, useReminderTapRouting } from '@/bootstrap/reminders';
import { StorageFailureScreen } from '@/bootstrap/storage-failure-screen';
import { stackScreenOptions } from '@/shared/theme';
import { Toaster } from '@/shared/ui/toast';
import { SCREEN_TITLES } from '@/shared/i18n/navigation-copy';

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
  useForegroundReconciliation();
  useReminderReconciliation();
  useBillingReconciliation();

  useEffect(() => {
    if (state.status === 'idle') {
      void refreshAppData();
    }
  }, [state.status]);

  // A failed first read has nothing to show. A read that fails later keeps the navigator and the
  // current screen; Home and the other screens show their own retry (Phase 08).
  if (state.status === 'failed' && state.onboarded === null) {
    return <StorageFailureScreen code="unknown" retrying={false} onRetry={() => void refreshAppData()} />;
  }
  if (state.status !== 'ready' && state.status !== 'failed') {
    return null;
  }
  const onboarded = state.status === 'ready' ? state.data.currency.currency.status !== 'missing' : state.onboarded === true;
  return (
    <>
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
              title: SCREEN_TITLES.newGoal,
              presentation: 'formSheet',
              sheetGrabberVisible: true,
              sheetAllowedDetents: [1.0],
            }}
          />
          <Stack.Screen
            name="entry-form"
            options={{
              title: SCREEN_TITLES.addSavings,
              presentation: 'formSheet',
              sheetGrabberVisible: true,
              sheetAllowedDetents: [1.0],
            }}
          />
          {/* Phase 16: the Pro paywall and the choice of the goal kept in use after Pro was lost. */}
          <Stack.Screen
            name="paywall"
            options={{
              title: SCREEN_TITLES.paywall,
              presentation: 'formSheet',
              sheetGrabberVisible: true,
              sheetAllowedDetents: [1.0],
            }}
          />
          {/* Phase 17: the world picker of an open goal. */}
          <Stack.Screen
            name="theme-picker"
            options={{
              title: SCREEN_TITLES.themePicker,
              presentation: 'formSheet',
              sheetGrabberVisible: true,
              sheetAllowedDetents: [1.0],
            }}
          />
          <Stack.Screen
            name="keep-goal"
            options={{
              title: SCREEN_TITLES.keepGoal,
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
      <ReminderTapRouting onboarded={onboarded} />
    </>
  );
}

// Opens Home when the weekly reminder is tapped (Phase 14); renders nothing. Mounted only once the
// navigator exists, so a tap that launched the app is routed after the first screen.
function ReminderTapRouting({ onboarded }: { onboarded: boolean }) {
  useReminderTapRouting(onboarded);
  return null;
}
