// Development/test-only reminder lab (Phase 14). Guarded by Stack.Protected in the Home stack; the
// module is required only inside `if (__DEV__)`, so release bundles omit it.
export default function DevReminderRoute() {
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ReminderLab } = require('@/dev/reminder-lab') as typeof import('@/dev/reminder-lab');
    return <ReminderLab />;
  }
  return null;
}
