// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Styling guardrails from docs/DESIGN_SYSTEM.md: raw colors live only in the palette module, text
// always scales with Dynamic Type, and nothing scales layout from physical screen dimensions.
const styleGuardrails = [
  {
    selector: 'Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
    message: 'Use a semantic color from @/shared/theme instead of a hex literal.',
  },
  {
    selector: 'Literal[value=/^(?:rgba?|hsla?)\\(/]',
    message: 'Use a semantic color from @/shared/theme instead of a color function literal.',
  },
  {
    selector: "JSXAttribute[name.name='allowFontScaling'][value.expression.value=false]",
    message: 'Do not disable font scaling; layouts must grow with Dynamic Type.',
  },
  {
    selector: "JSXAttribute[name.name='maxFontSizeMultiplier']",
    message: 'Do not cap Dynamic Type; let text wrap and controls grow.',
  },
  {
    selector: "CallExpression[callee.object.name='Dimensions'][callee.property.name='get']",
    message: 'Use useWindowDimensions or onLayout (docs/ADAPTIVE_LAYOUT.md); no cached screen geometry.',
  },
];

// Imports restricted across src/**. Window geometry and the native adaptive container belong to the
// shared layout layer (docs/ADAPTIVE_LAYOUT.md); `layoutOwner` relaxes only those two entries.
function restrictedImports({ layoutOwner }) {
  return [
    'error',
    {
      paths: [
        {
          name: 'react-native',
          importNames: ['PlatformColor', 'DynamicColorIOS', ...(layoutOwner ? [] : ['useWindowDimensions'])],
          message: layoutOwner
            ? 'Use semantic colors from @/shared/theme; the app ships one light palette.'
            : 'Use semantic colors from @/shared/theme, and size content with @/shared/layout (Screen, AdaptiveGoalLayout, useMeasuredSize) instead of reading the window.',
        },
        ...(layoutOwner
          ? []
          : [
              {
                name: '@expo/ui/swift-ui',
                importNames: ['ArrangementView', 'RNHostView'],
                message: 'Use AdaptiveGoalLayout from @/shared/layout; the native arrangement adapter has one owner.',
              },
            ]),
      ],
      patterns: [
        {
          group: ['**/theme/palette', '@/shared/theme/palette'],
          message: 'The raw palette is private to src/shared/theme; use semantic colors.',
        },
      ],
    },
  ];
}

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'coverage/*', '.expo/*', 'ios/*', 'android/*'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/shared/theme/palette.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...styleGuardrails],
      'no-restricted-imports': restrictedImports({ layoutOwner: false }),
    },
  },
  {
    // The layout layer reads live window metrics and owns the native arrangement adapter; the
    // development lab and gallery display those measurements.
    files: ['src/shared/layout/**/*.{ts,tsx}', 'src/dev/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': restrictedImports({ layoutOwner: true }) },
  },
  {
    // The theme module itself composes semantic tokens from the raw palette.
    files: ['src/shared/theme/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
