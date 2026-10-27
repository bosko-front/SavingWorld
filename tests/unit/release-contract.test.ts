import type { ConfigContext } from 'expo/config';

import buildAppConfig from '../../app.config';
import easJson from '../../eas.json';
import packageJson from '../../package.json';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const contract = require('../../scripts/release/release-contract.js') as typeof import('../../scripts/release/release-contract.js');

// Phase 20: the rules of the delivery compatibility gate (scripts/release-check.mjs).

const context: ConfigContext = { config: {}, projectRoot: process.cwd(), staticConfigPath: null, packageJsonPath: null };
const config = buildAppConfig(context);

function failures(findings: { level: string; id: string }[]) {
  return findings.filter((item) => item.level === 'fail').map((item) => item.id);
}

describe('checkDeliveryConfig', () => {
  it('passes the repository configuration', () => {
    expect(failures(contract.checkDeliveryConfig(config, easJson, packageJson.scripts.eas))).toEqual([]);
  });

  it('fails a blocking launch, a disabled embedded fallback or another runtime policy', () => {
    const blocking = { ...config, updates: { ...config.updates, fallbackToCacheTimeout: 30000 } };
    expect(failures(contract.checkDeliveryConfig(blocking, easJson, packageJson.scripts.eas))).toEqual(['nonblocking-launch']);
    const noEmbedded = { ...config, updates: { ...config.updates, useEmbeddedUpdate: false } };
    expect(failures(contract.checkDeliveryConfig(noEmbedded, easJson, packageJson.scripts.eas))).toEqual(['embedded-fallback']);
    const fingerprintPolicy = { ...config, runtimeVersion: { policy: 'fingerprint' } };
    expect(failures(contract.checkDeliveryConfig(fingerprintPolicy, easJson, packageJson.scripts.eas))).toEqual(['runtime-policy']);
  });

  it('fails a preview profile routed to production, a runtime override, an unknown profile and an unpinned CLI', () => {
    const build = {
      ...easJson.build,
      preview: { ...easJson.build.preview, channel: 'production' },
      'preview-simulator': { ...easJson.build['preview-simulator'], runtimeVersion: '1.0.0' },
      staging: { channel: 'staging', environment: 'preview' },
    };
    const ids = failures(contract.checkDeliveryConfig(config, { ...easJson, build }, 'npx --yes eas-cli@latest'));
    expect(ids).toEqual(['profile-preview', 'profile-preview-simulator', 'runtime-preview-simulator', 'profile-staging', 'cli-pin']);
  });

  it('resolves extended profiles (preview-simulator inherits channel and environment)', () => {
    expect(contract.resolveProfile(easJson.build, 'preview-simulator')).toMatchObject({ channel: 'preview', environment: 'production', ios: { simulator: true } });
    expect(contract.resolveProfile(easJson.build, 'missing')).toBeNull();
  });
});

describe('stored-data contract', () => {
  const files = [
    { path: 'src/data/db/migrations/0001-initial-ledger.ts', content: 'one' },
    { path: 'src/data/db/migrations/0005-entitlements.ts', content: 'five' },
    { path: 'src/data/repositories/settings-repository.ts', content: 'settings' },
    { path: 'src/features/goals/presentation/goal-form.tsx', content: 'screen' },
  ];

  it('hashes only the files that define stored meaning, and reads the newest schema version', () => {
    const persisted = contract.persistedContract(files);
    expect(Object.keys(persisted.files)).toEqual([
      'src/data/db/migrations/0001-initial-ledger.ts',
      'src/data/db/migrations/0005-entitlements.ts',
      'src/data/repositories/settings-repository.ts',
    ]);
    expect(contract.latestSchemaVersion(files)).toBe(5);
    expect(contract.persistedContract([...files].reverse()).sha256).toBe(persisted.sha256);
    expect(contract.persistedContract(files.map((file) => (file.path.endsWith('.tsx') ? { ...file, content: 'new screen' } : file))).sha256).toBe(persisted.sha256);
  });

  it('covers every migration and the stored records of the app (guards the list against renames)', () => {
    const fs = jest.requireActual<typeof import('fs')>('fs');
    const present = [
      'src/data/db/migration-runner.ts',
      'src/data/db/hash.ts',
      'src/data/repositories/row-codec.ts',
      'src/data/repositories/settings-repository.ts',
      'src/data/repositories/receipt-repository.ts',
      'src/data/repositories/entitlement-repository.ts',
      'src/core/money/iso-4217.ts',
      'src/core/money/minor-units.ts',
      'src/core/progression/theme-ids.ts',
      ...fs.readdirSync('src/data/db/migrations').map((name) => `src/data/db/migrations/${name}`),
    ];
    for (const file of present) {
      expect(fs.existsSync(file)).toBe(true);
      expect(contract.isPersistedContractFile(file)).toBe(true);
    }
  });

  const shared = {
    appVersion: '1.0.0',
    fingerprint: 'a'.repeat(40),
    schemaVersion: 5,
    persisted: contract.persistedContract(files),
  };
  const current = { runtimeVersion: '1.0.0', ...shared };

  it('treats a runtime without a recorded contract as not shared yet', () => {
    expect(contract.checkRuntimeContract(undefined, current)).toEqual([expect.objectContaining({ level: 'info', id: 'runtime-unshared' })]);
  });

  it('passes JavaScript-only changes on a shared runtime', () => {
    expect(failures(contract.checkRuntimeContract(shared, current))).toEqual([]);
  });

  it('fails a native change, a new schema or a changed stored-data file under a shared runtime', () => {
    expect(failures(contract.checkRuntimeContract(shared, { ...current, fingerprint: 'b'.repeat(40) }))).toEqual(['native-contract']);
    const withMigration = [...files, { path: 'src/data/db/migrations/0006-new.ts', content: 'six' }];
    expect(
      failures(contract.checkRuntimeContract(shared, { ...current, schemaVersion: 6, persisted: contract.persistedContract(withMigration) })),
    ).toEqual(['schema-contract', 'persisted-contract']);
    const editedSettings = files.map((file) => (file.path.includes('settings') ? { ...file, content: 'settings v2' } : file));
    const findings = contract.checkRuntimeContract(shared, { ...current, persisted: contract.persistedContract(editedSettings) });
    expect(failures(findings)).toEqual(['persisted-contract']);
    expect(findings.find((item) => item.id === 'persisted-contract')?.message).toMatch(/settings-repository\.ts/);
  });
});
