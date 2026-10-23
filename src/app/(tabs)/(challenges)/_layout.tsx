import { Stack } from 'expo-router/stack';

import { stackScreenOptions } from '@/shared/theme';

export default function ChallengesStackLayout() {
  return (
    <Stack screenOptions={{ ...stackScreenOptions, headerLargeTitleEnabled: true }}>
      <Stack.Screen name="challenges" options={{ title: 'Challenges' }} />
    </Stack>
  );
}
