#!/usr/bin/env node
// npm run test:db — runs the Phase 05 database scenarios on an iOS simulator through the real
// expo-sqlite adapter of the installed development build (docs/TEST_PLAN.md, docs/evidence/PHASE_05.md).
//
// What it does, truthfully:
//   1. picks a booted simulator that has com.bosko123.savingworlds installed (or --device);
//   2. requires Metro (npx expo start --dev-client) on port 8081: the scenarios are JavaScript served
//      by Metro into the dev client, but every SQL statement runs in the device's native SQLite;
//   3. launches the app, opens savingworlds://dev-db?run=<id>, waits for the report the app writes to
//      Documents/SQLite/dbtest-report.db in its simulator container, and reads it (read-only);
//   4. terminates the app, relaunches it as a new process and runs the restart-verify suite on the
//      database the first run left behind;
//   5. prints a summary and exits 0 only if every scenario passed. Any missing prerequisite is a
//      clear error with exit code 2, never a silent pass.
// Options: --device <udid|name>, --record <file.json>, --timeout <seconds>, --fresh-install (reinstall
// the app bundle first, so the app database is created from nothing; simulator only, synthetic data).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BUNDLE_ID = 'com.bosko123.savingworlds';
const SCHEME = 'savingworlds';
const METRO = 'http://127.0.0.1:8081';

function fail(message, code = 2) {
  console.error(`test:db: ${message}`);
  process.exit(code);
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function sh(command, args, { allowFailure = false } = {}) {
  try {
    return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    if (allowFailure) {
      return null;
    }
    throw error;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function pickDevice(requested) {
  let booted;
  try {
    booted = Object.values(JSON.parse(sh('xcrun', ['simctl', 'list', 'devices', 'booted', '-j'])).devices).flat();
  } catch {
    fail('xcrun simctl is unavailable. Install Xcode and its command line tools.');
  }
  const candidates = booted.filter((device) => !requested || device.udid === requested || device.name === requested);
  const withApp = candidates.filter((device) => sh('xcrun', ['simctl', 'get_app_container', device.udid, BUNDLE_ID], { allowFailure: true }));
  if (withApp.length === 0) {
    fail(
      requested
        ? `Simulator "${requested}" is not booted or does not have ${BUNDLE_ID} installed.`
        : `No booted simulator has ${BUNDLE_ID} installed. Boot one and install the development build (docs/EAS_AND_OTA.md).`,
    );
  }
  return withApp[0];
}

async function requireMetro() {
  try {
    const response = await fetch(`${METRO}/status`);
    if ((await response.text()).includes('packager-status:running')) {
      return;
    }
  } catch {
    // fall through to the error below
  }
  fail(`Metro is not running at ${METRO}. Start it with: npx expo start --dev-client`);
}

function launch(udid) {
  sh('xcrun', ['simctl', 'terminate', udid, BUNDLE_ID], { allowFailure: true });
  const devClientUrl = `${SCHEME}://expo-development-client/?url=${encodeURIComponent(METRO)}`;
  sh('xcrun', ['simctl', 'openurl', udid, devClientUrl]);
}

function readReport(udid, runId) {
  const container = sh('xcrun', ['simctl', 'get_app_container', udid, BUNDLE_ID, 'data']);
  const file = path.join(container, 'Documents', 'SQLite', 'dbtest-report.db');
  if (!fs.existsSync(file)) {
    return null;
  }
  // runId is generated below from [a-z0-9] only, so it is safe inside this literal.
  const json = sh('sqlite3', ['-readonly', file, `SELECT report_json FROM reports WHERE run_id = '${runId}'`], { allowFailure: true });
  return json ? JSON.parse(json) : null;
}

async function runSuite(udid, runId, query, timeoutMs) {
  const url = `${SCHEME}://dev-db?run=${runId}${query}`;
  const deadline = Date.now() + timeoutMs;
  let lastOpen = 0;
  while (Date.now() < deadline) {
    const report = readReport(udid, runId);
    if (report) {
      return report;
    }
    // Re-sending is safe: the runner starts each run ID once. It covers a link that arrived while
    // the dev client was still loading the bundle.
    if (Date.now() - lastOpen > 15_000) {
      sh('xcrun', ['simctl', 'openurl', udid, url], { allowFailure: true });
      lastOpen = Date.now();
    }
    await sleep(2_000);
  }
  fail(`No report for run ${runId} within ${timeoutMs / 1000}s. Check the simulator screen and Metro logs.`, 1);
}

function freshInstall(udid) {
  const appPath = sh('xcrun', ['simctl', 'get_app_container', udid, BUNDLE_ID, 'app']);
  const copy = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-test-db-')), path.basename(appPath));
  fs.cpSync(appPath, copy, { recursive: true });
  sh('xcrun', ['simctl', 'uninstall', udid, BUNDLE_ID]);
  sh('xcrun', ['simctl', 'install', udid, copy]);
  return copy;
}

function printReport(label, report) {
  console.log(`\n${label}: run ${report.runId} on ${report.platform.os} ${report.platform.version} (${report.driver}, Hermes ${report.hermes})`);
  console.log(`  app database at this launch: ${JSON.stringify(report.appDatabase.migrationAtThisLaunch)}`);
  for (const result of report.results) {
    console.log(`  ${result.status === 'pass' ? 'PASS' : 'FAIL'} ${result.id} ${result.title} (${result.durationMs} ms)`);
    if (result.error) {
      console.log(`       ${result.error}`);
    }
  }
  console.log(`  ${report.summary.passed}/${report.summary.total} passed`);
}

async function main() {
  const timeoutMs = Number(option('--timeout') ?? 240) * 1000;
  const device = pickDevice(option('--device') ?? process.env.SW_SIM_DEVICE);
  await requireMetro();
  let reinstalledFrom = null;
  if (process.argv.includes('--fresh-install')) {
    reinstalledFrom = freshInstall(device.udid);
  }
  const runtime = device.runtime ?? '';
  console.log(`test:db on ${device.name} (${device.udid})`);

  const base = Date.now().toString(36);
  const firstId = `r${base}a`;
  launch(device.udid);
  const first = await runSuite(device.udid, firstId, '&suite=all', timeoutMs);
  printReport('Launch 1 (scenarios + restart seed)', first);

  const secondId = `r${base}b`;
  launch(device.udid);
  const second = await runSuite(device.udid, secondId, `&suite=restart-verify&seed=${firstId}`, timeoutMs);
  printReport('Launch 2 (new process: restart verify)', second);

  const passed = first.summary.failed === 0 && second.summary.failed === 0 && second.summary.total > 0;
  const record = option('--record');
  if (record) {
    const output = {
      tool: 'npm run test:db',
      device: { name: device.name, udid: device.udid, runtime, state: device.state },
      freshInstall: Boolean(reinstalledFrom),
      launches: [first, second],
      passed,
    };
    fs.mkdirSync(path.dirname(record), { recursive: true });
    fs.writeFileSync(record, `${JSON.stringify(output, null, 2)}\n`);
    console.log(`\nRecorded ${record}`);
  }
  console.log(passed ? '\ntest:db PASS' : '\ntest:db FAIL');
  process.exit(passed ? 0 : 1);
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error), 1));
