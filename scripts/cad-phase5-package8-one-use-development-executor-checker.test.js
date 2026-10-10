const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { check, checkPacket } = require('./cad-phase5-package8-one-use-development-executor-checker');

const packet = JSON.parse(fs.readFileSync(path.join(__dirname,
  '../docs/cad-phase5-package8-public-evidence/one-use-development-executor-closure.json'), 'utf8'));
const copy = value => structuredClone(value);

test('one-use development executor closure is exact, source-only and unmounted', () => {
  assert.deepEqual(check(), { status: 'PASS', sourceOnly: true, unmounted: true,
    baselineCommit: '228320e174d23cbe9b43d9c192c2216733f4c477', providerRequests: 0,
    runtimeActivationAuthorized: false, approvalArtifactIssued: false });
});

test('baseline, source, authority, cost, action and activation widening fail closed', () => {
  const baseline = copy(packet); baseline.baseline.mergedMainCommit = '0'.repeat(40);
  assert.throws(() => checkPacket(baseline), /baseline binding/);
  const source = copy(packet); source.sourceBindings.oneUseCoordinator.sha256 = '0'.repeat(64);
  assert.throws(() => checkPacket(source), /source digest/);
  const authority = copy(packet); authority.coordinatorContract.sessionIssuanceEnabled = true;
  assert.throws(() => checkPacket(authority), /coordinator contract/);
  const cost = copy(packet); cost.oneUseLimits.maximumCostUsdExclusive = 10;
  assert.throws(() => checkPacket(cost), /one-use limits/);
  const action = copy(packet); action.actionsPerformedByThisRound.providerRequests = 1;
  assert.throws(() => checkPacket(action), /action boundary/);
  const gate = copy(packet); gate.remainingGate.runtimeActivationAuthorized = true;
  assert.throws(() => checkPacket(gate), /remaining gate/);
});
