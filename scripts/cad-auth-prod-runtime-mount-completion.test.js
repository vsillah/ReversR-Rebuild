const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { createCadLiveOpeningExecutableRuntimeBootstrap } = require('../server/cadLiveOpeningExecutableRuntimeBootstrap');
const { FORWARD_EFFECTS, CLEANUP_EFFECTS } = require('../server/cadLiveOpeningExecutableRuntimeWiring');
const { harness, expiresUtc } = require('./cad-auth-prod-runtime-mount-fixture');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'server/index.js'), 'utf8');

// Execute the actual production mount block without initializing other server providers.
function mount(options) {
  const first = source.indexOf('const cadLiveOpeningRuntime =');
  const last = source.indexOf('\napp.use(cors(', first);
  assert.ok(first > 0 && last > first);
  let passed, runtime;
  const sessionService = {};
  vm.runInNewContext(source.slice(first, last), {
    createCadLiveOpeningExecutableRuntimeBootstrap(...args) {
      assert.equal(args.length, 0, 'production must not supply live inputs');
      runtime = createCadLiveOpeningExecutableRuntimeBootstrap(options);
      return runtime;
    },
    createCadUserUploadRouter(input) { passed = input; return 'router'; },
    configuredCorsOrigins: [], cadUploadSessionRuntime: { sessionService },
    app: { use(route, router) { assert.equal(route, '/api/cad'); assert.equal(router, 'router'); } },
  });
  assert.equal(passed.liveOpeningRuntimeMount, runtime);
  assert.equal(passed.sessionService, sessionService);
  assert.ok(last < source.indexOf('app.use(express.json('));
  return runtime;
}
async function run(h, options = h.options, principal = h.principal) {
  const runtime = mount({ executableRuntime: options });
  const input = { bodyAdmissionAuthorized: false, principal };
  const admissionDecision = await runtime.admissionSwitch.decide(input);
  return { runtime, result: await runtime.routeBodyGate.authorizeBodyRead({ ...input, admissionDecision }) };
}

test('production mount is default closed with no body authority or adapter effects', async () => {
  const runtime = mount();
  assert.equal(runtime.enabled, false);
  assert.equal(runtime.requestBodyAdmissionReadAuthorized, false);
  assert.equal(runtime.effectsExecuted, 0);
  assert.equal((await runtime.admissionSwitch.decide()).bodyReadAuthorized, false);
  assert.equal((await runtime.routeBodyGate.authorizeBodyRead()).bodyReadAuthorized, false);
  assert.equal(fs.readFileSync(path.join(root, 'api/[...path].js'), 'utf8').trim(), "module.exports = require('../server/index');");
});

test('exact synthetic bootstrap binding reaches the mount and closes with rollback smoke', async () => {
  const h = harness();
  const { runtime, result } = await run(h);
  assert.equal(result.routeBodyGateAuthorized, true);
  assert.equal(result.commandCardSha256, h.commandCardSha256);
  assert.deepEqual(h.events.map(e => e.operation), FORWARD_EFFECTS);
  for (const { input } of h.events) {
    assert.equal(input.sessionId, h.card.sessionId);
    assert.equal(input.deploymentReference, h.card.productionDeploymentReference);
    assert.equal(input.durableEvidenceSha256, h.card.durableEvidenceSha256);
    assert.equal(input.bodyReadAuthorized, false);
  }
  assert.equal((await runtime.routeBodyGate.afterBodyAdmission()).rollbackVerified, true);
  assert.deepEqual(h.events.slice(-3).map(e => e.operation), CLEANUP_EFFECTS);
  assert.equal((await runtime.routeBodyGate.authorizeBodyRead()).code, 'ATTEMPT_ALREADY_SPENT');
});

test('digest bytes, immutable deployment, exact session and missing adapters fail closed before effects', async () => {
  for (const change of [
    h => ({ ...h.options, commandCardBytes: h.commandCardBytes + ' ' }),
    h => ({ ...h.options, commandCardSha256: '0'.repeat(64) }),
    h => ({ ...h.options, currentDeploymentReference: 'rrb-ref:stale' }),
    h => ({ ...h.options, adapter: undefined }),
    h => ({ ...h.options, adapter: { ...h.adapter, verifyDurableEvidence: undefined } }),
  ]) {
    const h = harness();
    assert.equal((await run(h, change(h))).result.bodyReadAuthorized, false);
    assert.equal(h.events.length, 0);
  }
  for (const sessionId of [undefined, 'different-session']) {
    const h = harness();
    assert.equal((await run(h, h.options, { ...h.principal, sessionId })).result.bodyReadAuthorized, false);
    assert.equal(h.events.length, 0);
  }
});

test('durable evidence and fresh deployment receipt mismatches stop before opening', async () => {
  for (const target of ['verifyDurableEvidence', 'recheckDeployment', 'verifySession', 'claimAttempt']) {
    const h = harness({ mutate(operation, receipt) {
      if (operation !== target) return;
      if (target === 'verifyDurableEvidence') receipt.evidenceSha256 = '0'.repeat(64);
      if (target === 'recheckDeployment') receipt.immutableCurrent = false;
      if (target === 'verifySession') receipt.sessionId = 'mismatch';
      if (target === 'claimAttempt') receipt.expiryCheckedAtomically = false;
    } });
    const { result } = await run(h);
    assert.equal(result.bodyReadAuthorized, false);
    assert.equal(h.events.some(e => e.operation === 'openFence'), false);
  }
});

test('deployment drift between baseline and opening rolls back before opening', async () => {
  let rechecks = 0;
  const h = harness({ mutate(operation, receipt) {
    if (operation === 'recheckDeployment' && ++rechecks === 2) receipt.deploymentReference = 'rrb-ref:stale';
  } });
  const { result } = await run(h);
  assert.equal(result.bodyReadAuthorized, false);
  assert.equal(result.rollbackVerified, true);
  assert.equal(h.events.some(e => e.operation === 'openFence'), false);
});

test('expiry is independently checked before each forward effect, cleanup still runs after expiry', async () => {
  for (let cutoff = 0; cutoff < FORWARD_EFFECTS.length; cutoff++) {
    let ticks = 0;
    const h = harness({ now: () => Date.parse(expiresUtc) + (ticks++ >= cutoff ? 0 : -1000) });
    const { result } = await run(h);
    assert.equal(result.bodyReadAuthorized, false);
    assert.deepEqual(h.events.filter(e => !e.input.cleanup).map(e => e.operation), FORWARD_EFFECTS.slice(0, cutoff));
    if (cutoff > FORWARD_EFFECTS.indexOf('armRollback')) {
      assert.equal(result.rollbackVerified, true);
      assert.deepEqual(h.events.slice(-3).map(e => e.operation), CLEANUP_EFFECTS);
    }
  }
});

test('atomic shared ledger fences a second process and unknown smoke prevents success', async () => {
  const ledger = new Set();
  const h = harness({ ledger });
  const first = await run(h);
  await first.runtime.routeBodyGate.afterBodyAdmission();
  const second = await run(harness({ ledger }));
  assert.equal(second.result.bodyReadAuthorized, false);
  const badSmoke = harness({ mutate(operation, receipt) {
    if (operation === 'postRollbackSmoke') receipt.failClosed = false;
  } });
  const opened = await run(badSmoke);
  const cleanup = await opened.runtime.routeBodyGate.afterBodyAdmission();
  assert.equal(cleanup.code, 'ROLLBACK_OR_SMOKE_UNKNOWN_NO_RETRY');
  assert.equal(cleanup.rollbackVerified, false);
  assert.equal(cleanup.retryAuthorized, false);
});

test('actual default router rejects a verified synthetic principal without body listeners or parsers', async () => {
  const { createCadUserUploadRouter } = require('../server/cadUserUploadRouter');
  const express = require('express');
  const { once } = require('node:events');
  const app = express();
  let reads = 0;
  app.use((req, res, next) => {
    const on = req.on.bind(req);
    req.on = (event, ...args) => { if (event === 'data') reads++; return on(event, ...args); };
    next();
  });
  app.use('/api/cad', createCadUserUploadRouter({ liveOpeningRuntimeMount: mount(),
    sessionService: { lookupSession: async () => ({ schemaVersion: 1, userId: 'synthetic-user', shopId: 'synthetic-shop', sessionId: 'synthetic-session', authMethod: 'password', status: 'active', expiresAt: Date.now() + 60000, transport: 'bearer', cadUploadAllowed: true }) } }));
  app.use(express.json());
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/cad/user-import`, { method: 'POST', headers: { Authorization: 'Bearer us1.' + Buffer.alloc(32, 1).toString('base64url') } });
    assert.equal((await response.json()).code, 'USER_UPLOADS_DISABLED');
    assert.equal(reads, 0);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('manifest binds every source and blocks drift, hostile input and live flags', () => {
  const { PACKET, SOURCES, checkPacket } = require('./cad-auth-prod-runtime-mount-completion-checker');
  const read = file => fs.readFileSync(path.join(root, file));
  const packet = JSON.parse(read(PACKET));
  assert.equal(checkPacket(packet).ok, true);
  for (const source of SOURCES) {
    assert.equal(checkPacket(packet, { readSource: file => file === source ? Buffer.from('drift') : read(file) }).ok, false);
  }
  const hostile = {};
  Object.defineProperty(hostile, 'value', { enumerable: true, get() { throw Error('must not invoke'); } });
  assert.equal(checkPacket(hostile).ok, false);
  assert.equal(checkPacket({ ...packet, runtimeActivationAuthorized: true }).ok, false);
  const { spawnSync } = require('node:child_process');
  for (const flag of ['--execute', '--activate', '--issue-command-card', '--live', '/private/sentinel']) {
    const child = spawnSync(process.execPath, ['scripts/cad-auth-prod-runtime-mount-completion-checker.js', flag], { cwd: root, encoding: 'utf8' });
    assert.equal(child.status, 1);
    assert.equal(JSON.parse(child.stdout).runtimeActivationAuthorized, false);
    assert.doesNotMatch(child.stdout + child.stderr, /sentinel/);
  }
});
