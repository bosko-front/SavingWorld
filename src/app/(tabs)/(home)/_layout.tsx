import { Link } from 'expo-router';
import { Stack } from 'expo-router/stack';

import { stackScreenOptions } from '@/shared/theme';
import { HeaderIconButton } from '@/shared/ui/header-button';

export const unstable_settings = {
  anchor: 'index',
};

export default function HomeStackLayout() {
  return (
    <Stack screenOptions={{ ...stackScreenOptions, headerLargeTitleEnabled: true }}>
      {/* Settings lives in Home's navigation bar (Phase 07.5 visual direction), not in the content. */}
      <Stack.Screen name="index" options={{ title: 'Home', headerRight: () => <SettingsButton /> }} />
      <Stack.Screen name="details" options={{ title: 'Details', headerLargeTitleEnabled: false }} />
      <Stack.Screen name="settings" options={{ title: 'Settings', headerLargeTitleEnabled: false }} />
      <Stack.Screen name="history" options={{ title: 'History', headerLargeTitleEnabled: false }} />
      {/* Development/test-only gallery and layout lab. Unreachable in release builds (__DEV__ false).
          The native database runner is a root route (src/app/dev-db.tsx). */}
      <Stack.Protected guard={__DEV__}>
        <Stack.Screen name="dev-gallery" options={{ title: 'Component gallery', headerLargeTitleEnabled: false }} />
        <Stack.Screen name="dev-layout" options={{ title: 'Layout lab', headerLargeTitleEnabled: false }} />
        <Stack.Screen name="dev-home" options={{ title: 'Home directions', headerLargeTitleEnabled: false }} />
      </Stack.Protected>
    </Stack>
  );
}

function SettingsButton() {
  return (
    <Link href="/settings" asChild>
      <HeaderIconButton icon="settings" accessibilityLabel="Settings" testID="home-settings" />
    </Link>
  );
}
