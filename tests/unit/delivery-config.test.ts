import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { ConfigContext } from 'expo/config';

import buildAppConfig from '../../app.config';
import easJson from '../../eas.json';

// Guards the EAS build/update contract from docs/EAS_AND_OTA.md against accidental drift.
const PROJECT_ID = '25d3089f-a32e-461f-baf2-7c95a396984e';
// Launch mark width in points (app.config.ts); the PNG carries at least @3x pixels.
const SPLASH_MARK_WIDTH = 120;

const context: ConfigContext = {
  config: {},
  projectRoot: process.cwd(),
  staticConfigPath: null,
  packageJsonPath: null,
};

describe('app.config.ts', () => {
  const config = buildAppConfig(context);

  it('links only the selected EAS project and owner', () => {
    expect(config.owner).toBe('bosko123');
    expect(config.slug).toBe('saving-worlds');
    expect(config.extra?.eas).toEqual({ projectId: PROJECT_ID });
    expect(config.updates?.url).toBe(`https://u.expo.dev/${PROJECT_ID}`);
  });

  it('configures notifications for local scheduling only: no push entitlement or background mode', () => {
    expect(config.plugins).toContainEqual(['expo-notifications', { enableRemoteNotifications: false }]);
    expect(config.ios?.entitlements?.['aps-environment']).toBeUndefined();
    expect(config.ios?.infoPlist?.UIBackgroundModes).toBeUndefined();
  });

  it('uses the appVersion runtime policy', () => {
    expect(config.runtimeVersion).toEqual({ policy: 'appVersion' });
    expect(config.version).toBe('1.0.0');
  });

  it('starts without waiting for the network and activates updates on a later launch', () => {
    expect(config.updates?.checkAutomatically).toBe('ON_LOAD');
    expect(config.updates?.fallbackToCacheTimeout).toBe(0);
    expect(config.updates?.useEmbeddedUpdate).not.toBe(false);
  });

  it('targets iOS with the chosen bundle identifier and no orientation lock', () => {
    expect(config.platforms).toEqual(['ios']);
    expect(config.ios?.bundleIdentifier).toBe('com.bosko123.savingworlds');
    expect(config.orientation).toBe('default');
    expect(config.ios?.requireFullScreen).not.toBe(true);
  });
});

// Reads the PNG header: size, IHDR color type (2 = RGB, 6 = RGBA) and which chunks exist.
function pngInfo(file: string) {
  const bytes = readFileSync(path.join(process.cwd(), file));
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const chunks = new Set<string>();
  for (let offset = 8; offset < bytes.length; offset += 12 + bytes.readUInt32BE(offset)) {
    chunks.add(bytes.toString('latin1', offset + 4, offset + 8));
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25], chunks };
}

describe('app icon and launch screen (Phase 19.5, DECISIONS D139)', () => {
  const config = buildAppConfig(context);
  const icons = { light: './assets/images/icon-light.png', dark: './assets/images/icon-dark.png', tinted: './assets/images/icon-tinted.png' };

  it('uses the Saving Worlds light, dark and tinted icons, never the Expo template', () => {
    expect(config.icon).toBe(icons.light);
    expect(config.ios?.icon).toEqual(icons);
    expect(JSON.stringify(config)).not.toMatch(/assets\/images\/(icon|splash-icon)\.png/);
    expect(existsSync(path.join(process.cwd(), 'assets/images/icon.png'))).toBe(false);
    expect(existsSync(path.join(process.cwd(), 'assets/images/splash-icon.png'))).toBe(false);
  });

  it.each(Object.entries(icons))('%s icon is 1024 x 1024, opaque RGB, sRGB tagged', (_name, file) => {
    const png = pngInfo(file);
    expect([png.width, png.height]).toEqual([1024, 1024]);
    expect(png.colorType).toBe(2);
    expect(png.chunks.has('tRNS')).toBe(false);
    expect(png.chunks.has('sRGB') || png.chunks.has('iCCP')).toBe(true);
  });

  it('shows the small transparent island mark on the cream launch screen, no animation', () => {
    const splash = config.plugins?.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen');
    expect(Array.isArray(splash) ? splash[1] : undefined).toEqual({
      backgroundColor: '#F6F4EA',
      image: './assets/images/splash-mark.png',
      imageWidth: SPLASH_MARK_WIDTH,
      resizeMode: 'contain',
    });
    const mark = pngInfo('./assets/images/splash-mark.png');
    expect(mark.width).toBe(mark.height);
    expect(mark.width).toBeGreaterThanOrEqual(SPLASH_MARK_WIDTH * 3);
    expect(mark.colorType).toBe(6);
  });
});

describe('eas.json', () => {
  type Profile = { channel?: string; environment?: string; developmentClient?: boolean; extends?: string };
  const profiles = easJson.build as Record<string, Profile>;

  it.each([
    ['development', 'development', 'development'],
    ['preview', 'preview', 'production'],
    ['production', 'production', 'production'],
  ])('%s profile uses channel %s and environment %s', (name, channel, environment) => {
    const profile = profiles[name];
    expect(profile?.channel).toBe(channel);
    expect(profile?.environment).toBe(environment);
  });

  it('only development profiles build a development client', () => {
    expect(profiles.development?.developmentClient).toBe(true);
    expect(profiles['development-simulator']?.extends).toBe('development');
    expect(profiles.preview?.developmentClient).toBeUndefined();
    expect(profiles.production?.developmentClient).toBeUndefined();
  });

  it('targets the verified App Store Connect app and team, with no credentials (docs/APPLE_SETUP.md)', () => {
    expect(easJson.submit).toEqual({ production: { ios: { ascAppId: '6827062634', appleTeamId: '86J9LHRPM3' } } });
    expect(JSON.stringify(easJson)).not.toMatch(/ascApiKey|\.p8|password|appleId"/i);
  });
});
