// Source-only runtime mount preparation. No live activation, sessions or body IO.
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../cad-auth-prod-opening-prep/preparation');
const {
  liveOpeningCommandCardDigestPreparation,
} = require('../cad-auth-live-opening-command-card-digest-prep/preparation');
const {
  EFFECT_ORDER,
  REQUIRED_PRECHECKS,
  PRODUCTION_ORIGIN,
  PRODUCTION_ROUTE,
  INTERNAL_COHORT_REF,
} = require('../../server/cadLiveOpeningRuntimeMount');

const SOURCE_COMMIT = '430087d915b4282d524cb82afde90285b1853a33';
const COMMAND_CARD_DIGEST_PREP_PACKET_SHA256 =
  '53aab3bab61f99b8d995236096440ae838f706c25e5e9cf4bb30639faf5bad81';
const DURABLE_ADAPTER_EVIDENCE_PACKET_SHA256 =
  'c857f4fd982dbdfb113450920e88f25841f5e21b25f9ed515232d1b49b9420ce';
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

function liveOpeningRuntimeMountPreparation() {
  const digestPrep = liveOpeningCommandCardDigestPreparation();
  return {
    schemaVersion: 1,
    packet: 'cad-auth-live-opening-runtime-mount-prep-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_LIVE_OPENING_RUNTIME_MOUNT_PREP_DISABLED_BY_DEFAULT',
    sourceCommit: SOURCE_COMMIT,
    parentPackets: {
      commandCardDigestPrepPacketSha256: COMMAND_CARD_DIGEST_PREP_PACKET_SHA256,
      durableAdapterEvidenceCommandCardReviewPacketSha256: DURABLE_ADAPTER_EVIDENCE_PACKET_SHA256,
    },
    parentCommandCardDigest: {
      sha256: digestPrep.commandCardDigest.sha256,
      sourceCommit: digestPrep.sourceCommit,
      productionDeploymentReference: digestPrep.commandCardDigest.draft.productionDeploymentReference,
      proposedOpeningWindow: digestPrep.proposedOpeningWindow,
      currentGateDoesNotOpenWindow: true,
    },
    routeWiring: {
      routeSource: 'server/cadUserUploadRouter.js',
      mountSource: 'server/cadLiveOpeningRuntimeMount.js',
      routeMountedBeforeGeneralBodyParser: true,
      admissionSwitchConsultedBeforeRequestBodyValidation: true,
      literalBodyAdmissionGateRemainsFalse: true,
      defaultRuntimeMountEnabled: false,
      defaultDecisionAlwaysDisabled: true,
      unsafeAdapterGrantOverridden: true,
      baseAdmissionSwitchStillObserved: true,
    },
    bindingRequirements: {
      productionOrigin: PRODUCTION_ORIGIN,
      productionRoute: PRODUCTION_ROUTE,
      cohortRef: INTERNAL_COHORT_REF,
      requiredPrechecks: REQUIRED_PRECHECKS,
      effectOrder: EFFECT_ORDER,
      exactCommandCardSha256Required: true,
      immutableCurrentDeploymentRecheckRequired: true,
      staleCommittedDeploymentReferenceStops: true,
      sourceCommittedDeploymentReferenceCannotGrantLiveUse: true,
      oneSessionOneAttemptDurableFenceRequired: true,
      independentExpiryCheckBeforeEveryEffectRequired: true,
      rollbackFirstControlsRequired: true,
      postRollbackFailClosedSmokeRequired: true,
      observerMustRemainZeroUntilAdmissionGate: true,
    },
    evidenceSummary: {
      runtimeMountSourcePrepared: true,
      routeImportPrepared: true,
      defaultFailClosed: true,
      bodyAdmissionStillSourceClosed: true,
      commandCardBindingReviewImplemented: true,
      currentDeploymentRecheckModeled: true,
      effectsExecuted: 0,
      privateValuesProjected: false,
      privatePathsProjected: false,
      keyListingsProjected: false,
    },
    stopConditions: {
      failingCheck: true,
      failingSmoke: true,
      unknownOutcome: true,
      missingDurableAdapterEvidence: true,
      staleDeploymentBinding: true,
      commandCardDigestMismatch: true,
      immutableTargetRecheckMissing: true,
      oneSessionOneAttemptFenceMissing: true,
      independentExpiryEvidenceMissing: true,
      rollbackSmokeEvidenceMissing: true,
      observerUnavailable: true,
      credentialOrProviderConfigurationNeeded: true,
      secretOrPrivateValueWouldBeRead: true,
    },
    nextGate: {
      authorized: false,
      gate: 'bounded-live-opening-current-deployment-recheck-and-executable-command-card-issuance',
      exactApprovalPhraseNeeded: true,
      mustBindFreshCurrentProductionDeployment: true,
      mustBindCommandCardSha256: true,
      mustBindWindowInsideApprovalText: true,
      mustBindPostRollbackFailClosedSmokePlan: true,
      unresolvedPlaceholdersAreNotApproval: true,
    },
    controls: {
      ...ZERO_ACTIONS,
      sourceOnlyRuntimeMountPreparationAuthorized: true,
      disabledRouteWiringAuthorized: true,
      cleanupAuthorized: false,
    },
  };
}

function checkLiveOpeningRuntimeMountPreparation(input) {
  let ok = false;
  try {
    ok = plainContractData(input) && isDeepStrictEqual(input, liveOpeningRuntimeMountPreparation());
  } catch {
    // Return a closed result without reflecting input.
  }
  return {
    ...liveOpeningRuntimeMountPreparation().controls,
    ok,
    code: ok ? 'SOURCE_ONLY_LIVE_OPENING_RUNTIME_MOUNT_PREP_VALID'
      : 'INVALID_LIVE_OPENING_RUNTIME_MOUNT_PREP',
  };
}

module.exports = {
  SOURCE_COMMIT,
  COMMAND_CARD_DIGEST_PREP_PACKET_SHA256,
  DURABLE_ADAPTER_EVIDENCE_PACKET_SHA256,
  ZERO_ACTIONS,
  liveOpeningRuntimeMountPreparation,
  checkLiveOpeningRuntimeMountPreparation,
};
