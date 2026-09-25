const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const {
  ACCEPTED_REVIEW,
  REPAIRED_SCHEDULE,
  RETENTION,
  acceptedProvenanceProjection,
  checkAcceptedProvenanceProjection,
} = require('../offline/cad-auth-accepted-provenance-projection/preparation');
const {
  PACKET,
  SOURCES,
  checkProjectionPacket,
} = require('./cad-auth-accepted-provenance-projection-checker');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));

function closed(result) {
  for (const [field, expected] of Object.entries(acceptedProvenanceProjection().controls)) {
    assert.equal(result[field], expected, field);
  }
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|PRIVATE_HOME|ABSOLUTE_PRIVATE_SOURCE|\/Users\//);
}

test('packet projects accepted private review by opaque refs, digests and counts only', () => {
  const p = packet();
  const result = checkProjectionPacket(p);
  assert.equal(result.ok, true);
  closed(result);
  assert.equal(p.sourceMergeCommit, '5690e016163d916096a40a9a09204c57c5a541c5');
  assert.deepEqual(p.preparation.privateReviewProjection, {
    ...ACCEPTED_REVIEW,
    privateReviewBytesReadByThisPacket: false,
    privateReviewReceiptBytesReadByThisPacket: false,
    repairedScheduleBytesReadByThisPacket: false,
    dispositionProjectedByOpaqueRefAndDigestOnly: true,
    privateValuesProjected: false,
    privatePathsProjected: false,
    keyListingsProjected: false,
  });
  for (const key of ['ref', 'sha256', 'receiptSha256']) {
    const altered = packet();
    altered.preparation.privateReviewProjection[key] = 'PRIVATE_SENTINEL';
    const alteredResult = checkProjectionPacket(altered);
    assert.equal(alteredResult.ok, false, key);
    closed(alteredResult);
  }
});

test('projection binds 22 accepted fields, two repaired mappings and closed controls', () => {
  const projection = packet().preparation;
  assert.equal(projection.provenanceCoverage.requiredFieldCount, 22);
  assert.equal(projection.provenanceCoverage.acceptedFieldCount, 22);
  assert.equal(projection.provenanceCoverage.rejectedFieldCount, 0);
  assert.equal(projection.provenanceCoverage.unknownFieldCount, 0);
  assert.equal(projection.provenanceCoverage.acceptedFieldRatio, '22/22');
  assert.equal(projection.repairedScheduleProjection.ref, REPAIRED_SCHEDULE.ref);
  assert.equal(projection.repairedScheduleProjection.sha256, REPAIRED_SCHEDULE.sha256);
  assert.equal(projection.repairedScheduleProjection.repairedMappingsVerified, 2);
  assert.equal(projection.repairedScheduleProjection.repairedMappingsRequired, 2);
  assert.equal(projection.repairedScheduleProjection.repairedMappingVerificationStatus, 'VERIFIED_2_OF_2');
  assert.ok(Object.values(projection.closedControlStatus).every(Boolean));
  assert.equal(projection.controls.receiptSupplyAuthorized, false);
  assert.equal(projection.controls.sourceSetGenerationAuthorized, false);
  assert.equal(projection.controls.productionUploadActivationAuthorized, false);
  assert.equal(projection.controls.requestBodyAdmissionReadAuthorized, false);
});

test('retention disposition is public-safe and binds custodian, reviewer and deletion owner', () => {
  const disposition = packet().preparation.retentionDeletionDisposition;
  assert.equal(disposition.restrictedStoreRef, RETENTION.restrictedStoreRef);
  assert.equal(disposition.retentionDuration, 'P7D');
  assert.equal(disposition.expiresAtUtc, '2026-10-02T17:06:02Z');
  assert.equal(disposition.custodianRef, RETENTION.custodianRef);
  assert.equal(disposition.independentReviewerRef, RETENTION.independentReviewerRef);
  assert.equal(disposition.deletionOwnerRef, RETENTION.deletionOwnerRef);
  assert.equal(disposition.publicPacketContainsOnlyOpaqueRefsDigestsCountsAndStatuses, true);
  assert.doesNotMatch(JSON.stringify(disposition), /\/Users\/|\.local|PRIVATE_SENTINEL/);
});

test('next receipt supply gate is exact, unapproved and bounded to accepted provenance', () => {
  const gate = packet().preparation.nextReceiptSupplyGate;
  assert.equal(gate.authorized, false);
  assert.deepEqual([...gate.exactPhraseTemplate.matchAll(/<([^>]+)>/g)].map(m => m[1]), Object.keys(gate.phraseFields));
  assert.ok(Object.values(gate.phraseFields).every(value => value === null));
  assert.match(gate.exactPhraseTemplate, /eight-artifact receipt supply from the accepted provenance review/);
  assert.match(gate.exactPhraseTemplate, /read only the accepted private provenance review, its review receipt, and the repaired schedule named above/);
  assert.match(gate.exactPhraseTemplate, /stop without substitution/);
  assert.match(gate.exactPhraseTemplate, /No discovery beyond the named accepted review/);
  assert.equal(gate.receiptSupplyRequiresSeparatePrivateReadApproval, true);
  assert.equal(gate.sourceSetGenerationRequiresSeparateApproval, true);
  assert.equal(gate.productionUploadActivationRequiresSeparateApproval, true);
});

test('every leaf is immutable and sanitized failure stays closed', () => {
  const original = acceptedProvenanceProjection();
  function visit(value, trail = []) {
    for (const [key, item] of Object.entries(value)) {
      const next = [...trail, key];
      if (item && typeof item === 'object') visit(item, next);
      else {
        const changed = structuredClone(original);
        let target = changed;
        for (const parent of trail) target = target[parent];
        target[key] = item === true ? false : item === false ? true : 'PRIVATE_SENTINEL';
        const result = checkAcceptedProvenanceProjection(changed);
        assert.equal(result.ok, false, next.join('.'));
        closed(result);
        delete target[key];
        assert.equal(checkAcceptedProvenanceProjection(changed).ok, false, next.join('.'));
      }
    }
  }
  visit(original);
});

test('source drift, missing files and altered parent bytes fail closed', () => {
  for (const file of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkProjectionPacket(packet(), { readSource: name => {
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
    const result = checkProjectionPacket(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  assert.equal(calls, 0);
});

test('checker reads fixed public sources only and CLI refuses private paths and execution flags', () => {
  const result = checkProjectionPacket(packet(), { readSource: file => {
    assert.match(file, /^(?:(docs|offline|scripts|server|convex|api)\/|(?:vercel|package|package-lock)\.json$)/);
    assert.ok(!path.isAbsolute(file));
    assert.ok(!file.split('/').includes('..'));
    assert.doesNotMatch(file, /\.local|\.env/);
    return read(file);
  } });
  assert.equal(result.ok, true);
  closed(result);
  for (const args of [['PRIVATE_SENTINEL'], ['--execute'], ['--write', 'PRIVATE_SENTINEL']]) {
    const run = spawnSync(process.execPath, ['scripts/cad-auth-accepted-provenance-projection-checker.js', ...args], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL|\/Users\//);
    closed(JSON.parse(run.stdout));
  }
});

test('offline module has no IO capability and no runtime surface imports it', () => {
  assert.doesNotMatch(read('offline/cad-auth-accepted-provenance-projection/preparation.js').toString(),
    /process\.env|fetch\s*\(|child_process|https?\.request|node:fs|\.listen\s*\(/);
  function walk(dir) {
    if (!fs.existsSync(path.join(root, dir))) return [];
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants', 'src', 'plugins']) {
    for (const file of walk(dir)) assert.doesNotMatch(read(file).toString(), /cad-auth-accepted-provenance-projection/, file);
  }
});
