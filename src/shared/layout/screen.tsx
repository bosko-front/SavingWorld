import { useState, type ReactElement, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { borders, colors, layout, spacing } from '@/shared/theme';

import { ContentColumn, type ColumnWidth } from './content-column';
import {
  centeredContentHeight,
  containedRegionOwnership,
  FLOATING_ACTION_MARGIN,
  floatingActionEdges,
  floatingActionInset,
  footerEdges,
  pinFooter,
  safeAreaEdges,
  scrollingScreenOwnership,
} from './metrics';
import { useMeasuredSize } from './use-measured-size';

const SCROLLING_EDGES = safeAreaEdges(scrollingScreenOwnership);
const CONTAINED_EDGES = safeAreaEdges(containedRegionOwnership);
const NO_EDGES = { top: 'off', right: 'off', bottom: 'off', left: 'off' } as const;

type ScreenProps = {
  children: ReactNode;
  width?: ColumnWidth;
  // Centers the content in the visible height when it is shorter than the screen (empty states).
  // Longer content, e.g. at large text sizes, still starts at the top and scrolls.
  centered?: boolean;
  // The screen's one primary action as a floating button (FloatingActionButton) at the bottom
  // trailing corner, always visible while the content scrolls under it (DECISIONS D72).
  floatingAction?: ReactElement;
  // Actions that stay visible under the scrolling content (the paywall's purchase block, D125),
  // pinned to the bottom above the home indicator. When it would take more than
  // PINNED_FOOTER_MAX_SHARE of the screen (large Dynamic Type, a short window) it is placed at the
  // end of the content instead, so it never hides the content.
  footer?: ReactNode;
  testID?: string;
};

type ScrollingScreenProps = ScreenProps & {
  keyboard: 'form' | 'none';
  // Visible scroll viewport, for content that sizes itself to the window it is shown in.
  onViewportLayout?: (event: LayoutChangeEvent) => void;
  // `container` inside the native arrangement, whose host already applies every safe-area inset.
  insets?: 'screen' | 'container';
  // Full-width content above the column, outside its gutters (AdaptiveGoalLayout's full-bleed
  // scene). It scrolls with the content and positions itself, e.g. under a transparent bar.
  bleed?: ReactNode;
  // Hides the vertical scroll indicator (Home's full-bleed composition, owner decision D82).
  hideScrollIndicator?: boolean;
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
  floatingAction,
  footer,
  bleed,
  hideScrollIndicator = false,
}: ScrollingScreenProps) {
  const form = keyboard === 'form';
  const contained = insets === 'container';
  // Centered content (empty states): React Native does not report the native header and tab-bar
  // insets, so the column gets the share of the scroll viewport those bars usually leave visible
  // (centeredContentHeight) and centers its content in it. Taller content simply scrolls.
  const [viewportHeight, setViewportHeight] = useState(0);
  const [action, onActionLayout] = useMeasuredSize();
  const extraBottomInset = floatingAction ? floatingActionInset(action.height) : 0;
  // The screen's height is the scroll viewport plus a pinned footer (the wrapper itself is never
  // measured: a listener would keep it from being flattened, see below).
  const [viewport, setViewport] = useState(0);
  const [footerSize, onFooterLayout] = useMeasuredSize();
  const [footerPinned, setFooterPinned] = useState(true);
  const pinned = footer !== undefined && footerPinned;
  const measuredScreen = viewport + (pinned ? footerSize.height : 0);
  if (footer !== undefined && footerSize.height > 0 && viewport > 0 && pinFooter(measuredScreen, footerSize.height) !== footerPinned) {
    setFooterPinned(!footerPinned);
  }
  const footerContent = footer === undefined ? null : (
    <View onLayout={onFooterLayout} testID="screen-footer">
      {footer}
    </View>
  );
  const scroll = (
    <ScrollView
      testID={testID}
      onLayout={(event) => {
        onViewportLayout?.(event);
        if (footer !== undefined) {
          setViewport(event.nativeEvent.layout.height);
        }
        if (centered) {
          setViewportHeight(event.nativeEvent.layout.height);
        }
      }}
      style={styles.scroll}
      showsVerticalScrollIndicator={!hideScrollIndicator}
      contentInsetAdjustmentBehavior={contained ? 'never' : 'automatic'}
      contentInset={extraBottomInset > 0 ? { bottom: extraBottomInset } : undefined}
      scrollIndicatorInsets={extraBottomInset > 0 ? { bottom: extraBottomInset } : undefined}
      // Forms: iOS grows the bottom inset by the keyboard height, so the focused field, its error
      // and the Save action stay scroll-reachable; taps on buttons work while the keyboard is up.
      automaticallyAdjustKeyboardInsets={form}
      keyboardShouldPersistTaps={form ? 'handled' : 'never'}
      keyboardDismissMode={form ? 'interactive' : 'on-drag'}>
      {bleed}
      <SafeAreaView edges={contained ? CONTAINED_EDGES : SCROLLING_EDGES} style={styles.content}>
        <ContentColumn width={width} minHeight={centered ? centeredContentHeight(viewportHeight, spacing.lg) : undefined}>
          {children}
          {footerContent && !pinned ? <View style={styles.inlineFooter}>{footerContent}</View> : null}
        </ContentColumn>
      </SafeAreaView>
    </ScrollView>
  );
  if (footerContent) {
    // Layout only, like the floating host: the scroll view stays the first native subview. The
    // footer draws its own canvas and a hairline, so content scrolling under it reads as continuing.
    return (
      <View style={styles.floatingHost}>
        {scroll}
        {pinned ? (
          <SafeAreaView edges={footerEdges} style={styles.footer} testID="screen-footer-pinned">
            <ContentColumn width={width}>{footerContent}</ContentColumn>
          </SafeAreaView>
        ) : null}
      </View>
    );
  }
  if (!floatingAction) {
    return scroll;
  }
  // The wrapper must stay layout-only: Fabric then flattens it and the scroll view stays the first
  // native subview. A wrapper that draws (even a background) hid the scroll view from UIKit, and the
  // native large title stopped collapsing (seen on the SE, iOS 18.5). The scroll view keeps its full
  // frame; its content gets room for the button through `contentInset`.
  return (
    <View style={styles.floatingHost}>
      {scroll}
      <SafeAreaView
        edges={contained ? NO_EDGES : floatingActionEdges}
        style={styles.floatingSlot}
        pointerEvents="box-none"
        testID="floating-action-slot">
        <View onLayout={onActionLayout}>{floatingAction}</View>
      </SafeAreaView>
    </View>
  );
}

// Standard screen inside native Stack/NativeTabs chrome: vertical scrolling, readable column,
// growing text. Every later screen uses this (or FormScreen / AdaptiveGoalLayout) instead of its
// own ScrollView and safe-area code.
export function Screen({ children, width = 'readable', centered = false, floatingAction, testID }: ScreenProps) {
  return (
    <ScrollingScreen width={width} centered={centered} keyboard="none" floatingAction={floatingAction} testID={testID}>
      {children}
    </ScrollingScreen>
  );
}

// Screen for text input, including native form sheets. Same insets as Screen plus keyboard-safe
// scrolling. Keep the draft in the route component (or its store) above FormScreen so a resize,
// rotation or sheet detent change re-lays out the form without resetting it.
export function FormScreen({ children, width = 'form', footer, testID }: ScreenProps) {
  return (
    <ScrollingScreen width={width} keyboard="form" footer={footer} testID={testID}>
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
  // Layout only, so Fabric flattens it away; never add a background here (see ScrollingScreen).
  floatingHost: {
    flex: 1,
  },
  footer: {
    backgroundColor: colors.canvas,
    borderTopWidth: borders.hairline,
    borderTopColor: colors.borderSubtle,
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  inlineFooter: {
    marginTop: spacing.lg,
  },
  // Full width so the button's label can wrap at large text; touches outside the button pass
  // through to the content (pointerEvents box-none).
  floatingSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'flex-end',
    paddingHorizontal: FLOATING_ACTION_MARGIN,
    paddingBottom: FLOATING_ACTION_MARGIN,
  },
});
