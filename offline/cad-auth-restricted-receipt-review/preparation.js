// Source-only restricted receipt review result. No private store I/O.
const { isDeepStrictEqual } = require('node:util');
const { REQUIRED_LIVE_BINDINGS } = require('../cad-auth-live-collector-binding/guardedCollector');
const { RECEIPT_FIELDS, plainData } = require('../cad-auth-command-card-source/preparation');

const MAIN_COMMIT = '48e1773240dac51ebea6f49b979323fca6e40d3e';
const APPROVED_GATE = Object.freeze({
  mainCommit: MAIN_COMMIT,
  reviewDispositionPacket: 'cad-auth-receipt-intake-review-disposition-v1',
  reviewDispositionSha256: 'f84b9726cebac74c801542d2f4c7fe78124d589f1172b29bf3c09d78c1d4cee7',
  intakeTemplateSha256: '2c66e9daf2d495bdc214b7b34e7ba36d300681173024019e9ee7ed6ad86902dd',
  restrictedReceiptBundleSha256: '78ed084f7380c58bb40b5dc5c38745a73d671a2de50d79986b712748f301baa3',
  sealedCardCustodyRebindSha256: 'db3a02b43845f58fb88e320c7c87a3f38c599e06d2d62dd331a8e6b92ba430fb',
});

function blockedCategoryReview(category) {
  return {
    category,
    status: 'RESTRICTED_RECEIPT_SOURCE_NOT_CONFIGURED',
    requiredFields: Object.fromEntries(RECEIPT_FIELDS[category].map(field => [field, 'REQUIRED'])),
    restrictedReceiptRef: null,
    restrictedReceiptSha256: null,
    restrictedReceiptDigestRecomputed: false,
    restrictedReceiptProvenanceMatched: false,
    custodyReceiptRef: null,
    independentReviewerReceiptRef: null,
    retentionDispositionReceiptRef: null,
    immutableTargetRecheckReceiptRef: null,
    accepted: false,
    rejectionReason: 'NO_PRIVATE_RECEIPT_SOURCE_SUPPLIED',
    publicProjection: 'ABSENT_VALUE_FREE_ONLY',
  };
}

function disabledRestrictedReceiptReview() {
  return {
    approvalScope: {
      approved: true,
      boundedToMainCommit: MAIN_COMMIT,
      restrictedReceiptValueHandlingAuthorized: true,
      publicRepositoryMayStoreRestrictedValues: false,
      sanitizedPublicProjectionOnly: true,
    },
    execution: {
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
    restrictedReceiptSource: {
      configured: false,
      sourceRef: null,
      storeOpened: false,
      restrictedValuesCreated: false,
      restrictedValuesCollected: false,
      restrictedValuesInstalled: false,
      restrictedValuesUsed: false,
      secretReads: false,
      providerEnvResourceBillingChanges: false,
      stopCode: 'RESTRICTED_RECEIPT_SOURCE_NOT_CONFIGURED',
    },
    review: {
      status: 'BLOCKED_NO_PRIVATE_RECEIPT_SOURCE',
      allEightCategoriesPresent: false,
      allCategoryDigestPairsBound: false,
      allCategoryDigestsRecomputed: false,
      allCategoryProvenanceMatched: false,
      custodyReviewerSeparationVerified: false,
      retentionDispositionSettled: false,
      immutableTargetRechecked: false,
      acceptedForSealedCardPreparation: false,
      reviewReceiptRef: null,
      reviewReceiptSha256: null,
      categoryReviews: Object.fromEntries(REQUIRED_LIVE_BINDINGS.map(category => [
        category, blockedCategoryReview(category),
      ])),
    },
    nextGate: {
      status: 'PRIVATE_RECEIPT_SOURCE_REQUIRED',
      nonExecutableSealedCardMayBePrepared: false,
      executableCommandCardMayBeIssued: false,
      exactLiveCollectionPhraseMayBeRequested: false,
      nextRequiredInput: 'A separately supplied private restricted receipt source with refs and exact SHA-256 digests for all eight categories.',
      nextRequiredApproval: 'Approve reading one named private restricted receipt bundle path or store reference, recomputing digests locally, committing only sanitized opaque refs/digests/disposition, and stopping before live collection.',
    },
  };
}

function checkDisabledRestrictedReceiptReview(input) {
  let ok = false;
  try { ok = plainData(input) && isDeepStrictEqual(input, disabledRestrictedReceiptReview()); } catch { /* sanitized */ }
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
    restrictedValuesCollected: false,
    restrictedValuesUsed: false,
    code: ok ? 'DISABLED_RESTRICTED_RECEIPT_REVIEW_SOURCE_ABSENT'
      : 'INVALID_DISABLED_RESTRICTED_RECEIPT_REVIEW',
  };
}

module.exports = {
  MAIN_COMMIT,
  APPROVED_GATE,
  disabledRestrictedReceiptReview,
  checkDisabledRestrictedReceiptReview,
};
