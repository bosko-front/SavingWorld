import { StyleSheet, View } from 'react-native';

import { spacing } from '@/shared/theme';
import { FootnoteWithInfo } from '@/shared/ui/footnote-with-info';
import { ListGroup, ListRow } from '@/shared/ui/list-row';

import { LOCAL_DATA_COPY } from './settings-copy';

// Settings' "Your data" card (R23, Phase 19): two static rows that explain local storage and the
// lack of an in-app backup, and one short line with the full explanation behind its info button.
// No backup, export, import or sync control exists, so none is shown.
export function LocalDataSettings() {
  return (
    <View style={styles.section} testID="local-data-settings">
      <ListGroup>
        <ListRow
          icon="device"
          iconColor="blue"
          title={LOCAL_DATA_COPY.storedTitle}
          detail={LOCAL_DATA_COPY.storedDetail}
          testID="local-data-stored"
        />
        <ListRow
          icon="info"
          iconColor="neutral"
          title={LOCAL_DATA_COPY.lossTitle}
          detail={LOCAL_DATA_COPY.lossDetail}
          testID="local-data-loss"
        />
      </ListGroup>
      <FootnoteWithInfo
        text={LOCAL_DATA_COPY.footnote}
        infoTitle={LOCAL_DATA_COPY.infoTitle}
        infoMessage={LOCAL_DATA_COPY.infoMessage}
        testID="local-data-footnote"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
});
