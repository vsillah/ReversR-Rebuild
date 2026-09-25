// Source-only contract. No restricted-source reads, receipt ingestion or execution.
const { isDeepStrictEqual } = require('node:util');
const { REQUIRED_LIVE_BINDINGS, ZERO_ACTIONS } = require('../cad-auth-live-collector-binding/guardedCollector');
const { RECEIPT_FIELDS, plainData } = require('../cad-auth-command-card-source/preparation');

function categoryContract(category) {
  return {
    category,
    requiredReceiptRef: true,
    requiredReceiptSha256: 'lowercase-hex-64',
    requiredByteLength: 'positive-integer',
    requiredFieldPresence: Object.fromEntries(RECEIPT_FIELDS[category].map(field => [field, {
      requiredInRestrictedSource: true,
      publicValueCommitted: false,
    }])),
    restrictedValuePolicy: {
      rawReceiptValuesStayPrivate: true,
      publicProjectionAllowed: 'opaque-ref-sha256-byte-count-and-field-presence-only',
      localDigestRecomputationRequired: true,
    },
  };
}

function sourceSetContract() {
  return {
    schemaVersion: 1,
    contract: 'cad-auth-coherent-restricted-source-set-contract-v1',
    sourceOnly: true,
    purpose: 'Define the exact acceptance shape for a future private eight-category CAD Auth restricted receipt source set.',
    requiredCategories: Object.fromEntries(REQUIRED_LIVE_BINDINGS.map(category => [
      category,
      categoryContract(category),
    ])),
    coherenceRules: {
      eitherSingleBundleOrDeclaredCoherentSet: true,
      everyCategoryRequiredExactlyOnce: true,
      duplicateCategoryRefsRejected: true,
      refsMustBeOpaqueAndNonPath: true,
      localPathsCommitted: false,
      topLevelKeysCommitted: false,
      privatePayloadValuesCommitted: false,
      allDigestsRecomputedFromExactStoredReceiptBytes: true,
      digestAlgorithm: 'SHA-256',
      digestEncoding: 'lowercase-hex-64',
      candidateCommitMustMatchCurrentReviewedTarget: true,
      immutableDeploymentMustMatchCurrentReviewedTarget: true,
      restrictedCohortMustMatchApprovedSyntheticCohort: true,
      custodianAndReviewerMustBeDistinctRefs: true,
      durableConsumedRunLedgerRequiredBeforeAnyExecutableCard: true,
      routeBodyObserverMustProveZeroBodyReadBeforeAdmission: true,
      lateGrantObserverMustProveDenialAfterGrantChange: true,
      retentionAndDeletionDispositionMustBeBoundBeforePublicProjection: true,
    },
    reviewDisposition: {
      status: 'AWAITING_COHERENT_EIGHT_CATEGORY_PRIVATE_SOURCE_SET',
      publicPacketCanAdvanceSealedCard: false,
      privateReadStillRequiresNamedSourceApproval: true,
      exactApprovalPhraseReady: false,
      nextRequiredInput: 'One named private bundle path or coherent source-set reference that contains all eight category receipts.',
      stopIfNoSingleSourceOrCoherentSetContainsAllEight: true,
    },
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
      ...ZERO_ACTIONS,
    },
  };
}

function checkSourceSetContract(input) {
  let ok = false;
  try { ok = plainData(input) && isDeepStrictEqual(input, sourceSetContract()); } catch { /* sanitized */ }
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
    exactApprovalPhraseReady: false,
    coherentPrivateSourceSetAccepted: false,
    code: ok ? 'SOURCE_ONLY_RESTRICTED_SOURCE_SET_CONTRACT_VALID'
      : 'INVALID_SOURCE_ONLY_RESTRICTED_SOURCE_SET_CONTRACT',
  };
}

module.exports = { sourceSetContract, checkSourceSetContract, categoryContract };
