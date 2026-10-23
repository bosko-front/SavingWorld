// Public layout API (docs/ADAPTIVE_LAYOUT.md). Screens use these primitives; they never read
// physical screen geometry, branch on device models or add their own safe-area padding.
export { AdaptiveGoalLayout, resolveArrangementMode, type ArrangementMode } from './adaptive-goal-layout';
export { arrangementViewAvailable } from './arrangement-adapter';
export { ContentColumn, type ColumnWidth } from './content-column';
export { fitAspect, type Insets, type Size } from './metrics';
export { FormScreen, Screen } from './screen';
export { useFontScale } from './use-font-scale';
export { useMeasuredSize } from './use-measured-size';
