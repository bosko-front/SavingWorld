import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';
import { Toaster as SonnerToaster, toast } from 'sonner-native';

import { borders, colors, elevation, layout, motion, radii, spacing } from '@/shared/theme';

import { AppText } from './app-text';
import { Icon } from './icon';
import { isReduceMotionEnabled, useReduceMotion } from './motion-preferences';

// Transient confirmations (docs/DESIGN_SYSTEM.md "Transient feedback (toasts)", DECISIONS D40).
// Screens call `showToast` only after a write has committed, for an outcome the screen also shows.
// Form validation, destructive confirmation, money amounts and celebrations never use a toast. The
// error tone is only for a one-tap action without a form (Pause, Resume, Reopen, Delete) that was refused or
// failed (DECISIONS D66); form errors stay inline with the person's input kept.
// This module is the only importer of the toast engine (ESLint enforces it), so the engine can be
// swapped without touching screens.

export type ToastTone = 'success' | 'info' | 'error';

// `message` is one short sentence under the title, used by error toasts to say what to do next.
export type ToastOptions = { tone: ToastTone; title: string; message?: string };

// Tone colors; tests/unit/contrast.test.ts checks the title and message against each surface.
export const toastColors = {
  success: { surface: colors.successSurface, accent: colors.success, icon: 'success' },
  info: { surface: colors.infoSurface, accent: colors.info, icon: 'info' },
  error: { surface: colors.errorSurface, accent: colors.error, icon: 'error' },
} as const;

const BASE_DURATION_MS = 4000;
// Errors need reading time for their explanation.
const ERROR_MIN_DURATION_MS = 6000;
const MAX_DURATION_MS = 8000;
const CHARACTERS_IN_BASE = 40;
const MS_PER_EXTRA_CHARACTER = 60;
// Below a standard navigation bar (top safe area + one bar height) with a clear gap, so the toast
// never touches the back button or Home's gear, nor covers the tab bar, the keyboard or a form's
// Save action (owner request D89: lower, not at the very top). The engine ignores the safe area when
// an offset is given, so the inset is added here (Phase 07.5: the toast covered Back).
export function toastTopOffset(safeAreaTop: number): number {
  return safeAreaTop + layout.minTouchTarget + spacing.xxl;
}

// About four seconds, longer for longer text, capped so a toast never lingers.
export function toastDuration(title: string, tone: ToastTone = 'success', message = ''): number {
  const length = title.length + message.length;
  const extra = Math.max(0, length - CHARACTERS_IN_BASE) * MS_PER_EXTRA_CHARACTER;
  const base = tone === 'error' ? ERROR_MIN_DURATION_MS : BASE_DURATION_MS;
  return Math.min(MAX_DURATION_MS, base + extra);
}

let currentToastId: string | number | null = null;

// Shows one confirmation, replacing any toast still visible, and announces it to VoiceOver once.
// The announcement is queued so it does not interrupt speech, and focus never moves to the toast.
export function showToast({ tone, title, message }: ToastOptions): void {
  if (currentToastId !== null) {
    toast.dismiss(currentToastId);
  }
  const id = toast.custom(<ToastCard tone={tone} title={title} message={message} />, {
    duration: toastDuration(title, tone, message),
    dismissible: true,
    onPress: () => toast.dismiss(id),
    onDismiss: () => forget(id),
    onAutoClose: () => forget(id),
  });
  currentToastId = id;
  AccessibilityInfo.announceForAccessibilityWithOptions(message ? `${title}. ${message}` : title, { queue: true });
}

function forget(id: string | number): void {
  if (currentToastId === id) {
    currentToastId = null;
  }
}

function ToastCard({ tone, title, message }: ToastOptions) {
  // With Reduce Motion the engine drops its slide; the card fades in briefly instead.
  const [fade] = useState(() => (isReduceMotionEnabled() ? new Animated.Value(0) : null));
  useEffect(() => {
    if (fade) {
      Animated.timing(fade, { toValue: 1, duration: motion.standard, useNativeDriver: true }).start();
    }
  }, [fade]);
  const style = toastColors[tone];
  return (
    <Animated.View
      style={[styles.card, { opacity: fade ?? 1, backgroundColor: style.surface, borderStartColor: style.accent }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={message ? `${title}. ${message}` : title}>
      <Icon name={style.icon} role="headline" tone={tone} />
      <View style={styles.text}>
        <AppText role="headline" tone={tone === 'error' ? 'error' : 'primary'}>
          {title}
        </AppText>
        {message ? <AppText role="footnote">{message}</AppText> : null}
      </View>
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
  // Tracks Reduce Motion from app start, so a card (and any screen) knows it on its first frame.
  useReduceMotion();
  const insets = useSafeAreaInsets();
  return (
    <SonnerToaster
      position="top-center"
      offset={toastTopOffset(insets.top)}
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
    borderStartWidth: borders.emphasis * 2,
    ...elevation.card,
  },
  text: {
    flexShrink: 1,
    gap: spacing.xs / 2,
  },
});
