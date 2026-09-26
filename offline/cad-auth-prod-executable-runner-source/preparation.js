// Source-only executable runner contract. No runtime effects, credentials or body IO.
const { isDeepStrictEqual } = require('node:util');
const { plainContractData, preparation: openingPreparation } =
  require('../cad-auth-prod-opening-prep/preparation');
const { dryRun: sourceRunnerDryRun } = require('../cad-auth-prod-runner/runner');

const SOURCE_COMMIT = '702f7ef9559b59679846cb7c6e92971e81f7f645';
const OPENING_PREP_SHA256 = '29a9687a2a53ffbc4bf34af8cf943f4eedefc7f7c202ab837f068ccadd1b5bd2';
const RUNNER_PACKET_SHA256 = '815e4d35c7f7a6be8ed009d42baa283672492e06ee3001326f235d348944f0ad';

const EFFECTS = Object.freeze([
  'verifyFreshApproval',
  'verifyImmutableTarget',
  'verifyClosedBaseline',
  'verifyReceiptsAndSourceDigests',
  'verifyObserverHealth',
  'claimUniqueRun',
  'armIndependentExpiryFence',
  'verifyBoundedSession',
  'openAdmissionFence',
  'consumeAttemptBeforeBodyRead',
  'closeAdmissionFence',
  'revokeBoundedSessionAndLateGrants',
  'preserveRunAndAttemptTombstones',
  'runPostRollbackFailClosedSmoke',
  'writeSanitizedCloseout',
]);

const REQUIRED_CARD_FIELDS = Object.freeze([
  'schemaVersion',
  'card',
  'sourceCommit',
  'openingPreparationSha256',
  'runnerPacketSha256',
  'immutableTargetRef',
  'productionRunRef',
  'cohortRef',
  'startUtc',
  'expiresUtc',
  'maxDurationSeconds',
  'adapterContractSha256',
  'rollbackContractSha256',
  'preflightReceiptRef',
  'reviewerRef',
  'custodyRef',
]);

function commandCardTemplate() {
  return {
    schemaVersion: 1,
    card: 'cad-auth-production-upload-admission-command-card-v1',
    executable: false,
    issued: false,
    issuer: null,
    requiredFields: REQUIRED_CARD_FIELDS,
    unresolvedFields: REQUIRED_CARD_FIELDS.filter(field => field !== 'schemaVersion' && field !== 'card'),
    requiresSeparateLiveOpeningApproval: true,
    requiresSeparateSessionIssuanceApproval: true,
    requiresSeparateRuntimeActivationApproval: true,
    requiresSeparateBodyAdmissionApproval: true,
    forbidsConversion: true,
    forbidsSandboxDispatch: true,
    forbidsPrivateCad: true,
    forbidsRetryOrSecondRun: true,
  };
}

function effectContract() {
  return {
    interfaceOnly: true,
    defaultAdapter: null,
    injectedEffectsRequiredForLiveUse: true,
    providerEnvResourceBillingChangeRequired: false,
    secretReadRequired: false,
    effectNames: EFFECTS,
    requiredReturnShape: {
      ok: 'boolean',
      code: 'string',
      sanitizedRef: 'string',
      sha256: '64 lowercase hex string',
      observerDeltas: 'zero body/session/conversion/sandbox counters',
    },
    stopOn: [
      'missing adapter',
      'unapproved command card',
      'target drift',
      'window not active',
      'clock uncertainty',
      'digest mismatch',
      'unknown claim outcome',
      'late grant',
      'observer unavailable',
      'nonzero body read',
      'runtime credential or provider configuration needed',
    ],
  };
}

function runnerSourcePacket() {
  const opening = openingPreparation();
  const sourceRunner = sourceRunnerDryRun();
  return {
    schemaVersion: 1,
    packet: 'cad-auth-production-executable-runner-source-v1',
    sourceOnly: true,
    sourceCommit: SOURCE_COMMIT,
    openingPreparationSha256: OPENING_PREP_SHA256,
    runnerPacketSha256: RUNNER_PACKET_SHA256,
    parentStatus: {
      openingPreparation: opening.status,
      sourceRunnerCode: sourceRunner.code,
      sourceRunnerLiveExecutionReady: sourceRunner.liveExecutionReady,
      sourceRunnerEffectsExecuted: sourceRunner.effectsExecuted,
    },
    sourceImplementationStatus: 'EXECUTABLE_RUNNER_SOURCE_CONTRACT_READY_DISABLED_BY_DEFAULT',
    enabled: false,
    runtimeMounted: false,
    liveExecutionReady: false,
    liveExecutionAuthorized: false,
    uploadSessionIssuanceAuthorized: false,
    productionUploadActivationAuthorized: false,
    requestBodyAdmissionReadAuthorized: false,
    executableCommandCardIssuanceAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    privateCadUseAuthorized: false,
    retryAuthorized: false,
    secondRunAuthorized: false,
    realUserCommercializationAuthorized: false,
    executableRunnerSource: {
      exactWindowValidationImplemented: true,
      adapterContractDefined: true,
      commandCardShapeDefined: true,
      rollbackContractDefined: true,
      failClosedSmokeContractDefined: true,
      defaultRuntimeAdapter: null,
      defaultEffectsExecuted: 0,
      processEnvReads: 0,
      networkCalls: 0,
      fileSystemWrites: 0,
      requestBodyReads: 0,
      uploadSessionsIssued: 0,
    },
    exactWindow: {
      startInclusive: true,
      expiryExclusive: true,
      maxDurationSecondsRequired: true,
      trustedClockRequired: true,
      recheckBeforeEveryEffect: true,
      staleApprovalRejected: true,
      replayedApprovalRejected: true,
    },
    commandCard: commandCardTemplate(),
    effectContract: effectContract(),
    rollback: opening.rollback,
    postRollbackSmoke: opening.postRollbackSmoke,
    nextGate: {
      authorized: false,
      requiredGate: 'bounded-live-command-card-issuance-and-runtime-activation-review',
      exactApprovalPhraseNeeded: true,
      mustBindFreshCommandCardSha256: true,
      mustBindImmutableDeploymentAndRun: true,
      mustBindExistingAdapterEvidence: true,
      mustBindIndependentExpiryAndDurableLedgerEvidence: true,
      unresolvedPlaceholdersAreNotApproval: true,
    },
  };
}

function checkRunnerSourcePacket(input) {
  let ok = false;
  try {
    ok = input !== null
      && typeof input === 'object'
      && !Array.isArray(input)
      && plainContractData(input)
      && isDeepStrictEqual(input, runnerSourcePacket());
  } catch {
    // Return a closed status without reflecting input.
  }
  return {
    ok,
    code: ok ? 'SOURCE_ONLY_EXECUTABLE_RUNNER_SOURCE_VALID' : 'INVALID_EXECUTABLE_RUNNER_SOURCE_PACKET',
    sourceOnly: true,
    enabled: false,
    liveExecutionReady: false,
    liveExecutionAuthorized: false,
    uploadSessionIssuanceAuthorized: false,
    productionUploadActivationAuthorized: false,
    requestBodyAdmissionReadAuthorized: false,
    executableCommandCardIssuanceAuthorized: false,
    effectsExecuted: 0,
  };
}

module.exports = {
  SOURCE_COMMIT,
  OPENING_PREP_SHA256,
  RUNNER_PACKET_SHA256,
  EFFECTS,
  REQUIRED_CARD_FIELDS,
  commandCardTemplate,
  effectContract,
  runnerSourcePacket,
  checkRunnerSourcePacket,
};
