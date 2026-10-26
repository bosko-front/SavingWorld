import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { loadProProduct, purchaseProFromApp, restorePurchasesFromApp } from '@/bootstrap/billing';
import { haptics } from '@/shared/ui/haptics';

import type { PurchaseOutcome, RestoreOutcome } from '../domain/entitlement';

import { purchaseLine, restoreLine, type ProductState, type ResultLine } from './billing-copy';

// The Pro product as the storefront returns it (localized price, Q07/D116), loaded when the paywall
// opens and again on "Try again". Never a hard-coded price.
export function useProProduct(): { product: ProductState; reload: () => void } {
  const [product, setProduct] = useState<ProductState>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    void loadProProduct().then((result) => {
      if (!live) {
        return;
      }
      if (!result.ok) {
        setProduct({ kind: 'failed', code: result.error });
      } else {
        setProduct(result.value ? { kind: 'ready', displayPrice: result.value.displayPrice } : { kind: 'not_offered' });
      }
    });
    return () => {
      live = false;
    };
  }, [attempt]);

  const reload = () => {
    setProduct({ kind: 'loading' });
    setAttempt((value) => value + 1);
  };
  return { product, reload };
}

export type PurchaseActions = {
  busy: 'buy' | 'restore' | null;
  // The latest result, shown in place (never a toast, DESIGN_SYSTEM "Transient feedback").
  line: ResultLine | null;
  buy: () => Promise<PurchaseOutcome | null>;
  restore: () => Promise<RestoreOutcome | null>;
};

// Buy and Restore through the one serialized billing queue (Phase 15). One action at a time; the
// result is a calm line in place, announced once to VoiceOver, with the success haptic only when Pro
// was unlocked or restored. A queue failure (database not open, an unexpected error) reads as a
// purchase or restore that did not finish: nothing changed.
export function usePurchaseActions(): PurchaseActions {
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [line, setLine] = useState<ResultLine | null>(null);
  const running = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const show = (next: ResultLine) => {
    if (mounted.current) {
      setLine(next);
    }
    AccessibilityInfo.announceForAccessibilityWithOptions(`${next.title}. ${next.message}`, { queue: true });
    if (next.tone === 'success') {
      haptics.success();
    }
  };

  const finish = () => {
    running.current = false;
    if (mounted.current) {
      setBusy(null);
    }
  };

  const buy = async (): Promise<PurchaseOutcome | null> => {
    if (running.current) {
      return null;
    }
    running.current = true;
    setBusy('buy');
    setLine(null);
    const result = await purchaseProFromApp();
    const outcome: PurchaseOutcome = result?.outcome ?? 'failed';
    finish();
    show(purchaseLine(outcome));
    return outcome;
  };

  const restore = async (): Promise<RestoreOutcome | null> => {
    if (running.current) {
      return null;
    }
    running.current = true;
    setBusy('restore');
    setLine(null);
    const result = await restorePurchasesFromApp();
    const outcome: RestoreOutcome = result?.outcome ?? 'failed';
    finish();
    show(restoreLine(outcome));
    return outcome;
  };

  return { busy, line, buy, restore };
}
