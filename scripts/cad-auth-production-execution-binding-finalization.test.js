const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { harness } = require('./cad-auth-prod-runtime-mount-fixture');
const { createCadProductionExecutionBinding } =
  require('../server/cadProductionExecutionBinding');
const {
  BOUNDED_SESSION_REF,
  createCadProductionExecutionBindingSource,
} = require('../server/cadProductionExecutionBindingSource');
const { createCadProductionExecutableRuntimeMount } =
  require('../server/cadProductionExecutableRuntimeMountCompletion');
const {
  PACKET,
  SOURCES,
  checkPacket,
  publicPrApprovalPhrase,
} = require('./cad-auth-production-execution-binding-finalization-checker');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));

function bindingInput(h = harness(), changes = {}) {
  return {
    ...h.options,
    boundedSessionRef: BOUNDED_SESSION_REF,
    sessionId: h.card.sessionId,
    durableEvidenceSha256: h.card.durableEvidenceSha256,
    durableService: h.adapter,
    ...changes,
  };
}

function runtimeMount(executableRuntime) {
  return createCadProductionExecutableRuntimeMount({
    executableRuntime,
    createRouter: options => options.liveOpeningRuntimeMount,
  });
}

async function gate(h, mount) {
  const input = { bodyAdmissionAuthorized: false, principal: h.principal };
  const admissionDecision = await mount.admissionSwitch.decide(input);
  return mount.routeBodyGate.authorizeBodyRead({ ...input, admissionDecision });
}

test('default production source stays closed and creates no executable binding', () => {
  assert.equal(createCadProductionExecutionBindingSource(), null);
  assert.deepEqual(createCadProductionExecutionBinding(), { enabled: false });
});

test('exact source binding can feed createCadProductionExecutionBinding without opening defaults', async () => {
  const h = harness();
  const source = createCadProductionExecutionBindingSource(bindingInput(h));
  assert.equal(source.enabled, true);
  assert.equal(source.boundedSessionRef, BOUNDED_SESSION_REF);
  const executableRuntime = createCadProductionExecutionBinding(source);
  assert.equal(executableRuntime.enabled, true);
  const mount = runtimeMount(executableRuntime);
  const opened = await gate(h, mount);
  assert.equal(opened.routeBodyGateAuthorized, true);
  const closed = await mount.routeBodyGate.afterBodyAdmission({ bodyGateDecision: opened, admissionOk: true });
  assert.equal(closed.rollbackVerified, true);
  assert.equal(closed.bodyReadAuthorized, false);
});

test('source factory rejects stale or incomplete live inputs before binding review', () => {
  for (const change of [
    { enabled: false },
    { boundedSessionRef: 'wrong' },
    { sessionId: 'wrong' },
    { commandCardSha256: '0'.repeat(64) },
    { durableEvidenceSha256: 'not-a-sha' },
    { currentDeploymentReference: '' },
    { commandCardBytes: null },
    { now: 1 },
    { durableService: {} },
  ]) {
    const h = harness();
    const input = bindingInput(h, change);
    const source = createCadProductionExecutionBindingSource(input);
    assert.equal(source, null);
    assert.deepEqual(createCadProductionExecutionBinding(source), { enabled: false });
  }
});

test('source module and production entry expose no env, filesystem, provider or listener path', () => {
  const binding = read('server/cadProductionExecutionBinding.js').toString();
  const source = read('server/cadProductionExecutionBindingSource.js').toString();
  const index = read('server/index.js').toString();
  assert.match(binding, /createCadProductionExecutionBindingSource\(\)/);
  assert.match(source, /const PRODUCTION_EXECUTION_BINDING_SOURCE = null;/);
  assert.match(index, /createCadStartupLiveGateSourceInstallClosure\(\)/);
  assert.doesNotMatch(index,
    /const cadLiveGateCredentialClosure = createCadLiveOpeningGateCredentialClosure\(\)/);
  assert.match(index, /cadLiveGateCredentialClosure\.executableRuntime/);
  assert.match(index, /\|\| createCadProductionExecutionBinding\(\)/);
  for (const text of [binding, source]) {
    assert.doesNotMatch(text, /process\.env|node:fs|child_process|fetch\s*\(|https?\.request|\.listen\s*\(/);
  }
});

test('historical finalization packet remains stale after source-install wiring and rejects drift', () => {
  const packet = JSON.parse(read(PACKET));
  assert.equal(checkPacket(packet).ok, false);
  for (const source of SOURCES) {
    const result = checkPacket(packet, {
      readSource(file) {
        return file === source ? Buffer.concat([read(file), Buffer.from('\n')]) : read(file);
      },
    });
    assert.equal(result.ok, false, source);
  }
});

test('public PR phrase stays limited to push and draft PR creation', () => {
  const packetBytes = read(PACKET);
  const phrase = publicPrApprovalPhrase({
    commit: 'c'.repeat(40),
    packetSha256: require('node:crypto').createHash('sha256').update(packetBytes).digest('hex'),
  });
  assert.match(phrase, /creation of one draft PR/);
  assert.match(phrase, /This does not authorize merge, deployment, production smoke, cleanup/);
  assert.doesNotMatch(phrase, /If checks pass, mark the PR ready/);
  assert.doesNotMatch(phrase, /allow the normal Vercel production deployment/);
  assert.doesNotMatch(phrase, /run production fail-closed smoke/);
});

test('checker refuses live execution, arbitrary paths and command-card issuance', () => {
  for (const args of [['--execute'], ['--live'], ['--activate'], ['--issue-command-card'],
    ['--write', 'PRIVATE_SENTINEL'], ['PRIVATE_SENTINEL']]) {
    const run = spawnSync(process.execPath, [
      'scripts/cad-auth-production-execution-binding-finalization-checker.js',
      ...args,
    ], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL|\/Users\//);
    assert.equal(JSON.parse(run.stdout).effectsExecuted, 0);
  }
});
