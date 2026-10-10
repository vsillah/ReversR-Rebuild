const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  APPROVAL_ID_DIGEST,
  CREDENTIAL_REFERENCES,
  ENVIRONMENT_VARIABLE_REFERENCES,
  LIMITS,
  QUALIFICATION_BINDING,
  QUALIFICATION_REVIEW_GATE,
  createCadPhase5Package8DevelopmentQualificationBinding,
} = require('../server/cadPhase5Package8DevelopmentQualificationBinding');
const { createDisabledPackage8LifecycleMonitor }
  = require('../server/cadPhase5Package8LifecycleMonitor');
const { SYNTHETIC_OWNER, SYNTHETIC_PRIVATE_IGES_FIXTURE }
  = require('../server/cadPhase5SyntheticPrivatePathQualification');
const { NOW, WINDOW, setup }
  = require('./cad-phase5-package8-execution-controller.test');

const root = path.resolve(__dirname, '..');

function approval(overrides = {}) {
  const artifact = {
    schemaVersion: 1,
    kind: 'CAD_PHASE5_PACKAGE8_ONE_USE_DEVELOPMENT_QUALIFICATION_APPROVAL',
    status: 'OFFLINE_SYNTHETIC_TEST_ONLY',
    approvalIdDigest: APPROVAL_ID_DIGEST,
    issuedAtUtc: new Date(NOW).toISOString(),
    authorityExpiresAtUtc: WINDOW.endUtc,
    window: { ...WINDOW },
    binding: { ...QUALIFICATION_BINDING },
    owner: { ...SYNTHETIC_OWNER },
    fixture: { id: SYNTHETIC_PRIVATE_IGES_FIXTURE.id,
      sha256: SYNTHETIC_PRIVATE_IGES_FIXTURE.sha256, projectOwned: true,
      nonproprietary: true, customerData: false },
    limits: { ...LIMITS },
    credentialReferences: [...CREDENTIAL_REFERENCES],
    environmentVariableReferences: [...ENVIRONMENT_VARIABLE_REFERENCES],
    providerRequestsAuthorized: false,
    runtimeActivationAuthorized: false,
  };
  return { ...artifact, ...overrides };
}

function bindingSetup(options = {}, shared = {}, bindingOverrides = {}) {
  const fixture = setup(options, shared);
  const { now, operationBudgetMs, reviewOnly: _reviewOnly, ...bindings }
    = fixture.controllerOptions;
  const create = (override = {}) => createCadPhase5Package8DevelopmentQualificationBinding({
    reviewOnly: true,
    testOnly: true,
    approvalGate: QUALIFICATION_REVIEW_GATE,
    bindings,
    lifecycleMonitor: createDisabledPackage8LifecycleMonitor(),
    now,
    operationBudgetMs,
    ...bindingOverrides,
    ...override,
  });
  return { ...fixture, binding: create(), restartBinding: create, bindings };
}

test('default and missing reviewed bindings remain unmounted and disabled', async () => {
  const absent = createCadPhase5Package8DevelopmentQualificationBinding();
  assert.equal(absent.reviewConfigured, false);
  assert.equal((await absent.reviewOneUse({ approvalArtifact: approval() })).code,
    'PACKAGE8_QUALIFICATION_BINDING_DISABLED');
  const f = bindingSetup();
  const missing = f.restartBinding({ bindings: { ...f.bindings, durable: undefined } });
  assert.equal(missing.reviewConfigured, false);
  assert.equal(missing.routeMounted, false);
  assert.equal(missing.runtimeActivationAllowed, false);
});

test('exact approval connects the reviewed contracts for one closed synthetic run', async () => {
  const f = bindingSetup();
  const value = await f.binding.reviewOneUse({ approvalArtifact: approval() });
  assert.equal(value.code, 'PACKAGE8_DEVELOPMENT_REVIEW_QUALIFIED_CLOSED');
  assert.equal(value.sessionCount, 1);
  assert.equal(value.fileCount, 1);
  assert.equal(value.attemptCount, 1);
  assert.equal(value.maxRetries, 0);
  assert.equal(value.maximumCostMicrosExclusive, 9_000_000);
  assert.equal(value.runtimeActivationAllowed, false);
  assert.equal(value.providerRequests, 0);
});

test('stale authority and invalid or widened approval stop before durable activity', async () => {
  for (const changed of [
    approval({ issuedAtUtc: new Date(NOW - 120_001).toISOString() }),
    approval({ authorityExpiresAtUtc: new Date(NOW - 1).toISOString() }),
    approval({ limits: { ...LIMITS, maximumSessions: 2 } }),
    approval({ limits: { ...LIMITS, maximumRetries: 1 } }),
    approval({ window: { ...WINDOW, endUtc: '2026-10-10T19:40:00.001Z' } }),
    approval({ providerRequestsAuthorized: true }),
  ]) {
    const f = bindingSetup();
    const value = await f.binding.reviewOneUse({ approvalArtifact: changed });
    assert.equal(value.ok, false);
    assert.match(value.code, /PACKAGE8_APPROVAL_(?:STALE|INVALID|WINDOW_INVALID)/);
    assert.equal(f.events.length, 0);
    assert.equal(f.state.bodyReads, 0);
  }
});

test('replay and restart consume the durable one-use intent once', async () => {
  const shared = { intents: new Set() };
  const first = bindingSetup({}, shared);
  assert.equal((await first.binding.reviewOneUse({ approvalArtifact: approval() })).ok, true);
  assert.equal((await first.binding.reviewOneUse({ approvalArtifact: approval() })).code,
    'PACKAGE8_ATTEMPT_CONSUMED');
  const restarted = bindingSetup({}, shared);
  assert.equal((await restarted.binding.reviewOneUse({ approvalArtifact: approval() })).code,
    'PACKAGE8_ATTEMPT_CONSUMED');
});

test('provider uncertainty closes first, quarantines, and never reaches Sandbox', async () => {
  const f = bindingSetup({ providerAckUnknown: true });
  const value = await f.binding.reviewOneUse({ approvalArtifact: approval() });
  assert.equal(value.code, 'PACKAGE8_EXECUTION_QUARANTINED');
  assert.equal(value.maxRetries, 0);
  assert.equal(f.events.filter(item => item.name === 'provider:putExact').length, 1);
  assert.equal(f.events.filter(item => item.name === 'sandbox:convert').length, 0);
  assert.equal(f.events.filter(item => item.name === 'durable:closeForRollback').length, 1);
});

test('Sandbox uncertainty and cleanup failure are one-attempt zero-retry stops', async () => {
  for (const options of [{ sandboxUnknown: true }, { cleanupUnknown: true },
    { sandboxTimeout: true, operationBudgetMs: 5 }]) {
    const f = bindingSetup(options);
    const value = await f.binding.reviewOneUse({ approvalArtifact: approval() });
    assert.equal(value.code, 'PACKAGE8_EXECUTION_QUARANTINED');
    assert.equal(value.maxRetries, 0);
    assert.equal(f.state.sandboxAttempts, 1);
    assert.equal(f.events.filter(item => item.name === 'sandbox:convert').length, 1);
  }
});

test('success revokes, quarantines, deletes exact artifacts, and reconciles tombstones', async () => {
  const f = bindingSetup();
  const value = await f.binding.reviewOneUse({ approvalArtifact: approval() });
  assert.equal(value.ok, true);
  assert.equal(f.state.closed, true);
  assert.equal(f.state.revoked, true);
  assert.equal([...f.state.grants.values()].every(grant => grant.revoked), true);
  assert.equal(f.state.artifacts.size, 0);
  assert.equal(f.state.tombstones.size, 2);
  assert.equal(f.events.filter(item => item.name === 'durable:reconcile').length > 0, true);
  const close = f.events.findIndex(item => item.name === 'durable:closeForRollback');
  const revoke = f.events.findIndex(item => item.name === 'session:revokeExact');
  const deletion = f.events.findIndex(item => item.name === 'provider:deleteExact');
  assert.ok(close >= 0 && close < revoke && revoke < deletion);
});

test('cost and quota enforcement stop before fixture read and dispatch', async () => {
  for (const options of [{ calculatedMaximumCostMicros: 9_000_000 },
    { observedCostMicros: 9_000_000 }, { reservationMicros: 9_000_000 },
    { quotaExceeded: true }]) {
    const f = bindingSetup(options);
    const value = await f.binding.reviewOneUse({ approvalArtifact: approval() });
    assert.equal(value.ok, false);
    assert.equal(value.maxRetries, 0);
    assert.equal(f.state.bodyReads, 0);
    assert.equal(f.state.sandboxAttempts, 0);
  }
});

test('credential references are names only and the binding stays outside runtime imports', () => {
  const binding = bindingSetup().binding;
  assert.deepEqual(binding.credentialReferences,
    ['reversr-package8-public-fixture-dev-preview-v2']);
  assert.deepEqual(binding.environmentVariableReferences,
    ['CAD_R2_ACCESS_KEY_ID', 'CAD_R2_SECRET_ACCESS_KEY', 'VERCEL_OIDC_TOKEN']);
  const source = fs.readFileSync(path.join(root,
    'server/cadPhase5Package8DevelopmentQualificationBinding.js'), 'utf8');
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|credentialOptions/);
  for (const runtime of ['server/index.js', 'server/cadUserUploadRouter.js',
    'server/cadProductionExecutionBinding.js', 'server/cadLiveOpeningRuntimeActivation.js']) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, runtime), 'utf8'),
      /cadPhase5Package8DevelopmentQualificationBinding/);
  }
});
