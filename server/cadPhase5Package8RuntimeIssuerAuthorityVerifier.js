// Source-only Package 8 runtime issuer-authority verifier. The verifier accepts
// sanitized commitments only, consumes independently held authority once, and
// exposes no route, provider, credential, session, body, CAD, or runtime access.
const { createHash } = require('node:crypto');
const {
  LIMITS: QUALIFICATION_LIMITS,
} = require('./cadPhase5Package8DevelopmentQualificationBinding');
const {
  EXECUTION_BASELINE,
  expectedAncestryDigest,
} = require('./cadPhase5Package8OneUseCoordinator');
const {
  expectedRuntimeAuthorityReceipt,
} = require('./cadPhase5Package8IndependentQualificationLauncher');

const VERIFIER_SOURCE_BINDING = Object.freeze({
  reviewedMainCommit: '06897c895354b45d290cfc6ea1d7d0ccb9367243',
  reviewedMainTree: '18feadb96a8da14fe102999d744155df5d8c7cf4',
  productionEvidenceDeploymentId: 'dpl_4Dq2J7w4yZ6B32ZXMmcuLrzdM3Tk',
  baselineReconciliationPacketSha256:
    'cc369119f75ab8357f17ef22c236ba02ec4870b5d119043525633e87d54fd1a7',
  preparationPacketSha256:
    '425fa7ca434c638669223239568caef2d3ad62c655fd38c0b5500fae5e78e0f4',
  unissuedDraftSha256:
    '88b986914c54040503f1fdbbea4d48f3a181462e62fb0d1c6302ecdac462b210',
  incompatibilityStopPacketSha256:
    '935eba1cc64ab8640845c3f30e8e74c21a99445ddc13294e725078e15263651c',
  launcherClosureSha256:
    'da063f17489e95a2a8bbf55e9e32da40fca93866291d673e22276305408fc1c1',
  independentIssuerClosureSha256:
    'f14dd1a403d2513e039ecb6ba72af321f0899c6cd549ff0d77eaa10ce5a4eceb',
  reconciliationPacketSha256:
    'ebebc571d8ee1756ebb408b6612662a1f0d748627a14f6bea66695a11d89966c',
});
const VERIFIER_REVIEW_GATE = Object.freeze({
  schemaVersion: 1,
  mode: 'SOURCE_ONLY_PACKAGE8_RUNTIME_ISSUER_AUTHORITY_VERIFIER_REVIEW',
  ...VERIFIER_SOURCE_BINDING,
  runtimeMounted: false,
  verificationEnabled: false,
  providerDispatchAuthorized: false,
  runtimeActivationAuthorized: false,
});
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
const EVIDENCE_KEYS = Object.freeze([
  'schemaVersion',
  'verifierPrincipalCommitment',
  'issuerPrincipalCommitment',
  'issuanceReference',
  'approvalCommitment',
  'sourceReview',
  'runtimeDeployment',
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
const SOURCE_REVIEW_KEYS = Object.freeze([
  'schemaVersion',
  'baselineCommit',
  'baselineTree',
  'executionHeadCommit',
  'executionHeadTree',
  'clean',
  'descendantOfBaseline',
  'ancestryReceiptDigest',
]);
const RUNTIME_DEPLOYMENT_KEYS = Object.freeze([
  'schemaVersion',
  'deploymentId',
  'state',
  'environment',
  'commit',
  'tree',
  'receiptDigest',
  'identityMetadataSupported',
  'functionSchemaEquivalenceClaimed',
]);
const CONSUMPTION_RESULT_KEYS = Object.freeze([
  'ok',
  'code',
  'authorityCommitment',
  'requestCommitment',
  'generation',
  'replayed',
  'sourceOnly',
  'applicationRetries',
  'transportRetries',
  'providerRetries',
]);

const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const commit = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const id = value => typeof value === 'string'
  && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const exactKeys = (value, keys) => Boolean(value && typeof value === 'object'
  && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype
  && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key)));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const parseUtc = value => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  ? Date.parse(value) : NaN;
const deepFreeze = value => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};
const plainClone = value => deepFreeze(JSON.parse(JSON.stringify(value)));

function validSourceReview(value) {
  return exactKeys(value, SOURCE_REVIEW_KEYS)
    && value.schemaVersion === 1
    && value.baselineCommit === EXECUTION_BASELINE.mergedMainCommit
    && value.baselineTree === EXECUTION_BASELINE.mergedMainTree
    && value.executionHeadCommit === VERIFIER_SOURCE_BINDING.reviewedMainCommit
    && value.executionHeadTree === VERIFIER_SOURCE_BINDING.reviewedMainTree
    && value.executionHeadCommit !== value.baselineCommit
    && commit(value.executionHeadCommit)
    && commit(value.executionHeadTree)
    && value.clean === true
    && value.descendantOfBaseline === true
    && value.ancestryReceiptDigest === expectedAncestryDigest(value);
}

function validRuntimeDeployment(value, sourceReview) {
  return exactKeys(value, RUNTIME_DEPLOYMENT_KEYS)
    && value.schemaVersion === 1
    && id(value.deploymentId)
    && value.state === 'READY'
    && value.environment === 'development'
    && value.commit === sourceReview.executionHeadCommit
    && value.tree === sourceReview.executionHeadTree
    && digest(value.receiptDigest)
    && value.identityMetadataSupported === true
    && value.functionSchemaEquivalenceClaimed === false;
}

function validEvidence(value) {
  if (!exactKeys(value, EVIDENCE_KEYS)
    || value.schemaVersion !== 1
    || !digest(value.verifierPrincipalCommitment)
    || !digest(value.issuerPrincipalCommitment)
    || !id(value.issuanceReference)
    || !digest(value.approvalCommitment)
    || !validSourceReview(value.sourceReview)
    || !validRuntimeDeployment(value.runtimeDeployment, value.sourceReview)
    || !digest(value.ownerCommitment)
    || !digest(value.sessionCommitment)
    || !digest(value.windowIdDigest)
    || !digest(value.limitsCommitment)
    || value.limitsCommitment !== hash(JSON.stringify(QUALIFICATION_LIMITS))
    || value.sourceClosureSha256
      !== VERIFIER_SOURCE_BINDING.independentIssuerClosureSha256
    || value.sourceOwnershipSeparated !== true
    || value.independentRuntimeIssuerCustodyBound !== true) return false;
  const principals = [value.verifierPrincipalCommitment,
    value.issuerPrincipalCommitment, value.ownerCommitment, value.sessionCommitment];
  if (new Set(principals).size !== principals.length) return false;
  const start = parseUtc(value.windowStartUtc);
  const end = parseUtc(value.windowEndUtc);
  const expires = parseUtc(value.authorityExpiresAtUtc);
  return Number.isFinite(start) && Number.isFinite(end) && Number.isFinite(expires)
    && end > start && end - start <= QUALIFICATION_LIMITS.maximumWindowMs
    && expires === end;
}

function requestFromEvidence(value) {
  return Object.freeze({
    schemaVersion: 1,
    issuerPrincipalCommitment: value.issuerPrincipalCommitment,
    issuanceReference: value.issuanceReference,
    approvalCommitment: value.approvalCommitment,
    baselineCommit: value.sourceReview.baselineCommit,
    baselineTree: value.sourceReview.baselineTree,
    executionHeadCommit: value.sourceReview.executionHeadCommit,
    executionHeadTree: value.sourceReview.executionHeadTree,
    runtimeDeploymentId: value.runtimeDeployment.deploymentId,
    runtimeReceiptDigest: value.runtimeDeployment.receiptDigest,
    ownerCommitment: value.ownerCommitment,
    sessionCommitment: value.sessionCommitment,
    windowIdDigest: value.windowIdDigest,
    windowStartUtc: value.windowStartUtc,
    windowEndUtc: value.windowEndUtc,
    limitsCommitment: value.limitsCommitment,
    authorityExpiresAtUtc: value.authorityExpiresAtUtc,
    sourceClosureSha256: value.sourceClosureSha256,
    sourceOwnershipSeparated: true,
    independentRuntimeIssuerCustodyBound: true,
  });
}

function validLedger(value) {
  return Boolean(value?.sourceOnly === true
    && value.internalOnly === true
    && value.configured === false
    && value.reviewConfigured === true
    && value.independentlyOwned === true
    && value.applicationRetries === 0
    && value.transportRetries === 0
    && value.providerRetries === 0
    && typeof value.consumeExact === 'function');
}

function validConsumption(value, authorityCommitment, requestCommitment) {
  return exactKeys(value, CONSUMPTION_RESULT_KEYS)
    && value.ok === true
    && value.code === 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CONSUMED'
    && value.authorityCommitment === authorityCommitment
    && value.requestCommitment === requestCommitment
    && Number.isSafeInteger(value.generation)
    && value.generation >= 1
    && value.replayed === false
    && value.sourceOnly === true
    && value.applicationRetries === 0
    && value.transportRetries === 0
    && value.providerRetries === 0;
}

function createCadPhase5Package8RuntimeIssuerAuthorityVerifier({
  reviewOnly = false,
  testOnly = false,
  reviewGate,
  verifierPrincipalCommitment,
  authorityEvidence,
  authorityLedger,
  now = Date.now,
} = {}) {
  const evidenceValid = validEvidence(authorityEvidence);
  const evidence = evidenceValid ? plainClone(authorityEvidence) : null;
  const expectedRequest = evidence ? requestFromEvidence(evidence) : null;
  const reviewConfigured = reviewOnly === true
    && testOnly === true
    && same(reviewGate, VERIFIER_REVIEW_GATE)
    && digest(verifierPrincipalCommitment)
    && evidence?.verifierPrincipalCommitment === verifierPrincipalCommitment
    && validLedger(authorityLedger)
    && typeof now === 'function';
  let attempted = false;
  let stopped = false;

  async function verifyExact(request, { signal } = {}) {
    if (!reviewConfigured || attempted || stopped || signal?.aborted === true
      || !exactKeys(request, AUTHORITY_REQUEST_KEYS)
      || !same(request, expectedRequest)
      || expectedRuntimeAuthorityReceipt(request) === null) return null;
    let observedAt;
    try { observedAt = now(); } catch {
      stopped = true;
      throw Error('PACKAGE8_RUNTIME_ISSUER_AUTHORITY_TIME_UNKNOWN');
    }
    const start = parseUtc(request.windowStartUtc);
    const end = parseUtc(request.windowEndUtc);
    if (!Number.isSafeInteger(observedAt) || observedAt < start || observedAt >= end) {
      return null;
    }
    attempted = true;
    const authorityCommitment = hash(JSON.stringify(evidence));
    const requestCommitment = hash(JSON.stringify(request));
    let consumed;
    try {
      consumed = await authorityLedger.consumeExact(Object.freeze({
        schemaVersion: 1,
        verifierPrincipalCommitment,
        issuerPrincipalCommitment: request.issuerPrincipalCommitment,
        authorityCommitment,
        requestCommitment,
      }), { signal });
    } catch {
      stopped = true;
      throw Error('PACKAGE8_RUNTIME_ISSUER_AUTHORITY_OUTCOME_UNKNOWN');
    }
    stopped = true;
    if (!validConsumption(consumed, authorityCommitment, requestCommitment)) return null;
    return expectedRuntimeAuthorityReceipt(request);
  }

  return Object.freeze({
    sourceOnly: true,
    internalOnly: true,
    configured: false,
    reviewConfigured,
    enabled: false,
    mounted: false,
    routeMounted: false,
    sourceOwnershipSeparated: true,
    independentRuntimeIssuerCustodyBound: true,
    requestBodyAdmissionAuthorized: false,
    providerDispatchEnabled: false,
    runtimeActivationAllowed: false,
    approvalArtifactsIssued: 0,
    sessionIssuances: 0,
    applicationRetries: 0,
    transportRetries: 0,
    providerRetries: 0,
    verifyExact,
  });
}

module.exports = {
  AUTHORITY_REQUEST_KEYS,
  VERIFIER_REVIEW_GATE,
  VERIFIER_SOURCE_BINDING,
  createCadPhase5Package8RuntimeIssuerAuthorityVerifier,
  hash,
  requestFromEvidence,
};
