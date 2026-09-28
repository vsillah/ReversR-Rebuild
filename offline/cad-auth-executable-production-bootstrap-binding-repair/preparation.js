// Source-only executable production bootstrap binding repair.
// No provider calls, credentials, runtime activation, command-card issuance or request-body IO.
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../cad-auth-prod-opening-prep/preparation');

const BASE_MAIN_COMMIT = '01bf78efa24e009b7e8ed48059da2fad8bf76826';
const REPAIR_BRANCH = 'codex/cad-auth-bootstrap-binding-repair';
const PREVIOUS_EXECUTABLE_COMMAND_CARD_REBIND_PACKET_SHA256 =
  '8412b6d4495bf0dc852e3b3875497f839b01529825c7d22171814ee107eb67c1';
const PREVIOUS_DIGEST_REFRESH_SHA256 =
  '130d4ec652de12ea97cd669de3d4a3d7c69d58f4024b0a2dc571141b9c19dd7c';
const PREVIOUS_EXECUTABLE_COMMAND_CARD_SHA256 =
  '063ff7f58dc6a1970aa7eb03401a34ab54e03685beada14454c2ddb195ed4916';
const PREVIOUS_PRODUCTION_DEPLOYMENT_REF =
  'https://vercel.com/vsillahs-projects/reversr/8k7rWpk256ZkiRnuzDbsdRd1w99o';
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
  repairPacketSha256 = '<bootstrapBindingRepairPacketSha256>',
  repairSourceCommit = '<bootstrapBindingRepairSourceCommit>',
  postMergeDigestRefreshSha256 = '<postMergeDigestRefreshSha256>',
  currentProductionDeploymentReference = '<currentProductionDeploymentReference>',
  executableCommandCardSha256 = '<executableCommandCardSha256>',
  startUtc = '<startUtc>',
  expiresUtc = '<expiresUtc>',
} = {}) {
  return `I approve one bounded internal production upload-admission opening for ReversR CAD user-import, bound to source-only executable production bootstrap binding repair packet ${repairPacketSha256} at source commit ${repairSourceCommit}, source-only/no-live post-merge executable command-card digest refresh SHA-256 ${postMergeDigestRefreshSha256}, previous executable command-card rebind packet ${PREVIOUS_EXECUTABLE_COMMAND_CARD_REBIND_PACKET_SHA256}, previous executable digest refresh ${PREVIOUS_DIGEST_REFRESH_SHA256}, bounded session binding ${BOUNDED_SESSION_REF}, cohort ${INTERNAL_COHORT_REF}, and production deployment reference ${currentProductionDeploymentReference}. Scope: against ${PRODUCTION_ORIGIN} ${PRODUCTION_ROUTE}, for cohort ${INTERNAL_COHORT_REF}, starting ${startUtc} and expiring ${expiresUtc}; issue and use only one bounded executable command-card with SHA-256 ${executableCommandCardSha256} for admission-only body validation for public, synthetic, or explicitly authorized internal tester CAD; one concurrent session; one upload attempt; independent expiry checks before every effect; atomic durable run and attempt claims; stop on unknown outcome; rollback immediately after the window; and run post-rollback fail-closed smoke before cleanup. No conversion, Sandbox dispatch, private CAD, real-user commercialization, external messages, provider/env/resource/billing changes, second live run, retry, or commercial-readiness claim.`;
}

function bootstrapBindingRepairPreparation() {
  return {
    schemaVersion: 1,
    packet: 'cad-auth-executable-production-bootstrap-binding-repair-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_BOOTSTRAP_BINDING_REPAIR_READY_PRODUCTION_CLOSED',
    baseMainCommit: BASE_MAIN_COMMIT,
    repairBranch: REPAIR_BRANCH,
    priorGateStoppedBecause: 'PRODUCTION_BOOTSTRAP_DID_NOT_BIND_EXECUTABLE_RUNTIME_INPUTS',
    historicalBindings: {
      previousExecutableCommandCardRebindPacketSha256: PREVIOUS_EXECUTABLE_COMMAND_CARD_REBIND_PACKET_SHA256,
      previousDigestRefreshSha256: PREVIOUS_DIGEST_REFRESH_SHA256,
      previousExecutableCommandCardSha256: PREVIOUS_EXECUTABLE_COMMAND_CARD_SHA256,
      previousProductionDeploymentReference: PREVIOUS_PRODUCTION_DEPLOYMENT_REF,
      previousDeploymentMustNotBeReusedAfterThisMerge: true,
    },
    implementationBinding: {
      routePath: 'server/cadUserUploadRouter.js',
      bootstrapPath: 'server/cadLiveOpeningExecutableRuntimeBootstrap.js',
      wiringPath: 'server/cadLiveOpeningExecutableRuntimeWiring.js',
      routeAcceptsExecutableRuntimeBinding: true,
      bootstrapForwardsExactCommandCardBytes: true,
      bootstrapForwardsExactCommandCardSha256: true,
      bootstrapForwardsCurrentDeploymentReference: true,
      bootstrapForwardsDurableAdapterInterface: true,
      bootstrapForwardsClockForIndependentExpiryChecks: true,
      oneSessionOneAttemptFenceRemainsInWiring: true,
      rollbackFirstControlsRemainInWiring: true,
      postRollbackFailClosedSmokeRemainsInWiring: true,
      bodyAdmissionLiteralRemainsFalse: true,
      requestBodyValidationStillAfterRouteBodyGate: true,
      defaultProductionBehaviorClosed: true,
      noEnvironmentRuntimeSwitch: true,
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
      requiresExactBoundedSessionBinding: true,
      approvalPhraseTemplate: exactLiveOpeningApprovalPhrase(),
      unresolvedFields: [
        'bootstrapBindingRepairPacketSha256',
        'bootstrapBindingRepairSourceCommit',
        'postMergeDigestRefreshSha256',
        'currentProductionDeploymentReference',
        'executableCommandCardSha256',
        'startUtc',
        'expiresUtc',
      ],
    },
    controls: CLOSED_CONTROLS,
  };
}

function checkBootstrapBindingRepairPreparation(input) {
  let ok = false;
  try {
    ok = Boolean(input && typeof input === 'object' && !Array.isArray(input)
      && plainContractData(input)
      && isDeepStrictEqual(input, bootstrapBindingRepairPreparation()));
  } catch {
    // Sanitized fail-closed response.
  }
  return {
    ...CLOSED_CONTROLS,
    ok,
    code: ok ? 'BOOTSTRAP_BINDING_REPAIR_PREPARATION_VALID'
      : 'BOOTSTRAP_BINDING_REPAIR_PREPARATION_BLOCKED',
  };
}

module.exports = {
  BASE_MAIN_COMMIT,
  REPAIR_BRANCH,
  PREVIOUS_EXECUTABLE_COMMAND_CARD_REBIND_PACKET_SHA256,
  PREVIOUS_DIGEST_REFRESH_SHA256,
  PREVIOUS_EXECUTABLE_COMMAND_CARD_SHA256,
  PREVIOUS_PRODUCTION_DEPLOYMENT_REF,
  BOUNDED_SESSION_REF,
  INTERNAL_COHORT_REF,
  PRODUCTION_ORIGIN,
  PRODUCTION_ROUTE,
  CLOSED_CONTROLS,
  exactLiveOpeningApprovalPhrase,
  bootstrapBindingRepairPreparation,
  checkBootstrapBindingRepairPreparation,
};
