import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FullWindowOverlay } from 'react-native-screens';
import { Toaster as SonnerToaster, toast } from 'sonner-native';

import { borders, colors, elevation, layout, motion, radii, spacing } from '@/shared/theme';

import { AppText } from './app-text';
import { Icon } from './icon';

// Transient confirmations (docs/DESIGN_SYSTEM.md "Transient feedback (toasts)", DECISIONS D40).
// Screens call `showToast` only after a write has committed, for an outcome the screen also shows.
// Errors, validation, destructive confirmation, money amounts and celebrations never use a toast.
// This module is the only importer of the toast engine (ESLint enforces it), so the engine can be
// swapped without touching screens.

// No error tone on purpose: errors stay inline (Notice / TextField) with the person's input kept.
export type ToastTone = 'success' | 'info';

export type ToastOptions = { tone: ToastTone; title: string };

const toneStyle = {
  success: { surface: colors.successSurface, accent: colors.success, icon: 'success' },
  info: { surface: colors.infoSurface, accent: colors.info, icon: 'info' },
} as const;

const BASE_DURATION_MS = 4000;
const MAX_DURATION_MS = 8000;
const CHARACTERS_IN_BASE = 40;
const MS_PER_EXTRA_CHARACTER = 60;
// Below a standard navigation bar, so the toast never covers the tab bar, the keyboard or a
// form's Save action; the engine adds the top safe area itself.
const TOP_OFFSET = layout.minTouchTarget + spacing.sm;

// About four seconds, longer for longer text, capped so a toast never lingers.
export function toastDuration(title: string): number {
  const extra = Math.max(0, title.length - CHARACTERS_IN_BASE) * MS_PER_EXTRA_CHARACTER;
  return Math.min(MAX_DURATION_MS, BASE_DURATION_MS + extra);
}

let currentToastId: string | number | null = null;

// Shows one confirmation, replacing any toast still visible, and announces it to VoiceOver once.
// The announcement is queued so it does not interrupt speech, and focus never moves to the toast.
export function showToast({ tone, title }: ToastOptions): void {
  if (currentToastId !== null) {
    toast.dismiss(currentToastId);
  }
  const id = toast.custom(<ToastCard tone={tone} title={title} />, {
    duration: toastDuration(title),
    dismissible: true,
    onPress: () => toast.dismiss(id),
    onDismiss: () => forget(id),
    onAutoClose: () => forget(id),
  });
  currentToastId = id;
  AccessibilityInfo.announceForAccessibilityWithOptions(title, { queue: true });
}

function forget(id: string | number): void {
  if (currentToastId === id) {
    currentToastId = null;
  }
}

// Reduce Motion as the OS reports it, tracked by the Toaster host from app start, so a card knows
// the setting on its first frame instead of flashing before a late answer arrives.
let reduceMotionEnabled = false;

function useTrackReduceMotion(): void {
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) {
          reduceMotionEnabled = value;
        }
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      reduceMotionEnabled = value;
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
}

function ToastCard({ tone, title }: ToastOptions) {
  // With Reduce Motion the engine drops its slide; the card fades in briefly instead.
  const [fade] = useState(() => (reduceMotionEnabled ? new Animated.Value(0) : null));
  useEffect(() => {
    if (fade) {
      Animated.timing(fade, { toValue: 1, duration: motion.standard, useNativeDriver: true }).start();
    }
  }, [fade]);
  const style = toneStyle[tone];
  return (
    <Animated.View
      style={[styles.card, { opacity: fade ?? 1, backgroundColor: style.surface, borderLeftColor: style.accent }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={title}>
      <Icon name={style.icon} role="headline" tone={tone} />
      <AppText role="headline" style={styles.title}>
        {title}
      </AppText>
    </Animated.View>
  );
}

// The toast window sits above every native sheet; gestures inside it need their own root.
function OverlayWrapper({ children }: { children: ReactNode }) {
  return (
    <FullWindowOverlay>
      <GestureHandlerRootView style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {children}
        </View>
      </GestureHandlerRootView>
    </FullWindowOverlay>
  );
}

// Host rendered once in the root layout. One toast at a time, near the top, swipe up or tap to
// dismiss, text that grows with Dynamic Type.
export function Toaster() {
  useTrackReduceMotion();
  return (
    <SonnerToaster
      position="top-center"
      offset={TOP_OFFSET}
      visibleToasts={1}
      swipeToDismissDirection="up"
      theme="light"
      enableStacking={false}
      ToasterOverlayWrapper={OverlayWrapper}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: layout.screenGutter,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: layout.minTouchTarget,
    borderRadius: radii.md,
    borderLeftWidth: borders.emphasis * 2,
    ...elevation.card,
  },
  title: {
    flexShrink: 1,
  },
});
