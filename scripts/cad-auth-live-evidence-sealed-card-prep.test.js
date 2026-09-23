const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const {
  PACKET, SOURCES, RUNTIME_SOURCES, checkPreparation,
} = require('./cad-auth-live-evidence-sealed-card-prep-checker');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name));
const packet = () => JSON.parse(read(PACKET));
const denied = input => {
  const result = checkPreparation(input);
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
  const result = checkPreparation(packet());
  assert.equal(result.ok, true);
  for (const key of Object.keys(result).filter(k => !['ok', 'sourcePreparationValid', 'problems'].includes(k))) {
    assert.equal(result[key], false, key);
  }
  const p = packet();
  assert.equal(p.futureApproval.phraseActionableNow, false);
  assert.equal(p.seal.executable, false);
  assert.equal(p.payload.schedule.authorizedRuns, 0);
  assert.equal(p.futureApproval.approvalReceiptRef, null);
});

test('every leaf is exact and live-looking promotion or receipt fields fail closed', () => {
  for (const keys of leaves(packet())) {
    const p = packet(), parent = at(p, keys.slice(0, -1)), key = keys.at(-1);
    parent[key] = typeof parent[key] === 'boolean' ? !parent[key] : 'PRIVATE_SENTINEL';
    denied(p);
    const missing = packet(); delete at(missing, keys.slice(0, -1))[key]; denied(missing);
  }

});

test('private request/provider fields are rejected without invoking getters', () => {
  let reads = 0;
  const names = ['request', 'body', 'headers', 'rawHeaders', 'credentials', 'secretValue',
    'privateCad', 'providerResponse', 'retry', 'secondRun', 'commandLine'];
  for (const name of names) {
    for (const enumerable of [true, false]) {
      const p = packet();
      Object.defineProperty(p.payload.proposedReferences, name, {
        enumerable, get() { reads++; throw Error('PRIVATE_SENTINEL'); },
      });
      denied(p);
    }
    const p = packet(); p.payload.proposedReferences[name] = 'PRIVATE_SENTINEL'; denied(p);
    const hidden = packet(); Object.defineProperty(hidden, name, { value: 'PRIVATE_SENTINEL' }); denied(hidden);
  }
  assert.equal(reads, 0);
  for (const input of [null, undefined, [], {}, NaN, new Date(), () => {}]) denied(input);
  const cyclic = packet(); cyclic.self = cyclic; denied(cyclic);
});

test('every bound source and transitive parent drift fails closed', () => {
  for (const file of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkPreparation(packet(), { readSource: name => {
        if (name !== file) return read(name);
        if (missing) throw Error('PRIVATE_SENTINEL');
        return Buffer.concat([read(name), Buffer.from('\n')]);
      } });
      assert.equal(result.ok, false, file);
    }
  }
  const result = checkPreparation(packet(), { readSource: name => name === 'docs/cad-auth-live-evidence-prerequisites.json'
    ? Buffer.from('{}') : read(name) });
  assert.equal(result.ok, false);
});

test('completion checker remains offline and unmounted from runtime routes', () => {
  for (const file of RUNTIME_SOURCES) {
    assert.doesNotMatch(read(file).toString(), /cad-auth-live-evidence-sealed-card-prep/);
  }
  const checker = read('scripts/cad-auth-live-evidence-sealed-card-prep-checker.js').toString();
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
      ['scripts/cad-auth-live-evidence-sealed-card-prep-checker.js', arg],
      { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.deepEqual(JSON.parse(result.stdout), {
      ok: false, executable: false, code: 'SOURCE_PREPARATION_BLOCKED',
    });
    assert.equal(result.stderr, '');
  }
});

const { createHash } = require('node:crypto');
const { canonical } = require('./cad-auth-live-evidence-sealed-card-prep-checker');
test('seal reproducibly binds the payload and exact inactive approval phrase', () => {
  const p = packet();
  const digest = createHash('sha256').update(canonical(p.payload)).digest('hex');
  assert.equal(digest, p.seal.sha256);
  assert.ok(p.futureApproval.exactPhrase.includes(digest));
  assert.ok(p.futureApproval.exactPhrase.includes(p.payload.schedule.limitsSha256));
  assert.doesNotMatch(p.futureApproval.exactPhrase, /<[^>]+>/);
  assert.equal(canonical({ z: 1, a: [2, 1] }), '{"a":[2,1],"z":1}');
  assert.equal(Date.parse(p.payload.window.expiresAtUtc) - Date.parse(p.payload.window.startsAtUtc), 1800000);
  assert.notEqual(p.payload.proposedReferences.custodianRef, p.payload.proposedReferences.reviewerRef);
  assert.equal(p.payload.proposedReferences.assignmentsAccepted, false);
  assert.equal(p.payload.deployment.commit, p.payload.candidateCommit);
  const changed = packet(); changed.payload.window.startsAtUtc = '2026-09-25T20:00:00Z';
  changed.seal.sha256 = createHash('sha256').update(canonical(changed.payload)).digest('hex');
  denied(changed);
});
