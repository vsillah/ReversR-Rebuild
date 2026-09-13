const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const template = require('../offline/cad-convex/liveRunApprovalPacket.json');
const envelopeTemplate = require('../offline/cad-convex/liveRunApprovalEnvelope.json');
const prior = require('../offline/cad-convex/boundedLiveRunDossier.json');
const { inspectLiveRunApprovalPacket: inspect } = require('../offline/cad-convex/liveRunApprovalPacket');
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
function seal(p, e) {
  const bytes = JSON.stringify(p);
  e.bindings = structuredClone(p.fields);
  e.dossierSha256 = hash(bytes);
  e.operationCounterSha256 = hash(JSON.stringify({ limits: p.limits, operationMatrix: p.operationMatrix }));
  return bytes;
}
function closed(bytes, e, checker = inspect) {
  const result = checker(bytes, e);
  for (const key of ['executable', 'liveQualified', 'publicationAuthorized', 'liveRunAuthorized', 'recoveryAuthorized']) assert.equal(result[key], false);
  assert.equal(result.decision, 'LIVE_RUN_BLOCKED');
  return result;
}
function filled() {
  const p = structuredClone(template), e = structuredClone(envelopeTemplate);
  const receipt = { ref: 'rrb-ref:synthetic-evidence', sha256: 'a'.repeat(64), reviewerRef: 'rrb-ref:synthetic-reviewer', reviewedUtc: '2026-09-13T10:00:00Z' };
  for (const k of Object.keys(p.fields)) {
    p.fields[k] = /Commit$/.test(k) ? 'b'.repeat(40) : /Digest$/.test(k) ? 'c'.repeat(64) : /Micros$/.test(k) ? 0 : /Utc$/.test(k) ? '2026-09-13T12:00:00Z' : 'rrb-ref:' + k.replaceAll('.', '-').replace(/[A-Z]/g, s => s.toLowerCase());
    p.evidence[k] = { ...receipt };
  }
  Object.assign(p.fields, { 'identity.runId': 'synthetic-fixture', 'identity.resourceAlias': 'rrb-synthetic-fixture', 'identity.namespace': 'rrb/qualification/synthetic-fixture/' + 'd'.repeat(32), 'identity.ledgerId': 'fixture-ledger', 'identity.windowId': 'fixture-window', 'identity.fence': 'fixture-fence', 'window.expiresUtc': '2026-09-13T12:30:00Z', 'cost.enforcedCapMicros': 9000000 });
  e.privateIdentityEvidence = { ...receipt };
  e.independentEnvelopeReview = { ...receipt };
  return { p, e };
}
test('template inventories every predecessor prerequisite without changing limits or pending proofs', () => {
  assert.equal(closed(JSON.stringify(template), envelopeTemplate).structureValid, true);
  assert.equal(closed(JSON.stringify(template), envelopeTemplate).fieldsComplete, false);
  for (const { id } of prior.missingPrerequisites) if (id !== 'evidence.externalApprovalEnvelopeRef') assert.ok(Object.hasOwn(template.fields, id));
  for (const key of ['gates', 'operationMatrix', 'postRunEvidence', 'postRunCloseout']) assert.deepEqual(template[key], prior[key]);
  assert.deepEqual(template.limits, prior.proposedLimits);
  assert.ok(Object.values(template.gates).every(v => v === false));
});
test('fully filled synthetic packet has complete syntax and matching digests but no authority or side effects', () => {
  const { p, e } = filled(), bytes = seal(p, e), before = JSON.stringify(e);
  const source = fs.readFileSync(require.resolve('../offline/cad-convex/liveRunApprovalPacket'), 'utf8');
  const imports = [];
  const context = { module: { exports: {} }, Buffer, require: name => {
    imports.push(name);
    if (name === 'node:crypto') return crypto;
    if (name === './liveRunApprovalPacket.json') return structuredClone(template);
    if (name === './liveRunApprovalEnvelope.json') return structuredClone(envelopeTemplate);
    throw new Error('Unexpected capability');
  } };
  vm.runInNewContext(source, context);
  const result = closed(bytes, e, context.module.exports.inspectLiveRunApprovalPacket);
  assert.equal(result.fieldsComplete, true);
  assert.equal(result.structureValid, true);
  assert.equal(JSON.stringify(e), before);
  assert.equal(imports.length, 3);
  assert.doesNotMatch(source, /process\.|fetch\s*\(|console\.|child_process|node:fs|https?:|eval\s*\(|new Function|Date\.now/);
});
test('all scalar fields and receipts reject malformed shapes without throwing or echoing supplied content', () => {
  for (const k of Object.keys(template.fields)) for (const bad of [{}, [], true, -1, 'PRIVATE-VALUE', 10000000]) {
    const { p, e } = filled(); p.fields[k] = bad;
    const r = closed(seal(p, e), e);
    assert.equal(r.structureValid, false, k);
    assert.ok(!JSON.stringify(r).includes('PRIVATE-VALUE'));
  }
  for (const bad of [null, [], {}, true, { ref: 'PRIVATE-VALUE' }]) {
    const { p, e } = filled(); p.evidence['identity.adapterCommit'] = bad;
    assert.equal(closed(seal(p, e), e).structureValid, false);
  }
});
test('missing values and every changed immutable leaf stay blocked', () => {
  const { p, e } = filled(); delete p.fields['identity.adapterCommit'];
  assert.equal(closed(seal(p, e), e).structureValid, false);
  function visit(v, path) {
    if (v && typeof v === 'object') return Object.keys(v).forEach(k => visit(v[k], [...path, k]));
    const { p, e } = filled(); let parent = p;
    for (const k of path.slice(0, -1)) parent = parent[k];
    parent[path.at(-1)] = v === null ? 'claimed-pass' : typeof v === 'boolean' ? !v : typeof v === 'number' ? v + 1 : v + '-changed';
    assert.equal(closed(seal(p, e), e).structureValid, false, path.join('.'));
  }
  for (const k of Object.keys(template).filter(k => !['fields', 'evidence'].includes(k))) visit(template[k], [k]);
  for (const payload of [null, {}, [], 'proceed', { approved: true }]) assert.equal(closed(JSON.stringify(payload), envelopeTemplate).structureValid, false);
  assert.equal(closed('invalid JSON', envelopeTemplate).structureValid, false);
});
test('digest drift, changed bindings and injected approvals are rejected', () => {
  for (const mutate of [e => e.liveRunAuthorized = true, e => e.publicationAuthorized = true, e => e.approval = 'Approve one run', e => e.bindings['identity.fence'] = 'other', e => e.dossierSha256 = 'f'.repeat(64), e => e.operationCounterSha256 = 'f'.repeat(64)]) {
    const { p, e } = filled(), bytes = seal(p, e); mutate(e);
    assert.equal(closed(bytes, e).structureValid, false);
  }
  const { p, e } = filled(), bytes = seal(p, e);
  assert.equal(closed(bytes + '\n', e).structureValid, false);
});
test('cross-field limits reject invalid time, cost, namespace and custody relationships', () => {
  for (const patch of [
    { 'window.expiresUtc': '2026-09-13T12:30:01Z' },
    { 'window.expiresUtc': '2026-09-13T12:00:00Z' },
    { 'window.startUtc': '2026-02-30T12:00:00Z' },
    { 'cost.computeMicros': 9000000, 'cost.storageMicros': 1 },
    { 'cost.enforcedCapMicros': 10000000 },
    { 'identity.runId': 'different' },
    { 'custody.primaryRef': 'rrb-ref:same', 'custody.backupRef': 'rrb-ref:same' },
  ]) {
    const { p, e } = filled(); Object.assign(p.fields, patch);
    assert.equal(closed(seal(p, e), e).structureValid, false);
  }
  const { p, e } = filled(); e.independentEnvelopeReview.reviewedUtc = '2026-09-13T13:00:00Z';
  assert.equal(closed(seal(p, e), e).structureValid, false);
});
