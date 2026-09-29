// Reviewed source slots only. No loader, request handler, environment switch,
// provider initialization or command-card issuer belongs in this module.
const { createHash } = require('node:crypto');
const {
  EXECUTABLE_COMMAND_CARD_ARTIFACT,
  METHODS,
} = require('./cadLiveOpeningExecutableRuntimeWiring');
const {
  INTERNAL_COHORT_REF,
  PRODUCTION_ORIGIN,
  PRODUCTION_ROUTE,
} = require('./cadLiveOpeningRuntimeMount');

const BOUNDED_SESSION_REF = 'rrb-ref:cad-upload-internal-mark-test-session-v1';
const DURABLE_SERVICE_REF = 'rrb-ref:cad-auth-durable-service-20260928T161754Z';
const PENDING_DEPLOYMENT_REFERENCE = 'rrb-ref:cad-auth-source-install-gap-closure-pending-deployment';
const PENDING_SESSION_ID = 'rrb-ref:cad-upload-internal-mark-test-session-v1-pending';
const PENDING_START_UTC = '2030-01-01T00:00:00Z';
const PENDING_EXPIRES_UTC = '2030-01-01T00:30:00Z';

const sha = value => createHash('sha256').update(value).digest('hex');

function freezePlain(value) {
  return Object.freeze({ ...value });
}

function createClosedDurableAdapterService() {
  return Object.freeze(Object.fromEntries(METHODS.map(name => [name, async () => {
    throw Error('PRODUCTION_BINDING_INSTALLATION_DISABLED');
  }])));
}

function createPendingExecutableCommandCard({
  productionDeploymentReference = PENDING_DEPLOYMENT_REFERENCE,
  sessionId = PENDING_SESSION_ID,
  durableEvidenceSha256 = sha('cad-auth-source-install-gap-closure-pending-durable-evidence'),
  startUtc = PENDING_START_UTC,
  expiresUtc = PENDING_EXPIRES_UTC,
} = {}) {
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
    productionDeploymentReference,
    productionOrigin: PRODUCTION_ORIGIN,
    productionRoute: PRODUCTION_ROUTE,
    cohortRef: INTERNAL_COHORT_REF,
    sessionId,
    durableEvidenceSha256,
    openingWindow: {
      startUtc,
      expiresUtc,
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

function createProductionBindingInstallation({
  enabled = false,
  explicitLiveOpeningApproved = false,
  commandCard = createPendingExecutableCommandCard(),
  durableServiceRef = DURABLE_SERVICE_REF,
  durableService = createClosedDurableAdapterService(),
} = {}) {
  const commandCardBytes = JSON.stringify(commandCard);
  const commandCardSha256 = sha(commandCardBytes);
  const manifest = freezePlain({
    schemaVersion: 1,
    commandCardBytes,
    commandCardSha256,
    currentDeploymentReference: commandCard.productionDeploymentReference,
    boundedSessionRef: BOUNDED_SESSION_REF,
    sessionId: commandCard.sessionId,
    durableEvidenceSha256: commandCard.durableEvidenceSha256,
    durableServiceRef,
  });
  const exact = freezePlain({
    ...manifest,
    startUtc: commandCard.openingWindow.startUtc,
    expiresUtc: commandCard.openingWindow.expiresUtc,
  });
  const durableAdapter = freezePlain({
    serviceRef: durableServiceRef,
    evidenceSha256: commandCard.durableEvidenceSha256,
    service: durableService,
  });
  return Object.freeze({
    enabled: enabled === true,
    manifest,
    liveGate: freezePlain({
      explicitLiveOpeningApproved: explicitLiveOpeningApproved === true,
      installationSha256: sha(JSON.stringify(exact)),
    }),
    durableAdapter,
  });
}

const PRODUCTION_BINDING_INSTALLATION = createProductionBindingInstallation();

module.exports = {
  BOUNDED_SESSION_REF,
  DURABLE_SERVICE_REF,
  PRODUCTION_BINDING_INSTALLATION,
  createClosedDurableAdapterService,
  createPendingExecutableCommandCard,
  createProductionBindingInstallation,
};
