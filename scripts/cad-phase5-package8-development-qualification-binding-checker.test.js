const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { check, checkPacket }
  = require('./cad-phase5-package8-development-qualification-binding-checker');

const packet = JSON.parse(fs.readFileSync(path.join(__dirname,
  '../docs/cad-phase5-package8-public-evidence/final-development-qualification-binding.json'),
'utf8'));
const copy = value => structuredClone(value);

test('exact final development qualification binding is closed and source-only', () => {
  assert.deepEqual(check(), {
    status: 'PASS', mergedMainCommit: '499ee332c0d076f531561a1d79939bc8e9aaddff',
    mergedMainTree: '2b5c21f854327fbec81be6fa08d1e9aaa717f3fa',
    productionEvidenceDeploymentId: 'dpl_D9DcWPErFXC7De9q7pr7KWdQSs2t',
    approvalArtifactIssued: false, runtimeActivationAuthorized: false,
    providerRequests: 0, blockers: 8,
  });
});

test('source, evidence, and contract widening fail closed', () => {
  const source = copy(packet); source.source.mergedMainCommit = '0'.repeat(40);
  assert.throws(() => checkPacket(source), /source binding/);
  const digest = copy(packet); digest.sourceBindings.executionController.sha256 = '1'.repeat(64);
  assert.throws(() => checkPacket(digest), /source digest/);
  const approval = copy(packet); approval.approvalArtifactContract.maximumAttempts = 2;
  assert.throws(() => checkPacket(approval), /approval boundary/);
  const runtime = copy(packet); runtime.defaultState.runtimeActivationAllowed = true;
  assert.throws(() => checkPacket(runtime), /runtime boundary/);
  const validation = copy(packet); validation.validationBoundary.providerRequests = 1;
  assert.throws(() => checkPacket(validation), /validation boundary/);
});

test('credential values, blockers, and merge authority cannot be introduced', () => {
  const credential = copy(packet); credential.credentialOrEnvironmentValuesRead = true;
  assert.throws(() => checkPacket(credential), /credential boundary/);
  const blocker = copy(packet); blocker.remainingLiveBlockers.pop();
  assert.throws(() => checkPacket(blocker), /blocker inventory/);
  const next = copy(packet); next.nextGate.mergeAuthorized = true;
  assert.throws(() => checkPacket(next), /next gate/);
});
