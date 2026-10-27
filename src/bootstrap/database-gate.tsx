import { useEffect, type ReactNode } from 'react';

import { useDatabaseStore } from './database-readiness';
import { releaseLaunchSplash, startFirstScreenWait } from './launch-splash';
import { StorageFailureScreen } from './storage-failure-screen';

// Renders the app only once the database is open and migrated (docs/ARCHITECTURE.md "Startup").
// The native splash stays up meanwhile, so no screen (and no mutation control) appears before the
// data is ready; once it is ready the first screen decides when the splash goes (launch-splash.ts).
export function DatabaseGate({ children }: { children: ReactNode }) {
  const state = useDatabaseStore((store) => store.state);
  const open = useDatabaseStore((store) => store.open);

  useEffect(() => {
    if (state.status === 'idle') {
      void open();
    }
  }, [state.status, open]);

  useEffect(() => {
    if (state.status === 'ready') {
      startFirstScreenWait();
    } else if (state.status === 'failed') {
      releaseLaunchSplash();
    }
  }, [state.status]);

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
