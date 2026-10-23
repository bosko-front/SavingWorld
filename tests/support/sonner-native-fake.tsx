import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { useSyncExternalStore } from 'react';

// Jest stand-in for the sonner-native toast engine (mapped in package.json `moduleNameMapper`).
// The real engine needs Reanimated's native layout animations, which Jest cannot run. This fake
// keeps the same calls our wrapper makes (`toast.custom`, `toast.dismiss`, `<Toaster />`) and
// renders every live toast, so tests can assert what a person would see: one toast at a time,
// replaced by the next. The engine's own animation and gestures are verified on the simulator.

type FakeToast = { id: number; jsx: ReactElement; options: Record<string, unknown> };

let toasts: FakeToast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export const toast = {
  custom(jsx: ReactElement, options: Record<string, unknown> = {}) {
    const id = nextId++;
    toasts = [...toasts, { id, jsx, options }];
    emit();
    return id;
  },
  dismiss(id?: number) {
    toasts = id === undefined ? [] : toasts.filter((item) => item.id !== id);
    emit();
    return id;
  },
};

export function Toaster({ ToasterOverlayWrapper }: { ToasterOverlayWrapper?: (props: { children: ReactNode }) => ReactElement }) {
  const live = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => toasts,
  );
  const content = (
    <View testID="toaster">
      {live.map((item) => (
        <View key={item.id} testID={`toast-${item.id}`}>
          {item.jsx}
        </View>
      ))}
    </View>
  );
  return ToasterOverlayWrapper ? <ToasterOverlayWrapper>{content}</ToasterOverlayWrapper> : content;
}

// Test helpers.
export function liveToasts(): readonly FakeToast[] {
  return toasts;
}

export function resetFakeToasts(): void {
  toasts = [];
  emit();
}
