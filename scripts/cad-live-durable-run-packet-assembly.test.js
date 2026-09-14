const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const packet = require('../offline/cad-convex/liveDurableRunPacketAssembly.json');
const { inspectLiveDurableRunPacketAssembly: inspect } = require('../offline/cad-convex/liveDurableRunPacketAssembly');

const read = name => fs.readFileSync(name);
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceBytes = () => Object.fromEntries(packet.sourceDerived.files.map(entry => [entry.path, read(entry.path)]));

test('source-derived packet binds PR 209 durable engine files without granting authority', () => {
  const result = inspect(packet, sourceBytes());
  assert.equal(result.structureValid, true);
  assert.equal(result.sourceDigestsMatch, true);
  assert.equal(result.sourceDerivedComplete, true);
  for (const key of ['privateEvidenceComplete', 'readyForLiveRunApproval', 'executable',
    'liveRunAuthorized', 'uploadsEnabled', 'conversionEnabled']) assert.equal(result[key], false);
  assert.equal(result.decision, 'LIVE_RUN_BLOCKED');
  assert.equal(packet.baseCommit, 'a07f97aaa34913ba5e622d05e92cd22722fe6d55');
  assert.equal(packet.sourceImplementationCommit, '034379cea73fc81d8502eb3e879ec27fd6d90ebf');
  assert.ok(Object.values(packet.gates).every(value => value === false));
});

test('all recorded source hashes match committed bytes and operation matrix digest', () => {
  for (const entry of packet.sourceDerived.files) assert.equal(entry.sha256, digest(read(entry.path)), entry.path);
  const approval = JSON.parse(read('offline/cad-convex/liveRunApprovalPacket.json'));
  assert.equal(packet.sourceDerived.operationCounterTemplateDigest,
    digest(Buffer.from(JSON.stringify({ limits: approval.limits, operationMatrix: approval.operationMatrix }))));
  assert.equal(packet.sourceResolvedApprovalFields['identity.adapterCommit'], packet.baseCommit);
  assert.equal(packet.sourceResolvedApprovalFields['identity.runnerCommit'], packet.baseCommit);
});

test('remaining evidence keeps the live run blocked at concrete private gates', () => {
  const result = inspect(packet, sourceBytes());
  for (const id of ['identity.privateResourceBindingRef', 'identity.independentVerifierRef',
    'custody.*', 'window.*', 'cost.*', 'evidence.*', 'commandCards.C0-C4'])
    assert.ok(result.missingEvidenceIds.includes(id));
  assert.ok(packet.remainingEvidence.some(item => item.reason.includes('enforced below USD 10')));
  assert.ok(packet.blockedScenarios.includes('backup-restore'));
  assert.ok(packet.blockedScenarios.includes('window-rollover'));
});

test('changed gates, source inventory, approvals and file bytes fail closed without echoing private values', () => {
  for (const mutate of [
    p => p.liveRunAuthorized = true,
    p => p.gates.liveRun = true,
    p => p.sourceDerived.files[0].sha256 = 'f'.repeat(64),
    p => p.remainingEvidence = [],
    p => p.nextHumanGates.publication = 'PRIVATE_SENTINEL',
  ]) {
    const candidate = structuredClone(packet);
    mutate(candidate);
    const result = inspect(candidate, sourceBytes());
    assert.equal(result.structureValid, false);
    assert.equal(result.readyForLiveRunApproval, false);
    assert.equal(result.liveRunAuthorized, false);
    assert.ok(!JSON.stringify(result).includes('PRIVATE_SENTINEL'));
  }

  const bytes = sourceBytes();
  bytes['offline/cad-convex/durableEngine.js'] = Buffer.from(String(bytes['offline/cad-convex/durableEngine.js']) + '\n');
  const drift = inspect(packet, bytes);
  assert.equal(drift.sourceDigestsMatch, false);
  assert.ok(drift.errors.includes('SOURCE_DIGEST_MISMATCH'));
});

test('documented approval wording remains publication-only and keeps upload activation excluded', () => {
  const doc = String(read('docs/cad-live-durable-run-packet-assembly.md'));
  assert.match(doc, /Approve pushing only commit \[full reviewed SHA\]/);
  assert.match(doc, /No merge, deployment, live tests/);
  assert.match(doc, /Keep uploads disabled/);
  assert.doesNotMatch(doc, /\/Users\//);
});
