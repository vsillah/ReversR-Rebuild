// Source-only Package 8 metadata policy. This module is not imported by any
// route or runtime bootstrap and cannot contact a provider or dispatch work.
const { createHash } = require('node:crypto');

const SYNTHETIC_FIXTURE = Object.freeze({
  id: 'reversr-phase5-synthetic-private-line-v1',
  sha256: '0bdb42a7c58f4d51eee7eec2befae6ba590e43e0ecce34350cef9db4345c4c70',
  owner: 'ReversR test project',
  projectOwned: true,
  nonproprietary: true,
  customerData: false,
});

const POLICY = Object.freeze({
  schemaVersion: 1,
  fixture: SYNTHETIC_FIXTURE,
  maximumEvidenceAgeMs: 120_000,
  maximumWindowMs: 15 * 60_000,
  maximumSessions: 1,
  maximumFiles: 1,
  maximumAttempts: 1,
  maximumRetries: 0,
  maximumBytes: 8 * 1024 * 1024,
  maximumObjects: 12,
  maximumClassAOperations: 1_000,
  maximumClassBOperations: 1_000,
  maximumDeleteOperations: 1_000,
  maximumCostUsdExclusive: 9,
  quotaLedgerNamespace: 'phase5-synthetic-private-path-v1',
  r2Bucket: 'reversr-cad-package8-public-fixture-us',
  r2Jurisdiction: 'US',
  sandbox: Object.freeze({
    runtime: 'node24',
    region: 'iad1',
    vcpus: 1,
    memoryMbMaximum: 2048,
    lifetimeMsMaximum: 60_000,
    networkPolicy: 'deny-all',
    persistent: false,
    exposedPorts: 0,
    snapshotAllowed: false,
  }),
});

const CLOSE_FIRST_ACTIONS = Object.freeze([
  'CLOSE_ADMISSION_AND_CONVERSION',
  'REVOKE_EXACT_SESSION_AND_GRANTS',
  'STOP_KNOWN_SANDBOX_COMPUTE',
  'QUARANTINE_UNCERTAIN_RECORDS',
  'DELETE_EXACT_SYNTHETIC_ARTIFACTS_ONLY',
  'RECONCILE_DURABLE_AND_PROVIDER_METADATA_READ_ONLY',
  'RUN_EMPTY_UNAUTHENTICATED_FAIL_CLOSED_SMOKE',
]);

const REQUIRED_KEYS = Object.freeze({
  root: ['schemaVersion', 'observedAtUtc', 'window', 'fixture', 'operation', 'authority',
    'ownership', 'targets', 'budget', 'evidence'],
  window: ['idDigest', 'startUtc', 'endUtc', 'activated'],
  fixture: ['id', 'sha256', 'owner', 'projectOwned', 'nonproprietary', 'customerData'],
  operation: ['sessions', 'files', 'attempts', 'retries', 'unknownOutcome'],
  authority: ['freshAuthorizationVerified', 'bodyReadsBeforeFreshAuthorization'],
  ownership: ['ownerCommitment', 'shopCommitment', 'crossOwnerAttempts', 'mismatchCount'],
  targets: ['convex', 'r2', 'sandbox'],
  convex: ['teamSlug', 'projectSlug', 'deploymentName', 'identityVerified',
    'sourceToDeploymentFunctionEquivalence', 'quotaLedgerNamespace', 'stuckJobs',
    'uncertainRecords'],
  r2: ['bucket', 'jurisdiction', 'storageClass', 'publicAccess', 'customDomains',
    'lifecycleDeleteAfterDays', 'lifecycleStatus', 'objectCount', 'byteCount',
    'classAOperations', 'classBOperations', 'deleteOperations', 'usageUnknown'],
  sandbox: ['runtime', 'region', 'vcpus', 'memoryMb', 'lifetimeMs', 'networkPolicy',
    'persistent', 'exposedPorts', 'snapshotPresent', 'attempts', 'retries', 'status',
    'terminal', 'cleanupConfirmed', 'outcomeUnknown'],
  budget: ['currency', 'calculatedMaximumCostUsd', 'observedCostUsd', 'usageUnknown'],
  evidence: ['restrictedDestination', 'publicSafeDestination', 'metadataOnly',
    'rawProviderOutputPersisted', 'sensitiveFieldsPresent', 'r2DataAccessLogsAvailable',
    'monitoringEquivalenceClaimed'],
});

const STOP_CODES = Object.freeze([
  'AUTHORITY_ORDER_VIOLATION',
  'BUDGET_LIMIT_OR_UNKNOWN',
  'CROSS_OWNER_ACCESS',
  'EVIDENCE_PRIVACY_RISK',
  'EVIDENCE_STALE',
  'FIXTURE_OUT_OF_SCOPE',
  'METADATA_SHAPE_UNKNOWN',
  'R2_EXPOSURE_LIFECYCLE_OR_USAGE',
  'RETRY_OR_ATTEMPT_LIMIT',
  'SANDBOX_POLICY_OR_CLEANUP',
  'SOURCE_OR_TARGET_DRIFT',
  'STUCK_OR_UNCERTAIN_DURABLE_STATE',
  'UNKNOWN_OUTCOME',
  'WINDOW_INVALID_OR_INACTIVE',
]);

const digestPattern = /^[a-f0-9]{64}$/;
const exactKeys = (value, expected) => Boolean(value && typeof value === 'object'
  && !Array.isArray(value)
  && Object.keys(value).length === expected.length
  && expected.every(key => Object.hasOwn(value, key)));
const exactFixture = fixture => exactKeys(fixture, REQUIRED_KEYS.fixture)
  && REQUIRED_KEYS.fixture.every(key => fixture[key] === SYNTHETIC_FIXTURE[key]);
const finiteCount = value => Number.isSafeInteger(value) && value >= 0;
const sha256 = value => createHash('sha256').update(value).digest('hex');

function evaluatePackage8LifecycleMetadata(snapshot, { nowMs = Date.now() } = {}) {
  const codes = new Set();
  const add = code => codes.add(code);
  let snapshotDigest = sha256('UNPARSEABLE_METADATA');
  try {
    if (!Number.isSafeInteger(nowMs) || !exactKeys(snapshot, REQUIRED_KEYS.root)
        || snapshot.schemaVersion !== 1
        || !exactKeys(snapshot.window, REQUIRED_KEYS.window)
        || !exactKeys(snapshot.operation, REQUIRED_KEYS.operation)
        || !exactKeys(snapshot.authority, REQUIRED_KEYS.authority)
        || !exactKeys(snapshot.ownership, REQUIRED_KEYS.ownership)
        || !exactKeys(snapshot.targets, REQUIRED_KEYS.targets)
        || !exactKeys(snapshot.budget, REQUIRED_KEYS.budget)
        || !exactKeys(snapshot.evidence, REQUIRED_KEYS.evidence)
        || !Array.isArray(snapshot.targets.convex) || snapshot.targets.convex.length !== 1
        || !Array.isArray(snapshot.targets.r2) || snapshot.targets.r2.length !== 1
        || !Array.isArray(snapshot.targets.sandbox) || snapshot.targets.sandbox.length !== 1
        || !exactKeys(snapshot.targets.convex[0], REQUIRED_KEYS.convex)
        || !exactKeys(snapshot.targets.r2[0], REQUIRED_KEYS.r2)
        || !exactKeys(snapshot.targets.sandbox[0], REQUIRED_KEYS.sandbox)) {
      add('METADATA_SHAPE_UNKNOWN');
    }

    if (!exactFixture(snapshot.fixture)) add('FIXTURE_OUT_OF_SCOPE');

    const observed = Date.parse(snapshot.observedAtUtc);
    if (!Number.isFinite(observed) || observed > nowMs + 5_000
        || nowMs - observed > POLICY.maximumEvidenceAgeMs) add('EVIDENCE_STALE');

    const start = Date.parse(snapshot.window?.startUtc);
    const end = Date.parse(snapshot.window?.endUtc);
    if (!digestPattern.test(snapshot.window?.idDigest || '')
        || !Number.isFinite(start) || !Number.isFinite(end) || end <= start
        || end - start > POLICY.maximumWindowMs || snapshot.window?.activated !== true
        || observed < start || observed > end || nowMs > end) add('WINDOW_INVALID_OR_INACTIVE');

    const operation = snapshot.operation || {};
    if (operation.sessions !== POLICY.maximumSessions || operation.files !== POLICY.maximumFiles
        || operation.attempts !== POLICY.maximumAttempts
        || operation.retries !== POLICY.maximumRetries) add('RETRY_OR_ATTEMPT_LIMIT');
    if (operation.unknownOutcome !== false) add('UNKNOWN_OUTCOME');

    if (snapshot.authority?.freshAuthorizationVerified !== true
        || snapshot.authority?.bodyReadsBeforeFreshAuthorization !== 0) {
      add('AUTHORITY_ORDER_VIOLATION');
    }

    const ownership = snapshot.ownership || {};
    if (!digestPattern.test(ownership.ownerCommitment || '')
        || !digestPattern.test(ownership.shopCommitment || '')) add('METADATA_SHAPE_UNKNOWN');
    if (ownership.crossOwnerAttempts !== 0 || ownership.mismatchCount !== 0) {
      add('CROSS_OWNER_ACCESS');
    }

    const convex = snapshot.targets?.convex?.[0] || {};
    if (convex.teamSlug !== 'vambah-sillah' || convex.projectSlug !== 'reversr-cad-auth-dev'
        || convex.deploymentName !== 'majestic-alligator-31'
        || convex.identityVerified !== true
        || convex.sourceToDeploymentFunctionEquivalence !== 'NOT_CLAIMED'
        || convex.quotaLedgerNamespace !== POLICY.quotaLedgerNamespace) {
      add('SOURCE_OR_TARGET_DRIFT');
    }
    if (!finiteCount(convex.stuckJobs) || !finiteCount(convex.uncertainRecords)) {
      add('METADATA_SHAPE_UNKNOWN');
    } else if (convex.stuckJobs !== 0 || convex.uncertainRecords !== 0) {
      add('STUCK_OR_UNCERTAIN_DURABLE_STATE');
    }

    const r2 = snapshot.targets?.r2?.[0] || {};
    const r2Counts = [r2.objectCount, r2.byteCount, r2.classAOperations,
      r2.classBOperations, r2.deleteOperations];
    if (r2.bucket !== POLICY.r2Bucket || r2.jurisdiction !== POLICY.r2Jurisdiction
        || r2.storageClass !== 'STANDARD' || r2.publicAccess !== false
        || r2.customDomains !== 0 || r2.lifecycleDeleteAfterDays !== 1
        || r2.lifecycleStatus !== 'ENABLED' || r2.usageUnknown !== false
        || r2Counts.some(value => !finiteCount(value))
        || r2.objectCount > POLICY.maximumObjects || r2.byteCount > POLICY.maximumBytes
        || r2.classAOperations > POLICY.maximumClassAOperations
        || r2.classBOperations > POLICY.maximumClassBOperations
        || r2.deleteOperations > POLICY.maximumDeleteOperations) {
      add('R2_EXPOSURE_LIFECYCLE_OR_USAGE');
    }

    const sandbox = snapshot.targets?.sandbox?.[0] || {};
    if (sandbox.runtime !== POLICY.sandbox.runtime || sandbox.region !== POLICY.sandbox.region
        || sandbox.vcpus !== POLICY.sandbox.vcpus
        || !finiteCount(sandbox.memoryMb) || sandbox.memoryMb === 0
        || !finiteCount(sandbox.lifetimeMs) || sandbox.lifetimeMs === 0
        || sandbox.memoryMb > POLICY.sandbox.memoryMbMaximum
        || sandbox.lifetimeMs > POLICY.sandbox.lifetimeMsMaximum
        || sandbox.networkPolicy !== POLICY.sandbox.networkPolicy
        || sandbox.persistent !== POLICY.sandbox.persistent
        || sandbox.exposedPorts !== POLICY.sandbox.exposedPorts
        || sandbox.snapshotPresent !== false || sandbox.attempts !== 1 || sandbox.retries !== 0
        || sandbox.status !== 'stopped' || sandbox.terminal !== true
        || sandbox.cleanupConfirmed !== true || sandbox.outcomeUnknown !== false) {
      add('SANDBOX_POLICY_OR_CLEANUP');
    }

    const budget = snapshot.budget || {};
    if (budget.currency !== 'USD' || !Number.isFinite(budget.calculatedMaximumCostUsd)
        || !Number.isFinite(budget.observedCostUsd) || budget.usageUnknown !== false
        || budget.calculatedMaximumCostUsd >= POLICY.maximumCostUsdExclusive
        || budget.observedCostUsd >= POLICY.maximumCostUsdExclusive
        || budget.observedCostUsd < 0) add('BUDGET_LIMIT_OR_UNKNOWN');

    const evidence = snapshot.evidence || {};
    if (evidence.restrictedDestination
          !== '.local/cad-phase5-package8/readiness-monitoring-reconciliation/'
        || evidence.publicSafeDestination
          !== 'docs/cad-phase5-package8-public-evidence/'
        || evidence.metadataOnly !== true || evidence.rawProviderOutputPersisted !== false
        || evidence.sensitiveFieldsPresent !== false
        || evidence.r2DataAccessLogsAvailable !== false
        || evidence.monitoringEquivalenceClaimed !== false) add('EVIDENCE_PRIVACY_RISK');
    snapshotDigest = sha256(JSON.stringify(snapshot));
  } catch {
    add('METADATA_SHAPE_UNKNOWN');
    add('UNKNOWN_OUTCOME');
  }

  const stopCodes = [...codes].filter(code => STOP_CODES.includes(code)).sort();
  const status = stopCodes.length === 0 ? 'CONTINUE_WITHIN_REVIEWED_WINDOW' : 'STOP_REQUIRED';
  return Object.freeze({
    schemaVersion: 1,
    status,
    stopCodes: Object.freeze(stopCodes),
    closeFirstActions: status === 'STOP_REQUIRED' ? CLOSE_FIRST_ACTIONS : Object.freeze([]),
    snapshotDigest,
    metadataOnly: true,
    providerRequests: 0,
    retries: 0,
  });
}

function createDisabledPackage8LifecycleMonitor() {
  return Object.freeze({
    sourceOnly: true,
    configured: false,
    runtimeMonitoringEnabled: false,
    providerReadsEnabled: false,
    providerWritesEnabled: false,
    dispatchEnabled: false,
    evaluate: evaluatePackage8LifecycleMetadata,
    observe: async () => Object.freeze({ ok: false, code: 'PACKAGE8_MONITOR_DISABLED' }),
  });
}

module.exports = {
  CLOSE_FIRST_ACTIONS,
  POLICY,
  STOP_CODES,
  SYNTHETIC_FIXTURE,
  createDisabledPackage8LifecycleMonitor,
  evaluatePackage8LifecycleMetadata,
};
