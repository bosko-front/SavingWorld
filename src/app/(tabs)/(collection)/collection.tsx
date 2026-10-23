import { ClosedGoals } from '@/features/goals/presentation/closed-goals';
import { Screen } from '@/shared/layout';
import { AppText } from '@/shared/ui/app-text';

export default function CollectionScreen() {
  return (
    <Screen>
      <AppText role="title" accessibilityRole="header">
        Collection
      </AppText>
      <AppText tone="secondary">Souvenirs from finished worlds will appear here.</AppText>
      <ClosedGoals />
    </Screen>
  );
}
