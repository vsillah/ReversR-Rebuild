// Source-only stop-disposition repair contract. No private review or receipt IO.
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../cad-auth-command-card-source/preparation');
const {
  recoveryPreparation,
  checkRecoveryPreparation,
} = require('../cad-auth-receipt-provenance-gap-recovery/preparation');

const SOURCE_MERGE_COMMIT = '9fbb305deaf662da006fad8940403845c6c9d993';
const STOPPED_REVIEW = Object.freeze({
  ref: 'rrb-ref:cad-auth-private-evidence-provenance-review-20260925T170602Z',
  sha256: 'b580a7ee7368f98dedeea2f5251752bbae7751bea544a0f94d7ef7305dff2747',
  receiptSha256: 'f9398433f67e097c6de36453db3b6d348cf616056e7844a4bc6c7d83de81606b',
  status: 'STOPPED_SOURCE_ARTIFACT_MISMATCH',
  scheduleRef: 'rrb-ref:cad-auth-private-evidence-provenance-schedule-20260925T170602Z',
  scheduleSha256: '421394b9d45264001041f22d7af674cec171e94c7c96a212588ad7afa73c0b31',
});

const REPAIR_FIELDS = Object.freeze({
  'durableConsumedRunLedger.atomicConsumeReceiptRef': {
    currentProblem: 'MISSING_FIELD_TO_ARTIFACT_PROVENANCE',
    repairedSourceArtifactKind: 'durable-run-ledger-atomic-consumption-qualification-receipt',
    requiredSourceArtifact: 'Approved atomic-consumption qualification receipt for the durable consumed-run ledger, binding ledger identity, immutable target, reviewed ledger implementation, single-consumption behavior, reviewer receipt and approval receipt.',
  },
  'installedRouteBodyObserver.platformBufferingReceiptRef': {
    currentProblem: 'MISSING_FIELD_TO_ARTIFACT_PROVENANCE',
    repairedSourceArtifactKind: 'installed-route-body-observer-platform-buffering-review-receipt',
    requiredSourceArtifact: 'Approved platform-buffering review receipt for the installed route-body observer, binding exact route, immutable deployment, pre-handler buffering coverage, reviewer receipt and approval receipt.',
  },
});
const REPAIR_FIELD_MAP = Object.freeze(Object.fromEntries(Object.keys(REPAIR_FIELDS).map(field => [field, true])));

const CLOSED_BOUNDARIES = 'No private receipt reads or discovery, secrets or secret reads, private values or paths, provider/env/resource/billing changes, receipt creation or supply, source-set generation, public projection release, upload-session issuance, production upload activation, request-body admission/read, conversion, Sandbox dispatch, private CAD payload use, live evidence collection, runtime activation, executable command-card issuance, external messages, retry, second private review, real-user commercialization, or commercial-readiness claim.';

function reviewPhraseTemplate() {
  return `I approve one bounded private CAD Auth provenance schedule repair for ReversR-Rebuild, bound to source-only repair packet <repairPacketSha256> at source commit <reviewedSourceCommit>, stopped review ${STOPPED_REVIEW.ref}, review SHA-256 ${STOPPED_REVIEW.sha256}, review receipt SHA-256 ${STOPPED_REVIEW.receiptSha256}, stopped status ${STOPPED_REVIEW.status}, original schedule ${STOPPED_REVIEW.scheduleRef}, and original schedule SHA-256 ${STOPPED_REVIEW.scheduleSha256}. Scope: read only the named original private schedule and previously approved secret-free source artifacts named by that schedule, repair only the scheduled source-artifact mappings for durableConsumedRunLedger.atomicConsumeReceiptRef and installedRouteBodyObserver.platformBufferingReceiptRef, bind prior-evidence approval receipts and independent-review receipts for all 22 unsupported fields, write the repaired private schedule to <repairedScheduleRef> with digest <repairedScheduleSha256>, and return the next exact private evidence-provenance review approval phrase. Stop if any field lacks field-to-artifact provenance, prior-evidence approval, independent-review receipt, target/source/time coherence, reviewer independence, retention/deletion disposition, or any need for runtime credentials/provider configuration. ${CLOSED_BOUNDARIES}`;
}

function buildFieldRequirements() {
  const prior = recoveryPreparation();
  return Object.fromEntries(Object.entries(prior.missingFields).map(([id, field]) => {
    const repair = REPAIR_FIELDS[id] || null;
    return [id, {
      category: field.category,
      field: field.field,
      receiptFile: field.receiptFile,
      sourceSystem: field.sourceSystem,
      status: repair ? 'SCHEDULE_MAPPING_REPAIR_REQUIRED' : 'PRIOR_APPROVAL_AND_REVIEW_RECEIPTS_REQUIRED',
      priorRequiredSourceArtifactDescription: field.requiredSourceArtifact.description,
      scheduledSourceArtifactMapping: repair ? {
        repairRequired: true,
        currentReviewProblem: repair.currentProblem,
        repairedSourceArtifactKind: repair.repairedSourceArtifactKind,
        repairedRequiredSourceArtifact: repair.requiredSourceArtifact,
      } : {
        repairRequired: false,
        currentReviewProblem: null,
        repairedSourceArtifactKind: null,
        repairedRequiredSourceArtifact: field.requiredSourceArtifact.description,
      },
      requiredReceipts: {
        priorEvidenceApprovalReceiptRef: null,
        independentReviewReceiptRef: null,
        sourceArtifactSha256: null,
        sourceArtifactByteCount: null,
        targetSourceTimeCoherenceReceiptRef: null,
        reviewerIndependenceReceiptRef: null,
      },
      acceptanceRequirements: {
        fieldAppearsExactlyOnceInRepairedSchedule: true,
        sourceArtifactRefMustBeOpaque: true,
        sourceArtifactDigestMustBeSha256: true,
        priorEvidenceApprovalMustPredateReview: true,
        independentReviewMustBindFieldAndSourceArtifactDigest: true,
        reviewerMustBeDistinctFromCustodian: true,
        targetSourceAndTimeMustAgree: true,
        privateValuesPathsAndKeyListingsRemainExcluded: true,
        unresolvedRequirementStopsWholeReview: true,
      },
      accepted: false,
    }];
  }));
}

function stopRepairPreparation() {
  const prior = recoveryPreparation();
  const fieldRequirements = buildFieldRequirements();
  return {
    schemaVersion: 1,
    plan: 'cad-auth-provenance-review-stop-repair-v1',
    sourceOnly: true,
    sourceMergeCommit: SOURCE_MERGE_COMMIT,
    stoppedReview: {
      ...STOPPED_REVIEW,
      privateReviewBytesRead: false,
      privateReviewReceiptBytesRead: false,
      privateScheduleBytesRead: false,
      stoppedDispositionBoundByOpaqueRefAndDigestOnly: true,
      previousReviewReusable: false,
      secondPrivateReviewAuthorized: false,
    },
    parentRecovery: {
      packet: 'cad-auth-receipt-provenance-gap-recovery-v1',
      unsupportedFields: prior.coverage.unsupportedFields,
      supportedPresenceOnlyField: `${prior.supportedField.category}.${prior.supportedField.field}`,
      supportedPresenceOnlyFieldAccepted: false,
    },
    reviewStopDisposition: {
      status: STOPPED_REVIEW.status,
      fieldToArtifactProvenanceComplete: false,
      fieldsMissingFieldToArtifactProvenance: { ...REPAIR_FIELD_MAP },
      allFieldsMissingPriorEvidenceApprovalReceipts: true,
      allFieldsMissingIndependentReviewReceipts: true,
      acceptedFields: 0,
      acceptedCategories: 0,
      stopPreserved: true,
    },
    scheduleRepairContract: {
      repairedScheduleRequired: true,
      repairedScheduleRef: null,
      repairedScheduleSha256: null,
      repairedScheduleMustBind: {
        stoppedReviewRef: STOPPED_REVIEW.ref,
        stoppedReviewSha256: STOPPED_REVIEW.sha256,
        stoppedReviewReceiptSha256: STOPPED_REVIEW.receiptSha256,
        originalScheduleRef: STOPPED_REVIEW.scheduleRef,
        originalScheduleSha256: STOPPED_REVIEW.scheduleSha256,
        sourceRepairPacketSha256: null,
        reviewedSourceCommit: null,
      },
      exactFieldCount: Object.keys(fieldRequirements).length,
      repairFields: { ...REPAIR_FIELD_MAP },
      allUnsupportedFieldsRequirePriorEvidenceApproval: true,
      allUnsupportedFieldsRequireIndependentReviewReceipt: true,
      scheduleRepairIsNotEvidenceAcceptance: true,
      scheduleRepairIsNotReceiptSupply: true,
      scheduleRepairIsNotSecondPrivateReview: true,
    },
    fieldRequirements,
    futureApprovalGate: {
      authorized: false,
      exactPhraseTemplate: reviewPhraseTemplate(),
      phraseFields: {
        repairPacketSha256: null,
        reviewedSourceCommit: null,
        repairedScheduleRef: null,
        repairedScheduleSha256: null,
      },
      outputMustBePrivateIgnoredScheduleOnly: true,
      publicProjectionReleaseRequiresSeparateApproval: true,
      futurePrivateEvidenceReviewRequiresSeparateApproval: true,
      unresolvedPlaceholdersAreNotApproval: true,
    },
    stopConditions: {
      sourceArtifactMappingStillMissing: true,
      priorEvidenceApprovalMissing: true,
      independentReviewReceiptMissing: true,
      reviewerNotIndependent: true,
      staleOrMismatchedEvidence: true,
      unknownOutcome: true,
      failingCheck: true,
      runtimeCredentialsOrProviderConfigurationNeeded: true,
      secretOrPrivateValueWouldBeReadOutsideApprovedScheduleRepair: true,
    },
    controls: {
      privateReceiptReadAuthorized: false,
      privateReceiptDiscoveryAuthorized: false,
      secretReadAuthorized: false,
      receiptCreationAuthorized: false,
      receiptSupplyAuthorized: false,
      sourceSetGenerationAuthorized: false,
      publicProjectionReleaseAuthorized: false,
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
      secondPrivateReviewAuthorized: false,
      evidenceAccepted: false,
      commercialReadinessClaimed: false,
    },
  };
}

function checkStopRepairPreparation(input) {
  let ok = false;
  try {
    ok = checkRecoveryPreparation(recoveryPreparation()).ok
      && plainData(input)
      && isDeepStrictEqual(input, stopRepairPreparation());
  } catch { /* sanitized */ }
  return {
    ...stopRepairPreparation().controls,
    ok,
    code: ok ? 'SOURCE_ONLY_PROVENANCE_REVIEW_STOP_REPAIR_VALID'
      : 'INVALID_SOURCE_ONLY_PROVENANCE_REVIEW_STOP_REPAIR',
  };
}

module.exports = {
  SOURCE_MERGE_COMMIT,
  STOPPED_REVIEW,
  REPAIR_FIELDS,
  stopRepairPreparation,
  checkStopRepairPreparation,
};
