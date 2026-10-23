import { ArrangementView, Host, RNHostView } from '@expo/ui/swift-ui';
import { arrangementViewStyle } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { Platform, StyleSheet } from 'react-native';

// The one place that touches the native adaptive container (docs/ADAPTIVE_LAYOUT.md, DECISIONS
// D44). Below iOS 27.1 @expo/ui's ArrangementView renders its slots without any container, which
// is not a usable layout, so callers must check `arrangementViewAvailable()` and compose a fallback.

const MINIMUM_IOS = [27, 1] as const;

// Runtime guard. `version` is Platform.Version on iOS ("27.1", "18.5", "26.0.1"). The binary must
// also be built with the iOS 27.1 SDK (Xcode 27.1); the EAS image used for this project is
// macos-tahoe-26.6-xcode-27.1 (docs/evidence/PHASE_03.md). Older SDK builds compile the fallback.
export function isArrangementViewSupported(os: string, version: string | number): boolean {
  if (os !== 'ios') {
    return false;
  }
  const [major = 0, minor = 0] = String(version)
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);
  return major > MINIMUM_IOS[0] || (major === MINIMUM_IOS[0] && minor >= MINIMUM_IOS[1]);
}

// Fixed for the life of the process, so the arrangement branch never switches (and never remounts
// its regions) while the window resizes, folds or rotates.
const AVAILABLE = isArrangementViewSupported(Platform.OS, Platform.Version);

export function arrangementViewAvailable(): boolean {
  return AVAILABLE;
}

type NativeArrangementProps = {
  // Exactly one React Native element per region; RNHostView hosts a single child.
  primary: ReactElement;
  secondary: ReactElement;
  // Size of the arranged SwiftUI content (inside the container safe area).
  onContainerLayout?: (size: { width: number; height: number }) => void;
  testID?: string;
};

// System adaptive arrangement of a primary and a secondary region. The system chooses side-by-side,
// stacked or overlay placement from the current environment (width class, fold, pose); we pass no
// device sizes or fold coordinates. Each hosted region fills the size SwiftUI gives it
// (RNHostView matchContents=false) and measures itself with onLayout.
//
// Safe areas: the SwiftUI host keeps both regions inside the container safe area (navigation bar,
// tab bar, side-controls column), so hosted content adds no safe-area inset of its own
// (`containedRegionOwnership`). The keyboard safe area is ignored here because the secondary
// region's own scroll view adjusts for the keyboard; letting both react would shrink it twice.
export function NativeArrangement({ primary, secondary, onContainerLayout, testID }: NativeArrangementProps) {
  return (
    <Host
      style={styles.fill}
      ignoreSafeArea="keyboard"
      onLayoutContent={onContainerLayout ? (event) => onContainerLayout(event.nativeEvent) : undefined}
      testID={testID}>
      <ArrangementView modifiers={[arrangementViewStyle('automatic')]}>
        <ArrangementView.Primary>
          <RNHostView>{primary}</RNHostView>
        </ArrangementView.Primary>
        <ArrangementView.Secondary>
          <RNHostView>{secondary}</RNHostView>
        </ArrangementView.Secondary>
      </ArrangementView>
    </Host>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
