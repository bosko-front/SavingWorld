import { isArrangementViewSupported } from '@/shared/layout/arrangement-adapter';
import {
  centeredContentHeight,
  containedRegionOwnership,
  fitAspect,
  isArrangementCollapsed,
  floatingActionEdges,
  floatingActionInset,
  readableColumnWidth,
  safeAreaEdges,
  scrollingScreenOwnership,
  sharedPadding,
  stackedSceneHeight,
  staticRegionOwnership,
} from '@/shared/layout/metrics';

// Layout policy with independently chosen numbers. Values are window/region points as reported
// at runtime; none of them name a device model or a fold position.

describe('inset ownership', () => {
  // Asymmetric insets: a side-controls column or landscape sensor housing on the right only.
  const asymmetric = { top: 62, right: 72, bottom: 34, left: 0 };
  const gutter = { top: 16, right: 16, bottom: 16, left: 16 };

  it('lets the native scroll view own top and bottom, and the shared layer own left and right', () => {
    expect(safeAreaEdges(scrollingScreenOwnership)).toEqual({
      top: 'off',
      bottom: 'off',
      left: 'maximum',
      right: 'maximum',
    });
  });

  it('pads each horizontal edge by the larger of its own inset and the gutter, never their sum', () => {
    expect(sharedPadding(asymmetric, scrollingScreenOwnership, gutter)).toEqual({
      top: 16,
      bottom: 16,
      left: 16,
      right: 72,
    });
  });

  it('does not add native-owned top/bottom insets a second time', () => {
    const padding = sharedPadding(asymmetric, scrollingScreenOwnership, gutter);
    expect(padding.top).toBe(16);
    expect(padding.top).not.toBe(asymmetric.top + gutter.top);
    expect(padding.bottom).toBe(16);
  });

  it('mirrors the left/right result when the side controls move to the other edge', () => {
    const mirrored = { ...asymmetric, left: 72, right: 0 };
    const padding = sharedPadding(mirrored, scrollingScreenOwnership, gutter);
    expect([padding.left, padding.right]).toEqual([72, 16]);
  });

  it('applies all four insets for a static region', () => {
    expect(safeAreaEdges(staticRegionOwnership)).toEqual({
      top: 'maximum',
      right: 'maximum',
      bottom: 'maximum',
      left: 'maximum',
    });
    expect(sharedPadding(asymmetric, staticRegionOwnership, {})).toEqual(asymmetric);
  });
});

describe('contained regions', () => {
  it('adds no inset inside a native container that already applied the safe area', () => {
    expect(safeAreaEdges(containedRegionOwnership)).toEqual({ top: 'off', right: 'off', bottom: 'off', left: 'off' });
    // Folded Duo: an 84 pt side-controls column must not be added again inside the region.
    expect(sharedPadding({ top: 0, right: 84, bottom: 34, left: 0 }, containedRegionOwnership, { left: 16, right: 16 })).toEqual({
      top: 0,
      right: 16,
      bottom: 0,
      left: 16,
    });
  });
});

describe('native arrangement collapse', () => {
  it('is collapsed when the scene covers the whole arranged container', () => {
    // Folded Duo, landscape: the system showed only the scene region.
    expect(isArrangementCollapsed({ width: 594, height: 350 }, { width: 594, height: 350 })).toBe(true);
  });

  it('is not collapsed in a vertical or side-by-side split', () => {
    expect(isArrangementCollapsed({ width: 382, height: 562 }, { width: 382, height: 281 })).toBe(false);
    expect(isArrangementCollapsed({ width: 867, height: 553 }, { width: 434, height: 553 })).toBe(false);
  });

  it('never treats unmeasured sizes as collapsed', () => {
    expect(isArrangementCollapsed({ width: 0, height: 0 }, { width: 594, height: 350 })).toBe(false);
    expect(isArrangementCollapsed({ width: 594, height: 350 }, { width: 678, height: 0 })).toBe(false);
  });
});

describe('content bounds', () => {
  it('fills a narrow window and stops at the readable maximum on a wide one', () => {
    expect(readableColumnWidth(343, 680)).toBe(343);
    expect(readableColumnWidth(1000, 680)).toBe(680);
    expect(readableColumnWidth(-5, 680)).toBe(0);
  });

  it('fits the scene to its own region at a fixed aspect ratio', () => {
    expect(fitAspect({ width: 400, height: 600 }, 4 / 3)).toEqual({ width: 400, height: 300 });
    expect(fitAspect({ width: 800, height: 300 }, 4 / 3)).toEqual({ width: 400, height: 300 });
    expect(fitAspect({ width: 0, height: 300 }, 4 / 3)).toEqual({ width: 0, height: 0 });
    expect(fitAspect({ width: 300, height: 300 }, 0)).toEqual({ width: 0, height: 0 });
  });

  it('caps the stacked fallback scene in a short window so the controls start near the top', () => {
    // Tall window: natural 4:3 height.
    expect(stackedSceneHeight(360, 700, 4 / 3)).toBe(270);
    // Short window (split view, landscape, keyboard): at most 40% of the visible height (Phase 08).
    expect(stackedSceneHeight(360, 300, 4 / 3)).toBe(120);
    // Not yet measured: no scene height rather than a guessed one.
    expect(stackedSceneHeight(0, 700, 4 / 3)).toBe(0);
  });

  it('gives a floating action button room under the scrolling content without counting the bars twice', () => {
    // A 56 pt button, 16 pt bottom margin and an 8 pt gap; the native scroll view already adds the
    // tab bar and home indicator, and the button's own bottom edge adds them too.
    expect(floatingActionInset(56)).toBe(80);
    expect(floatingActionInset(0)).toBe(0);
    expect(floatingActionEdges).toEqual({ top: 'off', bottom: 'additive', left: 'maximum', right: 'maximum' });
  });
});

describe('ArrangementView runtime guard', () => {
  it.each([
    ['18.5', false],
    ['26.0', false],
    ['26.5.1', false],
    ['27.0', false],
    ['27.1', true],
    ['27.10', true],
    ['28.0', true],
    [27, false],
  ])('iOS %s -> %s', (version, expected) => {
    expect(isArrangementViewSupported('ios', version)).toBe(expected);
  });

  it('is never available off iOS', () => {
    expect(isArrangementViewSupported('android', '36')).toBe(false);
    expect(isArrangementViewSupported('web', '28.0')).toBe(false);
  });
});

describe('centered empty states', () => {
  it('uses the visible share of the viewport minus the screen padding', () => {
    // 667 pt viewport (iPhone SE): 75% visible = 500.25, minus 2 × 16 pt padding.
    expect(centeredContentHeight(667, 16)).toBe(468);
    expect(centeredContentHeight(0, 16)).toBe(0);
  });
});
