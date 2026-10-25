import { useLocalSearchParams } from 'expo-router';

import { isEntityId } from '@/data/ids';
import { SouvenirScreen } from '@/features/collection/presentation/souvenir-screen';

// One goal's souvenir and current state with ?goalId=<id>. The route only validates its parameter.
export default function SouvenirRoute() {
  const { goalId } = useLocalSearchParams<{ goalId?: string }>();
  return <SouvenirScreen goalId={isEntityId(goalId) ? goalId : ''} />;
}
