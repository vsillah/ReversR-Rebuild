// Source-only requirements. No receipt reads, producer calls or execution.
const { isDeepStrictEqual } = require('node:util');
const { RECEIPT_FIELDS, plainData } = require('../cad-auth-command-card-source/preparation');
const { sourceSetContract } = require('../cad-auth-restricted-source-set-contract/preparation');

const ARTIFACTS = {
  concreteProviderRuntimeBinding: 'Reviewed adapter source plus installed-runtime and provider-binding receipts for the same immutable target.',
  executableCollectorCommand: 'Independent source review and disabled-card digest binding; no command bytes or executable card.',
  restrictedSyntheticCohortReceipt: 'Restricted synthetic cohort membership and ownership receipts; no private CAD or real-user cohort.',
  custodyReviewerReceipt: 'Distinct custodian and independent reviewer receipts bound to a restricted store and retention/deletion disposition.',
  durableConsumedRunLedger: 'Durable ledger receipt proving atomic consumption and consumption on stop or unknown outcome.',
  installedRouteBodyObserver: 'Installed observer receipt proving earliest-boundary ordering and platform buffering behavior with zero pre-admission body reads.',
  lateGrantObserver: 'Installed observer receipt proving denial after grant change on the same reviewed target.',
  immutableTargetRecheckReceipt: 'Fresh candidate commit, immutable deployment, source digest and UTC recheck receipt matching every category.',
};
function requiredFields(names) {
  return Object.fromEntries(names.map(name => [name, { required: true, value: null }]));
}
function gate(scope, names) {
  return { scope, approved: false, executable: false, automaticPromotion: false,
    requiredFields: requiredFields(['approvalReceiptRef', 'approverRef', 'exactScope',
      'candidateCommit', 'immutableDeploymentRef', 'expiresAtUtc', ...names]) };
}
function gapClosurePlan() {
  const contract = sourceSetContract();
  return {
    schemaVersion: 1, sourceOnly: true,
    status: 'AWAITING_SEPARATE_RECEIPT_PROVENANCE_APPROVAL',
    baseline: { provenance: 'SANITIZED_CAPTAIN_HANDOFF_NOT_RECOLLECTED',
      fullCategoryMatches: 0, requiredCategories: 8,
      partialFieldCoverage: { concreteProviderRuntimeBinding: { adapterSourceSha256: true } },
      partialCoverageIsReceiptAcceptance: false, privateSourcesReadByThisGate: 0 },
    categories: Object.fromEntries(Object.keys(RECEIPT_FIELDS).map(category => [category, {
      status: 'MISSING_COMPLETE_RECEIPT', missingArtifactContract: ARTIFACTS[category],
      requiredPublicFieldNames: requiredFields(RECEIPT_FIELDS[category]),
      acceptanceContract: contract.requiredCategories[category],
      producer: 'SEPARATELY_APPROVED_RESTRICTED_EVIDENCE_OWNER',
      sourceOnlyPreparationCanProduceReceipt: false,
      nextGate: 'receiptProvenance',
    }])),
    provenance: { permittedInputs: 'TRACKED_PUBLIC_SOURCE_CONTRACTS_AND_SANITIZED_HANDOFF_ONLY',
      rawValuesAllowed: false, localPrivatePathsAllowed: false, topLevelKeyListingsAllowed: false,
      secretsAllowed: false, syntheticFixturesAreLiveEvidence: false,
      fieldPresenceProvesSemantics: false,
      futureProjection: 'OPAQUE_REF_SHA256_BYTE_COUNT_FIELD_PRESENCE_DISPOSITION_ONLY',
      coherenceRules: contract.coherenceRules },
    futureGates: {
      receiptProvenance: gate('Approve a named receipt owner and artifact plan; any production or retrieval action needs an explicit separate scope.',
        ['categoryScope', 'producerReviewRef', 'artifactProvenanceRef', 'restrictedDestinationRef',
          'custodianRef', 'independentReviewerRef', 'retentionDeletionDispositionRef', 'allowedActions', 'forbiddenActions']),
      privateAssembly: gate('Approve one named coherent source set for one local assembly; stop on incomplete coverage.',
        ['namedSourceRef', 'eightCategoryInventoryRef', 'generatorSourceSha256', 'outputPolicyRef', 'oneAttemptLimit']),
      sanitizedReview: gate('Approve reading one named projection and committing only sanitized metadata; no sealed or executable card.',
        ['namedProjectionRef', 'projectionSha256', 'independentReviewRef', 'publicProjectionAllowlistRef']),
      liveProposal: gate('A separately reviewed future proposal must precede any live action; this plan grants none.',
        ['acceptedEightCategoryReceiptSetRef', 'reviewedDisabledCardDigest', 'durableLedgerRef',
          'freshTargetRecheckRef', 'windowStartUtc', 'windowEndUtc', 'enforcedCostCapRef',
          'stopRollbackRef', 'allowedActions', 'forbiddenActions', 'singleRunLimit', 'noRetryOrSecondRun']),
    },
    stopConditions: requiredFields([
      'missingOrAmbiguousApproval', 'missingCategoryOrRequiredField', 'partialCoverageOnly',
      'duplicateCategoryOrPathLikeRef', 'digestMismatchOrSourceDrift', 'staleOrMixedTarget',
      'sameCustodianAndReviewer', 'missingRetentionDeletionDisposition',
      'missingDurableAtomicStopUnknownConsumption', 'missingEarliestBoundaryOrBufferingProof',
      'missingLateGrantDenialProof', 'malformedOrSymlinkedSource',
      'privateValueOrPathDisclosure', 'scopeExpansionOrExpiredWindow', 'stopOrUnknownOutcome',
    ]),
    controls: { ...contract.controls, privateReceiptReadAuthorized: false,
      providerEnvResourceBillingChangesAuthorized: false, secretsReadAuthorized: false,
      privateCadPayloadUseAuthorized: false, productionUploadActivationAuthorized: false,
      externalMessagesAuthorized: false, evidenceAccepted: false, coherentPrivateSourceSetAccepted: false },
  };
}
function checkGapClosurePlan(input) {
  let ok = false;
  try { ok = plainData(input) && isDeepStrictEqual(input, gapClosurePlan()); } catch { /* sanitized */ }
  return { ...gapClosurePlan().controls, ok,
    code: ok ? 'SOURCE_ONLY_GAP_CLOSURE_PLAN_VALID' : 'INVALID_SOURCE_ONLY_GAP_CLOSURE_PLAN' };
}
module.exports = { gapClosurePlan, checkGapClosurePlan };
