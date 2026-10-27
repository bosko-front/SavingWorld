import type { Clock } from '@/core/calendar';
import type { AppDatabase } from '@/data/db/database';
import { uuidGenerator } from '@/data/ids';
import { startChallenge } from '@/features/challenges/application/challenge-commands';
import { createGoal } from '@/features/goals/application/goal-commands';
import { createEntry } from '@/features/ledger/application/ledger-commands';
import { setGlobalCurrency } from '@/features/settings/application/currency-commands';

// Phase 22 synthetic fixture for the App Store screenshots (store/README.md): one Free goal built only
// through the app's own commands, so every number on the screenshots is what the app itself computes.
// Free; no entitlement rows (Pro screenshots come from a real sandbox/TestFlight purchase, never
// seeded). No deadline, so Home ends at the next-milestone card. Dates end on Sunday 25 October 2026,
// before the capture on 27 October.
//
// The story, with independently worked numbers (USD, 2 decimals, target 1,500.00):
//   13 Sep +450.00                      =   450.00
//   27 Sep +375.00 "Birthday money"    =   825.00
//   11 Oct  −60.00 "Concert tickets"   =   765.00
//   18 Oct +450.00                      = 1,215.00   (81%, stage 8)
//   Next milestone started 19 Oct: threshold ceil(150,000 × 9 / 10) = 135,000, target 135,000 − 121,500
//   = 13,500 → 135.00
//   25 Oct  +85.00                      = 1,300.00   (86.66…%, stage 8: the cottage), quest 85.00 of 135.00
export const STORE_FIXTURE = {
  currency: 'USD',
  title: 'Summer trip',
  targetMinor: 150_000,
  balanceMinor: 130_000,
  entries: [45_000, 37_500, -6_000, 45_000, 8_500],
  questTargetMinor: 13_500,
} as const;

export function storeFixtureClock(): Clock & { at(iso: string): void } {
  let t = Date.parse('2026-09-13T08:00:00.000Z');
  return {
    nowMs: () => (t += 1000),
    timeZone: () => 'America/New_York',
    at: (iso) => {
      t = Date.parse(iso);
    },
  };
}

function must<T>(result: { ok: true; value: T } | { ok: false; error: unknown }, step: string): T {
  if (!result.ok) {
    throw new Error(`store fixture: ${step} failed: ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

type Step = { at: string; date: string; kind: 'deposit' | 'withdrawal'; amountMinor: number; note: string | null };

const BEFORE_QUEST: readonly Step[] = [
  { at: '2026-09-13T16:00:00.000Z', date: '2026-09-13', kind: 'deposit', amountMinor: 45_000, note: null },
  { at: '2026-09-27T16:00:00.000Z', date: '2026-09-27', kind: 'deposit', amountMinor: 37_500, note: 'Birthday money' },
  { at: '2026-10-11T16:00:00.000Z', date: '2026-10-11', kind: 'withdrawal', amountMinor: 6_000, note: 'Concert tickets' },
  { at: '2026-10-18T16:00:00.000Z', date: '2026-10-18', kind: 'deposit', amountMinor: 45_000, note: null },
];

export async function buildStoreFixture(db: AppDatabase, clock: ReturnType<typeof storeFixtureClock>): Promise<{ goalId: string }> {
  const deps = { db, clock, ids: uuidGenerator };
  const op = () => uuidGenerator.newId();
  clock.at('2026-09-13T08:00:00.000Z');
  must(await setGlobalCurrency(deps, { operationId: op(), currencyCode: STORE_FIXTURE.currency }), 'currency');
  const { goalId } = must(
    await createGoal(deps, { operationId: op(), title: STORE_FIXTURE.title, targetMinor: STORE_FIXTURE.targetMinor, deadlineDate: null, themeId: 'island' }),
    'goal',
  );
  for (const step of BEFORE_QUEST) {
    clock.at(step.at);
    must(
      await createEntry(deps, { operationId: op(), goalId, kind: step.kind, amountMinor: step.amountMinor, entryDate: step.date, note: step.note }),
      `entry ${step.date}`,
    );
  }
  clock.at('2026-10-19T13:00:00.000Z');
  must(await startChallenge(deps, { operationId: op(), goalId, ruleId: 'next_milestone' }), 'next milestone');
  clock.at('2026-10-25T16:00:00.000Z');
  must(await createEntry(deps, { operationId: op(), goalId, kind: 'deposit', amountMinor: 8_500, entryDate: '2026-10-25', note: null }), 'quest deposit');
  return { goalId };
}
