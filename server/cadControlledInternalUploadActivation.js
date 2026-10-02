const { createHash, timingSafeEqual } = require('node:crypto');

const CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_ENABLED = false;
const MANIFEST_ARTIFACT = 'cad-auth-controlled-internal-upload-activation-manifest-v1';
const COMMAND_CARD_ARTIFACT = 'cad-auth-controlled-internal-upload-activation-command-card-v1';
const IMPLEMENTATION_ARTIFACT = 'cad-auth-controlled-internal-upload-activation-implementation-v1';
const ROUTE = 'POST /api/cad/user-import';
const PRODUCTION_ALIAS = 'https://reversr.vercel.app';
const COHORT_REF = 'rrb-ref:cad-upload-internal-mark-test-cohort-v1';
const SESSION_REF = 'rrb-ref:cad-upload-internal-mark-test-session-v1';
const SOURCE_OWNED_DEPLOYMENT_REFERENCE =
  'vercel-target:reversr-2bbhn3jbb-vsillahs-projects.vercel.app@66c7ad1e23bf68316dd350c79d0324ad61e67dd2';
const POST_MERGE_DECISION_REBIND_REFRESH_SHA256 =
  '1a3d5da0a9c7e21f5d58445510018c7c8913402696f6ff50d8239e1727b2bca3';
const CURRENT_PRODUCTION_DEPLOYMENT_BINDING_SHA256 =
  '5241aa6217768e86ce76665f94f1af4b97125a903ff5eef6bdbc6031b2984f18';
const MAIN_COMMIT = '66c7ad1e23bf68316dd350c79d0324ad61e67dd2';
const DECISION_PACKET_SHA256 =
  'd73f177fff7d814e644f161a5039e062ada065e92be3fe303ac041738646fd71';
const DECISION_SOURCE_COMMIT = '3dc4c72959a0d060eec6e71a11c9e8aa53cc54c3';
const GITHUB_PRODUCTION_DEPLOYMENT = '6811229679';
const PRODUCTION_TARGET = 'https://reversr-2bbhn3jbb-vsillahs-projects.vercel.app';
const FAIL_CLOSED_SMOKE_OBSERVED_BEFORE_UTC = '2026-10-02T15:09:45Z';
const SOURCE_ONLY_PROOF_WINDOW = Object.freeze({
  startUtc: '2030-01-01T00:00:00Z',
  expiresUtc: '2030-01-01T00:30:00Z',
  startInclusiveExpiryExclusive: true,
});
const VALIDATOR_ENVELOPE = Object.freeze({
  currentValidator: 'server/cadUserUploadAdmission.js',
  acceptedContainer: 'application/json',
  requiredPayloadKeys: Object.freeze(['contentBase64', 'fileName', 'mimeType']),
  acceptedMimeTypes: Object.freeze(['model/iges', 'application/iges', 'application/octet-stream']),
  acceptedFileExtensions: Object.freeze(['igs', 'iges']),
  sourceLimitBytes: 262144,
  requestLimitBytes: 393216,
  timeoutMs: 10000,
  stepStpAuthorized: false,
  externalReferencesAuthorized: false,
});
const FORWARD_EFFECTS = Object.freeze([
  'verifyCurrentDeployment',
  'verifyCommandCardBinding',
  'verifyClosedBaseline',
  'claimRun',
  'verifyBoundedSession',
  'claimAttempt',
  'armRollback',
  'openBodyAdmissionFence',
  'consumeAttemptBeforeBodyRead',
]);
const CLEANUP_EFFECTS = Object.freeze([
  'closeBodyAdmissionFence',
  'revokeSessionAndLateGrants',
  'postRollbackFailClosedSmoke',
]);
const METHODS = Object.freeze([...FORWARD_EFFECTS, ...CLEANUP_EFFECTS]);
const MUTATIONS = new Set([
  'claimRun',
  'claimAttempt',
  'armRollback',
  'openBodyAdmissionFence',
  'consumeAttemptBeforeBodyRead',
]);
const SHA = /^[a-f0-9]{64}$/;
const REF = /^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,255}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const FORBIDDEN_RECEIPT_KEYS = Object.freeze([
  'authorization',
  'body',
  'cadBytes',
  'cadSource',
  'contentBase64',
  'credential',
  'credentialValue',
  'fileName',
  'privateCredential',
  'privateCredentialValue',
  'privateFileName',
  'privateFilePath',
  'requestBody',
  'secret',
  'token',
]);

const deny = (code, extra = {}) => Object.freeze({
  ok: false,
  code,
  admissionAuthorized: false,
  bodyReadAuthorized: false,
  routeBodyGateAuthorized: false,
  productionUploadActivationAuthorized: false,
  conversionAuthorized: false,
  sandboxDispatchAuthorized: false,
  durableProjectHistoryAuthorized: false,
  requestContentRecordingAuthorized: false,
  retryAuthorized: false,
  secondLiveRunAuthorized: false,
  externalEffectAuthorized: false,
  ...extra,
});

const shaBytes = value => createHash('sha256').update(value).digest('hex');
const shaJson = value => shaBytes(JSON.stringify(value));
const digest = value => typeof value === 'string' && SHA.test(value);
const ref = value => typeof value === 'string' && REF.test(value);
const id = value => typeof value === 'string' && ID.test(value);
const iso = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString().replace('.000Z', 'Z') === value;

function sameDigest(left, right) {
  if (!digest(left) || !digest(right)) return false;
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

function canonical(value) {
  return JSON.stringify(value);
}

function forbiddenKeyPresent(value) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(forbiddenKeyPresent);
  return Object.keys(value).some(key => FORBIDDEN_RECEIPT_KEYS.includes(key)
    || forbiddenKeyPresent(value[key]));
}

function validWindow(window) {
  if (!window || typeof window !== 'object' || Array.isArray(window)) return false;
  if (!iso(window.startUtc) || !iso(window.expiresUtc)) return false;
  const start = Date.parse(window.startUtc);
  const expires = Date.parse(window.expiresUtc);
  return expires > start
    && expires - start <= 30 * 60 * 1000
    && window.startInclusiveExpiryExclusive === true;
}

function validPrincipal(principal) {
  return principal && typeof principal === 'object' && !Array.isArray(principal)
    && principal.schemaVersion === 1
    && id(principal.userId)
    && id(principal.shopId)
    && principal.sessionId === SESSION_REF
    && principal.cadUploadAllowed === true;
}

function validValidatorEnvelope(envelope) {
  return JSON.stringify(envelope) === JSON.stringify(VALIDATOR_ENVELOPE);
}

function createControlledInternalUploadCommandCard({
  currentDeploymentReference = SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  openingWindow = SOURCE_ONLY_PROOF_WINDOW,
} = {}) {
  return Object.freeze({
    schemaVersion: 1,
    artifact: COMMAND_CARD_ARTIFACT,
    sourceOnly: true,
    issuedForLiveExecution: false,
    productionUploadActivationAuthorized: false,
    requestBodyAdmissionReadAuthorized: false,
    productionOrigin: PRODUCTION_ALIAS,
    productionRoute: ROUTE,
    cohortRef: COHORT_REF,
    sessionId: SESSION_REF,
    productionDeploymentReference: currentDeploymentReference,
    openingWindow,
    validatorEnvelope: VALIDATOR_ENVELOPE,
    ceilings: Object.freeze({
      concurrentSessions: 1,
      uploadAttempts: 1,
      retries: 0,
      secondLiveRuns: 0,
    }),
    liveExecutionControls: Object.freeze({
      independentExpiryCheckBeforeEveryEffect: true,
      oneSessionOneAttemptFenceRequired: true,
      rollbackFirstControlsRequired: true,
      rollbackArmedBeforeBodyAdmission: true,
      postRollbackFailClosedSmokeRequired: true,
      unknownOutcomeStopsWithoutRetry: true,
      sanitizedReceiptRequired: true,
    }),
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    durableProjectHistoryAuthorized: false,
    privateCadUseAuthorized: false,
    externalMessagesAuthorized: false,
    realUserCommercializationAuthorized: false,
    commercialReadinessClaim: false,
  });
}

function createControlledInternalUploadActivationManifest({
  activationEnabled = false,
  currentDeploymentReference = SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  openingWindow = SOURCE_ONLY_PROOF_WINDOW,
} = {}) {
  const commandCard = createControlledInternalUploadCommandCard({
    currentDeploymentReference,
    openingWindow,
  });
  const commandCardBytes = canonical(commandCard);
  const commandCardSha256 = shaBytes(commandCardBytes);
  const installationCore = Object.freeze({
    schemaVersion: 1,
    artifact: MANIFEST_ARTIFACT,
    sourceOnly: true,
    activationEnabled: activationEnabled === true,
    defaultProductionClosed: true,
    productionUploadActivationAuthorizedNow: false,
    requestBodyAdmissionReadAuthorizedNow: false,
    route: ROUTE,
    cohortRef: COHORT_REF,
    sessionId: SESSION_REF,
    currentDeploymentReference,
    openingWindow,
    commandCardSha256,
    validatorEnvelope: VALIDATOR_ENVELOPE,
    oneSessionOneAttemptFenceRequired: true,
    independentExpiryCheckBeforeEveryEffect: true,
    rollbackFirstControlsRequired: true,
    rollbackArmedBeforeBodyAdmission: true,
    postRollbackFailClosedSmokeRequired: true,
    sanitizedReceiptsRequired: true,
    cadBytesReceiptAuthorized: false,
    privateFileNameReceiptAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    durableProjectHistoryAuthorized: false,
    privateCadUseAuthorized: false,
    retryAuthorized: false,
    secondLiveRunAuthorized: false,
    externalMessagesAuthorized: false,
    realUserCommercializationAuthorized: false,
    commercialReadinessClaim: false,
  });
  const installationSha256 = shaJson(installationCore);
  return Object.freeze({
    ...installationCore,
    commandCardBytes,
    installationSha256,
  });
}

function reviewControlledInternalUploadActivationManifest({
  manifest,
  currentDeploymentReference = SOURCE_OWNED_DEPLOYMENT_REFERENCE,
} = {}) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return deny('CONTROLLED_UPLOAD_ACTIVATION_MANIFEST_MISSING', { bindingAccepted: false });
  }
  const commandCard = (() => {
    try {
      return JSON.parse(manifest.commandCardBytes);
    } catch {
      return null;
    }
  })();
  const manifestForHash = { ...manifest };
  delete manifestForHash.commandCardBytes;
  delete manifestForHash.installationSha256;
  const commandCardMatches = commandCard
    && commandCard.artifact === COMMAND_CARD_ARTIFACT
    && commandCard.sourceOnly === true
    && commandCard.issuedForLiveExecution === false
    && commandCard.productionUploadActivationAuthorized === false
    && commandCard.requestBodyAdmissionReadAuthorized === false
    && commandCard.productionDeploymentReference === manifest.currentDeploymentReference
    && commandCard.productionRoute === ROUTE
    && commandCard.cohortRef === COHORT_REF
    && commandCard.sessionId === SESSION_REF
    && validWindow(commandCard.openingWindow)
    && validValidatorEnvelope(commandCard.validatorEnvelope)
    && sameDigest(manifest.commandCardSha256, shaBytes(manifest.commandCardBytes))
    && sameDigest(manifest.commandCardSha256, shaJson(commandCard));
  const manifestMatches = manifest.schemaVersion === 1
    && manifest.artifact === MANIFEST_ARTIFACT
    && manifest.sourceOnly === true
    && manifest.defaultProductionClosed === true
    && manifest.productionUploadActivationAuthorizedNow === false
    && manifest.requestBodyAdmissionReadAuthorizedNow === false
    && manifest.route === ROUTE
    && manifest.cohortRef === COHORT_REF
    && manifest.sessionId === SESSION_REF
    && ref(manifest.currentDeploymentReference)
    && manifest.currentDeploymentReference === currentDeploymentReference
    && validWindow(manifest.openingWindow)
    && validValidatorEnvelope(manifest.validatorEnvelope)
    && manifest.oneSessionOneAttemptFenceRequired === true
    && manifest.independentExpiryCheckBeforeEveryEffect === true
    && manifest.rollbackFirstControlsRequired === true
    && manifest.rollbackArmedBeforeBodyAdmission === true
    && manifest.postRollbackFailClosedSmokeRequired === true
    && manifest.sanitizedReceiptsRequired === true
    && manifest.cadBytesReceiptAuthorized === false
    && manifest.privateFileNameReceiptAuthorized === false
    && manifest.conversionAuthorized === false
    && manifest.sandboxDispatchAuthorized === false
    && manifest.durableProjectHistoryAuthorized === false
    && manifest.privateCadUseAuthorized === false
    && manifest.retryAuthorized === false
    && manifest.secondLiveRunAuthorized === false
    && manifest.externalMessagesAuthorized === false
    && manifest.realUserCommercializationAuthorized === false
    && manifest.commercialReadinessClaim === false
    && sameDigest(manifest.installationSha256, shaJson(manifestForHash))
    && !forbiddenKeyPresent(manifest);
  const bindingAccepted = !!(commandCardMatches && manifestMatches);
  return Object.freeze({
    ...deny(bindingAccepted
      ? 'CONTROLLED_UPLOAD_ACTIVATION_MANIFEST_ACCEPTED_DEFAULT_CLOSED'
      : 'CONTROLLED_UPLOAD_ACTIVATION_MANIFEST_REJECTED'),
    bindingAccepted,
    activationEnabled: manifest.activationEnabled === true,
    currentDeploymentRechecked: manifest.currentDeploymentReference === currentDeploymentReference,
    commandCardSha256: bindingAccepted ? manifest.commandCardSha256 : null,
    installationSha256: bindingAccepted ? manifest.installationSha256 : null,
    openingWindow: bindingAccepted ? manifest.openingWindow : null,
    validatorEnvelopeAccepted: bindingAccepted,
  });
}

function createControlledInternalUploadActivationReview() {
  const disabledManifest = createControlledInternalUploadActivationManifest();
  const review = reviewControlledInternalUploadActivationManifest({ manifest: disabledManifest });
  return Object.freeze({
    schemaVersion: 1,
    artifact: IMPLEMENTATION_ARTIFACT,
    sourceOnly: true,
    status: review.bindingAccepted
      ? 'CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_IMPLEMENTATION_READY_SOURCE_ONLY'
      : 'CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_IMPLEMENTATION_BLOCKED',
    boundApproval: Object.freeze({
      postMergeDecisionRebindRefreshSha256: POST_MERGE_DECISION_REBIND_REFRESH_SHA256,
      currentProductionDeploymentBindingSha256:
        CURRENT_PRODUCTION_DEPLOYMENT_BINDING_SHA256,
      mainCommit: MAIN_COMMIT,
      controlledInternalUploadActivationDecisionPacketSha256:
        DECISION_PACKET_SHA256,
      controlledInternalUploadActivationDecisionSourceCommit:
        DECISION_SOURCE_COMMIT,
      githubProductionDeployment: GITHUB_PRODUCTION_DEPLOYMENT,
      productionTarget: PRODUCTION_TARGET,
      productionAlias: PRODUCTION_ALIAS,
      sourceOwnedDeploymentReference: SOURCE_OWNED_DEPLOYMENT_REFERENCE,
      failClosedSmokeObservedBeforeUtc: FAIL_CLOSED_SMOKE_OBSERVED_BEFORE_UTC,
    }),
    controlledActivationPath: Object.freeze({
      manifestDriven: true,
      defaultProductionClosed: true,
      defaultActivationEnabled: CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_ENABLED,
      routeBodyGateInterface: 'server/cadUserUploadRouter.js#routeBodyGate.authorizeBodyRead',
      noRouteConstantChange: true,
      proofWindowIsSourceOnly: true,
      disabledManifest,
      disabledManifestReview: review,
      forwardEffects: FORWARD_EFFECTS,
      cleanupEffects: CLEANUP_EFFECTS,
    }),
    validatorEnvelope: VALIDATOR_ENVELOPE,
    boundedControls: Object.freeze({
      cohortRef: COHORT_REF,
      sessionRef: SESSION_REF,
      uploadAttempts: 1,
      concurrentSessions: 1,
      retries: 0,
      secondLiveRun: false,
      independentExpiryCheckBeforeEveryEffect: true,
      rollbackFirstControls: true,
      rollbackArmedBeforeBodyAdmission: true,
      postRollbackFailClosedSmoke: true,
      sanitizedReceiptsNoCadBytes: true,
      sanitizedReceiptsNoPrivateFileNames: true,
    }),
    authorizes: Object.freeze({
      sourceOnlyDocsTestsCheckersManifests: true,
      localValidation: true,
      productionUploadActivation: false,
      requestBodyAdmissionOrRead: false,
      privateCredentialRead: false,
      uploadSessionIssuance: false,
      conversionDispatch: false,
      sandboxDispatch: false,
      privateCadUse: false,
      runtimeInstallationActivation: false,
      executableCommandCardIssuance: false,
      externalMessages: false,
      realUserCommercialization: false,
      commercialReadinessClaim: false,
    }),
    nextGate: Object.freeze({
      requiresPublicReviewMergeAndProductionSmoke: true,
      requiresPostMergeImplementationRebindRefresh: true,
      approvalPhraseTemplate:
        'I approve a bounded source-only/no-live CAD Auth post-merge controlled internal upload activation implementation deployment rebind refresh for ReversR-Rebuild at main commit <postMergeMainCommit>, bound to controlled internal upload activation implementation packet SHA-256 <controlledInternalUploadActivationImplementationPacketSha256> at source commit <controlledInternalUploadActivationImplementationSourceCommit>, production deployment <currentProductionDeploymentReference>, production target <currentProductionTarget>, and fail-closed smoke 401 USER_SESSION_REQUIRED observed at <smokeObservedAtUtc>. Scope: verify the deployed source remains default-closed and proves the manifest-driven controlled internal upload body-admission path, IGES-only validator envelope, one cohort, one session, one upload attempt, no retry, independent expiry checks before every effect, rollback-first controls, post-rollback fail-closed smoke, sanitized receipts with no CAD bytes or private file names, current-production deployment binding, and exact later live activation approval phrase without runtime activation. No repo changes, deployment, provider/env/resource/billing changes, secrets or secret reads, private credential reads, upload-session issuance, production upload activation, request-body admission/read beyond fail-closed smoke, conversion, Sandbox dispatch, private CAD use, runtime installation activation, executable command-card issuance, external messages, live retry, second live run, real-user commercialization, or commercial-readiness claim. Stop on stale deployment binding, unresolved controlled activation implementation path, unresolved digest, request-body admission/read trigger, private credential leakage risk, missing rollback-first controls, missing IGES-only validator preservation, unknown outcome, or any need for runtime credentials/provider configuration.',
    }),
  });
}

function contextFor(manifest, principal) {
  return Object.freeze({
    manifestArtifact: manifest.artifact,
    commandCardSha256: manifest.commandCardSha256,
    installationSha256: manifest.installationSha256,
    deploymentReference: manifest.currentDeploymentReference,
    route: ROUTE,
    cohortRef: COHORT_REF,
    sessionId: principal.sessionId,
    userId: principal.userId,
    shopId: principal.shopId,
    startUtc: manifest.openingWindow.startUtc,
    expiresUtc: manifest.openingWindow.expiresUtc,
    maxSessions: 1,
    maxAttempts: 1,
    retries: 0,
    secondRuns: 0,
    bodyReadAuthorized: false,
  });
}

function clockCheck(now, context, cleanup = false) {
  const stamp = now();
  const valid = Number.isFinite(stamp);
  const inWindow = valid && stamp >= Date.parse(context.startUtc)
    && stamp < Date.parse(context.expiresUtc);
  if (!cleanup && (!valid || !inWindow)) throw Error('WINDOW_OR_CLOCK_INVALID');
  return Object.freeze({ checkedAtMs: valid ? stamp : null, inWindow, clockValid: valid });
}

function receiptValid(receipt, operation, context) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)
    || receipt.ok !== true
    || receipt.operation !== operation
    || receipt.commandCardSha256 !== context.commandCardSha256
    || receipt.installationSha256 !== context.installationSha256
    || receipt.deploymentReference !== context.deploymentReference
    || receipt.sessionId !== context.sessionId
    || receipt.cohortRef !== context.cohortRef
    || forbiddenKeyPresent(receipt)) return false;
  if (MUTATIONS.has(operation)
    && (receipt.durable !== true || receipt.expiryCheckedAtomically !== true)) return false;
  if (operation === 'verifyCurrentDeployment' && receipt.currentDeploymentVerified !== true) return false;
  if (operation === 'verifyCommandCardBinding' && receipt.bindingVerified !== true) return false;
  if (operation === 'verifyClosedBaseline'
    && (receipt.failClosed !== true || receipt.bodyReads !== 0 || receipt.uploadActivations !== 0)) return false;
  if (operation === 'claimRun' && receipt.claimed !== true) return false;
  if (operation === 'verifyBoundedSession'
    && (receipt.bounded !== true || receipt.concurrentSessions !== 1)) return false;
  if (operation === 'claimAttempt' && receipt.claimed !== true) return false;
  if (operation === 'armRollback'
    && (receipt.armed !== true || receipt.beforeBodyAdmission !== true)) return false;
  if (operation === 'openBodyAdmissionFence'
    && (receipt.open !== true || receipt.conversionAuthorized !== false
      || receipt.sandboxDispatchAuthorized !== false)) return false;
  if (operation === 'consumeAttemptBeforeBodyRead' && receipt.consumed !== true) return false;
  if (operation === 'closeBodyAdmissionFence' && (receipt.closed !== true || receipt.durable !== true)) return false;
  if (operation === 'revokeSessionAndLateGrants' && (receipt.revoked !== true || receipt.durable !== true)) return false;
  if (operation === 'postRollbackFailClosedSmoke'
    && (receipt.failClosed !== true || receipt.status !== 401
      || receipt.code !== 'USER_SESSION_REQUIRED' || receipt.bodyReads !== 0
      || receipt.fenceClosed !== true)) return false;
  return true;
}

function createCadControlledInternalUploadActivationMount({
  enabled = CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_ENABLED,
  manifest = createControlledInternalUploadActivationManifest(),
  currentDeploymentReference = SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  adapter,
  now = Date.now,
  baseRuntimeMount,
} = {}) {
  const binding = reviewControlledInternalUploadActivationManifest({
    manifest,
    currentDeploymentReference,
  });
  const configured = enabled === true
    && binding.bindingAccepted === true
    && binding.activationEnabled === true
    && adapter
    && METHODS.every(method => typeof adapter[method] === 'function')
    && typeof now === 'function';
  const calls = configured
    ? Object.fromEntries(METHODS.map(method => [method, adapter[method].bind(adapter)]))
    : {};
  let attempted = false;
  let openGate = null;

  async function step(operation, context, cleanup = false) {
    const clock = clockCheck(now, context, cleanup);
    const receipt = await calls[operation](Object.freeze({ ...context, ...clock, cleanup }));
    if (!receiptValid(receipt, operation, context)) throw Error('RECEIPT_REJECTED');
    return operation;
  }

  async function cleanup(context) {
    const failures = [];
    for (const operation of CLEANUP_EFFECTS) {
      try {
        await step(operation, context, true);
      } catch {
        failures.push(operation);
      }
    }
    return Object.freeze(failures);
  }

  const admissionSwitch = Object.freeze({
    runtimeImported: true,
    runtimeMounted: true,
    defaultClosed: true,
    async decide(input = {}) {
      if (baseRuntimeMount?.admissionSwitch?.decide) {
        try {
          await baseRuntimeMount.admissionSwitch.decide(input);
        } catch {
          // Base mount failure stays sanitized and closed.
        }
      }
      if (input.bodyAdmissionAuthorized !== false) return deny('BODY_ADMISSION_MUST_REMAIN_FALSE');
      if (!configured) return deny('CONTROLLED_UPLOAD_ACTIVATION_DISABLED_DEFAULT');
      if (!validPrincipal(input.principal)) return deny('CONTROLLED_UPLOAD_PRINCIPAL_INVALID');
      return Object.freeze({
        ok: true,
        code: 'CONTROLLED_UPLOAD_ACTIVATION_BODY_GATE_READY',
        admissionAuthorized: true,
        bodyReadAuthorized: true,
        routeBodyGateAuthorized: false,
        productionUploadActivationAuthorized: false,
        conversionAuthorized: false,
        sandboxDispatchAuthorized: false,
        durableProjectHistoryAuthorized: false,
        externalEffectAuthorized: false,
      });
    },
  });

  const routeBodyGate = Object.freeze({
    async authorizeBodyRead(input = {}) {
      if (input.bodyAdmissionAuthorized !== false) return deny('BODY_ADMISSION_MUST_REMAIN_FALSE');
      if (!configured) return deny('CONTROLLED_UPLOAD_ACTIVATION_DISABLED_DEFAULT');
      if (attempted) return deny('CONTROLLED_UPLOAD_ATTEMPT_ALREADY_SPENT');
      if (!input.admissionDecision || input.admissionDecision.bodyReadAuthorized !== true) {
        return deny('CONTROLLED_UPLOAD_ADMISSION_SWITCH_NOT_OPEN');
      }
      if (!validPrincipal(input.principal)) return deny('CONTROLLED_UPLOAD_PRINCIPAL_INVALID');
      attempted = true;
      const context = contextFor(manifest, input.principal);
      const completed = [];
      let rollbackRequired = false;
      try {
        for (const operation of FORWARD_EFFECTS) {
          if (MUTATIONS.has(operation)) rollbackRequired = true;
          completed.push(await step(operation, context, false));
        }
        openGate = Object.freeze({ context });
        return Object.freeze({
          ok: true,
          code: 'CONTROLLED_UPLOAD_BODY_ADMISSION_FENCE_OPEN',
          admissionAuthorized: true,
          bodyReadAuthorized: true,
          routeBodyGateAuthorized: true,
          productionUploadActivationAuthorized: false,
          conversionAuthorized: false,
          sandboxDispatchAuthorized: false,
          durableProjectHistoryAuthorized: false,
          retryAuthorized: false,
          secondLiveRunAuthorized: false,
          externalEffectAuthorized: false,
          commandCardSha256: context.commandCardSha256,
          installationSha256: context.installationSha256,
          completed: Object.freeze(completed),
        });
      } catch {
        const cleanupFailures = rollbackRequired ? await cleanup(context) : Object.freeze([]);
        return deny(cleanupFailures.length
          ? 'CONTROLLED_UPLOAD_ROLLBACK_OR_SMOKE_UNKNOWN_NO_RETRY'
          : 'CONTROLLED_UPLOAD_ACTIVATION_STOPPED_NO_RETRY', {
          rollbackRequired,
          rollbackVerified: rollbackRequired && cleanupFailures.length === 0,
          unknownOutcome: true,
          completed: Object.freeze(completed),
          cleanupFailures,
        });
      }
    },
    async afterBodyAdmission() {
      if (!openGate) return deny('CONTROLLED_UPLOAD_NO_OPEN_BODY_GATE');
      const gate = openGate;
      openGate = null;
      const cleanupFailures = await cleanup(gate.context);
      return deny(cleanupFailures.length
        ? 'CONTROLLED_UPLOAD_ROLLBACK_OR_SMOKE_UNKNOWN_NO_RETRY'
        : 'CONTROLLED_UPLOAD_POST_ROLLBACK_FAIL_CLOSED_SMOKE_PASSED', {
        rollbackRequired: true,
        rollbackVerified: cleanupFailures.length === 0,
        unknownOutcome: cleanupFailures.length > 0,
        cleanupFailures,
      });
    },
  });

  return Object.freeze({
    ...(baseRuntimeMount || {}),
    controlledInternalUploadActivationMounted: true,
    enabled,
    defaultClosed: true,
    bodyAdmissionAuthorized: false,
    productionUploadActivationAuthorized: false,
    requestBodyAdmissionReadAuthorized: false,
    uploadSessionIssuanceAuthorized: false,
    runtimeInstallationActivationAuthorized: false,
    executableCommandCardIssuanceAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    durableProjectHistoryAuthorized: false,
    privateCadUseAuthorized: false,
    externalMessagesAuthorized: false,
    retryAuthorized: false,
    secondLiveRunAuthorized: false,
    realUserCommercializationAuthorized: false,
    commercialReadinessClaim: false,
    effectsExecuted: 0,
    binding,
    admissionSwitch,
    routeBodyGate,
  });
}

module.exports = {
  CLEANUP_EFFECTS,
  COHORT_REF,
  COMMAND_CARD_ARTIFACT,
  CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_ENABLED,
  CURRENT_PRODUCTION_DEPLOYMENT_BINDING_SHA256,
  DECISION_PACKET_SHA256,
  DECISION_SOURCE_COMMIT,
  FAIL_CLOSED_SMOKE_OBSERVED_BEFORE_UTC,
  FORWARD_EFFECTS,
  GITHUB_PRODUCTION_DEPLOYMENT,
  IMPLEMENTATION_ARTIFACT,
  MAIN_COMMIT,
  MANIFEST_ARTIFACT,
  METHODS,
  POST_MERGE_DECISION_REBIND_REFRESH_SHA256,
  PRODUCTION_ALIAS,
  PRODUCTION_TARGET,
  ROUTE,
  SESSION_REF,
  SOURCE_ONLY_PROOF_WINDOW,
  SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  VALIDATOR_ENVELOPE,
  createCadControlledInternalUploadActivationMount,
  createControlledInternalUploadActivationManifest,
  createControlledInternalUploadActivationReview,
  createControlledInternalUploadCommandCard,
  forbiddenKeyPresent,
  reviewControlledInternalUploadActivationManifest,
};
