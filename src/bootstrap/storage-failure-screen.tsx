import { Screen } from '@/shared/layout';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { Notice } from '@/shared/ui/notice';

import type { DatabaseFailureCode } from './database-readiness';

type StorageFailureScreenProps = {
  code: DatabaseFailureCode;
  retrying: boolean;
  onRetry: () => void;
};

// Shown instead of the app when the local database cannot be opened or migrated. It explains that
// nothing was deleted, offers a retry and shows a redacted code for support. There is deliberately
// no reset, delete or "start over" action (docs/DATA_MODEL.md "Write invariants").
export function StorageFailureScreen({ code, retrying, onRetry }: StorageFailureScreenProps) {
  const newer = code === 'newer_schema';
  return (
    <Screen testID="storage-failure">
      <AppText role="title" accessibilityRole="header">
        Your savings couldn’t be opened
      </AppText>
      <AppText>
        {newer
          ? 'This data was saved by a newer version of Saving Worlds. Update the app to open it.'
          : 'Saving Worlds couldn’t open the savings data stored on this iPhone.'}
      </AppText>
      <AppText>Nothing was changed or deleted. Your goals and entries are still on this device.</AppText>
      {newer ? null : (
        <AppText tone="secondary">Try again. If this keeps happening, restart your iPhone and open the app again.</AppText>
      )}
      <Notice tone="error" title="Data not opened" message={`Error code: SW-DB-${code.toUpperCase()}`} />
      <Button label="Try again" onPress={onRetry} loading={retrying} />
    </Screen>
  );
}
