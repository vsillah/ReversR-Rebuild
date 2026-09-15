const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const bridge = JSON.parse(fs.readFileSync('docs/cad-dev-retention-lockout-autopilot.json', 'utf8'));
const autopilot = JSON.parse(fs.readFileSync('docs/cad-dev-readiness-autopilot.json', 'utf8'));
const policy = JSON.parse(fs.readFileSync('offline/cad-convex/boundedRetentionPolicy.json', 'utf8'));
const lockout = JSON.parse(fs.readFileSync('offline/cad-convex/lockoutReadiness.json', 'utf8'));
const removal = JSON.parse(fs.readFileSync('offline/cad-convex/removalRetentionReview.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-dev-retention-lockout-autopilot.md', 'utf8');
const developmentAuth = fs.readFileSync('convex/developmentAuth.ts', 'utf8');
const auth = fs.readFileSync('convex/auth.ts', 'utf8');

test('bridge binds current source-only autopilot target', () => {
  assert.equal(bridge.mode, 'source-only-cad-retention-lockout-autopilot-bridge');
  assert.equal(bridge.status, 'SOURCE_LOCAL_RETENTION_LOCKOUT_BRIDGE_BLOCKS_LIVE_PROVISIONING');
  assert.equal(bridge.sourceOnly, true);
  assert.equal(bridge.production, false);
  assert.equal(bridge.baseMainCommit, '1113cb5d24b2b2f816886508719b8c01b161d488');
  assert.equal(bridge.inputs.autopilotGuard.mergeCommit, bridge.baseMainCommit);
  assert.equal(bridge.target.repo, autopilot.target.repo);
  assert.equal(bridge.target.projectSlug, autopilot.target.projectSlug);
  assert.equal(bridge.target.deploymentName, autopilot.target.deploymentName);
});

test('retention policy candidate mirrors disabled bounded retention source', () => {
  assert.equal(policy.approved, false);
  assert.equal(policy.liveReady, false);
  assert.equal(policy.retentionOverride, false);
  assert.equal(bridge.retentionPolicyAcceptanceCandidate.acceptedNow, false);
  assert.equal(bridge.retentionPolicyAcceptanceCandidate.cohortSize, policy.cohortSize);
  assert.equal(bridge.retentionPolicyAcceptanceCandidate.activeGraphCapPerIdentity, policy.activeGraphCapPerIdentity);
  assert.equal(bridge.retentionPolicyAcceptanceCandidate.maxRetentionHours, policy.maxRetentionHours);
  assert.deepEqual(bridge.retentionPolicyAcceptanceCandidate.retainedCapsPerIdentity, policy.retainedCapsPerIdentity);
  assert.equal(bridge.retentionPolicyAcceptanceCandidate.terminalRetainedRowsMinimum, 4);
  assert.equal(bridge.retentionPolicyAcceptanceCandidate.terminalRetainedRowsMaximum, policy.retainedCapTotal);
  assert.equal(bridge.retentionPolicyAcceptanceCandidate.expiryAction, policy.expiryAction);
  assert.equal(bridge.retentionPolicyAcceptanceCandidate.deleteAuthorizedNow, false);
  assert.ok(Object.values(policy.gates).every(value => value === false));
});

test('lockout candidate mirrors disabled lockout readiness source', () => {
  assert.equal(lockout.enabled, false);
  assert.equal(lockout.liveReady, false);
  assert.equal(lockout.cleanupVerified, false);
  assert.equal(bridge.lockoutFenceAcceptanceCandidate.acceptedNow, false);
  assert.deepEqual(bridge.lockoutFenceAcceptanceCandidate.requiredCases, lockout.cases);
  assert.deepEqual(bridge.lockoutFenceAcceptanceCandidate.requiredDenialPostconditions, lockout.requiredDenialPostconditions);
  for (const key of [
    'mustDenyBeforeRevocation',
    'mustCoverDirectAuthEndpoints',
    'mustCoverProtectedReadersAndStaleJwt',
    'mustSerializeAdmissionEpoch',
    'mustPreserveSessionSelectorsAfterRevocation',
    'mustDenyOnMissingOrExpiredCustody',
    'mustSurviveRollbackWithoutReopeningAdmission',
  ]) {
    assert.equal(bridge.lockoutFenceAcceptanceCandidate[key], true, `${key} must remain required`);
  }
  assert.ok(Object.values(lockout.gates).every(value => value === false));
});

test('private register template is projection-only and leak resistant', () => {
  assert.equal(bridge.privateRegisterReceiptTemplate.receiptModeRequired, 'ignored-local-files-mode-600');
  for (const required of ['exactUserIdRefs', 'exactAuthAccountIdRefs', 'pendingBeforeDispatchReceipt', 'rollbackReceipt']) {
    assert.ok(bridge.privateRegisterReceiptTemplate.privateFieldsRequired.includes(required), required);
  }
  for (const forbidden of ['email', 'password', 'token', 'credentialHash', 'privateFilePath']) {
    assert.ok(bridge.privateRegisterReceiptTemplate.forbiddenPublicFields.includes(forbidden), forbidden);
  }
  assert.ok(bridge.privateRegisterReceiptTemplate.publicProjectionAllowedFields.every(field => /Digest|Ref|Sha/.test(field)));
});

test('cost, rollback and source gates block live execution now', () => {
  assert.equal(removal.decision, 'KEEP_PROVISIONING_BLOCKED');
  assert.equal(bridge.costAndRollbackEvidenceGates.recommendedCostCeilingUsd, 5);
  assert.equal(bridge.costAndRollbackEvidenceGates.blanketPaidCommitmentHardStopUsdAtOrAbove, 10);
  for (const key of [
    'allInCostCapVerified',
    'currentUsageLimitStateVerified',
    'envRowRollbackReceiptVerified',
    'deploymentRollbackReceiptVerified',
    'retainedStateRollbackPreservesLockout',
    'rollbackCanDeleteRows',
  ]) {
    assert.equal(bridge.costAndRollbackEvidenceGates[key], false, `${key} must remain false`);
  }
  assert.match(developmentAuth, /developmentAuthReviewed: boolean = false/);
  assert.match(auth, /developmentPassword\(\[\]\)/);
  assert.deepEqual(bridge.blockingFindings.installedDevelopmentCohort, []);
  for (const value of Object.values(bridge.blockingFindings)) {
    if (Array.isArray(value)) assert.equal(value.length, 0);
    else assert.equal(value, false);
  }
});

test('next source slice remains non-mutating and every sensitive authority stays false', () => {
  assert.equal(bridge.nextAutomatedSourceSlice.branch, 'codex/cad-dev-auth-source-enable-autopilot');
  assert.equal(bridge.nextAutomatedSourceSlice.liveMutationAuthorized, false);
  assert.equal(bridge.nextAutomatedSourceSlice.developmentDeploymentAuthorized, false);
  assert.deepEqual(bridge.nextAutomatedSourceSlice.preconditions, [
    'retentionPolicyAccepted',
    'lockoutFenceAccepted',
    'privateRegisterReceiptTemplateAccepted',
    'costAndRollbackEvidenceAccepted',
  ]);
  for (const [key, value] of Object.entries(bridge.authorityPreserved)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test('markdown states the active stop without private or production overclaim', () => {
  assert.match(markdown, /No live provisioning is authorized/);
  assert.match(markdown, /No development deployment is authorized/);
  assert.match(markdown, /No CAD upload or conversion path is authorized/);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY/);
  assert.doesNotMatch(markdown, /production CAD ready/i);
  assert.doesNotMatch(markdown, /private CAD approved/i);
  assert.doesNotMatch(markdown, /development deployment is complete/i);
});
