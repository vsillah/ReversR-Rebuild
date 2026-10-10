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
  SOURCE_OPERATION_MAP,
  createCadPhase5Package8DevelopmentQualificationBinding,
} = require('../server/cadPhase5Package8DevelopmentQualificationBinding');
const { FUNCTIONS, createCadPhase5Package8ConvexDurableInvoker }
  = require('../server/cadPhase5Package8ConvexDurableInvoker');
const { createDisabledPackage8LifecycleMonitor }
  = require('../server/cadPhase5Package8LifecycleMonitor');
const { SYNTHETIC_OWNER, SYNTHETIC_PRIVATE_IGES_FIXTURE }
  = require('../server/cadPhase5SyntheticPrivatePathQualification');

const root = path.resolve(__dirname, '..');
const NOW = Date.parse('2026-10-10T21:35:00.000Z');
const WINDOW = Object.freeze({ schemaVersion: 1, idDigest: 'a'.repeat(64),
  startUtc: '2026-10-10T21:34:00.000Z', endUtc: '2026-10-10T21:44:00.000Z',
  activated: true });

function approval(overrides = {}) {
  const artifact = {
    schemaVersion: 1,
    kind: 'CAD_PHASE5_PACKAGE8_ONE_USE_DEVELOPMENT_QUALIFICATION_APPROVAL',
    status: 'ISSUED_ONE_USE_DEVELOPMENT_QUALIFICATION',
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
    providerRequestsAuthorized: true,
    runtimeActivationAuthorized: false,
  };
  return { ...artifact, ...overrides };
}

function sourceFixture() {
  const calls = [];
  const touch = name => async () => { calls.push(name); throw Error(`UNEXPECTED_CALL:${name}`); };
  const references = Object.fromEntries(Object.keys(FUNCTIONS).map(name => [name, `ref:${name}`]));
  const r2Store = Object.fromEntries(SOURCE_OPERATION_MAP.r2Store.map(name => [name, touch(`r2-store:${name}`)]));
  const r2Provider = Object.fromEntries(SOURCE_OPERATION_MAP.r2Provider
    .map(name => [name, touch(`r2-provider:${name}`)]));
  const sessionStore = Object.fromEntries(['insertIfAbsent', 'read', 'revoke']
    .map(name => [name, touch(`session-store:${name}`)]));
  const sources = {
    convex: { references, runQuery: touch('convex:query'), runMutation: touch('convex:mutation') },
    r2: { provider: r2Provider, store: r2Store },
    sandbox: { create: touch('sandbox:create'), loadAssets: touch('sandbox:load-assets') },
    exactSession: { verifyExactSession: touch('session:verify'), store: sessionStore },
  };
  const create = overrides => createCadPhase5Package8DevelopmentQualificationBinding({
    reviewOnly: true,
    approvalGate: QUALIFICATION_REVIEW_GATE,
    sources,
    lifecycleMonitor: createDisabledPackage8LifecycleMonitor(),
    now: () => NOW,
    ...overrides,
  });
  return { calls, sources, binding: create(), create };
}

test('default and incomplete dependency sets remain unmounted and disabled', async () => {
  const absent = createCadPhase5Package8DevelopmentQualificationBinding();
  assert.equal(absent.reviewConfigured, false);
  assert.equal(absent.sourceComposition, null);
  assert.equal((await absent.reviewOneUse({ approvalArtifact: approval() })).code,
    'PACKAGE8_QUALIFICATION_BINDING_DISABLED');
  const f = sourceFixture();
  const missing = f.create({ sources: { ...f.sources, convex: {
    ...f.sources.convex, references: { ...f.sources.convex.references, reconcile: undefined },
  } } });
  assert.equal(missing.reviewConfigured, false);
  assert.equal(missing.routeMounted, false);
  assert.equal(missing.runtimeActivationAllowed, false);
  assert.deepEqual(f.calls, []);
});

test('review source composes the actual factories without invoking any dependency', () => {
  const f = sourceFixture();
  const composition = f.binding.sourceComposition;
  assert.equal(f.binding.reviewConfigured, true);
  assert.equal(composition.actualReviewedFactoriesComposed, true);
  assert.equal(composition.executableAdaptersExposed, false);
  assert.deepEqual(composition.convexOperations, FUNCTIONS);
  assert.equal(composition.durableRemoteAttempts, 0);
  assert.equal(composition.r2CustodyReviewConfigured, true);
  assert.equal(composition.sandboxActiveCount, 0);
  assert.equal(composition.sandboxCleanupBlocked, false);
  assert.equal(composition.exactSessionAuthorityConfigured, true);
  assert.equal(composition.sessionRevokerMapped, true);
  assert.deepEqual(f.calls, []);
  for (const flag of ['configured', 'enabled', 'mounted', 'routeMounted',
    'sessionIssuanceEnabled', 'requestBodyAdmissionAuthorized', 'providerDispatchEnabled',
    'storageDispatchEnabled', 'conversionDispatchEnabled', 'downloadDispatchEnabled',
    'runtimeActivationAllowed', 'liveBindingsAccepted', 'productionBehaviorChanged']) {
    assert.equal(f.binding[flag], false, flag);
  }
});

test('all thirteen Convex exports map exactly to injected query or mutation references', async () => {
  const calls = [];
  const references = Object.fromEntries(Object.keys(FUNCTIONS).map(name => [name, `ref:${name}`]));
  const invoke = kind => async (reference, input) => {
    calls.push({ kind, reference, input });
    return { sourceOnly: true, liveReady: false, routeMounted: false,
      bodyAdmissionAuthorized: false, providerDispatchEnabled: false,
      conversionDispatchEnabled: false, downloadRouteEnabled: false,
      accepted: true, code: 'RECONCILIATION_PRESENT' };
  };
  const adapter = createCadPhase5Package8ConvexDurableInvoker({ references,
    runQuery: invoke('query'), runMutation: invoke('mutation') });
  for (const [name, kind] of Object.entries(FUNCTIONS)) {
    const result = await adapter[name]({ operation: name });
    assert.equal(result.accepted, true);
    assert.deepEqual(calls.at(-1), { kind, reference: `ref:${name}`, input: { operation: name } });
  }
  assert.equal(calls.length, 13);
  assert.equal(adapter.status().automaticRetries, 0);
});

test('a one-use artifact remains necessary but this source cannot execute it', async () => {
  const f = sourceFixture();
  assert.equal((await f.binding.reviewOneUse()).code, 'PACKAGE8_APPROVAL_INVALID');
  assert.equal((await f.binding.reviewOneUse({ approvalArtifact: approval() })).code,
    'PACKAGE8_ONE_USE_EXECUTION_NOT_INSTALLED');
  assert.deepEqual(f.calls, []);
});

test('stale, inactive, widened, or offline-labeled artifacts fail before dependency activity', async () => {
  for (const changed of [
    approval({ issuedAtUtc: new Date(NOW - 120_001).toISOString() }),
    approval({ authorityExpiresAtUtc: new Date(NOW - 1).toISOString() }),
    approval({ limits: { ...LIMITS, maximumSessions: 2 } }),
    approval({ limits: { ...LIMITS, maximumRetries: 1 } }),
    approval({ window: { ...WINDOW, activated: false } }),
    approval({ status: 'OFFLINE_SYNTHETIC_TEST_ONLY' }),
    approval({ providerRequestsAuthorized: false }),
  ]) {
    const f = sourceFixture();
    const value = await f.binding.reviewOneUse({ approvalArtifact: changed });
    assert.equal(value.ok, false);
    assert.match(value.code, /PACKAGE8_APPROVAL_(?:STALE|INVALID|WINDOW_INVALID)/);
    assert.deepEqual(f.calls, []);
  }
});

test('source imports reviewed factories and contains no offline substitution or environment read', () => {
  const bindingSource = fs.readFileSync(path.join(root,
    'server/cadPhase5Package8DevelopmentQualificationBinding.js'), 'utf8');
  for (const factory of ['createCadPhase5Package8ConvexDurableInvoker',
    'createCadR2PrivateArtifactCustody', 'createSandboxExecutor',
    'createCadExactSessionBridge', 'createUploadSessionService',
    'createDisabledPackage8LifecycleMonitor']) assert.match(bindingSource, new RegExp(factory));
  assert.doesNotMatch(bindingSource,
    /createCadPhase5Package8InternalRunner|OFFLINE_REVIEW_GATE|offlineSynthetic|process\.env|fetch\s*\(|https?\.request/);
  assert.match(bindingSource, /liveBindingsSupplied:\s*false/);
  assert.match(bindingSource, /env:\s*EMPTY_ENVIRONMENT/);
  for (const runtime of ['server/index.js', 'server/cadUserUploadRouter.js',
    'server/cadProductionExecutionBinding.js', 'server/cadLiveOpeningRuntimeActivation.js']) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, runtime), 'utf8'),
      /cadPhase5Package8DevelopmentQualificationBinding|cadPhase5Package8ConvexDurableInvoker/);
  }
});
