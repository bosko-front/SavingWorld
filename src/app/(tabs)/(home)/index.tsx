import { Link } from 'expo-router';

import { Screen } from '@/shared/layout';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';

// Temporary Home shell. Phase 08 replaces it with the goal dashboard on AdaptiveGoalLayout.
export default function HomeScreen() {
  return (
    <Screen>
      <AppText role="title" accessibilityRole="header">
        Saving Worlds
      </AppText>
      <AppText tone="secondary">Your savings goal and world will appear here.</AppText>
      <Link href="/details" asChild>
        <Button label="Open details" variant="secondary" />
      </Link>
      {__DEV__ ? (
        <Link href="/sample-form" asChild>
          <Button label="Open sample form (development only)" variant="secondary" />
        </Link>
      ) : null}
      <Link href="/settings" asChild>
        <Button label="Settings" variant="plain" />
      </Link>
    </Screen>
  );
}
