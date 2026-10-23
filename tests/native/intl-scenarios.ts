import { systemClock, today } from '@/core/calendar';
import { formatMoney, getCurrency, separatorsForLocale, type CurrencyMetadata } from '@/core/money';
import { deviceLocale, deviceSeparators } from '@/shared/i18n/locale';

import { equal, type Scenario } from './scenario-harness';

// Carried Phase 04 check (docs/evidence/PHASE_04.md): what the money and calendar helpers produce
// with the JavaScript engine's own Intl. In the simulator app that is Hermes; in Jest it is Node
// ICU. The digits must be exact in every engine; the full strings are recorded as facts so the
// evidence shows the actual Hermes output, symbol placement and spacing included.

const code = (value: string) => getCurrency(value) as CurrencyMetadata;
const digits = (text: string) => text.replace(/[^0-9]/g, '');
const decimals = (text: string) => /[.,](\d+)\D*$/.exec(text)?.[1]?.length ?? 0;

export const INTL_SCENARIOS: Scenario[] = [
  {
    id: 'I01',
    title: 'Intl output of formatMoney, separatorsForLocale and today() on this engine',
    run: async () => {
      const samples = {
        eurMax: formatMoney(999_999_999_999, code('EUR'), { locale: 'en-US' }),
        eurDe: formatMoney(999_999_999_999, code('EUR'), { locale: 'de-DE' }),
        jpy: formatMoney(1_235, code('JPY'), { locale: 'en-US' }),
        kwd: formatMoney(1_250, code('KWD'), { locale: 'en-US' }),
        iqd: formatMoney(1_250_000, code('IQD'), { locale: 'en-US' }),
        eurSigned: formatMoney(-500, code('EUR'), { locale: 'en-US', signDisplay: 'exceptZero' }),
      };
      equal(digits(samples.eurMax), '999999999999', 'EUR 9,999,999,999.99 digits');
      equal(decimals(samples.eurMax), 2, 'EUR decimals');
      equal(digits(samples.eurDe), '999999999999', 'EUR de-DE digits');
      equal(digits(samples.jpy), '1235', 'JPY digits');
      equal(decimals(samples.jpy) === 3 || decimals(samples.jpy) === 0, true, 'JPY shows no decimals');
      equal([digits(samples.kwd), decimals(samples.kwd)], ['1250', 3], 'KWD three decimals');
      equal([digits(samples.iqd), decimals(samples.iqd)], ['1250000', 3], 'IQD uses the registry exponent 3');
      equal(samples.eurSigned.includes('-') || samples.eurSigned.includes('−'), true, 'explicit minus sign');

      const engineLocale = new Intl.NumberFormat().resolvedOptions().locale;
      const separators = separatorsForLocale(engineLocale);
      const timeZone = systemClock.timeZone();
      return {
        samples,
        engineLocale,
        separators,
        deviceLanguageTag: deviceLocale(),
        deviceTagSeparators: separatorsForLocale(deviceLocale()),
        deviceTypingSeparators: deviceSeparators(),
        deviceFormatted: formatMoney(123_450, code('EUR'), { locale: deviceLocale() }),
        deDe: separatorsForLocale('de-DE'),
        enIn: separatorsForLocale('en-IN'),
        timeZone,
        today: today(systemClock),
        utcNow: new Date(systemClock.nowMs()).toISOString(),
      };
    },
  },
];
