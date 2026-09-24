// Source-only restricted source intake result. No private store I/O.
const { isDeepStrictEqual } = require('node:util');
const { REQUIRED_LIVE_BINDINGS, ZERO_ACTIONS } = require('../cad-auth-live-collector-binding/guardedCollector');
const { RECEIPT_FIELDS, plainData } = require('../cad-auth-command-card-source/preparation');

const REVIEW_PACKET = Object.freeze({
  packet: 'cad-auth-restricted-receipt-review-v1',
  sha256: 'c8f517c4231fdf6af56695bc83f76eed2a8cc88d73b617b10d830a5490b6b5f8',
  boundMainCommit: 'f1d9c198d4d0df5233724f0d41e59b2b28e9bfbb',
});

const APPROVED_SOURCE_READ = Object.freeze({
  sourceRef: 'rrb-local:cad-auth-live-evidence-stop-receipt/20260924T132411Z',
  sourceSha256: '15fc914116f6a693c45be19f2bf3c6159ac8fd0152f549db331ee3edd45b3005',
  sourceByteLength: 2510,
  sourcePacket: 'cad-auth-live-evidence-stop-receipt-v1',
  sourceStatus: 'STOPPED',
  sourceStopCode: 'MISSING_PREREQUISITE',
  startedAtUtc: '2026-09-24T13:23:52Z',
  stoppedAtUtc: '2026-09-24T13:24:22Z',
});

const STOP_RECEIPT_MISSING_PREREQUISITES = Object.freeze([
  'No checked-in concrete live collection command was found.',
  'The sealed-card preparation packet remains source-only and non-executable.',
  'The packet reports liveCollectionAuthorized=false.',
  'No provider/runtime binding, restricted cohort receipt, custody receipt, or executable collector was available to inspect and run.',
]);

function keyed(items) {
  return Object.fromEntries(items.map((item, index) => [`item${index + 1}`, item]));
}

function categoryRequirement(category) {
  return {
    category,
    requiredFields: Object.fromEntries(RECEIPT_FIELDS[category].map(field => [field, 'REQUIRED'])),
    presentInApprovedSource: false,
    restrictedReceiptRef: null,
    restrictedReceiptSha256: null,
    digestRecomputed: false,
    custodyReceiptRef: null,
    independentReviewerReceiptRef: null,
    retentionDispositionReceiptRef: null,
    immutableTargetRecheckReceiptRef: null,
    accepted: false,
    blocker: 'APPROVED_SOURCE_IS_STOP_RECEIPT_NOT_CATEGORY_RECEIPT',
  };
}

function requiredBundleShape() {
  return Object.fromEntries(REQUIRED_LIVE_BINDINGS.map(category => [category, {
    status: 'REQUIRED_FROM_SEPARATELY_APPROVED_PRIVATE_SOURCE',
    requiredFields: Object.fromEntries(RECEIPT_FIELDS[category].map(field => [field, 'REQUIRED'])),
    exactSha256DigestRequired: true,
    localDigestRecomputationRequired: true,
    opaqueRestrictedRefRequired: true,
    custodyAndReviewerDispositionRequired: true,
    publicValuesPermitted: false,
  }]));
}

function restrictedSourceIntakeDisposition() {
  return {
    approvalScope: {
      approvedNamedSourceRead: true,
      reviewedPacket: REVIEW_PACKET,
      publicRepositoryMayStorePrivateValues: false,
      publicRepositoryMayStoreAbsolutePrivatePath: false,
      sanitizedOpaqueRefOnly: true,
      committedPrivatePayload: false,
    },
    approvedSource: {
      ...APPROVED_SOURCE_READ,
      absolutePathCommitted: false,
      pathOpenedBeyondNamedSource: false,
      sourceReadCount: 1,
      sourceDigestsRecomputedLocally: true,
      sourceContainsRequiredEightCategoryBundle: false,
      sourceCategoryReceiptsPresent: Object.fromEntries(REQUIRED_LIVE_BINDINGS.map(category => [category, false])),
      sourceCategoryDigestPairsPresent: Object.fromEntries(REQUIRED_LIVE_BINDINGS.map(category => [category, false])),
    },
    sourceFinding: {
      status: 'STOP_RECEIPT_INSUFFICIENT_FOR_RESTRICTED_RECEIPT_REVIEW',
      stopCode: APPROVED_SOURCE_READ.sourceStopCode,
      missingPrerequisites: keyed(STOP_RECEIPT_MISSING_PREREQUISITES),
      actionsObserved: { ...ZERO_ACTIONS },
    },
    categoryRequirements: Object.fromEntries(REQUIRED_LIVE_BINDINGS.map(category => [
      category, categoryRequirement(category),
    ])),
    controls: {
      executable: false,
      executableCommandCardIssued: false,
      liveCollectorCommandLine: null,
      liveCollectionAuthorized: false,
      runtimeActivationAuthorized: false,
      bodyAdmissionAuthorized: false,
      uploadSessionIssuanceEnabled: false,
      requestBodyAdmissionRead: false,
      conversionAuthorized: false,
      sandboxDispatchAuthorized: false,
      retryOrSecondRunAuthorized: false,
      commercialReadinessClaimed: false,
      authorizedRuns: 0,
    },
    nextGate: {
      status: 'FULL_EIGHT_CATEGORY_RESTRICTED_RECEIPT_BUNDLE_REQUIRED',
      stopBeforeReadingAnotherPrivateSource: true,
      nonExecutableSealedCardMayBePrepared: false,
      executableCommandCardMayBeIssued: false,
      liveCollectionMayRun: false,
      requiredBundleShape: requiredBundleShape(),
    },
  };
}

function checkRestrictedSourceIntakeDisposition(input) {
  let ok = false;
  try { ok = plainData(input) && isDeepStrictEqual(input, restrictedSourceIntakeDisposition()); } catch { /* sanitized */ }
  return {
    ok,
    executable: false,
    executableCommandCardIssued: false,
    liveCollectionAuthorized: false,
    runtimeActivationAuthorized: false,
    bodyAdmissionAuthorized: false,
    uploadSessionIssuanceEnabled: false,
    requestBodyAdmissionRead: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    retryOrSecondRunAuthorized: false,
    commercialReadinessClaimed: false,
    requiredEightCategoryBundlePresent: false,
    code: ok ? 'RESTRICTED_SOURCE_INTAKE_STOP_RECEIPT_INSUFFICIENT'
      : 'INVALID_RESTRICTED_SOURCE_INTAKE_DISPOSITION',
  };
}

module.exports = {
  REVIEW_PACKET,
  APPROVED_SOURCE_READ,
  STOP_RECEIPT_MISSING_PREREQUISITES,
  restrictedSourceIntakeDisposition,
  checkRestrictedSourceIntakeDisposition,
};
