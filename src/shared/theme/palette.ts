// Raw product palette (DESIGN_SYSTEM "Final palette"). This is the only file in src/ allowed to hold
// color literals; ESLint enforces that. UI code uses the semantic `colors` from '@/shared/theme',
// never these names. app.config.ts imports this file for native launch colors, so it must stay
// free of React Native imports.
//
// After any change here, run the contrast tests (tests/unit/contrast.test.ts) and update the
// palette and contrast tables in docs/DESIGN_SYSTEM.md.
export const palette = {
  cream: '#F6F4EA',
  white: '#FFFFFF',
  sage100: '#E5EEDF',
  forest900: '#20352D',
  moss700: '#53665A',
  forest700: '#256447',
  forest800: '#1B4D36',
  stone500: '#6A7A70',
  stone200: '#DCE1D6',
  ash100: '#E6E8E1',
  ash400: '#A3ADA6',
  ash600: '#5C6860',
  brick700: '#9B403D',
  red700: '#B3261E',
  red50: '#FBEAE8',
  blue700: '#245C92',
  blue50: '#E7EEF6',
  gold400: '#D7B66B',
} as const;
