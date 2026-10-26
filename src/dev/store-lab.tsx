import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { currentCapabilities, useAppDataStore } from '@/bootstrap/app-data';
import { loadProProduct, purchaseProFromApp, reconcileBilling, restorePurchasesFromApp } from '@/bootstrap/billing';
import { getAppDatabase } from '@/bootstrap/database-readiness';
import { listPurchaseEvents, readEntitlement, type EntitlementRecord, type PurchaseEventRecord } from '@/data/repositories/entitlement-repository';
import { PRO_PRODUCT_ID } from '@/features/billing/domain/entitlement';
import { Screen } from '@/shared/layout';
import { spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { SectionHeader } from '@/shared/ui/section-header';

// Development/test-only Store lab (Phase 15 native evidence). Drives the real billing path, the same
// queue and reconciler the Phase 16 paywall will use, against StoreKit (a local StoreKit
// configuration in Xcode, the sandbox or TestFlight): the product's localized metadata as the
// storefront returns it, Buy Pro, Restore Purchases, a manual check, the stored entitlement snapshot,
// the processed transactions and the resulting capability level. Reached from Settings → Development
// only → Store lab (`/dev-store`), guarded and absent from release bundles. Every action logs one
// `[store-lab]` line to Metro with codes and identifiers only (no signed payloads, no account data).
// It has no switch that grants Pro: rights come only from StoreKit.

type LabState = { record: EntitlementRecord | null; events: PurchaseEventRecord[] };

function log(message: string, value?: unknown): void {
  console.log(`[store-lab] ${message}${value === undefined ? '' : ` ${JSON.stringify(value)}`}`);
}

function describeProduct(result: Awaited<ReturnType<typeof loadProProduct>>): string {
  if (!result.ok) {
    return `Not loaded (${result.error})`;
  }
  return result.value ? `${result.value.displayName} · ${result.value.displayPrice} · ${result.value.description}` : 'Not offered by this storefront';
}

async function readLab(): Promise<LabState> {
  const db = getAppDatabase();
  const state = await db.read(async (r) => ({ record: await readEntitlement(r, PRO_PRODUCT_ID), events: await listPurchaseEvents(r) }));
  log('inspect', { ...state, level: currentCapabilities().level });
  return state;
}

export function StoreLab() {
  const version = useAppDataStore((store) => store.version);
  const [lab, setLab] = useState<LabState | null>(null);
  const [product, setProduct] = useState<string>('Loading…');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [productTick, setProductTick] = useState(0);

  useEffect(() => {
    let live = true;
    void readLab().then((next) => {
      if (live) {
        setLab(next);
      }
    });
    return () => {
      live = false;
    };
  }, [version, tick]);

  useEffect(() => {
    let live = true;
    void loadProProduct().then((result) => {
      log('product', result);
      if (live) {
        setProduct(describeProduct(result));
      }
    });
    return () => {
      live = false;
    };
  }, [productTick]);

  const run = async (name: string, action: () => Promise<unknown>) => {
    setBusy(true);
    const result = await action();
    log(name, result);
    const outcome = result && typeof result === 'object' && 'outcome' in result ? String(result.outcome) : null;
    setMessage(`${name}: ${outcome ?? JSON.stringify(result)}`);
    setBusy(false);
    setTick((value) => value + 1);
  };

  return (
    <Screen>
      <View style={styles.section}>
        <SectionHeader title="Product" caption={PRO_PRODUCT_ID} />
        <Card testID="store-lab-product">
          <AppText role="footnote">{product}</AppText>
        </Card>
      </View>
      <View style={styles.section}>
        <SectionHeader title="Stored entitlement" caption={`Capabilities: ${currentCapabilities().level}`} />
        <Card testID="store-lab-entitlement">
          <AppText role="footnote">Status: {lab?.record?.status ?? 'no row'}</AppText>
          <AppText role="footnote">Transaction: {lab?.record?.transactionId ?? 'none'}</AppText>
          <AppText role="footnote">Verified at: {lab?.record?.verifiedAtUtc ?? 'never'}</AppText>
          <AppText role="footnote">Last check: {lab?.record?.lastAttemptAtUtc ?? 'never'}</AppText>
          <AppText role="footnote">Last error: {lab?.record?.lastErrorCode ?? 'none'}</AppText>
          <AppText role="footnote" tone="secondary">
            Revision {lab?.record?.revision ?? 0}
          </AppText>
        </Card>
      </View>
      <View style={styles.section}>
        <SectionHeader title="Processed transactions" />
        <Card testID="store-lab-events">
          {lab && lab.events.length === 0 ? <AppText role="footnote">None</AppText> : null}
          {lab?.events.map((event) => (
            <AppText key={event.transactionId} role="footnote">
              {event.transactionId}: processed {event.processedAtUtc}, finished {event.finishedAtUtc ?? 'no'}, revoked {event.revokedAtUtc ?? 'no'}
            </AppText>
          ))}
        </Card>
      </View>
      {message ? (
        <AppText role="footnote" testID="store-lab-message">
          {message}
        </AppText>
      ) : null}
      <Button label="Buy Pro" disabled={busy} onPress={() => void run('purchase', purchaseProFromApp)} testID="store-lab-buy" />
      <Button label="Restore Purchases" variant="secondary" disabled={busy} onPress={() => void run('restore', restorePurchasesFromApp)} testID="store-lab-restore" />
      <Button label="Check StoreKit now" variant="secondary" disabled={busy} onPress={() => void run('check', reconcileBilling)} testID="store-lab-check" />
      <Button label="Reload product" variant="plain" onPress={() => setProductTick((value) => value + 1)} testID="store-lab-product-reload" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
});
