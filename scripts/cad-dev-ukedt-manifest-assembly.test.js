const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const manifest = JSON.parse(fs.readFileSync('docs/cad-dev-ukedt-manifest-assembly.json', 'utf8'));
const dashboard = JSON.parse(fs.readFileSync('docs/cad-convex-dev-dashboard-evidence-register.json', 'utf8'));
const closeout = JSON.parse(fs.readFileSync('docs/cad-successful-bounded-dev-qualification-closeout.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-dev-ukedt-manifest-assembly.md', 'utf8');

test('U/K/E/D/T manifest assembly binds the current development target', () => {
  assert.equal(manifest.mode, 'source-only-cad-development-ukedt-manifest-assembly');
  assert.equal(manifest.status, 'UKEDT_MANIFESTS_ASSEMBLED_FOR_REVIEW_NOT_EXECUTION');
  assert.equal(manifest.sourceOnly, true);
  assert.equal(manifest.production, false);
  assert.equal(manifest.baseMainCommit, 'ce89f32080e83e2d496c1736a1b25aecee139a45');
  assert.deepEqual(manifest.target, {
    teamSlug: dashboard.target.teamSlug,
    teamIdFromApproval: dashboard.target.teamIdFromApproval,
    projectSlug: dashboard.target.projectSlug,
    deploymentName: dashboard.target.deploymentName,
    deploymentType: dashboard.target.deploymentType,
    region: dashboard.deploymentEvidence.region,
    cloudUrl: dashboard.deploymentEvidence.cloudUrl,
    httpActionsUrl: dashboard.deploymentEvidence.httpActionsUrl,
    immutableProjectIdVisible: false,
    immutableDeploymentIdVisible: false,
  });
});

test('U manifest records observed limits without treating them as a cost cap', () => {
  const u = manifest.manifests.u;
  assert.equal(u.status, 'OBSERVED_EXISTING_LIMITS_NOT_ACTIONABLE_FOR_MUTATION');
  assert.equal(u.currentLimitsObserved, true);
  assert.equal(u.currentLimitsActive, true);
  assert.equal(u.currentLimitsTriggered, false);
  assert.equal(u.functionCallsDailyDisable, '100 calls');
  assert.equal(u.functionCallsCurrentAtRefresh, '17 calls');
  assert.equal(u.allInCostCapVerified, false);
  assert.equal(u.teamSpendingLimitVerified, false);
  assert.equal(u.mutationReady, false);
  assert.ok(u.blockers.some(blocker => /point-in-time/.test(blocker)));
});

test('K and E manifests preserve secret and environment boundaries', () => {
  const k = manifest.manifests.k;
  const e = manifest.manifests.e;
  assert.deepEqual(k.rowsObserved, ['JWKS', 'JWT_PRIVATE_KEY', 'SITE_URL']);
  assert.equal(k.valuesRead, false);
  assert.equal(k.secretGenerationAuthorized, false);
  assert.equal(k.custodyVerified, false);
  assert.equal(k.rotationReady, false);
  assert.equal(e.destinationVerified, true);
  assert.equal(e.rowNamesVerified, true);
  assert.equal(e.rowValuesRead, false);
  assert.equal(e.rowMutationAuthorized, false);
  assert.equal(e.rollbackReady, false);
  assert.ok(e.platformOwnedRowsExcluded.includes('CONVEX_SITE_URL'));
});

test('D and T manifests do not authorize deployment, retry, or second run', () => {
  const d = manifest.manifests.d;
  const t = manifest.manifests.t;
  assert.equal(d.status, 'DEPLOYMENT_IDENTITY_VERIFIED_NO_DEPLOYMENT_AUTHORITY');
  assert.equal(d.deploymentRunning, true);
  assert.equal(d.durableReleaseIdVerified, false);
  assert.equal(d.commandManifestReady, false);
  assert.equal(d.rollbackDeploymentReady, false);
  assert.equal(d.deploymentAuthorized, false);
  assert.equal(t.status, 'PRIOR_SUCCESSFUL_RUN_RECORDED_NO_NEW_RUN_AUTHORITY');
  assert.equal(t.completedRunObserved, true);
  assert.equal(t.runCompleted, closeout.runResult.runCompleted);
  assert.equal(t.unknownOutcome, closeout.runResult.unknownOutcome);
  assert.equal(t.automaticRetry, false);
  assert.equal(t.secondRun, false);
  assert.equal(t.newRunAuthorized, false);
  assert.equal(t.remoteReadReconciliation, 'READ_ONLY_RECONCILIATION_INCONCLUSIVE');
});

test('all authority gates remain false', () => {
  assert.equal(manifest.readinessSummary.assembledForReview, true);
  assert.equal(manifest.readinessSummary.executable, false);
  assert.equal(manifest.readinessSummary.mutationReady, false);
  assert.equal(manifest.readinessSummary.liveRunReady, false);
  assert.equal(manifest.readinessSummary.uploadActivationReady, false);
  assert.equal(manifest.readinessSummary.providerAuthResourceReady, false);
  for (const [gate, value] of Object.entries(manifest.authorityPreserved)) {
    assert.equal(value, false, `${gate} must remain false`);
  }
});

test('markdown stays source-safe and does not overclaim activation', () => {
  assert.match(markdown, /not executable/);
  assert.match(markdown, /values were not read/i);
  assert.match(markdown, /not a durable\s+release identifier/);
  assert.match(markdown, /does not\s+authorize a second run/);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY/);
  assert.doesNotMatch(markdown, /vsillah@gmail\\.com/);
  assert.doesNotMatch(markdown, /CAD upload activation completed/i);
  assert.doesNotMatch(markdown, /conversion dispatched/i);
  assert.doesNotMatch(markdown, /production activation completed/i);
});
