import { Stack } from 'expo-router/stack';

export { ErrorBoundary } from 'expo-router';

// Single navigation owner: one Expo Router hierarchy. Native tabs live in (tabs); app-wide forms
// are presented above the tabs as native sheets from this root Stack.
export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="sample-form"
        options={{
          title: 'Sample form',
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.5, 1.0],
        }}
      />
    </Stack>
  );
}
