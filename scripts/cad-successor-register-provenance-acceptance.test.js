const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const packet = require('../docs/cad-successor-register-provenance-acceptance.json');
const projection = require('../docs/cad-successor-register-provenance-projection.json');
const {
  inspectSuccessorRegisterProvenanceAcceptance: inspect,
  inspectProjection,
} = require('../offline/cad-convex/successorRegisterProvenanceAcceptance');

const digest = bytes => crypto.createHash('sha256').update(bytes, 'utf8').digest('hex');

test('successor provenance packet is ready for restricted evidence acceptance only', () => {
  const projectionBytes = fs.readFileSync('docs/cad-successor-register-provenance-projection.json', 'utf8');
  const result = inspect(packet, projection, digest(projectionBytes));
  assert.equal(result.structureValid, true);
  assert.equal(result.decision, 'LIVE_RUN_BLOCKED');
  assert.equal(result.readyForRestrictedEvidenceAcceptance, true);
  assert.equal(result.successorRegisterPrepared, true);
  assert.equal(result.restrictedEvidenceAccepted, false);
  assert.equal(result.readyForLiveRunApproval, false);
  for (const key of ['executable', 'liveRunAuthorized', 'uploadsEnabled', 'conversionEnabled'])
    assert.equal(result[key], false);
  assert.equal(packet.expensesUsd, 0);
});

test('public projection is complete and contains no restricted bytes', () => {
  const projectionBytes = fs.readFileSync('docs/cad-successor-register-provenance-projection.json', 'utf8');
  assert.equal(digest(projectionBytes), packet.localRestrictedArtifacts.successorProjectionSha256);
  assert.equal(inspectProjection(projection, digest(projectionBytes)).valid, true);
  assert.equal(Object.keys(projection.restrictedEvidence).length, 45);
  assert.equal(Object.keys(projection.restrictedCommandByteCounts).length, 5);
  assert.equal(projection.restrictedRegisterDigest, packet.localRestrictedArtifacts.successorRegisterDigest);
  assert.equal(projection.restrictedCommandSetDigest, packet.localRestrictedArtifacts.restrictedCommandSetDigest);
  assert.equal(projection.commandCardProjectionDigest, packet.localRestrictedArtifacts.commandCardProjectionDigest);
  assert.doesNotMatch(projectionBytes, /valueBytes|evidenceBytes|restrictedCommandBytes|\/Users\//);
});

test('original missing register and older accepted register are not substituted', () => {
  assert.equal(packet.provenanceRecovery.authenticOriginalRolloverRegisterFound, false);
  assert.equal(packet.provenanceRecovery.authenticOriginalStillPreferred, true);
  assert.equal(packet.provenanceRecovery.olderAcceptedRegisterFound, true);
  assert.equal(packet.provenanceRecovery.olderAcceptedRegisterSubstituted, false);
  assert.notEqual(packet.provenanceRecovery.olderAcceptedRegisterCanonicalDigest,
    packet.predecessor.priorFreshRolloverRegisterDigest);
  assert.equal(packet.provenanceRecovery.successorPreparedFromRecoveredOriginal, false);
  assert.equal(packet.provenanceRecovery.successorRequiresIndependentReview, true);
});

test('successor window and retained state stay bounded and non-authorizing', () => {
  assert.equal(packet.successorWindow.startUtc, '2026-09-15T17:00:00Z');
  assert.equal(packet.successorWindow.expiresUtc, '2026-09-15T17:05:00Z');
  assert.equal(Date.parse(packet.successorWindow.expiresUtc) - Date.parse(packet.successorWindow.startUtc), 300000);
  assert.equal(packet.successorWindow.approved, false);
  assert.equal(packet.successorWindow.automaticRefresh, false);
  assert.equal(packet.retainedState.expiredRunRetryAuthorized, false);
  assert.equal(packet.retainedState.deleteAuthorized, false);
  assert.equal(packet.retainedState.retainNoDeleteCustody, true);
});

test('tampered gates, substitution and projection digest fail closed', () => {
  for (const mutate of [
    p => p.gates.liveRunAuthorized = true,
    p => p.gates.uploadsEnabled = true,
    p => p.provenanceRecovery.olderAcceptedRegisterSubstituted = true,
    p => p.provenanceRecovery.olderAcceptedRegisterCanonicalDigest = p.predecessor.priorFreshRolloverRegisterDigest,
    p => p.evidenceReadiness.restrictedEvidenceAcceptanceGranted = true,
    p => p.retainedState.deleteAuthorized = true,
    p => p.nextHumanGates.liveRunApproval = 'READY',
  ]) {
    const candidate = structuredClone(packet);
    mutate(candidate);
    const result = inspect(candidate, projection);
    assert.equal(result.structureValid, false);
    assert.equal(result.readyForLiveRunApproval, false);
    assert.equal(result.liveRunAuthorized, false);
  }
  assert.equal(inspect(packet, projection, 'a'.repeat(64)).structureValid, false);
});

test('documentation carries acceptance phrase but no live-run approval', () => {
  const doc = fs.readFileSync('docs/cad-successor-register-provenance-acceptance.md', 'utf8');
  assert.match(doc, /CAD successor-register provenance acceptance prep/);
  assert.match(doc, /authorizes no live run/);
  assert.match(doc, /BLOCKED_UNTIL_RESTRICTED_EVIDENCE_ACCEPTED_AND_EXECUTOR_REBIND_REVIEWED/);
  assert.match(doc, /Approve pushing only commit \[full reviewed SHA\]/);
  assert.doesNotMatch(doc, /\/Users\//);
  assert.doesNotMatch(JSON.stringify(packet), /\/Users\//);
});
