// Source-only restricted candidate discovery result. No private source I/O.
const { isDeepStrictEqual } = require('node:util');
const { REQUIRED_LIVE_BINDINGS } = require('../cad-auth-live-collector-binding/guardedCollector');
const { RECEIPT_FIELDS, plainData } = require('../cad-auth-command-card-source/preparation');

const SOURCE_INTAKE_PACKET = Object.freeze({
  packet: 'cad-auth-restricted-source-intake-v1',
  sha256: 'c0bc4fc5249d72bd922fe3bf51abe73a2973b799901598b7afad9af37e2af871',
  boundMainCommit: 'ab9201047d542bc2d1f778ead41a78072bca80b3',
});

const DISCOVERY_SCOPE = Object.freeze({
  roots: {
    root1: 'rrb-local:cad-convex',
    root2: 'rrb-local:cad-auth-live-evidence-runs',
  },
  nameMatch: 'receipt|register|custody|observer|cohort|ledger|runtime|command|immutable|target|evidence',
  privatePayloadValuesCommitted: false,
  localPathsCommitted: false,
  topLevelKeysCommitted: false,
});

function keyed(items) {
  return Object.fromEntries(items.map((item, index) => [`item${index + 1}`, item]));
}

function requiredCategoryShape(category) {
  return {
    category,
    requiredFields: Object.fromEntries(RECEIPT_FIELDS[category].map(field => [field, 'REQUIRED'])),
    digestRequired: true,
    localDigestRecomputationRequired: true,
    opaqueRefRequired: true,
  };
}

function expectedCategorySummary() {
  return Object.fromEntries(REQUIRED_LIVE_BINDINGS.map(category => [category, {
    required: requiredCategoryShape(category),
    coveredByDiscovery: category === 'concreteProviderRuntimeBinding',
    candidateRefs: category === 'concreteProviderRuntimeBinding'
      ? {
        candidate1: 'rrb-local:cad-auth-candidate-discovery-019',
        candidate2: 'rrb-local:cad-auth-candidate-discovery-027',
      }
      : {},
    acceptedForBundle: false,
    blocker: category === 'concreteProviderRuntimeBinding'
      ? 'PARTIAL_SINGLE_FIELD_COVERAGE_ONLY'
      : 'NO_CANDIDATE_COVERAGE',
  }]));
}

function candidateDiscoveryDisposition(candidateRecords = {}) {
  return {
    approvalScope: {
      approvedCandidateDiscoveryRead: true,
      reviewedSourceIntakePacket: SOURCE_INTAKE_PACKET,
      publicRepositoryMayStorePrivateValues: false,
      sanitizedOpaqueRefsAndDigestsOnly: true,
      runtimeActivationAuthorized: false,
      liveEvidenceCollectionAuthorized: false,
    },
    discoveryScope: DISCOVERY_SCOPE,
    discoveryResult: {
      candidateCount: 78,
      validJsonCandidateCount: 78,
      invalidJsonCandidateCount: 0,
      categoryUnionComplete: false,
      categoriesCoveredCount: 1,
      categoriesMissingCount: 7,
      coveredCategories: { concreteProviderRuntimeBinding: true },
      missingCategories: Object.fromEntries(REQUIRED_LIVE_BINDINGS
        .filter(category => category !== 'concreteProviderRuntimeBinding')
        .map(category => [category, true])),
      candidateRecords,
      categorySummary: expectedCategorySummary(),
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
    },
    nextGate: {
      status: 'FULL_EIGHT_CATEGORY_RESTRICTED_RECEIPT_BUNDLE_STILL_REQUIRED',
      stopBeforeReadingAnotherPrivateSource: true,
      nonExecutableSealedCardMayBePrepared: false,
      executableCommandCardMayBeIssued: false,
      liveCollectionMayRun: false,
      requiredMissingCategories: keyed(REQUIRED_LIVE_BINDINGS
        .filter(category => category !== 'concreteProviderRuntimeBinding')),
      nextRequiredInput: 'A separately approved coherent private source set that contains all eight category refs and exact SHA-256 digests.',
    },
  };
}

function checkCandidateDiscoveryDisposition(input) {
  let ok = false;
  try {
    ok = plainData(input)
      && isDeepStrictEqual(input.discoveryScope, DISCOVERY_SCOPE)
      && isDeepStrictEqual(input.approvalScope.reviewedSourceIntakePacket, SOURCE_INTAKE_PACKET)
      && input.discoveryResult.candidateCount === 78
      && input.discoveryResult.validJsonCandidateCount === 78
      && input.discoveryResult.categoryUnionComplete === false
      && input.discoveryResult.categoriesCoveredCount === 1
      && input.discoveryResult.categoriesMissingCount === 7
      && isDeepStrictEqual(input.discoveryResult.categorySummary, expectedCategorySummary())
      && input.controls.executable === false
      && input.controls.liveCollectionAuthorized === false
      && input.controls.uploadSessionIssuanceEnabled === false
      && input.controls.requestBodyAdmissionRead === false
      && input.nextGate.status === 'FULL_EIGHT_CATEGORY_RESTRICTED_RECEIPT_BUNDLE_STILL_REQUIRED';
  } catch { /* sanitized */ }
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
    categoryUnionComplete: false,
    code: ok ? 'RESTRICTED_CANDIDATE_DISCOVERY_INCOMPLETE_VALID'
      : 'INVALID_RESTRICTED_CANDIDATE_DISCOVERY_DISPOSITION',
  };
}

module.exports = {
  SOURCE_INTAKE_PACKET,
  DISCOVERY_SCOPE,
  candidateDiscoveryDisposition,
  checkCandidateDiscoveryDisposition,
  expectedCategorySummary,
};
