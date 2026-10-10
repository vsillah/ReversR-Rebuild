// Development-review-only Package 8 controller. It is deliberately absent
// from every route and runtime bootstrap. Only explicitly marked offline
// synthetic ports can be supplied; real provider and production ports fail
// constructor qualification and cannot be selected by configuration.
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

const OPERATION_BUDGET_MS = 800;
const MAXIMUM_COST_MICROS_EXCLUSIVE = 9_000_000;
const RESERVATION_MICROS = MAXIMUM_COST_MICROS_EXCLUSIVE - 1;
const PACKAGE8_SCOPE_KEY = 'phase5-synthetic-private-path-v1';
const PACKAGE8_SESSION_DIGEST = 'c'.repeat(64);
const DERIVED_WARNING = 'Inspection geometry only - not validated for manufacturing.';
const PACKAGE8_EVIDENCE_BINDING = Object.freeze({
  vercelDeploymentId: 'dpl_9x1ENTXP4qefJKdMQaHKD1CXRjaj',
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
const REQUIRED_PORTS = Object.freeze({
  authority: Object.freeze(['verifyExact']),
  intentLedger: Object.freeze(['consumeOnce']),
  durable: Object.freeze(['claimExecution', 'closeForRollback', 'reconcile',
    'resolveDownloadGrant', 'readLifecycleMetadata']),
  custody: Object.freeze(['reserveArtifact', 'commitArtifact', 'issueDownloadGrant',
    'deleteArtifact', 'readLifecycleMetadata']),
  sandbox: Object.freeze(['convert', 'stopKnown', 'readLifecycleMetadata']),
  sessionRevoker: Object.freeze(['revokeExact']),
  fixtureReader: Object.freeze(['readExact']),
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

const INTENT_FIELDS = Object.freeze({
  schemaVersion: 1,
  runDigest: hash('phase5-package8-development-review-one-use-v1'),
  protocolDigest: hash('authority;claim;quota;fixture;custody;sandbox;grants;close;delete;monitor'),
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
  now = Date.now,
  operationBudgetMs = OPERATION_BUDGET_MS,
} = {}) {
  const ports = { authority, intentLedger, durable, custody, sandbox, sessionRevoker, fixtureReader };
  const reviewConfigured = reviewOnly === true
    && Object.entries(REQUIRED_PORTS).every(([name, methods]) => safePort(ports[name], methods))
    && typeof now === 'function' && Number.isSafeInteger(operationBudgetMs)
    && operationBudgetMs > 0 && operationBudgetMs <= OPERATION_BUDGET_MS;
  let consumed = false;

  const clock = () => {
    const value = now();
    if (!time(value)) throw Error('PACKAGE8_CLOCK_UNKNOWN');
    return value;
  };
  const call = (port, method, args, signal) => bounded(
    operationSignal => port[method](Object.freeze(args), { signal: operationSignal }),
    signal,
    operationBudgetMs,
  );

  async function closeFirst(context) {
    const { claimId, fence, artifactIds, grantDigests } = context;
    const closed = await call(durable, 'closeForRollback', {
      scopeKey: PACKAGE8_SCOPE_KEY,
      claimId,
      fence,
      owner: SYNTHETIC_OWNER,
      reasonDigest: hash('package8-development-review-close-first'),
      now: clock(),
    });
    if (closed?.accepted !== true || closed.admissionClosed !== true
      || closed.conversionClosed !== true || closed.grantsRevoked !== true
      || closed.uncertainRecordsQuarantined !== true
      || JSON.stringify(closed.order) !== JSON.stringify([
        'admission-closed', 'conversion-closed', 'grants-revoked', 'unknown-quarantined',
      ])) throw Error('PACKAGE8_CLOSE_UNKNOWN');

    const revoked = await call(sessionRevoker, 'revokeExact', {
      sessionDigest: PACKAGE8_SESSION_DIGEST,
      uploadSessionId: SYNTHETIC_OWNER.uploadSessionId,
      owner: SYNTHETIC_OWNER,
    });
    if (revoked?.revoked !== true
      || revoked.uploadSessionId !== SYNTHETIC_OWNER.uploadSessionId) {
      throw Error('PACKAGE8_SESSION_REVOCATION_UNKNOWN');
    }

    const stopped = await call(sandbox, 'stopKnown', { claimId });
    if (stopped?.stopped !== true || stopped.cleanupConfirmed !== true
      || stopped.outcomeUnknown !== false) throw Error('PACKAGE8_SANDBOX_CLEANUP_UNKNOWN');

    const control = await call(durable, 'reconcile', {
      kind: 'control', key: PACKAGE8_SCOPE_KEY, owner: SYNTHETIC_OWNER,
    });
    if (control?.accepted !== true || control.state !== 'closed'
      || control.admissionClosed !== true || control.conversionClosed !== true
      || control.grantsRevoked !== true || control.uncertainRecordsQuarantined !== true) {
      throw Error('PACKAGE8_RECONCILIATION_UNKNOWN');
    }

    for (const grantDigest of grantDigests) {
      const grant = await call(durable, 'resolveDownloadGrant', {
        grantDigest, owner: SYNTHETIC_OWNER, now: clock(),
      });
      if (grant?.accepted === true) throw Error('PACKAGE8_GRANT_REVOCATION_UNKNOWN');
    }

    let deletedArtifactCount = 0;
    for (const artifactId of artifactIds) {
      const artifact = await call(durable, 'reconcile', {
        kind: 'artifact', key: artifactId, owner: SYNTHETIC_OWNER,
      });
      if (artifact?.accepted !== true || artifact.artifactId !== artifactId
        || !sameOwner(artifact) || artifact.state !== 'quarantined') {
        throw Error('PACKAGE8_OWNERSHIP_OR_QUARANTINE_UNKNOWN');
      }
      const deleted = await call(custody, 'deleteArtifact', {
        owner: SYNTHETIC_OWNER, artifactId,
      });
      if (deleted?.ok !== true || deleted.code !== 'ARTIFACT_DELETED'
        || deleted.artifactId !== artifactId || !digest(deleted.tombstoneDigest)) {
        throw Error('PACKAGE8_DELETE_UNKNOWN');
      }
      const tombstone = await call(durable, 'reconcile', {
        kind: 'tombstone', key: artifactId, owner: SYNTHETIC_OWNER,
      });
      if (tombstone?.accepted !== true || tombstone.deleted !== true
        || tombstone.artifactId !== artifactId
        || tombstone.tombstoneDigest !== deleted.tombstoneDigest) {
        throw Error('PACKAGE8_DELETION_RECONCILIATION_UNKNOWN');
      }
      deletedArtifactCount += 1;
    }
    return Object.freeze({ deletedArtifactCount });
  }

  async function lifecycleReceipt(window, authorityReceipt, context) {
    const [convexMetadata, r2Metadata, sandboxMetadata] = await Promise.all([
      call(durable, 'readLifecycleMetadata', { owner: SYNTHETIC_OWNER }),
      call(custody, 'readLifecycleMetadata', { owner: SYNTHETIC_OWNER }),
      call(sandbox, 'readLifecycleMetadata', { owner: SYNTHETIC_OWNER }),
    ]);
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
      targets: { convex: [convexMetadata], r2: [r2Metadata], sandbox: [sandboxMetadata] },
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
      closeFirstActions: monitored.closeFirstActions,
      deletedArtifactCount: context.deletedArtifactCount });
  }

  async function reviewOneUse({ window, signal } = {}) {
    if (!reviewConfigured) return deny('PACKAGE8_CONTROLLER_DISABLED');
    if (consumed) return deny('PACKAGE8_ATTEMPT_CONSUMED');
    consumed = true;
    const context = { claimStarted: false, claimId: null, fence: null,
      artifactIds: [], grantDigests: [], deletedArtifactCount: 0 };
    let authorityReceipt;
    let cleanupAttempted = false;
    try {
      const checkedAt = clock();
      if (!validWindow(window, checkedAt)) return deny('PACKAGE8_WINDOW_INVALID');
      const intent = await call(intentLedger, 'consumeOnce', {
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

      authorityReceipt = await call(authority, 'verifyExact', {
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

      // A claim call can commit before its acknowledgement is lost. Mark the
      // claim boundary before invocation so timeouts also close by exact scope.
      context.claimStarted = true;
      const claim = await call(durable, 'claimExecution', {
        scopeKey: PACKAGE8_SCOPE_KEY,
        owner: SYNTHETIC_OWNER,
        authorityGeneration: authorityReceipt.authorityGeneration,
        fixtureDigest: SYNTHETIC_PRIVATE_IGES_FIXTURE.sha256,
        windowDigest: window.idDigest,
        reservationMicros: RESERVATION_MICROS,
        maximumAttempts: 1,
        maximumRetries: 0,
        now: clock(),
      }, signal);
      if (claim?.accepted !== true || claim.code !== 'PACKAGE8_EXECUTION_CLAIMED'
        || !id(claim.claimId) || !Number.isSafeInteger(claim.fence) || claim.fence < 1
        || claim.reservationMicros !== RESERVATION_MICROS || claim.maximumAttempts !== 1
        || claim.maximumRetries !== 0 || !sameOwner(claim)) {
        throw Error('PACKAGE8_CLAIM_UNKNOWN');
      }
      context.claimId = claim.claimId;
      context.fence = claim.fence;

      // Durable claim and custody quota reservation both precede the only
      // fixture-byte read. The reader is injected and cannot be a request body.
      const originalReservation = await call(custody, 'reserveArtifact', {
        owner: SYNTHETIC_OWNER,
        input: { kind: 'original-igs', format: 'model/iges',
          byteCount: SYNTHETIC_PRIVATE_IGES_FIXTURE.byteCount,
          restrictedDigest: SYNTHETIC_PRIVATE_IGES_FIXTURE.sha256 },
      }, signal);
      if (originalReservation?.ok !== true || originalReservation.code !== 'ARTIFACT_RESERVED'
        || !id(originalReservation.artifactId)) throw Error('PACKAGE8_QUOTA_RESERVATION_UNKNOWN');
      context.artifactIds.push(originalReservation.artifactId);

      const bytes = await call(fixtureReader, 'readExact', {
        descriptor: SYNTHETIC_PRIVATE_IGES_FIXTURE,
      }, signal);
      if (!validFixtureBytes(bytes)) throw Error('PACKAGE8_FIXTURE_UNKNOWN');
      const originalCommit = await call(custody, 'commitArtifact', {
        owner: SYNTHETIC_OWNER,
        artifactId: originalReservation.artifactId,
        bytes,
      }, signal);
      if (originalCommit?.ok !== true || originalCommit.code !== 'ARTIFACT_STORED'
        || originalCommit.artifactId !== originalReservation.artifactId) {
        throw Error('PACKAGE8_PROVIDER_ACK_UNKNOWN');
      }

      const converted = await call(sandbox, 'convert', {
        fileName: SYNTHETIC_PRIVATE_IGES_FIXTURE.fileName,
        bytes,
        attempt: 1,
        maxRetries: 0,
      }, signal);
      if (converted?.status !== 'ready' || converted.sourceSha256 !== hash(bytes)
        || !Buffer.isBuffer(converted.stlBytes) || converted.stlBytes.length === 0
        || converted.stlBytes.length > MONITOR_POLICY.maximumBytes
        || !digest(converted.geometryDigest) || converted.cleanupConfirmed !== true
        || converted.outcomeUnknown !== false || converted.attempts !== 1
        || converted.retries !== 0) throw Error('PACKAGE8_SANDBOX_OUTCOME_UNKNOWN');

      const stlDigest = hash(converted.stlBytes);
      const stlReservation = await call(custody, 'reserveArtifact', {
        owner: SYNTHETIC_OWNER,
        input: { kind: 'derived-stl', format: 'model/stl',
          byteCount: converted.stlBytes.length, restrictedDigest: stlDigest,
          sourceArtifactId: originalReservation.artifactId,
          sourceDigest: SYNTHETIC_PRIVATE_IGES_FIXTURE.sha256,
          geometryDigest: converted.geometryDigest, units: 'millimeter',
          warning: DERIVED_WARNING },
      }, signal);
      if (stlReservation?.ok !== true || stlReservation.code !== 'ARTIFACT_RESERVED'
        || !id(stlReservation.artifactId)) throw Error('PACKAGE8_STL_RESERVATION_UNKNOWN');
      context.artifactIds.push(stlReservation.artifactId);
      const stlCommit = await call(custody, 'commitArtifact', {
        owner: SYNTHETIC_OWNER,
        artifactId: stlReservation.artifactId,
        bytes: converted.stlBytes,
      }, signal);
      if (stlCommit?.ok !== true || stlCommit.code !== 'ARTIFACT_STORED'
        || stlCommit.artifactId !== stlReservation.artifactId) {
        throw Error('PACKAGE8_STL_PROVIDER_ACK_UNKNOWN');
      }

      for (const artifactId of [originalReservation.artifactId, stlReservation.artifactId]) {
        const grant = await call(custody, 'issueDownloadGrant', {
          owner: SYNTHETIC_OWNER, artifactId,
        }, signal);
        if (grant?.ok !== true || grant.code !== 'DOWNLOAD_GRANT_ISSUED'
          || typeof grant.token !== 'string' || !/^dg1\.[A-Za-z0-9_-]{43}$/.test(grant.token)) {
          throw Error('PACKAGE8_GRANT_UNKNOWN');
        }
        const grantDigest = hash(grant.token);
        context.grantDigests.push(grantDigest);
        const resolved = await call(durable, 'resolveDownloadGrant', {
          grantDigest, owner: SYNTHETIC_OWNER, now: clock(),
        }, signal);
        if (resolved?.accepted !== true || resolved.artifactId !== artifactId
          || !sameOwner(resolved)) throw Error('PACKAGE8_GRANT_BINDING_UNKNOWN');
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
        try { await closeFirst(context); } catch { /* Unknown remains quarantined and stopped. */ }
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
  PACKAGE8_EVIDENCE_BINDING,
  PACKAGE8_EXECUTION_INTENT,
  PACKAGE8_POLICY,
  PACKAGE8_SCOPE_KEY,
  PACKAGE8_SESSION_DIGEST,
  RESERVATION_MICROS,
  REQUIRED_PORTS,
  createCadPhase5Package8ExecutionController,
};
