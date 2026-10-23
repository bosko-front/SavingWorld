import { useLocalSearchParams } from 'expo-router';

import { isEntityId } from '@/data/ids';
import { HistoryScreen } from '@/features/ledger/presentation/history-screen';

// History of one goal with ?goalId=<id>. The route only validates its parameter.
export default function HistoryRoute() {
  const { goalId } = useLocalSearchParams<{ goalId?: string }>();
  return <HistoryScreen goalId={isEntityId(goalId) ? goalId : ''} />;
}
