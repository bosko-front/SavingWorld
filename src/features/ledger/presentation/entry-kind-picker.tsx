import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';

import type { EntryKind } from '@/core/money';
import { colors, spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Icon } from '@/shared/ui/icon';

import { KIND_LABEL } from './ledger-copy';

const KINDS: readonly EntryKind[] = ['deposit', 'withdrawal'];

// Deposit or withdrawal as the native segmented control (@expo/ui Picker). The kind decides the
// sign; the amount itself is always typed as a positive number. The native control gives its own
// selection feedback, so no app haptic is added (DESIGN_SYSTEM "Haptics").
export function EntryKindPicker({ value, onChange }: { value: EntryKind; onChange: (kind: EntryKind) => void }) {
  return (
    <View style={styles.container}>
      <AppText role="label" accessibilityElementsHidden>
        Type
      </AppText>
      <Host matchContents style={styles.host} colorScheme="light" seedColor={colors.actionPrimary} testID="entry-kind">
        <Picker
          label="Entry type"
          selection={value}
          onSelectionChange={(selection) => onChange(selection === 'withdrawal' ? 'withdrawal' : 'deposit')}
          modifiers={[pickerStyle('segmented')]}>
          {KINDS.map((kind) => (
            <Text key={kind} modifiers={[tag(kind)]}>
              {KIND_LABEL[kind]}
            </Text>
          ))}
        </Picker>
      </Host>
      <View style={styles.summary}>
        <Icon name={value} role="footnote" tone="secondary" />
        <AppText role="footnote" tone="secondary" testID="entry-kind-summary">
          {value === 'deposit' ? 'Adds to this goal’s savings.' : 'Takes money out of this goal’s savings.'}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  host: {
    alignSelf: 'stretch',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
