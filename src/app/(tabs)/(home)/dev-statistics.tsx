import { useLocalSearchParams } from 'expo-router';

// Development/test-only preview of the Statistics screen with fixture numbers (Phase 18), for layout
// checks on simulators without a Pro purchase. Guarded by Stack.Protected in the Home stack; the module
// is required only inside `if (__DEV__)`, so release bundles omit it. `?sample=flat|lower|large|negative`.
export default function DevStatisticsRoute() {
  const { sample } = useLocalSearchParams<{ sample?: string }>();
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { StatisticsPreview } = require('@/dev/statistics-preview') as typeof import('@/dev/statistics-preview');
    return <StatisticsPreview sample={sample === 'flat' || sample === 'lower' || sample === 'large' || sample === 'negative' ? sample : 'rising'} />;
  }
  return null;
}
