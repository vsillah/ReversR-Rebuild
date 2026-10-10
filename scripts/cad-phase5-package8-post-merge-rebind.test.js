const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { EXPECTED, check, checkPacket }
  = require('./cad-phase5-package8-post-merge-rebind-checker');

const packet = JSON.parse(fs.readFileSync(path.join(__dirname,
  '../docs/cad-phase5-package8-public-evidence/post-merge-execution-rebind.json'), 'utf8'));
const copy = value => structuredClone(value);

test('exact post-merge packet passes while execution stays inactive', () => {
  assert.deepEqual(check(), {
    status: 'PASS', mergedMainCommit: EXPECTED.main, mergedMainTree: EXPECTED.tree,
    deploymentEvidence: EXPECTED.deployment, proposedWindowMinutes: 10,
    activationAuthorized: false, unresolvedBindings: 5, providerRequests: 0,
  });
});

test('merged main and tree drift fail closed', () => {
  const main = copy(packet); main.source.mergedMainCommit = '0'.repeat(40);
  assert.throws(() => checkPacket(main), /source binding/);
  const tree = copy(packet); tree.source.mergedMainTree = '1'.repeat(40);
  assert.throws(() => checkPacket(tree), /source binding/);
});

test('deployment, reconciliation, and source digest drift fail closed', () => {
  const deployment = copy(packet);
  deployment.source.productionEvidenceDeploymentId = 'dpl_unknown';
  assert.throws(() => checkPacket(deployment), /source binding/);
  const reconciliation = copy(packet);
  reconciliation.source.reconciliationPacket.sha256 = '0'.repeat(64);
  assert.throws(() => checkPacket(reconciliation), /source binding/);
  const source = copy(packet); source.source.reboundControllerSource.sha256 = '1'.repeat(64);
  assert.throws(() => checkPacket(source), /source binding/);
});

test('Convex, R2, credential, quota, and Sandbox widening fail closed', () => {
  const convex = copy(packet); convex.targetBindings.convexDevelopment.deploymentName = 'prod';
  assert.throws(() => checkPacket(convex), /convex binding/);
  const r2 = copy(packet); r2.targetBindings.privateR2.publicAccess = true;
  assert.throws(() => checkPacket(r2), /r2 binding/);
  const credential = copy(packet); credential.targetBindings.credentialCustody.credentialValuesRecorded = true;
  assert.throws(() => checkPacket(credential), /credential binding/);
  const quota = copy(packet); quota.targetBindings.durableQuota.maximumCostUsdExclusive = 10;
  assert.throws(() => checkPacket(quota), /quota binding/);
  const sandbox = copy(packet); sandbox.targetBindings.sandbox.networkPolicy = 'allow-all';
  assert.throws(() => checkPacket(sandbox), /sandbox binding/);
});

test('fixture and qualification-boundary overclaims fail closed', () => {
  const fixture = copy(packet); fixture.fixture.customerData = true;
  assert.throws(() => checkPacket(fixture), /fixture binding/);
  const ownership = copy(packet);
  ownership.qualificationBoundary.proprietaryOrCustomerFileOwnershipProven = true;
  assert.throws(() => checkPacket(ownership), /qualification boundary/);
  const production = copy(packet);
  production.qualificationBoundary.generalProductionUploadReadinessProven = true;
  assert.throws(() => checkPacket(production), /qualification boundary/);
});

test('attempt, cost, retry, and inactive-window boundaries fail closed', () => {
  const attempt = copy(packet); attempt.executionEnvelope.maximumAttempts = 2;
  assert.throws(() => checkPacket(attempt), /execution envelope/);
  const cost = copy(packet); cost.executionEnvelope.allInCostUsdExclusive = 10;
  assert.throws(() => checkPacket(cost), /execution envelope/);
  const retry = copy(packet); retry.executionEnvelope.maximumRetries = 1;
  assert.throws(() => checkPacket(retry), /execution envelope/);
  const window = copy(packet); window.proposedWindow.activated = true;
  assert.throws(() => checkPacket(window), /window/);
});

test('monitoring, validation, authority, and runtime claims fail closed', () => {
  const logs = copy(packet); logs.monitoringContract.r2DataAccessLogsAvailable = true;
  assert.throws(() => checkPacket(logs), /monitoring boundary/);
  const provider = copy(packet); provider.validation.providerRequests = 1;
  assert.throws(() => checkPacket(provider), /validation/);
  const authority = copy(packet); authority.authority.qualificationExecutionAuthorized = true;
  assert.throws(() => checkPacket(authority), /authority/);
});

test('unresolved bindings and fully populated captain authorization cannot be omitted', () => {
  const unresolved = copy(packet); unresolved.unresolvedBindings.pop();
  assert.throws(() => checkPacket(unresolved), /unresolved binding/);
  const next = copy(packet); next.nextGate.authorization = 'Approve.';
  assert.throws(() => checkPacket(next), /next gate/);
});
