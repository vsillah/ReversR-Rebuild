const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const { REQUIRED_LIVE_BINDINGS } = require('../offline/cad-auth-live-collector-binding/guardedCollector');
const { RECEIPT_FIELDS } = require('../offline/cad-auth-command-card-source/preparation');
const {
  SOURCE_SET_RUN_ID,
  SOURCE_SET_SHA256,
  ACCEPTED_PROVENANCE_PACKET_SHA256,
  RECEIPTS,
  restrictedSourceSetProjection,
  checkRestrictedSourceSetProjection,
} = require('../offline/cad-auth-restricted-source-set-projection/preparation');
const {
  PACKET,
  SOURCES,
  checkSourceSetProjectionPacket,
} = require('./cad-auth-restricted-source-set-projection-checker');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));

function closed(result) {
  for (const [field, expected] of Object.entries(restrictedSourceSetProjection().controls)) {
    assert.equal(result[field], expected, field);
  }
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|PRIVATE_HOME|ABSOLUTE_PRIVATE_SOURCE|\/Users\/|\.local\//);
}

test('packet projects coherent source-set by opaque refs, digests, byte counts and counts only', () => {
  const p = packet();
  const result = checkSourceSetProjectionPacket(p);
  assert.equal(result.ok, true);
  closed(result);
  assert.equal(p.preparation.restrictedSourceSet.sha256, SOURCE_SET_SHA256);
  assert.equal(p.preparation.restrictedSourceSet.runId, SOURCE_SET_RUN_ID);
  assert.equal(p.preparation.restrictedSourceSet.privateSourceSetBytesReadByThisPacket, false);
  assert.equal(p.preparation.restrictedSourceSet.privateSourceSetPathProjected, false);
  assert.equal(p.preparation.acceptedProvenanceProjection.sha256, ACCEPTED_PROVENANCE_PACKET_SHA256);
  assert.equal(p.preparation.acceptedProvenanceProjection.privateReviewBytesReadByThisPacket, false);
});

test('category coverage binds all eight categories and 23 required fields', () => {
  const projection = packet().preparation;
  assert.equal(projection.categoryCoverage.complete, true);
  assert.equal(projection.categoryCoverage.categoryCount, REQUIRED_LIVE_BINDINGS.length);
  assert.equal(projection.categoryCoverage.completeCategoryCount, REQUIRED_LIVE_BINDINGS.length);
  assert.equal(projection.categoryCoverage.requiredFieldCount, 23);
  assert.equal(projection.categoryCoverage.presentFieldCount, 23);
  assert.equal(projection.categoryCoverage.acceptedFieldRatio, '23/23');
  assert.deepEqual(Object.keys(projection.categories), REQUIRED_LIVE_BINDINGS);
  for (const category of REQUIRED_LIVE_BINDINGS) {
    const entry = projection.categories[category];
    assert.equal(entry.receiptSha256, RECEIPTS[category].receiptSha256);
    assert.equal(entry.byteLength, RECEIPTS[category].byteLength);
    assert.equal(entry.requiredFieldCount, RECEIPT_FIELDS[category].length);
    assert.equal(entry.presentFieldCount, RECEIPT_FIELDS[category].length);
    assert.equal(entry.complete, true);
    assert.equal(entry.fieldPresenceProjectedAsCountsOnly, true);
    assert.equal(entry.privateValuesProjected, false);
    assert.equal(entry.privatePathsProjected, false);
    assert.equal(entry.keyListingsProjected, false);
  }
});

test('runtime, upload and execution controls stay closed', () => {
  const projection = packet().preparation;
  assert.ok(Object.values(projection.closedControlStatus).every(Boolean));
  assert.equal(projection.controls.publicSourceSetProjectionAuthorized, true);
  assert.equal(projection.controls.uploadSessionIssuanceAuthorized, false);
  assert.equal(projection.controls.productionUploadActivationAuthorized, false);
  assert.equal(projection.controls.requestBodyAdmissionReadAuthorized, false);
  assert.equal(projection.controls.runtimeActivationAuthorized, false);
  assert.equal(projection.controls.executableCommandCardIssuanceAuthorized, false);
  assert.equal(projection.controls.commercialReadinessClaimed, false);
});

test('next readiness rollup gate remains unapproved and exact', () => {
  const gate = packet().preparation.nextReadinessRollupGate;
  assert.equal(gate.authorized, false);
  assert.deepEqual([...gate.exactPhraseTemplate.matchAll(/<([^>]+)>/g)].map(m => m[1]), Object.keys(gate.phraseFields));
  assert.ok(Object.values(gate.phraseFields).every(value => value === null));
  assert.match(gate.exactPhraseTemplate, /production upload-admission readiness rollup gate/);
  assert.match(gate.exactPhraseTemplate, /coherent restricted source-set coverage/);
  assert.match(gate.exactPhraseTemplate, /No private receipt values/);
  assert.equal(gate.productionUploadAdmissionRequiresSeparateApproval, true);
  assert.equal(gate.runtimeCredentialsOrProviderConfigurationRequireSeparateApproval, true);
});

test('every leaf is immutable and sanitized failure stays closed', () => {
  const original = restrictedSourceSetProjection();
  function visit(value, trail = []) {
    for (const [key, item] of Object.entries(value)) {
      const next = [...trail, key];
      if (item && typeof item === 'object') visit(item, next);
      else {
        const changed = structuredClone(original);
        let target = changed;
        for (const parent of trail) target = target[parent];
        target[key] = item === true ? false : item === false ? true : 'PRIVATE_SENTINEL';
        const result = checkRestrictedSourceSetProjection(changed);
        assert.equal(result.ok, false, next.join('.'));
        closed(result);
        delete target[key];
        assert.equal(checkRestrictedSourceSetProjection(changed).ok, false, next.join('.'));
      }
    }
  }
  visit(original);
});

test('source drift, missing files and altered parent bytes fail closed', () => {
  for (const file of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkSourceSetProjectionPacket(packet(), { readSource: name => {
        if (name !== file) return read(name);
        if (missing) throw Error('PRIVATE_SENTINEL');
        return Buffer.concat([read(name), Buffer.from('\n')]);
      } });
      assert.equal(result.ok, false, file);
      closed(result);
    }
  }
});

test('hostile inputs reject without invoking getters, proxies, serializers or source reads', () => {
  let calls = 0;
  const hook = () => { calls++; throw Error('PRIVATE_SENTINEL'); };
  const accessor = {};
  Object.defineProperty(accessor, 'preparation', { enumerable: true, get: hook });
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook });
  const cycle = {};
  cycle.self = cycle;
  for (const input of [null, undefined, [], 'PRIVATE_SENTINEL', accessor, proxy, cycle, { toJSON: hook }]) {
    const result = checkSourceSetProjectionPacket(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  assert.equal(calls, 0);
});

test('checker reads fixed public sources only and CLI refuses private paths and execution flags', () => {
  const result = checkSourceSetProjectionPacket(packet(), { readSource: file => {
    assert.match(file, /^(?:(docs|offline|scripts|server|convex|api)\/|(?:vercel|package|package-lock)\.json$)/);
    assert.ok(!path.isAbsolute(file));
    assert.ok(!file.split('/').includes('..'));
    assert.doesNotMatch(file, /\.local|\.env/);
    return read(file);
  } });
  assert.equal(result.ok, true);
  closed(result);
  for (const args of [['PRIVATE_SENTINEL'], ['--execute'], ['--write', 'PRIVATE_SENTINEL']]) {
    const run = spawnSync(process.execPath, ['scripts/cad-auth-restricted-source-set-projection-checker.js', ...args], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL|\/Users\//);
    closed(JSON.parse(run.stdout));
  }
});

test('offline module has no IO capability and no runtime surface imports it', () => {
  assert.doesNotMatch(read('offline/cad-auth-restricted-source-set-projection/preparation.js').toString(),
    /process\.env|fetch\s*\(|child_process|https?\.request|node:fs|\.listen\s*\(/);
  function walk(dir) {
    if (!fs.existsSync(path.join(root, dir))) return [];
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants', 'src', 'plugins']) {
    for (const file of walk(dir)) assert.doesNotMatch(read(file).toString(), /cad-auth-restricted-source-set-projection/, file);
  }
});
