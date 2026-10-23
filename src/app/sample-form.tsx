import { useRouter } from 'expo-router';
import { Button } from 'react-native';

import { PlaceholderScreen } from '@/shared/ui/placeholder-screen';

// Temporary Phase 01 route proving native sheet presentation and dismissal. It has no fields and
// writes nothing; the real shared transaction form arrives in Phase 07.
export default function SampleFormScreen() {
  const router = useRouter();
  return (
    <PlaceholderScreen
      title="Native form sheet"
      description="Forms will be presented here as native sheets above the tabs.">
      <Button title="Done" onPress={() => router.back()} />
    </PlaceholderScreen>
  );
}
