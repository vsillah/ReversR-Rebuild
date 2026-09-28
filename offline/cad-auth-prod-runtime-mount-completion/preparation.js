// Source-only production executable runtime mount completion.
// No provider calls, credentials, runtime activation, command-card issuance or request-body IO.
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../cad-auth-prod-opening-prep/preparation');

const BASE_MAIN_COMMIT = '9197f09e3d9966672f362ae17dcbf6439e6e232a';
const COMPLETION_BRANCH = 'codex/cad-auth-prod-runtime-mount-completion';
const BOOTSTRAP_BINDING_REPAIR_PACKET_SHA256 =
  'ed60db97a2cfc0c8ce37a417347a7c19f67adbcbeb4388dd327dd5183860dd77';
const PREVIOUS_EXECUTABLE_COMMAND_CARD_REBIND_PACKET_SHA256 =
  '8412b6d4495bf0dc852e3b3875497f839b01529825c7d22171814ee107eb67c1';
const PREVIOUS_DIGEST_REFRESH_SHA256 =
  'b3e3f9e5dde4c907d90ca12420d39034da5e5a3ebbb6fd89df9c1f3f192ccb24';
const BOUNDED_SESSION_REF = 'rrb-ref:cad-upload-internal-mark-test-session-v1';
const INTERNAL_COHORT_REF = 'rrb-ref:cad-upload-internal-mark-test-cohort-v1';
const PRODUCTION_ORIGIN = 'https://reversr.vercel.app';
const PRODUCTION_ROUTE = 'POST /api/cad/user-import';

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

function exactLiveOpeningApprovalPhrase({
  runtimeMountCompletionPacketSha256 = '<runtimeMountCompletionPacketSha256>',
  runtimeMountCompletionSourceCommit = '<runtimeMountCompletionSourceCommit>',
  postMergeDigestRefreshSha256 = '<postMergeDigestRefreshSha256>',
  currentProductionDeploymentReference = '<currentProductionDeploymentReference>',
  executableCommandCardSha256 = '<executableCommandCardSha256>',
  durableEvidenceDigest = '<durableEvidenceDigest>',
  startUtc = '<startUtc>',
  expiresUtc = '<expiresUtc>',
} = {}) {
  return `I approve one bounded internal production upload-admission opening for ReversR CAD user-import, bound to source-only production executable runtime mount completion packet ${runtimeMountCompletionPacketSha256} at source commit ${runtimeMountCompletionSourceCommit}, executable production bootstrap binding repair packet ${BOOTSTRAP_BINDING_REPAIR_PACKET_SHA256}, source-only/no-live post-merge executable command-card digest refresh SHA-256 ${postMergeDigestRefreshSha256}, previous executable command-card rebind packet ${PREVIOUS_EXECUTABLE_COMMAND_CARD_REBIND_PACKET_SHA256}, previous executable digest refresh ${PREVIOUS_DIGEST_REFRESH_SHA256}, bounded session binding ${BOUNDED_SESSION_REF}, cohort ${INTERNAL_COHORT_REF}, durable evidence digest ${durableEvidenceDigest}, and production deployment reference ${currentProductionDeploymentReference}. Scope: against ${PRODUCTION_ORIGIN} ${PRODUCTION_ROUTE}, for cohort ${INTERNAL_COHORT_REF}, starting ${startUtc} and expiring ${expiresUtc}; issue and use only one bounded executable command-card with SHA-256 ${executableCommandCardSha256} for admission-only body validation for public, synthetic, or explicitly authorized internal tester CAD; one concurrent session; one upload attempt; independent expiry checks before every effect; atomic durable run and attempt claims; stop on unknown outcome; rollback immediately after the window; and run post-rollback fail-closed smoke before cleanup. No conversion, Sandbox dispatch, private CAD, real-user commercialization, external messages, provider/env/resource/billing changes, second live run, retry, or commercial-readiness claim.`;
}

function runtimeMountCompletionPreparation() {
  return {
    schemaVersion: 1,
    packet: 'cad-auth-prod-runtime-mount-completion-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_PRODUCTION_EXECUTABLE_RUNTIME_MOUNT_COMPLETION_READY_PRODUCTION_CLOSED',
    baseMainCommit: BASE_MAIN_COMMIT,
    branch: COMPLETION_BRANCH,
    parent: {
      bootstrapBindingRepairPacketSha256: BOOTSTRAP_BINDING_REPAIR_PACKET_SHA256,
      previousExecutableCommandCardRebindPacketSha256: PREVIOUS_EXECUTABLE_COMMAND_CARD_REBIND_PACKET_SHA256,
      previousDigestRefreshSha256: PREVIOUS_DIGEST_REFRESH_SHA256,
    },
    productionMount: {
      serverEntryPath: 'server/index.js',
      mountHelperPath: 'server/cadProductionExecutableRuntimeMountCompletion.js',
      routerPath: 'server/cadUserUploadRouter.js',
      bootstrapPath: 'server/cadLiveOpeningExecutableRuntimeBootstrap.js',
      wiringPath: 'server/cadLiveOpeningExecutableRuntimeWiring.js',
      serverMountsBeforeGeneralBodyParser: true,
      serverUsesReviewedMountHelper: true,
      serverDefaultCallSuppliesNoExecutableRuntime: true,
      helperCreatesReviewedBootstrapMount: true,
      helperPassesLiveOpeningRuntimeMountIntoRouter: true,
      helperAcceptsExactExecutableRuntimeBindingForLaterGate: true,
      exactCommandCardSha256BindingStillRequired: true,
      currentDeploymentReferenceRecheckStillRequired: true,
      boundedSessionRefStillRequired: true,
      durableAdapterInterfaceStillRequired: true,
      oneSessionOneAttemptFenceStillRequired: true,
      independentExpiryChecksStillRequired: true,
      rollbackFirstControlsStillRequired: true,
      postRollbackFailClosedSmokeStillRequired: true,
      noEnvironmentRuntimeSwitch: true,
      bodyAdmissionLiteralRemainsFalse: true,
      requestBodyValidationStillAfterRouteBodyGate: true,
      defaultProductionBehaviorClosed: true,
    },
    boundedSessionBinding: {
      sessionRef: BOUNDED_SESSION_REF,
      cohortRef: INTERNAL_COHORT_REF,
      exactSessionBindingStillRequiredAtLiveGate: true,
      missingExactBoundedSessionStops: true,
    },
    nextGate: {
      liveOpeningAuthorizedByThisGate: false,
      requiresFreshPostMergeProductionDeploymentRebind: true,
      requiresFreshExecutableCommandCardSha256: true,
      requiresFreshDurableEvidenceDigest: true,
      requiresExactBoundedSessionBinding: true,
      approvalPhraseTemplate: exactLiveOpeningApprovalPhrase(),
      unresolvedFields: [
        'runtimeMountCompletionPacketSha256',
        'runtimeMountCompletionSourceCommit',
        'postMergeDigestRefreshSha256',
        'currentProductionDeploymentReference',
        'executableCommandCardSha256',
        'durableEvidenceDigest',
        'startUtc',
        'expiresUtc',
      ],
    },
    controls: CLOSED_CONTROLS,
  };
}

function checkRuntimeMountCompletionPreparation(input) {
  let ok = false;
  try {
    ok = Boolean(input && typeof input === 'object' && !Array.isArray(input)
      && plainContractData(input)
      && isDeepStrictEqual(input, runtimeMountCompletionPreparation()));
  } catch {
    // Sanitized fail-closed response.
  }
  return {
    ...CLOSED_CONTROLS,
    ok,
    code: ok ? 'PRODUCTION_EXECUTABLE_RUNTIME_MOUNT_COMPLETION_PREPARATION_VALID'
      : 'PRODUCTION_EXECUTABLE_RUNTIME_MOUNT_COMPLETION_PREPARATION_BLOCKED',
  };
}

module.exports = {
  BASE_MAIN_COMMIT,
  COMPLETION_BRANCH,
  BOOTSTRAP_BINDING_REPAIR_PACKET_SHA256,
  PREVIOUS_EXECUTABLE_COMMAND_CARD_REBIND_PACKET_SHA256,
  PREVIOUS_DIGEST_REFRESH_SHA256,
  BOUNDED_SESSION_REF,
  INTERNAL_COHORT_REF,
  PRODUCTION_ORIGIN,
  PRODUCTION_ROUTE,
  CLOSED_CONTROLS,
  exactLiveOpeningApprovalPhrase,
  runtimeMountCompletionPreparation,
  checkRuntimeMountCompletionPreparation,
};
