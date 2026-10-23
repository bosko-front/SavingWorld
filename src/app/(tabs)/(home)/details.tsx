import { Screen } from '@/shared/layout';
import { AppText } from '@/shared/ui/app-text';

export default function DetailsScreen() {
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
