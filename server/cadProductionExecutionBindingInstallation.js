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
const REVIEWED_SCHEMA_REBIND_PACKET_SHA256 =
  '05682b6e4ede9e8f8c45008e3538d9ee95f9962f23ad999241b0569a3e744143';
const REVIEWED_SCHEMA_REBIND_SOURCE_COMMIT =
  'efd6022b12bb9669bcf05113145525a3a3fd8473';
const REVIEWED_SCHEMA_REBIND_MERGE_COMMIT =
  '5010b7262050126819eaa3caa50abb8a9662654b';
const REVIEWED_PRODUCTION_DEPLOYMENT_REFERENCE = '6748757459';
const REVIEWED_PRODUCTION_TARGET =
  'https://reversr-7ohvjcv4u-vsillahs-projects.vercel.app';
const REVIEWED_FAIL_CLOSED_SMOKE_UTC = '2026-09-30T00:45:32Z';
const REVIEWED_SOURCE_RECORD_PACKET_SHA256 =
  '0d8b2c06fb2ad7f32f126909c3cbe20b9baa95f0aaa6f1d89ed892bc5820a14d';
const REVIEWED_SOURCE_RECORD_SHA256 =
  '81178504968fffa01d265b9b9541dda78935133f71f174bf0d667a79a5ca8ce5';
const REVIEWED_DURABLE_EVIDENCE_SHA256 =
  '8d371999f3efa3f090ae84fd6e88e8a912a6e69170c7e79672a96378bc15eaa7';
const REVIEWED_START_UTC = '2030-01-01T00:00:00Z';
const REVIEWED_EXPIRES_UTC = '2030-01-01T00:30:00Z';

const REVIEWED_RUNTIME_INSTALLATION_SOURCE = Object.freeze({
  schemaVersion: 1,
  sourceOnly: true,
  schemaRebindPacketSha256: REVIEWED_SCHEMA_REBIND_PACKET_SHA256,
  schemaRebindSourceCommit: REVIEWED_SCHEMA_REBIND_SOURCE_COMMIT,
  schemaRebindMergeCommit: REVIEWED_SCHEMA_REBIND_MERGE_COMMIT,
  sourceRecordPacketSha256: REVIEWED_SOURCE_RECORD_PACKET_SHA256,
  sourceRecordSha256: REVIEWED_SOURCE_RECORD_SHA256,
  productionDeploymentReference: REVIEWED_PRODUCTION_DEPLOYMENT_REFERENCE,
  productionTarget: REVIEWED_PRODUCTION_TARGET,
  failClosedSmoke: Object.freeze({
    status: 401,
    code: 'USER_SESSION_REQUIRED',
    observedAtUtc: REVIEWED_FAIL_CLOSED_SMOKE_UTC,
  }),
  boundedSessionRef: BOUNDED_SESSION_REF,
  sessionId: BOUNDED_SESSION_REF,
  durableEvidenceSha256: REVIEWED_DURABLE_EVIDENCE_SHA256,
  durableServiceRef: DURABLE_SERVICE_REF,
});

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
  productionDeploymentReference = REVIEWED_RUNTIME_INSTALLATION_SOURCE.productionDeploymentReference,
  sessionId = REVIEWED_RUNTIME_INSTALLATION_SOURCE.sessionId,
  durableEvidenceSha256 = REVIEWED_RUNTIME_INSTALLATION_SOURCE.durableEvidenceSha256,
  startUtc = REVIEWED_START_UTC,
  expiresUtc = REVIEWED_EXPIRES_UTC,
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
  REVIEWED_RUNTIME_INSTALLATION_SOURCE,
  PRODUCTION_BINDING_INSTALLATION,
  createClosedDurableAdapterService,
  createPendingExecutableCommandCard,
  createProductionBindingInstallation,
};
