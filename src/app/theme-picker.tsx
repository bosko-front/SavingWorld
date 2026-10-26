import { useLocalSearchParams } from 'expo-router';

import { isEntityId } from '@/data/ids';
import { ThemePickerScreen } from '@/features/goals/presentation/theme-picker-screen';

// The world picker of an open goal, ?goalId=<id> (Phase 17). The route only validates its parameter.
export default function ThemePickerRoute() {
  const { goalId } = useLocalSearchParams<{ goalId?: string }>();
  return <ThemePickerScreen goalId={isEntityId(goalId) ? goalId : null} />;
}
