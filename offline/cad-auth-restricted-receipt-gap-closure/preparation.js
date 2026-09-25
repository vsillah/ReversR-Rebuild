// Source-only gap-closure plan. No private receipt reads, runtime activation or live collection.
const { isDeepStrictEqual } = require('node:util');
const { REQUIRED_LIVE_BINDINGS, ZERO_ACTIONS } = require('../cad-auth-live-collector-binding/guardedCollector');
const { RECEIPT_FIELDS, plainData } = require('../cad-auth-command-card-source/preparation');
const { generatorContract } = require('../cad-auth-restricted-source-set-generator/preparation');

const OBSERVED_GAP = Object.freeze({
  approvedRootsScanned: 2,
  parsedJsonFiles: 98,
  fullCategoryMatches: 0,
  concreteProviderRuntimeBindingPartial: {
    filesWithAnyRequiredField: 4,
    presentFields: { adapterSourceSha256: true },
    missingFields: { installedRuntimeReceiptRef: true, providerBindingReceiptRef: true },
  },
});

function categoryArtifacts(category) {
  return {
    requiredReceiptFile: generatorContract().privateReadPolicy.expectedReceiptFiles[category],
    requiredFields: Object.fromEntries(RECEIPT_FIELDS[category].map(field => [field, true])),
    requiredArtifactContract: {
      dedicatedJsonReceipt: true,
      publicFieldPresenceOnly: true,
      opaqueRefsOnly: true,
      digestAndByteCountOnlyAfterPrivateReadApproval: true,
      localPathDisclosureAllowed: false,
      privateValueDisclosureAllowed: false,
      topLevelKeyListingAllowed: false,
    },
  };
}

function gapClosurePlan() {
  return {
    schemaVersion: 1,
    plan: 'cad-auth-restricted-receipt-gap-closure-plan-v1',
    sourceOnly: true,
    purpose: 'Define the missing source-only receipt artifacts required before a coherent eight-category restricted source set can be generated.',
    parentContract: generatorContract().contract,
    observedGap: OBSERVED_GAP,
    requiredCategories: Object.fromEntries(REQUIRED_LIVE_BINDINGS.map(category => [
      category,
      categoryArtifacts(category),
    ])),
    sourceAndProvenanceBoundary: {
      allowedFutureInputs: {
        namedIgnoredPrivateFolder: 'one named ignored private folder containing the eight exact receipt files',
        approvedSanitizedProjectionRead: 'one separately approved sanitized ignored projection read',
      },
      disallowedSourceActions: {
        automaticPrivateSearch: true,
        broadDirectoryDiscoveryWithoutGate: true,
        localPathPublication: true,
        privateReceiptValuePublication: true,
        topLevelKeyListingPublication: true,
        providerRuntimeValuePublication: true,
        requestBodyPublication: true,
        privateCadPayloadUse: true,
      },
      publicCommitBoundary: {
        docsTestsCheckersManifestsOnly: true,
        publicFieldNamesAllowed: true,
        opaqueRefsDigestsByteCountsAllowedOnlyAfterPrivateReadGate: true,
      },
    },
    stopConditions: {
      anyMissingCategoryReceipt: true,
      anyMissingRequiredField: true,
      duplicateCategorySourceDigest: true,
      malformedJson: true,
      symlinkedReceipt: true,
      providerOrRuntimeCredentialNeeded: true,
      liveCollectionNeeded: true,
      requestBodyReadNeeded: true,
      privateValueWouldBeDisclosed: true,
    },
    futureApprovalGates: {
      receiptCreationOrCollection: {
        requiredBefore: 'creating or collecting any missing private receipt artifact',
        mustName: {
          sourceSystem: true,
          custodian: true,
          reviewer: true,
          category: true,
          allowedEvidenceSource: true,
          retentionBoundary: true,
        },
      },
      privateSourceSetGeneration: {
        requiredBefore: 'reading a named private receipt folder and writing ignored restricted-source-set.json',
        mustName: { exactSourceFolder: true, exactOutputFile: true, runId: true },
      },
      sanitizedProjectionReview: {
        requiredBefore: 'committing opaque refs, digests, byte counts or disposition derived from a private projection',
        mustName: { exactProjectionPath: true, projectionSha256: true, candidateCommit: true },
      },
      liveEvidenceCollection: {
        requiredBefore: 'any executable command card, provider/Auth test, upload-session issuance or production activation',
        mustName: { sealedCommandCardDigest: true, utcWindow: true, limitsDigest: true, rollbackControls: true },
      },
    },
    controls: {
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
      authorizedRuns: 0,
      ...ZERO_ACTIONS,
    },
  };
}

function checkGapClosurePlan(input) {
  let ok = false;
  try { ok = plainData(input) && isDeepStrictEqual(input, gapClosurePlan()); } catch { /* sanitized */ }
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
    code: ok ? 'SOURCE_ONLY_RESTRICTED_RECEIPT_GAP_CLOSURE_PLAN_VALID'
      : 'INVALID_SOURCE_ONLY_RESTRICTED_RECEIPT_GAP_CLOSURE_PLAN',
  };
}

module.exports = { OBSERVED_GAP, gapClosurePlan, checkGapClosurePlan };
