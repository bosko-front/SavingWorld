// Redacted delivery diagnostics: app/runtime/channel/update identity only, never savings data.
// See docs/EAS_AND_OTA.md "Update activation and offline launch". Shown in release builds by pressing
// and holding Settings › About › Version (D142), and in the development section.
import { BUILD_INFO_COPY } from './build-info-copy';

export type BuildInfoSource = {
  appVersion: string | null;
  runtimeVersion: string | null;
  channel: string | null;
  updateId: string | null;
  isEmbeddedLaunch: boolean;
  updatesEnabled: boolean;
  // When the running update was published (embedded or downloaded); null when unknown.
  createdAt: Date | null;
  // expo-updates fell back to the embedded bundle after a launch failure.
  isEmergencyLaunch: boolean;
  emergencyLaunchReason: string | null;
  // DELIVERY_DRILL_MARKER of the running bundle (null outside a delivery drill).
  drillMarker: string | null;
};

export type BuildInfoRow = {
  label: string;
  value: string;
};

// Native values can be null or an empty string (a development client reports channel '').
function orNotAvailable(value: string | null): string {
  return value ? value : BUILD_INFO_COPY.notAvailable;
}

function updateValue(source: BuildInfoSource): string {
  if (!source.updatesEnabled) {
    return BUILD_INFO_COPY.updatesDisabled;
  }
  if (source.isEmbeddedLaunch) {
    return BUILD_INFO_COPY.embeddedBundle;
  }
  // No ID: e.g. a development client running a bundle served by Metro.
  return source.updateId ? source.updateId : BUILD_INFO_COPY.noUpdateLoaded;
}

// UTC and ISO so support can match it with `eas update:list` regardless of the device's language.
function publishedValue(createdAt: Date | null): string {
  if (!createdAt || Number.isNaN(createdAt.getTime())) {
    return BUILD_INFO_COPY.notAvailable;
  }
  return `${createdAt.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function launchValue(source: BuildInfoSource): string {
  if (!source.isEmergencyLaunch) {
    return BUILD_INFO_COPY.normalLaunch;
  }
  return source.emergencyLaunchReason
    ? `${BUILD_INFO_COPY.emergencyLaunch}: ${source.emergencyLaunchReason}`
    : BUILD_INFO_COPY.emergencyLaunch;
}

export function describeBuildInfo(source: BuildInfoSource): BuildInfoRow[] {
  const rows: BuildInfoRow[] = [
    { label: BUILD_INFO_COPY.appVersion, value: orNotAvailable(source.appVersion) },
    { label: BUILD_INFO_COPY.runtime, value: orNotAvailable(source.runtimeVersion) },
    { label: BUILD_INFO_COPY.channel, value: orNotAvailable(source.channel) },
    { label: BUILD_INFO_COPY.update, value: updateValue(source) },
  ];
  if (source.updatesEnabled) {
    rows.push(
      { label: BUILD_INFO_COPY.published, value: publishedValue(source.createdAt) },
      { label: BUILD_INFO_COPY.launch, value: launchValue(source) },
    );
  }
  if (source.drillMarker) {
    rows.push({ label: BUILD_INFO_COPY.drill, value: source.drillMarker });
  }
  return rows;
}

// One "Label: value" line per row, for the native alert.
export function buildInfoMessage(rows: readonly BuildInfoRow[]): string {
  return rows.map((row) => `${row.label}: ${row.value}`).join('\n');
}
