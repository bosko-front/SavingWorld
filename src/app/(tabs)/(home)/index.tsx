import { Link } from 'expo-router';

import { Button } from '@/shared/ui/button';
import { PlaceholderScreen } from '@/shared/ui/placeholder-screen';

export default function HomeScreen() {
  return (
    <PlaceholderScreen
      title="Saving Worlds"
      description="Your savings goal and world will appear here.">
      <Link href="/details" asChild>
        <Button label="Open details" variant="secondary" />
      </Link>
      <Link href="/sample-form" asChild>
        <Button label="Open sample form" variant="secondary" />
      </Link>
      <Link href="/settings" asChild>
        <Button label="Settings" variant="plain" />
      </Link>
    </PlaceholderScreen>
  );
}
