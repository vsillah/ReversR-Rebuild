// Source-only executable runtime wiring packet. No live command card or provider IO.
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../cad-auth-prod-opening-prep/preparation');
const {
  EXECUTABLE_COMMAND_CARD_ARTIFACT,
  RUN_FENCE_KEY,
  FORWARD_EFFECTS,
  CLEANUP_EFFECTS,
  METHODS,
  LIVE_OPENING_EXECUTABLE_RUNTIME_WIRING_ENABLED,
} = require('../../server/cadLiveOpeningExecutableRuntimeWiring');

const BASE_MAIN_COMMIT = '3f8bdcaedf210d0148d993d0fdccb66971e164f5';
const RUNTIME_ACTIVATION_PACKET_SHA256 =
  '1ea9aecd93d00abee4dca807c70c89c1900cde93c111e131a991777bce3a83f6';
const CURRENT_DEPLOYMENT_REBIND_PACKET_SHA256 =
  '038b7ae04869095e01eda9f223d6ad51cc03845c00703ffeee4116c418840f6e';
const RUNTIME_MOUNT_PREP_PACKET_SHA256 =
  'cc34518d4b02ad198c2f01c0e05615c78bed9881cc7b864218fe5d9fb42f8d12';
const DURABLE_ADAPTER_PACKET_SHA256 =
  '783fc44dc5b052f7f6d2da933e8d32c09ab11a872ba3f9d2a027db173a16d285';

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

function executableRuntimeWiringPreparation() {
  return {
    schemaVersion: 1,
    packet: 'cad-auth-live-opening-executable-runtime-wiring-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_EXECUTABLE_RUNTIME_WIRING_PREPARED_PRODUCTION_CLOSED',
    branch: 'codex/cad-auth-live-opening-executable-runtime-wiring',
    baseMainCommit: BASE_MAIN_COMMIT,
    captainLaneFallback: {
      used: true,
      reason: 'visible Codex task/worktree creation failed twice before this bounded fallback',
      dedicatedWorktreeRequired: true,
      traceabilityPreservedInCaptainReport: true,
    },
    parentPackets: {
      runtimeActivationPacketSha256: RUNTIME_ACTIVATION_PACKET_SHA256,
      currentDeploymentRebindPacketSha256: CURRENT_DEPLOYMENT_REBIND_PACKET_SHA256,
      runtimeMountPrepPacketSha256: RUNTIME_MOUNT_PREP_PACKET_SHA256,
      durableAdapterPacketSha256: DURABLE_ADAPTER_PACKET_SHA256,
    },
    productionBootstrap: {
      source: 'server/cadLiveOpeningExecutableRuntimeBootstrap.js',
      importedByRoute: true,
      defaultEnabled: LIVE_OPENING_EXECUTABLE_RUNTIME_WIRING_ENABLED,
      defaultClosedWithoutCommandCard: true,
      defaultClosedWithoutDurableAdapter: true,
      readsProviderEnvOrSecrets: false,
      issuesUploadSessions: false,
      readsRequestBody: false,
    },
    routeBodyGateIntegration: {
      routeSource: 'server/cadUserUploadRouter.js',
      literalBodyAdmissionGateRemainsFalse: true,
      admissionSwitchMustOpenBeforeBodyGate: true,
      routeBodyGateMustOpenBeforeValidateRequestBody: true,
      missingRouteBodyGateReturns: 'USER_UPLOADS_DISABLED',
      routeBodyGateBypassDoesNotFlipLiteral: true,
      postAdmissionCleanupHookInstalled: true,
      defaultProductionBodyReads: 0,
    },
    executableCommandCardBinding: {
      artifact: EXECUTABLE_COMMAND_CARD_ARTIFACT,
      exactUtf8JsonSha256Required: true,
      canonicalJsonSha256MustMatch: true,
      currentDeploymentReferenceRecheckRequired: true,
      productionOriginBound: 'https://reversr.vercel.app',
      productionRouteBound: 'POST /api/cad/user-import',
      cohortRefBound: 'rrb-ref:cad-upload-internal-mark-test-cohort-v1',
      sourceOnlyDraftCannotOpenGate: true,
      commandCardIssuedByThisGate: false,
      executableCommandCardPreparedForLiveExecution: false,
    },
    durableRuntimeFence: {
      runFenceKey: RUN_FENCE_KEY,
      methods: METHODS,
      forwardEffects: FORWARD_EFFECTS,
      cleanupEffects: CLEANUP_EFFECTS,
      oneSessionOneAttemptLedgerEnforced: true,
      independentExpiryCheckBeforeEveryEffect: true,
      rollbackArmedBeforeOpenFence: true,
      postRollbackFailClosedSmokeRequired: true,
      unknownOutcomeStopsWithoutRetry: true,
      cleanupAllowedAfterExpiry: true,
      durableAdapterEvidenceStillRequiredAtLiveGate: true,
    },
    stopConditions: {
      failingCheck: true,
      unknownOutcome: true,
      staleDeploymentBinding: true,
      missingDurableAdapterEvidence: true,
      commandCardDigestMismatch: true,
      currentDeploymentRecheckMissing: true,
      oneSessionOneAttemptFenceMissing: true,
      independentExpiryEvidenceMissing: true,
      routeBodyObserverMissing: true,
      rollbackSmokeEvidenceMissing: true,
      runtimeCredentialsOrProviderConfigurationNeeded: true,
    },
    nextGate: {
      authorized: false,
      gate: 'bounded-live-opening-executable-command-card-and-runtime-activation',
      exactApprovalPhraseNeeded: true,
      mustBindFreshProductionDeployment: true,
      mustBindExecutableCommandCardSha256: true,
      mustBindWindowInsideApprovalText: true,
      mustRunPostRollbackFailClosedSmoke: true,
    },
    controls: CLOSED_CONTROLS,
  };
}

function checkExecutableRuntimeWiringPreparation(input) {
  let ok = false;
  try {
    ok = plainContractData(input) && isDeepStrictEqual(input, executableRuntimeWiringPreparation());
  } catch {
    // Closed and sanitized.
  }
  return {
    ...CLOSED_CONTROLS,
    ok,
    code: ok ? 'SOURCE_ONLY_EXECUTABLE_RUNTIME_WIRING_VALID'
      : 'EXECUTABLE_RUNTIME_WIRING_BLOCKED',
  };
}

module.exports = {
  BASE_MAIN_COMMIT,
  RUNTIME_ACTIVATION_PACKET_SHA256,
  CURRENT_DEPLOYMENT_REBIND_PACKET_SHA256,
  RUNTIME_MOUNT_PREP_PACKET_SHA256,
  DURABLE_ADAPTER_PACKET_SHA256,
  CLOSED_CONTROLS,
  executableRuntimeWiringPreparation,
  checkExecutableRuntimeWiringPreparation,
};
