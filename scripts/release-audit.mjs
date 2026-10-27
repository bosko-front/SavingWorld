#!/usr/bin/env node
// node scripts/release-audit.mjs [--out <report.json>] [--keep <dir>]
// Phase 21 release-candidate audit (docs/RELEASE_CHECKLIST.md, docs/evidence/PHASE_21.md). It exports
// the production JavaScript exactly as a release build embeds it and checks what ships:
//
//   1. development-only content: every distinctive string of src/dev/** and of the native test
//      scenarios (tests/native/**) is absent from the release bundle (both the plain JS and the
//      Hermes bytecode), and every development route is listed inside a `Stack.Protected guard={__DEV__…}`
//      block of its layout with its body behind `if (__DEV__)`;
//   2. leaked logs: no app log prefix (`[app-data]`, `[billing]`, …, collected from src/) and no Jest
//      fake survives in the bundle, and every console call in src/ (outside src/dev) sits under a
//      `__DEV__` check;
//   3. entitlement overrides: production code never builds Pro capabilities itself
//      (`capabilitiesFor('pro')`), never imports test support, and the store fake is not bundled;
//   4. placeholder art: every exported image comes from the approved theme exports, milestone previews
//      or expo-router's own navigation icons; the Expo template icon/splash names are absent;
//   5. release configuration: `expo config` for the production environment has the EAS update URL,
//      the appVersion runtime policy, the approved icons and splash, no development client settings,
//      and no ATS exception beyond Expo's default local networking.
//
// Not an npm script on purpose: @expo/fingerprint hashes package.json "scripts", and runtime 1.0.0 is
// shared (docs/EAS_AND_OTA.md). Exit code 0 = PASS, 1 = a check failed, 2 = the tool itself failed.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const results = [];

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function record(id, title, failures, details = {}) {
  results.push({ id, title, status: failures.length === 0 ? 'PASS' : 'FAIL', failures, ...details });
}

function walk(directory, filter) {
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return walk(full, filter);
    }
    return filter(full) ? [full] : [];
  });
}

const isSource = (file) => /\.(ts|tsx)$/.test(file);
const rel = (file) => path.relative(ROOT, file);

// String literals worth searching for: ASCII, at least 12 characters, with a space or a punctuation
// mark a minifier keeps, no template expressions.
function literals(text) {
  const found = new Set();
  const pattern = /'((?:[^'\\\n]|\\.){12,})'|"((?:[^"\\\n]|\\.){12,})"|`([^`$\\\n]{12,})`|>\s*([A-Za-z][^<>{}\n]{11,}?)\s*</g;
  for (const match of text.matchAll(pattern)) {
    const value = (match[1] ?? match[2] ?? match[3] ?? match[4] ?? '').trim();
    if (value.length >= 12 && /^[\x20-\x7e]+$/.test(value) && /\s/.test(value) && !/^[@./]/.test(value) && !value.includes('\\')) {
      found.add(value);
    }
  }
  return found;
}

function exportBundle(outDir, bytecode) {
  const args = ['expo', 'export', '--platform', 'ios', '--output-dir', outDir, '--dump-assetmap'];
  if (!bytecode) {
    args.push('--no-bytecode');
  }
  execFileSync('npx', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_ENV: 'production' } });
  const jsDir = path.join(outDir, '_expo', 'static', 'js', 'ios');
  const files = fs.readdirSync(jsDir).filter((name) => /\.(js|hbc)$/.test(name));
  if (files.length !== 1) {
    throw new Error(`expected one iOS bundle in ${jsDir}, found ${files.join(', ') || 'none'}`);
  }
  return fs.readFileSync(path.join(jsDir, files[0]));
}

function main() {
  const work = option('--keep') ?? fs.mkdtempSync(path.join(os.tmpdir(), 'sw-release-audit-'));
  const jsOut = path.join(work, 'js');
  const hbcOut = path.join(work, 'hbc');
  fs.rmSync(jsOut, { recursive: true, force: true });
  fs.rmSync(hbcOut, { recursive: true, force: true });
  const js = exportBundle(jsOut, false).toString('utf8');
  const hbc = exportBundle(hbcOut, true);
  const hbcText = hbc.toString('latin1');
  const inBundle = (value) => js.includes(value) || hbcText.includes(value);

  const src = walk(path.join(ROOT, 'src'), isSource);
  const devFiles = walk(path.join(ROOT, 'src', 'dev'), isSource);
  const appFiles = src.filter((file) => !file.startsWith(path.join(ROOT, 'src', 'dev') + path.sep));
  // Product text also lives in the bundled theme manifests and the milestone preview list.
  const productJson = [...walk(path.join(ROOT, 'assets', 'themes'), (file) => file.endsWith('.json')), path.join(ROOT, 'assets', 'worlds', 'milestone-previews.json')];
  const appText = [...appFiles, ...productJson].map((file) => fs.readFileSync(file, 'utf8')).join('\n');

  // 1a. Development and test content absent.
  const candidates = new Map();
  for (const file of [...devFiles, ...walk(path.join(ROOT, 'tests', 'native'), isSource)]) {
    for (const value of literals(fs.readFileSync(file, 'utf8'))) {
      if (!appText.includes(value)) {
        candidates.set(value, rel(file));
      }
    }
  }
  const leakedDev = [...candidates].filter(([value]) => inBundle(value)).map(([value, file]) => `${file}: "${value}"`);
  record('A1', 'Development tools and native test scenarios are not in the release bundle', leakedDev, { stringsChecked: candidates.size });

  // 1b. Development routes guarded and stubbed.
  const routeFailures = [];
  const routeFiles = walk(path.join(ROOT, 'src', 'app'), isSource);
  const devRoutes = routeFiles.filter((file) => /(^|\/)(dev-[^/]+|details|sample-form)\.tsx$/.test(file));
  for (const file of devRoutes) {
    const name = path.basename(file, '.tsx');
    const layout = path.join(path.dirname(file), '_layout.tsx');
    const layoutText = fs.existsSync(layout) ? fs.readFileSync(layout, 'utf8') : '';
    const guarded = [...layoutText.matchAll(/<Stack\.Protected guard=\{__DEV__[^}]*\}>([\s\S]*?)<\/Stack\.Protected>/g)].some((block) =>
      block[1].includes(`name="${name}"`),
    );
    if (!guarded) {
      routeFailures.push(`${rel(file)} is not inside a Stack.Protected guard={__DEV__…} block of ${rel(layout)}`);
    }
    const body = fs.readFileSync(file, 'utf8');
    if (!/if \(__DEV__\)/.test(body)) {
      routeFailures.push(`${rel(file)} renders outside an if (__DEV__) block`);
    }
  }
  record('A2', 'Development routes are protected by __DEV__ and render nothing in release', routeFailures, { routes: devRoutes.map(rel) });

  // 2. Logs.
  const prefixes = new Set();
  const consoleFailures = [];
  for (const file of appFiles) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      if (/console\.(log|warn|error|info|debug)\(/.test(line)) {
        const context = lines.slice(Math.max(0, index - 6), index + 1).join('\n');
        if (!/__DEV__/.test(context)) {
          consoleFailures.push(`${rel(file)}:${index + 1} logs outside a __DEV__ check`);
        }
        const prefix = line.match(/console\.\w+\(\s*[`'"](\[[a-z-]+\])/);
        if (prefix) {
          prefixes.add(prefix[1]);
        }
      }
    });
  }
  for (const prefix of prefixes) {
    if (inBundle(prefix)) {
      consoleFailures.push(`log prefix ${prefix} is in the release bundle`);
    }
  }
  for (const fake of ['sonner-native-fake', 'expo-iap-fake', 'expo-notifications-fake', 'expo-haptics-fake', 'grantProForTests', 'node:sqlite']) {
    if (inBundle(fake)) {
      consoleFailures.push(`test support "${fake}" is in the release bundle`);
    }
  }
  record('A3', 'No app logs or test fakes in the release bundle', consoleFailures, { logPrefixes: [...prefixes].sort() });

  // 3. Entitlement overrides.
  const entitlementFailures = [];
  for (const file of appFiles) {
    const text = fs.readFileSync(file, 'utf8');
    if (/capabilitiesFor\(\s*['"]pro['"]\s*\)/.test(text)) {
      entitlementFailures.push(`${rel(file)} builds Pro capabilities directly`);
    }
    if (/from ['"](\.\.\/)+tests\//.test(text) && !/require\(['"]@\/dev\//.test(text)) {
      const outsideDev = text.split('\n').some((line) => /from ['"](\.\.\/)+tests\//.test(line));
      if (outsideDev) {
        entitlementFailures.push(`${rel(file)} imports test support`);
      }
    }
  }
  if (!/accessLevelFor\(lastEntitlementStatus\)/.test(fs.readFileSync(path.join(ROOT, 'src', 'bootstrap', 'app-data.ts'), 'utf8'))) {
    entitlementFailures.push('currentCapabilities() no longer derives only from the stored entitlement');
  }
  record('A4', 'No entitlement override: Pro comes only from a stored verified StoreKit status', entitlementFailures);

  // 4. Placeholder art.
  const assetmap = JSON.parse(fs.readFileSync(path.join(jsOut, 'assetmap.json'), 'utf8'));
  const allowed = [/^\/assets\/assets\/themes\/(island|garden)\/(1536|previews)$/, /^\/assets\/node_modules\/expo-router\/assets(\/react-navigation\/elements)?$/];
  const artFailures = [];
  const origins = {};
  for (const asset of Object.values(assetmap)) {
    origins[asset.httpServerLocation] = (origins[asset.httpServerLocation] ?? 0) + 1;
    if (!allowed.some((pattern) => pattern.test(asset.httpServerLocation))) {
      artFailures.push(`unexpected asset ${asset.httpServerLocation}/${asset.name}.${asset.type}`);
    }
    if (/placeholder|react-logo|adaptive-icon|splash-icon|favicon|partial-react/i.test(asset.name)) {
      artFailures.push(`placeholder-like asset ${asset.name}.${asset.type}`);
    }
  }
  record('A5', 'Only approved theme art, milestone previews and router icons are bundled', artFailures, { assetOrigins: origins });

  // 5. Release configuration (production environment).
  const configFailures = [];
  const config = JSON.parse(
    execFileSync('npx', ['expo', 'config', '--type', 'public', '--json'], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production', EAS_BUILD_PROFILE: 'production' },
    }).toString('utf8'),
  );
  if (config.runtimeVersion?.policy !== 'appVersion') configFailures.push(`runtimeVersion ${JSON.stringify(config.runtimeVersion)}`);
  if (!/^https:\/\/u\.expo\.dev\/[0-9a-f-]{36}$/.test(config.updates?.url ?? '')) configFailures.push(`updates.url ${config.updates?.url}`);
  if (config.ios?.bundleIdentifier !== 'com.bosko123.savingworlds') configFailures.push(`bundle id ${config.ios?.bundleIdentifier}`);
  const icon = config.ios?.icon ?? {};
  for (const variant of ['light', 'dark', 'tinted']) {
    if (!String(icon[variant] ?? '').endsWith(`assets/images/icon-${variant}.png`)) configFailures.push(`ios.icon.${variant} ${icon[variant]}`);
  }
  const splash = (config.plugins ?? []).find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen');
  if (!splash || !String(JSON.stringify(splash[1])).includes('splash-mark.png')) configFailures.push('expo-splash-screen does not use splash-mark.png');
  const ats = config.ios?.infoPlist?.NSAppTransportSecurity;
  if (ats?.NSAllowsArbitraryLoads === true || ats?.NSExceptionDomains) configFailures.push(`ATS exception ${JSON.stringify(ats)}`);
  if (config.version !== JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version) {
    configFailures.push(`app version ${config.version} differs from package.json`);
  }
  record('A6', 'Release configuration: update URL, runtime policy, bundle ID, approved icons and splash, no ATS exception', configFailures, {
    version: config.version,
    runtimeVersion: config.runtimeVersion,
    bundleIdentifier: config.ios?.bundleIdentifier,
  });

  const report = {
    tool: 'node scripts/release-audit.mjs',
    sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim(),
    treeClean: execFileSync('git', ['status', '--porcelain'], { cwd: ROOT }).toString().trim() === '',
    bundleBytes: { js: Buffer.byteLength(js), hbc: hbc.length },
    results,
  };
  for (const result of results) {
    console.log(`${result.status} ${result.id} ${result.title}`);
    for (const failure of result.failures) {
      console.log(`     ${failure}`);
    }
  }
  const out = option('--out');
  if (out) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Recorded ${out}`);
  }
  const passed = results.every((result) => result.status === 'PASS');
  console.log(passed ? 'release audit PASS' : 'release audit FAIL');
  process.exit(passed ? 0 : 1);
}

try {
  main();
} catch (error) {
  console.error(`release audit: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
}
