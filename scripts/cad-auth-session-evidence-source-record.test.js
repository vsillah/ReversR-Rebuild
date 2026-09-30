const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  PACKET,
  PINS,
  OWN,
  CURRENT,
  expectedPacket,
  checkPacket,
} = require('./cad-auth-session-evidence-source-record-checker');

const read = file => fs.readFileSync(path.join(__dirname, '..', file));

test('checked-in packet prepares a source record but keeps runtime closed', () => {
  const packet = JSON.parse(read(PACKET));
  assert.equal(checkPacket(packet).ok, true);
  assert.equal(packet.sourceRecord.exactExistingSessionId,
    'rrb-ref:cad-upload-internal-mark-test-session-v1');
  assert.equal(packet.sourceRecord.exactExistingSessionId, packet.sourceRecord.boundedSessionRef);
  assert.match(packet.sourceRecord.durableEvidenceSha256, /^[a-f0-9]{64}$/);
  assert.equal(packet.sourceRecord.productionDeploymentReference,
    CURRENT.vercelDeploymentReference);
  assert.equal(packet.sourceRecord.authority.acceptedForSourceOnlySchemaRebind, true);
  assert.equal(packet.sourceRecord.authority.acceptedForLiveDurableServiceQualification, false);
  assert.equal(packet.sourceRecord.authority.productionExecutionBinding, null);
  assert.equal(packet.schemaRebind.appliedByThisGate, false);
  assert.equal(packet.controls.runtimeInstallationAuthorized, false);
});

test('authority widening, schema-rebind substitution and source-record mutation fail closed', () => {
  const packet = expectedPacket();
  for (const key of Object.keys(packet.controls)) {
    assert.equal(packet.controls[key], false);
    const changed = structuredClone(packet);
    changed.controls[key] = true;
    assert.equal(checkPacket(changed).ok, false, key);
  }
  for (const mutate of [
    p => { p.sourceRecord.exactExistingSessionId += '-other'; },
    p => { p.sourceRecord.durableEvidenceSha256 = 'b'.repeat(64); },
    p => { p.sourceRecord.authority.acceptedForLiveDurableServiceQualification = true; },
    p => { p.sourceRecord.authority.productionExecutionBinding = {}; },
    p => { p.schemaRebind.appliedByThisGate = true; },
    p => { p.schemaRebind.proposedDeploymentReference = 'dpl_stale'; },
    p => { p.stillBlockedForLiveOpening = []; },
  ]) {
    const changed = structuredClone(packet);
    mutate(changed);
    assert.equal(checkPacket(changed).ok, false);
  }
});

test('source drift and read errors fail with sanitized diagnostics', () => {
  const packet = expectedPacket();
  for (const file of [...Object.keys(PINS), ...OWN]) {
    const result = checkPacket(packet, requested => (
      requested === file ? Buffer.from('private-marker') : read(requested)
    ));
    assert.equal(result.ok, false, file);
    assert.ok(!JSON.stringify(result).includes('private-marker'));
  }
  assert.equal(checkPacket(packet, () => { throw Error('private-marker'); }).ok, false);
  assert.equal(checkPacket(null).ok, false);
});

test('preparation reads only fixed public source files', () => {
  const allowed = new Set([...Object.keys(PINS), ...OWN]);
  expectedPacket(file => {
    assert.ok(allowed.has(file), file);
    return read(file);
  });
});
