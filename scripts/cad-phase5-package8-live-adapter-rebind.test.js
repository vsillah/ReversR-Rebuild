const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { EXPECTED, check, checkPacket }
  = require('./cad-phase5-package8-live-adapter-rebind-checker');

const packet = JSON.parse(fs.readFileSync(path.join(__dirname,
  '../docs/cad-phase5-package8-public-evidence/post-merge-live-adapter-rebind.json'), 'utf8'));
const copy = value => structuredClone(value);

test('exact post-merge live-adapter rebind passes while all authority stays disabled', () => {
  const result = check();
  assert.equal(result.status, 'PASS');
  assert.equal(result.mergedMainCommit, EXPECTED.main);
  assert.equal(result.mergedMainTree, EXPECTED.tree);
  assert.equal(result.productionEvidenceDeploymentId, EXPECTED.deployment);
  assert.equal(result.runtimeActivationAuthorized, false);
  assert.equal(result.providerRequests, 0);
});

test('commit, tree, deployment, and provenance drift fail closed', () => {
  for (const mutate of [
    value => { value.source.mergedMainCommit = '0'.repeat(40); },
    value => { value.source.mergedMainTree = '1'.repeat(40); },
    value => { value.source.productionEvidenceDeploymentId = 'dpl_unknown'; },
    value => { value.source.bindingProvenance = 'FETCH_VERIFIED'; },
  ]) {
    const changed = copy(packet); mutate(changed);
    assert.throws(() => checkPacket(changed), /source binding/);
  }
});

test('immutable packet or current source digest drift fails closed', () => {
  const immutable = copy(packet);
  immutable.immutableEvidence.liveAdapterSourceContract.sha256 = '0'.repeat(64);
  assert.throws(() => checkPacket(immutable), /immutable evidence/);
  const current = copy(packet);
  current.sourceBindings.liveAdapterComposition.sha256 = '1'.repeat(64);
  assert.throws(() => checkPacket(current), /current source digest/);
});

test('runtime, execution, and next-gate widening fail closed', () => {
  const runtime = copy(packet); runtime.defaultState.runtimeActivationAllowed = true;
  assert.throws(() => checkPacket(runtime), /runtime boundary/);
  const request = copy(packet); request.validation.providerRequests = 1;
  assert.throws(() => checkPacket(request), /validation boundary/);
  const next = copy(packet); next.nextGate.commitAuthorized = true;
  assert.throws(() => checkPacket(next), /next gate/);
});

test('blockers cannot omit local verification or live activation gaps', () => {
  const changed = copy(packet); changed.remainingExecutionBlockers.shift();
  assert.throws(() => checkPacket(changed), /blocker inventory/);
});
