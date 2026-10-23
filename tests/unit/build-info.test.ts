import { describeBuildInfo, type BuildInfoSource } from '@/bootstrap/build-info';

const base: BuildInfoSource = {
  appVersion: '1.0.0',
  runtimeVersion: '1.0.0',
  channel: 'preview',
  updateId: '0b5d7c1e-0000-4000-8000-000000000000',
  isEmbeddedLaunch: false,
  updatesEnabled: true,
};

function valueOf(source: BuildInfoSource, label: string) {
  return describeBuildInfo(source).find((row) => row.label === label)?.value;
}

describe('describeBuildInfo', () => {
  it('reports the downloaded update ID for an OTA launch', () => {
    expect(describeBuildInfo(base)).toEqual([
      { label: 'App version', value: '1.0.0' },
      { label: 'Runtime', value: '1.0.0' },
      { label: 'Channel', value: 'preview' },
      { label: 'Update', value: '0b5d7c1e-0000-4000-8000-000000000000' },
    ]);
  });

  it('treats an embedded launch as valid rather than missing an update', () => {
    expect(valueOf({ ...base, isEmbeddedLaunch: true }, 'Update')).toBe('Embedded bundle');
  });

  it('says when updates are disabled in the build', () => {
    const source = { ...base, updatesEnabled: false, channel: null, updateId: null };
    expect(valueOf(source, 'Update')).toBe('Updates disabled in this build');
    expect(valueOf(source, 'Channel')).toBe('Not available');
  });

  // Observed in EAS dev build bdbf2303 on the iPhone 17 simulator: channel '' and no update ID.
  it('labels a Metro-served development client launch instead of showing blanks', () => {
    const source = { ...base, channel: '', updateId: null, isEmbeddedLaunch: false };
    expect(valueOf(source, 'Channel')).toBe('Not available');
    expect(valueOf(source, 'Update')).toBe('No update loaded');
  });
});
