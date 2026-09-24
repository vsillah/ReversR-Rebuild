const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const { PACKET, SOURCES, checkBundle } = require('./cad-auth-restricted-receipt-bundle-checker');
const { MERGE_COMMIT, disabledBundle, checkDisabledBundle }
  = require('../offline/cad-auth-restricted-receipt-bundle/preparation');
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
  assert.equal(p.parent.mergeCommit, MERGE_COMMIT);
  assert.equal(p.parent.consumedStopCode, 'MISSING_PREREQUISITE');
  assert.equal(p.parent.priorApprovalReusable, false);
  assert.equal(checkBundle(p).ok, true);
  assert.equal(checkDisabledBundle(p.preparation).ok, true);
  closed(checkBundle(p));
  assert.deepEqual(Object.keys(p.preparation.runtimeBindingReceipts), REQUIRED_LIVE_BINDINGS);
  for (const receipt of Object.values(p.preparation.runtimeBindingReceipts)) {
    assert.equal(receipt.boundMergeCommit, '8c69d2c845dd2dd5d733280ef983b6c4a9248213');
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
    for (const check of [checkBundle, checkDisabledBundle]) {
      const result = check(input); assert.equal(result.ok, false); closed(result);
    }
  }
  assert.equal(calls, 0);
});

test('every receipt promotion and populated evidence slot fails closed', () => {
  for (const name of REQUIRED_LIVE_BINDINGS) {
    const receipt = disabledBundle().runtimeBindingReceipts[name];
    for (const field of Object.keys(receipt)) {
      const p = packet();
      p.preparation.runtimeBindingReceipts[name][field] = typeof receipt[field] === 'boolean' ? true : 'PRIVATE_SENTINEL';
      assert.equal(checkBundle(p).ok, false);
      assert.equal(checkDisabledBundle(p.preparation).ok, false);
    }
    for (const field of Object.keys(receipt.evidence)) {
      const p = packet(); p.preparation.runtimeBindingReceipts[name].evidence[field] = 'PRIVATE_SENTINEL';
      const result = checkBundle(p); assert.equal(result.ok, false); closed(result);
    }
  }
  const p = packet();
  for (const receipt of Object.values(p.preparation.runtimeBindingReceipts)) receipt.accepted = true;
  assert.equal(checkBundle(p).ok, false);
});

test('live commands, gates, counters, merge drift and extra fields cannot promote a card', () => {
  for (const [key, value] of Object.entries(disabledBundle())) {
    if (typeof value !== 'boolean' && value !== null && typeof value !== 'number') continue;
    const p = packet(); p.preparation[key] = typeof value === 'boolean' ? !value : value === null ? 'node live.js' : 1;
    const result = checkBundle(p); assert.equal(result.ok, false); closed(result);
  }
  for (const key of Object.keys(disabledBundle().futureHumanGate)) {
    const p = packet(); p.preparation.futureHumanGate[key] = 'PRIVATE_SENTINEL';
    assert.equal(checkBundle(p).ok, false);
  }
  for (const mutate of [p => { p.parent.mergeCommit = 'drift'; },
    p => { p.parent.priorApprovalReusable = true; }, p => { p.command = 'node live.js'; },
    p => { p.sourceOnly = false; }]) {
    const p = packet(); mutate(p); assert.equal(checkBundle(p).ok, false);
  }
});

test('direct and transitive source drift fails closed', () => {
  for (const file of [...SOURCES, 'offline/cad-auth-live-collector-binding/guardedCollector.js',
    'scripts/cad-auth-live-evidence-acceptance-checker.js']) {
    const result = checkBundle(packet(), { readSource: name => name === file
      ? Buffer.concat([read(name), Buffer.from('\n')]) : read(name) });
    assert.equal(result.ok, false); closed(result);
  }
  const result = checkBundle(packet(), { readSource: () => { throw Error('PRIVATE_SENTINEL'); } });
  assert.equal(result.ok, false); closed(result);
});

test('CLI rejects live, retry, collect, issuance and unknown modes without writing', () => {
  const before = read(PACKET);
  for (const args of [['--live'], ['--retry'], ['--collect'], ['live'], ['retry'], ['collect'],
    ['--issue'], ['--seal'], ['--write', '--live'], ['--write=PRIVATE_SENTINEL'], ['--unknown']]) {
    const result = spawnSync(process.execPath, ['scripts/cad-auth-restricted-receipt-bundle-checker.js', ...args],
      { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(result.stderr, '');
    closed(JSON.parse(result.stdout));
    assert.deepEqual(read(PACKET), before);
  }
});

test('offline module has no I/O and no runtime source imports the preparation package', () => {
  assert.doesNotMatch(read('offline/cad-auth-restricted-receipt-bundle/preparation.js').toString(),
    /process\.env|fetch\s*\(|child_process|https?\.request|node:fs|\.listen\s*\(/);
  function walk(dir) {
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants']) {
    for (const file of walk(dir)) assert.doesNotMatch(read(file).toString(), /cad-auth-restricted-receipt-bundle/, file);
  }
});

// Exercise every scalar and every object boundary, including custody and future gates.
test('every leaf alteration, deletion and unknown nested field fails closed', () => {
  function visit(value, keys = []) {
    if (value === null || typeof value !== 'object') return [{ keys, leaf: true, value }];
    return [{ keys, leaf: false }, ...Object.entries(value).flatMap(([key, child]) => visit(child, [...keys, key]))];
  }
  for (const entry of visit(packet())) {
    for (const mode of entry.leaf ? ['alter', 'delete'] : ['extra']) {
      const p = packet();
      let target = p;
      const route = mode === 'extra' ? entry.keys : entry.keys.slice(0, -1);
      for (const key of route) target = target[key];
      const key = entry.keys.at(-1);
      if (mode === 'extra') target.unknownPrivateField = 'PRIVATE_SENTINEL';
      else if (mode === 'delete') delete target[key];
      else target[key] = typeof entry.value === 'boolean' ? !entry.value
        : typeof entry.value === 'number' ? entry.value + 1 : 'PRIVATE_SENTINEL';
      const result = checkBundle(p);
      assert.equal(result.ok, false, entry.keys.join('.') + ':' + mode);
      closed(result);
    }
  }
});

test('nested hostile receipt data is rejected before hooks or source reads', () => {
  let calls = 0;
  const hook = () => { calls++; throw Error('PRIVATE_SENTINEL'); };
  const accessor = {}; Object.defineProperty(accessor, 'receiptRef', { enumerable: true, get: hook });
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook });
  const cyclic = {}; cyclic.self = cyclic;
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  const hidden = {}; Object.defineProperty(hidden, 'private', { value: 'PRIVATE_SENTINEL' });
  for (const hostile of [accessor, proxy, cyclic, revoked.proxy, hidden, { toJSON: hook },
    Object.create({ private: 'PRIVATE_SENTINEL' }), { [Symbol('private')]: 'PRIVATE_SENTINEL' }]) {
    const p = packet();
    p.preparation.runtimeBindingReceipts.custodyReviewerReceipt.evidence = hostile;
    assert.equal(checkDisabledBundle(p.preparation).ok, false);
    const result = checkBundle(p, { readSource: hook });
    assert.equal(result.ok, false); closed(result);
  }
  assert.equal(calls, 0);
});

test('parent validation cannot be bypassed by rebinding a modified parent hash', () => {
  const { createHash } = require('node:crypto');
  const parentFile = 'docs/cad-auth-command-card-source.json';
  const modified = JSON.parse(read(parentFile));
  modified.preparation.executable = true;
  const bytes = Buffer.from(JSON.stringify(modified));
  const digest = createHash('sha256').update(bytes).digest('hex');
  const p = packet(); p.parent.sha256 = digest; p.sourceBindings[parentFile] = digest;
  const result = checkBundle(p, { readSource: file => file === parentFile ? bytes : read(file) });
  assert.equal(result.ok, false); closed(result);
});
