import { useEffect } from 'react';
import { AppState } from 'react-native';

import { closeEndedChallengeAttempts, reconcileCivilDate } from './app-data';
import { reconcileReminders } from './reminders';

// Each return to the foreground re-reads the civil date (after midnight, a time-zone change or a
// manual clock change) and refreshes the committed snapshot when the date moved, so date-dependent
// values such as the deadline pace are recalculated. Weekly step attempts whose saved week ended are
// settled first (Phase 12). The weekly reminder is reconciled independently (Phase 14): the
// permission may have changed in iOS Settings while the app was away. Later phases add their own
// foreground work (StoreKit) next to this.
export function useForegroundReconciliation(): void {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void closeEndedChallengeAttempts()
          .catch(() => false)
          .then(() => reconcileCivilDate());
        void reconcileReminders();
      }
    });
    return () => subscription.remove();
  }, []);
}
