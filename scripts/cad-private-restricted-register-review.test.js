const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const packet = require('../offline/cad-convex/privateRestrictedRegisterReview.json');
const priorPacket = require('../offline/cad-convex/restrictedEvidenceCommandCardBytes.json');
const fillPlan = require('../offline/cad-convex/privateEvidenceCommandCardFillPlan.json');
const commandCards = require('../offline/cad-convex/runnerCommandCards.json');
const {
  inspectPrivateRestrictedRegisterReview: inspect,
  createSourceSafeProjectionFromRestrictedRegister,
  createSyntheticRestrictedRegisterFixture,
} = require('../offline/cad-convex/privateRestrictedRegisterReview');
const { inspectRestrictedProjection } = require('../offline/cad-convex/restrictedEvidenceCommandCardBytes');

const digest = bytes => crypto.createHash('sha256').update(bytes, 'utf8').digest('hex');
const privateIds = () => Object.values(fillPlan.fieldFillPlan.privateGroups).flat();

test('review packet binds PR 212 restricted assembly and remains blocked', () => {
  const result = inspect(packet);
  assert.equal(result.structureValid, true);
  assert.equal(result.decision, 'LIVE_RUN_BLOCKED');
  for (const key of ['restrictedEvidenceAccepted', 'readyForLiveRunApproval',
    'executable', 'liveRunAuthorized', 'uploadsEnabled', 'conversionEnabled'])
    assert.equal(result[key], false);
  assert.equal(packet.baseCommit, '882ebfe1b1aeccc11825843981ff1e569c8350e5');
  assert.equal(packet.sourceBindings.adapterCommit, priorPacket.sourceBindings.adapterCommit);
  assert.equal(packet.sourceBindings.runnerCommit, priorPacket.sourceBindings.runnerCommit);
  assert.equal(packet.inventory.restrictedApprovalFields, privateIds().length);
  assert.equal(packet.inventory.commandCards, commandCards.cards.length);
});

test('private register fixture creates complete source-safe projection without authority', () => {
  const register = createSyntheticRestrictedRegisterFixture();
  const response = createSourceSafeProjectionFromRestrictedRegister(register);
  assert.equal(response.structureValid, true);
  assert.equal(response.projectionComplete, true);
  assert.equal(response.decision, 'LIVE_RUN_BLOCKED');
  const publicInspection = inspectRestrictedProjection(response.projection);
  assert.equal(publicInspection.structureValid, true);
  assert.equal(publicInspection.projectionComplete, true);
  for (const key of ['restrictedEvidenceComplete', 'commandCardBytesComplete',
    'readyForLiveRunApproval', 'executable', 'liveRunAuthorized', 'uploadsEnabled',
    'conversionEnabled']) assert.equal(publicInspection[key], false);
  assert.deepEqual(Object.keys(response.projection.restrictedEvidence).sort(), privateIds().sort());
  assert.deepEqual(Object.keys(response.projection.restrictedCommandByteCounts), ['C0', 'C1', 'C2', 'C3', 'C4']);
  assert.equal(response.projection.restrictedRegisterDigest, digest(JSON.stringify(register)));
  assert.equal(inspect(packet, response.projection).projectionComplete, true);
});

test('projection does not contain private register values or command bytes', () => {
  const register = createSyntheticRestrictedRegisterFixture();
  const hidden = register.restrictedEvidence['identity.runId'].valueBytes;
  const commandBytes = register.restrictedCommandBytes.C2;
  const response = createSourceSafeProjectionFromRestrictedRegister(register);
  const projectionBytes = JSON.stringify(response.projection);
  assert.ok(!projectionBytes.includes(hidden));
  assert.ok(!projectionBytes.includes(commandBytes));
  assert.ok(projectionBytes.includes(digest(hidden)));
  assert.ok(projectionBytes.includes(digest(commandBytes)));
});

test('changed gates, private boundaries and malformed projections fail closed', () => {
  for (const mutate of [
    p => p.gates.liveRun = true,
    p => p.liveRunAuthorized = true,
    p => p.privateRegisterContract.rawValuePublic = true,
    p => p.privateRegisterContract.providerReadAuthorized = true,
    p => p.inventory.restrictedApprovalFields -= 1,
  ]) {
    const candidate = structuredClone(packet);
    mutate(candidate);
    const result = inspect(candidate);
    assert.equal(result.structureValid, false);
    assert.equal(result.readyForLiveRunApproval, false);
  }
  const incomplete = createSourceSafeProjectionFromRestrictedRegister(createSyntheticRestrictedRegisterFixture()).projection;
  incomplete.restrictedEvidence['identity.runId'].valueDigest = null;
  const result = inspect(packet, incomplete);
  assert.equal(result.structureValid, false);
  assert.equal(result.projectionComplete, false);
});

test('malformed private register errors are sanitized', () => {
  for (const mutate of [
    r => r.mode = 'approved-live-run',
    r => delete r.restrictedEvidence['identity.runId'],
    r => r.commandCards.cards[0].fields.executableSha256 = 'PRIVATE_SENTINEL_VALUE',
    r => r.restrictedCommandBytes.C0 = 'x'.repeat(packet.limits.maxRestrictedCommandBytesPerCard + 1),
    r => r.sanitizedDestinationRef = 'PRIVATE_SENTINEL_VALUE',
  ]) {
    const register = createSyntheticRestrictedRegisterFixture();
    mutate(register);
    const result = createSourceSafeProjectionFromRestrictedRegister(register);
    assert.equal(result.structureValid, false);
    assert.equal(result.readyForLiveRunApproval, false);
    assert.ok(!JSON.stringify(result).includes('PRIVATE_SENTINEL_VALUE'));
  }
});

test('source files are offline-only and documentation carries exact future gates', () => {
  const source = fs.readFileSync('offline/cad-convex/privateRestrictedRegisterReview.js', 'utf8');
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./);
  const doc = fs.readFileSync('docs/cad-private-restricted-register-review.md', 'utf8');
  assert.match(doc, /source-safe private restricted-register review/);
  assert.match(doc, /Approve pushing only commit \[full reviewed SHA\]/);
  assert.match(doc, /authorizes no live run/);
  assert.doesNotMatch(doc, /\/Users\//);
});
