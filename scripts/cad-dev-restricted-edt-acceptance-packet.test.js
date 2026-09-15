const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const packet = JSON.parse(fs.readFileSync('docs/cad-dev-restricted-edt-acceptance-packet.json', 'utf8'));
const prep = JSON.parse(fs.readFileSync('docs/cad-dev-restricted-edt-evidence-prep.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-dev-restricted-edt-acceptance-packet.md', 'utf8');

test('packet records source-planning acceptance without live mutation authority', () => {
  assert.equal(packet.mode, 'source-only-cad-development-restricted-edt-acceptance-packet');
  assert.equal(packet.status, 'PARTIAL_RESTRICTED_EDT_ACCEPTANCE_COST_CAP_HARD_STOP');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.production, false);
  assert.equal(packet.baseMainCommit, '5e02943f9dd8527c27ea9f6b3654661d9324c620');
  assert.equal(packet.target.repo, prep.target.repo);
  assert.equal(packet.target.projectSlug, prep.target.projectSlug);
  assert.equal(packet.target.deploymentName, prep.target.deploymentName);
});

test('ignored local receipt is referenced only by digest and safe metadata', () => {
  assert.match(packet.ignoredLocalReceipt.pathRef, /^\.local\//);
  assert.equal(packet.ignoredLocalReceipt.sha256.length, 64);
  assert.equal(packet.ignoredLocalReceipt.directoryMode, '700');
  assert.equal(packet.ignoredLocalReceipt.fileMode, '600');
  assert.equal(packet.ignoredLocalReceipt.gitIgnored, true);
  assert.equal(packet.ignoredLocalReceipt.containsSecretValues, false);
  assert.equal(packet.ignoredLocalReceipt.containsPrivateCad, false);
  assert.equal(packet.ignoredLocalReceipt.containsRealUsers, false);
});

test('read-only usage refresh remains observational and keeps cap uncertainty blocked', () => {
  assert.equal(packet.readOnlyUsageRefresh.functionCallsDailyDisableLimit, '100 calls');
  assert.equal(packet.readOnlyUsageRefresh.functionCallsCurrentDay, '17 calls');
  assert.equal(packet.readOnlyUsageRefresh.functionCallsCurrentMonth, '30 calls');
  assert.equal(packet.readOnlyUsageRefresh.computeStorageEgressObservedZero, true);
  assert.equal(packet.readOnlyUsageRefresh.usageLimitsActive, true);
  assert.equal(packet.readOnlyUsageRefresh.usageLimitsTriggered, false);
  assert.equal(packet.readOnlyUsageRefresh.settingsMutated, false);
  assert.equal(packet.readOnlyUsageRefresh.teamAllInSpendingCapVerified, false);
  assert.equal(packet.readOnlyUsageRefresh.taxesFeesProviderLagVerified, false);
});

test('hard stops block development mutation, deployment and live run', () => {
  assert.deepEqual(packet.hardStopsRemaining, [
    'teamAllInSpendingCapUnverified',
    'backupCustodianNotNamedForLiveMutation',
    'durableDevelopmentReleaseIdNotBound',
    'pinnedDeployAndRollbackCommandDigestsNotBound',
    'freshFutureUtcRunWindowNotAccepted',
  ]);
  assert.equal(packet.autopilotDecision.sourcePrFlowMayContinue, true);
  assert.equal(packet.autopilotDecision.readOnlyEvidenceMayContinue, true);
  assert.equal(packet.autopilotDecision.developmentEnvMutationMustStop, true);
  assert.equal(packet.autopilotDecision.developmentDeploymentMustStop, true);
  assert.equal(packet.autopilotDecision.developmentLiveAuthRunMustStop, true);
});

test('authority remains false for sensitive and live actions', () => {
  for (const [key, value] of Object.entries(packet.authorityPreserved)) {
    assert.equal(value, false, `${key} must remain false`);
  }
  assert.match(packet.nextSafeAction.scope, /read-only or source-only evidence/);
});

test('markdown states the hard stop without leaking values or overclaiming readiness', () => {
  assert.match(markdown, /Cost-cap uncertainty remains a hard stop/);
  assert.match(markdown, /development env mutation/);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY/);
  assert.doesNotMatch(markdown, /\/Users\//);
  assert.doesNotMatch(markdown, /production CAD ready/i);
  assert.doesNotMatch(markdown, /private CAD approved/i);
});
