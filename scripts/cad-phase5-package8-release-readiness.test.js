const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePacket, verifySource } = require('./cad-phase5-package8-release-readiness-checker');

const root = path.resolve(__dirname, '..');
const packet = JSON.parse(fs.readFileSync(path.join(root, 'docs/cad-phase5-package8-release-readiness.json'), 'utf8'));
const clone = () => JSON.parse(JSON.stringify(packet));

test('the source-only Package 8 readiness packet is bound and closed', () => {
  assert.deepEqual(verifySource(root), []);
});

test('any activation authority fails the packet', () => {
  const changed = clone();
  changed.authority.requestBodyAdmissionAuthorized = true;
  changed.authority.storageDispatchAuthorized = true;
  const errors = validatePacket(changed);
  assert.ok(errors.includes('requestBodyAdmissionAuthorized closed'));
  assert.ok(errors.includes('storageDispatchAuthorized closed'));
});

test('a partially supplied operational binding is not accepted as readiness', () => {
  const changed = clone();
  changed.requiredBindings.releaseOwner = 'unreviewed-owner';
  assert.ok(validatePacket(changed).includes('releaseOwner unresolved'));
});

test('candidate limits cannot widen to private data, retries, time, or spend', () => {
  const changed = clone();
  changed.candidateQualification.proprietaryCadAllowed = true;
  changed.candidateQualification.automaticRetries = 1;
  changed.candidateQualification.maximumWindowMinutes = 16;
  changed.candidateQualification.allInCostCeilingUsd = 10;
  const errors = validatePacket(changed);
  assert.ok(errors.includes('proprietaryCadAllowed closed'));
  assert.ok(errors.includes('zero retries'));
  assert.ok(errors.includes('window limit'));
  assert.ok(errors.includes('cost ceiling'));
});

test('rollback remains close first and the next gate cannot activate', () => {
  const changed = clone();
  changed.rollbackOrder.reverse();
  changed.nextGate.activationAllowed = true;
  const errors = validatePacket(changed);
  assert.ok(errors.includes('close-first rollback'));
  assert.ok(errors.includes('next gate activation closed'));
});
