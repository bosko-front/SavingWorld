import * as buildInfo from '@/bootstrap/build-info-copy';
import * as storageFailure from '@/bootstrap/storage-failure-copy';
import * as billing from '@/features/billing/presentation/billing-copy';
import * as challenges from '@/features/challenges/presentation/challenge-copy';
import * as collection from '@/features/collection/presentation/collection-copy';
import * as goals from '@/features/goals/presentation/goal-copy';
import * as ledger from '@/features/ledger/presentation/ledger-copy';
import * as reminders from '@/features/reminders/presentation/reminder-copy';
import * as currency from '@/features/settings/presentation/currency-copy';
import * as onboarding from '@/features/settings/presentation/onboarding-copy';
import * as settings from '@/features/settings/presentation/settings-copy';
import { STATISTICS_COPY } from '@/features/statistics/presentation/statistics-model';
import * as themes from '@/features/worlds/presentation/theme-copy';
import * as worlds from '@/features/worlds/world-copy';
import * as amounts from '@/shared/i18n/amount-messages';
import * as chart from '@/shared/i18n/chart-copy';
import * as common from '@/shared/i18n/common-copy';
import * as deadlines from '@/shared/i18n/deadline-messages';
import * as navigation from '@/shared/i18n/navigation-copy';

// Phase 19: every fixed string of the English catalog (the copy modules the ESLint catalog guard
// sends visible text to) follows the same writing rules, so a moved or new string cannot slip in
// with a typo-level problem. Strings built by functions are covered by their screens' tests.

const MODULES = {
  buildInfo,
  storageFailure,
  billing,
  challenges,
  collection,
  goals,
  ledger,
  reminders,
  currency,
  onboarding,
  settings,
  statistics: { STATISTICS_COPY },
  themes,
  worlds,
  amounts,
  chart,
  common,
  deadlines,
  navigation,
};

function collect(value: unknown, path: string, out: [string, string][]): void {
  if (typeof value === 'string') {
    out.push([path, value]);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => collect(item, `${path}[${index}]`, out));
  } else if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      collect(item, `${path}.${key}`, out);
    }
  }
}

const strings: [string, string][] = [];
for (const [name, module] of Object.entries(MODULES)) {
  for (const [key, value] of Object.entries(module)) {
    // Only constant catalogs: exported SCREAMING_CASE objects and arrays.
    if (/^[A-Z][A-Z0-9_]*$/.test(key)) {
      collect(value, `${name}.${key}`, strings);
    }
  }
}

describe('English catalog', () => {
  it('collects the catalog', () => {
    expect(strings.length).toBeGreaterThan(300);
  });

  it.each(strings)('%s is clean English text', (_path, text) => {
    expect(text.trim()).not.toBe('');
    // A suffix joined to another line (" · Tap an entry…") keeps its leading separator.
    const body = text.replace(/^ · /, '');
    expect(body).toBe(body.trim());
    expect(text).not.toMatch(/ {2}/);
    // Typographic apostrophes and quotes, as everywhere in the app.
    expect(text).not.toMatch(/'/);
    expect(text).not.toMatch(/"/);
    expect(text).not.toMatch(/\b(undefined|null|NaN|TODO|FIXME)\b/);
    expect(text).not.toMatch(/[{}]/);
    expect(text).not.toMatch(/ [.,;:!?]/);
  });
});
