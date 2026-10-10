const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { check, checkPacket } = require('./cad-phase5-package8-readiness-monitoring-checker');

const packet = JSON.parse(fs.readFileSync(path.join(__dirname,
  '../docs/cad-phase5-package8-public-evidence/readiness-monitoring-reconciliation.json'), 'utf8'));
const copy = value => JSON.parse(JSON.stringify(value));

test('the successor reconciles source-only bindings while execution stays closed', () => {
  assert.deepEqual(check(), {
    status: 'PASS',
    sourceOnlyBindingsRemaining: 0,
    stopRules: 14,
    proposedWindowMinutes: 10,
    activationAuthorized: false,
  });
});

test('ancestry and function-equivalence overclaims fail closed', () => {
  const ancestry = copy(packet);
  ancestry.source.commitAncestryClaimed = true;
  assert.throws(() => checkPacket(ancestry), /source binding/);

  const equivalence = copy(packet);
  equivalence.completedBindings.convex.functionSchemaEquivalenceClaimed = true;
  assert.throws(() => checkPacket(equivalence), /completed binding/);
});

test('R2 monitoring and processor-boundary overclaims fail closed', () => {
  const logs = copy(packet);
  logs.monitoringContract.r2DataAccessLogsAvailable = true;
  assert.throws(() => checkPacket(logs), /monitoring boundary/);

  const privateCad = copy(packet);
  privateCad.processorBoundary.proprietaryCadQualified = true;
  assert.throws(() => checkPacket(privateCad), /processor boundary/);
});

test('window activation, runtime authority, and validation drift fail closed', () => {
  const active = copy(packet);
  active.proposedWindow.activated = true;
  assert.throws(() => checkPacket(active), /window/);

  const authority = copy(packet);
  authority.authority.storageDispatchAuthorized = true;
  assert.throws(() => checkPacket(authority), /authority/);

  const request = copy(packet);
  request.validation.providerRequests = 1;
  assert.throws(() => checkPacket(request), /validation/);
});
