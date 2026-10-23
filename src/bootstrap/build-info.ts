// Redacted delivery diagnostics: app/runtime/channel/update identity only, never savings data.
// See docs/EAS_AND_OTA.md "Update activation and offline launch".

export type BuildInfoSource = {
  appVersion: string | null;
  runtimeVersion: string | null;
  channel: string | null;
  updateId: string | null;
  isEmbeddedLaunch: boolean;
  updatesEnabled: boolean;
};

export type BuildInfoRow = {
  label: string;
  value: string;
};

const NOT_AVAILABLE = 'Not available';

// Native values can be null or an empty string (a development client reports channel '').
function orNotAvailable(value: string | null): string {
  return value ? value : NOT_AVAILABLE;
}

export function describeBuildInfo(source: BuildInfoSource): BuildInfoRow[] {
  let update: string;
  if (!source.updatesEnabled) {
    update = 'Updates disabled in this build';
  } else if (source.isEmbeddedLaunch) {
    update = 'Embedded bundle';
  } else if (source.updateId) {
    update = source.updateId;
  } else {
    // e.g. a development client running a bundle served by Metro
    update = 'No update loaded';
  }

  return [
    { label: 'App version', value: orNotAvailable(source.appVersion) },
    { label: 'Runtime', value: orNotAvailable(source.runtimeVersion) },
    { label: 'Channel', value: orNotAvailable(source.channel) },
    { label: 'Update', value: update },
  ];
}
