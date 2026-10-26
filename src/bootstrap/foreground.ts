import { useEffect } from 'react';
import { AppState } from 'react-native';

import { closeEndedChallengeAttempts, reconcileCivilDate } from './app-data';

// Each return to the foreground re-reads the civil date (after midnight, a time-zone change or a
// manual clock change) and refreshes the committed snapshot when the date moved, so date-dependent
// values such as the deadline pace are recalculated. Weekly step attempts whose saved week ended are
// settled first (Phase 12). Later phases add their own foreground work (reminder intent, StoreKit)
// next to this.
export function useForegroundReconciliation(): void {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void closeEndedChallengeAttempts()
          .catch(() => false)
          .then(() => reconcileCivilDate());
      }
    });
    return () => subscription.remove();
  }, []);
}
