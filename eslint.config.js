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

// English catalog (Phase 19, docs/UI_UX_GUIDELINES.md "Accessibility and localization"): visible
// text and spoken names live in the features' *-copy.ts modules and src/shared/i18n, never inline
// in a component. Applied to .tsx files outside the development-only tools.
const TEXT_PROPS =
  '/^(label|title|message|detail|caption|placeholder|hint|value|text|accessibilityLabel|accessibilityHint|accessibilityValue|infoTitle|infoMessage|description)$/';
const WORDS = '/[A-Za-z]{2}/';
const CATALOG_MESSAGE = 'Put visible text and spoken names in the feature copy module (*-copy.ts) or src/shared/i18n (English catalog).';
// A string written as text, or as either branch of a short condition, directly in a JSX child or a
// text prop. Arguments of a function call (copy helpers) and testIDs are not text.
function inlineText(context) {
  return [
    `${context} > Literal[value=${WORDS}]`,
    `${context} > TemplateLiteral > TemplateElement[value.raw=${WORDS}]`,
    `${context} > ConditionalExpression > Literal[value=${WORDS}]`,
    `${context} > ConditionalExpression > TemplateLiteral > TemplateElement[value.raw=${WORDS}]`,
    `${context} > LogicalExpression > Literal[value=${WORDS}]`,
    `${context} > ObjectExpression > Property[key.name='text'] > Literal[value=${WORDS}]`,
    `${context} > ObjectExpression > Property[key.name='text'] > TemplateLiteral > TemplateElement[value.raw=${WORDS}]`,
  ];
}
const catalogGuardrails = [
  `JSXText[value=${WORDS}]`,
  `JSXAttribute[name.name=${TEXT_PROPS}] > Literal[value=${WORDS}]`,
  ...inlineText(`JSXAttribute[name.name=${TEXT_PROPS}] > JSXExpressionContainer`),
  ...inlineText('JSXElement > JSXExpressionContainer'),
  `CallExpression[callee.name='showToast'] Property[key.name=/^(title|message)$/] > Literal[value=${WORDS}]`,
  `CallExpression[callee.name='showToast'] Property[key.name=/^(title|message)$/] > TemplateLiteral > TemplateElement[value.raw=${WORDS}]`,
  `CallExpression[callee.object.name='Alert'] > Literal[value=${WORDS}]`,
  `CallExpression[callee.object.name='Alert'] > TemplateLiteral > TemplateElement[value.raw=${WORDS}]`,
  `CallExpression[callee.object.name='Alert'] Property[key.name='text'] > Literal[value=${WORDS}]`,
].map((selector) => ({ selector, message: CATALOG_MESSAGE }));

// Imports restricted across src/**. Window geometry and the native adaptive container belong to the
// shared layout layer (docs/ADAPTIVE_LAYOUT.md); `layoutOwner` relaxes only those two entries.
// SQLite belongs to the data layer (docs/ARCHITECTURE.md): only src/data/db talks to expo-sqlite.
// The toast engine, SF Symbols and haptics each have one shared wrapper (docs/DESIGN_SYSTEM.md).
// The weekly reminder's local-notification adapter is the one module that imports expo-notifications.
// The store adapter (PurchaseGateway) is the one module that imports expo-iap.
function restrictedImports({
  layoutOwner,
  sqliteOwner = false,
  toastOwner = false,
  iconOwner = false,
  hapticsOwner = false,
  notificationsOwner = false,
  iapOwner = false,
}) {
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
        ...(sqliteOwner
          ? []
          : [
              {
                name: 'expo-sqlite',
                message: 'Use repositories and commands from src/data and src/features; only src/data/db opens SQLite.',
              },
            ]),
        ...(toastOwner
          ? []
          : [
              {
                name: 'sonner-native',
                message: 'Use showToast from @/shared/ui/toast; screens never import the toast engine.',
              },
            ]),
        ...(iconOwner
          ? []
          : [
              {
                name: 'expo-symbols',
                message: 'Use Icon from @/shared/ui/icon with a semantic name.',
              },
            ]),
        ...(hapticsOwner
          ? []
          : [
              {
                name: 'expo-haptics',
                message: 'Use haptics from @/shared/ui/haptics (success, warning, milestone, selection).',
              },
            ]),
        ...(notificationsOwner
          ? []
          : [
              {
                name: 'expo-notifications',
                message: 'Use the reminder adapter in src/features/reminders/native; no other module schedules notifications.',
              },
            ]),
        ...(iapOwner
          ? []
          : [
              {
                name: 'expo-iap',
                message: 'Use the PurchaseGateway in src/features/billing/native; rights come only from the entitlement reconciler.',
              },
            ]),
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
    files: ['src/**/*.tsx'],
    // Development-only tools and the layout lab's sample screens are not part of the product.
    ignores: ['src/dev/**', 'src/app/dev-*.tsx', 'src/app/**/dev-*.tsx', 'src/app/sample-form.tsx', 'src/app/(tabs)/(home)/details.tsx'],
    rules: { 'no-restricted-syntax': ['error', ...styleGuardrails, ...catalogGuardrails] },
  },
  {
    // The layout layer reads live window metrics and owns the native arrangement adapter; the
    // development lab and gallery display those measurements.
    files: ['src/shared/layout/**/*.{ts,tsx}', 'src/dev/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': restrictedImports({ layoutOwner: true }) },
  },
  {
    files: ['src/shared/ui/toast.tsx'],
    rules: { 'no-restricted-imports': restrictedImports({ layoutOwner: false, toastOwner: true }) },
  },
  {
    files: ['src/shared/ui/icon.tsx'],
    rules: { 'no-restricted-imports': restrictedImports({ layoutOwner: false, iconOwner: true }) },
  },
  {
    files: ['src/shared/ui/haptics.ts'],
    rules: { 'no-restricted-imports': restrictedImports({ layoutOwner: false, hapticsOwner: true }) },
  },
  {
    // The development-only reminder lab inspects the notification center directly (Phase 14 evidence).
    files: ['src/features/reminders/native/notification-gateway.ts', 'src/dev/reminder-lab.tsx'],
    rules: { 'no-restricted-imports': restrictedImports({ layoutOwner: false, notificationsOwner: true }) },
  },
  {
    // The PurchaseGateway is the one module that talks to StoreKit through expo-iap (Phase 15).
    files: ['src/features/billing/native/store-gateway.ts'],
    rules: { 'no-restricted-imports': restrictedImports({ layoutOwner: false, iapOwner: true }) },
  },
  {
    // The SQLite adapter is the one module that imports expo-sqlite.
    files: ['src/data/db/**/*.ts'],
    rules: { 'no-restricted-imports': restrictedImports({ layoutOwner: false, sqliteOwner: true }) },
  },
  {
    // The theme module itself composes semantic tokens from the raw palette.
    files: ['src/shared/theme/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // Pure domain rules (docs/ARCHITECTURE.md): no React, database, native or app-layer imports,
    // and no reading the real time except through the Clock boundary in calendar/clock.ts.
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-*', 'react-native', 'react-native-*', 'expo', 'expo-*', '@expo/*', 'zustand'],
              message: 'src/core is pure TypeScript; React, native, database and store packages belong to features.',
            },
            {
              group: ['@/*', '!@/core', '!@/core/*'],
              message: 'src/core may import only other src/core modules.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        ...styleGuardrails,
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Take a Clock (src/core/calendar/clock.ts) instead of reading the real time.',
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'Take a Clock (src/core/calendar/clock.ts) instead of reading the real time.',
        },
        {
          selector: "CallExpression[callee.name='parseFloat']",
          message: 'Money is parsed exactly with parseAmount; no float parsing.',
        },
      ],
    },
  },
  {
    files: ['src/core/calendar/clock.ts'],
    rules: { 'no-restricted-syntax': ['error', ...styleGuardrails] },
  },
]);
