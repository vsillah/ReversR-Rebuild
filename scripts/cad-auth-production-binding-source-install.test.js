const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { harness, expiresUtc } = require('./cad-auth-prod-runtime-mount-fixture');
const {
  PRODUCTION_BINDING_INSTALLATION,
  createProductionBindingInstallation,
} = require('../server/cadProductionExecutionBindingInstallation');
const { resolveCadProductionExecutionBindingSource: resolve } = require('../server/cadProductionExecutionBindingSourceInstall');
const { createCadProductionExecutionBindingSource, BOUNDED_SESSION_REF } = require('../server/cadProductionExecutionBindingSource');
const { createCadProductionExecutionBinding } = require('../server/cadProductionExecutionBinding');
const { createCadProductionExecutableRuntimeMount } = require('../server/cadProductionExecutableRuntimeMountCompletion');
const { FORWARD_EFFECTS, CLEANUP_EFFECTS, METHODS } = require('../server/cadLiveOpeningExecutableRuntimeWiring');
const sha = value => createHash('sha256').update(value).digest('hex');

function fixture(h = harness()) {
  const manifest = {
    schemaVersion: 1,
    commandCardBytes: h.commandCardBytes,
    commandCardSha256: h.commandCardSha256,
    currentDeploymentReference: h.options.currentDeploymentReference,
    boundedSessionRef: BOUNDED_SESSION_REF,
    sessionId: h.card.sessionId,
    durableEvidenceSha256: h.card.durableEvidenceSha256,
    durableServiceRef: 'rrb-ref:synthetic-service',
  };
  const exact = { ...manifest, startUtc: h.card.openingWindow.startUtc, expiresUtc: h.card.openingWindow.expiresUtc };
  return { h, installation: {
    enabled: true, manifest,
    liveGate: { explicitLiveOpeningApproved: true, installationSha256: sha(JSON.stringify(exact)) },
    durableAdapter: { serviceRef: manifest.durableServiceRef,
      evidenceSha256: manifest.durableEvidenceSha256, service: h.adapter },
  } };
}
function mount(f) {
  const input = resolve(f.installation, f.h.options.now);
  return createCadProductionExecutableRuntimeMount({
    executableRuntime: createCadProductionExecutionBinding(createCadProductionExecutionBindingSource(input)),
    createRouter: options => options.liveOpeningRuntimeMount,
  });
}
async function gate(f, runtime) {
  const input = { bodyAdmissionAuthorized: false, principal: f.h.principal };
  const admissionDecision = await runtime.admissionSwitch.decide(input);
  return runtime.routeBodyGate.authorizeBodyRead({ ...input, admissionDecision });
}

test('production default path stays closed without service effects', () => {
  assert.equal(PRODUCTION_BINDING_INSTALLATION.enabled, false);
  assert.equal(PRODUCTION_BINDING_INSTALLATION.manifest.schemaVersion, 1);
  assert.equal(PRODUCTION_BINDING_INSTALLATION.liveGate.explicitLiveOpeningApproved, false);
  assert.equal(PRODUCTION_BINDING_INSTALLATION.durableAdapter.serviceRef,
    PRODUCTION_BINDING_INSTALLATION.manifest.durableServiceRef);
  assert.equal(PRODUCTION_BINDING_INSTALLATION.durableAdapter.evidenceSha256,
    PRODUCTION_BINDING_INSTALLATION.manifest.durableEvidenceSha256);
  for (const name of METHODS) {
    assert.equal(typeof PRODUCTION_BINDING_INSTALLATION.durableAdapter.service[name], 'function', name);
  }
  assert.equal(resolve(), null);
  assert.equal(createCadProductionExecutionBindingSource(), null);
  assert.deepEqual(createCadProductionExecutionBinding(), { enabled: false });
});

test('source installation factory produces an exact installable binding without touching defaults', () => {
  const h = harness();
  const installation = createProductionBindingInstallation({
    enabled: true,
    explicitLiveOpeningApproved: true,
    commandCard: h.card,
    durableServiceRef: 'rrb-ref:synthetic-service',
    durableService: h.adapter,
  });
  const input = resolve(installation, h.options.now);
  assert.equal(input.enabled, true);
  assert.equal(input.commandCardSha256, h.commandCardSha256);
  assert.equal(input.currentDeploymentReference, h.options.currentDeploymentReference);
  assert.equal(input.boundedSessionRef, BOUNDED_SESSION_REF);
  assert.equal(input.sessionId, h.card.sessionId);
  assert.equal(input.durableEvidenceSha256, h.card.durableEvidenceSha256);
  assert.equal(h.events.length, 0);
  assert.equal(resolve(), null);
});

test('synthetic exact installation reaches production mount and mandatory cleanup, once only', async () => {
  const f = fixture();
  const runtime = mount(f);
  assert.equal(f.h.events.length, 0); // construction never calls service
  assert.equal((await gate(f, runtime)).routeBodyGateAuthorized, true);
  assert.deepEqual(f.h.events.map(e => e.operation), FORWARD_EFFECTS);
  assert.equal((await runtime.routeBodyGate.afterBodyAdmission()).rollbackVerified, true);
  assert.deepEqual(f.h.events.slice(-3).map(e => e.operation), CLEANUP_EFFECTS);
  assert.equal((await gate(f, runtime)).bodyReadAuthorized, false);
});

test('no-argument production factory consumes reviewed source slots in an isolated synthetic process', () => {
  const f = fixture();
  const script = `
    const assert = require('node:assert/strict');
    const { harness } = require('./scripts/cad-auth-prod-runtime-mount-fixture');
    const h = harness();
    const installation = ${JSON.stringify({ ...f.installation, durableAdapter: { ...f.installation.durableAdapter, service: null } })};
    installation.durableAdapter.service = h.adapter;
    const slots = require.resolve('./server/cadProductionExecutionBindingInstallation');
    require(slots);
    require.cache[slots].exports = { PRODUCTION_BINDING_INSTALLATION: installation };
    const { createCadProductionExecutionBinding } = require('./server/cadProductionExecutionBinding');
    assert.equal(createCadProductionExecutionBinding().enabled, true);
    assert.equal(h.events.length, 0);
  `;
  const result = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('every exact binding field and missing approval or adapter stay closed', () => {
  for (const key of Object.keys(fixture().installation.manifest)) {
    const f = fixture();
    f.installation.manifest[key] = 'wrong';
    assert.equal(resolve(f.installation, f.h.options.now), null, key);
    assert.equal(f.h.events.length, 0);
  }
  for (const mutate of [
    i => { i.enabled = false; },
    i => { i.liveGate = null; },
    i => { i.liveGate.explicitLiveOpeningApproved = false; },
    i => { i.liveGate.installationSha256 = '0'.repeat(64); },
    i => { i.durableAdapter = null; },
    i => { i.durableAdapter.serviceRef = 'wrong'; },
    i => { i.durableAdapter.evidenceSha256 = '0'.repeat(64); },
    ...METHODS.map(name => i => { delete i.durableAdapter.service[name]; }),
  ]) {
    const f = fixture(); mutate(f.installation);
    assert.equal(resolve(f.installation, f.h.options.now), null);
    assert.equal(f.h.events.length, 0);
  }
});

test('literal byte drift rejects even if JSON has the same meaning', () => {
  const f = fixture(); f.installation.manifest.commandCardBytes += ' ';
  assert.equal(resolve(f.installation, f.h.options.now), null);
});

test('installation expiry and nonfinite clocks reject; prewindow install never authorizes an effect', async () => {
  for (const stamp of [Date.parse(expiresUtc), NaN, Infinity]) {
    const f = fixture(); assert.equal(resolve(f.installation, () => stamp), null);
  }
  const f = fixture(harness({ now: () => Date.parse('2029-01-01T00:00:00Z') }));
  assert.equal((await gate(f, mount(f))).bodyReadAuthorized, false);
  assert.equal(f.h.events.length, 0);
});

test('installed capability and primitives are captured against later slot mutation', async () => {
  const f = fixture(); const runtime = mount(f);
  f.installation.manifest.sessionId = 'wrong';
  f.installation.durableAdapter.service.verifyApproval = () => { throw Error('MUTATED'); };
  assert.equal((await gate(f, runtime)).routeBodyGateAuthorized, true);
  assert.equal((await runtime.routeBodyGate.afterBodyAdmission()).rollbackVerified, true);
});

test('expiry after each awaited forward effect fails closed, preserving cleanup after claims', async () => {
  for (const target of new Set(FORWARD_EFFECTS)) {
    let stamp = Date.parse(expiresUtc) - 1000;
    const f = fixture(harness({ now: () => stamp, mutate(operation) {
      if (operation === target) stamp = Date.parse(expiresUtc);
    } }));
    const runtime = mount(f); const result = await gate(f, runtime);
    assert.equal(result.bodyReadAuthorized, false, target);
    assert.equal((await gate(f, runtime)).bodyReadAuthorized, false);
    if (result.rollbackRequired) assert.deepEqual(f.h.events.slice(-3).map(e => e.operation), CLEANUP_EFFECTS);
  }
});

test('independent installed mounts require the shared durable fence', async () => {
  const ledger = new Set();
  const a = fixture(harness({ ledger })); const b = fixture(harness({ ledger }));
  const ma = mount(a); const mb = mount(b);
  const results = await Promise.all([gate(a, ma), gate(b, mb)]);
  assert.equal(results.filter(r => r.bodyReadAuthorized).length, 1);
  await ma.routeBodyGate.afterBodyAdmission(); await mb.routeBodyGate.afterBodyAdmission();
});

test('false evidence, stale deployment and unknown cleanup receipts block through installed path', async () => {
  for (const target of ['verifyDurableEvidence', 'recheckDeployment', 'claimRun', ...CLEANUP_EFFECTS]) {
    const f = fixture(harness({ mutate(operation) { if (operation === target) throw Error('PRIVATE_SENTINEL'); } }));
    const runtime = mount(f); const opened = await gate(f, runtime);
    const result = CLEANUP_EFFECTS.includes(target) ? await runtime.routeBodyGate.afterBodyAdmission() : opened;
    assert.equal(result.bodyReadAuthorized, false);
    if (CLEANUP_EFFECTS.includes(target)) assert.equal(result.rollbackVerified, false);
    assert.equal((await gate(f, runtime)).bodyReadAuthorized, false);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL/);
  }
});

test('checker validates scoped packet, rejects drift and never accepts live or path arguments', () => {
  const checker = require('./cad-auth-production-binding-source-install-checker');
  const fs = require('node:fs');
  const packet = JSON.parse(fs.readFileSync(checker.PACKET));
  assert.equal(checker.checkPacket(packet).ok, true);
  for (const file of checker.SOURCES) {
    assert.equal(checker.checkPacket(packet, p => Buffer.concat([
      fs.readFileSync(p), Buffer.from(p === file ? 'drift' : ''),
    ])).ok, false, file);
  }
  for (const args of [['--execute'], ['--live'], ['--activate'], ['--issue-command-card'], ['PRIVATE_SENTINEL']]) {
    const r = spawnSync(process.execPath, ['scripts/cad-auth-production-binding-source-install-checker.js', ...args], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.equal(JSON.parse(r.stdout).effectsExecuted, 0);
    assert.doesNotMatch(r.stdout + r.stderr, /PRIVATE_SENTINEL/);
  }
});
