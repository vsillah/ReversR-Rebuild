// Source-only Package 8 development-qualification composition. The reviewed
// factories are composed with injected dependencies, but no route or executor
// is mounted and no one-use approval artifact is included in source.
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
  POLICY: MONITOR_POLICY,
  createDisabledPackage8LifecycleMonitor,
  evaluatePackage8LifecycleMetadata,
} = require('./cadPhase5Package8LifecycleMonitor');
const {
  SYNTHETIC_OWNER,
  SYNTHETIC_PRIVATE_IGES_FIXTURE,
} = require('./cadPhase5SyntheticPrivatePathQualification');

const hash = value => createHash('sha256').update(value).digest('hex');
const exactKeys = (value, keys) => Boolean(value && typeof value === 'object'
  && !Array.isArray(value) && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key)));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const time = value => Number.isSafeInteger(value) && value >= 0;
const EMPTY_ENVIRONMENT = Object.freeze({});

const QUALIFICATION_BINDING = Object.freeze({
  mergedMainCommit: '499ee332c0d076f531561a1d79939bc8e9aaddff',
  mergedMainTree: '2b5c21f854327fbec81be6fa08d1e9aaa717f3fa',
  productionEvidenceDeploymentId: 'dpl_D9DcWPErFXC7De9q7pr7KWdQSs2t',
  postMergeRebindPacketSha256:
    '882e94de4d42c20934eb69c02b35eadb2c3fee24955bafa9f0c66f589d315cc3',
  reconciliationPacketSha256:
    'ebebc571d8ee1756ebb408b6612662a1f0d748627a14f6bea66695a11d89966c',
  sourceToDeploymentFunctionEquivalence: 'NOT_CLAIMED',
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
  reservationMicros: 8_999_999,
});
const APPROVAL_ID_DIGEST = hash([
  'cad-phase5-package8-final-development-qualification',
  QUALIFICATION_BINDING.mergedMainCommit,
  QUALIFICATION_BINDING.productionEvidenceDeploymentId,
  QUALIFICATION_BINDING.postMergeRebindPacketSha256,
].join('|'));
const QUALIFICATION_REVIEW_GATE = Object.freeze({
  schemaVersion: 1,
  mode: 'REVIEWED_SOURCE_COMPOSITION_ONLY',
  ...QUALIFICATION_BINDING,
  liveBindingsSupplied: false,
  providerDispatchAuthorized: false,
  runtimeActivationAuthorized: false,
});
const SOURCE_OPERATION_MAP = Object.freeze({
  convex: Object.freeze({ ...CONVEX_FUNCTIONS }),
  r2Provider: Object.freeze(['putExact', 'getExact', 'deleteExact', 'headExact']),
  r2Store: Object.freeze(['reserve', 'consumeOperation', 'readForOwner', 'markStored',
    'markUnknown', 'beginDelete', 'confirmDeleted', 'issueGrant', 'resolveGrant']),
  sandbox: Object.freeze(['create', 'loadAssets']),
  exactSession: Object.freeze(['verifyExactSession', 'insertIfAbsent', 'read', 'revoke']),
  closeFirst: Object.freeze([
    'convex.closeForRollback',
    'session.revokeSession',
    'sandbox.cleanupBlocked',
    'r2.deleteArtifact',
    'convex.reconcile',
  ]),
});

const deny = code => Object.freeze({ ok: false, code, sourceOnly: true,
  developmentOnly: true, maximumRetries: 0, providerRequests: 0,
  runtimeActivationAuthorized: false });

function validateApprovalArtifact(artifact, nowMs) {
  if (!time(nowMs) || !exactKeys(artifact, ['schemaVersion', 'kind', 'status',
    'approvalIdDigest', 'issuedAtUtc', 'authorityExpiresAtUtc', 'window', 'binding',
    'owner', 'fixture', 'limits', 'credentialReferences', 'environmentVariableReferences',
    'providerRequestsAuthorized', 'runtimeActivationAuthorized'])) {
    return 'PACKAGE8_APPROVAL_INVALID';
  }
  if (artifact.schemaVersion !== 1
      || artifact.kind !== 'CAD_PHASE5_PACKAGE8_ONE_USE_DEVELOPMENT_QUALIFICATION_APPROVAL'
      || artifact.status !== 'ISSUED_ONE_USE_DEVELOPMENT_QUALIFICATION'
      || artifact.approvalIdDigest !== APPROVAL_ID_DIGEST
      || artifact.providerRequestsAuthorized !== true
      || artifact.runtimeActivationAuthorized !== false
      || !same(artifact.binding, QUALIFICATION_BINDING)
      || !same(artifact.owner, SYNTHETIC_OWNER)
      || !same(artifact.fixture, {
        id: SYNTHETIC_PRIVATE_IGES_FIXTURE.id,
        sha256: SYNTHETIC_PRIVATE_IGES_FIXTURE.sha256,
        projectOwned: true,
        nonproprietary: true,
        customerData: false,
      })
      || !same(artifact.limits, LIMITS)
      || !same(artifact.credentialReferences, CREDENTIAL_REFERENCES)
      || !same(artifact.environmentVariableReferences, ENVIRONMENT_VARIABLE_REFERENCES)) {
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
  const r2StoreMethods = SOURCE_OPERATION_MAP.r2Store;
  const r2ProviderMethods = SOURCE_OPERATION_MAP.r2Provider;
  return Boolean(sources && typeof sources === 'object' && !Array.isArray(sources)
    && sources.convex && sources.r2 && sources.sandbox && sources.exactSession
    && typeof sources.convex.runQuery === 'function'
    && typeof sources.convex.runMutation === 'function'
    && sources.convex.references && typeof sources.convex.references === 'object'
    && r2StoreMethods.every(name => typeof sources.r2.store?.[name] === 'function')
    && r2ProviderMethods.every(name => typeof sources.r2.provider?.[name] === 'function')
    && typeof sources.sandbox.create === 'function'
    && typeof sources.sandbox.loadAssets === 'function'
    && typeof sources.exactSession.verifyExactSession === 'function'
    && ['insertIfAbsent', 'read', 'revoke']
      .every(name => typeof sources.exactSession.store?.[name] === 'function'));
}

function composeReviewedSources(sources, now) {
  const durableInvoker = createCadPhase5Package8ConvexDurableInvoker(sources.convex);
  const r2Custody = createCadR2PrivateArtifactCustody({
    enabled: true,
    provider: sources.r2.provider,
    store: sources.r2.store,
    now,
  });
  const sandboxExecutor = createSandboxExecutor({
    env: EMPTY_ENVIRONMENT,
    create: sources.sandbox.create,
    loadAssets: sources.sandbox.loadAssets,
  });
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
  if (durableInvoker.status().configured !== true || r2Custody.reviewConfigured !== true
    || exactSessionAuthority.configured !== true
    || typeof sandboxExecutor.convert !== 'function'
    || typeof uploadSessionService.revokeSession !== 'function') {
    throw Error('PACKAGE8_SOURCE_COMPOSITION_INVALID');
  }
  return Object.freeze({
    actualReviewedFactoriesComposed: true,
    executableAdaptersExposed: false,
    convexOperations: Object.freeze({ ...CONVEX_FUNCTIONS }),
    durableRemoteAttempts: durableInvoker.status().remoteAttempts,
    r2CustodyReviewConfigured: r2Custody.reviewConfigured,
    sandboxActiveCount: sandboxExecutor.activeCount(),
    sandboxCleanupBlocked: sandboxExecutor.cleanupBlocked(),
    exactSessionAuthorityConfigured: exactSessionAuthority.configured,
    sessionRevokerMapped: true,
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
  let sourceComposition = null;
  if (reviewOnly === true && same(approvalGate, QUALIFICATION_REVIEW_GATE)
    && monitorReviewed && typeof now === 'function' && dependenciesReady(sources)) {
    try { sourceComposition = composeReviewedSources(sources, now); } catch { sourceComposition = null; }
  }
  const reviewConfigured = sourceComposition !== null;

  async function reviewOneUse({ approvalArtifact } = {}) {
    if (!reviewConfigured) return deny('PACKAGE8_QUALIFICATION_BINDING_DISABLED');
    let nowMs;
    try { nowMs = now(); } catch { return deny('PACKAGE8_APPROVAL_TIME_UNKNOWN'); }
    const invalid = validateApprovalArtifact(approvalArtifact, nowMs);
    if (invalid) return deny(invalid);
    return deny('PACKAGE8_ONE_USE_EXECUTION_NOT_INSTALLED');
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
    sourceComposition,
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
  createCadPhase5Package8DevelopmentQualificationBinding,
  validateApprovalArtifact,
};
