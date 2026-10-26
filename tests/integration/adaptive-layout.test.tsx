import { act, fireEvent, render, screen, userEvent, within } from '@testing-library/react-native';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { HeaderHeightContext } from 'expo-router/react-navigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LayoutLab } from '@/dev/layout-lab';
import { resetMountCounts } from '@/dev/mount-count';
import { SampleFormSheet } from '@/dev/sample-form-sheet';
import { AdaptiveGoalLayout, FormScreen, resolveArrangementMode, Screen, useSceneInsets } from '@/shared/layout';
import { arrangementViewAvailable } from '@/shared/layout/arrangement-adapter';

// Layout behavior through the React tree. Jest cannot lay out native views, so region sizes are
// fed in as layout events and window changes as Dimensions updates; actual safe areas, side
// controls, folds and split view are verified on simulators (docs/evidence/PHASE_03.md).

// Jest has no Platform.Version, so the adapter reports ArrangementView as unavailable unless a test
// switches it on to exercise the native branch.
jest.mock('../../src/shared/layout/arrangement-adapter', () => ({
  ...jest.requireActual('../../src/shared/layout/arrangement-adapter'),
  arrangementViewAvailable: jest.fn(() => false),
}));

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ back: jest.fn() }),
}));

type WindowMetrics = { width: number; height: number; fontScale: number };

async function setWindow({ width, height, fontScale }: WindowMetrics) {
  await act(async () => {
    Dimensions.set({
      window: { width, height, scale: 3, fontScale },
      screen: { width, height, scale: 3, fontScale },
    });
  });
}

async function layout(testID: string, width: number, height: number) {
  await fireEvent(screen.getByTestId(testID), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height } } });
}

// Window sizes a test might see: narrow outer display, wide inner display, split view, a short
// landscape window, each with default and accessibility text. Plain numbers, not device classes.
const WINDOW_SEQUENCE: WindowMetrics[] = [
  { width: 466, height: 678, fontScale: 1 },
  { width: 669, height: 951, fontScale: 1 },
  { width: 334, height: 951, fontScale: 1 },
  { width: 951, height: 669, fontScale: 1 },
  { width: 678, height: 300, fontScale: 3.1 },
  { width: 375, height: 667, fontScale: 1.35 },
];

// The lab displays window safe-area values; asymmetric right inset as on a side-controls column.
function LabWithInsets() {
  return (
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 466, height: 678 }, insets: { top: 62, right: 72, bottom: 20, left: 0 } }}>
      <LayoutLab />
    </SafeAreaProvider>
  );
}

function scrollViews(): Node[] {
  return findAll(screen.toJSON() as unknown as Node, (node) => node.type === 'RCTScrollView');
}

function scrollProps(): Record<string, unknown> {
  const [scroll] = scrollViews();
  return scroll?.props ?? {};
}

describe('Screen and FormScreen inset and keyboard policy', () => {
  it('leaves top/bottom insets to the native scroll view and measures left/right natively', async () => {
    await render(
      <Screen>
        <Text>Body</Text>
      </Screen>,
    );
    expect(scrollProps()).toMatchObject({
      contentInsetAdjustmentBehavior: 'automatic',
      automaticallyAdjustKeyboardInsets: false,
    });
    const [safeArea] = findAll(screen.toJSON() as unknown as Node, (node) => node.type === 'RNCSafeAreaView');
    expect(safeArea?.props?.edges).toEqual({ top: 'off', right: 'maximum', bottom: 'off', left: 'maximum' });
    expect(screen.getByText('Body')).toBeOnTheScreen();
  });

  it('keeps forms keyboard-safe and lets buttons work while the keyboard is shown', async () => {
    await render(
      <FormScreen>
        <Text>Field</Text>
      </FormScreen>,
    );
    expect(scrollProps()).toMatchObject({
      contentInsetAdjustmentBehavior: 'automatic',
      automaticallyAdjustKeyboardInsets: true,
      keyboardShouldPersistTaps: 'handled',
      keyboardDismissMode: 'interactive',
    });
  });

  it('constrains forms to the form width and screens to the readable width', async () => {
    const { rerender } = await render(
      <Screen>
        <Text>Body</Text>
      </Screen>,
    );
    const columnStyle = () => screen.getByText('Body').parent?.props.style as unknown[];
    expect(columnStyle()).toEqual(expect.arrayContaining([{ maxWidth: 680 }]));
    await rerender(
      <FormScreen>
        <Text>Body</Text>
      </FormScreen>,
    );
    expect(columnStyle()).toEqual(expect.arrayContaining([{ maxWidth: 560 }]));
  });
});

describe('pinned footer (FormScreen footer, D125)', () => {
  it('pins the footer under the content, and moves it to the end of the content when it would take over 35% of the screen', async () => {
    await render(
      <FormScreen footer={<Text>Buy</Text>} testID="footer-screen">
        <Text>Body</Text>
      </FormScreen>,
    );
    expect(within(screen.getByTestId('screen-footer-pinned')).getByText('Buy')).toBeOnTheScreen();
    const measure = async (testID: string, height: number) =>
      fireEvent(screen.getByTestId(testID), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 375, height } } });
    // Viewport 400 + pinned footer 200 = a 600 pt screen.
    await measure('footer-screen', 400);
    await measure('screen-footer', 200);
    expect(screen.getByTestId('screen-footer-pinned')).toBeOnTheScreen();
    // Larger text: the footer grows to 300 of the same 600 pt screen (over 35%).
    await measure('footer-screen', 300);
    await measure('screen-footer', 300);
    expect(screen.queryByTestId('screen-footer-pinned')).toBeNull();
    expect(screen.getByText('Buy')).toBeOnTheScreen();
    expect(screen.getByText('Body')).toBeOnTheScreen();
  });
});

describe('AdaptiveGoalLayout fallback composition', () => {
  function Sample() {
    return (
      <AdaptiveGoalLayout
        testID="goal-layout"
        arrangement="fallback"
        sceneAspectRatio={4 / 3}
        scene={<Text>Scene</Text>}
        controls={<Text>Controls</Text>}
      />
    );
  }

  function sceneHeight() {
    const style = screen.getByTestId('adaptive-scene-region').props.style as { height?: number }[];
    return style.find((entry) => entry && 'height' in entry)?.height;
  }

  it('shows the scene before the controls in one scrolling column', async () => {
    await render(<Sample />);
    expect(screen.getByText('Scene')).toBeOnTheScreen();
    expect(screen.getByText('Controls')).toBeOnTheScreen();
    expect(scrollViews()).toHaveLength(1);
  });

  it('sizes the scene from its measured column and caps it in a short window', async () => {
    await render(<Sample />);
    await layout('goal-layout', 390, 700);
    await layout('adaptive-scene-region', 360, 0);
    expect(sceneHeight()).toBe(270);

    await layout('goal-layout', 390, 300);
    expect(sceneHeight()).toBe(120);
  });

  it('full-bleed scene (D80): full width, up under the bars, art sized from the window width and kept clear of the bars', async () => {
    function InsetProbe() {
      const insets = useSceneInsets();
      return <Text testID="scene-insets">{JSON.stringify(insets)}</Text>;
    }
    const tree = (
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 375, height: 667 }, insets: { top: 20, right: 0, bottom: 0, left: 0 } }}>
        <HeaderHeightContext.Provider value={64}>
          <AdaptiveGoalLayout
            testID="goal-layout"
            arrangement="fallback"
            sceneAspectRatio={1.2}
            sceneBleed
            sceneBleedColor="#CFE6EE"
            scene={<InsetProbe />}
            controls={<Text>Controls</Text>}
          />
        </HeaderHeightContext.Provider>
      </SafeAreaProvider>
    );
    await render(tree);
    await layout('goal-layout', 375, 618);
    const region = screen.getByTestId('adaptive-scene-region');
    // Outside the padded column, pulled up by the header height (status bar included).
    expect(screen.getByTestId('goal-layout')).toContainElement(region);
    // Art: (375 − 16 − 16) / 1.2 = 285.8 → 286, under half of 618; plus the 64 + 4 pt top inset.
    expect(region).toHaveStyle({ width: '100%', marginTop: -64, height: 68 + 286 });
    expect(JSON.parse(String(screen.getByTestId('scene-insets').props.children))).toEqual({ top: 68, right: 16, bottom: 0, left: 16 });

    // No scroll indicator over the world; a pull-down shows the sky's top color above it (D82).
    expect(scrollProps().showsVerticalScrollIndicator).toBe(false);
    expect(screen.getByTestId('adaptive-overscroll-sky')).toHaveStyle({ position: 'absolute', bottom: '100%', height: 618, backgroundColor: '#CFE6EE' });

    // A short window caps the art at half the visible height.
    await layout('goal-layout', 667, 300);
    expect(region).toHaveStyle({ height: 68 + 150 });
  });

  it('floats the primary action at the bottom trailing corner, above the tab bar', async () => {
    await render(
      <AdaptiveGoalLayout
        testID="goal-layout"
        arrangement="fallback"
        sceneAspectRatio={4 / 3}
        scene={<Text>Scene</Text>}
        controls={<Text>Controls</Text>}
        floatingAction={<Text>Add</Text>}
      />,
    );
    const slot = screen.getByTestId('floating-action-slot');
    expect(slot).toHaveTextContent('Add');
    // Outside the scroll view; the bottom edge adds the tab bar / home indicator inset.
    expect(screen.getByTestId('goal-layout')).not.toContainElement(screen.getByText('Add'));
    expect(slot.props.edges).toEqual({ top: 'off', bottom: 'additive', left: 'maximum', right: 'maximum' });
    expect(slot).toHaveStyle({ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'flex-end' });
    expect(scrollViews()).toHaveLength(1);
    // The scroll view keeps its frame; once the button is measured, its content gets room for it.
    expect(scrollProps().contentInset).toBeUndefined();
    await fireEvent(slot.children[0] as never, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 56, height: 56 } } });
    expect(scrollProps()).toMatchObject({ contentInset: { bottom: 80 }, scrollIndicatorInsets: { bottom: 80 } });
    // The wrapper only lays out (no background), so Fabric flattens it and UIKit still finds the
    // scroll view for the large title.
    const [wrapper] = findAll(screen.toJSON() as unknown as Node, (node) =>
      Boolean(node.children?.some((child) => child.props?.testID === 'floating-action-slot')),
    );
    expect(wrapper?.children?.[0]?.type).toBe('RCTScrollView');
    expect(StyleSheet.flatten(wrapper?.props?.style as object)).toEqual({ flex: 1 });
  });

  it('Screen takes the same floating action', async () => {
    await render(
      <Screen floatingAction={<Text>Add</Text>}>
        <Text>Rows</Text>
      </Screen>,
    );
    expect(screen.getByTestId('floating-action-slot')).toHaveTextContent('Add');
    expect(scrollViews()).toHaveLength(1);
  });
});

describe('AdaptiveGoalLayout native arrangement (iOS 27.1+)', () => {
  beforeEach(() => {
    jest.mocked(arrangementViewAvailable).mockReturnValue(true);
  });
  afterEach(() => {
    jest.mocked(arrangementViewAvailable).mockReturnValue(false);
  });

  it('uses the native container only when available and not overridden', () => {
    expect(resolveArrangementMode('automatic')).toBe('native');
    expect(resolveArrangementMode('fallback')).toBe('fallback');
    jest.mocked(arrangementViewAvailable).mockReturnValue(false);
    expect(resolveArrangementMode('automatic')).toBe('fallback');
  });

  it('hosts exactly one React Native element per region inside the native container', async () => {
    await render(
      <AdaptiveGoalLayout sceneAspectRatio={4 / 3} scene={<View testID="scene" />} controls={<View testID="controls" />} />,
    );
    const json = screen.toJSON() as unknown as Node;
    const host = findAll(json, (node) => node.props?.ignoreSafeArea === 'keyboard');
    expect(host).toHaveLength(1);
    for (const slot of ['primary', 'secondary']) {
      const [slotNode] = findAll(json, (node) => node.props?.name === slot);
      // Slot -> one RNHostView -> exactly one React Native parent element for the region.
      expect(slotNode?.children).toHaveLength(1);
      const hostView = slotNode?.children?.[0];
      expect(hostView?.props?.matchContentsVertical).toBe(false);
      expect(hostView?.children).toHaveLength(1);
    }
    expect(screen.getByTestId('scene')).toBeOnTheScreen();
    expect(screen.getByTestId('controls')).toBeOnTheScreen();
    // The controls region scrolls on its own, handles the keyboard itself and adds no safe-area
    // inset: the native host already keeps it clear of bars and the side-controls column.
    expect(scrollProps()).toMatchObject({ automaticallyAdjustKeyboardInsets: true, contentInsetAdjustmentBehavior: 'never' });
    const [safeArea] = findAll(screen.toJSON() as unknown as Node, (node) => node.type === 'RNCSafeAreaView');
    expect(safeArea?.props?.edges).toEqual({ top: 'off', right: 'off', bottom: 'off', left: 'off' });
  });

  it('floats the primary action over the controls region without adding safe-area insets', async () => {
    await render(
      <AdaptiveGoalLayout sceneAspectRatio={4 / 3} scene={<View testID="scene" />} controls={<Text>Controls</Text>} floatingAction={<Text>Add</Text>} />,
    );
    const slot = screen.getByTestId('floating-action-slot');
    expect(screen.getByTestId('adaptive-controls-region')).toContainElement(slot);
    // The native host already keeps the region inside the safe area.
    expect(slot.props.edges).toEqual({ top: 'off', right: 'off', bottom: 'off', left: 'off' });
  });

  it('switches to the stacked composition when the system collapses to the scene, and back on a window change', async () => {
    await setWindow({ width: 678, height: 466, fontScale: 1 });
    await render(
      <AdaptiveGoalLayout
        testID="goal-layout"
        sceneAspectRatio={4 / 3}
        scene={<Text>Scene</Text>}
        controls={<Text>Controls</Text>}
      />,
    );
    const nativeTree = () => findAll(screen.toJSON() as unknown as Node, (node) => node.props?.ignoreSafeArea === 'keyboard');
    expect(nativeTree()).toHaveLength(1);

    // Folded Duo in landscape: the scene region fills the whole arranged container.
    await fireEvent(screen.getByTestId('goal-layout'), 'layoutContent', { nativeEvent: { width: 594, height: 350 } });
    await layout('adaptive-scene-region', 594, 350);
    expect(nativeTree()).toHaveLength(0);
    expect(screen.getByText('Scene')).toBeOnTheScreen();
    expect(screen.getByText('Controls')).toBeOnTheScreen();

    // Rotating or unfolding changes the window, so the native arrangement is tried again.
    await setWindow({ width: 466, height: 678, fontScale: 1 });
    expect(nativeTree()).toHaveLength(1);
  });

  it('keeps the layout lab state when the lab renders in the native container', async () => {
    resetMountCounts();
    await render(<LabWithInsets />);
    await userEvent.type(screen.getByTestId('layout-lab-draft'), 'abc');
    for (const metrics of WINDOW_SEQUENCE) {
      await setWindow(metrics);
      await layout('sample-scene-region', metrics.width / 2, metrics.height);
    }
    expect(screen.getByTestId('layout-lab-draft')).toHaveDisplayValue('abc');
    expect(screen.getByText('Native ArrangementView')).toBeOnTheScreen();
    expect(screen.getByText('1 / 1')).toBeOnTheScreen();
  });
});

type Node = { type?: string; props?: Record<string, unknown>; children?: Node[] | null };

function findAll(node: Node | Node[] | string | null | undefined, match: (node: Node) => boolean): Node[] {
  if (!node || typeof node === 'string') return [];
  if (Array.isArray(node)) return node.flatMap((child) => findAll(child, match));
  return [...(match(node) ? [node] : []), ...findAll(node.children ?? null, match)];
}

describe('state survives repeated arrangement and size changes', () => {
  beforeEach(async () => {
    resetMountCounts();
    await setWindow({ width: 466, height: 678, fontScale: 1 });
  });

  it('keeps the layout lab draft, selected goal and press count, with no remount', async () => {
    await render(<LabWithInsets />);
    await userEvent.type(screen.getByTestId('layout-lab-draft'), '12.50 trip');
    await userEvent.press(screen.getByRole('button', { name: 'Garden' }));

    for (const metrics of WINDOW_SEQUENCE) {
      await setWindow(metrics);
      await layout('layout-lab', metrics.width, metrics.height);
      await layout('adaptive-scene-region', metrics.width - 32, 0);
      await layout('sample-scene-region', metrics.width - 32, metrics.height / 3);
    }

    expect(screen.getByTestId('layout-lab-draft')).toHaveDisplayValue('12.50 trip');
    expect(screen.getByRole('button', { name: 'Garden (selected)' })).toBeOnTheScreen();
    expect(screen.getByTestId('layout-lab-saves')).toHaveTextContent('Pretend saves: 0. Nothing is stored.');
    expect(screen.getByText('1 / 1')).toBeOnTheScreen();
    // The last window size and text scale are displayed: the layout did react.
    expect(screen.getByText('375×667 pt, text ×1.35')).toBeOnTheScreen();
    expect(screen.getByText('62 72 20 0')).toBeOnTheScreen();
  });

  it('keeps the sample sheet draft through detent-like resizes without submitting', async () => {
    await render(<SampleFormSheet />);
    await userEvent.type(screen.getByTestId('sample-form-amount'), '40');
    await userEvent.type(screen.getByTestId('sample-form-note'), 'Bike');
    for (const metrics of WINDOW_SEQUENCE) {
      await setWindow(metrics);
      await layout('sample-form-sheet', metrics.width, metrics.height / 2);
      await layout('sample-form-sheet', metrics.width, metrics.height);
    }
    expect(screen.getByTestId('sample-form-amount')).toHaveDisplayValue('40');
    expect(screen.getByTestId('sample-form-note')).toHaveDisplayValue('Bike');
    expect(screen.getByText('Pretend saves: 0')).toBeOnTheScreen();
    expect(screen.getByText(/Form mounted 1 time\./)).toBeOnTheScreen();
  });
});
