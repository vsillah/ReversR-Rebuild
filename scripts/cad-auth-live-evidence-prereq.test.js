const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const { PACKET, SOURCES, RUNTIME_SOURCES, checkPrerequisites } = require('./cad-auth-live-evidence-prereq-checker');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name));
const packet = () => JSON.parse(read(PACKET));
const denied = input => {
  const result = checkPrerequisites(input);
  assert.equal(result.ok, false);
  assert.equal(result.liveCollectionAuthorized, false);
  assert.equal(result.executable, false);
  assert.equal(JSON.stringify(result).includes('PRIVATE_SENTINEL'), false);
};
function leaves(value, prefix = []) {
  return Object.entries(value).flatMap(([key, child]) => child !== null && typeof child === 'object'
    ? leaves(child, [...prefix, key]) : [[...prefix, key]]);
}
function at(object, keys) { return keys.reduce((v, k) => v[k], object); }

test('source packet validates while every live gate remains closed and review missing', () => {
  const p = packet(), result = checkPrerequisites(p);
  assert.equal(result.ok, true);
  for (const key of Object.keys(result).filter(k => !['ok', 'sourcePrerequisitesValid', 'problems'].includes(k))) {
    assert.equal(result[key], false, key);
  }
  for (const manifest of Object.values(p.manifests)) {
    assert.deepEqual(manifest.review, { status: 'MISSING_LIVE_REVIEW', reviewerRef: null, receiptRef: null, accepted: false });
  }
});

test('every leaf is exact: promotion, live references, outcomes, counters, retries and source drift fail closed', () => {
  for (const keys of leaves(packet())) {
    const p = packet(), parent = at(p, keys.slice(0, -1)), key = keys.at(-1);
    parent[key] = typeof parent[key] === 'boolean' ? !parent[key] : 'PRIVATE_SENTINEL';
    denied(p);
    const missing = packet(); delete at(missing, keys.slice(0, -1))[key]; denied(missing);
  }
  for (const name of Object.keys(packet().manifests)) {
    for (const value of ['https://live.example/target', 'rrb-ref:live-receipt', 'UNKNOWN', 'PASS', 'RETRY', 2]) {
      const p = packet(); p.manifests[name].review.receiptRef = value; denied(p);
    }
    const p = packet(); delete p.manifests[name].review; denied(p);
  }
  for (const outcome of ['UNKNOWN', 'FAIL', 'PASS', 'INTERRUPTED']) {
    const p = packet(); p.manifests.lateGrantObserver.outcome = outcome; denied(p);
  }
  for (const count of [1, 2]) {
    const p = packet(); p.manifests.lateGrantObserver.authorizedRuns = count; denied(p);
  }
});

test('private fields and request/body access attempts are rejected without invoking getters', () => {
  let reads = 0;
  for (const name of ['request', 'body', 'headers', 'rawHeaders', 'credentials', 'privateCad', 'retry', 'secondRun']) {
    for (const enumerable of [true, false]) {
      const p = packet();
      Object.defineProperty(p.manifests.providerPolicy, name, {
        enumerable, get() { reads++; throw Error('PRIVATE_SENTINEL'); },
      });
      denied(p);
    }
    const p = packet(); p.manifests.providerPolicy[name] = 'PRIVATE_SENTINEL'; denied(p);
    const hidden = packet();
    Object.defineProperty(hidden, name, { value: 'PRIVATE_SENTINEL' }); denied(hidden);
  }
  assert.equal(reads, 0);
  for (const input of [null, undefined, [], {}, NaN, new Date(), () => {}]) denied(input);
  const cyclic = packet(); cyclic.self = cyclic; denied(cyclic);
});

test('every bound file and transitive parent integrity fails on changed or missing bytes', () => {
  for (const file of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkPrerequisites(packet(), { readSource: name => {
        if (name !== file) return read(name);
        if (missing) throw Error('PRIVATE_SENTINEL');
        return Buffer.concat([read(name), Buffer.from('\n')]);
      } });
      assert.equal(result.ok, false, file);
    }
  }
  const result = checkPrerequisites(packet(), { readSource: name => name === 'offline/cad-auth-sealed-setup/binding-manifests.json'
    ? Buffer.from('{}') : read(name) });
  assert.equal(result.ok, false);
});

test('new checker is unmounted; current route retains source-closed admission and parser ordering', () => {
  for (const file of RUNTIME_SOURCES) {
    assert.doesNotMatch(read(file).toString(), /cad-auth-live-evidence-prereq/);
  }
  const index = read('server/index.js').toString();
  assert.ok(index.indexOf("app.use('/api/cad', createCadUserUploadRouter(") < index.indexOf('app.use(express.json('));
  const route = read('server/cadUserUploadRouter.js').toString();
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.ok(route.indexOf('if (!BODY_ADMISSION_AUTHORIZED)') < route.indexOf('await validateRequestBody(req)'));
  const checker = read('scripts/cad-auth-live-evidence-prereq-checker.js').toString();
  assert.doesNotMatch(checker, /process\.env|fetch\s*\(|https?\.request|child_process|convex\/browser|\.listen\s*\(/);
});

test('CLI refuses live collection, command-card issuance, retry and arbitrary input paths', () => {
  for (const arg of ['--live', '--seal', '--retry', '--run', '--command-card', '/tmp/PRIVATE_SENTINEL']) {
    const result = spawnSync(process.execPath, ['scripts/cad-auth-live-evidence-prereq-checker.js', arg], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.deepEqual(JSON.parse(result.stdout), { ok: false, executable: false, code: 'SOURCE_PREREQUISITES_BLOCKED' });
    assert.equal(result.stderr, '');
  }
});
