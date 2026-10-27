import { Screen } from '@/shared/layout';
import { AppText } from '@/shared/ui/app-text';

// Development/test-only screen the layout lab pushes (Phase 03). Guarded by Stack.Protected in the
// Home stack; its content is inside `if (__DEV__)`, so release bundles carry only an empty stub.
export default function DetailsScreen() {
  if (__DEV__) {
    return (
      <Screen>
        <AppText role="title" accessibilityRole="header">
          Detail screen
        </AppText>
        <AppText tone="secondary">
          Detail screens are pushed onto the tab&apos;s native stack. Use Back to return.
        </AppText>
      </Screen>
    );
  }
  return null;
}
