const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const register = JSON.parse(fs.readFileSync(
  'docs/cad-convex-dev-dashboard-evidence-register.json',
  'utf8',
));
const markdown = fs.readFileSync(
  'docs/cad-convex-dev-dashboard-evidence-register.md',
  'utf8',
);

test('dashboard evidence register is bound to the approved development target', () => {
  assert.equal(register.mode, 'source-only-convex-development-dashboard-evidence-register');
  assert.equal(register.status, 'CONVEX_DEVELOPMENT_DASHBOARD_EVIDENCE_REFRESHED_SOURCE_ONLY');
  assert.equal(register.sourceOnly, true);
  assert.equal(register.production, false);
  assert.equal(register.target.teamSlug, 'vambah-sillah');
  assert.equal(register.target.teamIdFromApproval, '405220');
  assert.equal(register.target.projectSlug, 'reversr-cad-auth-dev');
  assert.equal(register.target.deploymentName, 'majestic-alligator-31');
  assert.equal(register.target.deploymentType, 'dev');
  assert.equal(register.deploymentEvidence.region, 'US East (N. Virginia)');
  assert.equal(register.deploymentEvidence.cloudUrl, 'https://majestic-alligator-31.convex.cloud');
  assert.equal(register.deploymentEvidence.httpActionsUrl, 'https://majestic-alligator-31.convex.site');
});

test('operator, release and identity evidence stays source-safe', () => {
  assert.equal(register.operatorEvidence.teamRoleObserved, 'Admin');
  assert.equal(register.operatorEvidence.projectRoleObserved, 'Project Admin');
  assert.equal(register.operatorEvidence.teamAdminObserved, true);
  assert.equal(register.operatorEvidence.accountEmailRecorded, false);
  assert.equal(register.deploymentEvidence.immutableProjectIdVisible, false);
  assert.equal(register.deploymentEvidence.immutableDeploymentIdVisible, false);
  assert.match(register.deploymentEvidence.identityNote, /did not expose separate immutable project or deployment IDs/);
});

test('environment rows record names and presence only', () => {
  assert.equal(register.environmentRows.valueRead, false);
  assert.deepEqual(register.environmentRows.rows.map(row => row.name), [
    'JWKS',
    'JWT_PRIVATE_KEY',
    'SITE_URL',
  ]);
  assert.ok(register.environmentRows.rows.every(row => row.present === true));
  assert.ok(register.environmentRows.rows.every(row => row.valueRead === false));
  assert.ok(register.environmentRows.excludedRows.includes('deploy keys'));
});

test('authentication, usage limits and diagnostics are read-only evidence', () => {
  assert.match(register.authenticationEvidence.dashboardProviderState, /no authentication providers yet/i);
  assert.ok(register.authenticationEvidence.sourceFunctionSpecAuthFunctionsObserved.includes('auth.js:signIn'));
  assert.equal(register.authenticationEvidence.providerMutationAuthorized, false);
  assert.equal(register.authenticationEvidence.authConfigurationChangeAuthorized, false);

  const functionCalls = register.usageLimits.limits.find(limit => limit.metric === 'Function calls');
  assert.equal(functionCalls.limit, '100 calls');
  assert.equal(functionCalls.current, '17 calls');
  assert.equal(functionCalls.active, true);
  assert.equal(functionCalls.triggered, false);
  assert.ok(register.usageLimits.limits.every(limit => limit.active === true));
  assert.ok(register.usageLimits.limits.every(limit => limit.triggered === false));

  assert.equal(register.diagnosticSettings.sendLogsToClient, 'Default (enabled)');
  assert.equal(register.diagnosticSettings.dashboardEditConfirmation, 'Default (disabled)');
  assert.deepEqual(register.diagnosticSettings.insights, []);
});

test('register preserves all mutation and activation authority as false', () => {
  for (const [gate, value] of Object.entries(register.authorityPreserved)) {
    assert.equal(value, false, `${gate} must remain false`);
  }
  assert.ok(register.remainingGates.includes('separate CAD upload activation approval'));
  assert.ok(register.remainingGates.includes('separate CAD conversion/Sandbox dispatch approval'));
  assert.match(register.futureApprovalPhrases.publication, /No merge, deployment, live tests/);
  assert.match(register.futureApprovalPhrases.merge, /do not enable CAD uploads/);
});

test('markdown does not leak secrets or overclaim activation', () => {
  assert.match(markdown, /Values were not read/);
  assert.match(markdown, /does not grant provider setup/);
  assert.match(markdown, /point-in-time read, not a cost cap/);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY/);
  assert.doesNotMatch(markdown, /vsillah@gmail\\.com/);
  assert.doesNotMatch(markdown, /CAD upload activation completed/i);
  assert.doesNotMatch(markdown, /conversion dispatched/i);
  assert.doesNotMatch(markdown, /production activation completed/i);
});
