const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const packet = JSON.parse(fs.readFileSync('offline/cad-convex/developmentAuthSourceEnablement.json', 'utf8'));
const retention = JSON.parse(fs.readFileSync('docs/cad-dev-retention-lockout-autopilot.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-dev-auth-source-enable-autopilot.md', 'utf8');
const developmentAuth = fs.readFileSync('convex/developmentAuth.ts', 'utf8');
const auth = fs.readFileSync('convex/auth.ts', 'utf8');
const readinessMarkdown = fs.readFileSync('docs/cad-dev-readiness-autopilot.md', 'utf8');
const retentionMarkdown = fs.readFileSync('docs/cad-dev-retention-lockout-autopilot.md', 'utf8');

const cohortPattern = /^cad-test-(alpha|beta)-20260915@auth-test\.invalid$/;

test('source packet binds current disabled development target', () => {
  assert.equal(packet.mode, 'source-only-cad-development-auth-source-enablement');
  assert.equal(packet.status, 'DISABLED_BY_DEFAULT_COHORT_BOUND_SOURCE_ONLY');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.production, false);
  assert.equal(packet.baseMainCommit, 'b25016abe07f5351191b87af14e4786227c6e1e5');
  assert.equal(packet.target.repo, retention.target.repo);
  assert.equal(packet.target.projectSlug, retention.target.projectSlug);
  assert.equal(packet.target.deploymentName, retention.target.deploymentName);
});

test('prepared cohort is exact but runtime cohort remains empty while gate is false', () => {
  assert.deepEqual(packet.sourceGate.runtimeCohortWhenGateFalse, []);
  assert.equal(packet.sourceGate.developmentAuthReviewed, false);
  assert.equal(packet.sourceGate.installedCohortSizeNow, 0);
  assert.equal(packet.sourceGate.providerEnabledNow, false);
  assert.equal(packet.sourceGate.preparedCohortWhenGateTrue.length, 2);
  assert.equal(new Set(packet.sourceGate.preparedCohortWhenGateTrue).size, 2);
  for (const email of packet.sourceGate.preparedCohortWhenGateTrue) assert.match(email, cohortPattern);
  assert.match(developmentAuth, /developmentAuthReviewed: boolean = false/);
  assert.match(developmentAuth, /developmentPasswordCohort\(\): readonly string\[\]/);
  assert.match(developmentAuth, /return developmentAuthReviewed \? developmentCohort : \[\]/);
  assert.match(auth, /developmentPassword\(developmentPasswordCohort\(\)\)/);
  assert.doesNotMatch(auth, /developmentPassword\(developmentCohort\)/);
});

test('evidence preconditions block gate flip, deployment and live run', () => {
  for (const [key, value] of Object.entries(packet.preconditionsBeforeGateMayFlip)) {
    assert.equal(value, false, `${key} must remain false`);
  }
  assert.deepEqual(packet.privateRegisterBindingRequirements, [
    'acceptedRetentionPolicyDigest',
    'acceptedLockoutFenceDigest',
    'acceptedPrivateRegisterReceiptDigest',
    'acceptedCostCapDigest',
    'acceptedRollbackDigest',
    'twoSlotCohortDigest',
    'operatorRef',
    'custodianRef',
    'runWindowRef',
  ]);
  assert.equal(packet.rollbackRequirements.sourceRollbackShaRequired, true);
  assert.equal(packet.rollbackRequirements.rollbackMustPreserveLockout, true);
  assert.equal(packet.rollbackRequirements.rollbackCanDeleteRows, false);
});

test('authority remains limited to source PR flow and production fail-closed smoke', () => {
  assert.equal(packet.currentAuthority.pushSourcePr, true);
  assert.equal(packet.currentAuthority.mergeSourcePrAfterGreenChecks, true);
  assert.equal(packet.currentAuthority.productionFailClosedSmoke, true);
  for (const [key, value] of Object.entries(packet.currentAuthority)) {
    if (['pushSourcePr', 'mergeSourcePrAfterGreenChecks', 'productionFailClosedSmoke'].includes(key)) continue;
    assert.equal(value, false, `${key} must remain false`);
  }
  assert.equal(packet.nextAutomatedSourceSlice.branch, 'codex/cad-dev-auth-acceptance-manifest');
  assert.equal(packet.nextAutomatedSourceSlice.liveMutationAuthorized, false);
});

test('related markdown is updated away from stale empty-array wiring language', () => {
  assert.match(readinessMarkdown, /developmentPassword\(developmentPasswordCohort\(\)\)/);
  assert.match(retentionMarkdown, /reviewed cohort helper/);
  assert.doesNotMatch(readinessMarkdown, /developmentPassword\(\[\]\)/);
  assert.doesNotMatch(retentionMarkdown, /developmentPassword\(\[\]\)/);
});

test('markdown does not overclaim enrollment, deployment or production readiness', () => {
  assert.match(markdown, /source-only, disabled by default/);
  assert.match(markdown, /No live Auth\/session provisioning is authorized/);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY/);
  assert.doesNotMatch(markdown, /are enrolled users/i);
  assert.doesNotMatch(markdown, /development deployment completed/i);
  assert.doesNotMatch(markdown, /production CAD ready/i);
  assert.doesNotMatch(markdown, /private CAD approved/i);
});
