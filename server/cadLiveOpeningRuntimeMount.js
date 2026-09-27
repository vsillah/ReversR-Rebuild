const { createHash, timingSafeEqual } = require('node:crypto');
const { createCadInternalProductionAdmissionSwitch } = require('./cadInternalProductionAdmissionSwitch');

const LIVE_OPENING_RUNTIME_MOUNT_ENABLED = false;
const COMMAND_CARD_ARTIFACT = 'cad-auth-live-opening-command-card-digest-draft-v1';
const PRODUCTION_ORIGIN = 'https://reversr.vercel.app';
const PRODUCTION_ROUTE = 'POST /api/cad/user-import';
const INTERNAL_COHORT_REF = 'rrb-ref:cad-upload-internal-mark-test-cohort-v1';
const REQUIRED_PRECHECKS = Object.freeze([
  'freshApprovalReviewReceipt',
  'immutableTargetReceipt',
  'closedBaselineReceipt',
  'adapterSourceReviewReceipt',
  'independentExpiryReceipt',
  'atomicLedgerReceipt',
  'sessionAdmissionReceipt',
  'rollbackSmokeReceipt',
]);
const EFFECT_ORDER = Object.freeze([
  'verifyFreshApproval',
  'recheckImmutableCurrentDeployment',
  'verifyClosedBaseline',
  'verifyCommandCardDigest',
  'claimAtomicRun',
  'verifyBoundedSession',
  'claimAtomicAttempt',
  'openAdmissionFence',
  'consumeAttemptBeforeBodyRead',
  'closeAdmissionFence',
  'revokeBoundedSessionAndLateGrants',
  'runPostRollbackFailClosedSmoke',
]);

const disabledDecision = code => Object.freeze({
  ok: false,
  code,
  admissionAuthorized: false,
  bodyReadAuthorized: false,
  conversionAuthorized: false,
  sandboxDispatchAuthorized: false,
  storeMutationAuthorized: false,
  externalEffectAuthorized: false,
});

const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const ref = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/.test(value);
const time = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString().replace('.000Z', 'Z') === value;

function safeSameDigest(left, right) {
  if (!digest(left) || !digest(right)) return false;
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

function validWindow(window) {
  if (!window || typeof window !== 'object' || Array.isArray(window)) return false;
  if (!time(window.startUtc) || !time(window.expiresUtc)) return false;
  const start = Date.parse(window.startUtc);
  const expires = Date.parse(window.expiresUtc);
  return expires > start && expires - start <= 30 * 60 * 1000
    && window.startInclusiveExpiryExclusive === true;
}

function validCommandCardDraft(card) {
  return card && typeof card === 'object' && !Array.isArray(card)
    && card.schemaVersion === 1
    && card.artifact === COMMAND_CARD_ARTIFACT
    && card.sourceOnly === true
    && card.executable === false
    && card.issued === false
    && card.authorizedForLiveUse === false
    && card.productionUploadAdmissionActivated === false
    && card.uploadSessionIssuanceEnabled === false
    && card.requestBodyAdmissionReadAuthorized === false
    && ref(card.productionDeploymentReference)
    && card.productionOrigin === PRODUCTION_ORIGIN
    && card.productionRoute === PRODUCTION_ROUTE
    && card.cohortRef === INTERNAL_COHORT_REF
    && validWindow(card.openingWindow)
    && card.ceilings
    && card.ceilings.concurrentSessions === 1
    && card.ceilings.uploadAttempts === 1
    && card.ceilings.retries === 0
    && card.ceilings.secondLiveRuns === 0
    && card.ceilings.cadPayloadBodyReadsAuthorizedByThisGate === 0
    && Array.isArray(card.requiredPrechecks)
    && REQUIRED_PRECHECKS.every(key => card.requiredPrechecks.includes(key))
    && card.liveExecutionControls
    && card.liveExecutionControls.independentExpiryCheckBeforeEveryEffect === true
    && card.liveExecutionControls.atomicDurableRunClaimRequired === true
    && card.liveExecutionControls.atomicDurableAttemptClaimRequired === true
    && card.liveExecutionControls.rollbackImmediatelyAfterWindow === true
    && card.liveExecutionControls.postRollbackFailClosedSmokeRequired === true
    && card.liveExecutionControls.unknownOutcomeStopsWithoutRetry === true
    && card.commandMaterial
    && card.commandMaterial.commandLine === null
    && card.commandMaterial.dryRunCommandLine === null
    && card.commandMaterial.executableCommandCard === null
    && card.commandMaterial.runtimeCredentialSource === null
    && card.commandMaterial.providerMutation === null
    && card.commandMaterial.bodyRead === null;
}

function reviewRuntimeMountBinding({
  commandCardDraft,
  commandCardSha256,
  currentDeploymentReference,
} = {}) {
  if (!validCommandCardDraft(commandCardDraft)) {
    return { ...disabledDecision('COMMAND_CARD_BINDING_INVALID'), bindingAccepted: false };
  }
  const computedCommandCardSha256 = sha(commandCardDraft);
  const digestMatches = safeSameDigest(commandCardSha256, computedCommandCardSha256);
  const currentDeploymentRechecked = ref(currentDeploymentReference)
    && currentDeploymentReference === commandCardDraft.productionDeploymentReference;
  return Object.freeze({
    ...disabledDecision(digestMatches && currentDeploymentRechecked
      ? 'LIVE_OPENING_RUNTIME_MOUNT_DISABLED'
      : 'COMMAND_CARD_BINDING_INVALID'),
    bindingAccepted: digestMatches && currentDeploymentRechecked,
    commandCardSha256: computedCommandCardSha256,
    currentDeploymentRechecked,
    oneSessionOneAttemptFenceRequired: true,
    independentExpiryBeforeEveryEffectRequired: true,
    rollbackFirstControlsRequired: true,
    postRollbackFailClosedSmokeRequired: true,
    effectOrder: EFFECT_ORDER,
  });
}

function normalizeAdmissionSwitch(admissionSwitch) {
  if (admissionSwitch === undefined || admissionSwitch === null) {
    return createCadInternalProductionAdmissionSwitch();
  }
  if (typeof admissionSwitch !== 'object' || typeof admissionSwitch.decide !== 'function') {
    return createCadInternalProductionAdmissionSwitch();
  }
  return admissionSwitch;
}

function createCadLiveOpeningRuntimeMount({
  admissionSwitch,
  commandCardDraft,
  commandCardSha256,
  currentDeploymentReference,
} = {}) {
  const baseAdmissionSwitch = normalizeAdmissionSwitch(admissionSwitch);
  const binding = reviewRuntimeMountBinding({
    commandCardDraft,
    commandCardSha256,
    currentDeploymentReference,
  });
  const mountedAdmissionSwitch = Object.freeze({
    runtimeImported: true,
    runtimeMounted: true,
    defaultClosed: true,
    bodyAdmissionAuthorized: false,
    async decide(input = {}) {
      try {
        await baseAdmissionSwitch.decide(input);
      } catch {
        // Preserve sanitized fail-closed behavior regardless of adapter failure.
      }
      if (LIVE_OPENING_RUNTIME_MOUNT_ENABLED !== true) {
        return disabledDecision('LIVE_OPENING_RUNTIME_MOUNT_DISABLED');
      }
      if (input.bodyAdmissionAuthorized !== false) {
        return disabledDecision('BODY_ADMISSION_MUST_REMAIN_FALSE');
      }
      if (binding.bindingAccepted !== true) {
        return disabledDecision('COMMAND_CARD_BINDING_INVALID');
      }
      return disabledDecision('LIVE_OPENING_RUNTIME_MOUNT_DISABLED');
    },
  });
  return Object.freeze({
    runtimeImported: true,
    runtimeMounted: true,
    defaultClosed: true,
    enabled: LIVE_OPENING_RUNTIME_MOUNT_ENABLED,
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
    admissionSwitch: mountedAdmissionSwitch,
  });
}

module.exports = {
  LIVE_OPENING_RUNTIME_MOUNT_ENABLED,
  COMMAND_CARD_ARTIFACT,
  PRODUCTION_ORIGIN,
  PRODUCTION_ROUTE,
  INTERNAL_COHORT_REF,
  REQUIRED_PRECHECKS,
  EFFECT_ORDER,
  reviewRuntimeMountBinding,
  createCadLiveOpeningRuntimeMount,
};
