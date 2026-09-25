const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const { recoveryPreparation } = require('../offline/cad-auth-receipt-provenance-gap-recovery/preparation');
const {
  STOPPED_REVIEW,
  REPAIR_FIELDS,
  stopRepairPreparation,
  checkStopRepairPreparation,
} = require('../offline/cad-auth-provenance-review-stop-repair/preparation');
const {
  PACKET,
  SOURCES,
  checkStopRepairPacket,
} = require('./cad-auth-provenance-review-stop-repair-checker');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));

function closed(result) {
  for (const [field, expected] of Object.entries(stopRepairPreparation().controls)) {
    assert.ok(expected === false || expected === 0, field);
    assert.equal(result[field], expected, field);
  }
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|PRIVATE_HOME|ABSOLUTE_PRIVATE_SOURCE|\/Users\//);
}

test('packet binds stopped private review by opaque ref and digests only', () => {
  const p = packet();
  const result = checkStopRepairPacket(p);
  assert.equal(result.ok, true);
  closed(result);
  assert.equal(p.sourceMergeCommit, '9fbb305deaf662da006fad8940403845c6c9d993');
  assert.deepEqual(p.preparation.stoppedReview, {
    ...STOPPED_REVIEW,
    privateReviewBytesRead: false,
    privateReviewReceiptBytesRead: false,
    privateScheduleBytesRead: false,
    stoppedDispositionBoundByOpaqueRefAndDigestOnly: true,
    previousReviewReusable: false,
    secondPrivateReviewAuthorized: false,
  });
  assert.equal(p.preparation.reviewStopDisposition.status, 'STOPPED_SOURCE_ARTIFACT_MISMATCH');
  assert.equal(p.preparation.reviewStopDisposition.stopPreserved, true);
  for (const key of ['ref', 'sha256', 'receiptSha256']) {
    const altered = packet();
    altered.preparation.stoppedReview[key] = 'PRIVATE_SENTINEL';
    const alteredResult = checkStopRepairPacket(altered);
    assert.equal(alteredResult.ok, false, key);
    closed(alteredResult);
  }
});

test('all 22 unsupported fields require prior approval and independent review receipts', () => {
  const p = packet().preparation;
  const expected = recoveryPreparation();
  assert.equal(Object.keys(p.fieldRequirements).length, 22);
  assert.deepEqual(Object.keys(p.fieldRequirements), Object.keys(expected.missingFields));
  assert.equal(p.parentRecovery.unsupportedFields, 22);
  assert.equal(p.parentRecovery.supportedPresenceOnlyField, 'concreteProviderRuntimeBinding.adapterSourceSha256');
  assert.equal(p.parentRecovery.supportedPresenceOnlyFieldAccepted, false);
  for (const [id, entry] of Object.entries(p.fieldRequirements)) {
    assert.equal(id, `${entry.category}.${entry.field}`);
    assert.equal(entry.receiptFile, expected.missingFields[id].receiptFile);
    assert.ok(entry.priorRequiredSourceArtifactDescription.length > 70, id);
    assert.equal(entry.requiredReceipts.priorEvidenceApprovalReceiptRef, null, id);
    assert.equal(entry.requiredReceipts.independentReviewReceiptRef, null, id);
    assert.equal(entry.requiredReceipts.sourceArtifactSha256, null, id);
    assert.equal(entry.requiredReceipts.sourceArtifactByteCount, null, id);
    assert.equal(entry.accepted, false, id);
    assert.equal(entry.acceptanceRequirements.priorEvidenceApprovalMustPredateReview, true, id);
    assert.equal(entry.acceptanceRequirements.independentReviewMustBindFieldAndSourceArtifactDigest, true, id);
    assert.equal(entry.acceptanceRequirements.unresolvedRequirementStopsWholeReview, true, id);
  }
});

test('the two stopped schedule mappings have exact repaired source-artifact contracts', () => {
  const p = packet().preparation;
  const repairFieldMap = Object.fromEntries(Object.keys(REPAIR_FIELDS).map(field => [field, true]));
  assert.deepEqual(p.reviewStopDisposition.fieldsMissingFieldToArtifactProvenance, repairFieldMap);
  assert.deepEqual(p.scheduleRepairContract.repairFields, repairFieldMap);
  for (const [id, repair] of Object.entries(REPAIR_FIELDS)) {
    const entry = p.fieldRequirements[id];
    assert.equal(entry.status, 'SCHEDULE_MAPPING_REPAIR_REQUIRED');
    assert.equal(entry.scheduledSourceArtifactMapping.repairRequired, true);
    assert.equal(entry.scheduledSourceArtifactMapping.currentReviewProblem, repair.currentProblem);
    assert.equal(entry.scheduledSourceArtifactMapping.repairedSourceArtifactKind, repair.repairedSourceArtifactKind);
    assert.equal(entry.scheduledSourceArtifactMapping.repairedRequiredSourceArtifact, repair.requiredSourceArtifact);
  }
  for (const [id, entry] of Object.entries(p.fieldRequirements)) {
    if (REPAIR_FIELDS[id]) continue;
    assert.equal(entry.status, 'PRIOR_APPROVAL_AND_REVIEW_RECEIPTS_REQUIRED', id);
    assert.equal(entry.scheduledSourceArtifactMapping.repairRequired, false, id);
  }
});

test('future schedule repair phrase binds stopped review and preserves closed boundaries', () => {
  const gate = packet().preparation.futureApprovalGate;
  assert.equal(gate.authorized, false);
  assert.deepEqual([...gate.exactPhraseTemplate.matchAll(/<([^>]+)>/g)].map(m => m[1]), Object.keys(gate.phraseFields));
  assert.ok(Object.values(gate.phraseFields).every(value => value === null));
  for (const value of Object.values(STOPPED_REVIEW)) assert.ok(gate.exactPhraseTemplate.includes(value));
  assert.match(gate.exactPhraseTemplate, /repair only the scheduled source-artifact mappings/);
  assert.match(gate.exactPhraseTemplate, /bind prior-evidence approval receipts and independent-review receipts for all 22 unsupported fields/);
  assert.match(gate.exactPhraseTemplate, /No private receipt reads or discovery/);
  assert.match(gate.exactPhraseTemplate, /second private review/);
  assert.equal(gate.futurePrivateEvidenceReviewRequiresSeparateApproval, true);
});

test('every leaf is immutable and sanitized failure stays closed', () => {
  const original = stopRepairPreparation();
  function visit(value, trail = []) {
    for (const [key, item] of Object.entries(value)) {
      const next = [...trail, key];
      if (item && typeof item === 'object') visit(item, next);
      else {
        const changed = structuredClone(original);
        let target = changed;
        for (const parent of trail) target = target[parent];
        target[key] = item === true ? false : item === false ? true : 'PRIVATE_SENTINEL';
        const result = checkStopRepairPreparation(changed);
        assert.equal(result.ok, false, next.join('.'));
        closed(result);
        delete target[key];
        assert.equal(checkStopRepairPreparation(changed).ok, false, next.join('.'));
      }
    }
  }
  visit(original);
});

test('source drift, missing files and altered parent bytes fail closed', () => {
  for (const file of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkStopRepairPacket(packet(), { readSource: name => {
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
    const result = checkStopRepairPacket(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  assert.equal(calls, 0);
});

test('checker reads fixed public sources only and CLI refuses private paths and execution flags', () => {
  const result = checkStopRepairPacket(packet(), { readSource: file => {
    assert.match(file, /^(?:(docs|offline|scripts|server|convex|api)\/|(?:vercel|package|package-lock)\.json$)/);
    assert.ok(!path.isAbsolute(file));
    assert.ok(!file.split('/').includes('..'));
    assert.doesNotMatch(file, /\.local|\.env/);
    return read(file);
  } });
  assert.equal(result.ok, true);
  closed(result);
  for (const args of [['PRIVATE_SENTINEL'], ['--execute'], ['--write', 'PRIVATE_SENTINEL']]) {
    const run = spawnSync(process.execPath, ['scripts/cad-auth-provenance-review-stop-repair-checker.js', ...args], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL|\/Users\//);
    closed(JSON.parse(run.stdout));
  }
});

test('offline module has no IO capability and no runtime surface imports it', () => {
  assert.doesNotMatch(read('offline/cad-auth-provenance-review-stop-repair/preparation.js').toString(),
    /process\.env|fetch\s*\(|child_process|https?\.request|node:fs|\.listen\s*\(/);
  function walk(dir) {
    if (!fs.existsSync(path.join(root, dir))) return [];
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants', 'src', 'plugins']) {
    for (const file of walk(dir)) assert.doesNotMatch(read(file).toString(), /cad-auth-provenance-review-stop-repair/, file);
  }
});
