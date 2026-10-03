'use strict';
// Source assertions only. No test here qualifies a host or performs an upload.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const checker = require('./cad-auth-controlled-upload-durable-host-integration-design-checker');
const ROOT = path.resolve(__dirname, '..');
const CHECKER = 'scripts/cad-auth-controlled-upload-durable-host-integration-design-checker.js';
const manifestBytes = fs.readFileSync(path.join(ROOT, checker.MANIFEST));
const manifest = JSON.parse(manifestBytes);
const sources = Object.fromEntries(checker.SOURCES.map(file => [file, fs.readFileSync(path.join(ROOT, file))]));
const checkerSource = fs.readFileSync(path.join(ROOT, CHECKER), 'utf8');
const mutateManifest = edit => {
  const copy = JSON.parse(manifestBytes);
  edit(copy);
  return Buffer.from(`${JSON.stringify(copy, null, 2)}\n`);
};
function closed(result, ok = false) {
  assert.equal(result.ok, ok);
  for (const key of ['hostQualified', 'bodyAdmissionAuthorized', 'liveReady']) assert.equal(result[key], false);
  assert.equal(result.assertionLevel, 'source-assertions-only');
  assert.equal(result.costs, 0);
  assert.equal(result.providerCalls, 0);
  assert.equal(result.runtimeEffects, 0);
}
function harness(args = [], { symlink, missing, failRead = false } = {}) {
  const reads = [], prints = [], stats = [], imports = [];
  const bytes = { [checker.MANIFEST]: manifestBytes, ...sources };
  const absolute = Object.fromEntries(Object.entries(bytes).map(([file, value]) => [path.join(ROOT, file), value]));
  const directories = new Set([ROOT]);
  for (const file of Object.keys(absolute)) {
    let parent = path.dirname(file);
    while (parent.startsWith(ROOT)) { directories.add(parent); if (parent === ROOT) break; parent = path.dirname(parent); }
  }
  const syntheticFs = {
    lstatSync(file) {
      stats.push(file);
      assert.ok(directories.has(file) || Object.hasOwn(absolute, file), 'fixed paths only');
      if (file === missing) throw Error('SYNTHETIC_PRIVATE_SENTINEL');
      return { isDirectory: () => directories.has(file), isSymbolicLink: () => file === symlink,
        isFile: () => Object.hasOwn(absolute, file), size: absolute[file]?.length || 0 };
    },
    readFileSync(file) {
      assert.ok(Object.hasOwn(absolute, file), 'fixed reads only');
      reads.push(file);
      if (failRead) throw Error('SYNTHETIC_PRIVATE_SENTINEL');
      return absolute[file];
    },
  };
  const module = { exports: {} };
  const requireFixed = name => {
    imports.push(name);
    if (name === 'node:fs') return syntheticFs;
    if (name === 'node:path') return path;
    if (name === 'node:crypto') return crypto;
    throw Error(`Forbidden import: ${name}`);
  };
  requireFixed.main = module;
  let envReads = 0;
  const processStub = { argv: ['node', CHECKER, ...args], exitCode: 0 };
  Object.defineProperty(processStub, 'env', { get() { envReads++; throw Error('ENV_FORBIDDEN'); } });
  vm.runInNewContext(checkerSource, { require: requireFixed, module, Buffer,
    __dirname: path.join(ROOT, 'scripts'), process: processStub,
    console: { log: value => prints.push(value) },
    fetch: () => { throw Error('NETWORK_FORBIDDEN'); } }, { timeout: 1000 });
  assert.equal(envReads, 0);
  assert.deepEqual(imports, ['node:fs', 'node:path', 'node:crypto']);
  assert.equal(prints.length, 1);
  assert.doesNotMatch(prints[0], /SYNTHETIC_PRIVATE_SENTINEL|\/Users\/|credentialDigest|sourceBindings/);
  return { result: JSON.parse(prints[0]), exitCode: processStub.exitCode, reads, stats };
}

test('source assertions: fixed design passes while every live authority stays false', () => {
  closed(checker.checkFixedSources(), true);
  closed(checker.checkDesign(manifestBytes, sources), true);
  assert.equal(Object.keys(manifest.tables).length, 7);
  assert.equal(manifest.acceptance.cases.length, 25);
  assert.equal(new Set(manifest.acceptance.cases.map(row => row.id)).size, 25);
  assert.ok(manifest.acceptance.cases.every(row => row.livePassed === false));
  assert.equal(manifest.timeAndStreaming.dbTransactionAtomicWithHttpStream, false);
  assert.equal(manifest.receiptVerification.commitOrdering.comparableToWallClock, false);
});

test('source assertions: changing any authorized capability or readiness flag blocks', () => {
  for (const key of Object.keys(manifest.authorizes)) {
    closed(checker.checkDesign(mutateManifest(m => { m.authorizes[key] = true; }), sources));
  }
  for (const key of ['hostQualified', 'bodyAdmissionAuthorized', 'liveReady', 'runtimeChanged', 'executableCardIssued', 'liveWindowIssued', 'approvalPhraseIssued']) {
    closed(checker.checkDesign(mutateManifest(m => { m[key] = true; }), sources));
  }
  closed(checker.checkDesign(mutateManifest(m => { m.costs = 1; }), sources));
});

test('source assertions: weakened schema, bindings, matrix or timing cannot pass', () => {
  for (const edit of [
    m => { delete m.typeDefinitions.immutableGrantBinding.credentialDigest; },
    m => { delete m.typeDefinitions.immutableGrantBinding.privateCredentialSupplyRef; },
    m => { delete m.typeDefinitions.immutableGrantBinding.productionAlias; },
    m => { m.registration.callerAuthorityInitializationAllowed = true; },
    m => { m.registration.beforeIndependentBaseline = false; },
    m => { delete m.tables.cadControlledUploadSessionTombstones; },
    m => { m.uniqueness.runKey.push('windowStartMs'); },
    m => { m.transport.clientForwardRetries = 1; },
    m => { m.timeAndStreaming.trustedClockQualified = true; },
    m => { m.timeAndStreaming.revocationHandoffQualified = true; },
    m => { m.receiptVerification.commitOrdering.comparableToWallClock = true; },
    m => { m.smoke.statusProvesRevocationOrZeroReads = true; },
    m => { m.acceptance.cases.pop(); },
    m => { m.acceptance.cases[0].livePassed = true; },
    m => { m.recovery.spentOrConsumedMayReset = true; },
  ]) closed(checker.checkDesign(mutateManifest(edit), sources));
});

test('source assertions: drift or missing bytes in every pinned source blocks', () => {
  for (const file of checker.SOURCES) {
    closed(checker.checkDesign(manifestBytes, { ...sources, [file]: Buffer.concat([sources[file], Buffer.from('\n// drift')]) }));
    const missing = { ...sources }; delete missing[file];
    closed(checker.checkDesign(manifestBytes, missing));
  }
});

test('source assertions: forged hashes, unknown paths and extra private material block', () => {
  const first = checker.SOURCES[0];
  const changed = { ...sources, [first]: Buffer.from('changed') };
  closed(checker.checkDesign(mutateManifest(m => { m.sourceBindings[first] = crypto.createHash('sha256').update(changed[first]).digest('hex'); }), changed));
  closed(checker.checkDesign(manifestBytes, { ...sources, '.local/private': Buffer.from('SYNTHETIC_PRIVATE_SENTINEL') }));
  closed(checker.checkDesign(mutateManifest(m => { m.sourceBindings = { '../secret': '0'.repeat(64) }; }), sources));
});

test('source assertions: malformed/oversize inputs and accessor values never grant authority', () => {
  for (const bytes of [null, 'not-bytes', Buffer.from('{'), Buffer.alloc(1024 * 1024 + 1)]) closed(checker.checkDesign(bytes, sources));
  let getterCalls = 0;
  const getterSource = { ...sources };
  Object.defineProperty(getterSource, checker.SOURCES[0], { get() { getterCalls++; throw Error('SYNTHETIC_PRIVATE_SENTINEL'); } });
  closed(checker.checkDesign(manifestBytes, getterSource));
  assert.equal(getterCalls, 0);
  closed(checker.checkDesign(manifestBytes, Object.create(sources)));
});

test('source assertions: restricted checker harness reads only fixed files, no runtime or env imports', () => {
  const run = harness();
  closed(run.result, true);
  assert.equal(run.exitCode, 0);
  assert.deepEqual(run.reads, [checker.MANIFEST, ...checker.SOURCES].map(file => path.join(ROOT, file)));
});

test('source assertions: all CLI arguments reject before filesystem access', () => {
  for (const args of [['--write'], ['--live'], ['--execute'], ['--activate'], ['--qualify'], ['--help'], ['../secret'], ['--manifest', '.local/private']]) {
    const run = harness(args);
    closed(run.result);
    assert.equal(run.exitCode, 1);
    assert.deepEqual(run.reads, []);
    assert.deepEqual(run.stats, []);
  }
});

test('source assertions: symlink, missing file and read errors block with sanitized output', () => {
  for (const opts of [{ symlink: ROOT }, { symlink: path.join(ROOT, 'docs') },
    { symlink: path.join(ROOT, checker.MANIFEST) },
    { missing: path.join(ROOT, checker.MANIFEST) }, { failRead: true }]) {
    const run = harness([], opts);
    closed(run.result);
    assert.equal(run.exitCode, 1);
  }
});
