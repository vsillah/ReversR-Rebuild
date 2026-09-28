// Source-only current-deployment command-card rebind. No live issuance, provider calls or body IO.
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
  commandCardDigestDraft: priorCommandCardDigestDraft,
  liveOpeningCommandCardDigestPreparation,
} = require('../cad-auth-live-opening-command-card-digest-prep/preparation');
const {
  liveOpeningRuntimeMountPreparation,
} = require('../cad-auth-live-opening-runtime-mount-prep/preparation');
const {
  reviewRuntimeMountBinding,
  EFFECT_ORDER,
  REQUIRED_PRECHECKS,
} = require('../../server/cadLiveOpeningRuntimeMount');

const SOURCE_COMMIT = 'e5e23453852720532b09fcfc1b5c603a1265c816';
const RUNTIME_MOUNT_PREP_PACKET_SHA256 =
  '89003dd7abe901e10ec4658572bcb28d2b37379aa64dd92d33428c1a8cdecb2c';
const PRIOR_COMMAND_CARD_DIGEST_PREP_PACKET_SHA256 =
  'a151bc0681e6e6497c32086d04dc58f7b82ab4b97171530e08a35978db588513';
const DURABLE_ADAPTER_EVIDENCE_PACKET_SHA256 =
  'c857f4fd982dbdfb113450920e88f25841f5e21b25f9ed515232d1b49b9420ce';
const UPLOAD_READINESS_ROLLUP_PACKET_SHA256 =
  '9c85cdef9841a16f8400e1ba960c16cbbc3e83e6d63130324287266733dc204b';
const CURRENT_PRODUCTION_DEPLOYMENT_REF =
  'https://vercel.com/vsillahs-projects/reversr/CyBjkXRmZsWuw3q4LS3gcnCweMRL';
const PROPOSED_START_UTC = '2026-09-27T18:00:00Z';
const PROPOSED_EXPIRES_UTC = '2026-09-27T18:30:00Z';
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

function currentDeploymentCommandCardDraft() {
  const priorDraft = priorCommandCardDigestDraft();
  return {
    ...priorDraft,
    sourceCommit: SOURCE_COMMIT,
    evidencePacketSha256: DURABLE_ADAPTER_EVIDENCE_PACKET_SHA256,
    runtimeMountPrepPacketSha256: RUNTIME_MOUNT_PREP_PACKET_SHA256,
    priorCommandCardDigestPrepPacketSha256: PRIOR_COMMAND_CARD_DIGEST_PREP_PACKET_SHA256,
    productionDeploymentReference: CURRENT_PRODUCTION_DEPLOYMENT_REF,
    openingWindow: proposedOpeningWindow(),
    rebind: {
      schemaVersion: 1,
      kind: 'current-production-deployment-command-card-rebind',
      priorProductionDeploymentReference: priorDraft.productionDeploymentReference,
      currentProductionDeploymentReference: CURRENT_PRODUCTION_DEPLOYMENT_REF,
      runtimeMountPrepPacketSha256: RUNTIME_MOUNT_PREP_PACKET_SHA256,
      priorCommandCardDigestPrepPacketSha256: PRIOR_COMMAND_CARD_DIGEST_PREP_PACKET_SHA256,
      sourceCommit: SOURCE_COMMIT,
      currentDeploymentFreshAtPreparationTime: true,
      immutableCurrentDeploymentRecheckRequiredAtLiveGate: true,
      sourceCommittedDeploymentReferenceCannotGrantLiveUse: true,
      staleDeploymentBindingStops: true,
      commandCardIssuedByThisGate: false,
      executableCommandCardPreparedForLiveExecution: false,
    },
  };
}

function currentDeploymentCommandCardSha256() {
  return sha(currentDeploymentCommandCardDraft());
}

function exactLiveOpeningApprovalPhrase() {
  return `I approve one bounded internal production upload-admission opening for ReversR CAD user-import, bound to source-only current-deployment command-card rebind packet <currentDeploymentRebindPacketSha256> at source commit <currentDeploymentRebindSourceCommit>, live-opening runtime mount prep packet ${RUNTIME_MOUNT_PREP_PACKET_SHA256}, prior command-card digest prep packet ${PRIOR_COMMAND_CARD_DIGEST_PREP_PACKET_SHA256}, durable adapter evidence command-card review packet ${DURABLE_ADAPTER_EVIDENCE_PACKET_SHA256}, durable adapter packet ${DURABLE_ADAPTER_PACKET_SHA256}, production deployment reference ${CURRENT_PRODUCTION_DEPLOYMENT_REF}, source-only upload-admission readiness rollup packet ${UPLOAD_READINESS_ROLLUP_PACKET_SHA256}, coherent restricted source-set projection packet ${SOURCE_SET_PROJECTION_PACKET_SHA256}, private restricted source-set SHA-256 ${SOURCE_SET_SHA256}, run id ${SOURCE_SET_RUN_ID}, and accepted provenance projection packet ${ACCEPTED_PROVENANCE_PACKET_SHA256}. Scope: against ${PRODUCTION_TARGET_ORIGIN} ${PRODUCTION_UPLOAD_ROUTE}, for cohort ${INTERNAL_TEST_COHORT_REF}, starting ${PROPOSED_START_UTC} and expiring ${PROPOSED_EXPIRES_UTC}; issue and use only one bounded executable command-card with SHA-256 ${currentDeploymentCommandCardSha256()} for admission-only body validation for public, synthetic, or explicitly authorized internal tester CAD; one concurrent session; one upload attempt; independent expiry checks before every effect; atomic durable run and attempt claims; stop on unknown outcome; rollback immediately after the window; and run post-rollback fail-closed smoke before cleanup. No conversion, Sandbox dispatch, private CAD, real-user commercialization, external messages, provider/env/resource/billing changes, second run, retry, or commercial-readiness claim.`;
}

function currentDeploymentRebindPreparation() {
  const priorDigest = liveOpeningCommandCardDigestPreparation();
  const runtimeMount = liveOpeningRuntimeMountPreparation();
  const draft = currentDeploymentCommandCardDraft();
  const cardSha = currentDeploymentCommandCardSha256();
  const runtimeBinding = reviewRuntimeMountBinding({
    commandCardDraft: draft,
    commandCardSha256: cardSha,
    currentDeploymentReference: CURRENT_PRODUCTION_DEPLOYMENT_REF,
  });
  return {
    schemaVersion: 1,
    packet: 'cad-auth-live-opening-current-deployment-rebind-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_CURRENT_DEPLOYMENT_COMMAND_CARD_REBIND_NO_RUNTIME_EFFECTS',
    sourceCommit: SOURCE_COMMIT,
    parentPackets: {
      runtimeMountPrepPacketSha256: RUNTIME_MOUNT_PREP_PACKET_SHA256,
      priorCommandCardDigestPrepPacketSha256: PRIOR_COMMAND_CARD_DIGEST_PREP_PACKET_SHA256,
      durableAdapterEvidenceCommandCardReviewPacketSha256: DURABLE_ADAPTER_EVIDENCE_PACKET_SHA256,
      durableAdapterPacketSha256: DURABLE_ADAPTER_PACKET_SHA256,
      uploadReadinessRollupPacketSha256: UPLOAD_READINESS_ROLLUP_PACKET_SHA256,
      coherentRestrictedSourceSetProjectionPacketSha256: SOURCE_SET_PROJECTION_PACKET_SHA256,
      acceptedProvenanceProjectionPacketSha256: ACCEPTED_PROVENANCE_PACKET_SHA256,
    },
    parentRuntimeMount: {
      packet: runtimeMount.packet,
      status: runtimeMount.status,
      defaultRuntimeMountEnabled: runtimeMount.routeWiring.defaultRuntimeMountEnabled,
      defaultDecisionAlwaysDisabled: runtimeMount.routeWiring.defaultDecisionAlwaysDisabled,
      literalBodyAdmissionGateRemainsFalse: runtimeMount.routeWiring.literalBodyAdmissionGateRemainsFalse,
      sourceCommittedDeploymentReferenceCannotGrantLiveUse:
        runtimeMount.bindingRequirements.sourceCommittedDeploymentReferenceCannotGrantLiveUse,
      immutableCurrentDeploymentRecheckRequired:
        runtimeMount.bindingRequirements.immutableCurrentDeploymentRecheckRequired,
      currentGateDoesNotOpenWindow: true,
    },
    priorCommandCardDigest: {
      packet: priorDigest.packet,
      status: priorDigest.status,
      sha256: priorDigest.commandCardDigest.sha256,
      sourceCommit: priorDigest.sourceCommit,
      productionDeploymentReference: priorDigest.commandCardDigest.draft.productionDeploymentReference,
      proposedOpeningWindow: priorDigest.proposedOpeningWindow,
      supersededForCurrentDeploymentByThisPacket: true,
    },
    currentDeploymentBinding: {
      currentProductionDeploymentReference: CURRENT_PRODUCTION_DEPLOYMENT_REF,
      productionOrigin: PRODUCTION_TARGET_ORIGIN,
      productionRoute: PRODUCTION_UPLOAD_ROUTE,
      cohortRef: INTERNAL_TEST_COHORT_REF,
      sourceCommit: SOURCE_COMMIT,
      currentDeploymentFreshAtPreparationTime: true,
      immutableCurrentDeploymentRecheckRequiredAtLiveGate: true,
      deploymentReferenceMustBeRepeatedInLiveApproval: true,
      staleDeploymentBindingStops: true,
    },
    proposedOpeningWindow: proposedOpeningWindow(),
    commandCardDigest: {
      algorithm: 'SHA-256',
      canonicalEncoding: 'JSON.stringify over cad-auth-live-opening-command-card-digest-draft-v1 with current deployment rebind',
      sha256: cardSha,
      draft,
      digestResolved: true,
      liveCommandCardIssuedByThisGate: false,
      executableCommandCardPreparedForLiveExecution: false,
    },
    runtimeMountBindingReview: {
      bindingAccepted: runtimeBinding.bindingAccepted,
      ok: runtimeBinding.ok,
      code: runtimeBinding.code,
      commandCardSha256: runtimeBinding.commandCardSha256,
      currentDeploymentRechecked: runtimeBinding.currentDeploymentRechecked,
      oneSessionOneAttemptFenceRequired: runtimeBinding.oneSessionOneAttemptFenceRequired,
      independentExpiryBeforeEveryEffectRequired: runtimeBinding.independentExpiryBeforeEveryEffectRequired,
      rollbackFirstControlsRequired: runtimeBinding.rollbackFirstControlsRequired,
      postRollbackFailClosedSmokeRequired: runtimeBinding.postRollbackFailClosedSmokeRequired,
      effectOrder: runtimeBinding.effectOrder,
    },
    bindingRequirements: {
      requiredPrechecks: REQUIRED_PRECHECKS,
      effectOrder: EFFECT_ORDER,
      exactCommandCardSha256Required: true,
      immutableCurrentDeploymentRecheckRequired: true,
      staleCommittedDeploymentReferenceStops: true,
      oneSessionOneAttemptDurableFenceRequired: true,
      independentExpiryCheckBeforeEveryEffectRequired: true,
      rollbackImmediatelyAfterWindow: true,
      postRollbackFailClosedSmokeRequired: true,
    },
    evidenceSummary: {
      currentProductionDeploymentBound: true,
      priorStaleDeploymentSuperseded: true,
      exactWindowProposed: true,
      commandCardSha256Resolved: true,
      runtimeBindingAcceptedWhileDisabled: runtimeBinding.bindingAccepted === true && runtimeBinding.ok === false,
      runtimeMountStillDisabled: runtimeBinding.code === 'LIVE_OPENING_RUNTIME_MOUNT_DISABLED',
      unresolvedPlaceholderCount: 2,
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
      oneSessionOneAttemptFenceMissing: true,
      independentExpiryEvidenceMissing: true,
      durableLedgerEvidenceMissing: true,
      postRollbackSmokeEvidenceMissing: true,
      observerUnavailable: true,
      credentialOrProviderConfigurationNeeded: true,
      secretOrPrivateValueWouldBeRead: true,
    },
    nextLiveOpeningGate: {
      authorized: false,
      exactPhraseTemplate: exactLiveOpeningApprovalPhrase(),
      unresolvedFields: [
        'currentDeploymentRebindPacketSha256',
        'currentDeploymentRebindSourceCommit',
      ],
      phraseFields: {
        currentDeploymentRebindPacketSha256: null,
        currentDeploymentRebindSourceCommit: null,
        runtimeMountPrepPacketSha256: RUNTIME_MOUNT_PREP_PACKET_SHA256,
        priorCommandCardDigestPrepPacketSha256: PRIOR_COMMAND_CARD_DIGEST_PREP_PACKET_SHA256,
        durableAdapterEvidenceCommandCardReviewPacketSha256: DURABLE_ADAPTER_EVIDENCE_PACKET_SHA256,
        currentProductionDeploymentReference: CURRENT_PRODUCTION_DEPLOYMENT_REF,
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
      sourceOnlyCurrentDeploymentRebindAuthorized: true,
      exactWindowProposalAuthorized: true,
      commandCardSha256ComputationAuthorized: true,
      cleanupAuthorized: false,
    },
  };
}

function checkCurrentDeploymentRebindPreparation(input) {
  let ok = false;
  try {
    ok = plainContractData(input) && isDeepStrictEqual(input, currentDeploymentRebindPreparation());
  } catch {
    // Return a closed result without reflecting input.
  }
  return {
    ...currentDeploymentRebindPreparation().controls,
    ok,
    code: ok ? 'SOURCE_ONLY_CURRENT_DEPLOYMENT_REBIND_VALID'
      : 'INVALID_CURRENT_DEPLOYMENT_REBIND',
  };
}

module.exports = {
  SOURCE_COMMIT,
  RUNTIME_MOUNT_PREP_PACKET_SHA256,
  PRIOR_COMMAND_CARD_DIGEST_PREP_PACKET_SHA256,
  DURABLE_ADAPTER_EVIDENCE_PACKET_SHA256,
  CURRENT_PRODUCTION_DEPLOYMENT_REF,
  PROPOSED_START_UTC,
  PROPOSED_EXPIRES_UTC,
  ZERO_ACTIONS,
  proposedOpeningWindow,
  currentDeploymentCommandCardDraft,
  currentDeploymentCommandCardSha256,
  exactLiveOpeningApprovalPhrase,
  currentDeploymentRebindPreparation,
  checkCurrentDeploymentRebindPreparation,
};
