// Value-free contract only. No receipt ingestion, reference resolution or execution.
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../cad-auth-command-card-source/preparation');
const { disabledRebind, checkDisabledRebind } = require('../cad-auth-sealed-card-custody-rebind/preparation');
const SOURCE_MERGE_COMMIT = '098357ec891a5b591bb652d33e9d1c2ce79af6e8';

function disabledIntake() {
  const inherited = disabledRebind();
  return {
    ...inherited,
    bindingStatus: 'RECEIPT_INTAKE_TEMPLATE_UNBOUND_SOURCE_ONLY',
    intake: {
      status: 'NOT_STARTED_SEPARATE_AUTHORITY_REQUIRED',
      templateOnly: true, restrictedValuesLoaded: false, receiptIngestionImplemented: false,
      authorityReceiptRef: null, restrictedStoreRef: null,
      custodyTransferReceiptRef: null, custodyTransferReceiptSha256: null,
      receivedAtUtc: null, receivedByIdentityRef: null,
      slots: Object.fromEntries(Object.keys(inherited.runtimeBindingReceipts).map(category => [category, {
        status: 'MISSING_PREREQUISITE', required: true,
        categoryContract: 'runtimeBindingReceipts.' + category,
        receiptRef: null, receiptSha256: null,
        provenanceReceiptRef: null, provenanceReceiptSha256: null,
        originIdentityRef: null, createdAtUtc: null, byteScopeReceiptRef: null,
        custodianAssignmentRef: null, preparerAssignmentRef: null,
        independentReviewerAssignmentRef: null, reviewedAtUtc: null,
        reviewReceiptRef: null, reviewReceiptSha256: null,
        retentionPolicyReceiptRef: null, immutableTargetRecheckReceiptRef: null,
        digestVerified: false, custodyVerified: false, provenanceVerified: false,
        independentReviewAccepted: false, accepted: false,
      }])),
      prerequisites: {
        separateRestrictedValueAuthorityRequired: true,
        userOwnedRestrictedStoreOutsideGitRequired: true,
        allCategoryEvidenceSlotsRequired: true,
        custodyTransferAndAccessAccountabilityRequired: true,
        distinctReviewerAndConflictReviewRequired: true,
        retentionStartExpiryAndDeletionOwnerRequired: true,
        separatelyApprovedDeletionDispositionRequired: true,
        exactStoredBytesAndIndependentDigestRecomputationRequired: true,
        provenanceAuthenticityAndCategoryMatchRequired: true,
        immutableTargetRecheckBeforeProposalAndRunRequired: true,
        missingUnknownExpiredMismatchOrDriftBlocksReview: true,
        automaticPromotionAllowed: false,
      },
      disposition: {
        status: 'UNBOUND', quarantineReceiptRef: null, rejectionReceiptRef: null,
        expiryReviewReceiptRef: null, deletionDispositionReceiptRef: null,
        rejectedEvidenceMayBeUsed: false, expiredEvidenceMayBeUsed: false,
        deletionAuthorized: false,
      },
    },
    futureHumanGate: {
      ...inherited.futureHumanGate,
      nextStep: 'Review this empty intake template only. Obtain separately scoped authority before creating, collecting, installing or using any restricted receipt values.',
    },
  };
}

function checkDisabledIntake(input) {
  let ok = false;
  try { ok = plainData(input) && isDeepStrictEqual(input, disabledIntake()); } catch { /* sanitized */ }
  return { ...checkDisabledRebind(null), ok, receiptIngestionImplemented: false,
    restrictedValuesLoaded: false, intakeAccepted: false,
    code: ok ? 'DISABLED_RECEIPT_INTAKE_TEMPLATE_ONLY' : 'INVALID_DISABLED_RECEIPT_INTAKE_TEMPLATE' };
}
module.exports = { SOURCE_MERGE_COMMIT, disabledIntake, checkDisabledIntake };
