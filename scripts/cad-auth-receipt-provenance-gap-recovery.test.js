const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const { RECEIPT_FIELDS } = require('../offline/cad-auth-command-card-source/preparation');
const { recoveryPreparation, checkRecoveryPreparation } = require('../offline/cad-auth-receipt-provenance-gap-recovery/preparation');
const { PACKET, SOURCES, checkRecoveryPacket } = require('./cad-auth-receipt-provenance-gap-recovery-checker');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));
function closed(result) {
  for (const [field, expected] of Object.entries(recoveryPreparation().controls)) {
    assert.ok(expected === false || expected === 0, field);
    assert.equal(result[field], expected, field);
  }
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|PRIVATE_HOME|ABSOLUTE_PRIVATE_SOURCE|\/Users\//);
}

test('packet binds every supplied anchor and preserves all stop dispositions', () => {
  const p = packet();
  const result = checkRecoveryPacket(p);
  assert.equal(result.ok, true); closed(result);
  assert.equal(p.sourceMergeCommit, 'cdfe042852eaa5393656aeec87aac630eaf47f47');
  assert.equal(p.parent.sourceMergeCommit, p.sourceMergeCommit);
  assert.equal(p.parent.sha256, '6c8078d324286af5560e99c5d0e632616d83867538cee65ca8645975e96cbdac');
  assert.deepEqual(p.preparation.anchors, {
    mainCommit: 'cdfe042852eaa5393656aeec87aac630eaf47f47',
    supplyPacketSha256: '6c8078d324286af5560e99c5d0e632616d83867538cee65ca8645975e96cbdac',
    stopDispositionSha256: '6fbdb713768b16563a6bd0bf6557c79c4fc10217f809330bab49982f95f17157',
    supplyAttemptDispositionSha256: 'c3356c5457988de9926b11d663cb77a059104c757dce30c2633d6cb2fe98731d',
    artifactCreationAttemptDispositionSha256: '3ef1c42261cfbcdc2982bd30fa39273f6e3d037513af8575401fc04717c7d62e',
  });
  assert.equal(p.preparation.dispositionBinding.privateDispositionContentsVerified, false);
  assert.equal(p.preparation.dispositionBinding.currentDisposition, 'STOP_PRESERVED_NO_PRIVATE_EVIDENCE_RECOVERY_EXECUTED');
  for (const key of Object.keys(p.preparation.anchors)) {
    const altered = packet(); altered.preparation.anchors[key] = '0'.repeat(key === 'mainCommit' ? 40 : 64);
    const result = checkRecoveryPacket(altered); assert.equal(result.ok, false, key); closed(result);
  }
});

test('exactly 22 unsupported fields and the one prior supported presence cover all 23 required fields', () => {
  const p = packet().preparation;
  const required = Object.entries(RECEIPT_FIELDS).flatMap(([category, fields]) => fields.map(field => `${category}.${field}`));
  const supported = `${p.supportedField.category}.${p.supportedField.field}`;
  assert.equal(supported, 'concreteProviderRuntimeBinding.adapterSourceSha256');
  assert.deepEqual(p.coverage, { requiredFields: 23, supportedFields: 1, unsupportedFields: 22, acceptedCategories: 0 });
  assert.deepEqual(Object.keys(p.missingFields), required.filter(id => id !== supported));
  assert.equal(p.supportedField.recordedPresent, true);
  for (const field of ['privateValueRead', 'independentlyReverifiedNow', 'installedRuntimeProven', 'receiptAccepted']) assert.equal(p.supportedField[field], false);
  assert.equal(p.supportedField.privateValue, null);
  for (const [id, entry] of Object.entries(p.missingFields)) {
    assert.equal(id, `${entry.category}.${entry.field}`);
    assert.equal(entry.receiptFile, `${entry.category}.json`);
    assert.equal(entry.status, 'UNSUPPORTED_PROVENANCE_REQUIRED');
    assert.equal(entry.accepted, false);
    for (const key of ['sourceSystem', 'custodianRole', 'independentReviewerRole', 'futureApprovalPhrase']) assert.ok(entry[key].length > 10, `${id}.${key}`);
    assert.notEqual(entry.custodianRole, entry.independentReviewerRole);
    assert.equal(entry.requiredSourceArtifact.contractId, id);
    assert.ok(entry.requiredSourceArtifact.description.length > 70);
    for (const key of ['exactPrivateArtifactRef', 'sourceArtifactSha256', 'priorEvidenceApprovalRef']) assert.equal(entry.requiredSourceArtifact[key], null);
    assert.equal(entry.requiredSourceArtifact.existenceVerified, false);
    assert.equal(entry.custodian, null); assert.equal(entry.independentReviewer, null);
    assert.equal(entry.retention.restrictedStoreRef, null);
    assert.equal(entry.retention.retentionDuration, null);
    assert.equal(entry.retention.expiresAtUtc, null);
    assert.equal(entry.retention.deletionOwner, null);
    assert.match(entry.retention.boundary, /No public projection release without separate approval/);
    assert.equal(entry.futureApprovalPhrase, p.futureApprovalGate.exactPhraseTemplate);
    assert.equal(entry.futureApprovalRequiresThisFieldInCompleteSchedule, true);
  }
  assert.notEqual(p.missingFields['installedRouteBodyObserver.installedObserverReceiptRef'].requiredSourceArtifact.description,
    p.missingFields['lateGrantObserver.installedObserverReceiptRef'].requiredSourceArtifact.description);
});

test('every mapping, role, retention, phrase, stop and authority leaf is immutable', () => {
  const original = recoveryPreparation();
  function visit(value, trail = []) {
    for (const [key, item] of Object.entries(value)) {
      const next = [...trail, key];
      if (item && typeof item === 'object') visit(item, next);
      else {
        const changed = structuredClone(original);
        let target = changed;
        for (const parent of trail) target = target[parent];
        target[key] = item === true ? false : item === false ? true : 'PRIVATE_SENTINEL';
        const result = checkRecoveryPreparation(changed);
        assert.equal(result.ok, false, next.join('.')); closed(result);
        delete target[key];
        assert.equal(checkRecoveryPreparation(changed).ok, false, next.join('.'));
      }
    }
  }
  visit(original);
  for (const change of [
    p => { delete p.missingFields['immutableTargetRecheckReceipt.recheckedAtUtc']; },
    p => { p.missingFields.extra = {}; },
    p => { p.missingFields['lateGrantObserver.installedObserverReceiptRef'] = p.missingFields['installedRouteBodyObserver.installedObserverReceiptRef']; },
    p => { p.supportedField.privateValue = 'PRIVATE_SENTINEL'; },
  ]) {
    const altered = structuredClone(original); change(altered);
    const result = checkRecoveryPreparation(altered); assert.equal(result.ok, false); closed(result);
  }
});

test('approval template binds all anchors and requires unresolved private schedule without authority', () => {
  const p = packet().preparation;
  const gate = p.futureApprovalGate;
  assert.deepEqual([...gate.exactPhraseTemplate.matchAll(/<([^>]+)>/g)].map(m => m[1]), Object.keys(gate.phraseFields));
  assert.ok(Object.values(gate.phraseFields).every(v => v === null));
  for (const anchor of Object.values(p.anchors)) assert.ok(gate.exactPhraseTemplate.includes(anchor));
  assert.equal(gate.authorized, false);
  assert.equal(gate.scheduleRequirements.exactFieldCount, 22);
  assert.equal(gate.privateReaderImplemented, false);
  assert.equal(gate.approvalParserImplemented, false);
  assert.match(gate.exactPhraseTemplate, /existing previously approved secret-free source artifacts/);
  assert.match(gate.exactPhraseTemplate, /failing check or need for runtime credentials\/provider configuration/);
  assert.match(gate.exactPhraseTemplate, /receipt creation or supply, source-set generation, public projection release/);
  assert.match(gate.exactPhraseTemplate, /retry, second run, real-user commercialization/);
});

test('source drift, missing files and altered parent bytes fail closed', () => {
  for (const file of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkRecoveryPacket(packet(), { readSource: name => {
        if (name !== file) return read(name);
        if (missing) throw Error('PRIVATE_SENTINEL');
        return Buffer.concat([read(name), Buffer.from('\n')]);
      } });
      assert.equal(result.ok, false, file); closed(result);
    }
  }
});

test('hostile inputs reject without invoking getters, proxies, serializers or source reads', () => {
  let calls = 0;
  const hook = () => { calls++; throw Error('PRIVATE_SENTINEL'); };
  const accessor = {}; Object.defineProperty(accessor, 'preparation', { enumerable: true, get: hook });
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook });
  const cycle = {}; cycle.self = cycle;
  for (const input of [null, undefined, [], 'PRIVATE_SENTINEL', accessor, proxy, cycle, { toJSON: hook }]) {
    const result = checkRecoveryPacket(input, { readSource: hook });
    assert.equal(result.ok, false); closed(result);
  }
  assert.equal(calls, 0);
});

test('checker reads fixed public sources only and CLI refuses private paths and execution flags', () => {
  const result = checkRecoveryPacket(packet(), { readSource: file => {
    assert.match(file, /^(?:(docs|offline|scripts|server|convex|api)\/|(?:vercel|package|package-lock)\.json$)/);
    assert.ok(!path.isAbsolute(file)); assert.ok(!file.split('/').includes('..'));
    assert.doesNotMatch(file, /\.local|\.env/);
    return read(file);
  } });
  assert.equal(result.ok, true); closed(result);
  for (const args of [['PRIVATE_SENTINEL'], ['--execute'], ['--write', 'PRIVATE_SENTINEL']]) {
    const run = spawnSync(process.execPath, ['scripts/cad-auth-receipt-provenance-gap-recovery-checker.js', ...args], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1); assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL/);
    closed(JSON.parse(run.stdout));
  }
});

test('offline module has no IO capability and no runtime surface imports it', () => {
  assert.doesNotMatch(read('offline/cad-auth-receipt-provenance-gap-recovery/preparation.js').toString(),
    /process\.env|fetch\s*\(|child_process|https?\.request|node:fs|\.listen\s*\(/);
  function walk(dir) {
    if (!fs.existsSync(path.join(root, dir))) return [];
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants', 'src', 'plugins']) {
    for (const file of walk(dir)) assert.doesNotMatch(read(file).toString(), /cad-auth-receipt-provenance-gap-recovery/, file);
  }
});
