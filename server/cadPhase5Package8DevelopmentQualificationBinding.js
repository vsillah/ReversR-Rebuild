// Source-only Package 8 one-use development binding. It composes the reviewed
// adapters behind an unmounted coordinator and accepts only a separately issued
// approval artifact bound to a verified clean descendant and runtime receipt.
const { createHash } = require('node:crypto');
const { createCadPhase5Package8ConvexDurableInvoker, FUNCTIONS: CONVEX_FUNCTIONS }
  = require('./cadPhase5Package8ConvexDurableInvoker');
const { createCadR2PrivateArtifactCustody }
  = require('./cadR2PrivateArtifactCustody');
const { createSandboxExecutor } = require('./cadSandboxExecutor');
const { createCadExactSessionBridge, INTERNAL_MARK_TEST_COHORT }
  = require('./cadExactSessionBridge');
const { createUploadSessionService } = require('./uploadSessionStore');
const {
  createCadPhase5Package8DurableCustodyStore,
  createCadPhase5Package8SandboxAdapter,
} = require('./cadPhase5Package8OneUseAdapters');
const {
  EXECUTION_BASELINE,
  RESERVATION_MICROS,
  createCadPhase5Package8OneUseCoordinator,
  validExecutionBinding,
} = require('./cadPhase5Package8OneUseCoordinator');
const {
  POLICY: MONITOR_POLICY,
  createDisabledPackage8LifecycleMonitor,
  evaluatePackage8LifecycleMetadata,
} = require('./cadPhase5Package8LifecycleMonitor');
const {
  SYNTHETIC_PRIVATE_IGES_FIXTURE,
} = require('./cadPhase5SyntheticPrivatePathQualification');

const hash = value => createHash('sha256').update(value).digest('hex');
const exactKeys = (value, keys) => Boolean(value && typeof value === 'object'
  && !Array.isArray(value) && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key)));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const id = value => typeof value === 'string'
  && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const time = value => Number.isSafeInteger(value) && value >= 0;
const EMPTY_ENVIRONMENT = Object.freeze({});

const QUALIFICATION_BINDING = Object.freeze({
  ...EXECUTION_BASELINE,
  sourceToDeploymentFunctionEquivalence: 'RUNTIME_RECEIPT_REQUIRED',
});
const CREDENTIAL_REFERENCES = Object.freeze([
  'reversr-package8-public-fixture-dev-preview-v2',
]);
const ENVIRONMENT_VARIABLE_REFERENCES = Object.freeze([
  'CAD_R2_ACCESS_KEY_ID',
  'CAD_R2_SECRET_ACCESS_KEY',
  'VERCEL_OIDC_TOKEN',
]);
const LIMITS = Object.freeze({
  maximumSessions: 1,
  maximumFiles: 1,
  maximumAttempts: 1,
  maximumRetries: 0,
  maximumWindowMs: 15 * 60_000,
  maximumCostUsdExclusive: 9,
  reservationMicros: RESERVATION_MICROS,
});
const APPROVAL_ID_DIGEST = hash('cad-phase5-package8-one-use-development-approval-v2');
const QUALIFICATION_REVIEW_GATE = Object.freeze({
  schemaVersion: 1,
  mode: 'ONE_USE_DEVELOPMENT_COORDINATOR_SOURCE_ONLY',
  ...QUALIFICATION_BINDING,
  liveBindingsSupplied: false,
  providerDispatchAuthorized: false,
  runtimeActivationAuthorized: false,
});
const SOURCE_OPERATION_MAP = Object.freeze({
  convex: Object.freeze({ ...CONVEX_FUNCTIONS }),
  r2Provider: Object.freeze(['putExact', 'getExact', 'deleteExact', 'headExact']),
  sandbox: Object.freeze(['create', 'loadAssets']),
  exactSession: Object.freeze(['verifyExactSession', 'insertIfAbsent', 'read', 'revoke']),
  executionReceipt: Object.freeze(['verifyExact']),
  approvalIssuance: Object.freeze(['verifyExact']),
  lifecycleMetadata: Object.freeze(['readSanitized']),
  closeFirst: Object.freeze([
    'convex.closeForRollback',
    'session.revokeSession',
    'sandbox.cleanupBlocked',
    'r2.deleteArtifact',
    'convex.reconcile',
  ]),
});

const deny = code => Object.freeze({ ok: false, code, sourceOnly: true,
  developmentOnly: true, maximumRetries: 0, automaticRetries: 0,
  runtimeActivationAuthorized: false });

function approvalCommitment(artifact) {
  return hash(JSON.stringify({
    schemaVersion: artifact.schemaVersion,
    kind: artifact.kind,
    status: artifact.status,
    issuanceReference: artifact.issuanceReference,
    issuedAtUtc: artifact.issuedAtUtc,
    authorityExpiresAtUtc: artifact.authorityExpiresAtUtc,
    window: artifact.window,
    binding: artifact.binding,
    executionBinding: artifact.executionBinding,
    owner: artifact.owner,
    session: artifact.session,
    fixture: artifact.fixture,
    limits: artifact.limits,
    credentialReferences: artifact.credentialReferences,
    environmentVariableReferences: artifact.environmentVariableReferences,
    calculatedMaximumCostMicros: artifact.calculatedMaximumCostMicros,
    observedCostMicros: artifact.observedCostMicros,
    providerRequestsAuthorized: artifact.providerRequestsAuthorized,
    runtimeActivationAuthorized: artifact.runtimeActivationAuthorized,
  }));
}

function validateApprovalArtifact(artifact, nowMs) {
  if (!time(nowMs) || !exactKeys(artifact, ['schemaVersion', 'kind', 'status',
    'issuanceReference', 'approvalIdDigest', 'issuedAtUtc', 'authorityExpiresAtUtc', 'window', 'binding',
    'executionBinding', 'owner', 'session', 'fixture', 'limits', 'credentialReferences',
    'environmentVariableReferences', 'calculatedMaximumCostMicros',
    'observedCostMicros', 'providerRequestsAuthorized', 'runtimeActivationAuthorized'])) {
    return 'PACKAGE8_APPROVAL_INVALID';
  }
  if (artifact.schemaVersion !== 1
      || artifact.kind !== 'CAD_PHASE5_PACKAGE8_ONE_USE_DEVELOPMENT_QUALIFICATION_APPROVAL'
      || artifact.status !== 'ISSUED_ONE_USE_DEVELOPMENT_QUALIFICATION'
      || !id(artifact.issuanceReference)
      || !digest(artifact.approvalIdDigest)
      || artifact.approvalIdDigest !== approvalCommitment(artifact)
      || artifact.providerRequestsAuthorized !== true
      || artifact.runtimeActivationAuthorized !== false
      || !same(artifact.binding, QUALIFICATION_BINDING)
      || !validExecutionBinding(artifact.executionBinding)
      || !exactKeys(artifact.owner, ['userId', 'shopId', 'uploadSessionId'])
      || ![artifact.owner.userId, artifact.owner.shopId,
        artifact.owner.uploadSessionId].every(id)
      || !exactKeys(artifact.session, ['sessionDigest', 'loginSessionId'])
      || !digest(artifact.session.sessionDigest) || !id(artifact.session.loginSessionId)
      || !same(artifact.fixture, {
        id: SYNTHETIC_PRIVATE_IGES_FIXTURE.id,
        sha256: SYNTHETIC_PRIVATE_IGES_FIXTURE.sha256,
        projectOwned: true,
        nonproprietary: true,
        customerData: false,
      })
      || !same(artifact.limits, LIMITS)
      || !same(artifact.credentialReferences, CREDENTIAL_REFERENCES)
      || !same(artifact.environmentVariableReferences, ENVIRONMENT_VARIABLE_REFERENCES)
      || !Number.isSafeInteger(artifact.calculatedMaximumCostMicros)
      || artifact.calculatedMaximumCostMicros < 0
      || artifact.calculatedMaximumCostMicros >= LIMITS.maximumCostUsdExclusive * 1_000_000
      || !Number.isSafeInteger(artifact.observedCostMicros)
      || artifact.observedCostMicros < 0
      || artifact.observedCostMicros >= LIMITS.maximumCostUsdExclusive * 1_000_000) {
    return 'PACKAGE8_APPROVAL_INVALID';
  }
  const issuedAt = Date.parse(artifact.issuedAtUtc);
  const expiresAt = Date.parse(artifact.authorityExpiresAtUtc);
  const window = artifact.window || {};
  const start = Date.parse(window.startUtc);
  const end = Date.parse(window.endUtc);
  if (!exactKeys(window, ['schemaVersion', 'idDigest', 'startUtc', 'endUtc', 'activated'])
      || window.schemaVersion !== 1 || !digest(window.idDigest) || window.activated !== true
      || !Number.isFinite(start) || !Number.isFinite(end) || end <= start
      || start > nowMs || end <= nowMs || end - start > LIMITS.maximumWindowMs) {
    return 'PACKAGE8_APPROVAL_WINDOW_INVALID';
  }
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)
      || issuedAt > nowMs || nowMs - issuedAt > MONITOR_POLICY.maximumEvidenceAgeMs
      || expiresAt < end || expiresAt <= nowMs) return 'PACKAGE8_APPROVAL_STALE';
  return null;
}

function dependenciesReady(sources) {
  const r2ProviderMethods = SOURCE_OPERATION_MAP.r2Provider;
  return Boolean(sources && typeof sources === 'object' && !Array.isArray(sources)
    && sources.convex && sources.r2 && sources.sandbox && sources.exactSession
    && sources.executionReceipt && sources.approvalIssuance && sources.lifecycleMetadata
    && typeof sources.convex.runQuery === 'function'
    && typeof sources.convex.runMutation === 'function'
    && sources.convex.references && typeof sources.convex.references === 'object'
    && r2ProviderMethods.every(name => typeof sources.r2.provider?.[name] === 'function')
    && typeof sources.sandbox.create === 'function'
    && typeof sources.sandbox.loadAssets === 'function'
    && typeof sources.exactSession.verifyExactSession === 'function'
    && ['insertIfAbsent', 'read', 'revoke']
      .every(name => typeof sources.exactSession.store?.[name] === 'function')
    && typeof sources.executionReceipt.verifyExact === 'function'
    && typeof sources.approvalIssuance.verifyExact === 'function'
    && typeof sources.lifecycleMetadata.readSanitized === 'function');
}

function composeReviewedSources(sources, now, owner, session) {
  const durable = createCadPhase5Package8ConvexDurableInvoker(sources.convex);
  const custodyDurable = createCadPhase5Package8ConvexDurableInvoker(sources.convex);
  const cleanupDurable = createCadPhase5Package8ConvexDurableInvoker(sources.convex);
  const store = createCadPhase5Package8DurableCustodyStore({
    durable: custodyDurable,
    cleanupDurable,
    scopeKey: 'phase5-synthetic-private-path-v1',
    owner,
    now,
  });
  const custody = createCadR2PrivateArtifactCustody({
    enabled: true,
    provider: sources.r2.provider,
    store,
    now,
  });
  const sandboxExecutor = createSandboxExecutor({
    env: EMPTY_ENVIRONMENT,
    create: sources.sandbox.create,
    loadAssets: sources.sandbox.loadAssets,
  });
  const sandbox = createCadPhase5Package8SandboxAdapter({ executor: sandboxExecutor });
  const exactSessionAuthority = createCadExactSessionBridge({
    enabled: true,
    cohort: INTERNAL_MARK_TEST_COHORT,
    verifyExactSession: sources.exactSession.verifyExactSession,
    now,
  });
  const uploadSessionService = createUploadSessionService({
    store: sources.exactSession.store,
    resolveAuthorization: exactSessionAuthority.resolveAuthorization,
    refreshAuthorization: exactSessionAuthority.refreshAuthorization,
    now,
  });
  const coordinator = createCadPhase5Package8OneUseCoordinator({
    enabled: true,
    durable,
    cleanupDurable,
    custody,
    sandbox,
    sessionAuthority: exactSessionAuthority,
    sessionService: uploadSessionService,
    approvalIssuanceVerifier: sources.approvalIssuance,
    executionReceiptVerifier: sources.executionReceipt,
    lifecycleMetadata: sources.lifecycleMetadata,
    owner,
    session,
    now,
  });
  if (coordinator.reviewConfigured !== true || store.reviewConfigured !== true
    || custody.reviewConfigured !== true || sandbox.reviewConfigured !== true
    || exactSessionAuthority.configured !== true) throw Error('PACKAGE8_SOURCE_COMPOSITION_INVALID');
  return Object.freeze({
    coordinator,
    receipt: Object.freeze({
      actualReviewedFactoriesComposed: true,
      executableAdaptersExposed: false,
      coordinatorInstalled: true,
      convexOperations: Object.freeze({ ...CONVEX_FUNCTIONS }),
      durableRemoteAttempts: durable.status().remoteAttempts
        + custodyDurable.status().remoteAttempts + cleanupDurable.status().remoteAttempts,
      r2CustodyReviewConfigured: custody.reviewConfigured,
      sandboxReviewConfigured: sandbox.reviewConfigured,
      exactSessionAuthorityConfigured: exactSessionAuthority.configured,
      oneUseApprovalRequired: true,
      independentApprovalIssuanceRequired: true,
      runtimeReceiptRequired: true,
      automaticRetries: 0,
    }),
  });
}

function createCadPhase5Package8DevelopmentQualificationBinding({
  reviewOnly = false,
  approvalGate,
  sources,
  lifecycleMonitor = createDisabledPackage8LifecycleMonitor(),
  now = Date.now,
} = {}) {
  const monitorReviewed = lifecycleMonitor?.sourceOnly === true
    && lifecycleMonitor.configured === false
    && lifecycleMonitor.runtimeMonitoringEnabled === false
    && lifecycleMonitor.providerReadsEnabled === false
    && lifecycleMonitor.providerWritesEnabled === false
    && lifecycleMonitor.dispatchEnabled === false
    && lifecycleMonitor.evaluate === evaluatePackage8LifecycleMetadata;
  let composition = null;
  const reviewConfigured = reviewOnly === true && same(approvalGate, QUALIFICATION_REVIEW_GATE)
    && monitorReviewed && typeof now === 'function' && dependenciesReady(sources);
  if (reviewConfigured) composition = Object.freeze({
    actualReviewedFactoriesComposed: true,
    approvalBoundComposition: true,
    executableAdaptersExposed: false,
    coordinatorInstalled: true,
    convexOperations: Object.freeze({ ...CONVEX_FUNCTIONS }),
    durableRemoteAttempts: 0,
    r2CustodyReviewConfigured: true,
    sandboxReviewConfigured: true,
    exactSessionAuthorityConfigured: true,
    oneUseApprovalRequired: true,
    independentApprovalIssuanceRequired: true,
    runtimeReceiptRequired: true,
    automaticRetries: 0,
  });

  async function reviewOneUse({ approvalArtifact, signal } = {}) {
    if (!reviewConfigured) return deny('PACKAGE8_QUALIFICATION_BINDING_DISABLED');
    let nowMs;
    try { nowMs = now(); } catch { return deny('PACKAGE8_APPROVAL_TIME_UNKNOWN'); }
    const invalid = validateApprovalArtifact(approvalArtifact, nowMs);
    if (invalid) return deny(invalid);
    try {
      const bound = composeReviewedSources(sources, now, approvalArtifact.owner,
        approvalArtifact.session);
      return bound.coordinator.runOneUse({ approvalArtifact, signal });
    } catch { return deny('PACKAGE8_SOURCE_COMPOSITION_INVALID'); }
  }

  return Object.freeze({
    sourceOnly: true,
    developmentOnly: true,
    configured: false,
    reviewConfigured,
    enabled: false,
    mounted: false,
    routeMounted: false,
    sessionIssuanceEnabled: false,
    requestBodyAdmissionAuthorized: false,
    providerDispatchEnabled: false,
    storageDispatchEnabled: false,
    conversionDispatchEnabled: false,
    downloadDispatchEnabled: false,
    runtimeActivationAllowed: false,
    liveBindingsAccepted: false,
    productionBehaviorChanged: false,
    qualificationBinding: QUALIFICATION_BINDING,
    credentialReferences: CREDENTIAL_REFERENCES,
    environmentVariableReferences: ENVIRONMENT_VARIABLE_REFERENCES,
    limits: LIMITS,
    approvalIdDigest: APPROVAL_ID_DIGEST,
    lifecycleMonitorReviewed: monitorReviewed,
    sourceOperationMap: SOURCE_OPERATION_MAP,
    sourceComposition: composition,
    reviewOneUse,
  });
}

module.exports = {
  APPROVAL_ID_DIGEST,
  CREDENTIAL_REFERENCES,
  ENVIRONMENT_VARIABLE_REFERENCES,
  LIMITS,
  QUALIFICATION_BINDING,
  QUALIFICATION_REVIEW_GATE,
  SOURCE_OPERATION_MAP,
  approvalCommitment,
  createCadPhase5Package8DevelopmentQualificationBinding,
  validateApprovalArtifact,
};
