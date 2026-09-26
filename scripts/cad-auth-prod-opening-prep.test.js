const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { preparation, checkPreparation } = require('../offline/cad-auth-prod-opening-prep/preparation');
const { PACKET, SOURCES, checkPacket } = require('./cad-auth-prod-opening-prep-checker');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));
function closed(result) {
  assert.equal(result.liveExecutionReady, false);
  for (const key of ['uploadSessionIssuanceAuthorized', 'productionUploadActivationAuthorized',
    'requestBodyAdmissionReadAuthorized', 'runtimeActivationAuthorized',
    'executableCommandCardIssuanceAuthorized', 'conversionAuthorized', 'sandboxDispatchAuthorized']) {
    assert.equal(result[key], false, key);
  }
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL/);
}
test('bound preparation is valid but never live-ready', () => {
  assert.equal(checkPreparation(preparation()).ok, true);
  assert.equal(checkPacket(packet()).ok, true);
  closed(checkPacket(packet()));
  const p = preparation();
  assert.equal(p.runnerDesign.implemented, false);
  assert.equal(p.runnerDesign.executableCommandCard, null);
  assert.deepEqual([...p.futureGate.exactPhraseTemplate.matchAll(/<([^>]+)>/g)].map(m => m[1]), Object.keys(p.futureGate.phraseFields));
  assert.ok(Object.values(p.futureGate.phraseFields).every(value => value === null));
});
test('every required control and contract leaf rejects mutation and deletion', () => {
  const original = preparation();
  function visit(value, trail = []) {
    for (const [key, item] of Object.entries(value)) {
      if (item && typeof item === 'object') { visit(item, [...trail, key]); continue; }
      const changed = structuredClone(original);
      let target = changed;
      for (const part of trail) target = target[part];
      target[key] = typeof item === 'boolean' ? !item : 'PRIVATE_SENTINEL';
      assert.equal(checkPreparation(changed).ok, false, [...trail, key].join('.'));
      closed(checkPreparation(changed));
      delete target[key];
      assert.equal(checkPreparation(changed).ok, false);
    }
  }
  visit(original);
  const extra = { ...original, execute: true };
  assert.equal(checkPreparation(extra).ok, false);
});
test('source drift and missing bound files fail closed', () => {
  for (const source of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkPacket(packet(), { readSource(file) {
        if (file !== source) return read(file);
        if (missing) throw Error('PRIVATE_SENTINEL');
        return Buffer.concat([read(file), Buffer.from('\n')]);
      } });
      assert.equal(result.ok, false, source);
      closed(result);
    }
  }
});
test('hostile input cannot invoke accessors or source IO', () => {
  let calls = 0;
  const hook = () => { calls++; throw Error('PRIVATE_SENTINEL'); };
  const accessor = {};
  Object.defineProperty(accessor, 'sourceOnly', { enumerable: true, get: hook });
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook });
  const cycle = {}; cycle.self = cycle;
  const nestedAccessor = preparation();
  Object.defineProperty(nestedAccessor.runnerDesign.sequence, '0', { enumerable: true, get: hook });
  const nestedProxy = preparation();
  nestedProxy.runnerDesign.sequence = new Proxy([], { get: hook, ownKeys: hook });
  const sparse = preparation(); delete sparse.runnerDesign.sequence[0];
  for (const input of [null, undefined, [], 'PRIVATE_SENTINEL', accessor, proxy, cycle, nestedAccessor, nestedProxy, sparse, { toJSON: hook }]) {
    const result = checkPacket(input, { readSource: hook });
    assert.equal(result.ok, false); closed(result);
  }
  assert.equal(calls, 0);
});
test('CLI refuses execution, live approval and arbitrary path inputs', () => {
  for (const args of [['--execute'], ['--activate'], ['--approval', 'PRIVATE_SENTINEL'],
    ['PRIVATE_SENTINEL'], ['--write', 'PRIVATE_SENTINEL']]) {
    const run = spawnSync(process.execPath, ['scripts/cad-auth-prod-opening-prep-checker.js', ...args], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL|\/Users\//);
    closed(JSON.parse(run.stdout));
  }
});
test('preparation has no IO and is absent from runtime dependency surfaces', () => {
  assert.doesNotMatch(read('offline/cad-auth-prod-opening-prep/preparation.js').toString(),
    /process\.env|fetch\s*\(|child_process|https?\.request|node:fs|\.listen\s*\(/);
  function walk(dir) {
    if (!fs.existsSync(path.join(root, dir))) return [];
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants', 'src', 'plugins']) {
    for (const file of walk(dir)) assert.doesNotMatch(read(file).toString(), /cad-auth-prod-opening-prep/, file);
  }
});
