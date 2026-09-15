const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const manifest = JSON.parse(fs.readFileSync('docs/cad-dev-auth-acceptance-manifest.json', 'utf8'));
const sourceEnablement = JSON.parse(fs.readFileSync('offline/cad-convex/developmentAuthSourceEnablement.json', 'utf8'));
const ukedt = JSON.parse(fs.readFileSync('docs/cad-dev-ukedt-manifest-assembly.json', 'utf8'));
const dashboard = JSON.parse(fs.readFileSync('docs/cad-convex-dev-dashboard-evidence-register.json', 'utf8'));
const closeout = JSON.parse(fs.readFileSync('docs/cad-successful-bounded-dev-qualification-closeout.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-dev-auth-acceptance-manifest.md', 'utf8');
const developmentAuth = fs.readFileSync('convex/developmentAuth.ts', 'utf8');
const auth = fs.readFileSync('convex/auth.ts', 'utf8');

test('manifest binds current target, source gate and prepared cohort', () => {
  assert.equal(manifest.mode, 'source-only-cad-development-auth-edt-acceptance-manifest');
  assert.equal(manifest.status, 'ASSEMBLED_WITH_BLOCKING_EVIDENCE_GAPS_NO_LIVE_AUTH');
  assert.equal(manifest.sourceOnly, true);
  assert.equal(manifest.production, false);
  assert.equal(manifest.baseMainCommit, 'c29e09c8c8c1046071e5f620f17041c082f5bf81');
  assert.equal(manifest.target.repo, sourceEnablement.target.repo);
  assert.equal(manifest.target.projectSlug, sourceEnablement.target.projectSlug);
  assert.equal(manifest.target.deploymentName, sourceEnablement.target.deploymentName);
  assert.deepEqual(manifest.sourceState.preparedSyntheticCohort, sourceEnablement.sourceGate.preparedCohortWhenGateTrue);
  assert.deepEqual(manifest.sourceState.installedRuntimeCohort, []);
  assert.match(developmentAuth, /developmentAuthReviewed: boolean = false/);
  assert.match(auth, /developmentPassword\(developmentPasswordCohort\(\)\)/);
});

test('usage evidence stays observational and does not authorize billing changes', () => {
  assert.equal(ukedt.manifests.u.currentLimitsObserved, true);
  assert.equal(dashboard.usageLimits.limits[0].metric, 'Function calls');
  assert.equal(manifest.uUsageEvidence.existingDailyFunctionCallDisableLimit, dashboard.usageLimits.limits[0].limit);
  assert.equal(manifest.uUsageEvidence.latestRecordedFunctionCallsAtDashboardRefresh, dashboard.usageLimits.limits[0].current);
  assert.equal(manifest.uUsageEvidence.teamSpendingLimitVerified, false);
  assert.equal(manifest.uUsageEvidence.allInCostCapAccepted, false);
  assert.equal(manifest.uUsageEvidence.usageBillingMutationAuthorized, false);
});

test('secret and environment evidence remain value-free and non-mutating', () => {
  assert.deepEqual(manifest.kSecretCustodyEvidence.rowNamesObservedWithoutValues, dashboard.environmentRows.rows.map(row => row.name));
  assert.equal(manifest.kSecretCustodyEvidence.secretValuesRead, false);
  assert.equal(manifest.kSecretCustodyEvidence.valueHashesRecorded, false);
  assert.equal(manifest.kSecretCustodyEvidence.secretGenerationAuthorizedNow, false);
  assert.equal(manifest.eEnvironmentEvidence.destinationRowNamesObserved, true);
  assert.equal(manifest.eEnvironmentEvidence.rowPriorVersionOrAbsenceReceiptsAccepted, false);
  assert.equal(manifest.eEnvironmentEvidence.rowSpecificRollbackCommandsAccepted, false);
  assert.equal(manifest.eEnvironmentEvidence.envMutationAuthorizedNow, false);
});

test('deployment and qualification gates stop before live actions', () => {
  assert.equal(manifest.dDeploymentEvidence.deploymentIdentityObserved, true);
  assert.equal(manifest.dDeploymentEvidence.durableReleaseIdVerified, false);
  assert.equal(manifest.dDeploymentEvidence.pinnedCliDeployCommandAccepted, false);
  assert.equal(manifest.dDeploymentEvidence.developmentDeploymentAuthorizedNow, false);
  assert.equal(closeout.runResult.runCompleted, true);
  assert.equal(closeout.runResult.unknownOutcome, false);
  assert.equal(manifest.tQualificationEvidence.priorFreshWindow1030RunCompleted, true);
  assert.equal(manifest.tQualificationEvidence.priorRunMayBeRetried, false);
  assert.equal(manifest.tQualificationEvidence.singleRunAuthorizedNow, false);
  assert.equal(manifest.tQualificationEvidence.automaticRetryAuthorized, false);
  assert.equal(manifest.tQualificationEvidence.secondRunAuthorized, false);
});

test('blocking gate list is finite and maps to hard-stop decision', () => {
  assert.deepEqual(manifest.blockingGates, [
    'teamSpendingLimitOrAllInCostCapNotAccepted',
    'secretCustodyAndBackupNotAccepted',
    'envRollbackReceiptsNotAccepted',
    'durableDevelopmentReleaseAndRollbackNotAccepted',
    'retentionPolicyNotAccepted',
    'lockoutFenceNotAccepted',
    'privateRegisterReceiptNotAccepted',
    'freshRunWindowNotAccepted',
  ]);
  assert.equal(manifest.autopilotDecision.sourcePrFlowMayContinue, true);
  assert.equal(manifest.autopilotDecision.prepareRestrictedEvidenceMayContinue, true);
  assert.equal(manifest.autopilotDecision.developmentEnvMutationMustStop, true);
  assert.equal(manifest.autopilotDecision.developmentDeploymentMustStop, true);
  assert.equal(manifest.autopilotDecision.developmentLiveAuthRunMustStop, true);
});

test('authority remains false for live mutation and sensitive actions', () => {
  for (const [key, value] of Object.entries(manifest.authorityPreserved)) {
    assert.equal(value, false, `${key} must remain false`);
  }
  assert.equal(manifest.nextAutomatedSourceSlice.branch, 'codex/cad-dev-restricted-edt-evidence-prep');
  assert.equal(manifest.nextAutomatedSourceSlice.liveMutationAuthorized, false);
  assert.equal(manifest.nextAutomatedSourceSlice.developmentDeploymentAuthorized, false);
});

test('markdown states blockers without leaking or overclaiming readiness', () => {
  assert.match(markdown, /no live Auth/);
  assert.match(markdown, /blocks live development Auth/);
  assert.match(markdown, /No live development Auth\/session run is authorized/);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY/);
  assert.doesNotMatch(markdown, /production CAD ready/i);
  assert.doesNotMatch(markdown, /private CAD approved/i);
  assert.doesNotMatch(markdown, /development deployment completed/i);
});
