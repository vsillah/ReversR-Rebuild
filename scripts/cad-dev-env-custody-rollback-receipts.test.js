const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');

const packet = JSON.parse(fs.readFileSync('docs/cad-dev-env-custody-rollback-receipts.json', 'utf8'));
const binding = JSON.parse(fs.readFileSync('docs/cad-dev-exact-deploy-rollback-window-binding.json', 'utf8'));
const dashboard = JSON.parse(fs.readFileSync('docs/cad-convex-dev-dashboard-evidence-register.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-dev-env-custody-rollback-receipts.md', 'utf8');
const developmentAuth = fs.readFileSync('convex/developmentAuth.ts', 'utf8');

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const fileDigest = file => sha256(fs.readFileSync(file));

test('packet records source-local value-free env custody projection', () => {
  assert.equal(packet.mode, 'source-local-cad-development-env-custody-rollback-receipts');
  assert.equal(packet.status, 'VALUE_FREE_ENV_CUSTODY_ROLLBACK_RECEIPTS_PROJECTED_NO_LIVE_MUTATION');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.production, false);
  assert.equal(packet.baseMainCommit, 'a5b98e4e72563b48061efeece679e816e8e068d9');
  assert.equal(packet.target.repo, binding.target.repo);
  assert.equal(packet.target.projectSlug, binding.target.projectSlug);
  assert.equal(packet.target.deploymentName, binding.target.deploymentName);
});

test('source input digests match tracked source files', () => {
  for (const input of Object.values(packet.sourceInputs)) {
    assert.equal(input.sha256, fileDigest(input.path), input.path);
  }
});

test('ignored receipt is referenced only through safe metadata', () => {
  assert.match(packet.ignoredLocalReceipt.pathRef, /^\.local\//);
  assert.equal(packet.ignoredLocalReceipt.sha256, '9ae02fe3dcbdbf7c45cdf8efb21fa1c1cf5706b067db54eef02a20e4b651de6a');
  assert.equal(packet.ignoredLocalReceipt.directoryMode, '700');
  assert.equal(packet.ignoredLocalReceipt.fileMode, '600');
  assert.equal(packet.ignoredLocalReceipt.gitIgnored, true);
  assert.equal(packet.ignoredLocalReceipt.containsSecretValues, false);
  assert.equal(packet.ignoredLocalReceipt.containsValueHashes, false);
  assert.equal(packet.ignoredLocalReceipt.containsPrivateCad, false);
  assert.equal(packet.ignoredLocalReceipt.containsRealUsers, false);
  assert.equal(packet.ignoredLocalReceipt.containsPrivatePaths, false);
});

test('row rollback projection covers only expected row names without values', () => {
  assert.deepEqual(packet.rowRollbackProjection.map(row => row.name), dashboard.environmentRows.rows.map(row => row.name));
  for (const row of packet.rowRollbackProjection) {
    assert.match(row.priorVersionOrAbsenceRef, /^rrb-ref:/);
    assert.match(row.rollbackActionRef, /^rrb-ref:/);
    assert.equal(row.valueRead, false);
    assert.equal(row.valueHashRecorded, false);
    assert.equal(row.mutationAuthorizedNow, false);
  }
  assert.equal(packet.envFileCustodyProjection.valueRead, false);
  assert.equal(packet.envFileCustodyProjection.valueHashRecorded, false);
  assert.equal(packet.envFileCustodyProjection.secretGeneratedByThisPacket, false);
  assert.equal(packet.envFileCustodyProjection.mutationAuthorizedNow, false);
});

test('custody and command bindings carry forward from PR 236 without execution authority', () => {
  assert.equal(packet.custodyProjection.backupCustodian, 'Amina');
  assert.equal(packet.custodyProjection.markRole, 'tester-reviewer');
  assert.equal(packet.custodyProjection.markIsCustodian, false);
  assert.equal(packet.boundCommands.deployCommandDigest, binding.exactCommandBinding.deployCommand.sha256);
  assert.equal(packet.boundCommands.disabledRollbackCommandDigest, binding.exactCommandBinding.disabledRollbackCommand.sha256);
  assert.equal(packet.boundCommands.candidateSourceSha, binding.runtimeSourceState.candidateSourceSha);
  assert.equal(packet.boundCommands.disabledRollbackSourceSha, binding.runtimeSourceState.disabledRollbackSourceSha);
});

test('acceptance effect closes only value-free planning receipts', () => {
  assert.equal(packet.acceptanceEffect.valueFreeEnvCustodyReceiptAcceptedForPlanning, true);
  assert.equal(packet.acceptanceEffect.rowSpecificRollbackReceiptShapeAcceptedForPlanning, true);
  assert.equal(packet.acceptanceEffect.exactDeployRollbackCommandDigestsRemainBound, true);
  assert.equal(packet.acceptanceEffect.freshRunWindowAccepted, false);
  assert.equal(packet.acceptanceEffect.developmentAuthReviewedSourceGateStillFalse, true);
  assert.equal(packet.acceptanceEffect.developmentDeploymentAuthorizedNow, false);
  assert.equal(packet.acceptanceEffect.developmentLiveAuthRunAuthorizedNow, false);
  assert.match(developmentAuth, /developmentAuthReviewed: boolean = false/);
});

test('remaining gates route to source gate work and keep live mutation stopped', () => {
  assert.equal(packet.remainingGates[0].id, 'S-DEVELOPMENT-AUTH-SOURCE-GATE');
  assert.equal(packet.nextSafeAction.branch, 'codex/cad-dev-auth-reviewed-source-gate');
  assert.equal(packet.nextSafeAction.canProceedWithoutUserInput, true);
  assert.match(packet.nextSafeAction.stopBefore, /development deployment/);
  assert.equal(packet.autopilotDecision.sourcePrFlowMayContinue, true);
  assert.equal(packet.autopilotDecision.developmentEnvMutationMustStop, true);
  assert.equal(packet.autopilotDecision.developmentDeploymentMustStop, true);
  assert.equal(packet.autopilotDecision.developmentLiveAuthRunMustStop, true);
});

test('authority remains false for sensitive, live and external actions', () => {
  for (const [key, value] of Object.entries(packet.authorityPreserved)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test('markdown is source-safe and does not overclaim readiness', () => {
  assert.match(markdown, /value-free/);
  assert.match(markdown, /not execution authority/);
  assert.match(markdown, /Reviewed development Auth source gate/);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY/);
  assert.doesNotMatch(markdown, /\/Users\//);
  assert.doesNotMatch(markdown, /production CAD ready/i);
  assert.doesNotMatch(markdown, /private CAD approved/i);
});
