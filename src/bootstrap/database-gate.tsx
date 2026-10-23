import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type ReactNode } from 'react';

import { useDatabaseStore } from './database-readiness';
import { StorageFailureScreen } from './storage-failure-screen';

// Keep the native splash up while the database opens and migrates, so no screen (and no mutation
// control) appears before the data is ready. A rejected call only means the splash was already
// gone, which changes nothing about readiness.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Renders the app only once the database is open and migrated (docs/ARCHITECTURE.md "Startup").
export function DatabaseGate({ children }: { children: ReactNode }) {
  const state = useDatabaseStore((store) => store.state);
  const open = useDatabaseStore((store) => store.open);

  useEffect(() => {
    if (state.status === 'idle') {
      void open();
    }
  }, [state.status, open]);

  const settled = state.status === 'ready' || state.status === 'failed';
  useEffect(() => {
    if (settled) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [settled]);

  if (state.status === 'ready') {
    return children;
  }
  if (state.status === 'failed') {
    return <StorageFailureScreen code={state.code} retrying={false} onRetry={() => void open()} />;
  }
  if (state.status === 'opening' && state.previousFailure) {
    return <StorageFailureScreen code={state.previousFailure} retrying onRetry={() => undefined} />;
  }
  return null;
}
