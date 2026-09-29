const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const {
  PACKET,
  SOURCES,
  REQUIRED_CAPABILITIES,
  checkPacket,
  approvalPhrase,
} = require('./cad-auth-durable-service-qualification-review-plan-checker');

const root = path.resolve(__dirname, '..');
const readSource = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(readSource(PACKET));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('historical review plan is stale after production execution binding finalization', () => {
  const p = packet();
  const result = checkPacket(p);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'QUALIFICATION_REVIEW_PLAN_BLOCKED');
  assert.equal(result.effectsExecuted, 0);
  assert.equal(p.repairedInventoryReviewSha256, '3e18bdf6c31901ea172997c0ea155ba101676af9a1c60a4db827c12d6c79f181');
  assert.equal(p.repairedInventoryReviewReceiptSha256, '02657eeff430a73599fc4c2d74fe0f97f10bcb1d6b7c4e039535fe00f8cf44ff');
  assert.equal(p.acceptedInventoryBinding.acceptedArtifactCount, 9);
  assert.equal(p.acceptedInventoryBinding.blockers, 0);
  assert.equal(p.acceptedInventoryBinding.repairedSessionBindingReplacementAccepted, true);
  assert.equal(p.acceptedInventoryBinding.liveDurableServiceQualified, false);
  assert.equal(p.acceptedInventoryBinding.productionExecutionBinding, null);
  assert.deepEqual(p.qualificationReviewPlan.requiredCapabilities, [...REQUIRED_CAPABILITIES]);
  assert.equal(p.controls.liveDurableServiceQualified, false);
  assert.equal(p.controls.productionExecutionBinding, null);
  assert.equal(p.controls.effectsExecuted, 0);
});

test('authority and binding mutations block', () => {
  for (const key of Object.keys(packet().controls)) {
    const p = packet();
    p.controls[key] = key === 'productionExecutionBinding' ? 'rrb-ref:bad' : true;
    assert.equal(checkPacket(p).ok, false, key);
  }
  for (const change of [
    { repairedInventoryReviewSha256: 'a'.repeat(64) },
    { repairedInventoryReviewReceiptSha256: 'b'.repeat(64) },
    { sourceEvidenceSetReference: 'rrb-ref:other' },
    { durableServiceReference: 'rrb-ref:other' },
    { gapPlanPacketSha256: 'c'.repeat(64) },
    { nextGate: 'LIVE_GATE' },
    { extra: true },
  ]) {
    assert.equal(checkPacket({ ...packet(), ...change }).ok, false);
  }
  for (const key of Object.keys(packet())) {
    const p = packet();
    delete p[key];
    assert.equal(checkPacket(p).ok, false, key);
  }
});

test('accepted inventory binding cannot be upgraded into qualification', () => {
  for (const change of [
    { liveDurableServiceQualified: true },
    { productionExecutionBinding: 'rrb-ref:binding' },
    { blockers: 1 },
    { acceptedArtifactCount: 8 },
    { repairedSessionBindingReplacementAccepted: false },
  ]) {
    const p = packet();
    p.acceptedInventoryBinding = { ...p.acceptedInventoryBinding, ...change };
    assert.equal(checkPacket(p).ok, false, JSON.stringify(change));
  }
});

test('source closure drift and private path reads block', () => {
  for (const source of SOURCES) {
    assert.equal(checkPacket(packet(), { readSource: file => file === source
      ? Buffer.concat([readSource(file), Buffer.from('\ndrift')])
      : readSource(file) }).ok, false, source);
  }
  const reads = [];
  assert.equal(checkPacket(packet(), { readSource: file => { reads.push(file); return readSource(file); } }).ok, false);
  assert.equal(reads.some(file => file.startsWith('.local/') || file.includes('..')), false);
  assert.equal(reads.some(file => file.includes('private') && file.startsWith('.local/')), false);
});

test('next phrase is unavailable for stale review plan', () => {
  const bytes = readSource(PACKET);
  assert.ok(sha(bytes));
  assert.throws(() => approvalPhrase(bytes), /^Error: QUALIFICATION_REVIEW_PLAN_BLOCKED$/);
  assert.throws(() => approvalPhrase(Buffer.from(JSON.stringify({ ...packet(), controls: { ...packet().controls, runtimeActivationAuthorized: true } }))));
});

test('CLI stays blocked for stale packet and rejects private or live modes', () => {
  const write = spawnSync(process.execPath, ['scripts/cad-auth-durable-service-qualification-review-plan-checker.js', '--write'], { cwd: root, encoding: 'utf8' });
  assert.equal(write.status, 1);
  assert.equal(JSON.parse(write.stdout).effectsExecuted, 0);
  for (const arg of ['--read-private', '--qualify', '--activate', '--issue-command-card', '/private/PRIVATE_SENTINEL']) {
    const result = spawnSync(process.execPath, ['scripts/cad-auth-durable-service-qualification-review-plan-checker.js', arg], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_SENTINEL/);
    assert.equal(JSON.parse(result.stdout).effectsExecuted, 0);
  }
});

test('hostile inputs fail closed without private sentinel disclosure', () => {
  let calls = 0;
  const hostile = {};
  Object.defineProperty(hostile, 'controls', { enumerable: true, get() { calls++; throw Error('PRIVATE_SENTINEL'); } });
  for (const input of [hostile, null, [], 'PRIVATE_SENTINEL', { controls: {} }]) {
    const result = checkPacket(input);
    assert.equal(result.ok, false);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL/);
  }
  assert.equal(calls, 0);
});
