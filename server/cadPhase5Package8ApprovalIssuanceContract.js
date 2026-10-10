// Independent Package 8 approval-issuance contract. This module owns only
// approval metadata and commitments. It cannot activate the executor, mount a
// route, read credentials, admit a body, or access CAD/provider data.
const { createHash } = require('node:crypto');

const ISSUER_BASELINE = Object.freeze({
  reviewedMainCommit: '1512dedb5c240765bf87c749e07ed2f6709ec5b1',
  reviewedMainTree: 'a1378dc31e79690fcc717f2414b39074133773a5',
  productionEvidenceDeploymentId: 'dpl_7LvYWCimHGDd2TK7i9qGiYutv1ut',
  preparationSha256: '024e183dd84087fe9c6d685a59dda95d14ea1b1f4b3f63b590b8fa73aaed69eb',
  unissuedDraftSha256: '647d4c500bf79904c1c139cb015f759600437e76d51f97e284120b22dbed514f',
});
const ISSUER_LIMITS = Object.freeze({
  schemaVersion: 1,
  maximumSessions: 1,
  maximumFiles: 1,
  maximumAttempts: 1,
  maximumRetries: 0,
  maximumWindowMs: 15 * 60_000,
  maximumCostMicrosExclusive: 9_000_000,
  reservationMicros: 8_999_999,
  currency: 'USD',
});
const REVIEW_GATE = Object.freeze({
  schemaVersion: 1,
  mode: 'SOURCE_ONLY_INDEPENDENT_APPROVAL_ISSUER_REVIEW',
  ...ISSUER_BASELINE,
  runtimeMounted: false,
  issuanceEnabled: false,
});
const VERIFICATION_KEYS = Object.freeze([
  'schemaVersion', 'issuanceReference', 'approvalCommitment', 'baselineCommit',
  'baselineTree', 'executionHeadCommit', 'executionHeadTree', 'runtimeDeploymentId',
  'runtimeReceiptDigest', 'ownerCommitment', 'sessionCommitment', 'windowIdDigest',
  'windowStartUtc', 'windowEndUtc', 'limitsCommitment', 'authorityExpiresAtUtc',
]);
const ISSUE_KEYS = Object.freeze([
  'schemaVersion', 'issuerPrincipalDigest', 'request', 'sourceReview',
  'runtimeDeployment', 'limits', 'calculatedMaximumCostMicros', 'issuedAtUtc',
]);

const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const commit = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const id = value => typeof value === 'string'
  && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const exactKeys = (value, keys) => Boolean(value && typeof value === 'object'
  && !Array.isArray(value) && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key)));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const parseUtc = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return NaN;
  }
  return Date.parse(value);
};

function expectedAncestryDigest(sourceReview) {
  return hash([
    ISSUER_BASELINE.reviewedMainCommit,
    ISSUER_BASELINE.reviewedMainTree,
    sourceReview.executionHeadCommit,
    sourceReview.executionHeadTree,
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

function validVerificationRequest(value) {
  if (!exactKeys(value, VERIFICATION_KEYS) || value.schemaVersion !== 1
    || !id(value.issuanceReference) || !digest(value.approvalCommitment)
    || value.baselineCommit !== ISSUER_BASELINE.reviewedMainCommit
    || value.baselineTree !== ISSUER_BASELINE.reviewedMainTree
    || !commit(value.executionHeadCommit) || !commit(value.executionHeadTree)
    || value.executionHeadCommit === value.baselineCommit
    || !id(value.runtimeDeploymentId) || !digest(value.runtimeReceiptDigest)
    || !digest(value.ownerCommitment) || !digest(value.sessionCommitment)
    || value.ownerCommitment === value.sessionCommitment
    || !digest(value.windowIdDigest) || !digest(value.limitsCommitment)) return false;
  const start = parseUtc(value.windowStartUtc);
  const end = parseUtc(value.windowEndUtc);
  const expires = parseUtc(value.authorityExpiresAtUtc);
  return Number.isFinite(start) && Number.isFinite(end) && Number.isFinite(expires)
    && end > start && end - start <= ISSUER_LIMITS.maximumWindowMs
    && expires === end;
}

function validSourceReview(value, request) {
  return exactKeys(value, ['schemaVersion', 'baselineCommit', 'baselineTree',
    'executionHeadCommit', 'executionHeadTree', 'clean', 'descendantOfBaseline',
    'ancestryReceiptDigest', 'productionEvidenceDeploymentId', 'preparationSha256',
    'unissuedDraftSha256'])
    && value.schemaVersion === 1
    && value.baselineCommit === ISSUER_BASELINE.reviewedMainCommit
    && value.baselineTree === ISSUER_BASELINE.reviewedMainTree
    && value.executionHeadCommit === request.executionHeadCommit
    && value.executionHeadTree === request.executionHeadTree
    && value.clean === true && value.descendantOfBaseline === true
    && value.ancestryReceiptDigest === expectedAncestryDigest(value)
    && value.productionEvidenceDeploymentId
      === ISSUER_BASELINE.productionEvidenceDeploymentId
    && value.preparationSha256 === ISSUER_BASELINE.preparationSha256
    && value.unissuedDraftSha256 === ISSUER_BASELINE.unissuedDraftSha256;
}

function validRuntimeDeployment(value, request) {
  return exactKeys(value, ['schemaVersion', 'deploymentId', 'state', 'environment',
    'commit', 'tree', 'functionEquivalence', 'receiptDigest'])
    && value.schemaVersion === 1 && value.deploymentId === request.runtimeDeploymentId
    && value.state === 'READY' && value.environment === 'development'
    && value.commit === request.executionHeadCommit
    && value.tree === request.executionHeadTree
    && value.functionEquivalence === 'VERIFIED_EXACT'
    && value.receiptDigest === request.runtimeReceiptDigest
    && value.receiptDigest === expectedRuntimeReceiptDigest(value);
}

function validIssueCommand(value) {
  if (!exactKeys(value, ISSUE_KEYS) || value.schemaVersion !== 1
    || !digest(value.issuerPrincipalDigest)
    || !validVerificationRequest(value.request)
    || value.issuerPrincipalDigest === value.request.ownerCommitment
    || value.issuerPrincipalDigest === value.request.sessionCommitment
    || !validSourceReview(value.sourceReview, value.request)
    || !validRuntimeDeployment(value.runtimeDeployment, value.request)
    || !same(value.limits, ISSUER_LIMITS)
    || value.request.limitsCommitment !== hash(JSON.stringify(ISSUER_LIMITS))
    || !Number.isSafeInteger(value.calculatedMaximumCostMicros)
    || value.calculatedMaximumCostMicros < 0
    || value.calculatedMaximumCostMicros >= ISSUER_LIMITS.maximumCostMicrosExclusive) return false;
  const issued = parseUtc(value.issuedAtUtc);
  const start = parseUtc(value.request.windowStartUtc);
  const end = parseUtc(value.request.windowEndUtc);
  return Number.isFinite(issued) && issued >= start && issued < end;
}

function verificationReceipt(request) {
  if (!validVerificationRequest(request)) return null;
  const core = Object.freeze({ ...request, verified: true,
    status: 'ISSUED_ACTIVE_ONE_USE', revoked: false, consumed: false });
  return Object.freeze({ ...core, receiptDigest: hash(JSON.stringify(core)) });
}

function consumptionReceipt(record, consumedAtMs, generation) {
  return hash([
    record.receiptDigest,
    record.issuanceReference,
    record.approvalCommitment,
    String(consumedAtMs),
    String(generation),
    'ISSUED_CONSUMED_ONE_USE',
  ].join('|'));
}

module.exports = {
  ISSUER_BASELINE,
  ISSUER_LIMITS,
  ISSUE_KEYS,
  REVIEW_GATE,
  VERIFICATION_KEYS,
  consumptionReceipt,
  digest,
  exactKeys,
  expectedAncestryDigest,
  expectedRuntimeReceiptDigest,
  hash,
  id,
  parseUtc,
  same,
  validIssueCommand,
  validRuntimeDeployment,
  validSourceReview,
  validVerificationRequest,
  verificationReceipt,
};
