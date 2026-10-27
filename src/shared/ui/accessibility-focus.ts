import { useEffect, useRef } from 'react';
import { AccessibilityInfo, type HostInstance } from 'react-native';

// UIKit needs the new element on screen before VoiceOver can move to it.
const FOCUS_DELAY_MS = 250;

// Moves VoiceOver to the returned element whenever `key` changes after the first render (Phase 19):
// a step, form or card that replaced the one the person was on would otherwise leave focus on a
// removed element or on the button that caused the change. The first render keeps the system's own
// focus (a new screen or sheet already starts at its top). Without VoiceOver the event does nothing.
export function useAccessibilityFocusOnChange(key: string | number | boolean | null) {
  const ref = useRef<HostInstance>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (ref.current) {
        AccessibilityInfo.sendAccessibilityEvent(ref.current, 'focus');
      }
    }, FOCUS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [key]);
  return ref;
}
