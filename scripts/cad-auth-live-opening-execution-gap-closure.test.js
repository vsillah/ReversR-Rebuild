const { test } = require('node:test');
const assert = require('node:assert/strict');
const { harness, expiresUtc } = require('./cad-auth-prod-runtime-mount-fixture');
const { createCadProductionExecutionBinding, BOUNDED_SESSION_REF } =
  require('../server/cadProductionExecutionBinding');
const { createCadProductionExecutableRuntimeMount } =
  require('../server/cadProductionExecutableRuntimeMountCompletion');
const { CLEANUP_EFFECTS } = require('../server/cadLiveOpeningExecutableRuntimeWiring');

function setup(h = harness(), changes = {}) {
  const input = { ...h.options, boundedSessionRef: BOUNDED_SESSION_REF,
    sessionId: h.card.sessionId, durableEvidenceSha256: h.card.durableEvidenceSha256,
    durableService: h.adapter, ...changes };
  const executableRuntime = createCadProductionExecutionBinding(input);
  const mount = createCadProductionExecutableRuntimeMount({ executableRuntime,
    createRouter: options => options.liveOpeningRuntimeMount });
  return { h, input, mount, executableRuntime };
}
async function gate({ h, mount }) {
  const input = { bodyAdmissionAuthorized: false, principal: h.principal };
  const admissionDecision = await mount.admissionSwitch.decide(input);
  return mount.routeBodyGate.authorizeBodyRead({ ...input, admissionDecision });
}

test('production binding has no implicit activation or effects', async () => {
  assert.deepEqual(createCadProductionExecutionBinding(), { enabled: false });
  const h = harness();
  const s = setup(h, { enabled: false });
  assert.equal((await gate(s)).bodyReadAuthorized, false);
  assert.deepEqual(h.events, []);
});

test('exact binding traverses the production mount; rollback smoke closes it without body IO', async () => {
  const s = setup();
  assert.equal((await gate(s)).routeBodyGateAuthorized, true);
  assert.ok(s.h.events.every(e => e.input.boundedSessionRef === BOUNDED_SESSION_REF));
  const result = await s.mount.routeBodyGate.afterBodyAdmission();
  assert.equal(result.rollbackVerified, true);
  assert.equal(result.bodyReadAuthorized, false);
  assert.deepEqual(s.h.events.slice(-3).map(e => e.operation), CLEANUP_EFFECTS);
  assert.equal((await gate(s)).code, 'ATTEMPT_ALREADY_SPENT');
});

test('card bytes, SHA, deployment, session ref, session id and evidence mismatches stay disabled', async () => {
  for (const change of [ { commandCardBytes: '{}' }, { commandCardSha256: '0'.repeat(64) },
    { currentDeploymentReference: 'wrong' }, { boundedSessionRef: 'wrong' },
    { sessionId: 'wrong' }, { durableEvidenceSha256: '0'.repeat(64) },
    { durableService: {} }, { now: 42 } ]) {
    const s = setup(harness(), change);
    assert.equal(s.executableRuntime.enabled, false);
    assert.equal((await gate(s)).bodyReadAuthorized, false);
    assert.equal(s.h.events.length, 0);
  }
});

test('unknown claim and rollback-arm outcomes trigger all cleanup effects and prohibit retry', async () => {
  for (const failAt of ['claimRun', 'armRollback', 'claimAttempt', 'openFence', 'consumeAttempt']) {
    const h = harness({ mutate(operation) { if (operation === failAt) throw Error('PRIVATE_SENTINEL'); } });
    const s = setup(h);
    const result = await gate(s);
    assert.equal(result.bodyReadAuthorized, false);
    assert.equal(result.rollbackVerified, true, failAt);
    assert.deepEqual(h.events.slice(-3).map(e => e.operation), CLEANUP_EFFECTS);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL/);
    assert.equal((await gate(s)).code, 'ATTEMPT_ALREADY_SPENT');
  }
});

test('expiry during final await is rejected and cleanup runs after expiry', async () => {
  let stamp = Date.parse(expiresUtc) - 1000;
  const h = harness({ now: () => stamp, mutate(operation) {
    if (operation === 'consumeAttempt') stamp = Date.parse(expiresUtc);
  } });
  const s = setup(h);
  const result = await gate(s);
  assert.equal(result.bodyReadAuthorized, false);
  assert.equal(result.rollbackVerified, true);
});

test('independent clock regression, deployment drift and false durability receipts stop the gate', async () => {
  for (const failAt of ['clock', 'deployment', 'durability']) {
    let stamp = Date.parse(expiresUtc) - 1000;
    const h = harness({ now: () => stamp, mutate(operation, receipt) {
      if (failAt === 'clock' && operation === 'verifyApproval') stamp -= 1;
      if (failAt === 'deployment' && operation === 'recheckDeployment') receipt.immutableCurrent = false;
      if (failAt === 'durability' && operation === 'claimRun') receipt.expiryCheckedAtomically = false;
    } });
    assert.equal((await gate(setup(h))).bodyReadAuthorized, false, failAt);
  }
});

test('two independent mounts share a durable one-run fence', async () => {
  const ledger = new Set(); // Synthetic shared ledger, never production durability evidence.
  const first = setup(harness({ ledger }));
  const second = setup(harness({ ledger }));
  const results = await Promise.all([gate(first), gate(second)]);
  assert.equal(results.filter(r => r.bodyReadAuthorized).length, 1);
  await first.mount.routeBodyGate.afterBodyAdmission();
  await second.mount.routeBodyGate.afterBodyAdmission();
});

test('all cleanup effects are attempted when close or revoke fails; smoke failure remains unknown', async () => {
  for (const failAt of CLEANUP_EFFECTS) {
    const h = harness({ mutate(operation) { if (operation === failAt) throw Error('PRIVATE_SENTINEL'); } });
    const s = setup(h);
    await gate(s);
    const result = await s.mount.routeBodyGate.afterBodyAdmission();
    assert.equal(result.rollbackVerified, false);
    assert.equal(result.unknownOutcome, true);
    assert.equal(result.code, 'ROLLBACK_OR_SMOKE_UNKNOWN_NO_RETRY');
    assert.deepEqual(h.events.slice(-3).map(e => e.operation), CLEANUP_EFFECTS);
  }
});

test('binding captures service methods and primitives against later input mutation', async () => {
  const s = setup();
  s.input.sessionId = 'changed';
  s.h.adapter.claimRun = () => { throw Error('changed'); };
  assert.equal((await gate(s)).bodyReadAuthorized, true);
  await s.mount.routeBodyGate.afterBodyAdmission();
});

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { PACKET, SOURCES, checkPacket, approvalPhrase } = require('./cad-auth-live-opening-execution-gap-closure-checker');
const root = path.resolve(__dirname, '..');
const readSource = file => fs.readFileSync(path.join(root, file));
test('execution-gap packet validates current source bindings and refuses hostile inputs', () => {
  const packet = JSON.parse(readSource(PACKET));
  const result = checkPacket(packet);
  assert.equal(result.ok, true);
  assert.equal(result.effectsExecuted, 0);
  for (const source of SOURCES) {
    assert.equal(checkPacket(packet, { readSource: file => file === source
      ? Buffer.concat([readSource(file), Buffer.from('drift')]) : readSource(file) }).ok, false);
  }
  let calls = 0;
  const hostile = {};
  Object.defineProperty(hostile, 'controls', { enumerable: true, get() { calls++; throw Error('PRIVATE_SENTINEL'); } });
  assert.equal(checkPacket(hostile).ok, false);
  assert.equal(calls, 0);
  assert.match(approvalPhrase(), /<executionGapClosurePacketSha256>/);
  assert.match(approvalPhrase(), /<durableServiceReference>/);
});

test('checker rejects live execution, issuance and arbitrary paths', () => {
  for (const arg of ['--execute', '--activate', '--issue-command-card', 'PRIVATE_SENTINEL']) {
    const run = spawnSync(process.execPath, ['scripts/cad-auth-live-opening-execution-gap-closure-checker.js', arg],
      { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL/);
    assert.equal(JSON.parse(run.stdout).effectsExecuted, 0);
  }
});


test('session-ref mapping must be attested by the service, and hostile bindings stay sanitized', async () => {
  const h = harness({ mutate(operation, receipt) {
    if (operation === 'verifySession') delete receipt.boundedSessionRef;
  } });
  const result = await gate(setup(h));
  assert.equal(result.bodyReadAuthorized, false);
  assert.equal(result.rollbackVerified, true);
  const input = { get enabled() { throw Error('PRIVATE_SENTINEL'); } };
  assert.deepEqual(createCadProductionExecutionBinding(input), { enabled: false });
});

test('production entry supplies the disabled factory before general body parsing', () => {
  const source = readSource('server/index.js').toString();
  assert.match(source, /createCadLiveOpeningGateCredentialClosure\(\)/);
  assert.match(source, /cadLiveGateCredentialClosure\.executableRuntime/);
  assert.match(source, /\|\| createCadProductionExecutionBinding\(\)/);
  assert.ok(source.indexOf('cadLiveGateCredentialClosure.executableRuntime')
    < source.indexOf('app.use(express.json'));
  const binding = readSource('server/cadProductionExecutionBinding.js').toString();
  const sourceBinding = readSource('server/cadProductionExecutionBindingSource.js').toString();
  assert.match(binding, /createCadProductionExecutionBindingSource\(\)/);
  assert.match(sourceBinding, /const PRODUCTION_EXECUTION_BINDING_SOURCE = null;/);
  assert.doesNotMatch(binding, /process\.env|node:fs|child_process|fetch\s*\(|https?\.request|\.listen\s*\(/);
  assert.doesNotMatch(sourceBinding, /process\.env|node:fs|child_process|fetch\s*\(|https?\.request|\.listen\s*\(/);
});
