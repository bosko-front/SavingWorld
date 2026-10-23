import { Stack } from 'expo-router/stack';

export default function CollectionStackLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitleEnabled: true }}>
      <Stack.Screen name="collection" options={{ title: 'Collection' }} />
    </Stack>
  );
}
