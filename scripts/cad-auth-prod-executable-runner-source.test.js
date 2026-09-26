const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  EFFECTS,
  REQUIRED_CARD_FIELDS,
  runnerSourcePacket,
  checkRunnerSourcePacket,
} = require('../offline/cad-auth-prod-executable-runner-source/preparation');
const { PACKET, SOURCES, checkPacket } = require('./cad-auth-prod-executable-runner-source-checker');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));

function closed(result) {
  assert.equal(result.sourceOnly, true);
  assert.equal(result.enabled, false);
  assert.equal(result.liveExecutionReady, false);
  assert.equal(result.liveExecutionAuthorized, false);
  assert.equal(result.uploadSessionIssuanceAuthorized, false);
  assert.equal(result.productionUploadActivationAuthorized, false);
  assert.equal(result.requestBodyAdmissionReadAuthorized, false);
  assert.equal(result.executableCommandCardIssuanceAuthorized, false);
  assert.equal(result.effectsExecuted, 0);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|\/Users\//);
}

test('packet validates executable source contract while staying closed', () => {
  const p = runnerSourcePacket();
  assert.equal(checkRunnerSourcePacket(p).ok, true);
  assert.equal(checkPacket(packet()).ok, true);
  closed(checkPacket(packet()));
  assert.equal(p.sourceImplementationStatus, 'EXECUTABLE_RUNNER_SOURCE_CONTRACT_READY_DISABLED_BY_DEFAULT');
  assert.equal(p.executableRunnerSource.adapterContractDefined, true);
  assert.equal(p.executableRunnerSource.commandCardShapeDefined, true);
  assert.equal(p.executableRunnerSource.defaultRuntimeAdapter, null);
  assert.equal(p.commandCard.executable, false);
  assert.deepEqual(p.commandCard.requiredFields, REQUIRED_CARD_FIELDS);
  assert.deepEqual(p.effectContract.effectNames, EFFECTS);
});

test('every authority flag and source status rejects mutation', () => {
  const original = runnerSourcePacket();
  function visit(value, trail = []) {
    for (const [key, item] of Object.entries(value)) {
      if (item && typeof item === 'object') {
        visit(item, [...trail, key]);
        continue;
      }
      const changed = structuredClone(original);
      let target = changed;
      for (const part of trail) target = target[part];
      target[key] = typeof item === 'boolean' ? !item : 'PRIVATE_SENTINEL';
      assert.equal(checkRunnerSourcePacket(changed).ok, false, [...trail, key].join('.'));
      closed(checkRunnerSourcePacket(changed));
      delete target[key];
      assert.equal(checkRunnerSourcePacket(changed).ok, false);
    }
  }
  visit(original);
});

test('bound source drift and missing files fail closed', () => {
  const p = packet();
  for (const source of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkPacket(p, { readSource(file) {
        if (file !== source) return read(file);
        if (missing) throw Error('PRIVATE_SENTINEL');
        return Buffer.concat([read(file), Buffer.from('\n')]);
      } });
      assert.equal(result.ok, false, source);
      closed(result);
    }
  }
});

test('hostile input never invokes accessors or leaks input', () => {
  let calls = 0;
  const hook = () => { calls++; throw Error('PRIVATE_SENTINEL'); };
  const accessor = {};
  Object.defineProperty(accessor, 'sourceOnly', { enumerable: true, get: hook });
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook });
  const cycle = {}; cycle.self = cycle;
  const nestedAccessor = runnerSourcePacket();
  nestedAccessor.commandCard.requiredFields = [...nestedAccessor.commandCard.requiredFields];
  Object.defineProperty(nestedAccessor.commandCard.requiredFields, '0', { enumerable: true, get: hook });
  const sparse = runnerSourcePacket();
  sparse.effectContract.effectNames = [...sparse.effectContract.effectNames];
  delete sparse.effectContract.effectNames[0];
  for (const input of [null, undefined, [], 'PRIVATE_SENTINEL', accessor, proxy, cycle,
    nestedAccessor, sparse, { toJSON: hook }]) {
    const result = checkPacket(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  assert.equal(calls, 0);
});

test('CLI refuses live execution, command-card issuance and arbitrary paths', () => {
  for (const args of [['--execute'], ['--activate'], ['--issue-command-card'],
    ['--approval', 'PRIVATE_SENTINEL'], ['PRIVATE_SENTINEL'], ['--write', 'PRIVATE_SENTINEL']]) {
    const run = spawnSync(process.execPath, ['scripts/cad-auth-prod-executable-runner-source-checker.js', ...args],
      { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL|\/Users\//);
    closed(JSON.parse(run.stdout));
  }
});

test('source packet has no runtime IO and is not imported by runtime surfaces', () => {
  assert.doesNotMatch(read('offline/cad-auth-prod-executable-runner-source/preparation.js').toString(),
    /process\.env|fetch\s*\(|child_process|https?\.request|node:fs|\.listen\s*\(/);
  function walk(dir) {
    if (!fs.existsSync(path.join(root, dir))) return [];
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants', 'src', 'plugins']) {
    for (const file of walk(dir)) {
      assert.doesNotMatch(read(file).toString(), /cad-auth-prod-executable-runner-source/, file);
    }
  }
});
