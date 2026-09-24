// Source-only rebind contract. No receipt I/O, command emission, or runtime activation.
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../cad-auth-command-card-source/preparation');
const { disabledBinding, checkDisabledBinding } = require('../cad-auth-receipt-custody-binding/preparation');

const SOURCE_MERGE_COMMIT = 'fb36a99bc6e0ba40551766bbb6558c7d044b13d7';

function disabledRebind() {
  return {
    ...disabledBinding(),
    bindingStatus: 'SEALED_CARD_CUSTODY_REBIND_UNBOUND_SOURCE_ONLY',
    sourceMergeCommit: SOURCE_MERGE_COMMIT,
    historicalSealedCardDisposition: {
      packet: 'cad-auth-live-evidence-sealed-card-prep-v1',
      mayInformRequirements: true,
      priorExactPhraseReusable: false,
      priorWindowReusable: false,
      priorDeploymentReusable: false,
      staleWindowStatus: 'EXPIRED_HISTORICAL_ONLY',
      oldApprovalTextMustNotBeCopied: true,
      oldSealDigestMustNotAuthorizeExecution: true,
    },
    freshCommandCardPrerequisites: {
      restrictedReceiptBundleRef: null,
      restrictedReceiptBundleSha256: null,
      custodyAcceptanceReceiptRef: null,
      independentReviewerReceiptRef: null,
      retentionDispositionReceiptRef: null,
      immutableTargetRecheckReceiptRef: null,
      sourceDigestReceiptRef: null,
      freshWindowReceiptRef: null,
      proposedStartsAtUtc: null,
      proposedExpiresAtUtc: null,
      scheduleSha256: null,
      limitsSha256: null,
      exactApprovalPhrase: null,
      executableCommandCardRef: null,
      allReceiptsReviewed: false,
      digestValidationComplete: false,
      identitySeparationVerified: false,
      deploymentTargetVerified: false,
      freshWindowBound: false,
      executableCommandCardIssued: false,
    },
    futureHumanGate: {
      required: true,
      approvalReceiptRef: null,
      exactPhrase: null,
      previousWindowReusable: false,
      previousExactPhraseReusable: false,
      automaticallyPromotable: false,
      blockedUntilRestrictedReceiptsReviewed: true,
      blockedUntilImmutableTargetRechecked: true,
      blockedUntilFreshUtcWindowAccepted: true,
      blockedUntilIndependentReviewerAccepts: true,
      nextStep: 'Prepare a separate restricted receipt bundle and then a fresh non-executable sealed card proposal; do not issue an executable card from this packet.',
    },
  };
}

function checkDisabledRebind(input) {
  let ok = false;
  try { ok = plainData(input) && isDeepStrictEqual(input, disabledRebind()); } catch { /* sanitized */ }
  return { ...checkDisabledBinding(null), ok,
    liveCollectionAuthorized: false,
    runtimeActivationAuthorized: false,
    executable: false,
    executableCommandCardIssued: false,
    restrictedReceiptCreationAuthorized: false,
    restrictedReceiptCollectionAuthorized: false,
    restrictedReceiptInstallationAuthorized: false,
    restrictedReceiptUseAuthorized: false,
    code: ok ? 'DISABLED_SEALED_CARD_CUSTODY_REBIND_ONLY' : 'INVALID_DISABLED_SEALED_CARD_CUSTODY_REBIND',
  };
}

module.exports = { SOURCE_MERGE_COMMIT, disabledRebind, checkDisabledRebind };
