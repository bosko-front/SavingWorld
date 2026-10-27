import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

import type { BuildInfoSource } from './build-info';
import { DELIVERY_DRILL_MARKER } from './delivery-marker';

// Native boundary: reads the values expo-updates embedded at build time and the identity of the
// update this launch is running. In a development client served by Metro, updates are typically
// disabled, so this reports that rather than an update ID. Reads only; never checks, fetches or
// reloads (no reload during financial work, docs/EAS_AND_OTA.md).
export function readBuildInfo(): BuildInfoSource {
  return {
    appVersion: Constants.expoConfig?.version ?? null,
    runtimeVersion: Updates.runtimeVersion,
    channel: Updates.channel,
    updateId: Updates.updateId,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    updatesEnabled: Updates.isEnabled,
    createdAt: Updates.createdAt,
    isEmergencyLaunch: Updates.isEmergencyLaunch,
    emergencyLaunchReason: Updates.emergencyLaunchReason,
    drillMarker: DELIVERY_DRILL_MARKER,
  };
}
