const { createHash, timingSafeEqual } = require('node:crypto');
const {
  createCadLiveOpeningRuntimeMount,
  PRODUCTION_ORIGIN,
  PRODUCTION_ROUTE,
  INTERNAL_COHORT_REF,
} = require('./cadLiveOpeningRuntimeMount');

const LIVE_OPENING_EXECUTABLE_RUNTIME_WIRING_ENABLED = false;
const EXECUTABLE_COMMAND_CARD_ARTIFACT = 'cad-auth-live-opening-executable-command-card-v1';
const RUN_FENCE_KEY = 'cad-production-internal-opening-v1';
const FORWARD_EFFECTS = Object.freeze([
  'verifyApproval',
  'verifyDurableEvidence',
  'recheckDeployment',
  'verifyClosedBaseline',
  'claimRun',
  'armRollback',
  'verifySession',
  'claimAttempt',
  'recheckDeployment',
  'openFence',
  'consumeAttempt',
]);
const CLEANUP_EFFECTS = Object.freeze([
  'closeFence',
  'revokeSessionAndLateGrants',
  'postRollbackSmoke',
]);
const METHODS = Object.freeze([
  'verifyApproval',
  'verifyDurableEvidence',
  'recheckDeployment',
  'verifyClosedBaseline',
  'claimRun',
  'armRollback',
  'verifySession',
  'claimAttempt',
  'openFence',
  'consumeAttempt',
  ...CLEANUP_EFFECTS,
]);
const MUTATIONS = new Set(['claimRun', 'armRollback', 'claimAttempt', 'openFence', 'consumeAttempt']);
const SHA = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

const closed = (code, extra = {}) => Object.freeze({
  ok: false,
  code,
  admissionAuthorized: false,
  bodyReadAuthorized: false,
  routeBodyGateAuthorized: false,
  conversionAuthorized: false,
  sandboxDispatchAuthorized: false,
  retryAuthorized: false,
  secondLiveRunAuthorized: false,
  externalEffectAuthorized: false,
  ...extra,
});
const shaJson = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const shaBytes = value => createHash('sha256').update(value).digest('hex');
const digest = value => typeof value === 'string' && SHA.test(value);
const id = value => typeof value === 'string' && ID.test(value);
const ref = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/.test(value);
const iso = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString().replace('.000Z', 'Z') === value;

function safeSameDigest(left, right) {
  if (!digest(left) || !digest(right)) return false;
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

function validWindow(window) {
  if (!window || typeof window !== 'object' || Array.isArray(window)) return false;
  if (!iso(window.startUtc) || !iso(window.expiresUtc)) return false;
  const start = Date.parse(window.startUtc);
  const expires = Date.parse(window.expiresUtc);
  return expires > start && expires - start <= 30 * 60 * 1000
    && window.startInclusiveExpiryExclusive === true;
}

function validPrincipal(principal) {
  return principal && typeof principal === 'object' && !Array.isArray(principal)
    && principal.schemaVersion === 1
    && id(principal.userId)
    && id(principal.shopId)
    && id(principal.sessionId)
    && principal.cadUploadAllowed === true;
}

function parseCommandCard(commandCardBytes) {
  if (typeof commandCardBytes !== 'string' || commandCardBytes.length > 65536) return null;
  try {
    const card = JSON.parse(commandCardBytes);
    return card && typeof card === 'object' && !Array.isArray(card) ? card : null;
  } catch {
    return null;
  }
}

function validExecutableCommandCard(card) {
  return card && typeof card === 'object' && !Array.isArray(card)
    && card.schemaVersion === 1
    && card.artifact === EXECUTABLE_COMMAND_CARD_ARTIFACT
    && card.sourceOnly === false
    && card.executable === true
    && card.issued === true
    && card.authorizedForLiveUse === true
    && card.productionUploadAdmissionOpeningAuthorized === true
    && card.uploadSessionIssuanceEnabled === false
    && card.requestBodyAdmissionReadAuthorized === true
    && card.conversionAuthorized === false
    && card.sandboxDispatchAuthorized === false
    && card.privateCadUseAuthorized === false
    && card.externalMessagesAuthorized === false
    && card.retryAuthorized === false
    && card.secondLiveRunAuthorized === false
    && ref(card.productionDeploymentReference)
    && card.productionOrigin === PRODUCTION_ORIGIN
    && card.productionRoute === PRODUCTION_ROUTE
    && card.cohortRef === INTERNAL_COHORT_REF
    && id(card.sessionId)
    && validWindow(card.openingWindow)
    && card.ceilings
    && card.ceilings.concurrentSessions === 1
    && card.ceilings.uploadAttempts === 1
    && card.ceilings.retries === 0
    && card.ceilings.secondLiveRuns === 0
    && card.liveExecutionControls
    && card.liveExecutionControls.independentExpiryCheckBeforeEveryEffect === true
    && card.liveExecutionControls.atomicDurableRunClaimRequired === true
    && card.liveExecutionControls.atomicDurableAttemptClaimRequired === true
    && card.liveExecutionControls.rollbackImmediatelyAfterWindow === true
    && card.liveExecutionControls.postRollbackFailClosedSmokeRequired === true
    && card.liveExecutionControls.unknownOutcomeStopsWithoutRetry === true
    && digest(card.durableEvidenceSha256);
}

function reviewExecutableCommandCardBinding({
  commandCardBytes,
  commandCardSha256,
  currentDeploymentReference,
} = {}) {
  const card = parseCommandCard(commandCardBytes);
  if (!validExecutableCommandCard(card)) {
    return { ...closed('EXECUTABLE_COMMAND_CARD_INVALID'), bindingAccepted: false };
  }
  const byteDigest = shaBytes(commandCardBytes);
  const canonicalDigest = shaJson(card);
  const digestMatches = safeSameDigest(commandCardSha256, byteDigest)
    && safeSameDigest(commandCardSha256, canonicalDigest);
  const currentDeploymentRechecked = ref(currentDeploymentReference)
    && currentDeploymentReference === card.productionDeploymentReference;
  return Object.freeze({
    ...closed(digestMatches && currentDeploymentRechecked
      ? 'EXECUTABLE_RUNTIME_WIRING_READY_DISABLED_BY_DEFAULT'
      : 'EXECUTABLE_COMMAND_CARD_BINDING_INVALID'),
    bindingAccepted: digestMatches && currentDeploymentRechecked,
    commandCard: card,
    commandCardSha256: byteDigest,
    currentDeploymentRechecked,
    oneSessionOneAttemptFenceRequired: true,
    independentExpiryBeforeEveryEffectRequired: true,
    rollbackFirstControlsRequired: true,
    postRollbackFailClosedSmokeRequired: true,
  });
}

function createCadLiveOpeningExecutableRuntimeWiring({
  enabled = LIVE_OPENING_EXECUTABLE_RUNTIME_WIRING_ENABLED,
  commandCardBytes,
  commandCardSha256,
  currentDeploymentReference,
  adapter,
  now = Date.now,
  baseRuntimeMount,
} = {}) {
  const baseMount = baseRuntimeMount || createCadLiveOpeningRuntimeMount();
  const binding = reviewExecutableCommandCardBinding({
    commandCardBytes,
    commandCardSha256,
    currentDeploymentReference,
  });
  const configured = binding.bindingAccepted === true
    && adapter
    && METHODS.every(name => typeof adapter[name] === 'function')
    && typeof now === 'function';
  const calls = configured
    ? Object.fromEntries(METHODS.map(name => [name, adapter[name].bind(adapter)]))
    : {};
  let attempted = false;
  let openGate = null;

  function contextFor(principal) {
    const card = binding.commandCard;
    return Object.freeze({
      runFenceKey: RUN_FENCE_KEY,
      commandCardSha256: binding.commandCardSha256,
      durableEvidenceSha256: card.durableEvidenceSha256,
      deploymentReference: card.productionDeploymentReference,
      origin: card.productionOrigin,
      route: card.productionRoute,
      cohortRef: card.cohortRef,
      sessionId: principal.sessionId,
      userId: principal.userId,
      shopId: principal.shopId,
      startUtc: card.openingWindow.startUtc,
      expiresUtc: card.openingWindow.expiresUtc,
      maxSessions: 1,
      maxAttempts: 1,
      retries: 0,
      secondRuns: 0,
      bodyReadAuthorized: false,
    });
  }

  function clockCheck(context, cleanup = false) {
    const stamp = now();
    const valid = Number.isFinite(stamp);
    const inWindow = valid && stamp >= Date.parse(context.startUtc)
      && stamp < Date.parse(context.expiresUtc);
    if (!cleanup && (!valid || !inWindow)) throw Error('WINDOW_OR_CLOCK_INVALID');
    return { checkedAtMs: valid ? stamp : null, inWindow, clockValid: valid };
  }

  function receiptValid(receipt, operation, context) {
    if (!receipt || receipt.ok !== true || receipt.operation !== operation
      || receipt.commandCardSha256 !== context.commandCardSha256
      || receipt.deploymentReference !== context.deploymentReference
      || receipt.sessionId !== context.sessionId
      || receipt.runFenceKey !== RUN_FENCE_KEY) return false;
    if (MUTATIONS.has(operation) && (receipt.durable !== true || receipt.expiryCheckedAtomically !== true)) return false;
    if (operation === 'verifyApproval' && (receipt.explicitLiveGateApproved !== true
      || receipt.startUtc !== context.startUtc || receipt.expiresUtc !== context.expiresUtc
      || receipt.cohortRef !== context.cohortRef)) return false;
    if (operation === 'verifyDurableEvidence' && (receipt.evidenceSha256 !== context.durableEvidenceSha256
      || receipt.independentExpiryEnforced !== true || receipt.atomicClaims !== true
      || receipt.durableRollbackEnforced !== true)) return false;
    if (operation === 'recheckDeployment' && receipt.immutableCurrent !== true) return false;
    if (operation === 'verifyClosedBaseline' && receipt.failClosed !== true) return false;
    if (operation === 'claimRun' && receipt.claimed !== true) return false;
    if (operation === 'armRollback' && (receipt.armed !== true || receipt.expiresUtc !== context.expiresUtc)) return false;
    if (operation === 'verifySession' && (receipt.bounded !== true
      || receipt.cohortRef !== context.cohortRef || receipt.expiresUtc !== context.expiresUtc
      || receipt.concurrentSessions !== 1)) return false;
    if (operation === 'claimAttempt' && receipt.claimed !== true) return false;
    if (operation === 'openFence' && (receipt.open !== true || receipt.expiresUtc !== context.expiresUtc)) return false;
    if (operation === 'consumeAttempt' && receipt.consumed !== true) return false;
    if (operation === 'closeFence' && (receipt.closed !== true || receipt.durable !== true)) return false;
    if (operation === 'revokeSessionAndLateGrants' && (receipt.revoked !== true || receipt.durable !== true)) return false;
    if (operation === 'postRollbackSmoke' && (receipt.failClosed !== true || receipt.bodyReads !== 0
      || receipt.sessionGrants !== 0 || receipt.fenceClosed !== true)) return false;
    return true;
  }

  async function step(operation, context, cleanup = false) {
    const clock = clockCheck(context, cleanup);
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
    return failures;
  }

  const admissionSwitch = Object.freeze({
    runtimeImported: true,
    runtimeMounted: true,
    defaultClosed: true,
    async decide(input = {}) {
      try {
        if (baseMount?.admissionSwitch?.decide) await baseMount.admissionSwitch.decide(input);
      } catch {
        // Base switch failure remains sanitized and closed.
      }
      if (enabled !== true) return closed('EXECUTABLE_RUNTIME_WIRING_DISABLED');
      if (!configured) return closed('EXECUTABLE_RUNTIME_WIRING_INPUTS_INVALID');
      if (input.bodyAdmissionAuthorized !== false) return closed('BODY_ADMISSION_MUST_REMAIN_FALSE');
      if (!validPrincipal(input.principal)) return closed('PRINCIPAL_INVALID');
      if (input.principal.sessionId !== binding.commandCard.sessionId) return closed('SESSION_BINDING_MISMATCH');
      return Object.freeze({
        ok: true,
        code: 'EXECUTABLE_RUNTIME_BODY_GATE_READY',
        admissionAuthorized: true,
        bodyReadAuthorized: true,
        routeBodyGateAuthorized: false,
        conversionAuthorized: false,
        sandboxDispatchAuthorized: false,
        storeMutationAuthorized: false,
        externalEffectAuthorized: false,
      });
    },
  });

  const routeBodyGate = Object.freeze({
    async authorizeBodyRead(input = {}) {
      if (enabled !== true) return closed('EXECUTABLE_RUNTIME_WIRING_DISABLED');
      if (!configured) return closed('EXECUTABLE_RUNTIME_WIRING_INPUTS_INVALID');
      if (attempted) return closed('ATTEMPT_ALREADY_SPENT');
      if (input.bodyAdmissionAuthorized !== false) return closed('BODY_ADMISSION_MUST_REMAIN_FALSE');
      if (!input.admissionDecision || input.admissionDecision.bodyReadAuthorized !== true) {
        return closed('ADMISSION_SWITCH_NOT_OPEN');
      }
      if (!validPrincipal(input.principal)) return closed('PRINCIPAL_INVALID');
      if (input.principal.sessionId !== binding.commandCard.sessionId) return closed('SESSION_BINDING_MISMATCH');
      attempted = true;
      const context = contextFor(input.principal);
      let rollbackRequired = false;
      const completed = [];
      try {
        for (const operation of FORWARD_EFFECTS) {
          const completedOperation = await step(operation, context, false);
          completed.push(completedOperation);
          if (operation === 'armRollback') rollbackRequired = true;
        }
        openGate = Object.freeze({ context, completed: Object.freeze(completed), rollbackRequired });
        return Object.freeze({
          ok: true,
          code: 'EXECUTABLE_RUNTIME_BODY_GATE_OPEN',
          admissionAuthorized: true,
          bodyReadAuthorized: true,
          routeBodyGateAuthorized: true,
          conversionAuthorized: false,
          sandboxDispatchAuthorized: false,
          retryAuthorized: false,
          secondLiveRunAuthorized: false,
          externalEffectAuthorized: false,
          commandCardSha256: context.commandCardSha256,
          completed: Object.freeze(completed),
        });
      } catch {
        const cleanupFailures = rollbackRequired ? await cleanup(context) : [];
        return closed(cleanupFailures.length ? 'ROLLBACK_OR_SMOKE_UNKNOWN_NO_RETRY'
          : 'EXECUTABLE_RUNTIME_WIRING_STOPPED_NO_RETRY', {
          rollbackRequired,
          rollbackVerified: rollbackRequired && cleanupFailures.length === 0,
          unknownOutcome: true,
          completed: Object.freeze(completed),
          cleanupFailures: Object.freeze(cleanupFailures),
        });
      }
    },
    async afterBodyAdmission() {
      if (!openGate) return closed('NO_OPEN_BODY_GATE');
      const gate = openGate;
      openGate = null;
      const cleanupFailures = await cleanup(gate.context);
      return closed(cleanupFailures.length ? 'ROLLBACK_OR_SMOKE_UNKNOWN_NO_RETRY'
        : 'BODY_GATE_CLOSED_POST_ROLLBACK_SMOKE_PASSED', {
        rollbackRequired: true,
        rollbackVerified: cleanupFailures.length === 0,
        unknownOutcome: cleanupFailures.length > 0,
        cleanupFailures: Object.freeze(cleanupFailures),
      });
    },
  });

  return Object.freeze({
    ...baseMount,
    executableRuntimeWiringMounted: true,
    enabled,
    defaultClosed: true,
    bodyAdmissionAuthorized: false,
    uploadSessionIssuanceAuthorized: false,
    productionUploadActivationAuthorized: false,
    requestBodyAdmissionReadAuthorized: false,
    executableCommandCardIssuanceAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    privateCadUseAuthorized: false,
    retryAuthorized: false,
    secondLiveRunAuthorized: false,
    realUserCommercializationAuthorized: false,
    externalMessagesAuthorized: false,
    effectsExecuted: 0,
    binding,
    admissionSwitch,
    routeBodyGate,
  });
}

module.exports = {
  LIVE_OPENING_EXECUTABLE_RUNTIME_WIRING_ENABLED,
  EXECUTABLE_COMMAND_CARD_ARTIFACT,
  RUN_FENCE_KEY,
  FORWARD_EFFECTS,
  CLEANUP_EFFECTS,
  METHODS,
  reviewExecutableCommandCardBinding,
  createCadLiveOpeningExecutableRuntimeWiring,
};
