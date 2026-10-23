// Development/test-only route: a controlled sample form in a native form sheet. The root layout
// guards it with Stack.Protected, and the module is required only inside `if (__DEV__)`, so release
// bundles do not contain it (same pattern as dev-gallery, DECISIONS D39/D45).
export default function SampleFormRoute() {
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SampleFormSheet } = require('@/dev/sample-form-sheet') as typeof import('@/dev/sample-form-sheet');
    return <SampleFormSheet />;
  }
  return null;
}
