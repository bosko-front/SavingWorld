import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '@/shared/theme';

import { ContentColumn, type ColumnWidth } from './content-column';
import { centeredContentHeight, containedRegionOwnership, safeAreaEdges, scrollingScreenOwnership } from './metrics';

const SCROLLING_EDGES = safeAreaEdges(scrollingScreenOwnership);
const CONTAINED_EDGES = safeAreaEdges(containedRegionOwnership);

type ScreenProps = {
  children: ReactNode;
  width?: ColumnWidth;
  // Centers the content in the visible height when it is shorter than the screen (empty states).
  // Longer content, e.g. at large text sizes, still starts at the top and scrolls.
  centered?: boolean;
  testID?: string;
};

type ScrollingScreenProps = ScreenProps & {
  keyboard: 'form' | 'none';
  // Visible scroll viewport, for content that sizes itself to the window it is shown in.
  onViewportLayout?: (event: LayoutChangeEvent) => void;
  // `container` inside the native arrangement, whose host already applies every safe-area inset.
  insets?: 'screen' | 'container';
};

// Inset ownership (docs/ADAPTIVE_LAYOUT.md):
// - top/bottom: the native scroll view (`contentInsetAdjustmentBehavior="automatic"`) adjusts for
//   the native header, tab bar and home indicator, so content scrolls under translucent chrome
//   but can always be scrolled clear of it. We add no top/bottom inset, only spacing.
// - left/right: a native SafeAreaView inside the scroll content measures its own overlap with the
//   window safe area (landscape sensor housing, iPhone Duo side-controls column, split view) and
//   pads by max(inset, gutter). A vertical UIScrollView never adjusts these edges itself.
// Internal to src/shared/layout; screens use Screen, FormScreen or AdaptiveGoalLayout.
export function ScrollingScreen({
  children,
  width,
  centered = false,
  keyboard,
  testID,
  onViewportLayout,
  insets = 'screen',
}: ScrollingScreenProps) {
  const form = keyboard === 'form';
  const contained = insets === 'container';
  // Centered content (empty states): React Native does not report the native header and tab-bar
  // insets, so the column gets the share of the scroll viewport those bars usually leave visible
  // (centeredContentHeight) and centers its content in it. Taller content simply scrolls.
  const [viewportHeight, setViewportHeight] = useState(0);
  return (
    <ScrollView
      testID={testID}
      onLayout={(event) => {
        onViewportLayout?.(event);
        if (centered) {
          setViewportHeight(event.nativeEvent.layout.height);
        }
      }}
      style={styles.scroll}
      contentInsetAdjustmentBehavior={contained ? 'never' : 'automatic'}
      // Forms: iOS grows the bottom inset by the keyboard height, so the focused field, its error
      // and the Save action stay scroll-reachable; taps on buttons work while the keyboard is up.
      automaticallyAdjustKeyboardInsets={form}
      keyboardShouldPersistTaps={form ? 'handled' : 'never'}
      keyboardDismissMode={form ? 'interactive' : 'on-drag'}>
      <SafeAreaView edges={contained ? CONTAINED_EDGES : SCROLLING_EDGES} style={styles.content}>
        <ContentColumn width={width} minHeight={centered ? centeredContentHeight(viewportHeight, spacing.lg) : undefined}>
          {children}
        </ContentColumn>
      </SafeAreaView>
    </ScrollView>
  );
}

// Standard screen inside native Stack/NativeTabs chrome: vertical scrolling, readable column,
// growing text. Every later screen uses this (or FormScreen / AdaptiveGoalLayout) instead of its
// own ScrollView and safe-area code.
export function Screen({ children, width = 'readable', centered = false, testID }: ScreenProps) {
  return (
    <ScrollingScreen width={width} centered={centered} keyboard="none" testID={testID}>
      {children}
    </ScrollingScreen>
  );
}

// Screen for text input, including native form sheets. Same insets as Screen plus keyboard-safe
// scrolling. Keep the draft in the route component (or its store) above FormScreen so a resize,
// rotation or sheet detent change re-lays out the form without resetting it.
export function FormScreen({ children, width = 'form', testID }: ScreenProps) {
  return (
    <ScrollingScreen width={width} keyboard="form" testID={testID}>
      {children}
    </ScrollingScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingVertical: spacing.lg,
  },
});
