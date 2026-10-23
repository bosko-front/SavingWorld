import { useEffect } from 'react';
import { AppState } from 'react-native';

import { reconcileCivilDate } from './app-data';

// Each return to the foreground re-reads the civil date (after midnight, a time-zone change or a
// manual clock change) and refreshes the committed snapshot when the date moved, so date-dependent
// values such as the deadline pace are recalculated. Later phases add their own foreground work
// (expired challenge attempts, reminder intent, StoreKit) next to this.
export function useForegroundReconciliation(): void {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void reconcileCivilDate();
      }
    });
    return () => subscription.remove();
  }, []);
}
