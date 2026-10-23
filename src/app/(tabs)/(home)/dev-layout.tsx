import { useLocalSearchParams } from 'expo-router';

// Development/test-only layout lab (docs/ADAPTIVE_LAYOUT.md). Guarded by Stack.Protected in the
// Home stack; the module is required only inside `if (__DEV__)`, so release bundles omit it.
// `?focus=draft` focuses the draft field (also when the lab is already open), so keyboard and
// resize checks do not depend on simulator tap automation.
export default function DevLayoutRoute() {
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { LayoutLab } = require('@/dev/layout-lab') as typeof import('@/dev/layout-lab');
    return <LayoutLab focusDraft={focus === 'draft'} />;
  }
  return null;
}
