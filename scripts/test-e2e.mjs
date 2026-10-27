#!/usr/bin/env node
// node scripts/test-e2e.mjs — the Phase 21 critical iOS journeys (maestro/journeys/*.yaml) on a
// simulator, against an installed release-mode build (docs/TEST_PLAN.md "iPhone manual + Maestro",
// docs/evidence/PHASE_21.md). This is the `test:e2e` check of DEVELOPMENT_RULES, kept out of
// package.json "scripts" because @expo/fingerprint hashes them and runtime 1.0.0 is shared.
//
// What it does, truthfully:
//   1. picks a booted simulator (--device <udid|name>, or SW_SIM_DEVICE, or the only booted one);
//   2. with --app <SavingWorlds.app>, installs that build first (a release-mode EAS simulator build,
//      e.g. the preview-simulator release candidate); without it, uses what is installed;
//   3. turns Reduce Motion on (the journeys check numbers and navigation, and Maestro waits for a
//      still screen; the motion itself is a device check) unless --motion;
//   4. runs `maestro test` on every journey (or --flow <file>), each starting from a cleared app,
//      and writes a JUnit report with --report <file.xml>;
//   5. exits 0 only if every journey passed; a missing prerequisite exits 2 with a clear message.
// Synthetic data only: every journey clears the app's data on the simulator first. Never point it at
// a simulator that holds data you want to keep.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BUNDLE_ID = 'com.bosko123.savingworlds';

function fail(message, code = 2) {
  console.error(`test:e2e: ${message}`);
  process.exit(code);
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function sh(command, args) {
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function pickDevice(requested) {
  let booted;
  try {
    booted = Object.values(JSON.parse(sh('xcrun', ['simctl', 'list', 'devices', 'booted', '-j'])).devices).flat();
  } catch {
    fail('xcrun simctl is unavailable. Install Xcode and its command line tools.');
  }
  const matches = booted.filter((device) => !requested || device.udid === requested || device.name === requested);
  if (matches.length === 0) {
    fail(requested ? `Simulator "${requested}" is not booted.` : 'No simulator is booted.');
  }
  if (matches.length > 1) {
    fail(`Several simulators are booted (${matches.map((d) => d.name).join(', ')}); pass --device <udid>.`);
  }
  return matches[0];
}

function main() {
  try {
    sh('maestro', ['--version']);
  } catch {
    fail('Maestro is not installed (https://maestro.mobile.dev); it needs Java 17 or newer.');
  }
  const device = pickDevice(option('--device') ?? process.env.SW_SIM_DEVICE);
  const app = option('--app');
  if (app) {
    if (!fs.existsSync(path.join(app, 'Info.plist'))) {
      fail(`--app ${app} is not an .app bundle`);
    }
    sh('xcrun', ['simctl', 'install', device.udid, app]);
  }
  try {
    sh('xcrun', ['simctl', 'get_app_container', device.udid, BUNDLE_ID]);
  } catch {
    fail(`${BUNDLE_ID} is not installed on ${device.name}; pass --app <SavingWorlds.app>.`);
  }
  const info = sh('plutil', ['-extract', 'CFBundleShortVersionString', 'raw', path.join(sh('xcrun', ['simctl', 'get_app_container', device.udid, BUNDLE_ID, 'app']), 'Info.plist')]);
  if (!process.argv.includes('--motion')) {
    sh('xcrun', ['simctl', 'spawn', device.udid, 'defaults', 'write', 'com.apple.Accessibility', 'ReduceMotionEnabled', '-bool', 'true']);
  }
  const flow = option('--flow');
  const target = flow ? path.resolve(flow) : path.join(ROOT, 'maestro', 'journeys');
  const report = option('--report');
  const args = ['--device', device.udid, 'test', target];
  if (report) {
    fs.mkdirSync(path.dirname(path.resolve(report)), { recursive: true });
    args.push('--format', 'junit', '--output', path.resolve(report));
  }
  console.log(`test:e2e on ${device.name} (${device.udid}), app ${info}, ${flow ? path.basename(target) : 'all journeys'}`);
  // The XCTest driver's first start on a new simulator can take minutes on a busy Mac.
  const env = { ...process.env, MAESTRO_DRIVER_STARTUP_TIMEOUT: process.env.MAESTRO_DRIVER_STARTUP_TIMEOUT ?? '240000' };
  const run = spawnSync('maestro', args, { cwd: ROOT, stdio: 'inherit', env });
  const passed = run.status === 0;
  console.log(passed ? 'test:e2e PASS' : 'test:e2e FAIL');
  process.exit(passed ? 0 : 1);
}

main();
