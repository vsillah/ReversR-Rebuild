const { createCadUploadAdmissionRuntimeBridge } = require('../../server/cadUploadAdmissionRuntimeBridge');
const { emptyState, selectReconciliation, transition } = require('./sharedUploadControls');

function ms(value) {
  const parsed = Date.parse(value);
  if (!Number.isSafeInteger(parsed)) throw new Error('CAD_UPLOAD_DRY_RUN_INVALID_TIME');
  return parsed;
}

function syntheticPolicy(config) {
  const start = ms(config.acceptedWindow.startUtc);
  const end = ms(config.acceptedWindow.expiresUtc);
  return {
    schemaVersion: 1,
    windowId: config.acceptedWindow.runRef,
    windowStart: start,
    windowEnd: end,
    userConcurrency: 1,
    shopConcurrency: 1,
    userAttempts: 1,
    shopAttempts: 1,
    leaseMs: 30000,
    maxReservationMicros: config.costAndUsage.reservationMicros,
    budgetMicros: config.costAndUsage.budgetMicros,
    currency: 'USD',
  };
}

function syntheticBinding(config) {
  return {
    userId: config.syntheticRefs.userId,
    shopId: config.syntheticRefs.shopId,
    sessionId: config.syntheticRefs.sessionId,
    loginSessionId: config.syntheticRefs.loginSessionId,
  };
}

function allFalse(value) {
  return Object.values(value || {}).every(entry => entry === false);
}

function inspectUploadAdmissionDevelopmentDryRunRunner(config) {
  return {
    structureValid: config?.schemaVersion === 1
      && config?.mode === 'source-only-cad-upload-admission-development-dry-run-runner'
      && config?.sourceOnly === true
      && config?.runBounds?.maxAttempts === 1
      && config?.runBounds?.automaticRetry === false
      && config?.runBounds?.secondRun === false
      && config?.runBounds?.stopOnUnknownOutcome === true
      && config?.runBounds?.deleteRetainedState === false
      && config?.runBounds?.bodyAdmissionAuthorized === false
      && config?.runBounds?.cadUploadActivationAuthorized === false
      && config?.runBounds?.cadConversionAuthorized === false
      && config?.runBounds?.sandboxDispatchAuthorized === false
      && config?.runBounds?.privateCadAuthorized === false
      && config?.costAndUsage?.allInPlanningCapUsd === 50
      && config?.sanitizedEvidenceDestination?.gitIgnoredRequired === true
      && config?.sanitizedEvidenceDestination?.directoryMode === '700'
      && config?.sanitizedEvidenceDestination?.fileMode === '600'
      && allFalse(config?.authorityPreservedByThisPacket),
    windowStart: ms(config.acceptedWindow.startUtc),
    windowEnd: ms(config.acceptedWindow.expiresUtc),
  };
}

async function executeUploadAdmissionDevelopmentDryRun({
  config,
  now = Date.now,
  disabledRouteCheck = async input => ({
    ok: true,
    phase: input.phase,
    status: 401,
    code: 'USER_SESSION_REQUIRED',
    bodySubscribed: false,
    uploadsEnabled: false,
    conversionDispatched: false,
    production: false,
  }),
} = {}) {
  const inspected = inspectUploadAdmissionDevelopmentDryRunRunner(config);
  if (!inspected.structureValid) {
    return { decision: 'BLOCKED', code: 'RUNNER_CONFIG_INVALID', runCompleted: false, unknownOutcome: false };
  }
  const current = now();
  if (current < inspected.windowStart || current >= inspected.windowEnd) {
    return {
      decision: 'BLOCKED',
      code: current < inspected.windowStart ? 'WINDOW_NOT_OPEN' : 'WINDOW_EXPIRED',
      runCompleted: false,
      unknownOutcome: false,
      utcNow: new Date(current).toISOString(),
      windowStartUtc: config.acceptedWindow.startUtc,
      windowEndUtc: config.acceptedWindow.expiresUtc,
    };
  }
  const preRoute = await disabledRouteCheck({ phase: 'pre' });
  if (preRoute.status !== 401 || preRoute.code !== 'USER_SESSION_REQUIRED' || preRoute.bodySubscribed !== false) {
    return { decision: 'BLOCKED', code: 'DISABLED_ROUTE_PREFLIGHT_FAILED', runCompleted: false, unknownOutcome: true };
  }
  const binding = syntheticBinding(config);
  const principal = {
    schemaVersion: 1,
    userId: binding.userId,
    shopId: binding.shopId,
    sessionId: binding.sessionId,
    cadUploadAllowed: true,
  };
  const policy = syntheticPolicy(config);
  const authority = {
    ...binding,
    revision: 1,
    expiresAt: Math.min(current + 45000, inspected.windowEnd),
    allowed: true,
    active: true,
  };
  const bridge = createCadUploadAdmissionRuntimeBridge({
    enabled: true,
    acceptedWindow: true,
    planTransaction(input) {
      const proposal = transition(input.snapshot, input.command, input.authority, input.now);
      if (!proposal.ok) return proposal;
      return {
        ...proposal,
        admissionAuthorized: false,
        conversionAuthorized: false,
        sandboxDispatchAuthorized: false,
        storeMutationAuthorized: false,
      };
    },
  });
  const reserve = await bridge.planAdmission({
    bodyAdmissionAuthorized: false,
    dryRun: true,
    principal,
    snapshot: emptyState(policy),
    command: {
      type: 'reserve',
      binding,
      key: config.syntheticRefs.reservationKey,
      reservationMicros: config.costAndUsage.reservationMicros,
    },
    authority,
    now: current,
  });
  if (reserve.ok !== true || reserve.admissionAuthorized !== false || reserve.bodyReadAuthorized !== false) {
    return { decision: 'BLOCKED', code: reserve.code || 'RESERVATION_REJECTED', runCompleted: false, unknownOutcome: true };
  }
  const selectors = selectReconciliation(reserve.state, reserve.state.records[0].expiresAt, 1);
  const cancel = transition(reserve.state, {
    type: 'cancel',
    binding,
    key: config.syntheticRefs.reservationKey,
    fence: reserve.fence,
  }, authority, Math.min(current + 1, inspected.windowEnd - 1));
  const postRoute = await disabledRouteCheck({ phase: 'post' });
  if (!selectors.ok || cancel.ok !== true || cancel.status !== 'settled'
    || postRoute.status !== 401 || postRoute.code !== 'USER_SESSION_REQUIRED' || postRoute.bodySubscribed !== false) {
    return { decision: 'BLOCKED', code: 'ROLLBACK_OR_POSTCHECK_FAILED', runCompleted: false, unknownOutcome: true };
  }
  return {
    schemaVersion: 1,
    decision: 'UPLOAD_ADMISSION_DEVELOPMENT_DRY_RUN_EXECUTED',
    runCompleted: true,
    unknownOutcome: false,
    production: false,
    deployment: config.runBounds.developmentDeployment,
    runRef: config.acceptedWindow.runRef,
    acceptedWindow: config.acceptedWindow,
    counts: {
      disabledRouteChecks: 2,
      syntheticReservations: 1,
      boundedReconciliationReads: selectors.selectors.length,
      revocationsWithoutDeletion: 1,
      conversionDispatches: 0,
      sandboxDispatches: 0,
      uploadBodiesRead: 0,
    },
    evidence: {
      recordsPrivateValues: false,
      recordsCadBytes: false,
      recordsPrivateCad: false,
      sanitizedOnly: true,
      noDeleteRetainedState: true,
    },
    flags: {
      bodyAdmissionAuthorized: false,
      cadUploadActivationAuthorized: false,
      cadConversionAuthorized: false,
      sandboxDispatchAuthorized: false,
      privateCadAuthorized: false,
      automaticRetry: false,
      secondRun: false,
    },
  };
}

module.exports = {
  executeUploadAdmissionDevelopmentDryRun,
  inspectUploadAdmissionDevelopmentDryRunRunner,
};
