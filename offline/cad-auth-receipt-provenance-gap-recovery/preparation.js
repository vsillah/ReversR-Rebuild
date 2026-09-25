// Source-only provenance requirements; never accepts receipts or approval input.
const { isDeepStrictEqual } = require('node:util');
const { plainData, RECEIPT_FIELDS } = require('../cad-auth-command-card-source/preparation');
const { bundlePreparation } = require('../cad-auth-eight-artifact-supply-gate/preparation');
const { OBSERVED_GAP } = require('../cad-auth-restricted-receipt-gap-closure/preparation');

const ANCHORS = Object.freeze({
  mainCommit: 'cdfe042852eaa5393656aeec87aac630eaf47f47',
  supplyPacketSha256: '6c8078d324286af5560e99c5d0e632616d83867538cee65ca8645975e96cbdac',
  stopDispositionSha256: '6fbdb713768b16563a6bd0bf6557c79c4fc10217f809330bab49982f95f17157',
  supplyAttemptDispositionSha256: 'c3356c5457988de9926b11d663cb77a059104c757dce30c2633d6cb2fe98731d',
  artifactCreationAttemptDispositionSha256: '3ef1c42261cfbcdc2982bd30fa39273f6e3d037513af8575401fc04717c7d62e',
});

// Exact artifact contracts, not discovered record IDs or assertions of existence.
const ARTIFACTS = {
  concreteProviderRuntimeBinding: {
    installedRuntimeReceiptRef: 'Approved runtime installation receipt binding the installed adapter digest, immutable development target and installation timestamp.',
    providerBindingReceiptRef: 'Approved provider-to-runtime binding receipt for that same installed adapter and immutable development target; secret-free attestation only.',
  },
  executableCollectorCommand: {
    reviewedCollectorSourceSha256: 'Collector source review record containing the SHA-256 of the exact reviewed collector source bytes and reviewer attestation.',
    disabledCardDigest: 'Disabled command-card review record containing the SHA-256 of the reviewed disabled card bytes and explicit no-issuance status.',
    commandReviewReceiptRef: 'Independent command safety review receipt binding that collector source digest and disabled card digest to the approved scope.',
  },
  restrictedSyntheticCohortReceipt: {
    restrictedCohortReceiptRef: 'Restricted synthetic cohort registration receipt attesting the bounded synthetic-only cohort and its approved scope; identities stay private.',
    syntheticOwnershipReceiptRef: 'Synthetic cohort ownership attestation binding the same cohort to its accountable owner and permitted use.',
  },
  custodyReviewerReceipt: {
    custodianReceiptRef: 'Custody assignment attestation for the exact evidence set, assigning an accountable custodian and restricted access scope.',
    independentReviewerReceiptRef: 'Reviewer assignment and independence attestation for that same evidence set, naming a reviewer distinct from the custodian.',
    restrictedStoreReceiptRef: 'Restricted evidence-store attestation binding the evidence set to access controls, retention deadline and deletion owner.',
  },
  durableConsumedRunLedger: {
    ledgerReceiptRef: 'Prior durable run-ledger qualification receipt binding ledger identity, immutable development target and reviewed ledger implementation.',
    atomicConsumeReceiptRef: 'Prior atomic-consumption qualification receipt proving single-consumption semantics for that exact ledger implementation and target.',
    stopAndUnknownConsumeReceiptRef: 'Prior stop-and-unknown-outcome qualification receipt proving consumed status cannot reopen for stop or unknown outcomes on that ledger.',
  },
  installedRouteBodyObserver: {
    installedObserverReceiptRef: 'Route-body observer installation receipt binding observer digest, exact installed route and immutable development deployment.',
    earliestBoundaryReceiptRef: 'Route-boundary qualification receipt proving the installed observer covers the earliest request-body admission/read boundary on that route.',
    platformBufferingReceiptRef: 'Platform buffering review receipt attesting coverage of buffering before application handlers for that exact installed route and deployment.',
  },
  lateGrantObserver: {
    installedObserverReceiptRef: 'Late-grant observer installation receipt binding observer digest, grant boundary and immutable development deployment.',
    lateGrantDenialReceiptRef: 'Prior late-grant denial qualification receipt proving denial after the closed boundary for that exact installed observer and target.',
  },
  immutableTargetRecheckReceipt: {
    candidateCommit: 'Prior approved immutable-target recheck record containing the full candidate Git commit used for the same deployment and source digest binding.',
    immutableDeploymentRef: 'Prior approved immutable-target recheck record referencing the provider-issued immutable development deployment identity; a mutable slug is insufficient.',
    sourceDigestReceiptRef: 'Source-to-deployment provenance receipt referenced by that recheck, binding reviewed source digest and candidate commit to the immutable deployment.',
    recheckedAtUtc: 'Recorded UTC recheck timestamp in that same approved immutable-target recheck record, within its approved evidence freshness window.',
  },
};
const RESTRICTIONS = 'No discovery, secrets or secret reads, private values or paths or key listings in public output, provider/env/resource/billing changes, receipt creation or supply, source-set generation, public projection release, upload-session issuance, production upload activation, request-body admission/read, conversion, Sandbox dispatch, private CAD payload use, live evidence collection, runtime activation, executable command-card issuance, external messages, retry, second run, real-user commercialization, or commercial-readiness claim.';
const RETENTION = {
  restrictedStoreRef: null,
  retentionDuration: null,
  expiresAtUtc: null,
  deletionOwner: null,
  deletionVerificationReceiptRef: null,
  appliesTo: 'Approved working copies, provenance schedule, review notes and all private derivatives; original source-system retention remains separately governed.',
  boundary: 'Named ignored restricted store only, with least-privilege access for the named custodian and independent reviewer. Fix duration and UTC expiry before use; stop at expiry. Delete approved working copies and derivatives by that deadline, with deletion owner and verification recorded privately. No public projection release without separate approval; no deletion of original source-system records under this gate.',
};
function exactPhraseTemplate() {
  return `Approve one CAD Auth private evidence-provenance review for the 22 unsupported required receipt fields in recovery packet <recoveryPacketSha256> at source commit <reviewedSourceCommit>, bound to main ${ANCHORS.mainCommit}, supply packet ${ANCHORS.supplyPacketSha256}, stop disposition ${ANCHORS.stopDispositionSha256}, supply-attempt disposition ${ANCHORS.supplyAttemptDispositionSha256}, and artifact-creation-attempt disposition ${ANCHORS.artifactCreationAttemptDispositionSha256}. Read only existing previously approved secret-free source artifacts explicitly named in complete provenance schedule <provenanceScheduleRef> with digest <provenanceScheduleSha256>, coordinated by custodian <custodian> and independent reviewer <reviewer>, within <approvalWindowUtc>. Record a private provenance review in <restrictedStoreRef>, retain working copies and derivatives for <retentionDuration> until <expiresAtUtc>, with deletion owner <deletionOwner>. Verify field-to-artifact provenance, prior evidence approval, target/source/time coherence and independent review for every field; stop the whole review on any missing, stale, mismatched, unapproved or unknown evidence, failing check or need for runtime credentials/provider configuration. The existing adapterSourceSha256 presence record grants no installation or runtime acceptance. ${RESTRICTIONS}`;
}
function recoveryPreparation() {
  const parent = bundlePreparation();
  const missingFields = {};
  for (const [category, fields] of Object.entries(ARTIFACTS)) {
    const contract = parent.requiredCategories[category];
    for (const [field, artifact] of Object.entries(fields)) {
      const id = `${category}.${field}`;
      missingFields[id] = {
        category, field, receiptFile: contract.requiredReceiptFile,
        status: 'UNSUPPORTED_PROVENANCE_REQUIRED', accepted: false,
        sourceSystem: contract.sourceSystem,
        requiredSourceArtifact: { contractId: id, description: artifact, exactPrivateArtifactRef: null, sourceArtifactSha256: null, priorEvidenceApprovalRef: null, existenceVerified: false },
        custodianRole: contract.custodian, independentReviewerRole: contract.reviewer,
        custodian: null, independentReviewer: null,
        reviewRequirements: { reviewerDistinctFromCustodian: true, priorApprovalRequired: true, targetSourceAndTimeMustAgree: true, fixtureOrSourcePresenceIsNotInstalledEvidence: true, unresolvedReferenceStopsWholeReview: true },
        retention: structuredClone(RETENTION),
        futureApprovalPhrase: exactPhraseTemplate(),
        futureApprovalRequiresThisFieldInCompleteSchedule: true,
      };
    }
  }
  return {
    schemaVersion: 1, plan: 'cad-auth-receipt-provenance-gap-recovery-v1', sourceOnly: true,
    anchors: { ...ANCHORS },
    dispositionBinding: {
      source: 'Exact SHA-256 anchors supplied in the implementation brief; private disposition bytes were not read or independently rehashed.',
      privateDispositionContentsVerified: false,
      currentDisposition: 'STOP_PRESERVED_NO_PRIVATE_EVIDENCE_RECOVERY_EXECUTED',
      previousApprovalReusable: false, retryAllowed: false, secondRunAllowed: false,
    },
    coverage: { requiredFields: Object.values(RECEIPT_FIELDS).flat().length, supportedFields: 1, unsupportedFields: Object.keys(missingFields).length, acceptedCategories: 0 },
    supportedField: {
      category: 'concreteProviderRuntimeBinding', field: 'adapterSourceSha256',
      status: 'PRIOR_SOURCE_RECORD_FIELD_PRESENCE_ONLY',
      source: 'offline/cad-auth-restricted-receipt-gap-closure/preparation.js#OBSERVED_GAP.concreteProviderRuntimeBindingPartial.presentFields.adapterSourceSha256',
      recordedPresent: OBSERVED_GAP.concreteProviderRuntimeBindingPartial.presentFields.adapterSourceSha256,
      privateValue: null, privateValueRead: false, independentlyReverifiedNow: false,
      installedRuntimeProven: false, receiptAccepted: false,
    },
    missingFields,
    futureApprovalGate: {
      authorized: false, exactPhraseTemplate: exactPhraseTemplate(),
      phraseFields: { recoveryPacketSha256: null, reviewedSourceCommit: null, provenanceScheduleRef: null, provenanceScheduleSha256: null, custodian: null, reviewer: null, approvalWindowUtc: null, restrictedStoreRef: null, retentionDuration: null, expiresAtUtc: null, deletionOwner: null },
      scheduleRequirements: {
        exactFieldCount: 22, everyMissingFieldExactlyOnce: true,
        exactSecretFreeArtifactReferencesRequired: true, sourceArtifactDigestsRequired: true,
        priorEvidenceApprovalsRequired: true, namedRolesRequiredPerField: true,
        reviewerDistinctFromCustodianPerFieldAndBundle: true,
        retentionAndDeletionRequiredPerField: true,
        fixedUtcWindowAndFreshnessCriteriaRequired: true,
        completeScheduleDigestBoundToPacketAndSourceCommit: true,
        schedulePreparationCannotDiscoverOrReadPrivateSourcesWithoutSeparateApproval: true,
        sameSourceArtifactMaySupportMultipleFieldsOnlyWithExplicitFieldMapping: true,
      },
      unresolvedPlaceholdersAreNotApproval: true, templateIsNotExecutableOrAuthorization: true,
      approvalParserImplemented: false, privateReaderImplemented: false,
      priorSupplyOrCreationApprovalReusable: false,
      missingEvidenceRequiresSeparateProposal: true,
      receiptSupplyAndSourceSetReadRequireSeparateGates: true,
      publicProjectionReleaseRequiresSeparateApproval: true,
    },
    stopConditions: {
      ...parent.stopConditions,
      anyUnsupportedFieldUnmapped: true, missingExactSourceArtifactOrPriorApproval: true,
      failingCheck: true, unknownOutcome: true, runtimeCredentialsOrProviderConfigurationNeeded: true,
      secretContainingArtifact: true, originalSourceDeletionNeeded: true,
    },
    controls: { ...parent.controls, privateEvidenceProvenanceReviewAuthorized: false, secretsRead: false, evidenceAccepted: false, privateEvidenceProvenanceRecovered: false },
  };
}
function checkRecoveryPreparation(input) {
  let ok = false;
  try { ok = plainData(input) && isDeepStrictEqual(input, recoveryPreparation()); } catch { /* sanitized */ }
  return { ...recoveryPreparation().controls, ok,
    code: ok ? 'SOURCE_ONLY_RECEIPT_PROVENANCE_RECOVERY_VALID' : 'INVALID_SOURCE_ONLY_RECEIPT_PROVENANCE_RECOVERY' };
}
module.exports = { ANCHORS, recoveryPreparation, checkRecoveryPreparation };
