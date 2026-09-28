const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  PACKET,
  SOURCES,
  DURABLE_SERVICE_REF,
  PRIVATE_SOURCE_EVIDENCE_SET_REF,
  checkPacket,
  approvalPhrase,
} = require('./cad-auth-durable-service-reference-prep-checker');

const root = path.resolve(__dirname, '..');
const readSource = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(readSource(PACKET));

test('reference prep creates concrete opaque refs without private reads or authority', () => {
  const p = packet();
  assert.equal(checkPacket(p).ok, true);
  assert.equal(p.durableServiceReference, DURABLE_SERVICE_REF);
  assert.equal(p.privateSourceEvidenceSetReference, PRIVATE_SOURCE_EVIDENCE_SET_REF);
  assert.deepEqual(p.nextGate.remainingUserPlaceholders, []);
  assert.equal(p.controls.privateEvidenceRead, false);
  assert.equal(p.controls.liveDurableServiceQualified, false);
  assert.equal(p.controls.productionExecutionBinding, null);
  assert.equal(p.controls.publicPushAuthorized, false);
  assert.equal(p.controls.prCreationAuthorized, false);
  assert.equal(p.controls.deploymentAuthorized, false);
  assert.equal(p.controls.productionUploadActivationAuthorized, false);
  assert.equal(p.controls.requestBodyAdmissionReadAuthorized, false);
});

test('next private review phrase has no unresolved opaque-reference placeholders', () => {
  const phrase = approvalPhrase(readSource(PACKET));
  assert.match(phrase, new RegExp(PRIVATE_SOURCE_EVIDENCE_SET_REF));
  assert.match(phrase, new RegExp(DURABLE_SERVICE_REF));
  assert.doesNotMatch(phrase, /<privateSourceEvidenceSetReference>/);
  assert.doesNotMatch(phrase, /<durableServiceReference>/);
  assert.doesNotMatch(phrase, /<referencePrepPacketSha256>/);
  assert.match(phrase, /liveDurableServiceQualified must remain false/);
  assert.match(phrase, /No provider\/env\/resource\/billing changes/);
});

test('every bound source drift blocks reference prep', () => {
  for (const source of SOURCES) {
    assert.equal(checkPacket(packet(), {
      readSource: file => file === source
        ? Buffer.concat([readSource(file), Buffer.from('\ndrift')])
        : readSource(file),
    }).ok, false, source);
  }
});

test('hostile inputs are rejected without leaking private-looking sentinels', () => {
  let calls = 0;
  const hostile = {};
  Object.defineProperty(hostile, 'controls', {
    enumerable: true,
    get() {
      calls++;
      throw Error('PRIVATE_SENTINEL');
    },
  });
  assert.equal(checkPacket(hostile).ok, false);
  assert.equal(calls, 0);
  for (const input of [null, [], 'PRIVATE_SENTINEL', { sourceBindings: {} }]) {
    const result = checkPacket(input);
    assert.equal(result.ok, false);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL/);
  }
});

test('CLI refuses execution-like arguments and reports zero effects', () => {
  for (const arg of ['--execute', '--activate', '--read-private', '--issue-command-card', 'PRIVATE_SENTINEL']) {
    const result = spawnSync(process.execPath, ['scripts/cad-auth-durable-service-reference-prep-checker.js', arg], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_SENTINEL/);
    assert.equal(JSON.parse(result.stdout).effectsExecuted, 0);
  }
});
