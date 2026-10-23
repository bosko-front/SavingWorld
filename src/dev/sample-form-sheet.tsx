import { useRouter } from 'expo-router';
import { useState } from 'react';

import { FormScreen } from '@/shared/layout';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { Notice } from '@/shared/ui/notice';
import { TextField } from '@/shared/ui/text-field';

import { useMountCount } from './mount-count';

// Development/test-only controlled form in a native form sheet. The draft lives in this route-level
// component, above FormScreen, so detent changes, resizing and rotation re-lay out the sheet
// without resetting it. "Pretend save" only counts presses; nothing is parsed or stored.
export function SampleFormSheet() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [pretendSaves, setPretendSaves] = useState(0);
  const mounts = useMountCount('sample-form-sheet');

  return (
    <FormScreen testID="sample-form-sheet">
      <AppText role="title" accessibilityRole="header">
        Native form sheet
      </AppText>
      <AppText tone="secondary">
        Development sample. Type a draft, then drag the sheet, rotate or resize the window: the text stays and nothing is
        submitted.
      </AppText>
      <TextField
        label="Sample amount (draft only)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        hint="Raw text; not parsed or saved."
        testID="sample-form-amount"
      />
      <TextField
        label="Sample note"
        value={note}
        onChangeText={setNote}
        multiline
        placeholder="Optional"
        testID="sample-form-note"
      />
      <Notice
        tone="info"
        title={`Pretend saves: ${pretendSaves}`}
        message={`Form mounted ${mounts} time${mounts === 1 ? '' : 's'}. Layout changes must not change either number.`}
      />
      <Button label="Pretend save" onPress={() => setPretendSaves((count) => count + 1)} />
      <Button label="Done" variant="secondary" onPress={() => router.back()} />
    </FormScreen>
  );
}
