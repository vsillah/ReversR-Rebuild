const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { check, checkPacket } = require('./cad-phase5-package8-r2-binding-refresh-checker');

const packet = JSON.parse(fs.readFileSync(path.join(__dirname,
  '../docs/cad-phase5-package8-public-evidence/r2-binding-refresh.json'), 'utf8'));
const copy = value => JSON.parse(JSON.stringify(value));

test('R2 refresh verifies the private bucket and leaves Package 8 closed', () => {
  assert.deepEqual(check(), {
    status: 'PASS',
    unavailableBindings: 11,
    r2BucketVerified: true,
    activationAuthorized: false,
  });
});

test('public exposure and lifecycle drift fail closed', () => {
  const exposed = copy(packet);
  exposed.verifiedR2Binding.publicDevelopmentUrlEnabled = true;
  assert.throws(() => checkPacket(exposed), /private bucket/);

  const staleLifecycle = copy(packet);
  staleLifecycle.verifiedR2Binding.pilotDeletionRule.deleteAfterDays = 2;
  assert.throws(() => checkPacket(staleLifecycle), /lifecycle/);
});

test('source-limit drift and monitoring overclaims fail closed', () => {
  const limitDrift = copy(packet);
  limitDrift.sourceEnforcedLimits.maxObjects = 13;
  assert.throws(() => checkPacket(limitDrift), /source limits/);

  const monitoringOverclaim = copy(packet);
  monitoringOverclaim.verifiedR2Binding.dataAccessLogs.available = true;
  assert.throws(() => checkPacket(monitoringOverclaim), /monitoring limitation/);
});

test('authority and unavailable-list drift fail closed', () => {
  const activated = copy(packet);
  activated.authority.storageDispatchAuthorized = true;
  assert.throws(() => checkPacket(activated), /authority/);

  const missing = copy(packet);
  missing.unavailableValues.pop();
  assert.throws(() => checkPacket(missing), /unavailable/);
});
