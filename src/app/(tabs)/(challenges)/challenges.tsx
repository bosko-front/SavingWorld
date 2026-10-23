import { Screen } from '@/shared/layout';
import { EmptyState } from '@/shared/ui/empty-state';

// Challenges tab (catalog and attempts arrive in Phase 13). The native large title names the tab;
// the content explains what belongs here instead of a "will appear here" placeholder.
export default function ChallengesScreen() {
  return (
    <Screen centered>
      <EmptyState
        icon="challenges"
        title="Small steps toward a goal"
        message="Challenges are three fixed savings steps for an open goal: a first deposit, the next milestone and a weekly step. They count the savings you record; they never add money."
        testID="challenges-empty"
      />
    </Screen>
  );
}
