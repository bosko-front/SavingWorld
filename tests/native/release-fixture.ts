import type { Clock } from '@/core/calendar';
import type { AppDatabase } from '@/data/db/database';
import { uuidGenerator } from '@/data/ids';
import { startChallenge } from '@/features/challenges/application/challenge-commands';
import { createGoal } from '@/features/goals/application/goal-commands';
import { correctEntry, createEntry } from '@/features/ledger/application/ledger-commands';
import { setGlobalCurrency } from '@/features/settings/application/currency-commands';

// Phase 20 synthetic fixture for the release-mode OTA drill (docs/evidence/PHASE_20.md): built only
// through the app's own commands, so its ledger, receipts, souvenir and challenge attempts are exactly
// what the app would have written. Free; no entitlement rows (Pro rights are proven on a device with a
// real StoreKit sandbox purchase, never seeded). Dates end on 26 October 2026, before the drill.
//
// The story, with independently worked numbers (EUR, 2 decimals, target 1,000.00):
//   First step started            → deposit 600.00 (21 Oct)   = 600.00   First step completed
//   Next milestone started at 60% → target 70% − 60% = 100.00
//                                  deposit 450.00 (22 Oct)   = 1,050.00 souvenir (Island v2),
//                                                                         Next milestone completed
//                                  withdrawal 300.00 (23 Oct) = 750.00
//   correction of the withdrawal to 250.00                    = 800.00   (80%, stage 8)
//   Next milestone started at 80% → target 90% − 80% = 100.00, still active
export const RELEASE_FIXTURE = {
  currency: 'EUR',
  targetMinor: 100_000,
  balanceMinor: 80_000,
  entries: [60_000, 45_000, -25_000],
  receipts: 9,
  souvenir: { themeId: 'island', themeVersion: 2, targetMinorAtAward: 100_000 },
  attempts: [
    { ruleId: 'first_step', state: 'historical', result: 'completed' },
    { ruleId: 'next_milestone', state: 'historical', result: 'completed', targetMinor: 10_000 },
    { ruleId: 'next_milestone', state: 'active', result: null, targetMinor: 10_000 },
  ],
} as const;

export function fixtureClock(): Clock & { at(iso: string): void } {
  let t = Date.parse('2026-10-21T07:00:00.000Z');
  return {
    nowMs: () => (t += 1000),
    timeZone: () => 'Europe/Belgrade',
    at: (iso) => {
      t = Date.parse(iso);
    },
  };
}

function must<T>(result: { ok: true; value: T } | { ok: false; error: unknown }, step: string): T {
  if (!result.ok) {
    throw new Error(`release fixture: ${step} failed: ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

export async function buildReleaseFixture(db: AppDatabase, clock: ReturnType<typeof fixtureClock>): Promise<{ goalId: string }> {
  const deps = { db, clock, ids: uuidGenerator };
  const op = () => uuidGenerator.newId();
  must(await setGlobalCurrency(deps, { operationId: op(), currencyCode: RELEASE_FIXTURE.currency }), 'currency');
  const { goalId } = must(
    await createGoal(deps, {
      operationId: op(),
      title: 'Drill island',
      targetMinor: RELEASE_FIXTURE.targetMinor,
      deadlineDate: null,
      themeId: 'island',
    }),
    'goal',
  );
  must(await startChallenge(deps, { operationId: op(), goalId, ruleId: 'first_step' }), 'first step');
  clock.at('2026-10-21T08:00:00.000Z');
  must(await createEntry(deps, { operationId: op(), goalId, kind: 'deposit', amountMinor: 60_000, entryDate: '2026-10-21', note: 'synthetic' }), 'deposit 1');
  must(await startChallenge(deps, { operationId: op(), goalId, ruleId: 'next_milestone' }), 'next milestone 1');
  clock.at('2026-10-22T08:00:00.000Z');
  must(await createEntry(deps, { operationId: op(), goalId, kind: 'deposit', amountMinor: 45_000, entryDate: '2026-10-22', note: null }), 'deposit 2');
  clock.at('2026-10-23T08:00:00.000Z');
  const withdrawal = must(
    await createEntry(deps, { operationId: op(), goalId, kind: 'withdrawal', amountMinor: 30_000, entryDate: '2026-10-23', note: null }),
    'withdrawal',
  );
  clock.at('2026-10-24T08:00:00.000Z');
  must(
    await correctEntry(deps, {
      operationId: op(),
      entryId: withdrawal.entryId,
      expectedRevision: withdrawal.entryRevision ?? 1,
      kind: 'withdrawal',
      amountMinor: 25_000,
      entryDate: '2026-10-23',
      note: null,
    }),
    'correction',
  );
  clock.at('2026-10-26T08:00:00.000Z');
  must(await startChallenge(deps, { operationId: op(), goalId, ruleId: 'next_milestone' }), 'next milestone 2');
  return { goalId };
}
