import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { currencyCommandDeps, refreshAppData, useAppDataStore } from '@/bootstrap/app-data';
import { getCurrency, type CurrencyMetadata } from '@/core/money';
import { randomUuid } from '@/data/ids';
import { spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Icon } from '@/shared/ui/icon';
import { Notice } from '@/shared/ui/notice';
import { haptics } from '@/shared/ui/haptics';
import { showToast } from '@/shared/ui/toast';

import { setGlobalCurrency } from '../application/currency-commands';
import type { CurrencyOverview } from '../application/settings-queries';

import { CURRENCY_LOCK_EXPLANATION, currencyErrorMessage, noConversionMessage } from './currency-copy';
import { currencyLabel, CurrencyPicker } from './currency-picker';

// Settings is the only place to change the global currency after onboarding (v1.2 section 3). The
// picker appears only while nothing locks the currency; the person confirms a native alert that
// explains no conversion happens, and the command rechecks the lock inside its own transaction.
export function CurrencySettings() {
  const state = useAppDataStore((store) => store.state);
  if (state.status !== 'ready') {
    return null;
  }
  const { currency } = state.data;
  if (currency.currency.status !== 'set') {
    return (
      <Notice
        tone="error"
        title="Currency can’t be read"
        message="The saved currency doesn’t match this version of the app. Nothing was changed."
      />
    );
  }
  return (
    <CurrencyEditor
      key={currency.currency.currency.code}
      overview={currency}
      current={currency.currency.currency}
      goalCount={state.data.goals.goals.length}
      goalTitle={(goalId) => state.data.goals.goals.find(({ goal }) => goal.id === goalId)?.goal.title ?? 'A goal'}
    />
  );
}

type CurrencyEditorProps = {
  overview: CurrencyOverview;
  current: CurrencyMetadata;
  goalCount: number;
  goalTitle: (goalId: string) => string;
};

function CurrencyEditor({ overview, current, goalCount, goalTitle }: CurrencyEditorProps) {
  const [code, setCode] = useState(current.code);
  const [operationId, setOperationId] = useState(randomUuid);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = getCurrency(code);

  const change = async (to: CurrencyMetadata) => {
    setSaving(true);
    setError(null);
    const result = await setGlobalCurrency(currencyCommandDeps(), { operationId, currencyCode: to.code });
    await refreshAppData();
    setSaving(false);
    if (!result.ok) {
      setError(currencyErrorMessage(result.error, to, goalTitle));
      return;
    }
    setOperationId(randomUuid());
    showToast({ tone: 'success', title: `Currency changed to ${to.code}` });
    haptics.success();
  };

  const confirm = () => {
    if (!next || next.code === current.code) {
      return;
    }
    Alert.alert(`Change currency to ${next.code}?`, noConversionMessage(current, next, goalCount), [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Change', onPress: () => void change(next) },
    ]);
  };

  return (
    <Card testID="currency-settings">
      <AppText role="headline" testID="currency-current">
        {currencyLabel(current.code, current.name)}
      </AppText>
      {overview.locked ? (
        <View style={styles.lockRow} accessible testID="currency-locked">
          <Icon name="lock" role="footnote" tone="secondary" />
          <AppText role="footnote" tone="secondary" style={styles.lockText}>
            {CURRENCY_LOCK_EXPLANATION}
          </AppText>
        </View>
      ) : (
        <>
          <AppText role="footnote" tone="secondary">
            You can change the currency while no goal has a saved transaction or souvenir. Amounts are never converted.
          </AppText>
          <CurrencyPicker value={code} onChange={setCode} testID="settings-currency" />
          {error ? <Notice tone="error" title="Currency not changed" message={error} testID="currency-error" /> : null}
          {/* Shown once a different currency is picked, so the screen never rests on a disabled button. */}
          {next && next.code !== current.code ? (
            <Button label={`Change to ${next.code}`} variant="secondary" onPress={confirm} loading={saving} testID="currency-change" />
          ) : null}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  lockRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  lockText: {
    flexShrink: 1,
  },
});
