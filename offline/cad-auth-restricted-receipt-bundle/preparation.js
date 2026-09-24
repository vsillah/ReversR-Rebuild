// Source-only skeleton. No receipt ingestion, storage or execution capability.
const { isDeepStrictEqual } = require('node:util');
const { plainData, disabledPreparation } = require('../cad-auth-command-card-source/preparation');
const MERGE_COMMIT = 'b3812cca0a1f67126fd8e6867b8fb77c0748a86f';
function disabledBundle() {
  return {
    ...disabledPreparation(),
    bundleReceiptRef: null, bundleReceiptSha256: null, restrictedValuesLoaded: false,
    custody: {
      restrictedStoreReceiptRef: null, custodianReceiptRef: null,
      independentReviewerReceiptRef: null, distinctReviewerVerified: false,
      retentionPolicyReceiptRef: null, deletionDispositionReceiptRef: null,
      repositoryStorageAuthorized: false, publicProjectionAuthorized: false,
    },
    review: {
      status: 'MISSING_PREREQUISITE', complete: false,
      reviewReceiptRef: null, reviewReceiptSha256: null,
      targetRechecked: false, exactApprovalPhraseReady: false,
    },
  };
}
function checkDisabledBundle(input) {
  let ok = false;
  try { ok = plainData(input) && isDeepStrictEqual(input, disabledBundle()); } catch { /* sanitized */ }
  return { ok, executable: false, executableCommandCardIssued: false,
    liveCollectionAuthorized: false, runtimeActivationAuthorized: false,
    bodyAdmissionAuthorized: false, uploadSessionIssuanceEnabled: false,
    retryOrSecondRunAuthorized: false, authorizedRuns: 0,
    evidenceAccepted: false, commercialReadinessClaimed: false, liveCollectorCommandLine: null,
    code: ok ? 'DISABLED_RECEIPT_BUNDLE_ONLY' : 'INVALID_DISABLED_RECEIPT_BUNDLE' };
}
module.exports = { MERGE_COMMIT, disabledBundle, checkDisabledBundle };
