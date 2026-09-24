const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const { PACKET, SOURCES, checkPreparation } = require('./cad-auth-command-card-source-checker');
const { MERGE_COMMIT, disabledPreparation, checkDisabledPreparation }
  = require('../offline/cad-auth-command-card-source/preparation');
const { REQUIRED_LIVE_BINDINGS } = require('../offline/cad-auth-live-collector-binding/guardedCollector');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));
function closed(result) {
  assert.equal(result.executable, false);
  assert.equal(result.liveCollectionAuthorized, false);
  assert.equal(result.liveCollectorCommandLine, null);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL/);
}

test('source contract validates with eight missing bindings and zero execution authority', () => {
  const p = packet();
  assert.equal(p.parent.mergeCommit, '8c69d2c845dd2dd5d733280ef983b6c4a9248213');
  assert.equal(p.parent.consumedStopCode, 'MISSING_PREREQUISITE');
  assert.equal(p.parent.priorApprovalReusable, false);
  assert.equal(checkPreparation(p).ok, true);
  assert.equal(checkDisabledPreparation(p.preparation).ok, true);
  closed(checkPreparation(p));
  assert.deepEqual(Object.keys(p.preparation.runtimeBindingReceipts), REQUIRED_LIVE_BINDINGS);
  for (const receipt of Object.values(p.preparation.runtimeBindingReceipts)) {
    assert.equal(receipt.boundMergeCommit, MERGE_COMMIT);
    assert.equal(receipt.status, 'MISSING_PREREQUISITE');
    assert.equal(receipt.accepted, false);
    assert.ok(Object.values(receipt.evidence).every(value => value === null));
  }
});

test('malformed, private, cyclic, accessor and proxy inputs fail without evaluation or disclosure', () => {
  let calls = 0;
  const getter = packet();
  Object.defineProperty(getter.preparation, 'executable', { enumerable: true, get() { calls++; return false; } });
  const hidden = packet();
  Object.defineProperty(hidden, 'private', { value: 'PRIVATE_SENTINEL' });
  const symbol = packet(); symbol[Symbol('private')] = 'PRIVATE_SENTINEL';
  const cycle = packet(); cycle.self = cycle;
  const proxy = new Proxy({}, { getPrototypeOf() { calls++; throw Error('PRIVATE_SENTINEL'); } });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  const nested = packet(); nested.preparation = proxy;
  const toJSON = packet(); toJSON.toJSON = () => { calls++; return 'PRIVATE_SENTINEL'; };
  for (const input of [null, [], 'PRIVATE_SENTINEL', undefined, NaN, new Date(),
    { ...packet(), private: 'PRIVATE_SENTINEL' }, getter, hidden, symbol, cycle, proxy, revoked.proxy, nested, toJSON]) {
    for (const check of [checkPreparation, checkDisabledPreparation]) {
      const result = check(input); assert.equal(result.ok, false); closed(result);
    }
  }
  assert.equal(calls, 0);
});

test('every receipt promotion and populated evidence slot fails closed', () => {
  for (const name of REQUIRED_LIVE_BINDINGS) {
    const receipt = disabledPreparation().runtimeBindingReceipts[name];
    for (const field of Object.keys(receipt)) {
      const p = packet();
      p.preparation.runtimeBindingReceipts[name][field] = typeof receipt[field] === 'boolean' ? true : 'PRIVATE_SENTINEL';
      assert.equal(checkPreparation(p).ok, false);
      assert.equal(checkDisabledPreparation(p.preparation).ok, false);
    }
    for (const field of Object.keys(receipt.evidence)) {
      const p = packet(); p.preparation.runtimeBindingReceipts[name].evidence[field] = 'PRIVATE_SENTINEL';
      const result = checkPreparation(p); assert.equal(result.ok, false); closed(result);
    }
  }
  const p = packet();
  for (const receipt of Object.values(p.preparation.runtimeBindingReceipts)) receipt.accepted = true;
  assert.equal(checkPreparation(p).ok, false);
});

test('live commands, gates, counters, merge drift and extra fields cannot promote a card', () => {
  for (const [key, value] of Object.entries(disabledPreparation())) {
    if (typeof value !== 'boolean' && value !== null && typeof value !== 'number') continue;
    const p = packet(); p.preparation[key] = typeof value === 'boolean' ? !value : value === null ? 'node live.js' : 1;
    const result = checkPreparation(p); assert.equal(result.ok, false); closed(result);
  }
  for (const key of Object.keys(disabledPreparation().futureHumanGate)) {
    const p = packet(); p.preparation.futureHumanGate[key] = 'PRIVATE_SENTINEL';
    assert.equal(checkPreparation(p).ok, false);
  }
  for (const mutate of [p => { p.parent.mergeCommit = 'drift'; },
    p => { p.parent.priorApprovalReusable = true; }, p => { p.command = 'node live.js'; },
    p => { p.sourceOnly = false; }]) {
    const p = packet(); mutate(p); assert.equal(checkPreparation(p).ok, false);
  }
});

test('direct and transitive source drift fails closed', () => {
  for (const file of [...SOURCES, 'offline/cad-auth-live-collector-binding/guardedCollector.js']) {
    const result = checkPreparation(packet(), { readSource: name => name === file
      ? Buffer.concat([read(name), Buffer.from('\n')]) : read(name) });
    assert.equal(result.ok, false); closed(result);
  }
  const result = checkPreparation(packet(), { readSource: () => { throw Error('PRIVATE_SENTINEL'); } });
  assert.equal(result.ok, false); closed(result);
});

test('CLI rejects live, retry, collect, issuance and unknown modes without writing', () => {
  const before = read(PACKET);
  for (const args of [['--live'], ['--retry'], ['--collect'], ['live'], ['retry'], ['collect'],
    ['--issue'], ['--seal'], ['--write', '--live'], ['--write=PRIVATE_SENTINEL'], ['--unknown']]) {
    const result = spawnSync(process.execPath, ['scripts/cad-auth-command-card-source-checker.js', ...args],
      { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(result.stderr, '');
    closed(JSON.parse(result.stdout));
    assert.deepEqual(read(PACKET), before);
  }
});

test('offline module has no I/O and no runtime source imports the preparation package', () => {
  assert.doesNotMatch(read('offline/cad-auth-command-card-source/preparation.js').toString(),
    /process\.env|fetch\s*\(|child_process|https?\.request|node:fs|\.listen\s*\(/);
  function walk(dir) {
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants']) {
    for (const file of walk(dir)) assert.doesNotMatch(read(file).toString(), /cad-auth-command-card-source/, file);
  }
});
