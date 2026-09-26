// Source-only command-card digest preparation. No live issuance, provider calls or body IO.
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../cad-auth-prod-opening-prep/preparation');
const {
  DURABLE_ADAPTER_PACKET_SHA256,
  PRODUCTION_DEPLOYMENT_REF,
  NEXT_PHRASE_FIELDS,
  commandCardDigestRequirements,
  nextLiveOpeningApprovalPhraseTemplate,
  durableEvidenceCommandCardReview,
  checkDurableEvidenceCommandCardReview,
} = require('../cad-auth-durable-adapter-evidence-command-card-review/preparation');
const {
  PRODUCTION_TARGET_ORIGIN,
  PRODUCTION_UPLOAD_ROUTE,
  INTERNAL_TEST_COHORT_REF,
  SOURCE_SET_PROJECTION_PACKET_SHA256,
} = require('../cad-auth-upload-admission-readiness-rollup/preparation');
const {
  ACCEPTED_PROVENANCE_PACKET_SHA256,
  SOURCE_SET_SHA256,
  SOURCE_SET_RUN_ID,
} = require('../cad-auth-restricted-source-set-projection/preparation');

const SOURCE_COMMIT = '268257b527fe807be78bdbc0a0be35f74c8bbc9a';
const EVIDENCE_PACKET_SHA256 = 'c857f4fd982dbdfb113450920e88f25841f5e21b25f9ed515232d1b49b9420ce';
const UPLOAD_READINESS_ROLLUP_PACKET_SHA256 =
  '9c85cdef9841a16f8400e1ba960c16cbbc3e83e6d63130324287266733dc204b';
const PROPOSED_START_UTC = '2026-09-26T21:00:00Z';
const PROPOSED_EXPIRES_UTC = '2026-09-26T21:30:00Z';
const ZERO_ACTIONS = Object.freeze({
  providerEnvResourceBillingChangeAuthorized: false,
  secretReadAuthorized: false,
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
  secondLiveRunAuthorized: false,
  realUserCommercializationAuthorized: false,
  commercialReadinessClaimed: false,
  effectsExecuted: 0,
});

const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function proposedOpeningWindow() {
  return {
    startUtc: PROPOSED_START_UTC,
    expiresUtc: PROPOSED_EXPIRES_UTC,
    durationMinutes: 30,
    startInclusiveExpiryExclusive: true,
    currentGateDoesNotOpenWindow: true,
    laterApprovalMustRepeatWindow: true,
  };
}

function commandCardDigestDraft() {
  return {
    schemaVersion: 1,
    artifact: 'cad-auth-live-opening-command-card-digest-draft-v1',
    sourceOnly: true,
    executable: false,
    issued: false,
    authorizedForLiveUse: false,
    productionUploadAdmissionActivated: false,
    uploadSessionIssuanceEnabled: false,
    requestBodyAdmissionReadAuthorized: false,
    sourceCommit: SOURCE_COMMIT,
    evidencePacketSha256: EVIDENCE_PACKET_SHA256,
    durableAdapterPacketSha256: DURABLE_ADAPTER_PACKET_SHA256,
    uploadReadinessRollupPacketSha256: UPLOAD_READINESS_ROLLUP_PACKET_SHA256,
    coherentRestrictedSourceSetProjectionPacketSha256: SOURCE_SET_PROJECTION_PACKET_SHA256,
    acceptedProvenanceProjectionPacketSha256: ACCEPTED_PROVENANCE_PACKET_SHA256,
    privateRestrictedSourceSetSha256: SOURCE_SET_SHA256,
    restrictedSourceSetRunId: SOURCE_SET_RUN_ID,
    productionDeploymentReference: PRODUCTION_DEPLOYMENT_REF,
    productionOrigin: PRODUCTION_TARGET_ORIGIN,
    productionRoute: PRODUCTION_UPLOAD_ROUTE,
    cohortRef: INTERNAL_TEST_COHORT_REF,
    openingWindow: proposedOpeningWindow(),
    ceilings: {
      concurrentSessions: 1,
      uploadAttempts: 1,
      retries: 0,
      secondLiveRuns: 0,
      cadPayloadBodyReadsAuthorizedByThisGate: 0,
      conversions: 0,
      sandboxDispatches: 0,
    },
    requiredPrechecks: [
      'freshApprovalReviewReceipt',
      'immutableTargetReceipt',
      'closedBaselineReceipt',
      'adapterSourceReviewReceipt',
      'independentExpiryReceipt',
      'atomicLedgerReceipt',
      'sessionAdmissionReceipt',
      'rollbackSmokeReceipt',
    ],
    liveExecutionControls: {
      independentExpiryCheckBeforeEveryEffect: true,
      atomicDurableRunClaimRequired: true,
      atomicDurableAttemptClaimRequired: true,
      rollbackImmediatelyAfterWindow: true,
      postRollbackFailClosedSmokeRequired: true,
      unknownOutcomeStopsWithoutRetry: true,
    },
    commandMaterial: {
      commandLine: null,
      dryRunCommandLine: null,
      executableCommandCard: null,
      runtimeCredentialSource: null,
      providerMutation: null,
      bodyRead: null,
    },
  };
}

function commandCardSha256() {
  return sha(commandCardDigestDraft());
}

function exactLiveOpeningApprovalPhrase() {
  const replacements = {
    evidencePacketSha256: EVIDENCE_PACKET_SHA256,
    evidenceSourceCommit: SOURCE_COMMIT,
    startUtc: PROPOSED_START_UTC,
    expiresUtc: PROPOSED_EXPIRES_UTC,
    commandCardSha256: commandCardSha256(),
  };
  return NEXT_PHRASE_FIELDS.reduce(
    (phrase, field) => phrase.replaceAll(`<${field}>`, replacements[field]),
    nextLiveOpeningApprovalPhraseTemplate(),
  );
}

function liveOpeningCommandCardDigestPreparation() {
  const parent = durableEvidenceCommandCardReview();
  const digestRequirements = commandCardDigestRequirements();
  const cardDraft = commandCardDigestDraft();
  const cardSha = commandCardSha256();
  return {
    schemaVersion: 1,
    packet: 'cad-auth-live-opening-command-card-digest-prep-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_LIVE_OPENING_COMMAND_CARD_DIGEST_PREP_NO_ISSUANCE',
    sourceCommit: SOURCE_COMMIT,
    parentPackets: {
      durableAdapterEvidenceCommandCardReviewPacketSha256: EVIDENCE_PACKET_SHA256,
      durableAdapterPacketSha256: DURABLE_ADAPTER_PACKET_SHA256,
      uploadReadinessRollupPacketSha256: UPLOAD_READINESS_ROLLUP_PACKET_SHA256,
      coherentRestrictedSourceSetProjectionPacketSha256: SOURCE_SET_PROJECTION_PACKET_SHA256,
      acceptedProvenanceProjectionPacketSha256: ACCEPTED_PROVENANCE_PACKET_SHA256,
    },
    parentEvidenceReview: {
      packet: parent.packet,
      status: parent.status,
      allControlsClosed: parent.evidenceSummary.allControlsClosed,
      categoryCount: parent.evidenceSummary.categoryCount,
      closedRouteCaseCount: parent.evidenceSummary.closedRouteCaseCount,
      observerDeltaTotal: parent.evidenceSummary.observerDeltaTotal,
      sourceCommit: parent.sourceCommit,
    },
    proposedOpeningWindow: proposedOpeningWindow(),
    commandCardDigest: {
      algorithm: 'SHA-256',
      canonicalEncoding: 'JSON.stringify over cad-auth-live-opening-command-card-digest-draft-v1',
      sha256: cardSha,
      draft: cardDraft,
      digestResolved: true,
      liveCommandCardIssuedByThisGate: false,
      executableCommandCardPreparedForLiveExecution: false,
    },
    digestRequirements: {
      ...digestRequirements,
      commandCardIssuedByThisGate: false,
      executableCommandCardPreparedForLiveExecution: false,
      requiredFutureBindingKeys: digestRequirements.requiredFutureBindingKeys,
    },
    evidenceSummary: {
      exactWindowProposed: true,
      commandCardSha256Resolved: true,
      unresolvedPlaceholderCount: 0,
      parentEvidenceCategoriesBound: parent.evidenceSummary.categoryCount,
      sourceOnlyCategoriesBound: 4,
      allControlsClosed: true,
      privateValuesProjected: false,
      privatePathsProjected: false,
      keyListingsProjected: false,
    },
    stopConditions: {
      failingCheck: true,
      failingSmoke: true,
      unknownOutcome: true,
      missingAdapterEvidence: true,
      unresolvedCommandCardDigest: true,
      missingUtcWindow: true,
      deploymentTargetDrift: true,
      durableAdapterEvidencePacketDigestMismatch: true,
      durableAdapterPacketDigestMismatch: true,
      independentExpiryEvidenceMissing: true,
      durableLedgerEvidenceMissing: true,
      postRollbackSmokeEvidenceMissing: true,
      observerUnavailable: true,
      credentialOrProviderConfigurationNeeded: true,
      secretOrPrivateValueWouldBeRead: true,
    },
    nextLiveOpeningGate: {
      authorized: false,
      exactPhrase: exactLiveOpeningApprovalPhrase(),
      phraseFields: {
        evidencePacketSha256: EVIDENCE_PACKET_SHA256,
        evidenceSourceCommit: SOURCE_COMMIT,
        startUtc: PROPOSED_START_UTC,
        expiresUtc: PROPOSED_EXPIRES_UTC,
        commandCardSha256: cardSha,
      },
      liveOpeningRequiresSeparateApproval: true,
      executableCommandCardIssuanceRequiresSeparateApproval: true,
      uploadSessionIssuanceRequiresSeparateApproval: true,
      requestBodyAdmissionReadRequiresSeparateApproval: true,
      runtimeActivationRequiresSeparateApproval: true,
      unresolvedPlaceholdersAreNotApproval: true,
    },
    controls: {
      ...ZERO_ACTIONS,
      sourceOnlyCommandCardDigestPreparationAuthorized: true,
      exactWindowProposalAuthorized: true,
      commandCardSha256ComputationAuthorized: true,
      cleanupAuthorized: false,
    },
  };
}

function checkLiveOpeningCommandCardDigestPreparation(input) {
  let ok = false;
  try {
    ok = plainContractData(input) && isDeepStrictEqual(input, liveOpeningCommandCardDigestPreparation())
      && checkDurableEvidenceCommandCardReview(durableEvidenceCommandCardReview()).ok;
  } catch { /* sanitized */ }
  return {
    ...liveOpeningCommandCardDigestPreparation().controls,
    ok,
    code: ok ? 'SOURCE_ONLY_LIVE_OPENING_COMMAND_CARD_DIGEST_PREP_VALID'
      : 'INVALID_LIVE_OPENING_COMMAND_CARD_DIGEST_PREP',
  };
}

module.exports = {
  SOURCE_COMMIT,
  EVIDENCE_PACKET_SHA256,
  DURABLE_ADAPTER_PACKET_SHA256,
  PRODUCTION_DEPLOYMENT_REF,
  PROPOSED_START_UTC,
  PROPOSED_EXPIRES_UTC,
  ZERO_ACTIONS,
  proposedOpeningWindow,
  commandCardDigestDraft,
  commandCardSha256,
  exactLiveOpeningApprovalPhrase,
  liveOpeningCommandCardDigestPreparation,
  checkLiveOpeningCommandCardDigestPreparation,
};
