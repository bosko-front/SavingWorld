import { COMMON_COPY } from '@/shared/i18n/common-copy';
import { Screen } from '@/shared/layout';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { Notice } from '@/shared/ui/notice';

import type { DatabaseFailureCode } from './database-readiness';
import { STORAGE_FAILURE_COPY, storageErrorCode } from './storage-failure-copy';

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
        {STORAGE_FAILURE_COPY.title}
      </AppText>
      <AppText>{newer ? STORAGE_FAILURE_COPY.newerSchema : STORAGE_FAILURE_COPY.cannotOpen}</AppText>
      <AppText>{STORAGE_FAILURE_COPY.nothingDeleted}</AppText>
      {newer ? null : <AppText tone="secondary">{STORAGE_FAILURE_COPY.retryAdvice}</AppText>}
      <Notice tone="error" title={STORAGE_FAILURE_COPY.noticeTitle} message={storageErrorCode(code)} />
      <Button label={COMMON_COPY.tryAgain} onPress={onRetry} loading={retrying} />
    </Screen>
  );
}
