import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { create } from 'zustand';

import { reconcileWeeklyReminder, type ReminderStatus } from '@/features/reminders/application/reminder-reconciler';
import type { ReminderPermission } from '@/features/reminders/domain/weekly-reminder';
import {
  configureReminderPresentation,
  expoReminderGateway,
  subscribeToReminderTaps,
  takeLaunchReminderTap,
} from '@/features/reminders/native/notification-gateway';

import { appClock, useAppDataStore } from './app-data';
import { useDatabaseStore } from './database-readiness';

// App-side driver of the one weekly reminder (Phase 14). Reconciliation runs after every refresh of
// the committed snapshot (each command refreshes it after its commit, so a goal created, paused,
// resumed, finished, reopened or deleted and the Settings switch are all covered), at launch (the
// first refresh) and on every return to the foreground (permission changed in iOS Settings, a new
// time zone). Runs are serialized: one at a time, and calls made meanwhile share one follow-up run
// that reads the newest state. A failure is recorded and retried by the next trigger; it never
// blocks a screen or touches savings.

type ReminderStore = { status: ReminderStatus | null };

export const useReminderStore = create<ReminderStore>()(() => ({ status: null }));

let running: Promise<ReminderStatus | null> | null = null;
let queued: Promise<ReminderStatus | null> | null = null;

async function runOnce(): Promise<ReminderStatus | null> {
  const database = useDatabaseStore.getState().state;
  if (database.status !== 'ready') {
    return null;
  }
  try {
    const status = await reconcileWeeklyReminder({ db: database.db, clock: appClock(), gateway: expoReminderGateway });
    useReminderStore.setState({ status });
    return status;
  } catch (error) {
    if (__DEV__) {
      // Development diagnostics only; messages come from SQLite, never user data.
      console.warn(`[reminders] reconcile failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return null;
  }
}

export function reconcileReminders(): Promise<ReminderStatus | null> {
  if (queued) {
    return queued;
  }
  if (!running) {
    running = runOnce().finally(() => {
      running = null;
    });
    return running;
  }
  const next = running.then(() => {
    queued = null;
    running = runOnce().finally(() => {
      running = null;
    });
    return running;
  });
  queued = next;
  return next;
}

// Asks iOS for permission (only when the person has not answered yet). Called by the Settings switch
// right after the opt-in commit, never at launch.
export async function requestReminderPermission(): Promise<ReminderPermission | null> {
  try {
    return await expoReminderGateway.requestPermission();
  } catch {
    return null;
  }
}

// Mounted once by the root navigator: reconcile after each committed refresh.
export function useReminderReconciliation(): void {
  const version = useAppDataStore((store) => store.version);
  useEffect(() => {
    configureReminderPresentation();
  }, []);
  useEffect(() => {
    if (version > 0) {
      void reconcileReminders();
    }
  }, [version]);
}

// Routes kept as they are when the reminder is tapped: an open form sheet holds a draft the person
// has not saved.
const KEEP_ROUTES = ['/entry-form', '/goal-form'];

// A tap on the reminder opens Home, which shows the selected goal (or its fallback) as usual. It
// never selects, resumes or changes a goal. A tap that launched the app is taken once.
export function useReminderTapRouting(onboarded: boolean): void {
  const pathname = usePathname();
  const current = useRef(pathname);
  useEffect(() => {
    current.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!onboarded) {
      return;
    }
    const openHome = () => {
      if (current.current !== '/' && !KEEP_ROUTES.includes(current.current)) {
        router.navigate('/');
      }
    };
    if (takeLaunchReminderTap()) {
      openHome();
    }
    return subscribeToReminderTaps(openHome);
  }, [onboarded]);
}
