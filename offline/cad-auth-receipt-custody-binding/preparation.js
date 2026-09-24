// Source-only requirements and empty slots. No receipt I/O or execution.
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../cad-auth-command-card-source/preparation');
const { disabledBundle, checkDisabledBundle } = require('../cad-auth-restricted-receipt-bundle/preparation');
const MERGE_COMMIT = '598ad5785c89e1b350312fba60d8052bc090c111';
function disabledBinding() {
  return {
    ...disabledBundle(),
    bindingStatus: 'UNBOUND_SOURCE_ONLY',
    restrictedReceiptCreationAuthorized: false,
    restrictedReceiptCollectionAuthorized: false,
    restrictedReceiptInstallationAuthorized: false,
    restrictedReceiptUseAuthorized: false,
    roles: {
      custodian: { responsibility: 'Maintain user-owned restricted storage and access accountability', identityRef: null, assignmentReceiptRef: null },
      preparer: { responsibility: 'Prepare scoped evidence with provenance under separate authority', identityRef: null, assignmentReceiptRef: null },
      independentReviewer: { responsibility: 'Independently verify each receipt, custody, digest and target', identityRef: null, assignmentReceiptRef: null },
      deletionOwner: { responsibility: 'Carry out separately authorized disposition and document completion', identityRef: null, assignmentReceiptRef: null },
    },
    independentReview: {
      reviewerDistinctFromCustodianRequired: true, reviewerDistinctFromPreparerRequired: true,
      selfAttestationSufficient: false, allEightCategoriesRequired: true,
      conflictsResolved: false, identitySeparationVerified: false,
      conflictReviewReceiptRef: null, reviewReceiptRef: null, reviewReceiptSha256: null,
    },
    retentionDisposition: {
      retentionDays: 7, retentionStartsAt: 'FIRST_RESTRICTED_RECEIPT_CREATION',
      startUtc: null, expiresUtc: null, policyReceiptRef: null,
      deletionOwnerReceiptRef: null, deletionApprovalReceiptRef: null,
      dispositionReceiptRef: null, dispositionReceiptSha256: null, completedAtUtc: null,
      separatelyAuthorizedDeletionRequired: true, deletionAuthorized: false,
      expiredEvidenceBlocksUse: true, unresolvedDispositionBlocksUse: true,
      repositoryStorageAuthorized: false, publicProjectionAuthorized: false,
    },
    immutableTargetRecheck: {
      candidateCommit: null, immutableDeploymentRef: null, sourceDigestReceiptRef: null,
      recheckReceiptRef: null, recheckReceiptSha256: null, recheckedAtUtc: null,
      exactCommitAndDeploymentRequired: true, mutableAliasSufficient: false,
      recheckBeforeCommandCardProposalRequired: true, recheckBeforeAnyFutureRunRequired: true,
      driftInvalidatesPriorReview: true, sourceHashProvesInstalledRuntime: false, verified: false,
    },
    receiptDigestReview: {
      algorithm: 'SHA-256', encoding: 'lowercase-hex-64', byteScope: 'EXACT_STORED_RECEIPT_BYTES',
      categoryRefDigestPairsRequired: true, bundleRefDigestPairRequired: true,
      provenanceAndCategoryMatchRequired: true, independentRecomputationRequired: true,
      sourceDigestSubstitutionAllowed: false, digestAloneProvesAuthenticity: false,
      missingMismatchUnknownBlocksReview: true, verified: false,
      validationReceiptRef: null, validationReceiptSha256: null,
    },
  };
}
function checkDisabledBinding(input) {
  let ok = false;
  try { ok = plainData(input) && isDeepStrictEqual(input, disabledBinding()); } catch { /* sanitized */ }
  return { ...checkDisabledBundle(null), ok,
    restrictedReceiptCreationAuthorized: false, restrictedReceiptCollectionAuthorized: false,
    restrictedReceiptInstallationAuthorized: false, restrictedReceiptUseAuthorized: false,
    code: ok ? 'DISABLED_CUSTODY_BINDING_ONLY' : 'INVALID_DISABLED_CUSTODY_BINDING' };
}
module.exports = { MERGE_COMMIT, disabledBinding, checkDisabledBinding };
