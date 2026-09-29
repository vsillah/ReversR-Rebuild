const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PACKET, PINS, OWN, expectedPacket, checkPacket } = require('./cad-auth-bounded-session-evidence-ref-prep-checker');
const read = file => fs.readFileSync(path.join(__dirname, '..', file));
test('checked-in preparation remains unresolved and never substitutes historical candidates', () => {
  const packet = JSON.parse(read(PACKET));
  assert.equal(checkPacket(packet).ok, true);
  assert.equal(packet.resolvedBinding, null);
  assert.equal(packet.nextApprovalPhrase, null);
  assert.equal(packet.deployment.matchesApprovedGate, false);
  assert.notEqual(packet.deployment.schemaRequiredId, packet.approvedGate.deploymentId);
  for (const candidate of [packet.candidates.boundedSessionRef, packet.candidates.rejectedPendingSession, ...packet.candidates.historicalEvidence]) {
    const source = JSON.parse(read(candidate.source));
    assert.equal(candidate.pointer.split('/').slice(1).reduce((v, key) => v[key], source), candidate.value);
    assert.equal(candidate.acceptedAsLiveBinding, false);
  }
});
test('authority changes, filled-in binding, approval phrase and deployment substitutions fail closed', () => {
  const packet = expectedPacket();
  for (const key of Object.keys(packet.controls)) {
    assert.equal(packet.controls[key], false);
    const changed = structuredClone(packet); changed.controls[key] = true;
    assert.equal(checkPacket(changed).ok, false, key);
  }
  for (const mutate of [p => { p.resolvedBinding = p.candidates; }, p => { p.nextApprovalPhrase = 'Approve'; },
    p => { p.deployment.freshnessVerified = true; }, p => { p.approvedGate.deploymentId = 'dpl_other'; },
    p => { p.requiredProvenance.approvedNonSecretSourceRecordSha256 = 'a'.repeat(64); },
    p => { p.candidates.historicalEvidence[0].acceptedAsLiveBinding = true; }]) {
    const changed = structuredClone(packet); mutate(changed); assert.equal(checkPacket(changed).ok, false);
  }
});
test('each source drift or missing source fails with sanitized fixed diagnostics', () => {
  const packet = expectedPacket();
  for (const file of [...Object.keys(PINS), ...OWN]) {
    const result = checkPacket(packet, requested => requested === file ? Buffer.from('private-marker') : read(requested));
    assert.equal(result.ok, false, file);
    assert.ok(!JSON.stringify(result).includes('private-marker'));
  }
  assert.equal(checkPacket(packet, () => { throw Error('private-marker'); }).ok, false);
  assert.equal(checkPacket(null).ok, false);
});
test('preparation reads only a fixed source allowlist', () => {
  const allowed = new Set([...Object.keys(PINS), ...OWN]);
  expectedPacket(file => { assert.ok(allowed.has(file)); return read(file); });
});
