import type { CurrencyMetadata } from '@/core/money';
import type { AppDatabase } from '@/data/db/database';
import { countCollectibles } from '@/data/repositories/collectible-repository';
import { countEntries } from '@/data/repositories/ledger-repository';
import { readCurrency } from '@/data/repositories/settings-repository';

// Read side of the global currency: what is stored and whether a change is currently allowed. The
// lock shown here is a preview for the screen; setGlobalCurrency rechecks it inside its own
// exclusive transaction.

export type CurrencyState =
  | { status: 'missing' }
  // A stored value that does not match the bundled registry; never reinterpreted.
  | { status: 'invalid' }
  | { status: 'set'; currency: CurrencyMetadata };

export type CurrencyOverview = {
  currency: CurrencyState;
  transactionCount: number;
  souvenirCount: number;
  locked: boolean;
};

export async function readCurrencyOverview(db: AppDatabase): Promise<CurrencyOverview> {
  return db.read(async (snapshot) => {
    const stored = await readCurrency(snapshot);
    const transactionCount = await countEntries(snapshot);
    const souvenirCount = await countCollectibles(snapshot);
    const currency: CurrencyState = stored.ok
      ? { status: 'set', currency: stored.value }
      : { status: stored.error === 'missing' ? 'missing' : 'invalid' };
    return { currency, transactionCount, souvenirCount, locked: transactionCount > 0 || souvenirCount > 0 };
  });
}
