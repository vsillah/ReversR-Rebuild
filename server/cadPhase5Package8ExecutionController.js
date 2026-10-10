// Development-review-only Package 8 controller. It is deliberately absent
// from every route and runtime bootstrap. Durable calls use the existing
// Package 7 operation names; custody and Sandbox calls use their reviewed
// positional source contracts through explicit offline-only bridges.
const { createHash } = require('node:crypto');
const { inspectIgesSource } = require('../utils/igesAdmission');
const {
  SYNTHETIC_PRIVATE_IGES_FIXTURE,
  SYNTHETIC_OWNER,
  createSyntheticPrivateIgesFixture,
} = require('./cadPhase5SyntheticPrivatePathQualification');
const {
  POLICY: MONITOR_POLICY,
  SYNTHETIC_FIXTURE: MONITOR_FIXTURE,
  evaluatePackage8LifecycleMetadata,
} = require('./cadPhase5Package8LifecycleMonitor');
const { REQUIRED_DURABLE_OPERATIONS } = require('./cadPhase5Package8SourceBridges');

const OPERATION_BUDGET_MS = 800;
const MAXIMUM_COST_MICROS_EXCLUSIVE = 9_000_000;
const RESERVATION_MICROS = MAXIMUM_COST_MICROS_EXCLUSIVE - 1;
const PACKAGE8_SCOPE_KEY = 'phase5-synthetic-private-path-v1';
const PACKAGE8_SESSION_DIGEST = 'c'.repeat(64);
const PACKAGE8_ATTEMPT_ID = 'phase5-package8-development-review-attempt';
const DERIVED_WARNING = 'Inspection geometry only - not validated for manufacturing.';
const PACKAGE8_EVIDENCE_BINDING = Object.freeze({
  vercelDeploymentId: 'dpl_9FnZqUdqpUyzNhqS1GRwMoJpA14c',
  reconciliationPacketPath:
    'docs/cad-phase5-package8-public-evidence/readiness-monitoring-reconciliation.json',
  reconciliationPacketSha256:
    'ebebc571d8ee1756ebb408b6612662a1f0d748627a14f6bea66695a11d89966c',
  sourceToDeploymentFunctionEquivalence: 'NOT_CLAIMED',
});
const PACKAGE8_POLICY = Object.freeze({
  schemaVersion: 1,
  developmentOnly: true,
  maximumSessions: 1,
  maximumFiles: 1,
  maximumAttempts: 1,
  maximumRetries: 0,
  maximumWindowMs: 15 * 60_000,
  maximumCostMicrosExclusive: MAXIMUM_COST_MICROS_EXCLUSIVE,
  reservationMicros: RESERVATION_MICROS,
  currency: 'USD',
  routeMounted: false,
  sessionIssuanceEnabled: false,
  requestBodyAdmissionAuthorized: false,
  providerDispatchEnabled: false,
  runtimeActivationAllowed: false,
  productionBehaviorChanged: false,
});
const QUOTA_POLICY = Object.freeze({
  maxStoredBytes: MONITOR_POLICY.maximumBytes,
  maxObjects: MONITOR_POLICY.maximumObjects,
  maxClassAOperations: MONITOR_POLICY.maximumClassAOperations,
  maxClassBOperations: MONITOR_POLICY.maximumClassBOperations,
  maxDeleteOperations: MONITOR_POLICY.maximumDeleteOperations,
});
const hash = value => createHash('sha256').update(value).digest('hex');
const deny = code => Object.freeze({ ok: false, code, sourceOnly: true,
  developmentOnly: true, maxRetries: 0, providerRequests: 0 });
const id = value => typeof value === 'string'
  && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const time = value => Number.isSafeInteger(value) && value >= 0;
const exactKeys = (value, keys) => Boolean(value && typeof value === 'object'
  && !Array.isArray(value) && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key)));
const sameOwner = value => value?.userId === SYNTHETIC_OWNER.userId
  && value?.shopId === SYNTHETIC_OWNER.shopId
  && value?.uploadSessionId === SYNTHETIC_OWNER.uploadSessionId;
const safePort = (value, methods) => Boolean(value?.offlineSynthetic === true
  && methods.every(name => typeof value[name] === 'function'));
const safeDurableResult = value => Boolean(value && typeof value === 'object'
  && !Array.isArray(value) && value.sourceOnly === true && value.routeMounted === false
  && value.bodyAdmissionAuthorized === false && value.providerDispatchEnabled === false
  && value.conversionDispatchEnabled === false && value.downloadRouteEnabled === false);

const INTENT_FIELDS = Object.freeze({
  schemaVersion: 1,
  runDigest: hash('phase5-package8-development-review-one-use-v2'),
  protocolDigest: hash('authority;claimUpload;reserveArtifact;consumeQuota;fixture;custody;sandbox;grants;closeForRollback;confirmDeleted;monitor'),
  targetDigest: hash([PACKAGE8_SCOPE_KEY, SYNTHETIC_PRIVATE_IGES_FIXTURE.sha256,
    MONITOR_POLICY.r2Bucket, MONITOR_POLICY.sandbox.runtime, MONITOR_POLICY.sandbox.region,
    PACKAGE8_EVIDENCE_BINDING.vercelDeploymentId,
    PACKAGE8_EVIDENCE_BINDING.reconciliationPacketSha256].join('|')),
  ownerDigest: hash([SYNTHETIC_OWNER.userId, SYNTHETIC_OWNER.shopId,
    SYNTHETIC_OWNER.uploadSessionId].join('|')),
});
const PACKAGE8_EXECUTION_INTENT = Object.freeze({ ...INTENT_FIELDS,
  commitmentDigest: hash(JSON.stringify(INTENT_FIELDS)) });

function validWindow(window, nowMs) {
  if (!exactKeys(window, ['schemaVersion', 'idDigest', 'startUtc', 'endUtc', 'activated'])
    || window.schemaVersion !== 1 || !digest(window.idDigest) || window.activated !== false) return false;
  const start = Date.parse(window.startUtc);
  const end = Date.parse(window.endUtc);
  return Number.isFinite(start) && Number.isFinite(end) && start > nowMs && end > start
    && end - start <= PACKAGE8_POLICY.maximumWindowMs;
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

function createCadPhase5Package8ExecutionController({
  reviewOnly = false,
  authority,
  intentLedger,
  durable,
  custody,
  sandbox,
  sessionRevoker,
  fixtureReader,
  lifecycleMetadata,
  now = Date.now,
  operationBudgetMs = OPERATION_BUDGET_MS,
} = {}) {
  const durableReady = durable?.offlineSynthetic === true
    && typeof durable.call === 'function'
    && REQUIRED_DURABLE_OPERATIONS.every(operation => durable.operations?.includes(operation));
  const reviewConfigured = reviewOnly === true && durableReady
    && safePort(authority, ['verifyExact']) && safePort(intentLedger, ['consumeOnce'])
    && safePort(custody, ['reserveArtifact', 'commitArtifact', 'issueDownloadGrant', 'deleteArtifact'])
    && safePort(sandbox, ['convert', 'cleanupStatus'])
    && safePort(sessionRevoker, ['revokeExact']) && safePort(fixtureReader, ['readExact'])
    && safePort(lifecycleMetadata, ['readSanitized'])
    && typeof now === 'function' && Number.isSafeInteger(operationBudgetMs)
    && operationBudgetMs > 0 && operationBudgetMs <= OPERATION_BUDGET_MS;
  let consumed = false;

  const clock = () => {
    const value = now();
    if (!time(value)) throw Error('PACKAGE8_CLOCK_UNKNOWN');
    return value;
  };
  const single = (port, method, args, signal) => bounded(
    operationSignal => port[method](Object.freeze(args), { signal: operationSignal }),
    signal,
    operationBudgetMs,
  );
  const durableCall = async (operation, args, signal) => bounded(async operationSignal => {
    const value = await durable.call(operation, Object.freeze(args), { signal: operationSignal });
    if (!safeDurableResult(value)) throw Error('PACKAGE8_DURABLE_RESULT_UNKNOWN');
    return value;
  }, signal, operationBudgetMs);
  const reserveArtifact = (input, signal) => bounded(operationSignal =>
    custody.reserveArtifact(SYNTHETIC_OWNER, Object.freeze(input), { signal: operationSignal }),
  signal, operationBudgetMs);
  const commitArtifact = (artifactId, bytes, signal) => bounded(operationSignal =>
    custody.commitArtifact(SYNTHETIC_OWNER, artifactId, bytes, { signal: operationSignal }),
  signal, operationBudgetMs);
  const issueGrant = (artifactId, signal) => bounded(operationSignal =>
    custody.issueDownloadGrant(SYNTHETIC_OWNER, artifactId, { signal: operationSignal }),
  signal, operationBudgetMs);
  const deleteArtifact = artifactId => bounded(operationSignal =>
    custody.deleteArtifact(SYNTHETIC_OWNER, artifactId, { signal: operationSignal }),
  undefined, operationBudgetMs);

  async function closeFirst(context) {
    const closed = await durableCall('closeForRollback', {
      scopeKey: PACKAGE8_SCOPE_KEY,
      userId: SYNTHETIC_OWNER.userId,
      shopId: SYNTHETIC_OWNER.shopId,
      uploadSessionId: SYNTHETIC_OWNER.uploadSessionId,
      reasonDigest: hash('package8-development-review-close-first'),
      now: clock(),
    });
    if (closed.accepted !== true || closed.code !== 'ROLLBACK_CLOSED_FIRST'
      || closed.admissionClosed !== true || closed.conversionClosed !== true
      || closed.grantsRevoked !== true || closed.uncertainRecordsQuarantined !== true) {
      throw Error('PACKAGE8_CLOSE_UNKNOWN');
    }

    const revoked = await single(sessionRevoker, 'revokeExact', {
      sessionDigest: PACKAGE8_SESSION_DIGEST,
      uploadSessionId: SYNTHETIC_OWNER.uploadSessionId,
      owner: SYNTHETIC_OWNER,
    });
    if (revoked?.revoked !== true
      || revoked.uploadSessionId !== SYNTHETIC_OWNER.uploadSessionId) {
      throw Error('PACKAGE8_SESSION_REVOCATION_UNKNOWN');
    }

    const cleanup = sandbox.cleanupStatus();
    if (cleanup?.stopped !== true || cleanup.cleanupConfirmed !== true
      || cleanup.outcomeUnknown !== false) throw Error('PACKAGE8_SANDBOX_CLEANUP_UNKNOWN');

    const reconciliationOwner = { userId: SYNTHETIC_OWNER.userId,
      shopId: SYNTHETIC_OWNER.shopId, uploadSessionId: SYNTHETIC_OWNER.uploadSessionId };
    const control = await durableCall('reconcile', {
      kind: 'control', key: PACKAGE8_SCOPE_KEY, ...reconciliationOwner,
    });
    if (control.accepted !== true || control.state !== 'closed'
      || control.admissionClosed !== true || control.conversionClosed !== true
      || control.grantsRevoked !== true || control.uncertainRecordsQuarantined !== true) {
      throw Error('PACKAGE8_RECONCILIATION_UNKNOWN');
    }

    for (const grantDigest of context.grantDigests) {
      const grant = await durableCall('resolveDownloadGrant', {
        grantDigest, owner: SYNTHETIC_OWNER, now: clock(),
      });
      if (grant.accepted === true) throw Error('PACKAGE8_GRANT_REVOCATION_UNKNOWN');
    }

    let deletedArtifactCount = 0;
    for (const artifactId of context.artifactIds) {
      const artifact = await durableCall('reconcile', {
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
      const tombstone = await durableCall('reconcile', {
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

  async function lifecycleReceipt(window, authorityReceipt, context) {
    const metadata = await single(lifecycleMetadata, 'readSanitized', {
      owner: SYNTHETIC_OWNER,
    });
    if (!exactKeys(metadata, ['convex', 'r2', 'sandbox'])) {
      throw Error('PACKAGE8_METADATA_UNKNOWN');
    }
    const observedAt = clock();
    const snapshot = {
      schemaVersion: 1,
      observedAtUtc: new Date(observedAt).toISOString(),
      window: { idDigest: window.idDigest, startUtc: window.startUtc,
        endUtc: window.endUtc, activated: false },
      fixture: { ...MONITOR_FIXTURE },
      operation: { sessions: 1, files: 1, attempts: 1, retries: 0, unknownOutcome: false },
      authority: { freshAuthorizationVerified: true, bodyReadsBeforeFreshAuthorization: 0 },
      ownership: { ownerCommitment: INTENT_FIELDS.ownerDigest,
        shopCommitment: hash(SYNTHETIC_OWNER.shopId), crossOwnerAttempts: 0, mismatchCount: 0 },
      targets: { convex: [metadata.convex], r2: [metadata.r2], sandbox: [metadata.sandbox] },
      budget: { currency: 'USD',
        calculatedMaximumCostUsd: authorityReceipt.calculatedMaximumCostMicros / 1_000_000,
        observedCostUsd: authorityReceipt.observedCostMicros / 1_000_000,
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
    if (monitored.status !== 'STOP_REQUIRED'
      || JSON.stringify(monitored.stopCodes) !== JSON.stringify(['WINDOW_INVALID_OR_INACTIVE'])
      || monitored.providerRequests !== 0 || monitored.retries !== 0) {
      throw Error('PACKAGE8_MONITOR_UNKNOWN');
    }
    return Object.freeze({ snapshotDigest: monitored.snapshotDigest,
      stopCodes: monitored.stopCodes, metadataOnly: monitored.metadataOnly,
      deletedArtifactCount: context.deletedArtifactCount });
  }

  async function reviewOneUse({ window, signal } = {}) {
    if (!reviewConfigured) return deny('PACKAGE8_CONTROLLER_DISABLED');
    if (consumed) return deny('PACKAGE8_ATTEMPT_CONSUMED');
    consumed = true;
    const context = { claimStarted: false, artifactIds: [], grantDigests: [],
      deletedArtifactCount: 0 };
    let authorityReceipt;
    let cleanupAttempted = false;
    try {
      const checkedAt = clock();
      if (!validWindow(window, checkedAt)) return deny('PACKAGE8_WINDOW_INVALID');
      const intent = await single(intentLedger, 'consumeOnce', {
        ...PACKAGE8_EXECUTION_INTENT,
        windowDigest: window.idDigest,
      }, signal);
      if (intent?.accepted === false && intent.code === 'PACKAGE8_INTENT_REPLAYED') {
        return deny('PACKAGE8_ATTEMPT_CONSUMED');
      }
      if (intent?.accepted !== true || intent.code !== 'PACKAGE8_INTENT_CONSUMED'
        || intent.commitmentDigest !== PACKAGE8_EXECUTION_INTENT.commitmentDigest) {
        throw Error('PACKAGE8_INTENT_UNKNOWN');
      }

      authorityReceipt = await single(authority, 'verifyExact', {
        owner: SYNTHETIC_OWNER,
        sessionDigest: PACKAGE8_SESSION_DIGEST,
        fixture: SYNTHETIC_PRIVATE_IGES_FIXTURE,
        evidenceBinding: PACKAGE8_EVIDENCE_BINDING,
        window,
        reservationMicros: RESERVATION_MICROS,
      }, signal);
      if (authorityReceipt?.authorized !== true || !sameOwner(authorityReceipt)
        || !Number.isSafeInteger(authorityReceipt.authorityGeneration)
        || authorityReceipt.authorityGeneration < 1
        || !time(authorityReceipt.expiresAt)
        || authorityReceipt.expiresAt < Date.parse(window.endUtc)
        || !Number.isSafeInteger(authorityReceipt.calculatedMaximumCostMicros)
        || authorityReceipt.calculatedMaximumCostMicros < 0
        || authorityReceipt.calculatedMaximumCostMicros >= MAXIMUM_COST_MICROS_EXCLUSIVE
        || !Number.isSafeInteger(authorityReceipt.observedCostMicros)
        || authorityReceipt.observedCostMicros < 0
        || authorityReceipt.observedCostMicros >= MAXIMUM_COST_MICROS_EXCLUSIVE
        || authorityReceipt.reservationMicros !== RESERVATION_MICROS
        || authorityReceipt.windowActivated !== false) {
        throw Error('PACKAGE8_AUTHORITY_OR_COST_UNKNOWN');
      }

      const createdAt = clock();
      const attempt = Object.freeze({
        idempotencyDigest: hash(`${PACKAGE8_EXECUTION_INTENT.commitmentDigest}:${window.idDigest}`),
        attemptId: PACKAGE8_ATTEMPT_ID,
        ...SYNTHETIC_OWNER,
        authorityGeneration: authorityReceipt.authorityGeneration,
        deploymentRef: PACKAGE8_EVIDENCE_BINDING.vercelDeploymentId,
        cohortRef: 'package8-offline-review',
        evidenceDigest: PACKAGE8_EVIDENCE_BINDING.reconciliationPacketSha256,
        retentionPolicyDigest: hash('package8-exact-artifacts-close-first-delete'),
        reservationMicros: RESERVATION_MICROS,
        maxRetries: 0,
        createdAt,
        expiresAt: Date.parse(window.endUtc),
      });
      context.claimStarted = true;
      const claim = await durableCall('claimUpload', {
        scopeKey: PACKAGE8_SCOPE_KEY,
        attempt,
        policy: { maxAttempts: 1, maxConcurrent: 1, budgetMicros: RESERVATION_MICROS },
      }, signal);
      if (claim.accepted !== true || claim.code !== 'UPLOAD_ATTEMPT_CLAIMED'
        || claim.status !== 'claimed' || claim.attemptId !== PACKAGE8_ATTEMPT_ID
        || !Number.isSafeInteger(claim.fence) || claim.fence < 1) {
        throw Error('PACKAGE8_CLAIM_UNKNOWN');
      }

      // claimUpload and the custody store's durable reserveArtifact operation
      // both complete before the only fixture-byte read. commitArtifact later
      // consumes the exact class-a quota through durable consumeQuota.
      const originalReservation = await reserveArtifact({
        kind: 'original-igs', format: 'model/iges',
        byteCount: SYNTHETIC_PRIVATE_IGES_FIXTURE.byteCount,
        restrictedDigest: SYNTHETIC_PRIVATE_IGES_FIXTURE.sha256,
      }, signal);
      if (originalReservation?.ok !== true || originalReservation.code !== 'ARTIFACT_RESERVED'
        || !id(originalReservation.artifactId)) throw Error('PACKAGE8_QUOTA_RESERVATION_UNKNOWN');
      context.artifactIds.push(originalReservation.artifactId);

      const bytes = await single(fixtureReader, 'readExact', {
        descriptor: SYNTHETIC_PRIVATE_IGES_FIXTURE,
      }, signal);
      if (!validFixtureBytes(bytes)) throw Error('PACKAGE8_FIXTURE_UNKNOWN');
      const originalCommit = await commitArtifact(originalReservation.artifactId, bytes, signal);
      if (originalCommit?.ok !== true || originalCommit.code !== 'ARTIFACT_STORED'
        || originalCommit.artifactId !== originalReservation.artifactId) {
        throw Error('PACKAGE8_PROVIDER_ACK_UNKNOWN');
      }

      const converted = await bounded(operationSignal => sandbox.convert(Object.freeze({
        fileName: SYNTHETIC_PRIVATE_IGES_FIXTURE.fileName,
        bytes,
      }), operationSignal), signal, operationBudgetMs);
      if (converted?.status !== 'ready' || converted.sourceSha256 !== hash(bytes)
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
        const grant = await issueGrant(artifactId, signal);
        if (grant?.ok !== true || grant.code !== 'DOWNLOAD_GRANT_ISSUED'
          || typeof grant.token !== 'string' || !/^dg1\.[A-Za-z0-9_-]{43}$/.test(grant.token)) {
          throw Error('PACKAGE8_GRANT_UNKNOWN');
        }
        const grantDigest = hash(grant.token);
        context.grantDigests.push(grantDigest);
        const resolved = await durableCall('resolveDownloadGrant', {
          grantDigest, owner: SYNTHETIC_OWNER, now: clock(),
        }, signal);
        if (resolved.accepted !== true || resolved.artifactId !== artifactId) {
          throw Error('PACKAGE8_GRANT_BINDING_UNKNOWN');
        }
      }

      cleanupAttempted = true;
      const cleaned = await closeFirst(context);
      context.deletedArtifactCount = cleaned.deletedArtifactCount;
      const lifecycle = await lifecycleReceipt(window, authorityReceipt, context);
      return Object.freeze({
        ok: true,
        code: 'PACKAGE8_DEVELOPMENT_REVIEW_QUALIFIED_CLOSED',
        sourceOnly: true,
        developmentOnly: true,
        fixtureClassification: 'RESTRICTED_SYNTHETIC_TEST_ONLY',
        sessionCount: 1,
        fileCount: 1,
        attemptCount: 1,
        maxRetries: 0,
        reservationMicros: RESERVATION_MICROS,
        maximumCostMicrosExclusive: MAXIMUM_COST_MICROS_EXCLUSIVE,
        originalGrantQualified: true,
        stlGrantQualified: true,
        admissionClosed: true,
        conversionClosed: true,
        sessionRevoked: true,
        grantsRevoked: true,
        uncertainRecordsQuarantined: true,
        deletedArtifactCount: lifecycle.deletedArtifactCount,
        metadataOnly: lifecycle.metadataOnly,
        lifecycleSnapshotDigest: lifecycle.snapshotDigest,
        lifecycleStopCodes: lifecycle.stopCodes,
        productionEvidenceDeploymentId: PACKAGE8_EVIDENCE_BINDING.vercelDeploymentId,
        reconciliationPacketSha256: PACKAGE8_EVIDENCE_BINDING.reconciliationPacketSha256,
        sourceToDeploymentFunctionEquivalence:
          PACKAGE8_EVIDENCE_BINDING.sourceToDeploymentFunctionEquivalence,
        routeMounted: false,
        sessionIssuanceEnabled: false,
        requestBodyAdmissionAuthorized: false,
        providerDispatchEnabled: false,
        runtimeActivationAllowed: false,
        productionBehaviorChanged: false,
        providerRequests: 0,
      });
    } catch {
      if (context.claimStarted && !cleanupAttempted) {
        cleanupAttempted = true;
        try { await closeFirst(context); } catch { /* Closed or unknown remains quarantined. */ }
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
    routeMounted: false,
    sessionIssuanceEnabled: false,
    requestBodyAdmissionAuthorized: false,
    providerDispatchEnabled: false,
    conversionDispatchEnabled: false,
    runtimeActivationAllowed: false,
    productionBehaviorChanged: false,
    policy: PACKAGE8_POLICY,
    quotaPolicy: QUOTA_POLICY,
    evidenceBinding: PACKAGE8_EVIDENCE_BINDING,
    fixture: SYNTHETIC_PRIVATE_IGES_FIXTURE,
    executionIntent: PACKAGE8_EXECUTION_INTENT,
    createFixtureForOfflineReview: createSyntheticPrivateIgesFixture,
    reviewOneUse,
  });
}

module.exports = {
  DERIVED_WARNING,
  MAXIMUM_COST_MICROS_EXCLUSIVE,
  OPERATION_BUDGET_MS,
  PACKAGE8_ATTEMPT_ID,
  PACKAGE8_EVIDENCE_BINDING,
  PACKAGE8_EXECUTION_INTENT,
  PACKAGE8_POLICY,
  PACKAGE8_SCOPE_KEY,
  PACKAGE8_SESSION_DIGEST,
  QUOTA_POLICY,
  RESERVATION_MICROS,
  createCadPhase5Package8ExecutionController,
};
