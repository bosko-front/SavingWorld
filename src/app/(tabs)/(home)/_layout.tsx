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
      {/* Settings lives in Home's navigation bar (Phase 07.5 visual direction), not in the content.
          Home shows no title and no bar, only the gear: the world is the first thing on screen
          (owner review, D78). The transparent bar keeps the scroll view full height under it, as the
          large title did, so the scene keeps its size. `title` still names the screen for the back
          button of pushed screens. */}
      <Stack.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: '',
          headerLargeTitleEnabled: false,
          headerTransparent: true,
          headerShadowVisible: false,
          headerRight: () => <SettingsButton />,
        }}
      />
      <Stack.Screen name="details" options={{ title: 'Details', headerLargeTitleEnabled: false }} />
      <Stack.Screen name="settings" options={{ title: 'Settings', headerLargeTitleEnabled: false }} />
      <Stack.Screen name="history" options={{ title: 'History', headerLargeTitleEnabled: false }} />
      {/* Phase 18: the one Pro Statistics screen ("your savings at a glance", D97). */}
      <Stack.Screen
        name="statistics"
        options={{ title: 'Savings insights', headerLargeTitleEnabled: false, headerBackButtonDisplayMode: 'minimal' }}
      />
      {/* Development/test-only gallery and layout lab. Unreachable in release builds (__DEV__ false).
          The native database runner is a root route (src/app/dev-db.tsx). */}
      <Stack.Protected guard={__DEV__}>
        <Stack.Screen name="dev-gallery" options={{ title: 'Component gallery', headerLargeTitleEnabled: false }} />
        <Stack.Screen name="dev-layout" options={{ title: 'Layout lab', headerLargeTitleEnabled: false }} />
        <Stack.Screen name="dev-home" options={{ title: 'Home directions', headerLargeTitleEnabled: false }} />
        <Stack.Screen name="dev-world" options={{ title: 'World inspector', headerLargeTitleEnabled: false }} />
        <Stack.Screen name="dev-reminder" options={{ title: 'Reminder lab', headerLargeTitleEnabled: false }} />
        <Stack.Screen name="dev-store" options={{ title: 'Store lab', headerLargeTitleEnabled: false }} />
        <Stack.Screen
          name="dev-statistics"
          options={{ title: 'Savings insights', headerLargeTitleEnabled: false, headerBackButtonDisplayMode: 'minimal' }}
        />
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
