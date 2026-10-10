const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildProof,
  classifyDeploymentIdentityObservation,
  collectSourceInventory,
  validateProof,
  verify,
} = require('./cad-phase5-package8-metadata-split-proof');

const root = path.resolve(__dirname, '..');
const clone = value => JSON.parse(JSON.stringify(value));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'offline/cad-convex/manifest.json'), 'utf8'));
const inventory = collectSourceInventory(root);

test('split proof verifies deterministic source names while keeping deployment equivalence unproven', () => {
  assert.deepEqual(verify(root), []);
  assert.equal(inventory.functionCount, 50);
  assert.equal(inventory.visibilityCounts.public, 9);
  assert.equal(inventory.visibilityCounts.internal, 41);
});

test('source drift and duplicate function names fail closed', () => {
  const drifted = buildProof(root);
  drifted.sourceInventory.generatedApiSha256 = '0'.repeat(64);
  assert.ok(validateProof(drifted, inventory, manifest).includes('source inventory drift'));

  const duplicate = buildProof(root);
  duplicate.sourceInventory.functions[1] = clone(duplicate.sourceInventory.functions[0]);
  duplicate.sourceInventory.functionCount = duplicate.sourceInventory.functions.length;
  assert.ok(validateProof(duplicate, duplicate.sourceInventory, manifest).includes('function names unique'));
});

test('contract-manifest mismatch is rejected independently of the packet', () => {
  const changed = clone(manifest);
  changed.files[inventory.generatedApiPath] = 'f'.repeat(64);
  assert.ok(validateProof(buildProof(root), inventory, changed)
    .includes(`contract manifest mismatch: ${inventory.generatedApiPath}`));
});

test('deployment identity rejects stale and mismatched synthetic receipts', () => {
  const proof = buildProof(root);
  const receipt = {
    ...proof.deploymentIdentity.expectedTarget,
    sourceFunctionsSha256: proof.sourceInventory.functionsSha256,
    sourceGeneratedApiSha256: proof.sourceInventory.generatedApiSha256,
    observedAtUtc: '2026-10-10T16:00:00Z',
  };
  assert.equal(classifyDeploymentIdentityObservation(proof, receipt, '2026-10-10T16:16:00Z'), 'IDENTITY_OBSERVATION_STALE');
  assert.equal(classifyDeploymentIdentityObservation(proof, { ...receipt, deploymentName: 'wrong-target' },
    '2026-10-10T16:05:00Z'), 'IDENTITY_TARGET_MISMATCH');
  assert.equal(classifyDeploymentIdentityObservation(proof, { ...receipt, sourceFunctionsSha256: '0'.repeat(64) },
    '2026-10-10T16:05:00Z'), 'IDENTITY_SOURCE_BINDING_MISMATCH');
});

test('a fresh matching identity receipt still cannot prove deployed-function equivalence', () => {
  const proof = buildProof(root);
  const receipt = {
    ...proof.deploymentIdentity.expectedTarget,
    sourceFunctionsSha256: proof.sourceInventory.functionsSha256,
    sourceGeneratedApiSha256: proof.sourceInventory.generatedApiSha256,
    observedAtUtc: '2026-10-10T16:00:00Z',
  };
  assert.equal(classifyDeploymentIdentityObservation(proof, receipt, '2026-10-10T16:05:00Z'),
    'IDENTITY_ONLY_EQUIVALENCE_UNPROVEN');
  assert.equal(proof.splitProof.sourceToDeploymentEquivalence, 'NOT_CLAIMED');
  assert.equal(proof.splitProof.package8ActivationReady, false);
});

test('unsupported equivalence or runtime authority claims fail the packet', () => {
  const changed = buildProof(root);
  changed.splitProof.sourceToDeploymentEquivalence = 'VERIFIED';
  changed.authority.deploymentAuthorized = true;
  const errors = validateProof(changed, inventory, manifest);
  assert.ok(errors.includes('equivalence not claimed'));
  assert.ok(errors.includes('all runtime authority closed'));
});
