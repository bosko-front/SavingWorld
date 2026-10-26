#!/usr/bin/env node
// npm run test:storekit — the Phase 15 Xcode StoreKit tests (docs/evidence/PHASE_15.md).
//
// What it does, truthfully:
//   1. picks a booted iOS simulator (or --device <udid|name>);
//   2. runs `xcodebuild test` for native-tests/storekit/StoreKitHost.xcodeproj: a minimal host app
//      with hosted XCTests that drive OpenIAP Apple 4.0.5 (the native layer of expo-iap 6.3.0) under
//      Apple's StoreKitTest SKTestSession, loaded from storekit/SavingWorlds.storekit;
//   3. prints one line per test and exits 0 only if every test passed. A missing simulator or Xcode is
//      a clear error with exit code 2, never a silent pass.
// It proves StoreKit's behavior through the same native library the app links, in the Xcode test
// environment. It is not sandbox/TestFlight evidence and does not run the app's JavaScript.
import { execFileSync, spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = path.join(ROOT, 'native-tests/storekit/StoreKitHost.xcodeproj');
const CONFIG = path.join(ROOT, 'storekit/SavingWorlds.storekit');
const DERIVED = path.join(os.tmpdir(), 'saving-worlds-storekit-tests');

function fail(message, code = 2) {
  console.error(`test:storekit: ${message}`);
  process.exit(code);
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

let devices;
try {
  devices = JSON.parse(execFileSync('xcrun', ['simctl', 'list', 'devices', 'booted', '-j'], { encoding: 'utf8' })).devices;
} catch {
  fail('xcrun simctl is not available (Xcode command line tools needed).');
}
const booted = Object.values(devices).flat();
const wanted = option('--device');
const device = wanted ? booted.find((d) => d.udid === wanted || d.name === wanted) : booted[0];
if (!device) {
  fail(wanted ? `no booted simulator matches ${wanted}.` : 'boot an iOS simulator first (xcrun simctl boot <udid>).');
}
console.log(`test:storekit: ${device.name} (${device.udid})`);

const run = spawnSync(
  'xcodebuild',
  ['test', '-project', PROJECT, '-scheme', 'ProStoreKitTests', '-destination', `platform=iOS Simulator,id=${device.udid}`, '-derivedDataPath', DERIVED],
  { encoding: 'utf8', env: { ...process.env, TEST_RUNNER_STOREKIT_CONFIG: CONFIG }, maxBuffer: 256 * 1024 * 1024 },
);
const output = `${run.stdout ?? ''}\n${run.stderr ?? ''}`;
// Only test results and failures: StoreKit's own console lines include signed test receipts.
const lines = output.split('\n').filter((line) => /Test Case .*(passed|failed)|: error: |Executed \d+ tests|\*\* TEST/.test(line));
for (const line of lines) {
  console.log(line.trim());
}
if (run.status !== 0) {
  fail(`xcodebuild test failed (exit ${run.status}).`, 1);
}
console.log('test:storekit: PASS');
