import type { ConfigContext, ExpoConfig } from 'expo/config';

// Public identifiers only. EAS credentials, signing material and tokens never live in this file.
// See docs/EAS_AND_OTA.md for the runtime/channel contract these values implement.
const EAS_PROJECT_ID = '25d3089f-a32e-461f-baf2-7c95a396984e';
const IOS_BUNDLE_IDENTIFIER = 'com.bosko123.savingworlds';
// Native launch color. The Expo config loader cannot import the TypeScript palette module, so this
// copies LAUNCH_BACKGROUND (src/shared/theme/palette.ts); tests/unit/contrast.test.ts guards the match.
const LAUNCH_BACKGROUND = '#F6F4EA';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Saving Worlds',
  slug: 'saving-worlds',
  owner: 'bosko123',
  // appVersion runtime policy: any native, SDK, permission or persisted-data contract change
  // requires a new `version` (and native build). Bumping only ios.buildNumber keeps the runtime.
  version: '1.0.0',
  runtimeVersion: { policy: 'appVersion' },
  scheme: 'savingworlds',
  platforms: ['ios'],
  // Native resizing stays enabled; adaptive layout is owned by Phase 03, not an orientation lock.
  orientation: 'default',
  // Release 1.0 ships one light palette (DESIGN_SYSTEM, DECISIONS D37). Forcing the light
  // appearance keeps native bars, sheets and system controls legible over the light app surfaces
  // when the OS is set to Dark. Do not switch to 'automatic' without a complete dark palette.
  userInterfaceStyle: 'light',
  // Root view color behind screens during launch and transitions (applied by expo-system-ui).
  backgroundColor: LAUNCH_BACKGROUND,
  icon: './assets/images/icon.png',
  ios: {
    bundleIdentifier: IOS_BUNDLE_IDENTIFIER,
    supportsTablet: false,
    config: { usesNonExemptEncryption: false },
  },
  updates: {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    // Check on launch without waiting: start from the embedded/cached bundle immediately and
    // activate a downloaded update on a later normal launch. No forced reload.
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: LAUNCH_BACKGROUND,
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    'expo-sqlite',
    'expo-localization',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    ...config.extra,
    eas: { projectId: EAS_PROJECT_ID },
  },
});
