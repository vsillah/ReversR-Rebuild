// Source-only reviewer disposition template. No receipt ingestion, storage or execution.
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../cad-auth-command-card-source/preparation');
const { disabledIntake, checkDisabledIntake } = require('../cad-auth-receipt-intake-template/preparation');

const SOURCE_MERGE_COMMIT = '098357ec891a5b591bb652d33e9d1c2ce79af6e8';

function emptyCategoryDisposition(category) {
  return {
    category,
    status: 'NOT_REVIEWED_NO_RESTRICTED_VALUES',
    receiptRefPresent: false,
    receiptSha256Present: false,
    provenanceRefPresent: false,
    custodyAssignmentPresent: false,
    independentReviewReceiptPresent: false,
    retentionDispositionPresent: false,
    immutableTargetRecheckPresent: false,
    digestRecomputed: false,
    provenanceMatched: false,
    custodyAccepted: false,
    accepted: false,
    rejectionReasonRef: null,
    reviewReceiptRef: null,
    reviewReceiptSha256: null,
  };
}

function disabledReviewDisposition() {
  const inherited = disabledIntake();
  const categories = Object.keys(inherited.intake.slots);
  return {
    ...inherited,
    bindingStatus: 'RECEIPT_INTAKE_REVIEW_DISPOSITION_UNBOUND_SOURCE_ONLY',
    sourceMergeCommit: SOURCE_MERGE_COMMIT,
    intakeReviewDisposition: {
      status: 'NO_RESTRICTED_VALUES_REVIEWED',
      templateOnly: true,
      restrictedValuesReviewed: false,
      restrictedStoreAccessed: false,
      reviewerDecision: 'UNDECIDED_NO_VALUES',
      reviewerCanAcceptWithoutValues: false,
      reviewerCanRejectWithoutValues: false,
      acceptanceBundleRef: null,
      acceptanceBundleSha256: null,
      rejectionBundleRef: null,
      rejectionBundleSha256: null,
      categoryDispositions: Object.fromEntries(categories.map(category => [category, emptyCategoryDisposition(category)])),
      custodyReview: {
        custodianIdentityRef: null,
        preparerIdentityRef: null,
        independentReviewerIdentityRef: null,
        deletionOwnerIdentityRef: null,
        identitySeparationReceiptRef: null,
        conflictReviewReceiptRef: null,
        identitySeparationVerified: false,
        conflictReviewComplete: false,
      },
      digestReview: {
        allCategoryDigestsPresent: false,
        allCategoryDigestsRecomputed: false,
        bundleDigestPresent: false,
        bundleDigestRecomputed: false,
        mismatchesResolved: false,
        validationReceiptRef: null,
        validationReceiptSha256: null,
      },
      immutableTargetReview: {
        candidateCommit: null,
        immutableDeploymentRef: null,
        sourceDigestReceiptRef: null,
        recheckReceiptRef: null,
        recheckReceiptSha256: null,
        recheckedAtUtc: null,
        targetAccepted: false,
      },
      retentionDispositionReview: {
        policyReceiptRef: null,
        deletionOwnerReceiptRef: null,
        deletionApprovalReceiptRef: null,
        dispositionReceiptRef: null,
        dispositionReceiptSha256: null,
        unresolvedDispositionBlocksUse: true,
        retentionAccepted: false,
      },
      nextPacketControls: {
        nonExecutableSealedCardMayBePrepared: false,
        executableCommandCardMayBeIssued: false,
        exactApprovalPhraseMayBeRequested: false,
        freshWindowMayBeBound: false,
        liveCollectionMayRun: false,
      },
    },
    futureHumanGate: {
      ...inherited.futureHumanGate,
      blockedUntilReceiptReviewDispositionAccepted: true,
      nextStep: 'Review this empty disposition template only. A later restricted review must bind actual receipt refs and digests before any sealed-card proposal.',
    },
  };
}

function checkDisabledReviewDisposition(input) {
  let ok = false;
  try { ok = plainData(input) && isDeepStrictEqual(input, disabledReviewDisposition()); } catch { /* sanitized */ }
  return {
    ...checkDisabledIntake(null),
    ok,
    receiptIngestionImplemented: false,
    restrictedValuesLoaded: false,
    restrictedValuesReviewed: false,
    intakeAccepted: false,
    executableCommandCardIssued: false,
    liveCollectionAuthorized: false,
    runtimeActivationAuthorized: false,
    restrictedReceiptCreationAuthorized: false,
    restrictedReceiptCollectionAuthorized: false,
    restrictedReceiptInstallationAuthorized: false,
    restrictedReceiptUseAuthorized: false,
    code: ok ? 'DISABLED_RECEIPT_INTAKE_REVIEW_DISPOSITION_ONLY'
      : 'INVALID_DISABLED_RECEIPT_INTAKE_REVIEW_DISPOSITION',
  };
}

module.exports = { SOURCE_MERGE_COMMIT, disabledReviewDisposition, checkDisabledReviewDisposition };
