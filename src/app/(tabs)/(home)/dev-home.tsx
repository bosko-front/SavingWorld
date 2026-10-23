import { useLocalSearchParams } from 'expo-router';

// Development/test-only Home direction mocks (Phase 07.5). Guarded by Stack.Protected in the Home
// stack; the module is required only inside `if (__DEV__)`, so release bundles omit it.
// `?option=a|b|c` picks the composition and `?sample=paused` shows the paused sample.
export default function DevHomeRoute() {
  const { option, sample } = useLocalSearchParams<{ option?: string; sample?: string }>();
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { HomeDirections } = require('@/dev/home-directions') as typeof import('@/dev/home-directions');
    return (
      <HomeDirections
        option={option === 'b' || option === 'c' ? option : 'a'}
        sample={sample === 'paused' ? 'paused' : 'progress'}
      />
    );
  }
  return null;
}
