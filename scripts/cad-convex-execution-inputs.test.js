const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const plan = JSON.parse(read('offline/cad-convex/executionInputs.json'));

test('execution input plan binds reviewed runtime and pinned SDK implementation', () => {
  assert.equal(JSON.parse(read('node_modules/@convex-dev/auth/package.json')).version, plan.sourceEvidence.authVersion);
  for (const [prefix, files] of [['', plan.sourceEvidence.files], ['node_modules/@convex-dev/auth/', plan.sourceEvidence.sdkFiles]])
    for (const [file, expected] of Object.entries(files))
      assert.equal(createHash('sha256').update(read(prefix + file)).digest('hex'), expected, file);
  assert.match(read('convex/developmentAuth.ts'), /developmentAuthReviewed: boolean = false/);
  assert.match(read('convex/auth.ts'), /developmentPassword\(\[\]\)/);
  assert.equal(plan.rollback.disabledSourceCandidate, plan.baseCommit);
});

test('execution plan has no action, enrollment, appointment or custody authority', () => {
  assert.equal(plan.mode, 'source-only-execution-inputs');
  for (const key of ['executable', 'configurationAuthorized', 'liveTestAuthorized', 'uploadsEnabled']) assert.equal(plan[key], false);
  assert.ok(Object.values(plan.gates).every(value => value === false));
  assert.deepEqual(plan.commands, []);
  assert.deepEqual(plan.cohort, []);
  assert.deepEqual(plan.custody.syntheticPasswordReferences, []);
  for (const key of ['executor', 'backup', 'appointmentReceipt', 'vaultLocationReference', 'signerVersionReference']) assert.equal(plan.custody[key], null);
  assert.equal(plan.custody.secretGenerationAuthorized, false);
  assert.equal(plan.destination.kind, 'development');
  for (const key of ['immutableProjectId', 'immutableDeploymentId', 'identityReceipt']) assert.equal(plan.destination[key], null);
  assert.deepEqual(plan.environmentRows.map(row => row.name), ['JWT_PRIVATE_KEY', 'JWKS', 'SITE_URL']);
  for (const row of plan.environmentRows) for (const key of ['priorVersionReference', 'newVersionReference', 'rollbackAction']) assert.equal(row[key], null);
  assert.equal(plan.observation.historicalOnly, true);
  assert.equal(plan.rollback.verifiedCloudRelease, null);
  assert.equal(plan.rollback.redeployRevokesSessions, false);
  assert.equal(plan.rollback.resourceDeletionAllowed, false);
});

test('workflow graph is acyclic and requires cleanup review before provisioning or qualification', () => {
  const graph = new Map(plan.workflows.map(row => [row.id, row]));
  assert.equal(graph.size, plan.workflows.length);
  assert.deepEqual([...graph.keys()].sort(), ['identity','custody','budget','diagnostics','rollback','provision','transport','accounting','reconciliation','revocation','cleanup','qualification'].sort());
  const done = new Set(), visiting = new Set();
  function visit(id) {
    assert.ok(graph.has(id), 'missing workflow ' + id);
    if (done.has(id)) return;
    assert.ok(!visiting.has(id), 'cycle at ' + id);
    visiting.add(id);
    const row = graph.get(id);
    assert.equal(row.command, null);
    assert.ok(row.acceptance.length > 40);
    row.requires.forEach(visit);
    visiting.delete(id); done.add(id);
  }
  graph.forEach(row => visit(row.id));
  assert.ok(graph.get('provision').requires.includes('cleanup'));
  for (const prerequisite of ['cleanup', 'accounting', 'reconciliation', 'transport']) assert.ok(graph.get('qualification').requires.includes(prerequisite));
  assert.ok(graph.get('cleanup').requires.includes('revocation'));
});

test('planning bounds reserve cleanup without claiming an enforced spend cap or deadlines', () => {
  const b = plan.budget, e = plan.expiry;
  assert.equal(b.maximumInitiatedLogicalOperations, 100);
  assert.equal(b.reservedCleanupLogicalOperations, 20);
  assert.equal(b.maximumIdentities, 2); assert.equal(b.maximumClients, 2);
  assert.equal(b.maximumInFlightAcrossRun, 1); assert.equal(b.automaticRetries, 0);
  assert.equal(b.proposedAllInUsd, 5);
  assert.equal(b.enforcementVerified, false); assert.equal(b.limitChangesAuthorized, false);
  for (const key of ['billableFanoutUpperBound', 'metricRatesReceipt', 'enforcementLagBound', 'storageAndRetentionCostBound', 'taxFeeBound', 'capReceipt']) assert.equal(b[key], null);
  assert.equal(e.maximumRunSeconds, 900); assert.equal(e.maximumSessionSeconds, 900);
  assert.equal(e.maximumRecordRetentionHours, 24); assert.equal(e.maximumReceiptRetentionDays, 30);
  assert.equal(e.crossUtcResetAllowed, false); assert.equal(e.restartAllowed, false);
  for (const key of ['approvalExpiresAtUtc','runStartsAtUtc','runEndsAtUtc','cleanupDeadlineUtc','receiptExpiryUtc']) assert.equal(e[key], null);
});
