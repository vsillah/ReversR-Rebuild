const { createCadUploadAdmissionRuntimeBridge } = require('../../server/cadUploadAdmissionRuntimeBridge');
const { emptyState, transition } = require('./sharedUploadControls');

function syntheticPolicy(plan) {
  return {
    schemaVersion: 1,
    windowId: plan.syntheticDryRun.windowRef,
    windowStart: 1000,
    windowEnd: 61000,
    userConcurrency: 1,
    shopConcurrency: 1,
    userAttempts: 1,
    shopAttempts: 1,
    leaseMs: 30000,
    maxReservationMicros: plan.costAndUsage.reservationMicros,
    budgetMicros: plan.costAndUsage.budgetMicros,
    currency: plan.costAndUsage.currency,
  };
}

function syntheticPrincipal() {
  return {
    schemaVersion: 1,
    userId: 'dryrun-user',
    shopId: 'dryrun-shop',
    sessionId: 'dryrun-session',
    cadUploadAllowed: true,
  };
}

function syntheticBinding() {
  return {
    userId: 'dryrun-user',
    shopId: 'dryrun-shop',
    sessionId: 'dryrun-session',
    loginSessionId: 'dryrun-login',
  };
}

function inspectUploadAdmissionDevelopmentDryRunPlan(plan) {
  const authorityClosed = Object.values(plan?.authorityPreserved || {}).every(value => value === false);
  const structureValid = plan?.schemaVersion === 1
    && plan?.mode === 'source-only-cad-upload-admission-development-dry-run-plan'
    && plan?.sourceOnly === true
    && plan?.syntheticDryRun?.acceptedNow === false
    && plan?.syntheticDryRun?.liveRunAuthorizedNow === false
    && plan?.syntheticDryRun?.developmentStoreMutationAuthorizedNow === false
    && plan?.syntheticDryRun?.bodyAdmissionAuthorized === false
    && plan?.syntheticDryRun?.dryRunOnly === true
    && plan?.syntheticDryRun?.maxAttempts === 1
    && plan?.syntheticDryRun?.automaticRetry === false
    && plan?.syntheticDryRun?.secondRun === false
    && plan?.syntheticDryRun?.stopOnUnknownOutcome === true
    && plan?.costAndUsage?.allInPlanningCapUsd === 50
    && plan?.rollbackAndCustody?.deleteRetainedState === false
    && plan?.nextSafeAction?.branch === 'codex/cad-upload-admission-development-dry-run-executor'
    && authorityClosed;
  if (!structureValid) return { structureValid, sourceOnlyPreviewPasses: false };

  const bridge = createCadUploadAdmissionRuntimeBridge({
    enabled: true,
    acceptedWindow: true,
    planTransaction(input) {
      const proposed = transition(input.snapshot, input.command, input.authority, input.now);
      if (!proposed.ok) return proposed;
      return {
        ...proposed,
        admissionAuthorized: false,
        conversionAuthorized: false,
        sandboxDispatchAuthorized: false,
        storeMutationAuthorized: false,
      };
    },
  });
  const binding = syntheticBinding();
  const now = 1100;
  return Promise.resolve(bridge.planAdmission({
    bodyAdmissionAuthorized: false,
    dryRun: true,
    principal: syntheticPrincipal(),
    snapshot: emptyState(syntheticPolicy(plan)),
    command: {
      type: 'reserve',
      binding,
      key: plan.syntheticDryRun.reservationKeyRef,
      reservationMicros: plan.costAndUsage.reservationMicros,
    },
    authority: {
      ...binding,
      revision: 1,
      expiresAt: 60000,
      allowed: true,
      active: true,
    },
    now,
  })).then(preview => ({
    structureValid,
    sourceOnlyPreviewPasses: preview.ok === true
      && preview.admissionAuthorized === false
      && preview.conversionAuthorized === false
      && preview.sandboxDispatchAuthorized === false
      && preview.storeMutationAuthorized === false
      && preview.bodyReadAuthorized === false
      && preview.runtimeMounted === false,
    previewCode: preview.code,
    readyForLiveRun: false,
    readyForUploadActivation: false,
    readyForSourceExecutorFollowUp: true,
  }));
}

module.exports = { inspectUploadAdmissionDevelopmentDryRunPlan };
