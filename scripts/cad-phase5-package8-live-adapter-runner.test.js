const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { OFFLINE_REVIEW_GATE, createCadPhase5Package8LiveAdapters }
  = require('../server/cadPhase5Package8LiveAdapters');
const { createCadPhase5Package8InternalRunner }
  = require('../server/cadPhase5Package8InternalRunner');
const { NOW, WINDOW, setup }
  = require('./cad-phase5-package8-execution-controller.test');

const root = path.resolve(__dirname, '..');
const contract = JSON.parse(fs.readFileSync(path.join(root,
  'docs/cad-phase5-package8-public-evidence/live-adapter-runner-source-contract.json'),
'utf8'));

function runnerSetup(options = {}, shared = {}) {
  const fixture = setup(options, shared);
  const { now, operationBudgetMs, reviewOnly: _reviewOnly, ...bindings }
    = fixture.controllerOptions;
  const create = () => createCadPhase5Package8InternalRunner({
    enabled: false,
    reviewOnly: true,
    testOnly: true,
    activationGate: OFFLINE_REVIEW_GATE,
    bindings,
    now,
    operationBudgetMs,
  });
  return { ...fixture, runner: create(), restartRunner: create };
}

test('default and enabled construction stay unmounted and live-disabled', async () => {
  for (const runner of [createCadPhase5Package8InternalRunner(),
    createCadPhase5Package8InternalRunner({ enabled: true })]) {
    assert.deepEqual([runner.configured, runner.reviewConfigured, runner.enabled,
      runner.mounted, runner.routeMounted, runner.providerDispatchEnabled,
      runner.storageDispatchEnabled, runner.conversionDispatchEnabled,
      runner.downloadDispatchEnabled, runner.runtimeActivationAllowed,
      runner.productionBehaviorChanged, runner.liveBindingsAccepted],
    Array(12).fill(false));
    assert.equal((await runner.runOneUse({ window: WINDOW })).ok, false);
  }
});

test('offline adapter gate requires exact reviewed contracts and cannot accept live bindings', () => {
  const f = setup();
  const { now: _now, operationBudgetMs: _budget, reviewOnly: _review, ...bindings }
    = f.controllerOptions;
  const adapters = createCadPhase5Package8LiveAdapters({ testOnly: true,
    activationGate: OFFLINE_REVIEW_GATE, ...bindings });
  assert.equal(adapters.reviewConfigured, true);
  assert.equal(adapters.liveBindingsAccepted, false);
  assert.equal(adapters.providerDispatchEnabled, false);
  const widened = createCadPhase5Package8LiveAdapters({ testOnly: true,
    activationGate: { ...OFFLINE_REVIEW_GATE, providerDispatchAuthorized: true }, ...bindings });
  assert.equal(widened.reviewConfigured, false);
});

test('authority, durable claim, and quota reservation precede one synthetic fixture read', async () => {
  const f = runnerSetup();
  const value = await f.runner.runOneUse({ window: WINDOW });
  assert.equal(value.ok, true, JSON.stringify({ value, events: f.events }));
  const index = name => f.events.findIndex(item => item.name === name);
  assert.ok(index('authority') < index('durable:claimUpload'));
  assert.ok(index('durable:claimUpload') < index('durable:reserveArtifact'));
  assert.ok(index('durable:reserveArtifact') < index('fixture:readExact'));
  assert.ok(index('fixture:readExact') < index('durable:consumeQuota'));
  assert.equal(f.state.bodyReads, 1);
  assert.equal(f.state.sandboxAttempts, 1);
});

test('one-use consumption, restart, replay, and concurrency spend one durable intent', async () => {
  const oneUse = runnerSetup();
  assert.equal((await oneUse.runner.runOneUse({ window: WINDOW })).ok, true);
  assert.equal((await oneUse.runner.runOneUse({ window: WINDOW })).code,
    'PACKAGE8_ATTEMPT_CONSUMED');
  assert.equal((await oneUse.restartRunner().runOneUse({ window: WINDOW })).code,
    'PACKAGE8_ATTEMPT_CONSUMED');

  const shared = { intents: new Set() };
  const a = runnerSetup({}, shared); const b = runnerSetup({}, shared);
  const values = await Promise.all([
    a.runner.runOneUse({ window: WINDOW }), b.runner.runOneUse({ window: WINDOW }),
  ]);
  assert.equal(values.filter(value => value.ok).length, 1);
  assert.equal(values.filter(value => value.code === 'PACKAGE8_ATTEMPT_CONSUMED').length, 1);
});

test('quota, cost, owner, and shop drift refuse or quarantine without widening scope', async () => {
  for (const options of [{ quotaExceeded: true }, { calculatedMaximumCostMicros: 9_000_000 },
    { observedCostMicros: 9_000_000 }, { authorityMismatch: true },
    { reconcileOwnerMismatch: true }]) {
    const f = runnerSetup(options);
    const value = await f.runner.runOneUse({ window: WINDOW });
    assert.equal(value.ok, false, JSON.stringify(options));
    assert.equal(value.maxRetries, 0);
    assert.equal(value.providerRequests, 0);
    if (options.quotaExceeded || options.calculatedMaximumCostMicros
      || options.observedCostMicros || options.authorityMismatch) {
      assert.equal(f.state.bodyReads, 0);
    }
  }
});

test('R2 uncertainty and Sandbox timeout or unknown outcome close first with zero retry', async () => {
  for (const options of [{ providerAckUnknown: true }, { sandboxUnknown: true },
    { sandboxTimeout: true, operationBudgetMs: 5 }, { cleanupUnknown: true }]) {
    const f = runnerSetup(options);
    const value = await f.runner.runOneUse({ window: WINDOW });
    assert.equal(value.code, 'PACKAGE8_EXECUTION_QUARANTINED', JSON.stringify(options));
    assert.equal(value.maxRetries, 0);
    assert.equal(f.events.filter(item => item.name === 'durable:closeForRollback').length, 1);
    const close = f.events.findIndex(item => item.name === 'durable:closeForRollback');
    const firstDelete = f.events.findIndex(item => item.name === 'provider:deleteExact');
    assert.ok(firstDelete === -1 || close < firstDelete);
  }
});

test('success binds original IGS and derived STL grants then revokes, deletes, and reconciles', async () => {
  const f = runnerSetup();
  const value = await f.runner.runOneUse({ window: WINDOW });
  assert.equal(value.code, 'PACKAGE8_DEVELOPMENT_REVIEW_QUALIFIED_CLOSED');
  assert.equal(value.originalGrantQualified, true);
  assert.equal(value.stlGrantQualified, true);
  assert.equal(value.deletedArtifactCount, 2);
  const reservations = f.events.filter(item => item.name === 'durable:reserveArtifact');
  assert.deepEqual(reservations.map(item => item.args.artifact.kind),
    ['original-igs', 'derived-stl']);
  assert.equal(reservations[1].args.artifact.sourceArtifactId,
    reservations[0].args.artifact.artifactId);
  assert.equal([...f.state.grants.values()].every(grant => grant.revoked), true);
  assert.equal(f.state.artifacts.size, 0);
  assert.equal(f.state.tombstones.size, 2);
  assert.equal(f.events.filter(item => item.name === 'durable:reconcile').length > 0, true);
});

test('errors stay sanitized and no route or runtime bootstrap imports the adapters or runner', async () => {
  const f = runnerSetup({ fixtureDrift: true });
  const value = await f.runner.runOneUse({ window: WINDOW });
  const serialized = JSON.stringify(value);
  assert.equal(value.ok, false);
  assert.doesNotMatch(serialized,
    /phase5-synthetic-(?:user|shop|upload-session)|dg1\.|providerObjectKey|PRIVATE KEY/);
  for (const runtime of ['server/index.js', 'server/cadUserUploadRouter.js',
    'server/cadProductionExecutionBinding.js', 'server/cadLiveOpeningRuntimeActivation.js']) {
    const source = fs.readFileSync(path.join(root, runtime), 'utf8');
    assert.equal(source.includes('cadPhase5Package8LiveAdapters'), false, runtime);
    assert.equal(source.includes('cadPhase5Package8InternalRunner'), false, runtime);
  }
});

test('source contract records exact reviewed bindings and every live execution blocker', () => {
  assert.equal(contract.status, 'SOURCE_ONLY_DISABLED_DEFAULT');
  assert.equal(contract.admission.mergedMainCommit,
    '24ec45362517d60237f6f3e186e5048f49177cf5');
  assert.equal(contract.admission.productionEvidenceDeploymentId,
    'dpl_99Gfdd69ZTCGKYpbFgLDzMiwQGd9');
  assert.equal(contract.admission.productionEvidenceState, 'READY');
  assert.equal(contract.admission.providerRecheckPerformedByThisRound, false);
  assert.equal(Object.values(contract.defaultState).every(value => value === false), true);
  assert.equal(contract.offlineQualification.providerRequests, 0);
  assert.equal(contract.offlineQualification.r2Objects, 0);
  assert.equal(contract.offlineQualification.sandboxJobs, 0);
  assert.deepEqual(contract.remainingExecutionBlockers, [
    'EXACT_LIVE_ACTIVATION_GATE_NOT_REVIEWED',
    'LIVE_CONVEX_DURABLE_INVOKER_NOT_SUPPLIED',
    'LIVE_R2_CUSTODY_BINDING_NOT_SUPPLIED',
    'LIVE_SANDBOX_EXECUTOR_BINDING_NOT_SUPPLIED',
    'FRESH_SYNTHETIC_SESSION_AUTHORITY_NOT_SUPPLIED',
    'ACTIVE_WINDOW_AND_COST_REVALIDATION_NOT_SUPPLIED',
    'SOURCE_TO_DEPLOYMENT_FUNCTION_EQUIVALENCE_NOT_CLAIMED',
  ]);
});
