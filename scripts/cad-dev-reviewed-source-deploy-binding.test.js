const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');

const packet = JSON.parse(fs.readFileSync('docs/cad-dev-reviewed-source-deploy-binding.json', 'utf8'));
const sourceGate = JSON.parse(fs.readFileSync('docs/cad-dev-auth-reviewed-source-gate.json', 'utf8'));
const envReceipts = JSON.parse(fs.readFileSync('docs/cad-dev-env-custody-rollback-receipts.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-dev-reviewed-source-deploy-binding.md', 'utf8');
const developmentAuth = fs.readFileSync('convex/developmentAuth.ts', 'utf8');

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const fileDigest = file => sha256(fs.readFileSync(file));

test('packet records source-only command rebind for reviewed source gate', () => {
  assert.equal(packet.mode, 'source-only-cad-development-reviewed-source-deploy-binding');
  assert.equal(packet.status, 'REVIEWED_SOURCE_EXACT_COMMAND_DIGESTS_BOUND_NO_DEPLOYMENT');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.production, false);
  assert.equal(packet.baseMainCommit, 'ce00edb676b3209b96c01c90dd057eed44d81113');
  assert.equal(packet.target.projectSlug, sourceGate.target.projectSlug);
  assert.equal(packet.target.deploymentName, sourceGate.target.deploymentName);
});

test('source input digests match tracked files', () => {
  for (const input of Object.values(packet.sourceInputs)) {
    assert.equal(input.sha256, fileDigest(input.path), input.path);
  }
});

test('runtime source state reflects reviewed auth source without upload activation', () => {
  assert.equal(packet.runtimeSourceState.candidateSourceSha, 'ce00edb676b3209b96c01c90dd057eed44d81113');
  assert.equal(packet.runtimeSourceState.disabledRollbackSourceSha, 'fa480868ddfd28cc99c2420ab341859f525e83a2');
  assert.equal(packet.runtimeSourceState.developmentAuthReviewed, true);
  assert.match(developmentAuth, /developmentAuthReviewed: boolean = true/);
  assert.deepEqual(packet.runtimeSourceState.installedRuntimeCohort, sourceGate.reviewedSourceGate.syntheticCohort);
  assert.equal(packet.runtimeSourceState.cadUploadsRemainDisabled, true);
  assert.equal(packet.runtimeSourceState.cadConversionRemainDisabled, true);
  assert.equal(packet.runtimeSourceState.privateCadAuthorized, false);
  assert.equal(packet.runtimeSourceState.realUsersAuthorized, false);
});

test('exact deploy and rollback command digests are source-bound but not execution authority', () => {
  const deploy = packet.exactCommandBinding.deployCommand;
  const rollback = packet.exactCommandBinding.disabledRollbackCommand;
  assert.equal(deploy.sourceSha, packet.runtimeSourceState.candidateSourceSha);
  assert.equal(rollback.sourceSha, packet.runtimeSourceState.disabledRollbackSourceSha);
  assert.equal(deploy.sha256, sha256(deploy.command));
  assert.equal(rollback.sha256, sha256(rollback.command));
  assert.match(deploy.command, /cad-dev-auth-reviewed-source-gate:ce00edb676b3209b96c01c90dd057eed44d81113/);
  assert.match(rollback.command, /cad-dev-auth-disabled-rollback:fa480868ddfd28cc99c2420ab341859f525e83a2/);
  assert.match(deploy.command, /\.local\/cad-convex\/dev-auth-edt\/convex-deployment\.env/);
  assert.equal(deploy.authorityNow, false);
  assert.equal(rollback.authorityNow, false);
  assert.equal(packet.exactCommandBinding.executableAuthorityNow, false);
});

test('fresh window is only proposed and deployment remains separate', () => {
  assert.equal(packet.freshWindowProposal.proposedStartUtc, '2026-09-15T20:00:00Z');
  assert.equal(packet.freshWindowProposal.proposedEndUtc, '2026-09-15T20:15:00Z');
  assert.equal(packet.freshWindowProposal.acceptedNow, false);
  assert.equal(packet.freshWindowProposal.liveRunAuthorizedNow, false);
  assert.equal(packet.remainingGates[0].id, 'D-DEVELOPMENT-DEPLOYMENT');
  assert.equal(packet.remainingGates[0].status, 'COMMAND_DIGESTS_BOUND_DEPLOYMENT_NOT_EXECUTED');
  assert.equal(packet.autopilotDecision.developmentDeploymentExecutionMayContinueAfterMerge, true);
  assert.equal(packet.autopilotDecision.developmentLiveAuthRunMustStop, true);
});

test('custody carries forward and authority remains false for sensitive actions', () => {
  assert.equal(packet.custody.backupCustodian, 'Amina');
  assert.equal(packet.custody.backupCustodian, envReceipts.custodyProjection.backupCustodian);
  assert.equal(packet.custody.markRole, 'tester-reviewer');
  assert.equal(packet.custody.markIsCustodian, false);
  for (const [key, value] of Object.entries(packet.authorityPreserved)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test('markdown is source-safe and does not overclaim readiness', () => {
  assert.match(markdown, /source-only exact command rebinding/);
  assert.match(markdown, /not execution authority/);
  assert.match(markdown, /2026-09-15T20:00:00Z/);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY/);
  assert.doesNotMatch(markdown, /\/Users\//);
  assert.doesNotMatch(markdown, /production CAD ready/i);
  assert.doesNotMatch(markdown, /private CAD approved/i);
});
