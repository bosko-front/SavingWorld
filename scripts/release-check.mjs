#!/usr/bin/env node
// node scripts/release-check.mjs — the delivery compatibility gate and release record (Phase 20,
// docs/EAS_AND_OTA.md "Runtime compatibility policy" and "Preview verification and promotion").
//
// What it does, truthfully:
//   1. evaluates app.config.ts and eas.json and checks the documented delivery contract (project,
//      update URL, appVersion runtime policy, nonblocking launch, embedded fallback, the profile →
//      channel/environment matrix, no runtime override, pinned EAS CLI);
//   2. computes the native fingerprint (expo-updates fingerprint:generate, iOS) and the stored-data
//      contract (schema version and hashes of the files that define stored meaning) and compares them
//      with delivery/runtime-contracts.json for the current runtime. A runtime is "shared" once a build
//      on it left this machine; from then on a native or stored-data change fails the gate;
//   3. with --eas, reads EAS (read-only): channel → branch mappings, the production branch's updates,
//      the finished iOS builds on this runtime and their fingerprints, and the latest preview updates;
//   4. with --publish, also requires a clean Git tree (the update's source revision must be exact);
//   5. with --record <build-id> --reason "<why>", writes the runtime's contract after checking that
//      EAS computed the same fingerprint for that build. Nothing else writes files or changes EAS.
// Exit 0 when every check passes, 1 when a check fails, 2 when a tool or input is missing.
// Options: --eas, --publish, --record <build-id>, --reason <text>, --out <release-record.json>.
// Not an npm script on purpose: @expo/fingerprint hashes package.json "scripts", so adding one would
// change the native fingerprint of every build on the runtime.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const {
  checkDeliveryConfig,
  checkRuntimeContract,
  latestSchemaVersion,
  persistedContract,
} = require('./release/release-contract.js');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CONTRACTS = path.join(ROOT, 'delivery', 'runtime-contracts.json');

function fail(message) {
  console.error(`release:check: ${message}`);
  process.exit(2);
}

function args() {
  const list = process.argv.slice(2);
  const value = (name) => {
    const index = list.indexOf(name);
    return index >= 0 ? list[index + 1] : undefined;
  };
  return {
    eas: list.includes('--eas'),
    publish: list.includes('--publish'),
    record: value('--record'),
    reason: value('--reason'),
    out: value('--out'),
  };
}

function run(command, commandArgs, { json = false } = {}) {
  try {
    const output = execFileSync(command, commandArgs, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
    return json ? JSON.parse(output) : output.trim();
  } catch (error) {
    fail(`${command} ${commandArgs.join(' ')} failed: ${String(error.stderr ?? error.message).split('\n').slice(-3).join(' ')}`);
  }
}

// EAS CLI pinned by package.json ("npm run eas"); read-only commands only. No stdin, so a command can
// never wait for an answer (not every command accepts --non-interactive).
function eas(commandArgs) {
  return run('npx', ['--yes', 'eas-cli@25.3.0', ...commandArgs, '--json'], { json: true });
}

function easOptional(commandArgs) {
  try {
    const output = execFileSync('npx', ['--yes', 'eas-cli@25.3.0', ...commandArgs, '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(output);
  } catch {
    return null;
  }
}

function trackedFiles() {
  return run('git', ['ls-files', '-z', 'src'])
    .split('\0')
    .filter(Boolean)
    .filter((file) => fs.existsSync(path.join(ROOT, file)))
    .map((file) => ({ path: file, content: fs.readFileSync(path.join(ROOT, file), 'utf8') }));
}

function readContracts() {
  if (!fs.existsSync(CONTRACTS)) {
    return { runtimes: {} };
  }
  return JSON.parse(fs.readFileSync(CONTRACTS, 'utf8'));
}

function branchOf(channel) {
  if (!channel) {
    return null;
  }
  const mapping = JSON.parse(channel.branchMapping);
  const ids = mapping.data.map((entry) => entry.branchId);
  return channel.updateBranches.filter((branch) => ids.includes(branch.id)).map((branch) => branch.name);
}

function easState(runtimeVersion, fingerprint) {
  const out = [];
  const preview = easOptional(['channel:view', 'preview'])?.currentPage ?? null;
  const production = easOptional(['channel:view', 'production'])?.currentPage ?? null;
  const previewBranches = branchOf(preview);
  out.push({
    level: previewBranches && previewBranches.length === 1 && previewBranches[0] === 'preview' ? 'pass' : 'fail',
    id: 'channel-preview',
    message: `channel preview → ${previewBranches ? previewBranches.join(', ') : 'missing'}`,
  });
  const productionBranches = branchOf(production);
  out.push({
    level: productionBranches === null || (productionBranches.length === 1 && productionBranches[0] === 'production') ? 'pass' : 'fail',
    id: 'channel-production',
    message: `channel production → ${productionBranches ? productionBranches.join(', ') : 'not created (no production build yet)'}`,
  });
  const productionUpdates = easOptional(['update:list', '--branch', 'production', '--limit', '5']);
  const productionGroups = productionUpdates?.currentPage?.length ?? 0;
  out.push({
    level: 'info',
    id: 'production-updates',
    message: productionGroups === 0 ? 'production branch has no updates' : `production branch has ${productionGroups} update group(s); review them`,
  });
  const builds = eas(['build:list', '--platform', 'ios', '--runtime-version', runtimeVersion, '--status', 'finished', '--limit', '50']);
  const releaseBuilds = builds.filter((build) => build.buildProfile === 'preview' || build.buildProfile === 'preview-simulator' || build.buildProfile === 'production');
  for (const build of releaseBuilds) {
    const hash = build.fingerprint?.hash ?? null;
    out.push({
      level: hash === fingerprint ? 'pass' : 'fail',
      id: `build-${build.id.slice(0, 8)}`,
      message: `${build.buildProfile} build ${build.id} (${build.appVersion} (${build.appBuildVersion}), ${build.gitCommitHash?.slice(0, 7) ?? 'no commit'}) fingerprint ${hash?.slice(0, 12) ?? 'missing'}${hash === fingerprint ? ' = local' : ' ≠ local: not a target for this JavaScript'}`,
    });
  }
  const previewUpdates = easOptional(['update:list', '--branch', 'preview', '--limit', '10'])?.currentPage ?? [];
  return {
    findings: out,
    channels: { preview: previewBranches, production: productionBranches },
    builds: releaseBuilds.map((build) => ({
      id: build.id,
      profile: build.buildProfile,
      channel: build.channel ?? null,
      appVersion: build.appVersion,
      buildNumber: build.appBuildVersion,
      gitCommit: build.gitCommitHash ?? null,
      fingerprint: build.fingerprint?.hash ?? null,
      simulator: Boolean(build.isForIosSimulator),
    })),
    previewUpdates: previewUpdates.map((group) => ({
      group: group.group,
      runtimeVersion: group.runtimeVersion,
      message: group.message,
      gitCommit: group.gitCommitHash ?? null,
      createdAt: group.createdAt,
    })),
  };
}

function main() {
  const options = args();
  const config = run('npx', ['expo', 'config', '--json', '--type', 'public'], { json: true });
  const easJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'eas.json'), 'utf8'));
  const easScript = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts?.eas;
  const fingerprint = run('npx', ['expo-updates', 'fingerprint:generate', '--platform', 'ios'], { json: true }).hash;
  const files = trackedFiles();
  const runtimeVersion = config.version; // appVersion policy: the runtime is the app version
  const current = {
    runtimeVersion,
    appVersion: config.version,
    fingerprint,
    schemaVersion: latestSchemaVersion(files),
    persisted: persistedContract(files),
  };
  const head = run('git', ['rev-parse', 'HEAD']);
  // Untracked files under docs/ (evidence screenshots) never enter a build or update (.easignore).
  const dirty = run('git', ['status', '--porcelain'])
    .split('\n')
    .filter(Boolean)
    .some((line) => !(line.startsWith('?? ') && line.slice(3).startsWith('docs/')));
  const contracts = readContracts();
  const recorded = contracts.runtimes[runtimeVersion];

  const findings = [...checkDeliveryConfig(config, easJson, easScript), ...checkRuntimeContract(recorded, current)];
  if (options.publish) {
    findings.push({ level: dirty ? 'fail' : 'pass', id: 'clean-tree', message: dirty ? 'uncommitted changes: commit first so the update names an exact source revision' : `clean tree at ${head.slice(0, 7)}` });
  }
  const remote = options.eas || options.record ? easState(runtimeVersion, fingerprint) : null;
  if (remote) {
    findings.push(...remote.findings);
  }

  if (options.record) {
    if (!options.reason) {
      fail('--record needs --reason "<why this build shares the runtime>"');
    }
    const build = eas(['build:view', options.record]);
    if (build.fingerprint?.hash !== fingerprint) {
      fail(`EAS fingerprint of ${options.record} (${build.fingerprint?.hash ?? 'missing'}) differs from the local ${fingerprint}; record from the commit the build used`);
    }
    if (build.appVersion !== runtimeVersion) {
      fail(`build ${options.record} is app version ${build.appVersion}, not ${runtimeVersion}`);
    }
    const previous = recorded ?? null;
    contracts.runtimes[runtimeVersion] = {
      runtimeVersion,
      appVersion: current.appVersion,
      platform: 'ios',
      fingerprint,
      schemaVersion: current.schemaVersion,
      persisted: current.persisted,
      sourceRevision: head,
      firstSharedBuild: previous?.firstSharedBuild ?? options.record,
      builds: [...new Set([...(previous?.builds ?? []), options.record])],
      history: [...(previous?.history ?? []), { at: new Date().toISOString(), build: options.record, revision: head, reason: options.reason }],
    };
    fs.mkdirSync(path.dirname(CONTRACTS), { recursive: true });
    fs.writeFileSync(CONTRACTS, `${JSON.stringify(contracts, null, 2)}\n`);
    console.log(`Recorded runtime ${runtimeVersion} contract from build ${options.record} in ${path.relative(ROOT, CONTRACTS)}.`);
  }

  const record = {
    checkedAt: new Date().toISOString(),
    sourceRevision: head,
    dirtyTree: dirty,
    project: config.extra?.eas?.projectId,
    bundleIdentifier: config.ios?.bundleIdentifier,
    platform: 'ios',
    appVersion: current.appVersion,
    runtimeVersion,
    fingerprint,
    schemaVersion: current.schemaVersion,
    persistedContract: current.persisted.sha256,
    runtimeShared: Boolean(recorded),
    eas: remote ? { channels: remote.channels, builds: remote.builds, previewUpdates: remote.previewUpdates } : null,
    findings,
  };
  if (options.out) {
    fs.writeFileSync(path.resolve(options.out), `${JSON.stringify(record, null, 2)}\n`);
  }

  const mark = { pass: 'PASS', fail: 'FAIL', info: 'INFO' };
  for (const item of findings) {
    console.log(`${mark[item.level]}  ${item.id}: ${item.message}`);
  }
  const failed = findings.filter((item) => item.level === 'fail');
  console.log(
    `\nruntime ${runtimeVersion} · fingerprint ${fingerprint.slice(0, 12)} · schema ${current.schemaVersion} · stored-data contract ${current.persisted.sha256.slice(0, 12)} · ${head.slice(0, 7)}${dirty ? ' (uncommitted changes)' : ''}`,
  );
  console.log(failed.length === 0 ? 'release:check PASS' : `release:check FAIL (${failed.length})`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main();
