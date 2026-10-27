import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { currencyCommandDeps, refreshAppData, useAppDataStore } from '@/bootstrap/app-data';
import { getCurrency, type CurrencyMetadata } from '@/core/money';
import { randomUuid } from '@/data/ids';
import { COMMON_COPY } from '@/shared/i18n/common-copy';
import { spacing } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { FootnoteWithInfo } from '@/shared/ui/footnote-with-info';
import { ListCell, ListGroup, ListRow } from '@/shared/ui/list-row';
import { Notice } from '@/shared/ui/notice';
import { haptics } from '@/shared/ui/haptics';
import { showToast } from '@/shared/ui/toast';

import { setGlobalCurrency } from '../application/currency-commands';
import type { CurrencyOverview } from '../application/settings-queries';

import { CURRENCY_EDITOR_COPY, CURRENCY_SETTINGS_COPY, currencyErrorMessage, noConversionMessage } from './currency-copy';
import { currencyLabel, CurrencyPicker } from './currency-picker';

// Settings is the only place to change the global currency after onboarding (v1.2 section 3). The
// picker appears only while nothing locks the currency; the person confirms a native alert that
// explains no conversion happens, and the command rechecks the lock inside its own transaction.
// Presented as one grouped settings row ("Preferences", D110) with one short line under the group
// and the full rule behind its info button (D111).
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
        title={CURRENCY_EDITOR_COPY.unreadableTitle}
        message={CURRENCY_EDITOR_COPY.unreadableMessage}
      />
    );
  }
  return (
    <CurrencyEditor
      key={currency.currency.currency.code}
      overview={currency}
      current={currency.currency.currency}
      goalCount={state.data.goals.goals.length}
      goalTitle={(goalId) => state.data.goals.goals.find(({ goal }) => goal.id === goalId)?.goal.title ?? CURRENCY_EDITOR_COPY.someGoal}
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
    showToast({ tone: 'success', title: CURRENCY_EDITOR_COPY.changed(to.code) });
    haptics.success();
  };

  const confirm = () => {
    if (!next || next.code === current.code) {
      return;
    }
    Alert.alert(CURRENCY_EDITOR_COPY.confirmTitle(next.code), noConversionMessage(current, next, goalCount), [
      { text: COMMON_COPY.cancel, style: 'cancel' },
      { text: CURRENCY_EDITOR_COPY.confirm, onPress: () => void change(next) },
    ]);
  };

  return (
    <View style={styles.section} testID="currency-settings">
      <ListGroup>
        <ListRow icon="currency" title={CURRENCY_EDITOR_COPY.title} detail={currencyLabel(current.code, current.name)} testID="currency-current" />
        {overview.locked ? null : (
          <ListCell>
            <CurrencyPicker value={code} onChange={setCode} testID="settings-currency" />
            {error ? <Notice tone="error" title={CURRENCY_EDITOR_COPY.notChanged} message={error} announce testID="currency-error" /> : null}
            {/* Shown once a different currency is picked, so the screen never rests on a disabled button. */}
            {next && next.code !== current.code ? (
              <Button label={CURRENCY_EDITOR_COPY.changeTo(next.code)} variant="secondary" onPress={confirm} loading={saving} testID="currency-change" />
            ) : null}
          </ListCell>
        )}
      </ListGroup>
      <FootnoteWithInfo
        text={overview.locked ? CURRENCY_SETTINGS_COPY.locked : CURRENCY_SETTINGS_COPY.unlocked}
        icon={overview.locked ? 'lock' : undefined}
        infoTitle={CURRENCY_SETTINGS_COPY.infoTitle}
        infoMessage={CURRENCY_SETTINGS_COPY.infoMessage}
        testID={overview.locked ? 'currency-locked' : 'currency-rule'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
});
