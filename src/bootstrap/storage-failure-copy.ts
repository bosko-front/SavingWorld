// English copy for the storage failure screen shown instead of the app when the local database
// can't be opened or migrated (Phase 05): nothing was deleted, a retry, and a redacted support code.
export const STORAGE_FAILURE_COPY = {
  title: 'Your savings couldn’t be opened',
  newerSchema: 'This data was saved by a newer version of Saving Worlds. Update the app to open it.',
  cannotOpen: 'Saving Worlds couldn’t open the savings data stored on this iPhone.',
  nothingDeleted: 'Nothing was changed or deleted. Your goals and entries are still on this device.',
  retryAdvice: 'Try again. If this keeps happening, restart your iPhone and open the app again.',
  noticeTitle: 'Data not opened',
} as const;

// The redacted support code: "Error code: SW-DB-NEWER_SCHEMA".
export function storageErrorCode(code: string): string {
  return `Error code: SW-DB-${code.toUpperCase()}`;
}
