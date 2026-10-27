import { buildInfoMessage, describeBuildInfo, type BuildInfoSource } from '@/bootstrap/build-info';
import { DELIVERY_DRILL_MARKER } from '@/bootstrap/delivery-marker';

const base: BuildInfoSource = {
  appVersion: '1.0.0',
  runtimeVersion: '1.0.0',
  channel: 'preview',
  updateId: '0b5d7c1e-0000-4000-8000-000000000000',
  isEmbeddedLaunch: false,
  updatesEnabled: true,
  createdAt: new Date('2026-10-27T14:05:59.123Z'),
  isEmergencyLaunch: false,
  emergencyLaunchReason: null,
  drillMarker: null,
};

function valueOf(source: BuildInfoSource, label: string) {
  return describeBuildInfo(source).find((row) => row.label === label)?.value;
}

describe('describeBuildInfo', () => {
  it('reports the downloaded update ID, its publish time in UTC and a normal launch', () => {
    expect(describeBuildInfo(base)).toEqual([
      { label: 'App version', value: '1.0.0' },
      { label: 'Runtime', value: '1.0.0' },
      { label: 'Channel', value: 'preview' },
      { label: 'Update', value: '0b5d7c1e-0000-4000-8000-000000000000' },
      { label: 'Published', value: '2026-10-27 14:05 UTC' },
      { label: 'Launch', value: 'Normal' },
    ]);
  });

  it('treats an embedded launch as valid rather than missing an update', () => {
    expect(valueOf({ ...base, isEmbeddedLaunch: true }, 'Update')).toBe('Embedded bundle');
  });

  it('names an emergency launch and its reason (expo-updates fell back to the embedded bundle)', () => {
    const source = { ...base, isEmbeddedLaunch: true, isEmergencyLaunch: true, emergencyLaunchReason: 'Failed to launch update' };
    expect(valueOf(source, 'Launch')).toBe('Emergency launch: Failed to launch update');
    expect(valueOf({ ...source, emergencyLaunchReason: null }, 'Launch')).toBe('Emergency launch');
  });

  it('says when updates are disabled in the build and leaves out the update-only rows', () => {
    const source = { ...base, updatesEnabled: false, channel: null, updateId: null, createdAt: null };
    expect(valueOf(source, 'Update')).toBe('Updates disabled in this build');
    expect(valueOf(source, 'Channel')).toBe('Not available');
    expect(describeBuildInfo(source).map((row) => row.label)).toEqual(['App version', 'Runtime', 'Channel', 'Update']);
  });

  // Observed in EAS dev build bdbf2303 on the iPhone 17 simulator: channel '' and no update ID.
  it('labels a Metro-served development client launch instead of showing blanks', () => {
    const source = { ...base, channel: '', updateId: null, isEmbeddedLaunch: false, createdAt: null };
    expect(valueOf(source, 'Channel')).toBe('Not available');
    expect(valueOf(source, 'Update')).toBe('No update loaded');
    expect(valueOf(source, 'Published')).toBe('Not available');
  });

  it('shows the delivery drill marker only when the running bundle carries one', () => {
    expect(valueOf(base, 'Delivery check')).toBeUndefined();
    expect(valueOf({ ...base, drillMarker: 'OTA-1' }, 'Delivery check')).toBe('OTA-1');
  });

  it('keeps the marker off on main: only drill commits set it', () => {
    expect(DELIVERY_DRILL_MARKER).toBeNull();
  });

  it('formats one "Label: value" line per row for the alert', () => {
    expect(buildInfoMessage(describeBuildInfo({ ...base, isEmbeddedLaunch: true }))).toBe(
      'App version: 1.0.0\nRuntime: 1.0.0\nChannel: preview\nUpdate: Embedded bundle\nPublished: 2026-10-27 14:05 UTC\nLaunch: Normal',
    );
  });
});
