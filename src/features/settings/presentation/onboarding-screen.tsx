import { useState } from 'react';

import { currencyCommandDeps, refreshAppData } from '@/bootstrap/app-data';
import { getCurrency } from '@/core/money';
import { randomUuid } from '@/data/ids';
import { deviceCurrencyCode } from '@/shared/i18n/locale';
import { Screen } from '@/shared/layout';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Notice } from '@/shared/ui/notice';

import { setGlobalCurrency } from '../application/currency-commands';

import { currencyErrorMessage } from './currency-copy';
import { currencyLabel, CurrencyPicker } from './currency-picker';

const FALLBACK_CURRENCY = 'EUR';

function initialCurrency(): string {
  const code = deviceCurrencyCode();
  return code && getCurrency(code) ? code : FALLBACK_CURRENCY;
}

// First launch (v1.2 sections 2 and 6): a short explanation that this is a record, not a bank
// account, and one global currency choice. No account, purchase or notification prompt. When the
// choice is saved the root layout switches to the app; the same command later serves Settings.
export function OnboardingScreen() {
  const [code, setCode] = useState(initialCurrency);
  const [operationId] = useState(randomUuid);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = getCurrency(code);

  const save = async () => {
    setSaving(true);
    setError(null);
    const result = await setGlobalCurrency(currencyCommandDeps(), { operationId, currencyCode: code });
    if (!result.ok) {
      setSaving(false);
      setError(currencyErrorMessage(result.error, selected ?? null, () => 'A goal'));
      return;
    }
    // The root layout leaves onboarding once the refreshed data has a currency.
    await refreshAppData();
  };

  return (
    <Screen testID="onboarding">
      <AppText role="largeTitle" accessibilityRole="header">
        Saving Worlds
      </AppText>
      <AppText>
        Set a goal, record the money you actually set aside, and watch a small world grow as you get closer.
      </AppText>
      <Card variant="soft">
        <AppText role="headline">A record, not a bank account</AppText>
        <AppText>
          Saving Worlds never holds, moves or checks your money. You record what you saved yourself, and your records stay
          on this iPhone.
        </AppText>
      </Card>
      <AppText role="title" accessibilityRole="header">
        Choose your currency
      </AppText>
      <AppText tone="secondary">
        Every goal uses this one currency. You can change it later in Settings, but only while nothing has been saved yet.
      </AppText>
      <CurrencyPicker value={code} onChange={setCode} testID="onboarding-currency" />
      {selected ? (
        <AppText role="footnote" tone="secondary" testID="onboarding-selected">
          {`Selected: ${currencyLabel(selected.code, selected.name)}`}
        </AppText>
      ) : null}
      {error ? <Notice tone="error" title="Not saved" message={error} /> : null}
      <Button label="Continue" onPress={() => void save()} loading={saving} disabled={!selected} testID="onboarding-continue" />
    </Screen>
  );
}
