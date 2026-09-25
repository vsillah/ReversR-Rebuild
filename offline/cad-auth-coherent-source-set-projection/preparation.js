// Source-only projection of supplied sanitized facts. No private source or receipt IO.
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../cad-auth-command-card-source/preparation');

const SOURCE_MERGE_COMMIT = '3ab958f1216fa33323e1ed9b65d2408836788427';
const RUN_ID = '20260925t182340z';
const SOURCE_SET_SHA256 = '2d437fd9e964dd1c346bb60d9d3de8d14bd845e1980a225ffeb4ca4c4b2216c4';
const RECEIPTS = Object.freeze({
  concreteProviderRuntimeBinding: Object.freeze({ receiptSha256: 'a24d3cdca11913520dec27419897167592003bc15a9345047a87a661230c8985', byteLength: 5189, requiredFieldCount: 3 }),
  executableCollectorCommand: Object.freeze({ receiptSha256: 'dbe9adfcfc09a061a38722f090b48c8fdabcc4dd2597218587a94ffbedc51470', byteLength: 6196, requiredFieldCount: 3 }),
  restrictedSyntheticCohortReceipt: Object.freeze({ receiptSha256: '04aa1e7e9a1e22d1384eec0b2a7e41c5a0abfa8ea50796f3ad585c2b6d82ddc2', byteLength: 4857, requiredFieldCount: 2 }),
  custodyReviewerReceipt: Object.freeze({ receiptSha256: 'a9525ef592033a38c4b931783ae5b784f7b5fe1a81d5c71b9edf7e0d538fb830', byteLength: 6243, requiredFieldCount: 3 }),
  durableConsumedRunLedger: Object.freeze({ receiptSha256: '2b2998396fc0d60e326a2098e96f65b163d1c8545e9c682f0219a3185ab6f662', byteLength: 6247, requiredFieldCount: 3 }),
  installedRouteBodyObserver: Object.freeze({ receiptSha256: 'a6422672df981f80baa776e13c784efded4ba2be65e6a1fedc31d08dc89fbdb6', byteLength: 6145, requiredFieldCount: 3 }),
  lateGrantObserver: Object.freeze({ receiptSha256: 'e6efeb497c8662b549a436c5648a7cd8bf1aff2921477126fc1ba93999180c42', byteLength: 4840, requiredFieldCount: 2 }),
  immutableTargetRecheckReceipt: Object.freeze({ receiptSha256: 'e7b725815d6e4ab8dc74b1b1023e49687f66a0c1de072d032e86afd883067add', byteLength: 7693, requiredFieldCount: 4 }),
});

const CLOSED_CONTROLS = Object.freeze({
  privateSourceSetReadAuthorized: false,
  privateReceiptReadAuthorized: false,
  privateReceiptDiscoveryAuthorized: false,
  privateValueDisclosureAuthorized: false,
  privatePathsProjected: false,
  keyListingsProjected: false,
  secretReadAuthorized: false,
  providerEnvResourceBillingChangeAuthorized: false,
  receiptCreationAuthorized: false,
  sourceSetGenerationAuthorized: false,
  executable: false,
  executableCommandCardIssued: false,
  executableCommandCardIssuanceAuthorized: false,
  liveCollectorCommandLine: null,
  liveEvidenceCollectionAuthorized: false,
  runtimeActivationAuthorized: false,
  bodyAdmissionAuthorized: false,
  requestBodyAdmissionReadAuthorized: false,
  uploadSessionIssuanceAuthorized: false,
  productionUploadActivationAuthorized: false,
  conversionAuthorized: false,
  sandboxDispatchAuthorized: false,
  privateCadUseAuthorized: false,
  externalMessagesAuthorized: false,
  retryAuthorized: false,
  secondRunAuthorized: false,
  authorizedRuns: 0,
  realUserCommercializationAuthorized: false,
  commercialReadinessClaimed: false,
});

const BOUNDARIES = 'No private source-set or receipt reads, private values, private paths, key listings, provider/env/resource/billing changes, secrets or secret reads, upload-session issuance, production upload activation, request-body admission/read, conversion, Sandbox dispatch, private CAD payload use, live evidence collection, runtime activation, executable command-card issuance, external messages, retry, second run, real-user commercialization, or commercial-readiness claim.';

function coherentSourceSetProjection() {
  return {
    schemaVersion: 1,
    projection: 'cad-auth-coherent-restricted-source-set-projection-v1',
    sourceOnly: true,
    sourceMergeCommit: SOURCE_MERGE_COMMIT,
    sourceSet: {
      runId: RUN_ID,
      outputSha256: SOURCE_SET_SHA256,
      disposition: 'COHERENT_EIGHT_CATEGORY_SOURCE_SET_DISPOSITION_PROJECTED',
      evidenceBasis: 'APPROVED_SANITIZED_HANDOFF_FACTS_ONLY',
      privateSourceSetBytesReadByThisLane: false,
      privateReceiptBytesReadByThisLane: false,
      privateDigestsRecomputedByThisLane: false,
      privateReceiptSemanticsVerifiedByThisLane: false,
      liveEvidenceAcceptedByThisPacket: false,
    },
    categoryCoverage: Object.fromEntries(Object.entries(RECEIPTS).map(([category, receipt]) => [category, {
      ...receipt,
      presentFieldCount: receipt.requiredFieldCount,
      complete: true,
      status: 'SUPPLIED_COVERAGE_COMPLETE_PROJECTED',
    }])),
    overallCoverage: {
      requiredCategoryCount: 8,
      presentCategoryCount: 8,
      requiredFieldCount: 23,
      presentFieldCount: 23,
      totalReceiptByteLength: Object.values(RECEIPTS).reduce((sum, receipt) => sum + receipt.byteLength, 0),
      complete: true,
      coverageProvesRuntimeReadiness: false,
    },
    closedControlStatus: {
      allRuntimeControlsClosed: true,
      executableCommandCardAbsent: true,
      liveCollectionClosed: true,
      runtimeActivationClosed: true,
      bodyAdmissionReadClosed: true,
      uploadSessionIssuanceClosed: true,
      productionUploadActivationClosed: true,
      conversionClosed: true,
      sandboxDispatchClosed: true,
      retryAndSecondRunClosed: true,
      commercialReadinessUnclaimed: true,
    },
    nextGate: {
      status: 'SEPARATE_SOURCE_ONLY_READINESS_REVIEW_REQUIRED',
      authorized: false,
      exactPhraseTemplate: `I approve a bounded source-only CAD Auth next-gate readiness review for ReversR-Rebuild, bound to coherent restricted source-set projection packet <projectionPacketSha256> at reviewed source commit <reviewedSourceCommit>, source-set output SHA-256 ${SOURCE_SET_SHA256}, run id ${RUN_ID}. Scope: review only committed sanitized source artifacts; identify remaining target/source/time coherence, reviewer independence, custody/retention/deletion, durable consumed-run ledger, route-body observer, late-grant observer, and sealed-card prerequisites; prepare only a source-only readiness disposition and any separately bounded next approval requirements. Stop on failing checks, unknown outcome, missing evidence, or any need for private reads or runtime credentials/provider configuration. ${BOUNDARIES}`,
      phraseFields: { projectionPacketSha256: null, reviewedSourceCommit: null },
      unresolvedPlaceholdersAreNotApproval: true,
      projectionIsNotExecutableApproval: true,
      privateReadRequiresSeparateNamedSourceApproval: true,
      executableCardRequiresSeparateApproval: true,
      liveCollectionRequiresSeparateApproval: true,
      runtimeActivationRequiresSeparateApproval: true,
      prerequisites: {
        targetSourceTimeCoherence: 'REQUIRES_SEPARATE_REVIEW',
        reviewerIndependence: 'REQUIRES_SEPARATE_REVIEW',
        custodyRetentionDeletionDisposition: 'REQUIRES_SEPARATE_REVIEW',
        durableConsumedRunLedger: 'REQUIRES_SEPARATE_REVIEW',
        routeBodyObserver: 'REQUIRES_SEPARATE_REVIEW',
        lateGrantObserver: 'REQUIRES_SEPARATE_REVIEW',
        sealedCardPrerequisites: 'REQUIRES_SEPARATE_REVIEW',
      },
    },
    stopConditions: {
      sourceSetDigestOrRunIdMismatch: true,
      receiptDigestOrByteCountMismatch: true,
      missingDuplicateOrUnexpectedCategory: true,
      categoryOrRequiredFieldCoverageMismatch: true,
      sourceBindingDrift: true,
      privateValuesPathsOrKeyListingsWouldBeReadOrProjected: true,
      controlsNotClosed: true,
      missingEvidence: true,
      failingCheck: true,
      unknownOutcome: true,
      runtimeCredentialsOrProviderConfigurationNeeded: true,
      retryOrSecondRunRequested: true,
    },
    controls: { ...CLOSED_CONTROLS },
  };
}

function checkCoherentSourceSetProjection(input) {
  let ok = false;
  try { ok = plainData(input) && isDeepStrictEqual(input, coherentSourceSetProjection()); } catch { /* sanitized */ }
  return {
    ...CLOSED_CONTROLS,
    ok,
    code: ok ? 'SOURCE_ONLY_COHERENT_SOURCE_SET_PROJECTION_VALID'
      : 'INVALID_SOURCE_ONLY_COHERENT_SOURCE_SET_PROJECTION',
  };
}

module.exports = {
  SOURCE_MERGE_COMMIT, RUN_ID, SOURCE_SET_SHA256, RECEIPTS, CLOSED_CONTROLS,
  coherentSourceSetProjection, checkCoherentSourceSetProjection,
};
