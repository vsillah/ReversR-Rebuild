const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const packet = require('../docs/cad-fresh-replacement-restricted-evidence.json');
const {
  inspectFreshReplacementRestrictedEvidence: inspect,
} = require('../offline/cad-convex/freshReplacementRestrictedEvidence');

const digest = bytes => crypto.createHash('sha256').update(bytes, 'utf8').digest('hex');

test('fresh replacement packet is blocked and grants no runtime authority', () => {
  const result = inspect(packet);
  assert.equal(result.structureValid, true);
  assert.equal(result.decision, 'LIVE_RUN_BLOCKED');
  assert.equal(result.successorIntakePrepared, true);
  assert.equal(result.successorExecutable, false);
  for (const key of ['restrictedEvidenceAccepted', 'readyForExecutorRebind',
    'readyForLiveRunApproval', 'executable', 'liveRunAuthorized', 'uploadsEnabled',
    'conversionEnabled']) assert.equal(result[key], false);
  assert.equal(packet.status, 'BLOCKED_MISSING_ORIGINAL_ROLLOVER_REGISTER');
  assert.equal(packet.expensesUsd, 0);
});

test('predecessor projection digest matches the public PR 216 artifact', () => {
  const projectionBytes = fs.readFileSync('docs/cad-fresh-bounded-dev-run-command-card-projection.json', 'utf8');
  assert.equal(digest(projectionBytes), packet.predecessor.projectionSha256);
  assert.equal(packet.provenance.expectedOriginalRegisterDigest, packet.predecessor.privateRestrictedRegisterDigest);
  assert.notEqual(packet.provenance.olderAcceptedRegisterCanonicalDigest, packet.predecessor.privateRestrictedRegisterDigest);
  assert.equal(packet.provenance.olderAcceptedRegisterSubstituted, false);
});

test('replacement window is explicit and does not bind or refresh itself', () => {
  const window = packet.proposedReplacementWindow;
  assert.equal(window.startUtc, '2026-09-15T17:00:00Z');
  assert.equal(window.expiresUtc, '2026-09-15T17:05:00Z');
  assert.equal(Date.parse(window.expiresUtc) - Date.parse(window.startUtc), 300000);
  assert.equal(window.automaticRefresh, false);
  assert.equal(window.approved, false);
  assert.equal(window.boundToRestrictedRegister, false);
});

test('all replacement and acceptance digests stay null until authentic review exists', () => {
  assert.ok(Object.values(packet.replacement).every(value => value === null));
  assert.equal(packet.evidenceStatus.acceptedFields, 0);
  assert.equal(packet.evidenceStatus.commandCardsAvailable, 0);
  assert.equal(packet.independentReviewAcceptanceMaterials.acceptancePhraseAvailable, false);
  assert.equal(packet.independentReviewAcceptanceMaterials.requiredBeforeAcceptance.length, 6);
  assert.equal(packet.independentReviewAcceptanceMaterials.rejectionRules.length, 4);
  for (const key of ['resourceBindingVerified', 'costEnforcementVerified',
    'retainedStateCostCoverageVerified', 'custodyAccepted', 'trustedRuntimeClockVerified',
    'independentReviewAccepted', 'disabledRoutePlanReady', 'reconciliationAcceptanceReady',
    'rollbackAcceptanceReady', 'retainedStateCustodyAccepted'])
    assert.equal(packet.evidenceStatus[key], false);
});

test('tampering with blocked boundaries fails closed', () => {
  for (const mutate of [
    p => p.gates.liveRunAuthorized = true,
    p => p.provenance.originalRolloverRegisterFound = true,
    p => p.provenance.olderAcceptedRegisterCanonicalDigest = p.predecessor.privateRestrictedRegisterDigest,
    p => p.localRestrictedArtifacts.successorIntakeIsExecutableRestrictedRegister = true,
    p => p.replacement.projectionSha256 = 'a'.repeat(64),
    p => p.proposedReplacementWindow.automaticRefresh = true,
    p => p.evidenceStatus.acceptedFields = 1,
    p => p.retainedState.deleteAuthorized = true,
  ]) {
    const candidate = structuredClone(packet);
    mutate(candidate);
    const result = inspect(candidate);
    assert.equal(result.structureValid, false);
    assert.equal(result.readyForLiveRunApproval, false);
    assert.equal(result.liveRunAuthorized, false);
  }
});

test('documentation stays source-safe and names only blocked next gates', () => {
  const doc = fs.readFileSync('docs/cad-fresh-replacement-restricted-evidence.md', 'utf8');
  assert.match(doc, /CAD fresh replacement restricted evidence assembly/);
  assert.match(doc, /not an executable restricted register/);
  assert.match(doc, /The next live-run approval phrase cannot be safely produced/);
  assert.match(doc, /Approve pushing only commit \[full reviewed SHA\]/);
  assert.doesNotMatch(doc, /\/Users\//);
  assert.doesNotMatch(JSON.stringify(packet), /\/Users\//);
});
