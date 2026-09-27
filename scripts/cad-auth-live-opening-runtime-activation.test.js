const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { createCadLiveOpeningRuntimeActivation: create, METHODS } = require('../server/cadLiveOpeningRuntimeActivation');
const { currentDeploymentCommandCardDraft } = require('../offline/cad-auth-live-opening-current-deployment-rebind/preparation');

function harness({ ledger = new Set(), change = () => {}, now } = {}) {
  const card = currentDeploymentCommandCardDraft();
  const bytes = JSON.stringify(card);
  let stamp = Date.parse(card.openingWindow.startUtc) + 1000;
  const events = [];
  const adapter = Object.fromEntries(METHODS.map(operation => [operation, async input => {
    events.push({ operation, input });
    const receipt = { ...input, operation, ok: true, durable: true, expiryCheckedAtomically: true,
      explicitLiveGateApproved: true, evidenceSha256: card.evidencePacketSha256,
      independentExpiryEnforced: true, atomicClaims: true, durableRollbackEnforced: true,
      immutableCurrent: true, failClosed: true, armed: true, bounded: true, concurrentSessions: 1,
      open: true, consumed: true, closed: true, revoked: true, bodyReads: 0, sessionGrants: 0, fenceClosed: true,
    };
    if (operation === 'claimRun' || operation === 'claimAttempt') {
      const key = input.runFenceKey + operation;
      receipt.claimed = !ledger.has(key);
      ledger.add(key);
    }
    await change(operation, receipt, input);
    return receipt;
  }]));
  const options = { enabled: true, commandCardBytes: bytes,
    commandCardSha256: createHash('sha256').update(bytes).digest('hex'),
    sessionId: 'synthetic-session', durableEvidenceSha256: card.evidencePacketSha256,
    adapter, now: now || (() => stamp),
  };
  return { options, events, card, setTime: value => { stamp = value; } };
}

test('default disabled and malformed exact bytes never call adapters', async () => {
  const h = harness();
  assert.equal((await create({ ...h.options, enabled: false }).runActivation()).code, 'RUNTIME_ACTIVATION_DISABLED');
  for (const patch of [
    { commandCardBytes: h.options.commandCardBytes + '\n' },
    { commandCardSha256: '0'.repeat(64) }, { durableEvidenceSha256: '0'.repeat(64) },
    { sessionId: '' }, { adapter: {} }, { commandCardBytes: '{' },
  ]) assert.equal((await create({ ...h.options, ...patch }).runActivation()).code, 'RUNTIME_ACTIVATION_INPUTS_INVALID');
  assert.equal(h.events.length, 0);
});

test('exact binding executes fenced control plane and mandatory rollback without body authority', async () => {
  const h = harness();
  const mount = create(h.options);
  const result = await mount.runActivation();
  assert.equal(result.controlPlaneCompleted, true);
  assert.equal(result.rollbackVerified, true);
  assert.equal(result.bodyReadAuthorized, false);
  assert.equal((await mount.admissionSwitch.decide()).bodyReadAuthorized, false);
  assert.deepEqual(h.events.map(x => x.operation), [
    'verifyApproval', 'verifyDurableEvidence', 'recheckDeployment', 'verifyClosedBaseline',
    'claimRun', 'armRollback', 'verifySession', 'claimAttempt', 'recheckDeployment', 'openFence',
    'consumeAttempt', 'closeFence', 'revokeSessionAndLateGrants', 'postRollbackSmoke',
  ]);
  for (const { input } of h.events) {
    assert.equal(Object.isFrozen(input), true);
    assert.equal(input.bodyReadAuthorized, false);
    assert.equal(Number.isFinite(input.checkedAtMs), true);
  }
  assert.equal((await mount.runActivation()).code, 'ATTEMPT_ALREADY_SPENT');
});

test('concurrent callers and recreated controllers share a permanent durable run fence', async () => {
  const ledger = new Set();
  const a = harness({ ledger }); const b = harness({ ledger });
  const mount = create(a.options);
  const results = await Promise.all([mount.runActivation(), mount.runActivation(), create(b.options).runActivation()]);
  assert.equal(results.filter(x => x.controlPlaneCompleted).length, 1);
  assert.equal(b.events.some(x => ['armRollback', 'openFence', 'closeFence'].includes(x.operation)), false);
  const c = harness({ ledger });
  c.options.sessionId = 'another-session';
  assert.equal((await create(c.options).runActivation()).controlPlaneCompleted, false);
  assert.equal(c.events.some(x => x.operation === 'openFence'), false);
});

test('every bad or unknown effect stops forward progress and cannot be retried', async () => {
  for (const method of METHODS) {
    const h = harness({ change(name, receipt) { if (name === method) receipt.ok = false; } });
    const mount = create(h.options);
    const result = await mount.runActivation();
    assert.equal(result.controlPlaneCompleted, false, method);
    assert.equal((await mount.runActivation()).code, 'ATTEMPT_ALREADY_SPENT');
    if (result.rollbackRequired) assert.deepEqual(h.events.slice(-3).map(x => x.operation),
      ['closeFence', 'revokeSessionAndLateGrants', 'postRollbackSmoke']);
  }
  const h = harness({ change(name) { if (name === 'openFence') throw Error('PRIVATE_SENTINEL'); } });
  const result = await create(h.options).runActivation();
  assert.equal(result.rollbackVerified, true);
  assert.equal(result.unknownOutcome, true);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL/);
});

test('missing evidence, stale deployment and unbound receipts cannot open', async () => {
  for (const [method, field, value] of [
    ['verifyApproval', 'explicitLiveGateApproved', false], ['verifyApproval', 'commandCardSha256', '0'.repeat(64)],
    ['verifyApproval', 'expiresUtc', '2000-01-01T00:00:00Z'],
    ['verifyDurableEvidence', 'atomicClaims', false], ['verifyDurableEvidence', 'evidenceSha256', '0'.repeat(64)],
    ['verifyDurableEvidence', 'durableRollbackEnforced', false],
    ['recheckDeployment', 'deploymentReference', 'stale'], ['recheckDeployment', 'immutableCurrent', false],
    ['verifySession', 'sessionId', 'different-session'], ['verifySession', 'concurrentSessions', 2],
    ['claimAttempt', 'expiryCheckedAtomically', false], ['claimRun', 'durable', false],
    ['armRollback', 'armed', false],
  ]) {
    const h = harness({ change(name, receipt) { if (name === method) receipt[field] = value; } });
    assert.equal((await create(h.options).runActivation()).controlPlaneCompleted, false, `${method}.${field}`);
    assert.equal(h.events.some(x => x.operation === 'openFence'), false);
  }
});

test('second immutable deployment recheck catches deployment changes during preparation', async () => {
  let checks = 0;
  const h = harness({ change(name, receipt) {
    if (name === 'recheckDeployment' && ++checks === 2) receipt.deploymentReference = 'stale';
  } });
  const result = await create(h.options).runActivation();
  assert.equal(result.rollbackVerified, true);
  assert.equal(h.events.some(x => x.operation === 'openFence'), false);
});

test('expiry after each forward effect stops the next effect but never prevents rollback', async () => {
  for (const method of METHODS.filter(x => !['closeFence', 'revokeSessionAndLateGrants', 'postRollbackSmoke'].includes(x))) {
    const h = harness({ change(name) { if (name === method) h.setTime(Date.parse(h.card.openingWindow.expiresUtc)); } });
    const result = await create(h.options).runActivation();
    assert.equal(result.controlPlaneCompleted, false, method);
    if (result.rollbackRequired) {
      assert.equal(result.rollbackVerified, true);
      assert.ok(h.events.slice(-3).every(x => x.input.inWindow === false && x.input.cleanup === true));
    }
  }
  for (const offset of [-1, 30 * 60000]) {
    const h = harness(); h.setTime(Date.parse(h.card.openingWindow.startUtc) + offset);
    await create(h.options).runActivation(); assert.equal(h.events.length, 0);
  }
});

test('clock rollback, invalid clock and clock exceptions deny forward effects', async () => {
  for (const bad of [NaN, -1, 'throw']) {
    let count = 0;
    const h = harness({ now: () => {
      if (++count > 14) { if (bad === 'throw') throw Error('clock'); return bad; }
      return Date.parse('2026-09-27T18:00:01Z');
    } });
    const result = await create(h.options).runActivation();
    assert.equal(result.controlPlaneCompleted, false);
    assert.equal(result.rollbackVerified, true);
  }
});

test('post-rollback smoke is compulsory and failure forbids a success claim', async () => {
  const h = harness({ change(name, receipt) { if (name === 'postRollbackSmoke') receipt.bodyReads = 1; } });
  const result = await create(h.options).runActivation();
  assert.equal(result.code, 'ROLLBACK_OR_SMOKE_UNKNOWN_NO_RETRY');
  assert.equal(result.rollbackVerified, false);
  assert.equal(result.controlPlaneCompleted, false);
});

test('manifest validates exact sources and rejects drift and hostile data', () => {
  const fs = require('node:fs'); const path = require('node:path');
  const { PACKET, SOURCES, checkPacket } = require('./cad-auth-live-opening-runtime-activation-checker');
  const root = path.resolve(__dirname, '..');
  const readSource = file => fs.readFileSync(path.join(root, file));
  const packet = JSON.parse(readSource(PACKET));
  assert.equal(checkPacket(packet).ok, true);
  for (const source of SOURCES) {
    assert.equal(checkPacket(packet, { readSource(file) {
      return file === source ? Buffer.concat([readSource(file), Buffer.from('\n')]) : readSource(file);
    } }).ok, false);
  }
  let calls = 0;
  const hostile = {}; Object.defineProperty(hostile, 'packet', { enumerable: true, get() { calls++; throw Error('private'); } });
  assert.equal(checkPacket(hostile).ok, false); assert.equal(calls, 0);
});

test('checker refuses activation, issuance and arbitrary paths without reflecting arguments', () => {
  const { spawnSync } = require('node:child_process');
  for (const args of [['--live'], ['--activate'], ['--execute'], ['--issue-command-card'], ['PRIVATE_SENTINEL'], ['--write', 'PRIVATE_SENTINEL']]) {
    const run = spawnSync(process.execPath, ['scripts/cad-auth-live-opening-runtime-activation-checker.js', ...args], { encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL/);
    assert.equal(JSON.parse(run.stdout).effectsExecuted, 0);
  }
});
