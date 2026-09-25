const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const { REQUIRED_LIVE_BINDINGS } = require('../offline/cad-auth-live-collector-binding/guardedCollector');
const { RECEIPT_FIELDS } = require('../offline/cad-auth-command-card-source/preparation');
const { PACKET, SOURCES, checkPlan } =
  require('./cad-auth-restricted-receipt-gap-closure-plan-checker');
const { checkGapClosurePlan } =
  require('../offline/cad-auth-restricted-receipt-gap-closure-plan/preparation');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
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
  assert.equal(result.coherentPrivateSourceSetAccepted, false);
  assert.equal(result.privateReceiptReadAuthorized, false);
  assert.equal(result.authorizedRuns, 0);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|PRIVATE_HOME|ABSOLUTE_PRIVATE_SOURCE/);
}

test('hostile objects fail without getter, proxy, toJSON or restricted source evaluation', () => {
  let calls = 0;
  const hook = () => { calls++; throw Error('PRIVATE_SENTINEL'); };
  const accessor = {}; Object.defineProperty(accessor, 'receiptRef', { enumerable: true, get: hook });
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  const cycle = packet(); cycle.self = cycle;
  const hidden = packet(); Object.defineProperty(hidden, 'private', { value: 'PRIVATE_SENTINEL' });
  const symbol = packet(); symbol[Symbol('private')] = 'PRIVATE_SENTINEL';
  const toJSON = packet(); toJSON.toJSON = hook;
  for (const input of [null, undefined, [], 'PRIVATE_SENTINEL', NaN, new Date(),
    accessor, proxy, revoked.proxy, cycle, hidden, symbol, toJSON]) {
    const result = checkPlan(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  const nested = packet();
  nested.preparation.categories.concreteProviderRuntimeBinding = accessor;
  assert.equal(checkPlan(nested, { readSource: hook }).ok, false);
  assert.equal(calls, 0);
});

test('source drift and forbidden CLI modes fail closed', () => {
  for (const file of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkPlan(packet(), { readSource: name => {
        if (name !== file) return read(name);
        if (missing) throw Error('PRIVATE_SENTINEL');
        return Buffer.concat([read(name), Buffer.from('\n')]);
      } });
      assert.equal(result.ok, false, file);
      closed(result);
    }
  }
  const before = read(PACKET);
  for (const args of [['--live'], ['--collect'], ['--receipt'], ['--private-source'],
    ['--restricted-source=/tmp/receipts.json'], ['--install'], ['--use'], ['--issue'],
    ['--seal'], ['--approve'], ['--retry'], ['--write', '--collect'],
    ['/PRIVATE_HOME/ReversR-Rebuild/ABSOLUTE_PRIVATE_SOURCE.json']]) {
    const result = spawnSync(process.execPath,
      ['scripts/cad-auth-restricted-receipt-gap-closure-plan-checker.js', ...args],
      { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(result.stderr, '');
    closed(JSON.parse(result.stdout));
    assert.deepEqual(read(PACKET), before);
  }
});

test('offline module has no private I/O and runtime code does not import the packet', () => {
  assert.equal(checkGapClosurePlan(packet().preparation).ok, true);
  assert.doesNotMatch(read('offline/cad-auth-restricted-receipt-gap-closure-plan/preparation.js').toString(),
    new RegExp('process\\.env|fetch\\s*\\(|child_process|https?\\.request|node:fs|\\.listen\\s*\\('));
  function walk(dir) {
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants']) {
    for (const file of walk(dir)) assert.doesNotMatch(read(file).toString(),
      /cad-auth-restricted-receipt-gap-closure-plan/, file);
  }
});


test('eight missing artifacts preserve all 23 field contracts and only supplied partial coverage', () => {
  const p = packet();
  assert.equal(checkPlan(p).ok, true);
  closed(checkPlan(p));
  assert.equal(p.preparation.baseline.fullCategoryMatches, 0);
  assert.equal(p.preparation.baseline.privateSourcesReadByThisGate, 0);
  assert.deepEqual(Object.keys(p.preparation.categories), REQUIRED_LIVE_BINDINGS);
  let count = 0;
  for (const category of REQUIRED_LIVE_BINDINGS) {
    const c = p.preparation.categories[category];
    assert.deepEqual(Object.keys(c.requiredPublicFieldNames), RECEIPT_FIELDS[category]);
    assert.equal(c.sourceOnlyPreparationCanProduceReceipt, false);
    for (const value of Object.values(c.requiredPublicFieldNames)) {
      assert.deepEqual(value, { required: true, value: null }); count++;
    }
  }
  assert.equal(count, 23);
});

test('every primitive mutation, field deletion and extra private field is rejected', () => {
  const original = packet();
  const routes = [];
  function visit(obj, route = []) {
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && typeof value === 'object') visit(value, [...route, key]);
      else routes.push([...route, key]);
    }
  }
  visit(original.preparation);
  for (const route of routes) {
    for (const remove of [false, true]) {
      const p = packet();
      let obj = p.preparation;
      for (const key of route.slice(0, -1)) obj = obj[key];
      if (remove) delete obj[route.at(-1)];
      else obj[route.at(-1)] = 'PRIVATE_SENTINEL';
      const result = checkPlan(p);
      assert.equal(result.ok, false, route.join('.'));
      closed(result);
    }
  }
  const extra = packet(); extra.preparation.receiptValue = 'PRIVATE_SENTINEL';
  assert.equal(checkPlan(extra).ok, false);
});

test('reads stay within tracked public sources and generation is deterministic', () => {
  const { expectedPacket } = require('./cad-auth-restricted-receipt-gap-closure-plan-checker');
  const tracked = new Set(spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).stdout.trim().split('\n'));
  // New source files are staged before this test runs.
  const seen = new Set();
  const readSource = name => {
    assert.ok(tracked.has(name), name);
    assert.match(name, /^(?:(docs|offline|scripts|server|convex|api)\/|(?:vercel|package|package-lock)\.json$)/);
    assert.ok(!name.split('/').includes('..') && !name.split('/').includes('.local'));
    seen.add(name); return read(name);
  };
  assert.deepEqual(expectedPacket(readSource), packet());
  assert.deepEqual(expectedPacket(readSource), expectedPacket(readSource));
  for (const source of SOURCES) assert.ok(seen.has(source));
});


test('packet identity, parent digest and category deletion cannot bypass validation', () => {
  for (const mutate of [p => { p.parent.sha256 = 'a'.repeat(64); },
    p => { p.sourceOnly = false; }, p => { p.packet = 'PRIVATE_SENTINEL'; },
    p => { delete p.preparation.categories.lateGrantObserver; }]) {
    const p = packet(); mutate(p);
    const result = checkPlan(p); assert.equal(result.ok, false); closed(result);
  }
});
