import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useAccessView } from '@/bootstrap/app-data';
import { spacing } from '@/shared/theme';
import { FootnoteWithInfo } from '@/shared/ui/footnote-with-info';
import { ListGroup, ListRow } from '@/shared/ui/list-row';

import { PRO_SETTINGS_COPY } from './billing-copy';

// Settings' Pro row (Phase 16, R21): one row that opens the Pro screen, which holds the purchase and
// Restore Purchases (one Restore in the app, owner decision D126); it says "Active" while Pro is on.
// One short line under it keeps the data limitation in Settings; the info button explains local
// data (D111 pattern).
export function ProSettings() {
  const router = useRouter();
  const access = useAccessView();
  const pro = access?.capabilities.level === 'pro';
  return (
    <View style={styles.section} testID="pro-settings">
      <ListGroup>
        <ListRow
          icon="pro"
          iconColor="honey"
          title={PRO_SETTINGS_COPY.title}
          detail={pro ? undefined : PRO_SETTINGS_COPY.inactiveDetail}
          value={pro ? PRO_SETTINGS_COPY.active : undefined}
          chevron
          onPress={() => router.push('/paywall')}
          testID="pro-settings-status"
        />
      </ListGroup>
      <FootnoteWithInfo
        text={PRO_SETTINGS_COPY.footnote}
        infoTitle={PRO_SETTINGS_COPY.infoTitle}
        infoMessage={PRO_SETTINGS_COPY.infoMessage}
        testID="pro-settings-footnote"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
});
