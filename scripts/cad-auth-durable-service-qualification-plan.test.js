const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { PACKET, SOURCES, checkPacket, approvalPhrase } = require('./cad-auth-durable-service-qualification-plan-checker');
const root = path.resolve(__dirname, '..');
const readSource = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(readSource(PACKET));

test('plan cannot promote synthetic validation to service qualification or authority', () => {
  assert.equal(checkPacket(packet()).ok, true);
  for (const changes of [{ liveDurableServiceQualified: true }, { productionExecutionBinding: {} },
    { executableCommandCardIssued: true }, { privateEvidenceRead: true },
    { durableServiceReference: 'rrb-ref:invented-service' }, { extra: true }]) {
    assert.equal(checkPacket({ ...packet(), ...changes }).ok, false);
  }
  for (const key of Object.keys(packet().controls)) {
    const changed = packet();
    changed.controls[key] = key === 'effectsExecuted' ? 1 : true;
    assert.equal(checkPacket(changed).ok, false, key);
  }
});
test('every bound source drift blocks the plan, including its historical closure ancestry', () => {
  for (const source of SOURCES) {
    assert.equal(checkPacket(packet(), { readSource: file => file === source
      ? Buffer.concat([readSource(file), Buffer.from('\ndrift')]) : readSource(file) }).ok, false, source);
  }
});
test('hostile inputs are rejected without invoking getters or leaking their values', () => {
  let calls = 0;
  const hostile = {};
  Object.defineProperty(hostile, 'controls', { enumerable: true, get() { calls++; throw Error('PRIVATE_SENTINEL'); } });
  assert.equal(checkPacket(hostile).ok, false);
  assert.equal(calls, 0);
  for (const input of [null, [], 'PRIVATE_SENTINEL', { sourceBindings: {} }]) {
    assert.equal(checkPacket(input).ok, false);
    assert.doesNotMatch(JSON.stringify(checkPacket(input)), /PRIVATE_SENTINEL/);
  }
});
test('approval binds final bytes and has only user-owned private reference placeholders', () => {
  const phrase = approvalPhrase(readSource(PACKET));
  assert.deepEqual(phrase.match(/<[^>]+>/g), ['<privateSourceEvidenceSetReference>', '<durableServiceReference>']);
  assert.match(phrase, /liveDurableServiceQualified must remain false/);
  assert.match(phrase, /No provider\/env\/resource\/billing changes/);
  assert.throws(() => approvalPhrase(JSON.stringify({ ...packet(), liveDurableServiceQualified: true })));
});
test('CLI denies arbitrary paths and live operations with sanitized zero-effect output', () => {
  for (const arg of ['--execute', '--activate', '--qualify', '--issue-command-card', 'PRIVATE_SENTINEL']) {
    const result = spawnSync(process.execPath, ['scripts/cad-auth-durable-service-qualification-plan-checker.js', arg], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_SENTINEL/);
    assert.equal(JSON.parse(result.stdout).effectsExecuted, 0);
  }
});
