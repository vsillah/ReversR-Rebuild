const assert = require('node:assert/strict');
const test = require('node:test');
const {
  LIMITS: QUALIFICATION_LIMITS,
} = require('../server/cadPhase5Package8DevelopmentQualificationBinding');
const {
  EXECUTION_BASELINE,
  approvalIssuanceVerificationRequest,
  expectedApprovalIssuanceReceipt,
  expectedAncestryDigest: expectedCoordinatorAncestryDigest,
  expectedRuntimeReceiptDigest: expectedCoordinatorRuntimeReceiptDigest,
} = require('../server/cadPhase5Package8OneUseCoordinator');
const {
  ISSUER_BASELINE,
  ISSUER_LIMITS,
  QUALIFICATION_LIMITS: ISSUER_QUALIFICATION_LIMITS,
  expectedAncestryDigest,
  expectedRuntimeReceiptDigest,
  hash,
  validIssueCommand,
  validVerificationRequest,
  verificationReceipt,
} = require('../server/cadPhase5Package8ApprovalIssuanceContract');

const NOW = Date.parse('2026-10-11T00:50:00.000Z');
const REVIEWED_HEAD = '06897c895354b45d290cfc6ea1d7d0ccb9367243';
const REVIEWED_TREE = '18feadb96a8da14fe102999d744155df5d8c7cf4';
const ISSUER = hash('package8-independent-runtime-issuer');

function fixture() {
  const runtime = {
    schemaVersion: 1,
    deploymentId: 'dpl_package8_development_exact',
    state: 'READY',
    environment: 'development',
    commit: REVIEWED_HEAD,
    tree: REVIEWED_TREE,
    functionEquivalence: 'VERIFIED_EXACT',
    receiptDigest: '',
  };
  runtime.receiptDigest = expectedCoordinatorRuntimeReceiptDigest(runtime);
  const artifact = {
    issuanceReference: 'package8-baseline-contract-reconciliation',
    approvalIdDigest: hash('package8-baseline-contract-approval'),
    owner: {
      userId: 'synthetic-package8-user',
      shopId: 'synthetic-package8-shop',
      uploadSessionId: 'synthetic-package8-upload-session',
    },
    session: {
      sessionDigest: hash('synthetic-package8-session'),
      loginSessionId: 'synthetic-package8-login-session',
    },
    window: {
      idDigest: hash('package8-baseline-contract-window'),
      startUtc: new Date(NOW - 60_000).toISOString(),
      endUtc: new Date(NOW + 9 * 60_000).toISOString(),
    },
    limits: { ...QUALIFICATION_LIMITS },
    authorityExpiresAtUtc: new Date(NOW + 9 * 60_000).toISOString(),
    executionBinding: {
      executionHeadCommit: REVIEWED_HEAD,
      executionHeadTree: REVIEWED_TREE,
      runtimeDeployment: runtime,
    },
  };
  const request = approvalIssuanceVerificationRequest(artifact);
  const sourceReview = {
    schemaVersion: 1,
    baselineCommit: EXECUTION_BASELINE.mergedMainCommit,
    baselineTree: EXECUTION_BASELINE.mergedMainTree,
    executionHeadCommit: REVIEWED_HEAD,
    executionHeadTree: REVIEWED_TREE,
    clean: true,
    descendantOfBaseline: true,
    ancestryReceiptDigest: '',
    productionEvidenceDeploymentId: ISSUER_BASELINE.productionEvidenceDeploymentId,
    preparationSha256: ISSUER_BASELINE.preparationSha256,
    unissuedDraftSha256: ISSUER_BASELINE.unissuedDraftSha256,
  };
  sourceReview.ancestryReceiptDigest = expectedAncestryDigest(sourceReview);
  return {
    artifact,
    request,
    sourceReview,
    runtime,
    command: {
      schemaVersion: 1,
      issuerPrincipalDigest: ISSUER,
      request,
      sourceReview,
      runtimeDeployment: runtime,
      limits: { ...ISSUER_LIMITS },
      calculatedMaximumCostMicros: 8_999_999,
      issuedAtUtc: new Date(NOW).toISOString(),
    },
  };
}

test('launcher request and issuer validator share one immutable execution baseline', () => {
  const value = fixture();
  assert.equal(ISSUER_BASELINE.reviewedMainCommit, EXECUTION_BASELINE.mergedMainCommit);
  assert.equal(ISSUER_BASELINE.reviewedMainTree, EXECUTION_BASELINE.mergedMainTree);
  assert.equal(value.request.baselineCommit, EXECUTION_BASELINE.mergedMainCommit);
  assert.equal(value.request.baselineTree, EXECUTION_BASELINE.mergedMainTree);
  assert.deepEqual(ISSUER_QUALIFICATION_LIMITS, QUALIFICATION_LIMITS);
  assert.equal(value.request.limitsCommitment,
    hash(JSON.stringify(QUALIFICATION_LIMITS)));
  assert.equal(validVerificationRequest(value.request), true);
  assert.deepEqual(verificationReceipt(value.request),
    expectedApprovalIssuanceReceipt(value.artifact));
});

test('reviewed head remains bound as a clean descendant with an exact runtime receipt', () => {
  const value = fixture();
  assert.equal(value.sourceReview.executionHeadCommit, REVIEWED_HEAD);
  assert.equal(value.sourceReview.executionHeadTree, REVIEWED_TREE);
  assert.equal(value.runtime.commit, REVIEWED_HEAD);
  assert.equal(value.runtime.tree, REVIEWED_TREE);
  assert.equal(expectedAncestryDigest(value.sourceReview),
    expectedCoordinatorAncestryDigest(value.sourceReview));
  assert.equal(expectedRuntimeReceiptDigest(value.runtime),
    expectedCoordinatorRuntimeReceiptDigest(value.runtime));
  assert.equal(validIssueCommand(value.command), true);
});

test('old baseline, self-reference, widened limits and runtime drift remain rejected', () => {
  const oldBaseline = fixture();
  const oldRequest = { ...oldBaseline.request,
    baselineCommit: '1512dedb5c240765bf87c749e07ed2f6709ec5b1' };
  assert.equal(validVerificationRequest(oldRequest), false);

  const selfReference = fixture();
  const selfReferentialRequest = { ...selfReference.request,
    executionHeadCommit: selfReference.request.baselineCommit };
  assert.equal(validVerificationRequest(selfReferentialRequest), false);

  const widenedLimits = fixture();
  widenedLimits.command.request = { ...widenedLimits.command.request,
    limitsCommitment: hash(JSON.stringify({
      ...QUALIFICATION_LIMITS,
      maximumRetries: 1,
    })) };
  assert.equal(validIssueCommand(widenedLimits.command), false);

  const runtimeDrift = fixture();
  runtimeDrift.command.runtimeDeployment.tree = '0'.repeat(40);
  assert.equal(validIssueCommand(runtimeDrift.command), false);
});
