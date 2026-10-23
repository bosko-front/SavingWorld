import { useAppDataStore } from '@/bootstrap/app-data';
import { ClosedGoals } from '@/features/goals/presentation/closed-goals';
import { Screen } from '@/shared/layout';

// Collection tab: finished (completed) goals with Reopen and Delete (Phase 06, D74); souvenirs and
// finished worlds join in Phase 11. The native large title names the tab, so the content does not
// repeat it. With nothing finished yet, the empty state sits in the middle of the screen.
export default function CollectionScreen() {
  const empty = useAppDataStore(
    (store) =>
      store.state.status === 'ready' &&
      !store.state.data.goals.goals.some(({ goal }) => goal.status === 'completed'),
  );
  return (
    <Screen centered={empty}>
      <ClosedGoals />
    </Screen>
  );
}
