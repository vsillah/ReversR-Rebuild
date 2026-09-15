const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');

const packet = JSON.parse(fs.readFileSync('docs/cad-dev-restricted-edt-evidence-prep.json', 'utf8'));
const acceptance = JSON.parse(fs.readFileSync('docs/cad-dev-auth-acceptance-manifest.json', 'utf8'));
const dashboard = JSON.parse(fs.readFileSync('docs/cad-convex-dev-dashboard-evidence-register.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-dev-restricted-edt-evidence-prep.md', 'utf8');

const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('packet binds the current source-only target and blocker manifest', () => {
  assert.equal(packet.mode, 'source-only-cad-development-restricted-edt-evidence-prep');
  assert.equal(packet.status, 'RESTRICTED_EDT_EVIDENCE_REQUIREMENTS_ASSEMBLED_NO_LIVE_MUTATION');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.production, false);
  assert.equal(packet.baseMainCommit, '9c77d01a83815e48c4dac68f36ec4b81ea3f1838');
  assert.equal(packet.target.repo, acceptance.target.repo);
  assert.equal(packet.target.projectSlug, acceptance.target.projectSlug);
  assert.equal(packet.target.deploymentName, acceptance.target.deploymentName);
  assert.equal(packet.sourceInputs.authAcceptanceManifest.sha256, digest(packet.sourceInputs.authAcceptanceManifest.path));
});

test('secret custody evidence remains value-free and non-mutating', () => {
  assert.deepEqual(packet.valueFreeSecretCustodyTemplate.rowNames, dashboard.environmentRows.rows.map(row => row.name));
  assert.equal(packet.valueFreeSecretCustodyTemplate.secretValuesRead, false);
  assert.equal(packet.valueFreeSecretCustodyTemplate.secretValuesStoredInGit, false);
  assert.equal(packet.valueFreeSecretCustodyTemplate.secretGenerationAuthorizedNow, false);
  assert.equal(packet.valueFreeSecretCustodyTemplate.acceptedNow, false);
  assert.ok(packet.valueFreeSecretCustodyTemplate.requiredReceipts.includes('backup-custodian-acceptance-ref'));
});

test('environment and deployment rollback templates stop before live actions', () => {
  assert.deepEqual(packet.envRollbackReceiptTemplate.destinationRows, packet.valueFreeSecretCustodyTemplate.rowNames);
  assert.equal(packet.envRollbackReceiptTemplate.envMutationAuthorizedNow, false);
  assert.equal(packet.envRollbackReceiptTemplate.acceptedNow, false);
  assert.equal(packet.deploymentRollbackTemplate.developmentDeploymentAuthorizedNow, false);
  assert.equal(packet.deploymentRollbackTemplate.acceptedNow, false);
  assert.equal(packet.deploymentRollbackTemplate.rollbackMustPreserveDisabledUploadGates, true);
});

test('cost cap and run window remain templates, not execution authority', () => {
  assert.equal(packet.costCapProofTemplate.recommendedAllInCeilingUsd, 5);
  assert.equal(packet.costCapProofTemplate.blanketPaidCommitmentHardStopUsdAtOrAbove, 10);
  assert.equal(packet.costCapProofTemplate.usageBillingMutationAuthorizedNow, false);
  assert.equal(packet.freshRunWindowTemplate.futureUtcWindowRequired, true);
  assert.equal(packet.freshRunWindowTemplate.singleRunOnly, true);
  assert.equal(packet.freshRunWindowTemplate.liveRunAuthorizedNow, false);
  assert.equal(packet.freshRunWindowTemplate.automaticRetryAuthorized, false);
  assert.equal(packet.freshRunWindowTemplate.secondRunAuthorized, false);
});

test('retention and lockout bindings match reviewed source artifacts', () => {
  assert.equal(packet.sourceInputs.boundedRetentionPolicy.sha256, digest(packet.sourceInputs.boundedRetentionPolicy.path));
  assert.equal(packet.sourceInputs.lockoutReadiness.sha256, digest(packet.sourceInputs.lockoutReadiness.path));
  assert.equal(packet.retentionLockoutDigestTemplate.boundedRetentionPolicyDigest, packet.sourceInputs.boundedRetentionPolicy.sha256);
  assert.equal(packet.retentionLockoutDigestTemplate.lockoutReadinessDigest, packet.sourceInputs.lockoutReadiness.sha256);
  assert.equal(packet.retentionLockoutDigestTemplate.noDeleteRollbackCompatibilityRequired, true);
  assert.equal(packet.retentionLockoutDigestTemplate.supportedDeletionStillRequiredBeforeDelete, true);
  assert.equal(packet.retentionLockoutDigestTemplate.acceptedNow, false);
});

test('autopilot authority preserves hard stops', () => {
  assert.equal(packet.autopilotDecision.sourcePrFlowMayContinue, true);
  assert.equal(packet.autopilotDecision.prepareRestrictedLocalEvidenceMayContinue, true);
  assert.equal(packet.autopilotDecision.developmentEnvMutationMustStop, true);
  assert.equal(packet.autopilotDecision.developmentDeploymentMustStop, true);
  assert.equal(packet.autopilotDecision.developmentLiveAuthRunMustStop, true);
  for (const [key, value] of Object.entries(packet.authorityPreserved)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test('markdown states the next slice without leaking or overclaiming readiness', () => {
  assert.match(markdown, /no live Auth/);
  assert.match(markdown, /What remains blocked/);
  assert.match(markdown, /No secret value read/);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY/);
  assert.doesNotMatch(markdown, /\/Users\//);
  assert.doesNotMatch(markdown, /production CAD ready/i);
  assert.doesNotMatch(markdown, /private CAD approved/i);
});
