// Source-only executable command-card rebind preparation. No live issuance,
// provider calls, session issuance, runtime activation or request-body IO.
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../cad-auth-prod-opening-prep/preparation');
const {
  DURABLE_ADAPTER_PACKET_SHA256,
} = require('../cad-auth-durable-adapter-evidence-command-card-review/preparation');
const {
  SOURCE_SET_PROJECTION_PACKET_SHA256,
  PRODUCTION_TARGET_ORIGIN,
  PRODUCTION_UPLOAD_ROUTE,
  INTERNAL_TEST_COHORT_REF,
} = require('../cad-auth-upload-admission-readiness-rollup/preparation');
const {
  ACCEPTED_PROVENANCE_PACKET_SHA256,
  SOURCE_SET_SHA256,
  SOURCE_SET_RUN_ID,
} = require('../cad-auth-restricted-source-set-projection/preparation');
const {
  EXECUTABLE_COMMAND_CARD_ARTIFACT,
  RUN_FENCE_KEY,
  FORWARD_EFFECTS,
  CLEANUP_EFFECTS,
  METHODS,
  reviewExecutableCommandCardBinding,
} = require('../../server/cadLiveOpeningExecutableRuntimeWiring');

const SOURCE_COMMIT = 'f330ba5e934c28c05428ecd26cf4e04c58bbb790';
const EXECUTABLE_RUNTIME_WIRING_PACKET_SHA256 =
  'be6dfceec943ec31309fa942ed2b2aa9a76b73d62551a53b4b432a82b4a27fb8';
const CURRENT_DEPLOYMENT_REBIND_PACKET_SHA256 =
  '038b7ae04869095e01eda9f223d6ad51cc03845c00703ffeee4116c418840f6e';
const RUNTIME_ACTIVATION_PACKET_SHA256 =
  '1ea9aecd93d00abee4dca807c70c89c1900cde93c111e131a991777bce3a83f6';
const DURABLE_ADAPTER_EVIDENCE_PACKET_SHA256 =
  'c857f4fd982dbdfb113450920e88f25841f5e21b25f9ed515232d1b49b9420ce';
const UPLOAD_READINESS_ROLLUP_PACKET_SHA256 =
  '9c85cdef9841a16f8400e1ba960c16cbbc3e83e6d63130324287266733dc204b';
const CURRENT_PRODUCTION_DEPLOYMENT_REF =
  'https://vercel.com/vsillahs-projects/reversr/BsEHweLAyEPADhnTPkw6WsEsonJK';
const PROPOSED_START_UTC = '2026-09-28T04:30:00Z';
const PROPOSED_EXPIRES_UTC = '2026-09-28T05:00:00Z';
const BOUNDED_SESSION_REF = 'rrb-ref:cad-upload-internal-mark-test-session-v1';

const CLOSED_CONTROLS = Object.freeze({
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

const shaJson = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const shaBytes = value => createHash('sha256').update(value).digest('hex');

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

function durableEvidenceDigest() {
  return shaJson({
    schemaVersion: 1,
    kind: 'cad-auth-executable-command-card-durable-evidence-digest-draft',
    sourceCommit: SOURCE_COMMIT,
    executableRuntimeWiringPacketSha256: EXECUTABLE_RUNTIME_WIRING_PACKET_SHA256,
    runtimeActivationPacketSha256: RUNTIME_ACTIVATION_PACKET_SHA256,
    durableAdapterEvidenceCommandCardReviewPacketSha256: DURABLE_ADAPTER_EVIDENCE_PACKET_SHA256,
    durableAdapterPacketSha256: DURABLE_ADAPTER_PACKET_SHA256,
    uploadReadinessRollupPacketSha256: UPLOAD_READINESS_ROLLUP_PACKET_SHA256,
    coherentRestrictedSourceSetProjectionPacketSha256: SOURCE_SET_PROJECTION_PACKET_SHA256,
    privateRestrictedSourceSetSha256: SOURCE_SET_SHA256,
    restrictedSourceSetRunId: SOURCE_SET_RUN_ID,
    acceptedProvenanceProjectionPacketSha256: ACCEPTED_PROVENANCE_PACKET_SHA256,
    currentProductionDeploymentReference: CURRENT_PRODUCTION_DEPLOYMENT_REF,
    boundedSessionRef: BOUNDED_SESSION_REF,
    runFenceKey: RUN_FENCE_KEY,
  });
}

function executableCommandCardDraft() {
  return {
    schemaVersion: 1,
    artifact: EXECUTABLE_COMMAND_CARD_ARTIFACT,
    sourceOnly: false,
    executable: true,
    issued: true,
    authorizedForLiveUse: true,
    productionUploadAdmissionOpeningAuthorized: true,
    uploadSessionIssuanceEnabled: false,
    requestBodyAdmissionReadAuthorized: true,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    privateCadUseAuthorized: false,
    externalMessagesAuthorized: false,
    retryAuthorized: false,
    secondLiveRunAuthorized: false,
    sourceCommit: SOURCE_COMMIT,
    executableRuntimeWiringPacketSha256: EXECUTABLE_RUNTIME_WIRING_PACKET_SHA256,
    runtimeActivationPacketSha256: RUNTIME_ACTIVATION_PACKET_SHA256,
    currentDeploymentRebindPacketSha256: CURRENT_DEPLOYMENT_REBIND_PACKET_SHA256,
    durableAdapterEvidenceCommandCardReviewPacketSha256: DURABLE_ADAPTER_EVIDENCE_PACKET_SHA256,
    durableAdapterPacketSha256: DURABLE_ADAPTER_PACKET_SHA256,
    uploadReadinessRollupPacketSha256: UPLOAD_READINESS_ROLLUP_PACKET_SHA256,
    coherentRestrictedSourceSetProjectionPacketSha256: SOURCE_SET_PROJECTION_PACKET_SHA256,
    acceptedProvenanceProjectionPacketSha256: ACCEPTED_PROVENANCE_PACKET_SHA256,
    privateRestrictedSourceSetSha256: SOURCE_SET_SHA256,
    restrictedSourceSetRunId: SOURCE_SET_RUN_ID,
    productionDeploymentReference: CURRENT_PRODUCTION_DEPLOYMENT_REF,
    productionOrigin: PRODUCTION_TARGET_ORIGIN,
    productionRoute: PRODUCTION_UPLOAD_ROUTE,
    cohortRef: INTERNAL_TEST_COHORT_REF,
    sessionId: BOUNDED_SESSION_REF,
    durableEvidenceSha256: durableEvidenceDigest(),
    openingWindow: {
      startUtc: PROPOSED_START_UTC,
      expiresUtc: PROPOSED_EXPIRES_UTC,
      startInclusiveExpiryExclusive: true,
    },
    ceilings: {
      concurrentSessions: 1,
      uploadAttempts: 1,
      retries: 0,
      secondLiveRuns: 0,
    },
    liveExecutionControls: {
      independentExpiryCheckBeforeEveryEffect: true,
      atomicDurableRunClaimRequired: true,
      atomicDurableAttemptClaimRequired: true,
      rollbackImmediatelyAfterWindow: true,
      postRollbackFailClosedSmokeRequired: true,
      unknownOutcomeStopsWithoutRetry: true,
    },
  };
}

function executableCommandCardBytes() {
  return JSON.stringify(executableCommandCardDraft());
}

function executableCommandCardSha256() {
  return shaBytes(executableCommandCardBytes());
}

function exactLiveOpeningApprovalPhrase({
  packetSha256 = '<executableCommandCardRebindPacketSha256>',
  sourceCommit = '<executableCommandCardRebindSourceCommit>',
} = {}) {
  return `I approve one bounded internal production upload-admission opening for ReversR CAD user-import, bound to source-only/no-live executable runtime command-card rebind packet ${packetSha256} at source commit ${sourceCommit}, PR #433 executable runtime wiring packet ${EXECUTABLE_RUNTIME_WIRING_PACKET_SHA256}, runtime activation packet ${RUNTIME_ACTIVATION_PACKET_SHA256}, current-deployment rebind packet ${CURRENT_DEPLOYMENT_REBIND_PACKET_SHA256}, durable adapter evidence command-card review packet ${DURABLE_ADAPTER_EVIDENCE_PACKET_SHA256}, durable adapter packet ${DURABLE_ADAPTER_PACKET_SHA256}, production deployment reference ${CURRENT_PRODUCTION_DEPLOYMENT_REF}, source-only upload-admission readiness rollup packet ${UPLOAD_READINESS_ROLLUP_PACKET_SHA256}, coherent restricted source-set projection packet ${SOURCE_SET_PROJECTION_PACKET_SHA256}, private restricted source-set SHA-256 ${SOURCE_SET_SHA256}, run id ${SOURCE_SET_RUN_ID}, accepted provenance projection packet ${ACCEPTED_PROVENANCE_PACKET_SHA256}, bounded session binding ${BOUNDED_SESSION_REF}, and durable evidence digest ${durableEvidenceDigest()}. Scope: against ${PRODUCTION_TARGET_ORIGIN} ${PRODUCTION_UPLOAD_ROUTE}, for cohort ${INTERNAL_TEST_COHORT_REF}, starting ${PROPOSED_START_UTC} and expiring ${PROPOSED_EXPIRES_UTC}; issue and use only one bounded executable command-card with SHA-256 ${executableCommandCardSha256()} for admission-only body validation for public, synthetic, or explicitly authorized internal tester CAD; one concurrent session; one upload attempt; independent expiry checks before every effect; atomic durable run and attempt claims; stop on unknown outcome; rollback immediately after the window; and run post-rollback fail-closed smoke before cleanup. No conversion, Sandbox dispatch, private CAD, real-user commercialization, external messages, provider/env/resource/billing changes, second live run, retry, or commercial-readiness claim.`;
}

function executableCommandCardRebindPreparation() {
  const card = executableCommandCardDraft();
  const bytes = executableCommandCardBytes();
  const cardSha = executableCommandCardSha256();
  const binding = reviewExecutableCommandCardBinding({
    commandCardBytes: bytes,
    commandCardSha256: cardSha,
    currentDeploymentReference: CURRENT_PRODUCTION_DEPLOYMENT_REF,
  });
  return {
    schemaVersion: 1,
    packet: 'cad-auth-live-opening-executable-command-card-rebind-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_EXECUTABLE_COMMAND_CARD_REBIND_NO_LIVE_EFFECTS',
    sourceCommit: SOURCE_COMMIT,
    productionDeploymentReference: CURRENT_PRODUCTION_DEPLOYMENT_REF,
    parentPackets: {
      executableRuntimeWiringPacketSha256: EXECUTABLE_RUNTIME_WIRING_PACKET_SHA256,
      runtimeActivationPacketSha256: RUNTIME_ACTIVATION_PACKET_SHA256,
      currentDeploymentRebindPacketSha256: CURRENT_DEPLOYMENT_REBIND_PACKET_SHA256,
      durableAdapterEvidenceCommandCardReviewPacketSha256: DURABLE_ADAPTER_EVIDENCE_PACKET_SHA256,
      durableAdapterPacketSha256: DURABLE_ADAPTER_PACKET_SHA256,
      uploadReadinessRollupPacketSha256: UPLOAD_READINESS_ROLLUP_PACKET_SHA256,
      coherentRestrictedSourceSetProjectionPacketSha256: SOURCE_SET_PROJECTION_PACKET_SHA256,
      acceptedProvenanceProjectionPacketSha256: ACCEPTED_PROVENANCE_PACKET_SHA256,
    },
    proposedOpeningWindow: proposedOpeningWindow(),
    boundedSessionBinding: {
      sessionRef: BOUNDED_SESSION_REF,
      exactBindingRequiredAtLiveGate: true,
      uploadSessionIssuedByThisGate: false,
      staleOrMismatchedSessionStops: true,
    },
    durableEvidenceBinding: {
      sha256: durableEvidenceDigest(),
      derivedFromPublicSourceOnlyRefs: true,
      durableAdapterEvidenceStillRequiredAtLiveGate: true,
      missingDurableAdapterEvidenceStops: true,
    },
    executableCommandCardDigest: {
      algorithm: 'SHA-256',
      artifact: EXECUTABLE_COMMAND_CARD_ARTIFACT,
      canonicalEncoding: 'JSON.stringify over cad-auth-live-opening-executable-command-card-v1 draft bytes',
      sha256: cardSha,
      byteSha256: shaBytes(bytes),
      canonicalJsonSha256: shaJson(card),
      digestResolved: true,
      draftBytesPreparedForReview: true,
      executableCommandCardIssuedByThisGate: false,
      runtimeActivationAuthorizedByThisGate: false,
      requestBodyAdmissionReadAuthorizedByThisGate: false,
      commandCard: card,
    },
    runtimeBindingReview: {
      bindingAccepted: binding.bindingAccepted,
      ok: binding.ok,
      code: binding.code,
      commandCardSha256: binding.commandCardSha256,
      currentDeploymentRechecked: binding.currentDeploymentRechecked,
      oneSessionOneAttemptFenceRequired: binding.oneSessionOneAttemptFenceRequired,
      independentExpiryBeforeEveryEffectRequired: binding.independentExpiryBeforeEveryEffectRequired,
      rollbackFirstControlsRequired: binding.rollbackFirstControlsRequired,
      postRollbackFailClosedSmokeRequired: binding.postRollbackFailClosedSmokeRequired,
      runtimeStillDisabledByDefault: binding.code === 'EXECUTABLE_RUNTIME_WIRING_READY_DISABLED_BY_DEFAULT',
    },
    runtimeRequirements: {
      runFenceKey: RUN_FENCE_KEY,
      methods: METHODS,
      forwardEffects: FORWARD_EFFECTS,
      cleanupEffects: CLEANUP_EFFECTS,
      exactUtf8JsonSha256Required: true,
      canonicalJsonSha256MustMatch: true,
      immutableCurrentDeploymentRecheckRequired: true,
      oneSessionOneAttemptDurableFenceRequired: true,
      independentExpiryCheckBeforeEveryEffectRequired: true,
      rollbackImmediatelyAfterWindow: true,
      postRollbackFailClosedSmokeRequired: true,
    },
    evidenceSummary: {
      currentProductionDeploymentBound: true,
      executableRuntimeWiringPacketBound: true,
      exactBoundedSessionRefBound: true,
      exactWindowProposed: true,
      executableCommandCardSha256Resolved: true,
      runtimeBindingAcceptedWhileDisabled: binding.bindingAccepted === true && binding.ok === false,
      allControlsClosed: true,
      effectsExecuted: 0,
      privateValuesProjected: false,
      privatePathsProjected: false,
      keyListingsProjected: false,
    },
    stopConditions: {
      failingCheck: true,
      failingSmoke: true,
      unknownOutcome: true,
      staleDeploymentBinding: true,
      missingDurableAdapterEvidence: true,
      commandCardDigestMismatch: true,
      currentDeploymentRecheckMissing: true,
      exactBoundedSessionBindingMissing: true,
      oneSessionOneAttemptFenceMissing: true,
      independentExpiryEvidenceMissing: true,
      routeBodyObserverMissing: true,
      rollbackSmokeEvidenceMissing: true,
      runtimeCredentialsOrProviderConfigurationNeeded: true,
      secretOrPrivateValueWouldBeRead: true,
    },
    nextLiveOpeningGate: {
      authorized: false,
      exactPhraseTemplate: exactLiveOpeningApprovalPhrase(),
      unresolvedFields: [
        'executableCommandCardRebindPacketSha256',
        'executableCommandCardRebindSourceCommit',
      ],
      phraseFields: {
        executableCommandCardRebindPacketSha256: null,
        executableCommandCardRebindSourceCommit: null,
        productionDeploymentReference: CURRENT_PRODUCTION_DEPLOYMENT_REF,
        startUtc: PROPOSED_START_UTC,
        expiresUtc: PROPOSED_EXPIRES_UTC,
        boundedSessionRef: BOUNDED_SESSION_REF,
        durableEvidenceSha256: durableEvidenceDigest(),
        executableCommandCardSha256: cardSha,
      },
      liveOpeningRequiresSeparateApproval: true,
      executableCommandCardIssuanceRequiresSeparateApproval: true,
      uploadSessionIssuanceRequiresSeparateApproval: true,
      requestBodyAdmissionReadRequiresSeparateApproval: true,
      runtimeActivationRequiresSeparateApproval: true,
      unresolvedPlaceholdersAreNotApproval: true,
    },
    controls: {
      ...CLOSED_CONTROLS,
      sourceOnlyExecutableCommandCardRebindAuthorized: true,
      exactWindowProposalAuthorized: true,
      executableCommandCardSha256ComputationAuthorized: true,
      cleanupAuthorized: false,
    },
  };
}

function checkExecutableCommandCardRebindPreparation(input) {
  let ok = false;
  try {
    ok = plainContractData(input)
      && isDeepStrictEqual(input, executableCommandCardRebindPreparation());
  } catch {
    // Return a closed result without reflecting input.
  }
  return {
    ...executableCommandCardRebindPreparation().controls,
    ok,
    code: ok ? 'SOURCE_ONLY_EXECUTABLE_COMMAND_CARD_REBIND_VALID'
      : 'EXECUTABLE_COMMAND_CARD_REBIND_BLOCKED',
  };
}

module.exports = {
  SOURCE_COMMIT,
  EXECUTABLE_RUNTIME_WIRING_PACKET_SHA256,
  RUNTIME_ACTIVATION_PACKET_SHA256,
  CURRENT_DEPLOYMENT_REBIND_PACKET_SHA256,
  DURABLE_ADAPTER_EVIDENCE_PACKET_SHA256,
  CURRENT_PRODUCTION_DEPLOYMENT_REF,
  PROPOSED_START_UTC,
  PROPOSED_EXPIRES_UTC,
  BOUNDED_SESSION_REF,
  CLOSED_CONTROLS,
  proposedOpeningWindow,
  durableEvidenceDigest,
  executableCommandCardDraft,
  executableCommandCardBytes,
  executableCommandCardSha256,
  exactLiveOpeningApprovalPhrase,
  executableCommandCardRebindPreparation,
  checkExecutableCommandCardRebindPreparation,
};
