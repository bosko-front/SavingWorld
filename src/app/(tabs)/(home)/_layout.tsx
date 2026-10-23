import { Stack } from 'expo-router/stack';

export const unstable_settings = {
  anchor: 'index',
};

export default function HomeStackLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitleEnabled: true }}>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="details" options={{ title: 'Details', headerLargeTitleEnabled: false }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}
