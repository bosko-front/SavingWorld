import { useWindowDimensions } from 'react-native';

// The current text-size multiplier (Dynamic Type / Larger Text). Window metrics belong to this
// layer (docs/ADAPTIVE_LAYOUT.md); shared controls that size a non-text element to match text,
// such as icons, read the multiplier here instead of reading the window themselves.
export function useFontScale(): number {
  return useWindowDimensions().fontScale;
}
