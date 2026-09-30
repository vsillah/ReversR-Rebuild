const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { reviewBindingInput } = require('../offline/cad-auth-durable-adapter-rejection-prep/candidate');
const schema = require('../offline/cad-auth-durable-adapter-rejection-prep/binding.schema.json');
const {
  PACKET,
  PINS,
  OWN,
  CURRENT,
  bindingFromSourceRecord,
  expectedPacket,
  checkPacket,
} = require('./cad-auth-session-evidence-schema-rebind-checker');

const read = file => fs.readFileSync(path.join(__dirname, '..', file));

test('checked-in packet binds source record into schema while keeping runtime closed', () => {
  const packet = JSON.parse(read(PACKET));
  assert.equal(checkPacket(packet).ok, true);
  assert.equal(packet.schemaRebind.appliedByThisGate, true);
  assert.equal(packet.schemaRebind.sessionId, 'rrb-ref:cad-upload-internal-mark-test-session-v1');
  assert.equal(packet.schemaRebind.boundedSessionRef, packet.schemaRebind.sessionId);
  assert.equal(packet.schemaRebind.durableEvidenceSha256,
    '8d371999f3efa3f090ae84fd6e88e8a912a6e69170c7e79672a96378bc15eaa7');
  assert.equal(packet.schemaRebind.productionDeploymentReference, CURRENT.productionDeploymentReference);
  assert.equal(packet.schemaRebind.sourceCommit, CURRENT.mergeCommit);
  assert.equal(packet.sourceRecordBinding.sourceRecordSha256,
    '81178504968fffa01d265b9b9541dda78935133f71f174bf0d667a79a5ca8ce5');
  assert.equal(packet.productionExecutionBinding, null);
  assert.equal(packet.controls.runtimeInstallationAuthorized, false);
  assert.equal(packet.controls.runtimeActivationAuthorized, false);
});

test('schema consts accept only the reviewed binding and reject stale substitutions', () => {
  const sourceRecordPacket = JSON.parse(read('docs/cad-auth-session-evidence-source-record.json'));
  const binding = bindingFromSourceRecord(sourceRecordPacket);
  assert.equal(reviewBindingInput(JSON.stringify(binding)).code,
    'BINDING_SHAPE_VALID_REQUIRES_SEPARATE_AUTHENTICITY_AND_CURRENT_TARGET_REVIEW');
  assert.equal(schema.properties.sessionId.const, binding.sessionId);
  assert.equal(schema.properties.durableEvidenceSha256.const, binding.durableEvidenceSha256);
  assert.equal(schema.properties.productionDeploymentReference.const, binding.productionDeploymentReference);
  assert.equal(schema.properties.provenance.properties.approvedNonSecretSourceRecordSha256.const,
    sourceRecordPacket.sourceRecordSha256);

  for (const mutate of [
    x => { x.sessionId += '-other'; },
    x => { x.durableEvidenceSha256 = 'b'.repeat(64); },
    x => { x.productionDeploymentReference = 'dpl_stale'; },
    x => { x.provenance.sourceCommit = 'c9bdc2929f3d6b67439db42fb1a7511f9b42f641'; },
    x => { x.provenance.approvedNonSecretSourceRecordSha256 = 'b'.repeat(64); },
  ]) {
    const changed = structuredClone(binding);
    mutate(changed);
    assert.equal(reviewBindingInput(JSON.stringify(changed)).code, 'BINDING_INPUT_REJECTED');
  }
});

test('authority widening and source drift fail closed without leaking source bytes', () => {
  const packet = expectedPacket();
  for (const key of Object.keys(packet.controls)) {
    assert.equal(packet.controls[key], false);
    const changed = structuredClone(packet);
    changed.controls[key] = true;
    assert.equal(checkPacket(changed).ok, false, key);
  }
  for (const mutate of [
    p => { p.productionExecutionBinding = {}; },
    p => { p.stillBlockedForLiveOpening = []; },
    p => { p.schemaRebind.productionDeploymentReference = 'dpl_stale'; },
    p => { p.sourceRecordBinding.acceptedForLiveDurableServiceQualification = true; },
  ]) {
    const changed = structuredClone(packet);
    mutate(changed);
    assert.equal(checkPacket(changed).ok, false);
  }
  for (const file of [...Object.keys(PINS), ...OWN]) {
    const result = checkPacket(packet, requested => (
      requested === file ? Buffer.from('private-marker') : read(requested)
    ));
    assert.equal(result.ok, false, file);
    assert.ok(!JSON.stringify(result).includes('private-marker'));
  }
});

test('checker reads only fixed public tracked source files', () => {
  const allowed = new Set([...Object.keys(PINS), ...OWN]);
  expectedPacket(file => {
    assert.ok(allowed.has(file), file);
    return read(file);
  });
});
