import { useLocalSearchParams } from 'expo-router';

import { isEntityId } from '@/data/ids';
import { GoalFormScreen } from '@/features/goals/presentation/goal-form-screen';

// Create Goal, or Edit Goal with ?goalId=<id>. The route only validates its parameter.
export default function GoalFormRoute() {
  const { goalId } = useLocalSearchParams<{ goalId?: string }>();
  return <GoalFormScreen goalId={isEntityId(goalId) ? goalId : null} />;
}
