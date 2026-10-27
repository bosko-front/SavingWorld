import { Stack } from 'expo-router/stack';

import { stackScreenOptions } from '@/shared/theme';
import { SCREEN_TITLES } from '@/shared/i18n/navigation-copy';

export default function CollectionStackLayout() {
  return (
    <Stack screenOptions={{ ...stackScreenOptions, headerLargeTitleEnabled: true }}>
      <Stack.Screen name="collection" options={{ title: SCREEN_TITLES.collection }} />
      {/* The screen sets the goal's title. Like Home, the bar is transparent over the souvenir's sky
          (owner review after D98), and Back shows only its chevron. */}
      <Stack.Screen
        name="souvenir"
        options={{
          title: SCREEN_TITLES.souvenir,
          headerLargeTitleEnabled: false,
          headerTransparent: true,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
    </Stack>
  );
}
