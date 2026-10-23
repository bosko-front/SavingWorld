import { Screen } from '@/shared/layout';
import { AppText } from '@/shared/ui/app-text';

export default function ChallengesScreen() {
  return (
    <Screen>
      <AppText role="title" accessibilityRole="header">
        Challenges
      </AppText>
      <AppText tone="secondary">Fixed savings challenges and their results will appear here.</AppText>
    </Screen>
  );
}
