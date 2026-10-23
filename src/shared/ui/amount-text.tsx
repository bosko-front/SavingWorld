import { StyleSheet } from 'react-native';

import { colors } from '@/shared/theme';

import { AppText } from './app-text';

export type AmountKind = 'balance' | 'deposit' | 'withdrawal';

type AmountTextProps = {
  // Display string produced by the shared money formatter (Phase 04). It must already contain the
  // currency and an explicit sign or word for withdrawals: color is only a supporting cue.
  formatted: string;
  kind?: AmountKind;
  // `display` is the Home saved amount; `large` a prominent amount elsewhere.
  size?: 'regular' | 'large' | 'display';
  accessibilityLabel?: string;
  testID?: string;
};

// Display styling for money amounts only. It never parses, rounds or calculates.
export function AmountText({ formatted, kind = 'balance', size = 'regular', accessibilityLabel, testID }: AmountTextProps) {
  return (
    <AppText
      role={size === 'display' ? 'display' : size === 'large' ? 'largeTitle' : 'headline'}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[styles.digits, kindStyles[kind]]}>
      {formatted}
    </AppText>
  );
}

const styles = StyleSheet.create({
  digits: {
    fontVariant: ['tabular-nums'],
  },
});

const kindStyles = StyleSheet.create({
  balance: { color: colors.textPrimary },
  deposit: { color: colors.moneyDeposit },
  withdrawal: { color: colors.moneyWithdrawal },
});
