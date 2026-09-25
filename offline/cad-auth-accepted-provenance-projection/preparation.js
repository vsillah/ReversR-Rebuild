// Source-only accepted provenance projection. No private review, receipt, or schedule IO.
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../cad-auth-command-card-source/preparation');

const SOURCE_MERGE_COMMIT = '5690e016163d916096a40a9a09204c57c5a541c5';

const ACCEPTED_REVIEW = Object.freeze({
  ref: 'rrb-ref:cad-auth-private-evidence-provenance-review-20260925T175957Z',
  sha256: 'b82710710dad2560c098e9e207af3b5beff5c9bb0223020ebf371b169abe2088',
  receiptSha256: 'e3687b11ea4d55f64d21b183c3abf46f88d8c56291b5ce93e4905ffec6d29fbd',
  disposition: 'ACCEPTED_PRIVATE_PROVENANCE_REVIEW',
});

const REPAIRED_SCHEDULE = Object.freeze({
  ref: 'rrb-ref:cad-auth-provenance-repaired-schedule-20260925T175957Z',
  sha256: 'fc8611568aaf7eaf48a132b274d748d931ebba81acf05ee2b7088376701f7bcb',
  repairedMappingsVerified: 2,
  repairedMappingsRequired: 2,
});

const RETENTION = Object.freeze({
  restrictedStoreRef: 'rrb-ref:cad-auth-provenance-review-store-20260925T170602Z',
  retentionDuration: 'P7D',
  expiresAtUtc: '2026-10-02T17:06:02Z',
  custodianRef: 'rrb-ref:cad-auth-evidence-custodian-captain-20260925T170602Z',
  independentReviewerRef: 'rrb-ref:cad-auth-evidence-independent-reviewer-20260925T170602Z',
  deletionOwnerRef: 'rrb-ref:cad-auth-evidence-custodian-captain-20260925T170602Z',
});

const CLOSED_BOUNDARIES = 'No provider/env/resource/billing changes, no secrets or secret reads, no private values or paths or key listings, no receipt creation or supply, no source-set generation, no public release beyond the sanitized source-only projection, no upload-session issuance, no production upload activation, no request-body admission/read, no conversion, no Sandbox dispatch, no private CAD payload use, no live evidence collection, no runtime activation, no executable command-card issuance, no external messages, no retry or additional review run, no real-user commercialization, and no commercial-readiness claim.';

function receiptSupplyPhraseTemplate() {
  return `I approve one bounded private CAD Auth eight-artifact receipt supply from the accepted provenance review for ReversR-Rebuild, bound to source-only accepted provenance projection packet <projectionPacketSha256> at source commit <reviewedSourceCommit>, private review ${ACCEPTED_REVIEW.ref} with review SHA-256 ${ACCEPTED_REVIEW.sha256}, review receipt SHA-256 ${ACCEPTED_REVIEW.receiptSha256}, repaired schedule ${REPAIRED_SCHEDULE.ref}, and repaired schedule SHA-256 ${REPAIRED_SCHEDULE.sha256}. Scope: read only the accepted private provenance review, its review receipt, and the repaired schedule named above; create only if supportable from that accepted provenance the eight dedicated JSON receipt artifacts with required public field names into ignored private receipt source folder <receiptSourceFolder>, run id <receiptRunId>; use only opaque refs, SHA-256 digests, byte counts, coverage counts, provenance/status markers, and retention/deletion disposition values for receipt fields; compute per-file SHA-256 digests, byte counts, and coverage status; and stop without substitution if any category or required field lacks accepted provenance, prior approval, independent review, target/source/time coherence, reviewer independence, or retention/deletion disposition. No discovery beyond the named accepted review, receipt, and repaired schedule; no secrets or secret reads; no private values or paths or key listings in public output; no provider/env/resource/billing changes; no source-set generation; no public projection release; no upload-session issuance; no production upload activation; no request-body admission/read; no conversion; no Sandbox dispatch; no private CAD payload use; no live evidence collection; no runtime activation; no executable command-card issuance; no external messages; no retry or additional review run; no real-user commercialization; and no commercial-readiness claim.`;
}

function acceptedProvenanceProjection() {
  return {
    schemaVersion: 1,
    projection: 'cad-auth-accepted-provenance-review-projection-v1',
    sourceOnly: true,
    sourceMergeCommit: SOURCE_MERGE_COMMIT,
    privateReviewProjection: {
      ...ACCEPTED_REVIEW,
      privateReviewBytesReadByThisPacket: false,
      privateReviewReceiptBytesReadByThisPacket: false,
      repairedScheduleBytesReadByThisPacket: false,
      dispositionProjectedByOpaqueRefAndDigestOnly: true,
      privateValuesProjected: false,
      privatePathsProjected: false,
      keyListingsProjected: false,
    },
    repairedScheduleProjection: {
      ...REPAIRED_SCHEDULE,
      repairedMappingVerificationStatus: 'VERIFIED_2_OF_2',
      durableConsumedRunLedgerAtomicConsumeReceiptRefRepaired: true,
      installedRouteBodyObserverPlatformBufferingReceiptRefRepaired: true,
      staleScheduleMappingAccepted: false,
    },
    provenanceCoverage: {
      requiredFieldCount: 22,
      acceptedFieldCount: 22,
      rejectedFieldCount: 0,
      unknownFieldCount: 0,
      acceptedFieldRatio: '22/22',
      acceptedStatus: 'ACCEPTED_22_OF_22',
      provenanceReviewComplete: true,
      provenanceReviewReusableWithoutSeparateReceiptSupplyApproval: false,
    },
    closedControlStatus: {
      allRuntimeControlsClosed: true,
      uploadControlsRemainClosed: true,
      requestBodyAdmissionReadRemainsClosed: true,
      runtimeActivationRemainsClosed: true,
      receiptSupplyRemainsUnapproved: true,
      sourceSetGenerationRemainsUnapproved: true,
      commercialReadinessRemainsUnclaimed: true,
    },
    retentionDeletionDisposition: {
      ...RETENTION,
      workingCopiesAndDerivativesRetainedInRestrictedStore: true,
      publicPacketContainsOnlyOpaqueRefsDigestsCountsAndStatuses: true,
      deletionRequiresSeparateRestrictedStoreDisposition: true,
    },
    nextReceiptSupplyGate: {
      authorized: false,
      exactPhraseTemplate: receiptSupplyPhraseTemplate(),
      phraseFields: {
        projectionPacketSha256: null,
        reviewedSourceCommit: null,
        receiptSourceFolder: null,
        receiptRunId: null,
      },
      receiptSupplyRequiresSeparatePrivateReadApproval: true,
      sourceSetGenerationRequiresSeparateApproval: true,
      productionUploadActivationRequiresSeparateApproval: true,
      unresolvedPlaceholdersAreNotApproval: true,
    },
    stopConditions: {
      acceptedReviewRefDigestMismatch: true,
      reviewReceiptDigestMismatch: true,
      repairedScheduleDigestMismatch: true,
      acceptedFieldCountNot22: true,
      repairedMappingVerificationNot2Of2: true,
      controlsNotClosed: true,
      retentionDeletionDispositionMissing: true,
      unknownOutcome: true,
      failingCheck: true,
      runtimeCredentialsOrProviderConfigurationNeeded: true,
      secretOrPrivateValueWouldBeRead: true,
    },
    controls: {
      privateReceiptReadAuthorized: false,
      privateReceiptDiscoveryAuthorized: false,
      secretReadAuthorized: false,
      privateValueDisclosureAuthorized: false,
      providerEnvResourceBillingChangeAuthorized: false,
      receiptCreationAuthorized: false,
      receiptSupplyAuthorized: false,
      sourceSetGenerationAuthorized: false,
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
      additionalReviewRunAuthorized: false,
      realUserCommercializationAuthorized: false,
      commercialReadinessClaimed: false,
    },
  };
}

function checkAcceptedProvenanceProjection(input) {
  let ok = false;
  try {
    ok = plainData(input) && isDeepStrictEqual(input, acceptedProvenanceProjection());
  } catch { /* sanitized */ }
  return {
    ...acceptedProvenanceProjection().controls,
    ok,
    code: ok ? 'SOURCE_ONLY_ACCEPTED_PROVENANCE_PROJECTION_VALID'
      : 'INVALID_SOURCE_ONLY_ACCEPTED_PROVENANCE_PROJECTION',
  };
}

module.exports = {
  SOURCE_MERGE_COMMIT,
  ACCEPTED_REVIEW,
  REPAIRED_SCHEDULE,
  RETENTION,
  acceptedProvenanceProjection,
  checkAcceptedProvenanceProjection,
};
