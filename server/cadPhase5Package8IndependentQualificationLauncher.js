// Unmounted source-only launcher for the independently issued Package 8
// approval. It consumes approval authority before the qualification binding can
// reach any durable or provider operation, then closes the issuer record.
const { createHash } = require('node:crypto');
const {
  ISSUER_LIMITS,
  digest,
  exactKeys,
  same,
} = require('./cadPhase5Package8ApprovalIssuanceContract');
const {
  approvalIssuanceVerificationRequest,
  expectedApprovalIssuanceReceipt,
} = require('./cadPhase5Package8OneUseCoordinator');
const {
  QUALIFICATION_REVIEW_GATE,
  createCadPhase5Package8DevelopmentQualificationBinding,
  validateApprovalArtifact,
} = require('./cadPhase5Package8DevelopmentQualificationBinding');
const {
  createDisabledPackage8LifecycleMonitor,
} = require('./cadPhase5Package8LifecycleMonitor');

const hash = value => createHash('sha256').update(value).digest('hex');
const id = value => typeof value === 'string'
  && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);

const LAUNCHER_BASELINE = Object.freeze({
  mergedMainCommit: 'a24ac3f3e18e8ce5eb03d36fbc18c669e149e328',
  mergedMainTree: '1a03c0d437cf4e9900f9acc1d5f13f9f6e5d74e7',
  productionEvidenceDeploymentId: 'dpl_56C2e54pmrn94oBdAEAnVHcVLjvA',
  independentIssuerClosureSha256:
    'f14dd1a403d2513e039ecb6ba72af321f0899c6cd549ff0d77eaa10ce5a4eceb',
  reconciliationPacketSha256:
    'ebebc571d8ee1756ebb408b6612662a1f0d748627a14f6bea66695a11d89966c',
});
const LAUNCH_REVIEW_GATE = Object.freeze({
  schemaVersion: 1,
  mode: 'SOURCE_ONLY_INDEPENDENT_PACKAGE8_QUALIFICATION_LAUNCHER_REVIEW',
  ...LAUNCHER_BASELINE,
  liveBindingsSupplied: false,
  actualApprovalIssued: false,
  runtimeMounted: false,
  providerDispatchAuthorized: false,
  runtimeActivationAuthorized: false,
});
const QUALIFICATION_SOURCE_KEYS = Object.freeze([
  'convex',
  'exactSession',
  'executionReceipt',
  'lifecycleMetadata',
  'r2',
  'sandbox',
]);
const AUTHORITY_REQUEST_KEYS = Object.freeze([
  'schemaVersion',
  'issuerPrincipalCommitment',
  'issuanceReference',
  'approvalCommitment',
  'baselineCommit',
  'baselineTree',
  'executionHeadCommit',
  'executionHeadTree',
  'runtimeDeploymentId',
  'runtimeReceiptDigest',
  'ownerCommitment',
  'sessionCommitment',
  'windowIdDigest',
  'windowStartUtc',
  'windowEndUtc',
  'limitsCommitment',
  'authorityExpiresAtUtc',
  'sourceClosureSha256',
  'sourceOwnershipSeparated',
  'independentRuntimeIssuerCustodyBound',
]);

const deny = (code, counts) => Object.freeze({
  ok: false,
  code,
  sourceOnly: true,
  developmentOnly: true,
  approvalConsumed: false,
  approvalClosed: false,
  routeMounted: false,
  requestBodyAdmissionAuthorized: false,
  runtimeActivationAllowed: false,
  applicationRetries: 0,
  transportRetries: 0,
  providerRetries: 0,
  counts: Object.freeze({ ...counts }),
});

function ownerCommitment(artifact) {
  return hash([
    artifact.owner.userId,
    artifact.owner.shopId,
    artifact.owner.uploadSessionId,
  ].join('|'));
}

function sessionCommitment(artifact) {
  return hash([
    artifact.session.sessionDigest,
    artifact.session.loginSessionId,
  ].join('|'));
}

function runtimeAuthorityRequest(artifact, issuerPrincipalDigest) {
  const issuance = approvalIssuanceVerificationRequest(artifact);
  return Object.freeze({
    schemaVersion: 1,
    issuerPrincipalCommitment: issuerPrincipalDigest,
    issuanceReference: issuance.issuanceReference,
    approvalCommitment: issuance.approvalCommitment,
    baselineCommit: issuance.baselineCommit,
    baselineTree: issuance.baselineTree,
    executionHeadCommit: issuance.executionHeadCommit,
    executionHeadTree: issuance.executionHeadTree,
    runtimeDeploymentId: issuance.runtimeDeploymentId,
    runtimeReceiptDigest: issuance.runtimeReceiptDigest,
    ownerCommitment: issuance.ownerCommitment,
    sessionCommitment: issuance.sessionCommitment,
    windowIdDigest: issuance.windowIdDigest,
    windowStartUtc: issuance.windowStartUtc,
    windowEndUtc: issuance.windowEndUtc,
    limitsCommitment: issuance.limitsCommitment,
    authorityExpiresAtUtc: issuance.authorityExpiresAtUtc,
    sourceClosureSha256: LAUNCHER_BASELINE.independentIssuerClosureSha256,
    sourceOwnershipSeparated: true,
    independentRuntimeIssuerCustodyBound: true,
  });
}

function expectedRuntimeAuthorityReceipt(request) {
  if (!exactKeys(request, AUTHORITY_REQUEST_KEYS)
    || request.schemaVersion !== 1
    || !digest(request.issuerPrincipalCommitment)
    || !id(request.issuanceReference)
    || !digest(request.approvalCommitment)
    || !digest(request.runtimeReceiptDigest)
    || !digest(request.ownerCommitment)
    || !digest(request.sessionCommitment)
    || request.issuerPrincipalCommitment === request.ownerCommitment
    || request.issuerPrincipalCommitment === request.sessionCommitment
    || request.ownerCommitment === request.sessionCommitment
    || request.sourceClosureSha256 !== LAUNCHER_BASELINE.independentIssuerClosureSha256
    || request.sourceOwnershipSeparated !== true
    || request.independentRuntimeIssuerCustodyBound !== true) return null;
  const core = Object.freeze({
    ...request,
    verified: true,
    status: 'INDEPENDENT_RUNTIME_ISSUER_AUTHORITY_VERIFIED',
  });
  return Object.freeze({
    ...core,
    receiptDigest: hash(JSON.stringify(core)),
  });
}

function validAuthorityVerifier(value) {
  return Boolean(value?.sourceOnly === true
    && value.configured === false
    && value.reviewConfigured === true
    && value.sourceOwnershipSeparated === true
    && value.independentRuntimeIssuerCustodyBound === true
    && typeof value.verifyExact === 'function');
}

function validIssuer(value) {
  return Boolean(value?.sourceOnly === true
    && value.internalOnly === true
    && value.configured === false
    && value.reviewConfigured === true
    && value.enabled === false
    && value.mounted === false
    && value.sourceOwnershipSeparated === true
    && value.independentRuntimeIssuerCustodyBound === false
    && value.applicationRetries === 0
    && value.transportRetries === 0
    && value.providerRetries === 0
    && ['verifyExact', 'consumeExact', 'revokeExact', 'closeExact', 'readSanitized']
      .every(operation => typeof value[operation] === 'function'));
}

function validQualificationSources(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === QUALIFICATION_SOURCE_KEYS.join(',')
    && Object.values(value).every(item => item !== null && item !== undefined));
}

function validConsumption(value, artifact) {
  return Boolean(value?.ok === true
    && value.code === 'PACKAGE8_APPROVAL_CONSUMED'
    && value.issuanceReference === artifact.issuanceReference
    && value.approvalCommitment === artifact.approvalIdDigest
    && value.status === 'ISSUED_CONSUMED_ONE_USE'
    && Number.isSafeInteger(value.generation)
    && value.generation >= 2
    && digest(value.consumptionReceiptDigest)
    && value.applicationRetries === 0
    && value.transportRetries === 0
    && value.providerRetries === 0);
}

function validClosedEvidence(value, artifact, consumptionReceiptDigest) {
  return Boolean(value?.schemaVersion === 1
    && value.issuanceReference === artifact.issuanceReference
    && value.approvalCommitment === artifact.approvalIdDigest
    && value.status === 'ISSUED_CLOSED'
    && value.closed === true
    && value.expired === false
    && value.consumptionReceiptDigest === consumptionReceiptDigest);
}

function createConsumedApprovalVerifier(expectedRequest, activeReceipt, counters) {
  let calls = 0;
  return Object.freeze({
    sourceOnly: true,
    internalOnly: true,
    configured: false,
    reviewConfigured: true,
    approvalConsumedBeforeProviderEffect: true,
    async verifyExact(request) {
      calls += 1;
      counters.cachedConsumptionProofReads += 1;
      if (calls !== 1 || !same(request, expectedRequest)) {
        throw Error('PACKAGE8_CONSUMED_APPROVAL_PROOF_INVALID');
      }
      return activeReceipt;
    },
  });
}

function createCadPhase5Package8IndependentQualificationLauncher({
  reviewOnly = false,
  testOnly = false,
  launchGate,
  issuerPrincipalDigest,
  issuerAuthorityVerifier,
  approvalIssuer,
  qualificationSources,
  qualificationBindingFactory = createCadPhase5Package8DevelopmentQualificationBinding,
  lifecycleMonitor = createDisabledPackage8LifecycleMonitor(),
  now = Date.now,
} = {}) {
  const reviewConfigured = reviewOnly === true
    && testOnly === true
    && same(launchGate, LAUNCH_REVIEW_GATE)
    && digest(issuerPrincipalDigest)
    && validAuthorityVerifier(issuerAuthorityVerifier)
    && validIssuer(approvalIssuer)
    && validQualificationSources(qualificationSources)
    && typeof qualificationBindingFactory === 'function'
    && lifecycleMonitor?.sourceOnly === true
    && lifecycleMonitor.configured === false
    && lifecycleMonitor.runtimeMonitoringEnabled === false
    && typeof now === 'function';
  const counts = {
    authorityVerifications: 0,
    issuerVerifications: 0,
    issuerConsumptions: 0,
    cachedConsumptionProofReads: 0,
    qualificationRuns: 0,
    issuerRevocations: 0,
    issuerCloses: 0,
    sanitizedReads: 0,
  };
  let stopped = false;

  async function terminalize(artifact, success) {
    const reasonDigest = hash(success
      ? 'package8-independent-qualification-complete'
      : 'package8-independent-qualification-close-first-failure');
    if (!success) {
      counts.issuerRevocations += 1;
      const revoked = await approvalIssuer.revokeExact({
        issuanceReference: artifact.issuanceReference,
        approvalCommitment: artifact.approvalIdDigest,
        reasonDigest,
      });
      if (revoked?.ok !== true || revoked.code !== 'PACKAGE8_APPROVAL_REVOKED') {
        throw Error('PACKAGE8_APPROVAL_REVOCATION_UNKNOWN');
      }
    }
    counts.issuerCloses += 1;
    const closed = await approvalIssuer.closeExact({
      issuanceReference: artifact.issuanceReference,
      approvalCommitment: artifact.approvalIdDigest,
      reasonDigest,
    });
    if (closed?.ok !== true || closed.code !== 'PACKAGE8_APPROVAL_CLOSED') {
      throw Error('PACKAGE8_APPROVAL_CLOSE_UNKNOWN');
    }
  }

  async function runOneUse({ approvalArtifact, signal } = {}) {
    if (!reviewConfigured || stopped) {
      return deny('PACKAGE8_INDEPENDENT_QUALIFICATION_LAUNCHER_DISABLED', counts);
    }
    let nowMs;
    try { nowMs = now(); } catch {
      return deny('PACKAGE8_QUALIFICATION_TIME_UNKNOWN', counts);
    }
    if (validateApprovalArtifact(approvalArtifact, nowMs) !== null) {
      return deny('PACKAGE8_APPROVAL_INVALID', counts);
    }
    const owner = ownerCommitment(approvalArtifact);
    const session = sessionCommitment(approvalArtifact);
    if (issuerPrincipalDigest === owner || issuerPrincipalDigest === session
      || owner === session) {
      return deny('PACKAGE8_ISSUER_OWNERSHIP_NOT_INDEPENDENT', counts);
    }

    const issuanceRequest = approvalIssuanceVerificationRequest(approvalArtifact);
    const authorityRequest = runtimeAuthorityRequest(approvalArtifact, issuerPrincipalDigest);
    const expectedAuthority = expectedRuntimeAuthorityReceipt(authorityRequest);
    if (!expectedAuthority) return deny('PACKAGE8_ISSUER_AUTHORITY_INVALID', counts);

    let activeReceipt;
    let consumption;
    try {
      counts.authorityVerifications += 1;
      const authority = await issuerAuthorityVerifier.verifyExact(authorityRequest, { signal });
      if (!same(authority, expectedAuthority)) {
        return deny('PACKAGE8_ISSUER_AUTHORITY_UNKNOWN', counts);
      }
      counts.issuerVerifications += 1;
      activeReceipt = await approvalIssuer.verifyExact(issuanceRequest);
      if (!same(activeReceipt, expectedApprovalIssuanceReceipt(approvalArtifact))) {
        return deny('PACKAGE8_APPROVAL_ISSUANCE_UNKNOWN', counts);
      }
      counts.issuerConsumptions += 1;
      consumption = await approvalIssuer.consumeExact(issuanceRequest);
      if (!validConsumption(consumption, approvalArtifact)) {
        stopped = true;
        return deny('PACKAGE8_APPROVAL_CONSUMPTION_UNKNOWN', counts);
      }
    } catch {
      stopped = true;
      return deny('PACKAGE8_APPROVAL_CONSUMPTION_UNKNOWN', counts);
    }

    const approvalIssuance = createConsumedApprovalVerifier(
      issuanceRequest,
      activeReceipt,
      counts,
    );
    const sources = Object.freeze({
      ...qualificationSources,
      approvalIssuance,
    });
    let result;
    try {
      const qualification = qualificationBindingFactory({
        reviewOnly: true,
        approvalGate: QUALIFICATION_REVIEW_GATE,
        sources,
        lifecycleMonitor,
        now,
      });
      if (qualification?.sourceOnly !== true
        || qualification.reviewConfigured !== true
        || qualification.enabled !== false
        || qualification.mounted !== false
        || qualification.routeMounted !== false
        || qualification.requestBodyAdmissionAuthorized !== false
        || qualification.runtimeActivationAllowed !== false
        || typeof qualification.reviewOneUse !== 'function') {
        throw Error('PACKAGE8_QUALIFICATION_BINDING_INVALID');
      }
      counts.qualificationRuns += 1;
      result = await qualification.reviewOneUse({ approvalArtifact, signal });
    } catch {
      result = Object.freeze({ ok: false, code: 'PACKAGE8_EXECUTION_UNKNOWN' });
    }
    const succeeded = result?.ok === true
      && result.code === 'PACKAGE8_ONE_USE_DEVELOPMENT_QUALIFIED_CLOSED'
      && result.admissionClosed === true
      && result.conversionClosed === true
      && result.sessionRevoked === true
      && result.grantsRevoked === true
      && result.uncertainRecordsQuarantined === true
      && result.automaticRetries === 0;
    try {
      await terminalize(approvalArtifact, succeeded);
    } catch {
      stopped = true;
      return deny('PACKAGE8_QUALIFICATION_TERMINAL_UNKNOWN', counts);
    }
    let evidence;
    try {
      counts.sanitizedReads += 1;
      evidence = await approvalIssuer.readSanitized({
        issuanceReference: approvalArtifact.issuanceReference,
        approvalCommitment: approvalArtifact.approvalIdDigest,
      });
    } catch {
      stopped = true;
      return deny('PACKAGE8_APPROVAL_TERMINAL_EVIDENCE_UNKNOWN', counts);
    }
    if (!validClosedEvidence(evidence, approvalArtifact,
      consumption.consumptionReceiptDigest)) {
      stopped = true;
      return deny('PACKAGE8_APPROVAL_TERMINAL_EVIDENCE_UNKNOWN', counts);
    }
    if (!succeeded) {
      stopped = true;
      return Object.freeze({
        ...deny('PACKAGE8_QUALIFICATION_CLOSED_AFTER_FAILURE', counts),
        approvalConsumed: true,
        approvalClosed: true,
        revocationAttempted: true,
      });
    }
    stopped = true;
    return Object.freeze({
      ok: true,
      code: 'PACKAGE8_INDEPENDENT_QUALIFICATION_QUALIFIED_CLOSED',
      sourceOnly: true,
      developmentOnly: true,
      approvalConsumed: true,
      approvalClosed: true,
      revocationAttempted: false,
      closeFirstConfirmed: true,
      oneSession: true,
      oneFile: true,
      oneAttempt: true,
      applicationRetries: 0,
      transportRetries: 0,
      providerRetries: 0,
      routeMounted: false,
      requestBodyAdmissionAuthorized: false,
      runtimeActivationAllowed: false,
      qualificationCode: result.code,
      lifecycleSnapshotDigest: result.lifecycleSnapshotDigest,
      terminalEvidenceDigest: hash(JSON.stringify(evidence)),
      counts: Object.freeze({ ...counts }),
    });
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
    productionBehaviorChanged: false,
    actualApprovalIssued: false,
    applicationRetries: 0,
    transportRetries: 0,
    providerRetries: 0,
    baseline: LAUNCHER_BASELINE,
    limits: ISSUER_LIMITS,
    runOneUse,
    status: () => Object.freeze({
      sourceOnly: true,
      configured: false,
      reviewConfigured,
      enabled: false,
      mounted: false,
      stopped,
      counts: Object.freeze({ ...counts }),
    }),
  });
}

module.exports = {
  LAUNCHER_BASELINE,
  LAUNCH_REVIEW_GATE,
  expectedRuntimeAuthorityReceipt,
  runtimeAuthorityRequest,
  createCadPhase5Package8IndependentQualificationLauncher,
};
