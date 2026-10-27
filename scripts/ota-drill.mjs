#!/usr/bin/env node
// node scripts/ota-drill.mjs <command> — simulator tooling for the Phase 20 release-mode OTA drill
// (docs/EAS_AND_OTA.md "Preview verification and promotion", docs/evidence/PHASE_20.md).
// Simulator and synthetic data only; it never talks to EAS and never touches a physical device.
//
//   snapshot --device <udid> [--label <text>] [--log <file.jsonl>]
//       Copies the app database (Documents/SQLite/saving-worlds.db + WAL) out of the simulator
//       container and prints the redacted persisted-state digest (scripts/release/persisted-digest.js).
//   updates --device <udid>
//       Reads a copy of expo-updates' own database (Library/Application Support/.expo-internal) and
//       lists the stored updates (status, runtime, launch counts) and whether every asset file exists.
//   seed --device <udid> --db <fixture.db> [--replace-test-data]
//       Puts a synthetic fixture database in place of the app database (app terminated first).
//       Refuses when an app database exists unless --replace-test-data says it is test data.
//   point --device <udid> (--proxy <port> | --origin)
//       Edits the INSTALLED test copy's Expo.plist so expo-updates talks to the local fault proxy
//       (scope key kept as https://u.expo.dev) or back to EAS. A test harness change of a simulator
//       install, never of the built artifact: do it on a fresh install before its first launch.
//   proxy [--port 8787] [--mode pass] [--log <file.jsonl>]
//       Local update proxy in front of u.expo.dev with switchable faults:
//         pass           forward everything unchanged (asset URLs rewritten through the proxy)
//         offline        drop every connection (no network for updates)
//         interrupt      forward the manifest, cut every asset download after 64 KiB
//         throttle       forward the manifest, send assets at 16 KiB/s (to kill the app mid-download)
//         corrupt        forward the manifest, flip bytes in every asset (hash check must refuse it)
//         wrong-runtime  ask EAS for runtime <value of --wrong-runtime> instead of the app's runtime
//       Switch with: curl http://127.0.0.1:<port>/__drill/mode/<mode>
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const require = createRequire(import.meta.url);
const { describeDigest, persistedDigest } = require('./release/persisted-digest.js');

const BUNDLE_ID = 'com.bosko123.savingworlds';
const PROJECT_ID = '25d3089f-a32e-461f-baf2-7c95a396984e';
const ORIGIN = 'https://u.expo.dev';
const DATABASE = 'saving-worlds.db';
const MODES = ['pass', 'offline', 'interrupt', 'throttle', 'corrupt', 'wrong-runtime'];

function fail(message) {
  console.error(`ota-drill: ${message}`);
  process.exit(2);
}

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function simctl(...args) {
  return execFileSync('xcrun', ['simctl', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function container(device, kind) {
  try {
    return simctl('get_app_container', device, BUNDLE_ID, kind);
  } catch {
    fail(`${BUNDLE_ID} is not installed on simulator ${device}`);
  }
}

function requireDevice() {
  const device = option('--device');
  if (!device) {
    fail('--device <udid> is required (xcrun simctl list devices booted)');
  }
  return device;
}

// Copies a SQLite database and its WAL/SHM side files into a fresh temporary directory, so reading
// never touches the app's own files.
function copyDatabase(file) {
  if (!fs.existsSync(file)) {
    return null;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ota-drill-'));
  for (const suffix of ['', '-wal', '-shm']) {
    if (fs.existsSync(file + suffix)) {
      fs.copyFileSync(file + suffix, path.join(dir, path.basename(file) + suffix));
    }
  }
  return path.join(dir, path.basename(file));
}

function snapshot() {
  const device = requireDevice();
  const data = container(device, 'data');
  const copy = copyDatabase(path.join(data, 'Documents', 'SQLite', DATABASE));
  if (!copy) {
    console.log('no app database yet (first launch has not created one)');
    return;
  }
  const db = new DatabaseSync(copy);
  const digest = persistedDigest(db);
  db.close();
  console.log(describeDigest(digest));
  const log = option('--log');
  if (log) {
    fs.appendFileSync(log, `${JSON.stringify({ at: new Date().toISOString(), device, label: option('--label', ''), ...digest })}\n`);
  }
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(digest.summary, null, 2));
  }
}

function uuidFromBlob(blob) {
  const hex = Buffer.from(blob).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const STATUS = { 1: 'ready', 3: 'pending', 5: 'embedded', 6: 'development' };

function updates() {
  const device = requireDevice();
  const data = container(device, 'data');
  const internal = path.join(data, 'Library', 'Application Support', '.expo-internal');
  const file = fs.existsSync(internal) ? fs.readdirSync(internal).find((name) => /^expo-v\d+\.db$/.test(name)) : null;
  if (!file) {
    console.log('no expo-updates database yet');
    return;
  }
  const copy = copyDatabase(path.join(internal, file));
  const db = new DatabaseSync(copy);
  const rows = db
    .prepare(
      `SELECT u.id, u.scope_key, u.commit_time, u.runtime_version, u.status, u.keep, u.last_accessed,
              u.successful_launch_count, u.failed_launch_count, u.url, a.relative_path AS launch_path
         FROM updates u LEFT JOIN assets a ON a.id = u.launch_asset_id ORDER BY u.commit_time`,
    )
    .all();
  for (const row of rows) {
    const assets = db
      .prepare('SELECT a.relative_path FROM updates_assets ua JOIN assets a ON a.id = ua.asset_id WHERE ua.update_id = ?')
      .all(row.id)
      .map((asset) => asset.relative_path);
    const missing = assets.filter((relative) => !fs.existsSync(path.join(internal, relative)));
    console.log(
      [
        uuidFromBlob(row.id),
        `status ${STATUS[row.status] ?? row.status}`,
        `runtime ${row.runtime_version}`,
        `committed ${new Date(Number(row.commit_time)).toISOString()}`,
        `launches ${row.successful_launch_count} ok / ${row.failed_launch_count} failed`,
        `last used ${new Date(Number(row.last_accessed)).toISOString()}`,
        `assets ${assets.length - missing.length}/${assets.length} on disk`,
        `url ${row.url ?? 'none'}`,
      ].join(' · '),
    );
  }
  db.close();
}

function seed() {
  const device = requireDevice();
  const source = option('--db');
  if (!source || !fs.existsSync(source)) {
    fail('--db <fixture.db> must name an existing synthetic fixture database');
  }
  const data = container(device, 'data');
  const target = path.join(data, 'Documents', 'SQLite', DATABASE);
  if (fs.existsSync(target) && !process.argv.includes('--replace-test-data')) {
    fail(`${target} exists; pass --replace-test-data only when it holds test data`);
  }
  try {
    simctl('terminate', device, BUNDLE_ID);
  } catch {
    // not running
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  for (const suffix of ['-wal', '-shm']) {
    fs.rmSync(target + suffix, { force: true });
  }
  fs.copyFileSync(source, target);
  console.log(`seeded ${target}`);
}

function point() {
  const device = requireDevice();
  const app = container(device, 'app');
  const plist = path.join(app, 'Expo.plist');
  if (!fs.existsSync(plist)) {
    fail(`no Expo.plist in ${app}`);
  }
  const port = option('--proxy');
  const url = port ? `http://127.0.0.1:${port}/${PROJECT_ID}` : `${ORIGIN}/${PROJECT_ID}`;
  execFileSync('plutil', ['-replace', 'EXUpdatesURL', '-string', url, plist]);
  // Keep the scope of the real update URL so the stored updates stay in one scope.
  execFileSync('plutil', ['-replace', 'EXUpdatesScopeKey', '-string', ORIGIN, plist]);
  console.log(`EXUpdatesURL = ${url} (scope ${ORIGIN}) in the installed test copy ${app}`);
}

function proxy() {
  const port = Number(option('--port', '8787'));
  const wrongRuntime = option('--wrong-runtime', 'phase20-incompatible');
  const logFile = option('--log');
  let mode = option('--mode', 'pass');
  const log = (entry) => {
    const line = JSON.stringify({ at: new Date().toISOString(), mode, ...entry });
    console.log(line);
    if (logFile) {
      fs.appendFileSync(logFile, `${line}\n`);
    }
  };
  const self = `http://127.0.0.1:${port}`;

  const rewriteManifest = (body, contentType) => {
    const rewrite = (json) => {
      const manifest = JSON.parse(json);
      const through = (asset) => (asset && asset.url ? { ...asset, url: `${self}/__asset?u=${encodeURIComponent(asset.url)}` } : asset);
      if (manifest.launchAsset) {
        manifest.launchAsset = through(manifest.launchAsset);
      }
      if (Array.isArray(manifest.assets)) {
        manifest.assets = manifest.assets.map(through);
      }
      return { text: JSON.stringify(manifest), manifest };
    };
    const boundary = /boundary=("?)([^";]+)\1/.exec(contentType ?? '')?.[2];
    if (!boundary) {
      const { text, manifest } = rewrite(body);
      return { body: text, manifest };
    }
    let manifest = null;
    const parts = body.split(`--${boundary}`).map((part) => {
      if (!/name="manifest"/i.test(part)) {
        return part;
      }
      const split = part.indexOf('\r\n\r\n');
      const head = part.slice(0, split + 4);
      const json = part.slice(split + 4).replace(/\r\n$/, '');
      const rewritten = rewrite(json);
      manifest = rewritten.manifest;
      return `${head}${rewritten.text}\r\n`;
    });
    return { body: parts.join(`--${boundary}`), manifest };
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, self);
    if (url.pathname.startsWith('/__drill/mode/')) {
      const next = url.pathname.slice('/__drill/mode/'.length);
      if (!MODES.includes(next)) {
        res.writeHead(400).end(`unknown mode ${next}\n`);
        return;
      }
      mode = next;
      log({ event: 'mode' });
      res.writeHead(200).end(`${mode}\n`);
      return;
    }
    if (mode === 'offline') {
      log({ event: 'dropped', path: url.pathname });
      req.socket.destroy();
      return;
    }
    try {
      if (url.pathname === '/__asset') {
        const original = url.searchParams.get('u');
        const upstream = await fetch(original);
        const bytes = Buffer.from(await upstream.arrayBuffer());
        const headers = { 'content-type': upstream.headers.get('content-type') ?? 'application/octet-stream', 'content-length': String(bytes.length) };
        if (mode === 'interrupt') {
          res.writeHead(upstream.status, headers);
          res.write(bytes.subarray(0, Math.min(65536, Math.floor(bytes.length / 2))));
          log({ event: 'asset-cut', bytes: bytes.length, asset: original.slice(-24) });
          setTimeout(() => res.socket?.destroy(), 50);
          return;
        }
        if (mode === 'corrupt') {
          const bad = Buffer.from(bytes);
          for (let i = 0; i < bad.length; i += 97) {
            bad[i] ^= 0xff;
          }
          res.writeHead(upstream.status, headers).end(bad);
          log({ event: 'asset-corrupted', bytes: bytes.length, asset: original.slice(-24) });
          return;
        }
        if (mode === 'throttle') {
          res.writeHead(upstream.status, headers);
          log({ event: 'asset-throttled', bytes: bytes.length, asset: original.slice(-24) });
          let offset = 0;
          const timer = setInterval(() => {
            if (res.destroyed) {
              clearInterval(timer);
              log({ event: 'asset-aborted-by-client', sent: offset, bytes: bytes.length });
              return;
            }
            const chunk = bytes.subarray(offset, offset + 4096);
            offset += chunk.length;
            if (offset >= bytes.length) {
              clearInterval(timer);
              res.end(chunk);
              log({ event: 'asset-throttled-done', bytes: bytes.length });
            } else {
              res.write(chunk);
            }
          }, 250);
          return;
        }
        res.writeHead(upstream.status, headers).end(bytes);
        log({ event: 'asset', status: upstream.status, bytes: bytes.length, asset: original.slice(-24) });
        return;
      }
      // Manifest request: forward with the app's own headers (channel, runtime, platform, current and
      // embedded update IDs). Ask for an uncompressed body so the manifest part can be rewritten.
      const headers = {};
      for (const [name, value] of Object.entries(req.headers)) {
        if (!['host', 'connection', 'accept-encoding', 'content-length'].includes(name)) {
          headers[name] = value;
        }
      }
      const askedRuntime = headers['expo-runtime-version'];
      if (mode === 'wrong-runtime') {
        headers['expo-runtime-version'] = wrongRuntime;
      }
      const upstream = await fetch(`${ORIGIN}${url.pathname}${url.search}`, { headers });
      const text = await upstream.text();
      const outHeaders = {};
      upstream.headers.forEach((value, name) => {
        if (!['content-length', 'content-encoding', 'transfer-encoding', 'connection'].includes(name)) {
          outHeaders[name] = value;
        }
      });
      let body = text;
      let manifest = null;
      if (upstream.status === 200 && text.length > 0) {
        ({ body, manifest } = rewriteManifest(text, upstream.headers.get('content-type')));
      }
      outHeaders['content-length'] = String(Buffer.byteLength(body));
      res.writeHead(upstream.status, outHeaders).end(body);
      log({
        event: 'manifest',
        status: upstream.status,
        channel: headers['expo-channel-name'],
        askedRuntime,
        sentRuntime: headers['expo-runtime-version'],
        currentUpdate: headers['expo-current-update-id'],
        embeddedUpdate: headers['expo-embedded-update-id'],
        served: manifest ? { id: manifest.id, runtimeVersion: manifest.runtimeVersion, assets: (manifest.assets?.length ?? 0) + 1 } : null,
        // Everything the app sent to the update service (privacy audit): header names and values.
        requestHeaders: req.headers,
        directive: /name="directive"/.test(text) ? (/"type"\s*:\s*"([^"]+)"/.exec(text.split('name="directive"')[1] ?? '')?.[1] ?? 'yes') : null,
      });
    } catch (error) {
      log({ event: 'error', message: String(error) });
      if (!res.headersSent) {
        res.writeHead(502).end();
      }
    }
  });
  server.listen(port, '127.0.0.1', () => log({ event: 'listening', port }));
}

const commands = { snapshot, updates, seed, point, proxy };
const command = commands[process.argv[2]];
if (!command) {
  fail(`usage: node scripts/ota-drill.mjs <${Object.keys(commands).join('|')}> [options]`);
}
command();
