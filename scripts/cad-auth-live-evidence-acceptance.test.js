const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const {
  PACKET, SOURCES, RUNTIME_SOURCES, checkAcceptance,
} = require('./cad-auth-live-evidence-acceptance-checker');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name));
const packet = () => JSON.parse(read(PACKET));
const denied = input => {
  const result = checkAcceptance(input);
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

test('source completion packet validates while every live and executable gate remains closed', () => {
  const result = checkAcceptance(packet());
  assert.equal(result.ok, true);
  for (const key of Object.keys(result).filter(k => !['ok', 'sourceAcceptanceRequirementsValid', 'problems'].includes(k))) {
    assert.equal(result[key], false, key);
  }
  const p = packet();
  assert.equal(p.futureApproval.actionable, false);
  assert.equal(p.card.executable, false);
  assert.equal(p.schedule.authorizedRuns, 0);
  assert.equal(p.futureApproval.exactApprovalReceiptRef, null);
});

test('every leaf is exact and live-looking promotion or receipt fields fail closed', () => {
  for (const keys of leaves(packet())) {
    const p = packet(), parent = at(p, keys.slice(0, -1)), key = keys.at(-1);
    parent[key] = typeof parent[key] === 'boolean' ? !parent[key] : 'PRIVATE_SENTINEL';
    denied(p);
    const missing = packet(); delete at(missing, keys.slice(0, -1))[key]; denied(missing);
  }
  const liveValues = ['https://live.example/target', 'rrb-ref:provider-receipt', 'PASS', 'UNKNOWN',
    'RETRY', 'secret:PRIVATE_SENTINEL', 1, 2];
  for (const [name, manifest] of Object.entries(packet().categories)) {
    for (const value of liveValues) {
      const p = packet();
      if (manifest.status) {
        p.categories[name].observationRef = value;
        denied(p);
      }
    }
  }
});

test('private request/provider fields are rejected without invoking getters', () => {
  let reads = 0;
  const names = ['request', 'body', 'headers', 'rawHeaders', 'credentials', 'secretValue',
    'privateCad', 'providerResponse', 'retry', 'secondRun', 'commandLine'];
  for (const name of names) {
    for (const enumerable of [true, false]) {
      const p = packet();
      Object.defineProperty(p.categories.providerPolicy, name, {
        enumerable, get() { reads++; throw Error('PRIVATE_SENTINEL'); },
      });
      denied(p);
    }
    const p = packet(); p.categories.providerPolicy[name] = 'PRIVATE_SENTINEL'; denied(p);
    const hidden = packet(); Object.defineProperty(hidden, name, { value: 'PRIVATE_SENTINEL' }); denied(hidden);
  }
  assert.equal(reads, 0);
  for (const input of [null, undefined, [], {}, NaN, new Date(), () => {}]) denied(input);
  const cyclic = packet(); cyclic.self = cyclic; denied(cyclic);
});

test('every bound source and transitive parent drift fails closed', () => {
  for (const file of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkAcceptance(packet(), { readSource: name => {
        if (name !== file) return read(name);
        if (missing) throw Error('PRIVATE_SENTINEL');
        return Buffer.concat([read(name), Buffer.from('\n')]);
      } });
      assert.equal(result.ok, false, file);
    }
  }
  const result = checkAcceptance(packet(), { readSource: name => name === 'docs/cad-auth-live-evidence-prerequisites.json'
    ? Buffer.from('{}') : read(name) });
  assert.equal(result.ok, false);
});

test('completion checker remains offline and unmounted from runtime routes', () => {
  for (const file of RUNTIME_SOURCES) {
    assert.doesNotMatch(read(file).toString(), /cad-auth-live-evidence-acceptance/);
  }
  const checker = read('scripts/cad-auth-live-evidence-acceptance-checker.js').toString();
  assert.doesNotMatch(checker, /process\.env|fetch\s*\(|https?\.request|child_process|convex\/browser|\.listen\s*\(/);
  const index = read('server/index.js').toString();
  assert.ok(index.indexOf("app.use('/api/cad', createCadUserUploadRouter(") < index.indexOf('app.use(express.json('));
  const route = read('server/cadUserUploadRouter.js').toString();
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.ok(route.indexOf('if (!BODY_ADMISSION_AUTHORIZED)') < route.indexOf('await validateRequestBody(req)'));
});

test('CLI refuses live collection, sealing, retry and arbitrary input paths', () => {
  for (const arg of ['--live', '--accept', '--seal', '--retry', '--run', '--command-card', '/tmp/PRIVATE_SENTINEL']) {
    const result = spawnSync(process.execPath,
      ['scripts/cad-auth-live-evidence-acceptance-checker.js', arg],
      { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.deepEqual(JSON.parse(result.stdout), {
      ok: false, executable: false, code: 'SOURCE_ACCEPTANCE_BLOCKED',
    });
    assert.equal(result.stderr, '');
  }
});
