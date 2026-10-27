import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { frame, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

import type { EntryKind } from '@/core/money';
import { colors } from '@/shared/theme';

import { ENTRY_FIELD_COPY, KIND_LABEL } from './ledger-copy';

const KINDS: readonly EntryKind[] = ['deposit', 'withdrawal'];
// SwiftUI clamps a flexible frame to the width it is offered, so any large value means "fill".
const FILL_WIDTH = 10_000;

// Deposit or withdrawal as the native segmented control (@expo/ui Picker). The kind decides the
// sign; the amount itself is always typed as a positive number. The native control gives its own
// selection feedback, so no app haptic is added (DESIGN_SYSTEM "Haptics").
export function EntryKindPicker({ value, onChange }: { value: EntryKind; onChange: (kind: EntryKind) => void }) {
  // Full width and without a separate "Type" caption: the two segment words are the label, and the
  // Save button repeats the choice ("Save deposit" / "Save withdrawal").
  return (
    <Host matchContents={{ vertical: true }} style={styles.host} colorScheme="light" seedColor={colors.actionPrimary} testID="entry-kind">
      <Picker
        label={ENTRY_FIELD_COPY.kind}
        selection={value}
        onSelectionChange={(selection) => onChange(selection === 'withdrawal' ? 'withdrawal' : 'deposit')}
        // A segmented picker sizes to its words; the flexible frame lets it fill the host's width.
        modifiers={[pickerStyle('segmented'), frame({ maxWidth: FILL_WIDTH })]}>
        {KINDS.map((kind) => (
          <Text key={kind} modifiers={[tag(kind)]}>
            {KIND_LABEL[kind]}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    alignSelf: 'stretch',
  },
});
