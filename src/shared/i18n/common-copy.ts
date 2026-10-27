// English catalog: words shared by several screens (Phase 19, docs/UI_UX_GUIDELINES.md
// "Accessibility and localization"). Feature-specific text lives in each feature's *-copy.ts module;
// only text that means the same everywhere belongs here. The interface is English only; numbers and
// dates follow the device region through the shared formatters.
export const COMMON_COPY = {
  tryAgain: 'Try again',
  cancel: 'Cancel',
  close: 'Close',
  done: 'Done',
  notSaved: 'Not saved',
  createGoal: 'Create a goal',
  addSavings: 'Add savings',
  nothingChangedTryAgain: 'Nothing was changed. Try again.',
  currencyUnreadableTitle: 'Your currency can’t be read',
  currencyUnreadableMessage:
    'The saved currency doesn’t match this version of the app. Nothing was changed. Update Saving Worlds to continue.',
  notAvailable: 'Not available',
} as const;

