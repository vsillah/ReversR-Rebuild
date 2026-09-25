// Source-only production upload-admission readiness rollup. No private receipt IO.
const { isDeepStrictEqual } = require('node:util');
const { REQUIRED_LIVE_BINDINGS, ZERO_ACTIONS } = require('../cad-auth-live-collector-binding/guardedCollector');
const { RECEIPT_FIELDS, plainData } = require('../cad-auth-command-card-source/preparation');
const {
  ACCEPTED_PROVENANCE_PACKET_SHA256,
  SOURCE_SET_RUN_ID,
  SOURCE_SET_SHA256,
  RECEIPTS,
  restrictedSourceSetProjection,
  checkRestrictedSourceSetProjection,
} = require('../cad-auth-restricted-source-set-projection/preparation');

const SOURCE_MERGE_COMMIT = '360321b58b983007fa3e7bed1bc5f6150cca6826';
const SOURCE_SET_PROJECTION_PACKET_SHA256 =
  '2a3c04870214faa8a108ea364b702f7cedb7c12878dae49add67168d3f153d9b';
const PRODUCTION_TARGET_ORIGIN = 'https://reversr.vercel.app';
const PRODUCTION_UPLOAD_ROUTE = 'POST /api/cad/user-import';
const INTERNAL_TEST_COHORT_REF = 'rrb-ref:cad-upload-internal-mark-test-cohort-v1';

function productionUploadAdmissionPhraseTemplate() {
  return `I approve one bounded internal production upload-admission opening for ReversR CAD user-import, bound to source-only upload-admission readiness rollup packet <rollupPacketSha256> at source commit <rollupSourceCommit>, coherent restricted source-set projection packet ${SOURCE_SET_PROJECTION_PACKET_SHA256}, private restricted source-set SHA-256 ${SOURCE_SET_SHA256}, run id ${SOURCE_SET_RUN_ID}, and accepted provenance projection packet ${ACCEPTED_PROVENANCE_PACKET_SHA256}. Scope: against ${PRODUCTION_TARGET_ORIGIN} ${PRODUCTION_UPLOAD_ROUTE}, for cohort ${INTERNAL_TEST_COHORT_REF}, starting <startUtc> and expiring <expiresUtc>; admission-only body validation for public, synthetic, or explicitly authorized internal tester CAD; one concurrent session; one upload attempt; stop on unknown outcome; rollback immediately after the window; and run post-rollback fail-closed smoke before cleanup. No conversion, Sandbox dispatch, private CAD, real-user commercialization, external messages, provider/env/resource/billing changes, second run, retry, or commercial-readiness claim.`;
}

function receiptCoverageProjection() {
  return Object.fromEntries(REQUIRED_LIVE_BINDINGS.map(category => {
    const receipt = RECEIPTS[category];
    const requiredFieldCount = RECEIPT_FIELDS[category].length;
    return [category, {
      receiptRef: `rrb-ref:cad-auth-restricted-source-set:${SOURCE_SET_RUN_ID}:${category}:${receipt.receiptSha256.slice(0, 12)}`,
      receiptSha256: receipt.receiptSha256,
      byteLength: receipt.byteLength,
      requiredFieldCount,
      presentFieldCount: requiredFieldCount,
      coverage: `${requiredFieldCount}/${requiredFieldCount}`,
      complete: true,
      valuesProjected: false,
      pathsProjected: false,
      keyListingsProjected: false,
    }];
  }));
}

function uploadAdmissionReadinessRollup() {
  const sourceSet = restrictedSourceSetProjection();
  const categories = receiptCoverageProjection();
  const requiredFieldCount = Object.values(categories)
    .reduce((sum, category) => sum + category.requiredFieldCount, 0);
  const presentFieldCount = Object.values(categories)
    .reduce((sum, category) => sum + category.presentFieldCount, 0);
  const receiptByteCountTotal = Object.values(categories)
    .reduce((sum, category) => sum + category.byteLength, 0);
  return {
    schemaVersion: 1,
    rollup: 'cad-auth-production-upload-admission-readiness-rollup-v1',
    sourceOnly: true,
    sourceMergeCommit: SOURCE_MERGE_COMMIT,
    acceptedProvenance: {
      packet: 'cad-auth-accepted-provenance-review-projection-v1',
      sha256: ACCEPTED_PROVENANCE_PACKET_SHA256,
      acceptedFieldCount: 22,
      requiredFieldCount: 22,
      status: 'ACCEPTED_22_OF_22_PROJECTED_BY_DIGEST_ONLY',
      privateReviewBytesReadByThisRollup: false,
      privateReviewReceiptBytesReadByThisRollup: false,
      repairedScheduleBytesReadByThisRollup: false,
    },
    restrictedSourceSetProjection: {
      packet: 'cad-auth-coherent-restricted-source-set-projection-v1',
      sha256: SOURCE_SET_PROJECTION_PACKET_SHA256,
      sourceCommit: SOURCE_MERGE_COMMIT,
      restrictedSourceSetSha256: SOURCE_SET_SHA256,
      runId: SOURCE_SET_RUN_ID,
      status: 'COHERENT_EIGHT_CATEGORY_SOURCE_SET_PROJECTED',
      categoryCount: sourceSet.categoryCoverage.categoryCount,
      completeCategoryCount: sourceSet.categoryCoverage.completeCategoryCount,
      requiredFieldCount: sourceSet.categoryCoverage.requiredFieldCount,
      presentFieldCount: sourceSet.categoryCoverage.presentFieldCount,
      privateSourceSetBytesReadByThisRollup: false,
      privateReceiptValuesProjected: false,
      privatePathsProjected: false,
      keyListingsProjected: false,
    },
    eightArtifactReceiptSupply: {
      status: 'EIGHT_RECEIPT_ARTIFACT_DIGESTS_AND_COUNTS_BOUND',
      complete: true,
      categoryCount: REQUIRED_LIVE_BINDINGS.length,
      completeCategoryCount: REQUIRED_LIVE_BINDINGS.length,
      requiredFieldCount,
      presentFieldCount,
      receiptDigestCount: REQUIRED_LIVE_BINDINGS.length,
      receiptByteCountTotal,
      categories,
    },
    productionUploadAdmissionTarget: {
      origin: PRODUCTION_TARGET_ORIGIN,
      route: PRODUCTION_UPLOAD_ROUTE,
      internalTestCohortRef: INTERNAL_TEST_COHORT_REF,
      routeBindingOnly: true,
      uploadAdmissionAuthorizedByThisRollup: false,
      requestBodyAdmissionReadAuthorizedByThisRollup: false,
      uploadSessionIssuanceAuthorizedByThisRollup: false,
    },
    closedControlStatus: {
      acceptedProvenanceBound: true,
      eightArtifactReceiptSupplyBound: true,
      coherentRestrictedSourceSetBound: true,
      rollbackAndStopControlsBound: true,
      uploadControlsRemainClosed: true,
      requestBodyAdmissionReadRemainsClosed: true,
      uploadSessionIssuanceRemainsClosed: true,
      runtimeActivationRemainsClosed: true,
      conversionRemainsClosed: true,
      sandboxDispatchRemainsClosed: true,
      realUserCommercializationRemainsClosed: true,
      commercialReadinessRemainsUnclaimed: true,
    },
    rollbackStopConditions: {
      failingCheck: true,
      failingSmoke: true,
      unknownOutcome: true,
      sourceSetProjectionDigestMismatch: true,
      restrictedSourceSetDigestMismatch: true,
      acceptedProvenanceProjectionDigestMismatch: true,
      receiptDigestMismatch: true,
      receiptByteCountMismatch: true,
      missingReceiptCategory: true,
      incompleteReceiptFieldCoverage: true,
      controlsNotClosed: true,
      runtimeCredentialsOrProviderConfigurationNeeded: true,
      providerEnvResourceBillingChangeNeeded: true,
      secretOrPrivateValueWouldBeRead: true,
    },
    nextProductionUploadAdmissionGate: {
      authorized: false,
      exactPhraseTemplate: productionUploadAdmissionPhraseTemplate(),
      phraseFields: {
        rollupPacketSha256: null,
        rollupSourceCommit: null,
        startUtc: null,
        expiresUtc: null,
      },
      productionUploadAdmissionRequiresSeparateApproval: true,
      requestBodyAdmissionReadRequiresSeparateApproval: true,
      uploadSessionIssuanceRequiresSeparateApproval: true,
      runtimeActivationRequiresSeparateApproval: true,
      conversionRequiresSeparateApproval: true,
      unresolvedPlaceholdersAreNotApproval: true,
    },
    controls: {
      ...ZERO_ACTIONS,
      sourceOnlyUploadAdmissionReadinessRollupAuthorized: true,
      privateReceiptReadAuthorized: false,
      privateReceiptDiscoveryAuthorized: false,
      secretReadAuthorized: false,
      privateValueDisclosureAuthorized: false,
      privatePathDisclosureAuthorized: false,
      keyListingDisclosureAuthorized: false,
      providerEnvResourceBillingChangeAuthorized: false,
      receiptCreationAuthorized: false,
      receiptSupplyAuthorized: false,
      sourceSetGenerationAuthorized: false,
      publicSourceSetProjectionAuthorized: false,
      uploadSessionIssuanceAuthorized: false,
      productionUploadActivationAuthorized: false,
      requestBodyAdmissionReadAuthorized: false,
      conversionAuthorized: false,
      sandboxDispatchAuthorized: false,
      privateCadUseAuthorized: false,
      liveEvidenceCollectionAuthorized: false,
      runtimeActivationAuthorized: false,
      executableCommandCardIssuanceAuthorized: false,
      externalMessagesAuthorized: false,
      retryAuthorized: false,
      secondRunAuthorized: false,
      realUserCommercializationAuthorized: false,
      commercialReadinessClaimed: false,
    },
  };
}

function checkUploadAdmissionReadinessRollup(input) {
  let ok = false;
  try {
    ok = plainData(input)
      && isDeepStrictEqual(input, uploadAdmissionReadinessRollup())
      && checkRestrictedSourceSetProjection(restrictedSourceSetProjection()).ok;
  } catch { /* sanitized */ }
  return {
    ...uploadAdmissionReadinessRollup().controls,
    ok,
    code: ok ? 'SOURCE_ONLY_UPLOAD_ADMISSION_READINESS_ROLLUP_VALID'
      : 'INVALID_SOURCE_ONLY_UPLOAD_ADMISSION_READINESS_ROLLUP',
  };
}

module.exports = {
  SOURCE_MERGE_COMMIT,
  SOURCE_SET_PROJECTION_PACKET_SHA256,
  PRODUCTION_TARGET_ORIGIN,
  PRODUCTION_UPLOAD_ROUTE,
  INTERNAL_TEST_COHORT_REF,
  receiptCoverageProjection,
  productionUploadAdmissionPhraseTemplate,
  uploadAdmissionReadinessRollup,
  checkUploadAdmissionReadinessRollup,
};
