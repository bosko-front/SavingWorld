import type { ConfigContext } from 'expo/config';

import buildAppConfig from '../../app.config';
import easJson from '../../eas.json';

// Guards the EAS build/update contract from docs/EAS_AND_OTA.md against accidental drift.
const PROJECT_ID = '25d3089f-a32e-461f-baf2-7c95a396984e';

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
