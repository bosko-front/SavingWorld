import type { Edge, EdgeRecord } from 'react-native-safe-area-context';

// Pure layout rules (docs/ADAPTIVE_LAYOUT.md). Inputs are live window/region measurements in
// React Native points; nothing here reads a device model, a physical screen or a fold position,
// and no result is persisted. Financial logic never imports this module.

export type Size = { width: number; height: number };
export type Insets = Record<Edge, number>;

// Who applies the safe-area inset on each edge of a screen.
// - `native`: the native scroll view adjusts its content inset (navigation bar, tab bar, home
//   indicator, keyboard). Adding padding as well would apply the inset twice.
// - `shared`: our SafeAreaView adds it, measured natively for that view's own frame. This covers
//   the left/right edges, which a vertical UIScrollView never adjusts, including the iPhone Duo
//   side-controls column.
// - `container`: a native container has already placed the region inside the safe area (the
//   SwiftUI host of the native arrangement). Adding any inset there applies it twice; observed on
//   the folded iPhone Duo as an extra 84 pt right margin beside the side-controls column.
export type EdgeOwner = 'native' | 'shared' | 'container';
export type InsetOwnership = Record<Edge, EdgeOwner>;

// A vertically scrolling screen inside native Stack/NativeTabs chrome.
export const scrollingScreenOwnership: InsetOwnership = {
  top: 'native',
  bottom: 'native',
  left: 'shared',
  right: 'shared',
};

// A region that does not scroll, for example the scene region of AdaptiveGoalLayout.
export const staticRegionOwnership: InsetOwnership = {
  top: 'shared',
  bottom: 'shared',
  left: 'shared',
  right: 'shared',
};

// A region hosted inside the native arrangement container.
export const containedRegionOwnership: InsetOwnership = {
  top: 'container',
  bottom: 'container',
  left: 'container',
  right: 'container',
};

// A floating action button at the bottom trailing corner of a scrolling screen (Screen and
// AdaptiveGoalLayout `floatingAction`, DECISIONS D72-D73). It sits above the tab bar and home
// indicator, so its bottom margin is added to the measured inset; the sides use max(inset, margin)
// like a scrolling screen's gutter, so a long label at a large text size wraps inside them.
export const floatingActionEdges: EdgeRecord = { top: 'off', bottom: 'additive', left: 'maximum', right: 'maximum' };

// Distance of the floating button from the bottom and trailing edges of the usable area.
export const FLOATING_ACTION_MARGIN = 16;

// Extra bottom content inset under a floating button: its measured height, its bottom margin and a
// small gap, so the last row can scroll clear of it. The native scroll view adds the tab bar and
// home indicator itself (`automatic`), exactly as the button's bottom edge does, so neither is
// counted here.
export function floatingActionInset(buttonHeight: number): number {
  return buttonHeight > 0 ? Math.ceil(buttonHeight + FLOATING_ACTION_MARGIN + 8) : 0;
}

// SafeAreaView edges for an ownership. `maximum` means padding = max(inset, gutter): the gutter
// is a minimum margin, not added on top of the inset.
export function safeAreaEdges(ownership: InsetOwnership): EdgeRecord {
  const edges: EdgeRecord = {};
  for (const edge of EDGES) {
    edges[edge] = ownership[edge] === 'shared' ? 'maximum' : 'off';
  }
  return edges;
}

// The padding our layer applies for given insets. Mirrors the native SafeAreaView `maximum` mode
// so the policy can be tested with asymmetric insets; the component itself relies on the native
// measurement rather than on these numbers.
export function sharedPadding(insets: Insets, ownership: InsetOwnership, gutter: Partial<Insets>): Insets {
  const padding = { top: 0, right: 0, bottom: 0, left: 0 };
  for (const edge of EDGES) {
    const minimum = gutter[edge] ?? 0;
    padding[edge] = ownership[edge] === 'shared' ? Math.max(insets[edge], minimum) : minimum;
  }
  return padding;
}

// Width of a readable column inside the available width. The column never exceeds the available
// width and never stretches past the readable maximum.
export function readableColumnWidth(availableWidth: number, maxWidth: number): number {
  return Math.max(0, Math.min(availableWidth, maxWidth));
}

// The largest box with the given width/height ratio that fits the measured region. Scenes keep
// their aspect ratio and size to their own region, never to the physical screen.
export function fitAspect(region: Size, aspectRatio: number): Size {
  if (region.width <= 0 || region.height <= 0 || !(aspectRatio > 0)) {
    return { width: 0, height: 0 };
  }
  const widthLimited = { width: region.width, height: region.width / aspectRatio };
  if (widthLimited.height <= region.height) {
    return roundSize(widthLimited);
  }
  return roundSize({ width: region.height * aspectRatio, height: region.height });
}

// Scene height in the single-column fallback: full column width at the scene's aspect ratio, but
// never more than `maxShare` of the visible height, so the saved amount and actions stay close in a
// short window. Text size is irrelevant here; controls below scroll and grow with Dynamic Type.
export function stackedSceneHeight(columnWidth: number, visibleHeight: number, aspectRatio: number, maxShare = 0.4): number {
  if (columnWidth <= 0 || !(aspectRatio > 0)) {
    return 0;
  }
  const natural = columnWidth / aspectRatio;
  const cap = visibleHeight > 0 ? visibleHeight * maxShare : natural;
  return Math.round(Math.min(natural, cap));
}

// The native arrangement is collapsed when the primary (scene) region covers the whole arranged
// container: the secondary (controls) region then has no visible space. Observed on the folded
// iPhone Duo in landscape, where the system shows only the primary region whatever the style or
// split limits. Unmeasured sizes never count as collapsed.
export function isArrangementCollapsed(container: Size, primary: Size): boolean {
  if (container.width <= 0 || container.height <= 0 || primary.width <= 0 || primary.height <= 0) {
    return false;
  }
  return primary.width >= container.width - 1 && primary.height >= container.height - 1;
}

// Ignore sub-point jitter from repeated layout passes so measurement state settles.
export function sameSize(a: Size, b: Size): boolean {
  return Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;
}

const EDGES: readonly Edge[] = ['top', 'right', 'bottom', 'left'];

function roundSize(size: Size): Size {
  return { width: Math.round(size.width), height: Math.round(size.height) };
}

// Share of a tab screen's scroll viewport that its native large-title header and tab bar usually
// leave visible (about a quarter is chrome on both small and large iPhones). Used only to center an
// empty state; financial content never depends on it.
export const CENTERED_VISIBLE_SHARE = 0.75;

// Height of the column that centers an empty state: the visible share of the viewport minus the
// screen's own top and bottom padding. 0 before the first layout.
export function centeredContentHeight(viewportHeight: number, verticalPadding: number): number {
  return Math.max(0, Math.round(viewportHeight * CENTERED_VISIBLE_SHARE - 2 * verticalPadding));
}
