import { Stack } from 'expo-router/stack';

import { stackScreenOptions } from '@/shared/theme';

export default function CollectionStackLayout() {
  return (
    <Stack screenOptions={{ ...stackScreenOptions, headerLargeTitleEnabled: true }}>
      <Stack.Screen name="collection" options={{ title: 'Collection' }} />
    </Stack>
  );
}
