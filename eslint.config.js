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
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: ['PlatformColor', 'DynamicColorIOS'],
              message: 'Use semantic colors from @/shared/theme; the app ships one light palette.',
            },
          ],
          patterns: [
            {
              group: ['**/theme/palette', '@/shared/theme/palette'],
              message: 'The raw palette is private to src/shared/theme; use semantic colors.',
            },
          ],
        },
      ],
    },
  },
  {
    // The theme module itself composes semantic tokens from the raw palette.
    files: ['src/shared/theme/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
