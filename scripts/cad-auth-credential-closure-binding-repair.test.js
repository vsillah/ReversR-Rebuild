const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { once } = require('node:events');
const express = require('express');
const closureModule = require('../server/cadLiveOpeningGateCredentialClosure');
const { readCadProductionCurrentDeploymentMetadata: readMetadata } = require('../server/cadProductionCurrentDeploymentMetadata');
const { validCurrentDeploymentMetadata: validMetadata } = require('../server/cadLiveOpeningCredentialClosureMetadataPolicy');
const { createSourceOwnedLiveOpeningExecutionArchitectureInstallation: install } = require('../server/cadLiveOpeningExecutionArchitectureClosure');
const { resolveCadProductionExecutionBindingSource: resolve } = require('../server/cadProductionExecutionBindingSourceInstall');
const { createCadLiveOpeningExecutableRuntimeBootstrap: bootstrap } = require('../server/cadLiveOpeningExecutableRuntimeBootstrap');
const { createCadProductionExecutableRuntimeMount: mountRouter } = require('../server/cadProductionExecutableRuntimeMountCompletion');
const { FORWARD_EFFECTS, CLEANUP_EFFECTS } = require('../server/cadLiveOpeningExecutableRuntimeWiring');
const { harness } = require('./cad-auth-prod-runtime-mount-fixture');
const checker = require('./cad-auth-credential-closure-binding-repair-checker');
const { createCadLiveOpeningGateCredentialClosure: createClosure, createExactGateFromSource: makeGate,
  createProofPrivateSessionCredentialSupply: proofSupply, REVIEWED_WINDOW, SESSION_CREDENTIAL_DIGEST_SHA256 } = closureModule;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const metadata = () => readMetadata(checker.PROOF_ENV);
const now = () => Date.parse(REVIEWED_WINDOW.proofNowUtc);
const options = () => ({ deploymentMetadata: metadata(), privateSessionCredentialSupply: proofSupply(), now });

function runtime({ mutate = () => {}, clock = now, ledger } = {}) {
  const h = harness({ ledger, now: clock, mutate: async (operation, receipt, input) => {
    receipt.evidenceSha256 = input.durableEvidenceSha256;
    await mutate(operation, receipt, input);
  } });
  const closure = createClosure({ ...options(), durableService: h.adapter, now: clock });
  const mount = bootstrap({ executableRuntime: closure.executableRuntime });
  const principal = { ...h.principal, sessionId: closure.runtime.installation.manifest.sessionId };
  const open = async () => {
    const input = { principal, bodyAdmissionAuthorized: false };
    return mount.routeBodyGate.authorizeBodyRead({ ...input, admissionDecision: await mount.admissionSwitch.decide(input) });
  };
  return { h, closure, mount, open };
}

test('current and subsequent deployment resolve new exact byte and installation bindings', () => {
  const first = checker.sourceProof();
  const next = checker.sourceProof({ ...checker.PROOF_ENV,
    VERCEL_URL: 'reversr-nextproof-vsillahs-projects.vercel.app', VERCEL_GIT_COMMIT_SHA: 'b'.repeat(40) });
  assert.equal(first.gateNonNull, true);
  assert.equal(next.gateNonNull, true);
  assert.notEqual(first.commandCardSha256, '66e2d93402a56fc265349db4b4b6473b99b73683cc975014c388b47fa7dbe6c9');
  assert.notEqual(first.installationSha256, '8d13d28fcffbe4c75db7803aa5224554723708e53087148d7d0649d73cc810ee');
  assert.notEqual(first.commandCardSha256, next.commandCardSha256);
  assert.notEqual(first.installationSha256, next.installationSha256);
  assert.equal(first.effectsExecuted + next.effectsExecuted, 0);
  const gate = makeGate(options());
  assert.equal(gate.mainCommit, checker.BOUND_INPUTS.baseCommit);
  assert.equal(gate.productionTarget, checker.BOUND_INPUTS.productionTarget);
});

test('metadata policy refuses aliases, GitHub IDs, incomplete or private metadata', () => {
  assert.equal(validMetadata(metadata()), true);
  assert.match(metadata().deploymentReference,
    /^vercel-target:reversr-a261m8i6x-vsillahs-projects\.vercel\.app@56a29e337ceb459c66f83d7f5207b7ba74f65686$/);
  const changes = [
    { deploymentReference: '6771743168' }, { deploymentReference: 'dpl_short' },
    { deploymentReference: 'vercel-target:reversr-a261m8i6x-vsillahs-projects.vercel.app@bad' },
    { deploymentReference: 'vercel-target:reversr-other-vsillahs-projects.vercel.app@56a29e337ceb459c66f83d7f5207b7ba74f65686' },
    { deploymentTarget: 'https://reversr.vercel.app' }, { deploymentTarget: 'https://attacker.invalid' },
    { deploymentTarget: 'https://reversr-abc-vsillahs-projects.vercel.app/path' },
    { deploymentTarget: 'https://reversr-abc-vsillahs-projects.vercel.app.evil' },
    { projectProductionTarget: 'https://other.vercel.app' }, { gitCommitSha: 'bad' },
    { gitCommitRef: 'feature' }, { gitRepo: 'other' }, { gitOwner: 'other' },
    { vercelEnv: 'preview' }, { source: 'request-body' }, { secretBearing: true },
    { schemaVersion: 2 }, { nested: { credential: 'PRIVATE_SENTINEL' } },
  ];
  for (const change of changes) {
    const input = { ...metadata(), ...change };
    assert.equal(validMetadata(input), false);
    assert.equal(makeGate({ ...options(), deploymentMetadata: input }), null);
  }
  for (const key of Object.keys(metadata())) {
    const input = metadata(); const incomplete = { ...input }; delete incomplete[key];
    assert.equal(validMetadata(incomplete), false, key);
  }
  assert.equal(readMetadata({ ...checker.PROOF_ENV, VERCEL_DEPLOYMENT_ID: '6771743168' }), null);
  assert.equal(readMetadata({ ...checker.PROOF_ENV, VERCEL_DEPLOYMENT_ID: undefined }).deploymentReference,
    metadata().deploymentReference);
});

test('metadata reader only accesses allowlisted non-secret system fields', () => {
  const allowed = new Set(Object.keys(checker.PROOF_ENV));
  allowed.add('VERCEL_DEPLOYMENT_ID');
  const env = new Proxy(checker.PROOF_ENV, { get(target, key) {
    assert.ok(allowed.has(key), String(key)); return target[key];
  } });
  assert.deepEqual(readMetadata(env), metadata());
});

test('stale gate and tampered card, installation, session or durable bindings cannot install', () => {
  const gate = makeGate(options());
  const current = metadata();
  for (const field of ['deploymentReference', 'deploymentTarget', 'gitCommitSha']) {
    assert.equal(install({ gate, deploymentMetadata: { ...current, [field]: 'stale' } }), null);
  }
  for (const field of ['commandCardSha256', 'installationSha256', 'boundedSessionRef', 'sessionId', 'durableEvidenceSha256']) {
    assert.equal(install({ gate: { ...gate, [field]: '0'.repeat(64) }, deploymentMetadata: current }), null);
  }
  const installation = createClosure(options()).runtime.installation;
  assert.equal(resolve({ ...installation, manifest: { ...installation.manifest,
    commandCardBytes: installation.manifest.commandCardBytes + ' ' } }, now), null);
  assert.equal(resolve({ ...installation, liveGate: { ...installation.liveGate, installationSha256: null } }, now), null);
});

test('exact private digest, supply ref and receipt are mandatory with no extra fields', async () => {
  for (const change of [
    { supplied: false }, { credentialDigestSha256: '0'.repeat(64) }, { supplyRef: 'wrong' },
    { supplyReceiptSha256: null }, { supplyReceiptSha256: 'bad' }, { credentialTransport: 'cookie' },
    { credentialValueIncluded: true }, { uploadSessionIssuanceAuthorized: true },
    { extra: { credential: 'PRIVATE_SENTINEL' } },
  ]) {
    const result = createClosure({ ...options(), privateSessionCredentialSupply: { ...proofSupply(), ...change } });
    assert.equal(result.sourceExecutable, false);
    assert.equal(result.sessionService, null);
  }
  const closure = createClosure(options());
  assert.equal((await closure.sessionService.issueSession()).ok, false);
  assert.equal(await closure.sessionService.lookupSession('0'.repeat(64)), null);
  assert.equal((await closure.sessionService.lookupSession(SESSION_CREDENTIAL_DIGEST_SHA256)).transport, 'bearer');
});

test('explicit reviewed window changes digests without automatic renewal; bad windows close', () => {
  const old = makeGate(options());
  const next = makeGate({ ...options(), openingWindow: { startUtc: '2030-01-01T00:00:00Z', expiresUtc: '2030-01-01T00:30:00Z' } });
  assert.notEqual(old.commandCardSha256, next.commandCardSha256);
  assert.notEqual(old.installationSha256, next.installationSha256);
  for (const openingWindow of [null, {}, { startUtc: '2026-99-99T00:00:00Z', expiresUtc: REVIEWED_WINDOW.expiresUtc },
    { startUtc: REVIEWED_WINDOW.expiresUtc, expiresUtc: REVIEWED_WINDOW.startUtc },
    { startUtc: '2030-01-01T00:00:00Z', expiresUtc: '2030-01-01T00:31:00Z' }]) {
    assert.equal(makeGate({ ...options(), openingWindow }), null);
  }
  assert.equal(createClosure({ ...options(), now: () => Date.parse(REVIEWED_WINDOW.expiresUtc) }).sourceExecutable, false);
});

test('repaired runtime retains one durable run and attempt, rollback first, then smoke', async () => {
  const ledger = new Set();
  const f = runtime({ ledger });
  assert.equal((await f.open()).routeBodyGateAuthorized, true);
  assert.deepEqual(f.h.events.map(e => e.operation), FORWARD_EFFECTS);
  assert.ok(FORWARD_EFFECTS.indexOf('armRollback') < FORWARD_EFFECTS.indexOf('openFence'));
  assert.equal((await f.mount.routeBodyGate.afterBodyAdmission()).rollbackVerified, true);
  assert.deepEqual(f.h.events.slice(-3).map(e => e.operation), CLEANUP_EFFECTS);
  assert.equal((await f.open()).bodyReadAuthorized, false);
  const second = runtime({ ledger });
  assert.equal((await second.open()).bodyReadAuthorized, false);
  assert.ok(!second.h.events.some(e => e.operation === 'openFence'));
});

test('independent clock expiry after every awaited effect prevents body access', async () => {
  for (let i = 0; i < FORWARD_EFFECTS.length; i++) {
    let stamp = now(); let step = 0;
    const f = runtime({ clock: () => stamp, mutate: operation => {
      if (!CLEANUP_EFFECTS.includes(operation) && step++ === i) stamp = Date.parse(REVIEWED_WINDOW.expiresUtc);
    } });
    assert.equal((await f.open()).bodyReadAuthorized, false, String(i));
    assert.deepEqual(f.h.events.filter(e => !CLEANUP_EFFECTS.includes(e.operation)).map(e => e.operation), FORWARD_EFFECTS.slice(0, i + 1));
    assert.equal((await f.open()).bodyReadAuthorized, false);
  }
});

test('stale live deployment or unknown smoke closes without retry', async () => {
  const stale = runtime({ mutate: (operation, receipt) => {
    if (operation === 'recheckDeployment') receipt.immutableCurrent = false;
  } });
  assert.equal((await stale.open()).bodyReadAuthorized, false);
  assert.ok(!stale.h.events.some(e => e.operation === 'claimRun'));
  const unknown = runtime({ mutate: (operation, receipt) => {
    if (operation === 'postRollbackSmoke') receipt.failClosed = false;
  } });
  assert.equal((await unknown.open()).routeBodyGateAuthorized, true);
  assert.equal((await unknown.mount.routeBodyGate.afterBodyAdmission()).code, 'ROLLBACK_OR_SMOKE_UNKNOWN_NO_RETRY');
  assert.equal((await unknown.open()).bodyReadAuthorized, false);
});

test('no-argument production closure reads current metadata but remains closed', () => {
  const script = `
    const assert = require('node:assert/strict');
    const { PROOF_ENV } = require('./scripts/cad-auth-credential-closure-binding-repair-checker');
    Object.assign(process.env, PROOF_ENV);
    const c = require('./server/cadLiveOpeningGateCredentialClosure').createCadLiveOpeningGateCredentialClosure();
    assert.equal(c.deploymentMetadataAccepted, true);
    assert.equal(c.gateNonNull, false);
    assert.equal(c.sessionService, null);
    assert.equal(c.executableRuntime.enabled, false);
  `;
  const result = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('production router composition returns local 401 without reading body or executing effects', async t => {
  const closure = createClosure({ deploymentMetadata: metadata() });
  let reads = 0;
  const app = express();
  app.use((req, res, next) => {
    const on = req.on;
    req.on = function(event, ...args) {
      if (event === 'data' || event === 'readable') { reads++; throw Error('BODY_READ'); }
      return on.call(this, event, ...args);
    };
    Object.defineProperty(req, 'body', { get() { reads++; throw Error('BODY_READ'); } });
    next();
  });
  const routerOptions = { executableRuntime: closure.executableRuntime };
  if (closure.sessionService) routerOptions.sessionService = closure.sessionService;
  app.use('/api/cad', mountRouter(routerOptions));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/cad/user-import`, { method: 'POST' });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, 'USER_SESSION_REQUIRED');
  assert.equal(reads, 0);
  assert.equal(closure.effectsExecuted, 0);
});

test('repair packet binds public sources and refuses live or arbitrary-path modes', () => {
  const packet = JSON.parse(fs.readFileSync(checker.PACKET));
  assert.equal(checker.checkPacket(packet).ok, true);
  for (const file of checker.SOURCES) {
    assert.equal(checker.checkPacket(packet, candidate => Buffer.concat([fs.readFileSync(candidate),
      Buffer.from(candidate === file ? 'drift' : '')])).ok, false, file);
  }
  for (const args of [['--live'], ['--execute'], ['--activate'], ['--issue-command-card'], ['PRIVATE_SENTINEL']]) {
    const result = spawnSync(process.execPath, ['scripts/cad-auth-credential-closure-binding-repair-checker.js', ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stdout).effectsExecuted, 0);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_SENTINEL/);
  }
  assert.doesNotMatch(JSON.stringify(packet), /us1\.|PRIVATE_SENTINEL|\/Users\/|\.local\//);
  assert.match(sha(fs.readFileSync(checker.PACKET)), /^[a-f0-9]{64}$/);
});
