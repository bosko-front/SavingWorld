import { Stack } from 'expo-router/stack';

export default function ChallengesStackLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitleEnabled: true }}>
      <Stack.Screen name="challenges" options={{ title: 'Challenges' }} />
    </Stack>
  );
}
