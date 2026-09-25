const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { REQUIRED_LIVE_BINDINGS } = require('../offline/cad-auth-live-collector-binding/guardedCollector');
const { RECEIPT_FIELDS } = require('../offline/cad-auth-command-card-source/preparation');
const { checkGeneratorPacket, PACKET, SOURCES } =
  require('./cad-auth-restricted-source-set-generator-checker');
const { checkGeneratorContract } =
  require('../offline/cad-auth-restricted-source-set-generator/preparation');
const {
  EXPECTED_FILES,
  OUTPUT_ROOT,
  buildProjectionFromSourceDir,
  validateProjection,
  writeProjection,
  runCli,
} = require('./cad-auth-restricted-source-set-generator');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const packet = () => JSON.parse(read(PACKET));

function closed(result) {
  assert.equal(result.executable, false);
  assert.equal(result.executableCommandCardIssued, false);
  assert.equal(result.liveCollectionAuthorized, false);
  assert.equal(result.runtimeActivationAuthorized, false);
  assert.equal(result.bodyAdmissionAuthorized, false);
  assert.equal(result.uploadSessionIssuanceEnabled, false);
  assert.equal(result.requestBodyAdmissionRead, false);
  assert.equal(result.conversionAuthorized, false);
  assert.equal(result.sandboxDispatchAuthorized, false);
  assert.equal(result.retryOrSecondRunAuthorized, false);
  assert.equal(result.commercialReadinessClaimed, false);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|PRIVATE_HOME|ABSOLUTE_PRIVATE_SOURCE|\/Users\//);
}

function makeFixtureDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cad-auth-source-set-'));
  for (const category of REQUIRED_LIVE_BINDINGS) {
    const receipt = {
      category,
      privateMarker: `PRIVATE_SENTINEL_${category}`,
      evidence: Object.fromEntries(RECEIPT_FIELDS[category].map(field => [field, `PRIVATE_VALUE_${field}`])),
      nested: [{ note: 'not committed' }],
    };
    fs.writeFileSync(path.join(dir, EXPECTED_FILES[category]), JSON.stringify(receipt, null, 2) + '\n');
  }
  fs.writeFileSync(path.join(dir, 'unrelated-private-extra.json'), JSON.stringify({
    privateMarker: 'PRIVATE_SENTINEL_EXTRA',
    token: 'DO_NOT_READ',
  }));
  return dir;
}

function cleanup(fileOrDir) {
  fs.rmSync(fileOrDir, { recursive: true, force: true });
}

test('public generator packet validates and remains source-only', () => {
  const p = packet();
  const result = checkGeneratorPacket(p);
  assert.equal(result.ok, true);
  closed(result);
  assert.equal(p.status, 'SOURCE_ONLY_GENERATOR_CONTRACT_NO_PRIVATE_RECEIPTS_LOADED');
  assert.equal(p.preparation.privateReadPolicy.automaticSearchOrDirectoryDiscoveryAllowed, false);
  assert.equal(p.preparation.privateReadPolicy.recursiveReadAllowed, false);
  assert.equal(p.preparation.projectionPolicy.committedProjectionAllowed, false);
  assert.equal(p.preparation.projectionPolicy.outputRootRef, '.local/cad-auth-restricted-source-sets');
  assert.deepEqual(Object.keys(p.preparation.privateReadPolicy.expectedReceiptFiles), REQUIRED_LIVE_BINDINGS);
});

test('complete private receipt folder produces sanitized ignored projection', () => {
  const sourceDir = makeFixtureDir();
  const outDir = path.join(OUTPUT_ROOT, 'test-source-set-generator');
  const out = path.join(outDir, 'restricted-source-set.json');
  try {
    const built = buildProjectionFromSourceDir(sourceDir, {
      runId: 'test-source-set-generator',
      generatedAtUtc: '2026-09-25T00:00:00Z',
    });
    assert.equal(built.ok, true);
    assert.equal(validateProjection(built.projection).ok, true);
    const written = writeProjection(built.projection, out);
    assert.equal(written.ok, true);
    const projection = JSON.parse(fs.readFileSync(out, 'utf8'));
    assert.equal(validateProjection(projection).ok, true);
    assert.equal(projection.coverage.complete, true);
    assert.equal(Object.keys(projection.categories).length, REQUIRED_LIVE_BINDINGS.length);
    const text = JSON.stringify(projection);
    assert.doesNotMatch(text, /PRIVATE_VALUE|PRIVATE_SENTINEL|DO_NOT_READ|unrelated-private-extra|\/tmp\//);
    for (const category of REQUIRED_LIVE_BINDINGS) {
      const bytes = fs.readFileSync(path.join(sourceDir, EXPECTED_FILES[category]));
      const entry = projection.categories[category];
      assert.equal(entry.receiptSha256, sha(bytes));
      assert.equal(entry.byteLength, bytes.length);
      assert.ok(entry.receiptRef.startsWith(`rrb-local:cad-auth-restricted-source-set:${projection.runId}:${category}:`));
      assert.deepEqual(Object.keys(entry.fieldPresence), RECEIPT_FIELDS[category]);
      assert.ok(Object.values(entry.fieldPresence).every(Boolean));
    }
  } finally {
    cleanup(sourceDir);
    cleanup(outDir);
  }
});

test('missing, malformed, symlink and incomplete category inputs stop without writing', () => {
  for (const scenario of ['missing', 'malformed', 'incomplete']) {
    const sourceDir = makeFixtureDir();
    try {
      if (scenario === 'missing') fs.rmSync(path.join(sourceDir, EXPECTED_FILES.durableConsumedRunLedger));
      if (scenario === 'malformed') fs.writeFileSync(path.join(sourceDir, EXPECTED_FILES.lateGrantObserver), '{');
      if (scenario === 'incomplete') {
        fs.writeFileSync(path.join(sourceDir, EXPECTED_FILES.immutableTargetRecheckReceipt),
          JSON.stringify({ evidence: { candidateCommit: 'PRIVATE_VALUE' } }));
      }
      const built = buildProjectionFromSourceDir(sourceDir, { runId: `test-${scenario}` });
      assert.equal(built.ok, false, scenario);
      closed(built);
      assert.match(built.code, /MISSING_CATEGORY_RECEIPTS|INVALID_CATEGORY_RECEIPTS|MISSING_REQUIRED_FIELDS/);
    } finally {
      cleanup(sourceDir);
    }
  }
});

test('output and check paths must stay inside ignored source-set root', () => {
  const sourceDir = makeFixtureDir();
  try {
    const built = buildProjectionFromSourceDir(sourceDir, { runId: 'test-output-root' });
    assert.equal(built.ok, true);
    const outside = path.join(os.tmpdir(), 'restricted-source-set.json');
    const result = writeProjection(built.projection, outside);
    assert.equal(result.ok, false);
    closed(result);
    assert.equal(result.code, 'OUTPUT_OUTSIDE_IGNORED_SOURCE_SET_ROOT');
    assert.equal(runCli(['--check', outside]).ok, false);
  } finally {
    cleanup(sourceDir);
  }
});

test('CLI generates and checks sanitized projection with explicit args only', () => {
  const sourceDir = makeFixtureDir();
  const outDir = path.join(OUTPUT_ROOT, 'test-cli-source-set-generator');
  const out = path.join(outDir, 'restricted-source-set.json');
  try {
    const run = spawnSync(process.execPath, [
      'scripts/cad-auth-restricted-source-set-generator.js',
      '--source-dir', sourceDir,
      '--out', out,
      '--run-id', 'test-cli-source-set-generator',
      '--now-utc', '2026-09-25T00:00:00Z',
    ], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stdout);
    const result = JSON.parse(run.stdout);
    assert.equal(result.ok, true);
    assert.equal(result.outputRef, 'rrb-local:cad-auth-restricted-source-set-output:test-cli-source-set-generator');
    assert.equal(validateProjection(JSON.parse(fs.readFileSync(out, 'utf8'))).ok, true);
    const checked = spawnSync(process.execPath, [
      'scripts/cad-auth-restricted-source-set-generator.js',
      '--check', out,
    ], { cwd: root, encoding: 'utf8' });
    assert.equal(checked.status, 0, checked.stdout);
    assert.equal(JSON.parse(checked.stdout).ok, true);
  } finally {
    cleanup(sourceDir);
    cleanup(outDir);
  }
});

test('CLI rejects search, live and ambiguous modes without reading or writing', () => {
  for (const args of [['--scan'], ['--live'], ['--collect'], ['--private-source'], ['--source-dir'],
    ['--source-dir', '/PRIVATE_HOME/ABSOLUTE_PRIVATE_SOURCE'], ['--out', '/tmp/restricted-source-set.json'],
    ['--source-dir', '/tmp/source', '--out', '/tmp/not-local.json', '--retry']]) {
    const result = spawnSync(process.execPath,
      ['scripts/cad-auth-restricted-source-set-generator.js', ...args],
      { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(result.stderr, '');
    closed(JSON.parse(result.stdout));
  }
});

test('public packet source drift and hostile inputs fail closed', () => {
  assert.equal(checkGeneratorContract(packet().preparation).ok, true);
  for (const file of SOURCES) {
    const result = checkGeneratorPacket(packet(), { readSource: name => {
      if (name !== file) return read(name);
      return Buffer.concat([read(name), Buffer.from('\n')]);
    } });
    assert.equal(result.ok, false, file);
    closed(result);
  }
  let calls = 0;
  const hook = () => { calls++; throw Error('PRIVATE_SENTINEL'); };
  const accessor = {}; Object.defineProperty(accessor, 'receiptRef', { enumerable: true, get: hook });
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook });
  const cycle = packet(); cycle.self = cycle;
  for (const input of [null, undefined, [], 'PRIVATE_SENTINEL', accessor, proxy, cycle]) {
    const result = checkGeneratorPacket(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  assert.equal(calls, 0);
});

test('generator source is isolated from runtime imports', () => {
  assert.doesNotMatch(read('offline/cad-auth-restricted-source-set-generator/preparation.js').toString(),
    /process\.env|fetch\s*\(|child_process|https?\.request|node:fs|\.listen\s*\(/);
  function walk(dir) {
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants']) {
    for (const file of walk(dir)) assert.doesNotMatch(read(file).toString(),
      /cad-auth-restricted-source-set-generator/, file);
  }
});
