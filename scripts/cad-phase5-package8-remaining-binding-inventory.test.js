const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { check, checkPacket } = require('./cad-phase5-package8-remaining-binding-inventory-checker');

const packet = JSON.parse(fs.readFileSync(path.join(__dirname,
  '../docs/cad-phase5-package8-public-evidence/remaining-binding-inventory.json'), 'utf8'));
const copy = value => JSON.parse(JSON.stringify(value));

test('remaining-binding inventory records the read-only stop and keeps Package 8 closed', () => {
  assert.deepEqual(check(), {
    status: 'PASS',
    resolvedBindings: 3,
    unavailableBindings: 8,
    providerWrites: 0,
    activationAuthorized: false,
  });
});

test('spend-control overclaims fail closed', () => {
  const hardCap = copy(packet);
  hardCap.verifiedBindings.vercelSpendManagement.effectiveHardCapEnabled = true;
  assert.throws(() => checkPacket(hardCap), /spend controls/);

  const paused = copy(packet);
  paused.verifiedBindings.vercelSpendManagement.automaticProductionPauseEnabled = true;
  assert.throws(() => checkPacket(paused), /spend controls/);
});

test('live Sandbox and monitoring overclaims fail closed', () => {
  const live = copy(packet);
  live.verifiedBindings.sandboxAccountState.liveRuntimeDigestAvailable = true;
  assert.throws(() => checkPacket(live), /sandbox live state/);

  const covered = copy(packet);
  covered.verifiedBindings.monitoring.package8LifecycleCoverageVerified = true;
  assert.throws(() => checkPacket(covered), /monitoring/);
});

test('Convex equivalence, authority, and unavailable-list drift fail closed', () => {
  const equivalence = copy(packet);
  equivalence.convexDisposition.sourceToDeploymentFunctionEquivalence = 'CLAIMED';
  assert.throws(() => checkPacket(equivalence), /convex boundary/);

  const activated = copy(packet);
  activated.authority.storageDispatchAuthorized = true;
  assert.throws(() => checkPacket(activated), /authority/);

  const missing = copy(packet);
  missing.unavailableValues.pop();
  assert.throws(() => checkPacket(missing), /unavailable/);
});
