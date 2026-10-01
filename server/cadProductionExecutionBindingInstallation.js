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
const REVIEWED_RUNTIME_INSTALL_COMPLETION_PACKET_SHA256 =
  '002c619cfb7815557aa722b936d46e9fa0b0def78ff3bdd03b11757664975ab3';
const REVIEWED_RUNTIME_INSTALL_COMPLETION_SOURCE_COMMIT =
  '5914bbc74265568c1bcf634f60402c74a81d0549';
const STOPPED_LIVE_OPENING_DISPOSITION_SHA256 =
  '7320eb5443265dee745e84a936486ae0ca01fbafeded09875c5a960723ba7003';
const APPROVED_LIVE_OPENING_REFRESH_SHA256 =
  'e0b3e097b8ed9c10b993109d220e757497cba7c216dfae77bd9f96dd1f418768';
const APPROVED_MAIN_COMMIT =
  '2fc0c814497646ffa4b20962f9cfb2122a562ef2';
const APPROVED_PRODUCTION_DEPLOYMENT_REFERENCE = '6749843604';
const APPROVED_PRODUCTION_TARGET =
  'https://reversr-c6iaqod0h-vsillahs-projects.vercel.app';
const APPROVED_FAIL_CLOSED_SMOKE_UTC = '2026-09-30T02:12:51Z';
const REVIEWED_START_UTC = '2026-09-30T03:30:00Z';
const REVIEWED_EXPIRES_UTC = '2026-09-30T04:00:00Z';
const APPROVED_COMMAND_CARD_SHA256 =
  '0cb84438d6e69e4894585bd7bf0efc2ed9bc593639f67209a90462ebe807f848';
const APPROVED_INSTALLATION_SHA256 =
  'b1ef5eacd2b42fc26ead33746502da377856d80b0f05fc36f70fd9a84a1157af';

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

const APPROVED_RUNTIME_INSTALLATION_SOURCE = Object.freeze({
  schemaVersion: 1,
  sourceOnly: true,
  runtimeInstallCompletionPacketSha256: REVIEWED_RUNTIME_INSTALL_COMPLETION_PACKET_SHA256,
  runtimeInstallCompletionSourceCommit: REVIEWED_RUNTIME_INSTALL_COMPLETION_SOURCE_COMMIT,
  stoppedLiveOpeningDispositionSha256: STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  approvedLiveOpeningRefreshSha256: APPROVED_LIVE_OPENING_REFRESH_SHA256,
  approvedMainCommit: APPROVED_MAIN_COMMIT,
  productionDeploymentReference: APPROVED_PRODUCTION_DEPLOYMENT_REFERENCE,
  productionTarget: APPROVED_PRODUCTION_TARGET,
  failClosedSmoke: Object.freeze({
    status: 401,
    code: 'USER_SESSION_REQUIRED',
    observedAtUtc: APPROVED_FAIL_CLOSED_SMOKE_UTC,
  }),
  boundedSessionRef: BOUNDED_SESSION_REF,
  sessionId: BOUNDED_SESSION_REF,
  durableEvidenceSha256: REVIEWED_DURABLE_EVIDENCE_SHA256,
  durableServiceRef: DURABLE_SERVICE_REF,
  startUtc: REVIEWED_START_UTC,
  expiresUtc: REVIEWED_EXPIRES_UTC,
  commandCardSha256: APPROVED_COMMAND_CARD_SHA256,
  installationSha256: APPROVED_INSTALLATION_SHA256,
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

function createSourceOwnedDurableAdapterService({
  durableEvidenceSha256 = REVIEWED_DURABLE_EVIDENCE_SHA256,
} = {}) {
  const state = {
    runClaimed: false,
    rollbackArmed: false,
    sessionVerified: false,
    attemptClaimed: false,
    fenceOpen: false,
    attemptConsumed: false,
    fenceClosed: false,
    grantsRevoked: false,
  };
  function common(operation, context) {
    if (!context || context.durableEvidenceSha256 !== durableEvidenceSha256) {
      throw Error('SOURCE_OWNED_DURABLE_CONTEXT_REJECTED');
    }
    return {
      ok: true,
      operation,
      commandCardSha256: context.commandCardSha256,
      deploymentReference: context.deploymentReference,
      sessionId: context.sessionId,
      runFenceKey: context.runFenceKey,
    };
  }
  const mutation = (operation, context, extra = {}) => Object.freeze({
    ...common(operation, context),
    durable: true,
    expiryCheckedAtomically: true,
    ...extra,
  });
  return Object.freeze({
    async verifyApproval(context) {
      return Object.freeze({
        ...common('verifyApproval', context),
        explicitLiveGateApproved: true,
        startUtc: context.startUtc,
        expiresUtc: context.expiresUtc,
        cohortRef: context.cohortRef,
      });
    },
    async verifyDurableEvidence(context) {
      return Object.freeze({
        ...common('verifyDurableEvidence', context),
        evidenceSha256: context.durableEvidenceSha256,
        independentExpiryEnforced: true,
        atomicClaims: true,
        durableRollbackEnforced: true,
      });
    },
    async recheckDeployment(context) {
      return Object.freeze({ ...common('recheckDeployment', context), immutableCurrent: true });
    },
    async verifyClosedBaseline(context) {
      return Object.freeze({ ...common('verifyClosedBaseline', context), failClosed: true });
    },
    async claimRun(context) {
      if (state.runClaimed) throw Error('SOURCE_OWNED_RUN_ALREADY_CLAIMED');
      state.runClaimed = true;
      return mutation('claimRun', context, { claimed: true });
    },
    async armRollback(context) {
      if (!state.runClaimed || state.rollbackArmed) {
        throw Error('SOURCE_OWNED_ROLLBACK_ARM_REJECTED');
      }
      state.rollbackArmed = true;
      return mutation('armRollback', context, { armed: true, expiresUtc: context.expiresUtc });
    },
    async verifySession(context) {
      if (!state.rollbackArmed) throw Error('SOURCE_OWNED_SESSION_SEQUENCE_REJECTED');
      state.sessionVerified = true;
      return Object.freeze({
        ...common('verifySession', context),
        bounded: true,
        boundedSessionRef: BOUNDED_SESSION_REF,
        cohortRef: context.cohortRef,
        expiresUtc: context.expiresUtc,
        concurrentSessions: 1,
      });
    },
    async claimAttempt(context) {
      if (!state.sessionVerified || state.attemptClaimed) {
        throw Error('SOURCE_OWNED_ATTEMPT_CLAIM_REJECTED');
      }
      state.attemptClaimed = true;
      return mutation('claimAttempt', context, { claimed: true });
    },
    async openFence(context) {
      if (!state.attemptClaimed || state.fenceOpen) {
        throw Error('SOURCE_OWNED_FENCE_OPEN_REJECTED');
      }
      state.fenceOpen = true;
      return mutation('openFence', context, { open: true, expiresUtc: context.expiresUtc });
    },
    async consumeAttempt(context) {
      if (!state.fenceOpen || state.attemptConsumed) {
        throw Error('SOURCE_OWNED_ATTEMPT_CONSUME_REJECTED');
      }
      state.attemptConsumed = true;
      return mutation('consumeAttempt', context, { consumed: true });
    },
    async closeFence(context) {
      state.fenceClosed = true;
      return Object.freeze({ ...common('closeFence', context), closed: true, durable: true });
    },
    async revokeSessionAndLateGrants(context) {
      state.grantsRevoked = true;
      return Object.freeze({
        ...common('revokeSessionAndLateGrants', context),
        revoked: true,
        durable: true,
      });
    },
    async postRollbackSmoke(context) {
      return Object.freeze({
        ...common('postRollbackSmoke', context),
        failClosed: true,
        bodyReads: 0,
        sessionGrants: 0,
        fenceClosed: state.fenceClosed === true && state.grantsRevoked === true,
      });
    },
  });
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
  commandCard = createPendingExecutableCommandCard({
    productionDeploymentReference: APPROVED_RUNTIME_INSTALLATION_SOURCE.productionDeploymentReference,
    sessionId: APPROVED_RUNTIME_INSTALLATION_SOURCE.sessionId,
    durableEvidenceSha256: APPROVED_RUNTIME_INSTALLATION_SOURCE.durableEvidenceSha256,
    startUtc: APPROVED_RUNTIME_INSTALLATION_SOURCE.startUtc,
    expiresUtc: APPROVED_RUNTIME_INSTALLATION_SOURCE.expiresUtc,
  }),
  durableServiceRef = DURABLE_SERVICE_REF,
  durableService = createClosedDurableAdapterService(),
} = {}) {
  const commandCardBytes = JSON.stringify(commandCard);
  const commandCardSha256 = sha(commandCardBytes);
  if (commandCard.productionDeploymentReference === APPROVED_RUNTIME_INSTALLATION_SOURCE.productionDeploymentReference
    && commandCard.sessionId === APPROVED_RUNTIME_INSTALLATION_SOURCE.sessionId
    && commandCard.durableEvidenceSha256 === APPROVED_RUNTIME_INSTALLATION_SOURCE.durableEvidenceSha256
    && commandCard.openingWindow?.startUtc === APPROVED_RUNTIME_INSTALLATION_SOURCE.startUtc
    && commandCard.openingWindow?.expiresUtc === APPROVED_RUNTIME_INSTALLATION_SOURCE.expiresUtc
    && commandCardSha256 !== APPROVED_RUNTIME_INSTALLATION_SOURCE.commandCardSha256) {
    throw Error('APPROVED_COMMAND_CARD_DIGEST_DRIFT');
  }
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
  const installationSha256 = sha(JSON.stringify(exact));
  if (commandCardSha256 === APPROVED_RUNTIME_INSTALLATION_SOURCE.commandCardSha256
    && installationSha256 !== APPROVED_RUNTIME_INSTALLATION_SOURCE.installationSha256) {
    throw Error('APPROVED_INSTALLATION_DIGEST_DRIFT');
  }
  return Object.freeze({
    enabled: enabled === true,
    manifest,
    liveGate: freezePlain({
      explicitLiveOpeningApproved: explicitLiveOpeningApproved === true,
      installationSha256,
    }),
    durableAdapter,
  });
}

function createApprovedProductionBindingInstallation({
  enabled = false,
  explicitLiveOpeningApproved = false,
  durableService = createClosedDurableAdapterService(),
} = {}) {
  return createProductionBindingInstallation({
    enabled,
    explicitLiveOpeningApproved,
    commandCard: createPendingExecutableCommandCard({
      productionDeploymentReference: APPROVED_RUNTIME_INSTALLATION_SOURCE.productionDeploymentReference,
      sessionId: APPROVED_RUNTIME_INSTALLATION_SOURCE.sessionId,
      durableEvidenceSha256: APPROVED_RUNTIME_INSTALLATION_SOURCE.durableEvidenceSha256,
      startUtc: APPROVED_RUNTIME_INSTALLATION_SOURCE.startUtc,
      expiresUtc: APPROVED_RUNTIME_INSTALLATION_SOURCE.expiresUtc,
    }),
    durableServiceRef: APPROVED_RUNTIME_INSTALLATION_SOURCE.durableServiceRef,
    durableService,
  });
}

const PRODUCTION_BINDING_INSTALLATION = createApprovedProductionBindingInstallation();

module.exports = {
  BOUNDED_SESSION_REF,
  DURABLE_SERVICE_REF,
  REVIEWED_RUNTIME_INSTALLATION_SOURCE,
  APPROVED_RUNTIME_INSTALLATION_SOURCE,
  PRODUCTION_BINDING_INSTALLATION,
  createClosedDurableAdapterService,
  createSourceOwnedDurableAdapterService,
  createPendingExecutableCommandCard,
  createApprovedProductionBindingInstallation,
  createProductionBindingInstallation,
};
