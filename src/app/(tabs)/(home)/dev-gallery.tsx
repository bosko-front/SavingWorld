// Development/test-only route. The Home stack layout guards it with Stack.Protected, and the gallery
// module is required only inside `if (__DEV__)`, which Metro folds away in release bundles, so
// the gallery code is not shipped (verified by a release export in docs/evidence/PHASE_02.md).
export default function DevGalleryRoute() {
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ComponentGallery } = require('@/dev/component-gallery') as typeof import('@/dev/component-gallery');
    return <ComponentGallery />;
  }
  return null;
}
