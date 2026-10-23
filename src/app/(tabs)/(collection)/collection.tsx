import { Screen } from '@/shared/layout';
import { AppText } from '@/shared/ui/app-text';

export default function CollectionScreen() {
  return (
    <Screen>
      <AppText role="title" accessibilityRole="header">
        Collection
      </AppText>
      <AppText tone="secondary">Completed worlds and closed goals will appear here.</AppText>
    </Screen>
  );
}
