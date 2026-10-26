// Development/test-only Store lab (Phase 15). Guarded by Stack.Protected in the Home stack; the
// module is required only inside `if (__DEV__)`, so release bundles omit it.
export default function DevStoreRoute() {
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { StoreLab } = require('@/dev/store-lab') as typeof import('@/dev/store-lab');
    return <StoreLab />;
  }
  return null;
}
