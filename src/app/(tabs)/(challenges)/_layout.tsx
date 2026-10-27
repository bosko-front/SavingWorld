import { Stack } from 'expo-router/stack';

import { stackScreenOptions } from '@/shared/theme';
import { SCREEN_TITLES } from '@/shared/i18n/navigation-copy';

export default function ChallengesStackLayout() {
  return (
    <Stack screenOptions={{ ...stackScreenOptions, headerLargeTitleEnabled: true }}>
      <Stack.Screen name="challenges" options={{ title: SCREEN_TITLES.challenges }} />
    </Stack>
  );
}
