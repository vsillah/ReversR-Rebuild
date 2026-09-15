const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const packet = JSON.parse(fs.readFileSync('docs/cad-dev-readiness-autopilot.json', 'utf8'));
const ukedt = JSON.parse(fs.readFileSync('docs/cad-dev-ukedt-manifest-assembly.json', 'utf8'));
const dashboard = JSON.parse(fs.readFileSync('docs/cad-convex-dev-dashboard-evidence-register.json', 'utf8'));
const closeout = JSON.parse(fs.readFileSync('docs/cad-successful-bounded-dev-qualification-closeout.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-dev-readiness-autopilot.md', 'utf8');
const developmentAuth = fs.readFileSync('convex/developmentAuth.ts', 'utf8');
const auth = fs.readFileSync('convex/auth.ts', 'utf8');

test('autopilot packet binds the current repo and development target', () => {
  assert.equal(packet.mode, 'source-only-cad-development-readiness-autopilot');
  assert.equal(packet.status, 'AUTOPILOT_ENVELOPE_RECORDED_HARD_STOP_BEFORE_LIVE_AUTH');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.production, false);
  assert.equal(packet.baseMainCommit, 'd2ebbbf44726e3934581b35e85e77b75f4bc9790');
  assert.equal(packet.target.repo, 'vsillah/ReversR-Rebuild');
  assert.equal(packet.target.projectSlug, dashboard.target.projectSlug);
  assert.equal(packet.target.deploymentName, dashboard.target.deploymentName);
  assert.equal(packet.inputs.ukedtManifest.path, 'docs/cad-dev-ukedt-manifest-assembly.json');
  assert.equal(ukedt.status, 'UKEDT_MANIFESTS_ASSEMBLED_FOR_REVIEW_NOT_EXECUTION');
});

test('source and prior evidence keep live development execution blocked', () => {
  assert.match(developmentAuth, /developmentAuthReviewed: boolean = false/);
  assert.match(auth, /developmentPassword\(\[\]\)/);
  assert.equal(packet.currentLiveExecutionReadiness.sourcePrAutomationReady, true);
  for (const key of [
    'developmentAuthSourceReady',
    'developmentDeploymentReady',
    'developmentAuthSessionRunReady',
    'syntheticUploadRunReady',
    'syntheticConversionRunReady',
    'productionCadReady',
  ]) {
    assert.equal(packet.currentLiveExecutionReadiness[key], false, `${key} must remain false`);
  }
  assert.equal(closeout.runResult.runCompleted, true);
  assert.equal(closeout.runResult.unknownOutcome, false);
});

test('hard stops and current blockers preserve the blanket approval boundary', () => {
  for (const [key, value] of Object.entries(packet.hardStops)) {
    assert.equal(value, true, `${key} must be a hard stop`);
  }
  assert.equal(packet.blockingFindings.developmentAuthReviewedSourceGate, false);
  assert.deepEqual(packet.blockingFindings.installedDevelopmentCohort, []);
  assert.equal(packet.blockingFindings.supportedRemovalAdapter, false);
  assert.equal(packet.blockingFindings.acceptedBoundedRetentionPolicy, false);
  assert.equal(packet.blockingFindings.implementedLockoutFence, false);
  assert.equal(packet.blockingFindings.allInCostCapVerified, false);
  assert.equal(packet.blockingFindings.liveRunAuthorizedNow, false);
});

test('authority remains false for live mutations and sensitive actions', () => {
  assert.equal(packet.approvedEnvelope.sourcePrAutopilot, true);
  assert.equal(packet.approvedEnvelope.developmentExecutionAutopilot, true);
  assert.equal(packet.approvedEnvelope.privateCadAutopilot, false);
  assert.equal(packet.approvedEnvelope.productionUploadActivationAutopilot, false);
  assert.equal(packet.approvedEnvelope.productionConversionAutopilot, false);
  assert.equal(packet.approvedEnvelope.externalDeliveryAutopilot, false);
  for (const [key, value] of Object.entries(packet.authorityPreserved)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test('roadmap separates automated source work from manual private or production gates', () => {
  assert.deepEqual(packet.autopilotPlan.map(step => step.id), ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7']);
  assert.equal(packet.autopilotPlan.find(step => step.id === 'A1').automated, true);
  assert.equal(packet.autopilotPlan.find(step => step.id === 'A7').automated, false);
  assert.match(packet.autopilotPlan.find(step => step.id === 'A4').stopBefore, /retry/);
  assert.match(packet.autopilotPlan.find(step => step.id === 'A5').stopBefore, /private CAD/);
  assert.match(packet.autopilotPlan.find(step => step.id === 'A6').stopBefore, /production conversion/);
  assert.equal(packet.nextAutomatedSourceSlice.branch, 'codex/cad-dev-retention-lockout-autopilot');
  assert.equal(packet.nextAutomatedSourceSlice.liveMutationAuthorized, false);
});

test('markdown does not overclaim readiness or leak private material', () => {
  assert.match(markdown, /live development execution is still blocked/);
  assert.match(markdown, /hard stop before any live synthetic/);
  assert.match(markdown, /No live\s+mutation is authorized/);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY/);
  assert.doesNotMatch(markdown, /CAD upload activation completed/i);
  assert.doesNotMatch(markdown, /production CAD ready/i);
  assert.doesNotMatch(markdown, /private CAD approved/i);
});
