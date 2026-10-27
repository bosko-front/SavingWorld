import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { supportedCurrencies } from '@/core/money';
import { colors, spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';

import { CURRENCY_EDITOR_COPY } from './currency-copy';

type CurrencyPickerProps = {
  value: string;
  onChange: (code: string) => void;
  testID?: string;
};

export function currencyLabel(code: string, name: string): string {
  return `${code} – ${name}`;
}

// The global currency choice: the native SwiftUI menu picker from @expo/ui (DESIGN_SYSTEM UX
// library plan) over the bundled ISO 4217 registry, ordered by code. Used by onboarding and by
// Settings while the currency is unlocked; never by a goal form.
export function CurrencyPicker({ value, onChange, testID }: CurrencyPickerProps) {
  const options = useMemo(() => supportedCurrencies(), []);
  return (
    <View style={styles.container}>
      <AppText role="label" accessibilityElementsHidden>
        {CURRENCY_EDITOR_COPY.title}
      </AppText>
      <Host matchContents style={styles.host} colorScheme="light" seedColor={colors.actionPrimary} testID={testID}>
        <Picker label={CURRENCY_EDITOR_COPY.title} selection={value} onSelectionChange={onChange} modifiers={[pickerStyle('menu')]}>
          {options.map((currency) => (
            <Text key={currency.code} modifiers={[tag(currency.code)]}>
              {currencyLabel(currency.code, currency.name)}
            </Text>
          ))}
        </Picker>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  host: {
    alignSelf: 'flex-start',
  },
});
