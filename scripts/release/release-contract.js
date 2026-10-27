// Pure rules of the delivery compatibility gate (Phase 20, docs/EAS_AND_OTA.md "Runtime compatibility
// policy"). scripts/release-check.mjs gathers the inputs; tests/unit/release-contract.test.ts checks
// the rules. CommonJS without dependencies so both Node and Jest load it unchanged.
const crypto = require('node:crypto');

const PROJECT_ID = '25d3089f-a32e-461f-baf2-7c95a396984e';

// docs/EAS_AND_OTA.md "Build profiles channels and environments".
const EXPECTED_PROFILES = {
  development: { channel: 'development', environment: 'development' },
  'development-simulator': { channel: 'development', environment: 'development' },
  preview: { channel: 'preview', environment: 'production' },
  'preview-simulator': { channel: 'preview', environment: 'production' },
  production: { channel: 'production', environment: 'production' },
};

// Files whose content defines what the stored data means: the schema and its runner, the receipt and
// row encodings, the settings JSON records, the stored entitlement, the currency registry version
// stored with the currency, the minor-unit limits and the theme versions stored with souvenirs. Under
// a shared runtime any change here needs a new app version, or an explicit reviewed re-record when
// the change provably keeps the stored meaning (for example a comment).
const PERSISTED_CONTRACT_PATTERNS = [
  /^src\/data\/db\/migrations\/[^/]+\.ts$/,
  /^src\/data\/db\/migration-runner\.ts$/,
  /^src\/data\/db\/hash\.ts$/,
  /^src\/data\/repositories\/row-codec\.ts$/,
  /^src\/data\/repositories\/settings-repository\.ts$/,
  /^src\/data\/repositories\/receipt-repository\.ts$/,
  /^src\/data\/repositories\/entitlement-repository\.ts$/,
  /^src\/core\/money\/iso-4217\.ts$/,
  /^src\/core\/money\/minor-units\.ts$/,
  /^src\/core\/progression\/theme-ids\.ts$/,
];

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function isPersistedContractFile(file) {
  return PERSISTED_CONTRACT_PATTERNS.some((pattern) => pattern.test(file));
}

// files: [{ path, content }] with repository-relative POSIX paths.
function persistedContract(files) {
  const entries = files
    .filter((file) => isPersistedContractFile(file.path))
    .sort((a, b) => (a.path < b.path ? -1 : 1))
    .map((file) => [file.path, sha256(file.content)]);
  const hashes = Object.fromEntries(entries);
  return { sha256: sha256(JSON.stringify(entries)), files: hashes };
}

// The newest migration number, read from the registered migration file names (NNNN-name.ts).
function latestSchemaVersion(files) {
  const versions = files
    .map((file) => /^src\/data\/db\/migrations\/(\d{4})-[^/]+\.ts$/.exec(file.path))
    .filter(Boolean)
    .map((match) => Number(match[1]));
  return versions.length ? Math.max(...versions) : 0;
}

function resolveProfile(build, name, seen = new Set()) {
  const profile = build[name];
  if (!profile || seen.has(name)) {
    return null;
  }
  seen.add(name);
  const base = profile.extends ? resolveProfile(build, profile.extends, seen) : {};
  if (base === null) {
    return null;
  }
  return { ...base, ...profile, ios: { ...(base.ios ?? {}), ...(profile.ios ?? {}) } };
}

function finding(ok, id, message) {
  return { level: ok ? 'pass' : 'fail', id, message };
}

// appConfig: the evaluated app.config.ts; easJson: eas.json; easScript: package.json "eas" script.
function checkDeliveryConfig(appConfig, easJson, easScript) {
  const out = [];
  const updates = appConfig.updates ?? {};
  out.push(finding(appConfig.extra?.eas?.projectId === PROJECT_ID, 'project', `EAS project ${appConfig.extra?.eas?.projectId ?? 'missing'}`));
  out.push(finding(appConfig.owner === 'bosko123' && appConfig.slug === 'saving-worlds', 'owner', `owner/slug ${appConfig.owner}/${appConfig.slug}`));
  out.push(finding(updates.url === `https://u.expo.dev/${PROJECT_ID}`, 'update-url', `update URL ${updates.url ?? 'missing'}`));
  out.push(
    finding(
      appConfig.runtimeVersion && appConfig.runtimeVersion.policy === 'appVersion',
      'runtime-policy',
      `runtime policy ${JSON.stringify(appConfig.runtimeVersion)}`,
    ),
  );
  out.push(
    finding(
      updates.checkAutomatically === 'ON_LOAD' && updates.fallbackToCacheTimeout === 0,
      'nonblocking-launch',
      `check ${updates.checkAutomatically}, launch wait ${updates.fallbackToCacheTimeout} ms`,
    ),
  );
  out.push(
    finding(
      updates.useEmbeddedUpdate !== false && updates.disableAntiBrickingMeasures !== true,
      'embedded-fallback',
      'embedded update and anti-bricking measures stay enabled',
    ),
  );
  out.push(finding(typeof appConfig.version === 'string' && /^\d+\.\d+\.\d+$/.test(appConfig.version), 'app-version', `app version ${appConfig.version}`));

  const build = easJson.build ?? {};
  for (const [name, expected] of Object.entries(EXPECTED_PROFILES)) {
    const profile = resolveProfile(build, name);
    out.push(
      finding(
        profile !== null && profile.channel === expected.channel && profile.environment === expected.environment,
        `profile-${name}`,
        `${name}: channel ${profile?.channel}, environment ${profile?.environment}`,
      ),
    );
  }
  for (const [name, profile] of Object.entries(build)) {
    if (!(name in EXPECTED_PROFILES)) {
      out.push(finding(false, `profile-${name}`, `${name}: unknown profile (add it to the documented matrix first)`));
    }
    out.push(finding(profile.runtimeVersion === undefined, `runtime-${name}`, `${name}: no runtime override`));
  }
  const cliRange = /^>=\s*(\d+\.\d+\.\d+)$/.exec(easJson.cli?.version ?? '');
  const scriptPin = /eas-cli@(\d+\.\d+\.\d+)/.exec(easScript ?? '');
  out.push(
    finding(
      Boolean(cliRange && scriptPin && cliRange[1] === scriptPin[1]),
      'cli-pin',
      `eas-cli pinned ${scriptPin?.[1] ?? 'missing'}, eas.json requires ${easJson.cli?.version ?? 'missing'}`,
    ),
  );
  return out;
}

// recorded: the runtime's entry in delivery/runtime-contracts.json (undefined when never shared);
// current: { runtimeVersion, appVersion, fingerprint, schemaVersion, persisted }.
function checkRuntimeContract(recorded, current) {
  if (!recorded) {
    return [
      {
        level: 'info',
        id: 'runtime-unshared',
        message: `runtime ${current.runtimeVersion} has no recorded contract yet: nothing has been shared on it, so it is free to change. Record it with the first shared build.`,
      },
    ];
  }
  const out = [];
  out.push(finding(recorded.appVersion === current.appVersion, 'contract-version', `recorded app version ${recorded.appVersion}, current ${current.appVersion}`));
  out.push(
    finding(
      recorded.fingerprint === current.fingerprint,
      'native-contract',
      recorded.fingerprint === current.fingerprint
        ? `native fingerprint ${current.fingerprint.slice(0, 12)} matches the shared runtime`
        : `native fingerprint ${current.fingerprint.slice(0, 12)} differs from the shared runtime's ${recorded.fingerprint.slice(0, 12)}: a native change needs a new app version, runtime and build`,
    ),
  );
  out.push(
    finding(
      recorded.schemaVersion === current.schemaVersion,
      'schema-contract',
      `schema ${current.schemaVersion} (shared runtime: ${recorded.schemaVersion})`,
    ),
  );
  const before = recorded.persisted?.files ?? {};
  const after = current.persisted.files;
  const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((file) => before[file] !== after[file]).sort();
  out.push(
    finding(
      changed.length === 0,
      'persisted-contract',
      changed.length === 0
        ? 'stored-data contract files unchanged'
        : `stored-data contract files changed under a shared runtime: ${changed.join(', ')} (new app version, or a reviewed re-record if the stored meaning is provably unchanged)`,
    ),
  );
  return out;
}

module.exports = {
  EXPECTED_PROFILES,
  PROJECT_ID,
  checkDeliveryConfig,
  checkRuntimeContract,
  isPersistedContractFile,
  latestSchemaVersion,
  persistedContract,
  resolveProfile,
};
