// Unmounted, disabled-by-default Package 8 one-use development coordinator.
// It accepts only the reviewed adapters and a separately issued approval
// artifact. No route or runtime bootstrap imports this module.
const { createHash } = require('node:crypto');
const { inspectIgesSource } = require('../utils/igesAdmission');
const { DERIVED_WARNING } = require('./cadR2PrivateArtifactCustody');
const {
  POLICY: MONITOR_POLICY,
  SYNTHETIC_FIXTURE: MONITOR_FIXTURE,
  evaluatePackage8LifecycleMetadata,
} = require('./cadPhase5Package8LifecycleMonitor');
const {
  SYNTHETIC_PRIVATE_IGES_FIXTURE,
  createSyntheticPrivateIgesFixture,
} = require('./cadPhase5SyntheticPrivatePathQualification');
const { REQUIRED_DURABLE_OPERATIONS }
  = require('./cadPhase5Package8OneUseAdapters');

const OPERATION_BUDGET_MS = 800;
const SANDBOX_BUDGET_MS = 50_000;
const MAXIMUM_COST_MICROS_EXCLUSIVE = 9_000_000;
const RESERVATION_MICROS = MAXIMUM_COST_MICROS_EXCLUSIVE - 1;
const PACKAGE8_SCOPE_KEY = 'phase5-synthetic-private-path-v1';
const EXECUTION_BASELINE = Object.freeze({
  mergedMainCommit: '228320e174d23cbe9b43d9c192c2216733f4c477',
  mergedMainTree: 'cb22fc27d6bc741f2abc61ed0e456d66e2bfc336',
  productionEvidenceDeploymentId: 'dpl_5AAN3zH7vezsF7So7s93jxz7oVCY',
  finalBindingPacketSha256:
    '979ddfcc8ff378e50bd451365982b31fb232b21033d78d13f91f403829f4b012',
  postMergeRebindPacketSha256:
    '882e94de4d42c20934eb69c02b35eadb2c3fee24955bafa9f0c66f589d315cc3',
  reconciliationPacketSha256:
    'ebebc571d8ee1756ebb408b6612662a1f0d748627a14f6bea66695a11d89966c',
});
const EXECUTION_POLICY = Object.freeze({
  schemaVersion: 1,
  developmentOnly: true,
  maximumSessions: 1,
  maximumFiles: 1,
  maximumAttempts: 1,
  maximumRetries: 0,
  maximumWindowMs: 15 * 60_000,
  maximumCostUsdExclusive: 9,
  maximumCostMicrosExclusive: MAXIMUM_COST_MICROS_EXCLUSIVE,
  reservationMicros: RESERVATION_MICROS,
  currency: 'USD',
  routeMounted: false,
  sessionIssuanceEnabled: false,
  requestBodyAdmissionAuthorized: false,
  runtimeActivationAllowed: false,
  productionBehaviorChanged: false,
});
const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const commit = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const id = value => typeof value === 'string'
  && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const time = value => Number.isSafeInteger(value) && value >= 0;
const exactKeys = (value, keys) => Boolean(value && typeof value === 'object'
  && !Array.isArray(value) && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key)));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const deny = code => Object.freeze({ ok: false, code, sourceOnly: true,
  developmentOnly: true, maxRetries: 0, automaticRetries: 0,
  runtimeActivationAuthorized: false });
const safeDurableResult = value => Boolean(value && typeof value === 'object'
  && !Array.isArray(value) && value.sourceOnly === true && value.routeMounted === false
  && value.bodyAdmissionAuthorized === false && value.providerDispatchEnabled === false
  && value.conversionDispatchEnabled === false && value.downloadRouteEnabled === false);
const validInvoker = value => Boolean(value?.status?.().configured === true
  && REQUIRED_DURABLE_OPERATIONS.every(operation => typeof value[operation] === 'function'));
const validOwner = value => exactKeys(value, ['userId', 'shopId', 'uploadSessionId'])
  && [value.userId, value.shopId, value.uploadSessionId].every(id);
const validSession = value => exactKeys(value, ['sessionDigest', 'loginSessionId'])
  && digest(value.sessionDigest) && id(value.loginSessionId);

function expectedAncestryDigest(execution) {
  return hash([
    EXECUTION_BASELINE.mergedMainCommit,
    EXECUTION_BASELINE.mergedMainTree,
    execution.executionHeadCommit,
    execution.executionHeadTree,
    'clean-descendant',
  ].join('|'));
}

function expectedRuntimeReceiptDigest(runtime) {
  return hash([
    runtime.deploymentId,
    runtime.state,
    runtime.environment,
    runtime.commit,
    runtime.tree,
    runtime.functionEquivalence,
  ].join('|'));
}

function validExecutionBinding(value) {
  if (!exactKeys(value, ['schemaVersion', 'baseline', 'executionHeadCommit',
    'executionHeadTree', 'clean', 'descendantOfBaseline', 'ancestryReceiptDigest',
    'runtimeDeployment']) || value.schemaVersion !== 1
    || !same(value.baseline, EXECUTION_BASELINE)
    || !commit(value.executionHeadCommit) || !commit(value.executionHeadTree)
    || value.executionHeadCommit === EXECUTION_BASELINE.mergedMainCommit
    || value.clean !== true || value.descendantOfBaseline !== true
    || value.ancestryReceiptDigest !== expectedAncestryDigest(value)) return false;
  const runtime = value.runtimeDeployment;
  return exactKeys(runtime, ['schemaVersion', 'deploymentId', 'state', 'environment',
    'commit', 'tree', 'functionEquivalence', 'receiptDigest'])
    && runtime.schemaVersion === 1 && id(runtime.deploymentId)
    && runtime.state === 'READY' && runtime.environment === 'development'
    && runtime.commit === value.executionHeadCommit && runtime.tree === value.executionHeadTree
    && runtime.functionEquivalence === 'VERIFIED_EXACT'
    && runtime.receiptDigest === expectedRuntimeReceiptDigest(runtime);
}

function validFixtureBytes(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length !== SYNTHETIC_PRIVATE_IGES_FIXTURE.byteCount
    || hash(bytes) !== SYNTHETIC_PRIVATE_IGES_FIXTURE.sha256) return false;
  const inspected = inspectIgesSource({
    fileName: SYNTHETIC_PRIVATE_IGES_FIXTURE.fileName,
    bytes,
  });
  return inspected.ok === true && inspected.sourceBytes === bytes.length;
}

async function bounded(operation, parentSignal, timeoutMs) {
  const controller = new AbortController();
  const abort = () => controller.abort('PACKAGE8_CANCELLED');
  let timer;
  let onAbort;
  try {
    if (parentSignal?.aborted) throw Error('PACKAGE8_CANCELLED');
    parentSignal?.addEventListener('abort', abort, { once: true });
    const cancelled = new Promise((_, reject) => {
      onAbort = () => reject(Error('PACKAGE8_OPERATION_UNKNOWN'));
      controller.signal.addEventListener('abort', onAbort, { once: true });
      timer = setTimeout(() => controller.abort('PACKAGE8_TIMEOUT'), timeoutMs);
    });
    return await Promise.race([
      Promise.resolve().then(() => operation(controller.signal)),
      cancelled,
    ]);
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', abort);
    if (onAbort) controller.signal.removeEventListener('abort', onAbort);
    controller.abort('PACKAGE8_OPERATION_COMPLETE');
  }
}

function createCadPhase5Package8OneUseCoordinator({
  enabled = false,
  durable,
  cleanupDurable,
  custody,
  sandbox,
  sessionAuthority,
  sessionService,
  executionReceiptVerifier,
  lifecycleMetadata,
  owner,
  session,
  now = Date.now,
  operationBudgetMs = OPERATION_BUDGET_MS,
  sandboxBudgetMs = SANDBOX_BUDGET_MS,
} = {}) {
  const reviewConfigured = enabled === true && validInvoker(durable)
    && validInvoker(cleanupDurable)
    && custody?.sourceOnly === true && custody.reviewConfigured === true
    && ['reserveArtifact', 'commitArtifact', 'issueDownloadGrant', 'deleteArtifact']
      .every(name => typeof custody[name] === 'function')
    && sandbox?.sourceOnly === true && sandbox.reviewConfigured === true
    && typeof sandbox.convert === 'function' && typeof sandbox.cleanupStatus === 'function'
    && sessionAuthority?.sourceOnly === true && sessionAuthority.configured === true
    && typeof sessionAuthority.resolveAuthorization === 'function'
    && typeof sessionService?.revokeSession === 'function'
    && typeof executionReceiptVerifier?.verifyExact === 'function'
    && typeof lifecycleMetadata?.readSanitized === 'function'
    && validOwner(owner) && validSession(session)
    && typeof now === 'function' && Number.isSafeInteger(operationBudgetMs)
    && operationBudgetMs > 0 && operationBudgetMs <= OPERATION_BUDGET_MS
    && Number.isSafeInteger(sandboxBudgetMs) && sandboxBudgetMs > 0
    && sandboxBudgetMs <= SANDBOX_BUDGET_MS;

  const clock = () => {
    const value = now();
    if (!time(value)) throw Error('PACKAGE8_CLOCK_UNKNOWN');
    return value;
  };
  const durableCall = async (target, operation, args, signal) => bounded(async operationSignal => {
    operationSignal.throwIfAborted?.();
    const value = await target[operation](Object.freeze(args));
    operationSignal.throwIfAborted?.();
    if (!safeDurableResult(value)) throw Error('PACKAGE8_DURABLE_RESULT_UNKNOWN');
    return value;
  }, signal, operationBudgetMs);
  const reserveArtifact = (input, signal) => bounded(operationSignal =>
    custody.reserveArtifact(owner, Object.freeze(input), { signal: operationSignal }),
  signal, operationBudgetMs);
  const commitArtifact = (artifactId, bytes, signal) => bounded(operationSignal =>
    custody.commitArtifact(owner, artifactId, bytes, { signal: operationSignal }),
  signal, operationBudgetMs);
  const issueGrant = (artifactId, signal) => bounded(operationSignal =>
    custody.issueDownloadGrant(owner, artifactId, { signal: operationSignal }),
  signal, operationBudgetMs);
  const deleteArtifact = artifactId => bounded(operationSignal =>
    custody.deleteArtifact(owner, artifactId, { signal: operationSignal }),
  undefined, operationBudgetMs);

  async function verifyExecutionBinding(executionBinding, signal) {
    if (!validExecutionBinding(executionBinding)) throw Error('PACKAGE8_EXECUTION_BINDING_INVALID');
    const receipt = await bounded(operationSignal => executionReceiptVerifier.verifyExact(
      executionBinding, { signal: operationSignal }), signal, operationBudgetMs);
    const expected = {
      verified: true,
      baselineCommit: EXECUTION_BASELINE.mergedMainCommit,
      baselineTree: EXECUTION_BASELINE.mergedMainTree,
      executionHeadCommit: executionBinding.executionHeadCommit,
      executionHeadTree: executionBinding.executionHeadTree,
      clean: true,
      descendantOfBaseline: true,
      deploymentId: executionBinding.runtimeDeployment.deploymentId,
      deployedCommit: executionBinding.executionHeadCommit,
      deployedTree: executionBinding.executionHeadTree,
      deploymentState: 'READY',
      functionEquivalence: 'VERIFIED_EXACT',
    };
    if (!same(receipt, expected)) throw Error('PACKAGE8_EXECUTION_RECEIPT_UNKNOWN');
    return receipt;
  }

  async function closeFirst(context) {
    const closed = await durableCall(cleanupDurable, 'closeForRollback', {
      scopeKey: PACKAGE8_SCOPE_KEY,
      userId: owner.userId,
      shopId: owner.shopId,
      uploadSessionId: owner.uploadSessionId,
      reasonDigest: hash('package8-one-use-development-close-first'),
      now: clock(),
    });
    if (closed.accepted !== true || closed.code !== 'ROLLBACK_CLOSED_FIRST'
      || closed.admissionClosed !== true || closed.conversionClosed !== true
      || closed.grantsRevoked !== true || closed.uncertainRecordsQuarantined !== true) {
      throw Error('PACKAGE8_CLOSE_UNKNOWN');
    }

    const revoked = await bounded(() => sessionService.revokeSession(session.sessionDigest),
      undefined, operationBudgetMs);
    if (revoked?.ok !== true) throw Error('PACKAGE8_SESSION_REVOCATION_UNKNOWN');

    const cleanup = sandbox.cleanupStatus();
    if (cleanup?.stopped !== true || cleanup.cleanupConfirmed !== true
      || cleanup.outcomeUnknown !== false) throw Error('PACKAGE8_SANDBOX_CLEANUP_UNKNOWN');

    const reconciliationOwner = { ...owner };
    const control = await durableCall(cleanupDurable, 'reconcile', {
      kind: 'control', key: PACKAGE8_SCOPE_KEY, ...reconciliationOwner,
    });
    if (control.accepted !== true || control.state !== 'closed'
      || control.admissionClosed !== true || control.conversionClosed !== true
      || control.grantsRevoked !== true || control.uncertainRecordsQuarantined !== true) {
      throw Error('PACKAGE8_RECONCILIATION_UNKNOWN');
    }

    for (const grantDigest of context.grantDigests) {
      const grant = await durableCall(cleanupDurable, 'resolveDownloadGrant', {
        grantDigest, owner, now: clock(),
      });
      if (grant.accepted === true) throw Error('PACKAGE8_GRANT_REVOCATION_UNKNOWN');
    }

    let deletedArtifactCount = 0;
    for (const artifactId of context.artifactIds) {
      const artifact = await durableCall(cleanupDurable, 'reconcile', {
        kind: 'artifact', key: artifactId, ...reconciliationOwner,
      });
      if (artifact.accepted !== true || artifact.artifactId !== artifactId
        || artifact.state !== 'quarantined') {
        throw Error('PACKAGE8_OWNERSHIP_OR_QUARANTINE_UNKNOWN');
      }
      const deleted = await deleteArtifact(artifactId);
      if (deleted?.ok !== true || deleted.code !== 'ARTIFACT_DELETED'
        || deleted.artifactId !== artifactId || !digest(deleted.tombstoneDigest)) {
        throw Error('PACKAGE8_DELETE_UNKNOWN');
      }
      const tombstone = await durableCall(cleanupDurable, 'reconcile', {
        kind: 'tombstone', key: artifactId, ...reconciliationOwner,
      });
      if (tombstone.accepted !== true || tombstone.deleted !== true
        || tombstone.artifactId !== artifactId
        || tombstone.tombstoneDigest !== deleted.tombstoneDigest) {
        throw Error('PACKAGE8_DELETION_RECONCILIATION_UNKNOWN');
      }
      deletedArtifactCount += 1;
    }
    return Object.freeze({ deletedArtifactCount });
  }

  async function lifecycleReceipt(approvalArtifact, context) {
    const metadata = await bounded(operationSignal => lifecycleMetadata.readSanitized(
        Object.freeze({ owner,
        executionBinding: approvalArtifact.executionBinding }),
      { signal: operationSignal }), undefined, operationBudgetMs);
    if (!exactKeys(metadata, ['convex', 'r2', 'sandbox'])) throw Error('PACKAGE8_METADATA_UNKNOWN');
    const observedAt = clock();
    const snapshot = {
      schemaVersion: 1,
      observedAtUtc: new Date(observedAt).toISOString(),
      window: { idDigest: approvalArtifact.window.idDigest,
        startUtc: approvalArtifact.window.startUtc, endUtc: approvalArtifact.window.endUtc,
        activated: true },
      fixture: { ...MONITOR_FIXTURE },
      operation: { sessions: 1, files: 1, attempts: 1, retries: 0, unknownOutcome: false },
      authority: { freshAuthorizationVerified: true, bodyReadsBeforeFreshAuthorization: 0 },
      ownership: { ownerCommitment: hash([owner.userId, owner.shopId,
        owner.uploadSessionId].join('|')),
      shopCommitment: hash(owner.shopId), crossOwnerAttempts: 0, mismatchCount: 0 },
      targets: { convex: [metadata.convex], r2: [metadata.r2], sandbox: [metadata.sandbox] },
      budget: { currency: 'USD',
        calculatedMaximumCostUsd: approvalArtifact.calculatedMaximumCostMicros / 1_000_000,
        observedCostUsd: approvalArtifact.observedCostMicros / 1_000_000,
        usageUnknown: false },
      evidence: {
        restrictedDestination: '.local/cad-phase5-package8/readiness-monitoring-reconciliation/',
        publicSafeDestination: 'docs/cad-phase5-package8-public-evidence/',
        metadataOnly: true,
        rawProviderOutputPersisted: false,
        sensitiveFieldsPresent: false,
        r2DataAccessLogsAvailable: false,
        monitoringEquivalenceClaimed: false,
      },
    };
    const monitored = evaluatePackage8LifecycleMetadata(snapshot, { nowMs: observedAt });
    if (monitored.status !== 'CONTINUE_WITHIN_REVIEWED_WINDOW'
      || monitored.stopCodes.length !== 0
      || monitored.providerRequests !== 0 || monitored.retries !== 0) {
      throw Error('PACKAGE8_MONITOR_UNKNOWN');
    }
    return Object.freeze({ snapshotDigest: monitored.snapshotDigest,
      stopCodes: monitored.stopCodes, metadataOnly: monitored.metadataOnly,
      deletedArtifactCount: context.deletedArtifactCount });
  }

  async function runOneUse({ approvalArtifact, signal } = {}) {
    if (!reviewConfigured) return deny('PACKAGE8_COORDINATOR_DISABLED');
    const context = { claimStarted: false, artifactIds: [], grantDigests: [],
      deletedArtifactCount: 0 };
    let cleanupAttempted = false;
    try {
      await verifyExecutionBinding(approvalArtifact.executionBinding, signal);
      const grant = await bounded(operationSignal => sessionAuthority.resolveAuthorization(
        Object.freeze({ schemaVersion: 1, cohort: sessionAuthority.cohort,
          requestRef: approvalArtifact.approvalIdDigest,
          shopId: owner.shopId,
          loginSessionRef: session.loginSessionId,
          transport: 'bearer' }), { signal: operationSignal }), signal, operationBudgetMs);
      if (!grant || grant.userId !== owner.userId
        || grant.shopId !== owner.shopId
        || grant.loginSessionId !== session.loginSessionId
        || grant.cadUploadAllowed !== true || grant.expiresAt < Date.parse(approvalArtifact.window.endUtc)) {
        throw Error('PACKAGE8_SESSION_AUTHORITY_UNKNOWN');
      }

      const createdAt = clock();
      const idempotencyDigest = hash([
        approvalArtifact.approvalIdDigest,
        approvalArtifact.window.idDigest,
        approvalArtifact.executionBinding.executionHeadCommit,
      ].join('|'));
      const attemptId = `package8-${idempotencyDigest.slice(0, 32)}`;
      const attempt = Object.freeze({
        idempotencyDigest,
        attemptId,
        ...owner,
        authorityGeneration: 1,
        deploymentRef: approvalArtifact.executionBinding.runtimeDeployment.deploymentId,
        cohortRef: 'package8-one-use-development',
        evidenceDigest: approvalArtifact.executionBinding.runtimeDeployment.receiptDigest,
        retentionPolicyDigest: hash('package8-exact-artifacts-close-first-delete'),
        reservationMicros: RESERVATION_MICROS,
        maxRetries: 0,
        createdAt,
        expiresAt: Date.parse(approvalArtifact.window.endUtc),
      });
      context.claimStarted = true;
      const claim = await durableCall(durable, 'claimUpload', {
        scopeKey: PACKAGE8_SCOPE_KEY,
        attempt,
        policy: { maxAttempts: 1, maxConcurrent: 1, budgetMicros: RESERVATION_MICROS },
      }, signal);
      if (claim.accepted !== true) {
        if (claim.replayed === true || ['IDEMPOTENCY_REPLAYED', 'ORCHESTRATION_QUARANTINED',
          'ORCHESTRATION_CLOSED'].includes(claim.code)) return deny('PACKAGE8_ATTEMPT_CONSUMED');
        throw Error('PACKAGE8_CLAIM_UNKNOWN');
      }
      if (claim.code !== 'UPLOAD_ATTEMPT_CLAIMED' || claim.status !== 'claimed'
        || claim.attemptId !== attemptId || !Number.isSafeInteger(claim.fence)
        || claim.fence < 1) throw Error('PACKAGE8_CLAIM_UNKNOWN');

      const originalReservation = await reserveArtifact({
        kind: 'original-igs', format: 'model/iges',
        byteCount: SYNTHETIC_PRIVATE_IGES_FIXTURE.byteCount,
        restrictedDigest: SYNTHETIC_PRIVATE_IGES_FIXTURE.sha256,
      }, signal);
      if (originalReservation?.ok !== true || originalReservation.code !== 'ARTIFACT_RESERVED'
        || !id(originalReservation.artifactId)) throw Error('PACKAGE8_QUOTA_RESERVATION_UNKNOWN');
      context.artifactIds.push(originalReservation.artifactId);

      const fixture = createSyntheticPrivateIgesFixture();
      if (!validFixtureBytes(fixture.bytes)) throw Error('PACKAGE8_FIXTURE_UNKNOWN');
      const originalCommit = await commitArtifact(originalReservation.artifactId,
        fixture.bytes, signal);
      if (originalCommit?.ok !== true || originalCommit.code !== 'ARTIFACT_STORED'
        || originalCommit.artifactId !== originalReservation.artifactId) {
        throw Error('PACKAGE8_PROVIDER_ACK_UNKNOWN');
      }

      const converted = await bounded(operationSignal => sandbox.convert(fixture.bytes,
        SYNTHETIC_PRIVATE_IGES_FIXTURE.fileName, operationSignal), signal, sandboxBudgetMs);
      if (converted?.status !== 'ready' || converted.sourceSha256 !== hash(fixture.bytes)
        || !Buffer.isBuffer(converted.stlBytes) || converted.stlBytes.length === 0
        || converted.stlBytes.length > MONITOR_POLICY.maximumBytes
        || !digest(converted.geometryDigest) || converted.cleanupConfirmed !== true
        || converted.outcomeUnknown !== false || converted.attempts !== 1
        || converted.retries !== 0) throw Error('PACKAGE8_SANDBOX_OUTCOME_UNKNOWN');

      const stlDigest = hash(converted.stlBytes);
      const stlReservation = await reserveArtifact({
        kind: 'derived-stl', format: 'model/stl', byteCount: converted.stlBytes.length,
        restrictedDigest: stlDigest, sourceArtifactId: originalReservation.artifactId,
        sourceDigest: SYNTHETIC_PRIVATE_IGES_FIXTURE.sha256,
        geometryDigest: converted.geometryDigest, units: 'millimeter',
        warning: DERIVED_WARNING,
      }, signal);
      if (stlReservation?.ok !== true || stlReservation.code !== 'ARTIFACT_RESERVED'
        || !id(stlReservation.artifactId)) throw Error('PACKAGE8_STL_RESERVATION_UNKNOWN');
      context.artifactIds.push(stlReservation.artifactId);
      const stlCommit = await commitArtifact(stlReservation.artifactId,
        converted.stlBytes, signal);
      if (stlCommit?.ok !== true || stlCommit.code !== 'ARTIFACT_STORED'
        || stlCommit.artifactId !== stlReservation.artifactId) {
        throw Error('PACKAGE8_STL_PROVIDER_ACK_UNKNOWN');
      }

      for (const artifactId of [originalReservation.artifactId, stlReservation.artifactId]) {
        const downloadGrant = await issueGrant(artifactId, signal);
        if (downloadGrant?.ok !== true || downloadGrant.code !== 'DOWNLOAD_GRANT_ISSUED'
          || typeof downloadGrant.token !== 'string'
          || !/^dg1\.[A-Za-z0-9_-]{43}$/.test(downloadGrant.token)) {
          throw Error('PACKAGE8_GRANT_UNKNOWN');
        }
        const grantDigest = hash(downloadGrant.token);
        context.grantDigests.push(grantDigest);
        const resolved = await durableCall(durable, 'resolveDownloadGrant', {
          grantDigest, owner, now: clock(),
        }, signal);
        if (resolved.accepted !== true || resolved.artifactId !== artifactId) {
          throw Error('PACKAGE8_GRANT_BINDING_UNKNOWN');
        }
      }

      cleanupAttempted = true;
      const cleaned = await closeFirst(context);
      context.deletedArtifactCount = cleaned.deletedArtifactCount;
      const lifecycle = await lifecycleReceipt(approvalArtifact, context);
      return Object.freeze({
        ok: true,
        code: 'PACKAGE8_ONE_USE_DEVELOPMENT_QUALIFIED_CLOSED',
        sourceOnly: true,
        developmentOnly: true,
        fixtureClassification: 'RESTRICTED_SYNTHETIC_TEST_ONLY',
        sessionCount: 1,
        fileCount: 1,
        attemptCount: 1,
        automaticRetries: 0,
        reservationMicros: RESERVATION_MICROS,
        maximumCostMicrosExclusive: MAXIMUM_COST_MICROS_EXCLUSIVE,
        admissionClosed: true,
        conversionClosed: true,
        sessionRevoked: true,
        grantsRevoked: true,
        uncertainRecordsQuarantined: true,
        deletedArtifactCount: lifecycle.deletedArtifactCount,
        metadataOnly: lifecycle.metadataOnly,
        lifecycleSnapshotDigest: lifecycle.snapshotDigest,
        lifecycleStopCodes: lifecycle.stopCodes,
        reviewedBaselineCommit: EXECUTION_BASELINE.mergedMainCommit,
        executionHeadCommit: approvalArtifact.executionBinding.executionHeadCommit,
        runtimeDeploymentId: approvalArtifact.executionBinding.runtimeDeployment.deploymentId,
        sourceToDeploymentFunctionEquivalence: 'VERIFIED_EXACT',
        routeMounted: false,
        sessionIssuanceEnabled: false,
        requestBodyAdmissionAuthorized: false,
        runtimeActivationAllowed: false,
        productionBehaviorChanged: false,
      });
    } catch {
      if (context.claimStarted && !cleanupAttempted) {
        cleanupAttempted = true;
        try { await closeFirst(context); } catch { /* Unknown remains closed or quarantined. */ }
      }
      return deny(context.claimStarted
        ? 'PACKAGE8_EXECUTION_QUARANTINED'
        : 'PACKAGE8_EXECUTION_UNAVAILABLE');
    }
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
    conversionDispatchEnabled: false,
    downloadDispatchEnabled: false,
    runtimeActivationAllowed: false,
    productionBehaviorChanged: false,
    automaticRetries: 0,
    baseline: EXECUTION_BASELINE,
    policy: EXECUTION_POLICY,
    fixture: SYNTHETIC_PRIVATE_IGES_FIXTURE,
    runOneUse,
  });
}

module.exports = {
  EXECUTION_BASELINE,
  EXECUTION_POLICY,
  MAXIMUM_COST_MICROS_EXCLUSIVE,
  OPERATION_BUDGET_MS,
  PACKAGE8_SCOPE_KEY,
  RESERVATION_MICROS,
  SANDBOX_BUDGET_MS,
  createCadPhase5Package8OneUseCoordinator,
  expectedAncestryDigest,
  expectedRuntimeReceiptDigest,
  validExecutionBinding,
};
