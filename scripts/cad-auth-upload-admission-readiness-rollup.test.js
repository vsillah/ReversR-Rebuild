const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const { REQUIRED_LIVE_BINDINGS } = require('../offline/cad-auth-live-collector-binding/guardedCollector');
const { RECEIPT_FIELDS } = require('../offline/cad-auth-command-card-source/preparation');
const {
  SOURCE_SET_PROJECTION_PACKET_SHA256,
  PRODUCTION_TARGET_ORIGIN,
  PRODUCTION_UPLOAD_ROUTE,
  INTERNAL_TEST_COHORT_REF,
  receiptCoverageProjection,
  uploadAdmissionReadinessRollup,
  checkUploadAdmissionReadinessRollup,
} = require('../offline/cad-auth-upload-admission-readiness-rollup/preparation');
const {
  SOURCE_SET_SHA256,
  SOURCE_SET_RUN_ID,
  ACCEPTED_PROVENANCE_PACKET_SHA256,
  RECEIPTS,
} = require('../offline/cad-auth-restricted-source-set-projection/preparation');
const {
  PACKET,
  SOURCES,
  checkReadinessRollupPacket,
} = require('./cad-auth-upload-admission-readiness-rollup-checker');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));

function closed(result) {
  for (const [field, expected] of Object.entries(uploadAdmissionReadinessRollup().controls)) {
    assert.equal(result[field], expected, field);
  }
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|PRIVATE_HOME|ABSOLUTE_PRIVATE_SOURCE|\/Users\/|\.local\//);
}

test('packet rolls up accepted provenance and coherent source-set readiness without private reads', () => {
  const p = packet();
  const result = checkReadinessRollupPacket(p);
  assert.equal(result.ok, true);
  closed(result);
  assert.equal(p.preparation.acceptedProvenance.sha256, ACCEPTED_PROVENANCE_PACKET_SHA256);
  assert.equal(p.preparation.acceptedProvenance.acceptedFieldCount, 22);
  assert.equal(p.preparation.acceptedProvenance.privateReviewBytesReadByThisRollup, false);
  assert.equal(p.preparation.restrictedSourceSetProjection.sha256, SOURCE_SET_PROJECTION_PACKET_SHA256);
  assert.equal(p.preparation.restrictedSourceSetProjection.restrictedSourceSetSha256, SOURCE_SET_SHA256);
  assert.equal(p.preparation.restrictedSourceSetProjection.runId, SOURCE_SET_RUN_ID);
  assert.equal(p.preparation.restrictedSourceSetProjection.privateSourceSetBytesReadByThisRollup, false);
});

test('eight artifact receipt supply binds categories, digests, bytes and counts only', () => {
  const supply = packet().preparation.eightArtifactReceiptSupply;
  const expected = receiptCoverageProjection();
  assert.equal(supply.complete, true);
  assert.equal(supply.categoryCount, REQUIRED_LIVE_BINDINGS.length);
  assert.equal(supply.completeCategoryCount, REQUIRED_LIVE_BINDINGS.length);
  assert.equal(supply.requiredFieldCount, 23);
  assert.equal(supply.presentFieldCount, 23);
  assert.equal(supply.receiptDigestCount, 8);
  assert.equal(supply.receiptByteCountTotal, 47410);
  assert.deepEqual(supply.categories, expected);
  for (const category of REQUIRED_LIVE_BINDINGS) {
    const entry = supply.categories[category];
    assert.equal(entry.receiptSha256, RECEIPTS[category].receiptSha256);
    assert.equal(entry.byteLength, RECEIPTS[category].byteLength);
    assert.equal(entry.requiredFieldCount, RECEIPT_FIELDS[category].length);
    assert.equal(entry.presentFieldCount, RECEIPT_FIELDS[category].length);
    assert.equal(entry.valuesProjected, false);
    assert.equal(entry.pathsProjected, false);
    assert.equal(entry.keyListingsProjected, false);
  }
});

test('target route is bound while upload admission remains unauthorized', () => {
  const target = packet().preparation.productionUploadAdmissionTarget;
  assert.equal(target.origin, PRODUCTION_TARGET_ORIGIN);
  assert.equal(target.route, PRODUCTION_UPLOAD_ROUTE);
  assert.equal(target.internalTestCohortRef, INTERNAL_TEST_COHORT_REF);
  assert.equal(target.routeBindingOnly, true);
  assert.equal(target.uploadAdmissionAuthorizedByThisRollup, false);
  assert.equal(target.requestBodyAdmissionReadAuthorizedByThisRollup, false);
  assert.equal(target.uploadSessionIssuanceAuthorizedByThisRollup, false);
});

test('runtime, upload, body-read, conversion and commercialization controls stay closed', () => {
  const rollup = packet().preparation;
  assert.ok(Object.values(rollup.closedControlStatus).every(Boolean));
  assert.equal(rollup.controls.sourceOnlyUploadAdmissionReadinessRollupAuthorized, true);
  assert.equal(rollup.controls.uploadSessionIssuanceAuthorized, false);
  assert.equal(rollup.controls.productionUploadActivationAuthorized, false);
  assert.equal(rollup.controls.requestBodyAdmissionReadAuthorized, false);
  assert.equal(rollup.controls.conversionAuthorized, false);
  assert.equal(rollup.controls.sandboxDispatchAuthorized, false);
  assert.equal(rollup.controls.runtimeActivationAuthorized, false);
  assert.equal(rollup.controls.executableCommandCardIssuanceAuthorized, false);
  assert.equal(rollup.controls.realUserCommercializationAuthorized, false);
  assert.equal(rollup.controls.commercialReadinessClaimed, false);
});

test('next production upload-admission gate remains unresolved and exact', () => {
  const gate = packet().preparation.nextProductionUploadAdmissionGate;
  assert.equal(gate.authorized, false);
  assert.deepEqual([...gate.exactPhraseTemplate.matchAll(/<([^>]+)>/g)].map(m => m[1]), Object.keys(gate.phraseFields));
  assert.ok(Object.values(gate.phraseFields).every(value => value === null));
  assert.match(gate.exactPhraseTemplate, /one bounded internal production upload-admission opening/);
  assert.match(gate.exactPhraseTemplate, /one concurrent session/);
  assert.match(gate.exactPhraseTemplate, /one upload attempt/);
  assert.match(gate.exactPhraseTemplate, /post-rollback fail-closed smoke/);
  assert.equal(gate.productionUploadAdmissionRequiresSeparateApproval, true);
  assert.equal(gate.requestBodyAdmissionReadRequiresSeparateApproval, true);
  assert.equal(gate.uploadSessionIssuanceRequiresSeparateApproval, true);
  assert.equal(gate.runtimeActivationRequiresSeparateApproval, true);
  assert.equal(gate.unresolvedPlaceholdersAreNotApproval, true);
});

test('every leaf is immutable and sanitized failure stays closed', () => {
  const original = uploadAdmissionReadinessRollup();
  function visit(value, trail = []) {
    for (const [key, item] of Object.entries(value)) {
      const next = [...trail, key];
      if (item && typeof item === 'object') visit(item, next);
      else {
        const changed = structuredClone(original);
        let target = changed;
        for (const parent of trail) target = target[parent];
        target[key] = item === true ? false : item === false ? true : 'PRIVATE_SENTINEL';
        const result = checkUploadAdmissionReadinessRollup(changed);
        assert.equal(result.ok, false, next.join('.'));
        closed(result);
        delete target[key];
        assert.equal(checkUploadAdmissionReadinessRollup(changed).ok, false, next.join('.'));
      }
    }
  }
  visit(original);
});

test('source drift, missing files and altered parent bytes fail closed', () => {
  for (const file of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkReadinessRollupPacket(packet(), { readSource: name => {
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
    const result = checkReadinessRollupPacket(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  assert.equal(calls, 0);
});

test('checker reads fixed public sources only and CLI refuses private paths and execution flags', () => {
  const result = checkReadinessRollupPacket(packet(), { readSource: file => {
    assert.match(file, /^(?:(docs|offline|scripts|server|convex|api)\/|(?:vercel|package|package-lock)\.json$)/);
    assert.ok(!path.isAbsolute(file));
    assert.ok(!file.split('/').includes('..'));
    assert.doesNotMatch(file, /\.local|\.env/);
    return read(file);
  } });
  assert.equal(result.ok, true);
  closed(result);
  for (const args of [['PRIVATE_SENTINEL'], ['--execute'], ['--write', 'PRIVATE_SENTINEL']]) {
    const run = spawnSync(process.execPath, ['scripts/cad-auth-upload-admission-readiness-rollup-checker.js', ...args], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL|\/Users\//);
    closed(JSON.parse(run.stdout));
  }
});

test('offline module has no IO capability and no runtime surface imports it', () => {
  assert.doesNotMatch(read('offline/cad-auth-upload-admission-readiness-rollup/preparation.js').toString(),
    /process\.env|fetch\s*\(|child_process|https?\.request|node:fs|\.listen\s*\(/);
  function walk(dir) {
    if (!fs.existsSync(path.join(root, dir))) return [];
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants', 'src', 'plugins']) {
    for (const file of walk(dir)) assert.doesNotMatch(read(file).toString(), /cad-auth-upload-admission-readiness-rollup/, file);
  }
});
