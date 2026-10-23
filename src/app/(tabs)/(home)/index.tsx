import { PlaceholderScreen } from '@/shared/ui/placeholder-screen';
import { ShellLink } from '@/shared/ui/shell-link';

export default function HomeScreen() {
  return (
    <PlaceholderScreen
      title="Saving Worlds"
      description="Your savings goal and world will appear here.">
      <ShellLink href="/details" label="Open details" />
      <ShellLink href="/sample-form" label="Open sample form" />
      <ShellLink href="/settings" label="Settings" />
    </PlaceholderScreen>
  );
}
