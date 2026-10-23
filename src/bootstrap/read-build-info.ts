import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

import type { BuildInfoSource } from './build-info';

// Native boundary: reads the values expo-updates embedded at build time. In a development client
// served by Metro, updates are typically disabled, so this reports that rather than an update ID.
export function readBuildInfo(): BuildInfoSource {
  return {
    appVersion: Constants.expoConfig?.version ?? null,
    runtimeVersion: Updates.runtimeVersion,
    channel: Updates.channel,
    updateId: Updates.updateId,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    updatesEnabled: Updates.isEnabled,
  };
}
