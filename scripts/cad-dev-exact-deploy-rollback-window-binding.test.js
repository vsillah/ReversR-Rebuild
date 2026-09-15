const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');

const packet = JSON.parse(fs.readFileSync('docs/cad-dev-exact-deploy-rollback-window-binding.json', 'utf8'));
const prior = JSON.parse(fs.readFileSync('docs/cad-dev-cost-custody-rollback-window-evidence.json', 'utf8'));
const authAcceptance = JSON.parse(fs.readFileSync('docs/cad-dev-auth-acceptance-manifest.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-dev-exact-deploy-rollback-window-binding.md', 'utf8');
const developmentAuth = fs.readFileSync('convex/developmentAuth.ts', 'utf8');
const auth = fs.readFileSync('convex/auth.ts', 'utf8');

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const fileDigest = file => sha256(fs.readFileSync(file));

test('packet records source-only command binding for the current development target', () => {
  assert.equal(packet.mode, 'source-only-cad-development-exact-deploy-rollback-window-binding');
  assert.equal(packet.status, 'EXACT_COMMAND_DIGESTS_BOUND_WINDOW_PROPOSED_NO_LIVE_AUTH');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.production, false);
  assert.equal(packet.baseMainCommit, 'c30af570b2baede03e1a78739f176beb30f32bfa');
  assert.equal(packet.target.repo, prior.target.repo);
  assert.equal(packet.target.projectSlug, prior.target.projectSlug);
  assert.equal(packet.target.deploymentName, prior.target.deploymentName);
});

test('source input digests match tracked source files', () => {
  for (const input of Object.values(packet.sourceInputs)) {
    assert.equal(input.sha256, fileDigest(input.path), input.path);
  }
  assert.match(developmentAuth, /developmentAuthReviewed: boolean = false/);
  assert.match(developmentAuth, /return developmentAuthReviewed \? developmentCohort : \[\]/);
  assert.match(auth, /developmentPassword\(developmentPasswordCohort\(\)\)/);
});

test('cost and custody decisions from PR 235 are carried forward narrowly', () => {
  assert.equal(packet.resolvedDecisionInputs.convexTeamSpendingDisableThresholdUsdPerMonth, 50);
  assert.equal(packet.resolvedDecisionInputs.convexThresholdAcceptedForInternalTesting, true);
  assert.equal(packet.resolvedDecisionInputs.convexThresholdMutatedByThisPacket, false);
  assert.equal(packet.resolvedDecisionInputs.endToEndCadRunCostKnown, false);
  assert.equal(packet.resolvedDecisionInputs.endToEndCadRunCostLedgerRequiredFastFollow, true);
  assert.equal(packet.resolvedDecisionInputs.backupCustodian, 'Amina');
  assert.equal(packet.resolvedDecisionInputs.backupCustodianAccepted, true);
  assert.equal(packet.resolvedDecisionInputs.markRole, 'tester-reviewer');
  assert.equal(packet.resolvedDecisionInputs.markIsCustodian, false);
});

test('exact deploy and rollback command digests are source-bound but not executable authority', () => {
  const deploy = packet.exactCommandBinding.deployCommand;
  const rollback = packet.exactCommandBinding.disabledRollbackCommand;
  assert.equal(deploy.sourceSha, packet.runtimeSourceState.candidateSourceSha);
  assert.equal(rollback.sourceSha, packet.runtimeSourceState.disabledRollbackSourceSha);
  assert.equal(deploy.sha256, sha256(deploy.command));
  assert.equal(rollback.sha256, sha256(rollback.command));
  assert.match(deploy.command, /c30af570b2baede03e1a78739f176beb30f32bfa/);
  assert.match(rollback.command, /fa480868ddfd28cc99c2420ab341859f525e83a2/);
  assert.match(deploy.command, /\.local\/cad-convex\/dev-auth-edt\/convex-deployment\.env/);
  assert.equal(deploy.authorityNow, false);
  assert.equal(rollback.authorityNow, false);
  assert.equal(packet.exactCommandBinding.executableAuthorityNow, false);
  assert.ok(packet.exactCommandBinding.blockedUntilAccepted.includes('development deployment approval'));
});

test('fresh window is proposed only and all live gates remain closed', () => {
  assert.equal(packet.freshWindowProposal.proposedStartUtc, '2026-09-15T19:00:00Z');
  assert.equal(packet.freshWindowProposal.proposedEndUtc, '2026-09-15T19:15:00Z');
  assert.equal(packet.freshWindowProposal.maxDurationMinutes, 15);
  assert.equal(packet.freshWindowProposal.singleRunOnly, true);
  assert.equal(packet.freshWindowProposal.acceptedNow, false);
  assert.equal(packet.freshWindowProposal.liveRunAuthorizedNow, false);
  assert.equal(packet.freshWindowProposal.automaticRetryAuthorized, false);
  assert.equal(packet.freshWindowProposal.secondRunAuthorized, false);
});

test('updated readiness map resolves only the accepted cost and backup decisions', () => {
  assert.equal(packet.updatedReadinessMap.teamSpendingLimitOrAllInCostCapNotAccepted,
    'RESOLVED_FOR_CONVEX_DEVELOPMENT_AUTH_INTERNAL_TESTING_ONLY');
  assert.equal(packet.updatedReadinessMap.secretCustodyAndBackupNotAccepted,
    'PARTIAL_BACKUP_ACCEPTED_SECRET_VALUE_CUSTODY_RECEIPT_STILL_REQUIRED');
  assert.equal(packet.updatedReadinessMap.envRollbackReceiptsNotAccepted, 'PENDING');
  assert.equal(packet.updatedReadinessMap.freshRunWindowNotAccepted, 'PENDING_PROPOSED_NOT_ACCEPTED');
  assert.deepEqual(authAcceptance.blockingGates, [
    'teamSpendingLimitOrAllInCostCapNotAccepted',
    'secretCustodyAndBackupNotAccepted',
    'envRollbackReceiptsNotAccepted',
    'durableDevelopmentReleaseAndRollbackNotAccepted',
    'retentionPolicyNotAccepted',
    'lockoutFenceNotAccepted',
    'privateRegisterReceiptNotAccepted',
    'freshRunWindowNotAccepted',
  ]);
});

test('autopilot may continue source PR flow but must stop before live mutation', () => {
  assert.equal(packet.autopilotDecision.sourcePrFlowMayContinue, true);
  assert.equal(packet.autopilotDecision.mergeAfterGreenChecksMayContinue, true);
  assert.equal(packet.autopilotDecision.productionFailClosedSmokeMayContinue, true);
  assert.equal(packet.autopilotDecision.cleanupAfterVerifiedMergeMayContinue, true);
  assert.equal(packet.autopilotDecision.developmentEnvMutationMustStop, true);
  assert.equal(packet.autopilotDecision.developmentDeploymentMustStop, true);
  assert.equal(packet.autopilotDecision.developmentLiveAuthRunMustStop, true);
  assert.equal(packet.nextSafeAction.branch, 'codex/cad-dev-env-custody-rollback-receipts');
  assert.match(packet.nextSafeAction.stopBefore, /development deployment/);
});

test('authority remains false for sensitive, live and external actions', () => {
  for (const [key, value] of Object.entries(packet.authorityPreserved)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test('markdown is source-safe and does not overclaim readiness', () => {
  assert.match(markdown, /not execution authority/);
  assert.match(markdown, /Proposed window/);
  assert.match(markdown, /development deployment/);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY/);
  assert.doesNotMatch(markdown, /\/Users\//);
  assert.doesNotMatch(markdown, /production CAD ready/i);
  assert.doesNotMatch(markdown, /private CAD approved/i);
});
