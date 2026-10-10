// Unmounted one-use Package 8 internal runner. Live execution is intentionally
// impossible until a later source change supplies and reviews an exact live
// activation gate. Offline qualification reuses the merged controller.
const { createCadPhase5Package8ExecutionController }
  = require('./cadPhase5Package8ExecutionController');
const { BINDING, createCadPhase5Package8LiveAdapters }
  = require('./cadPhase5Package8LiveAdapters');

const deny = code => Object.freeze({ ok: false, code, sourceOnly: true,
  developmentOnly: true, maxRetries: 0, providerRequests: 0 });

function createCadPhase5Package8InternalRunner({
  enabled = false,
  reviewOnly = false,
  testOnly = false,
  activationGate,
  bindings = {},
  now = Date.now,
  operationBudgetMs,
} = {}) {
  const adapters = createCadPhase5Package8LiveAdapters({
    testOnly,
    activationGate,
    ...bindings,
  });
  const reviewConfigured = enabled === false && reviewOnly === true && testOnly === true
    && adapters.reviewConfigured === true;
  const controller = createCadPhase5Package8ExecutionController({
    reviewOnly: reviewConfigured,
    ...adapters.ports,
    now,
    ...(operationBudgetMs === undefined ? {} : { operationBudgetMs }),
  });

  async function runOneUse(input = {}) {
    if (!reviewConfigured) return deny(enabled === true
      ? 'PACKAGE8_LIVE_ACTIVATION_GATE_NOT_REVIEWED'
      : 'PACKAGE8_INTERNAL_RUNNER_DISABLED');
    return controller.reviewOneUse(input);
  }

  return Object.freeze({
    sourceOnly: true,
    developmentOnly: true,
    configured: false,
    reviewConfigured,
    enabled: false,
    mounted: false,
    routeMounted: false,
    sessionIssuanceEnabled: false,
    requestBodyAdmissionAuthorized: false,
    providerDispatchEnabled: false,
    storageDispatchEnabled: false,
    conversionDispatchEnabled: false,
    downloadDispatchEnabled: false,
    runtimeActivationAllowed: false,
    productionBehaviorChanged: false,
    liveBindingsAccepted: false,
    binding: BINDING,
    adapters,
    runOneUse,
  });
}

module.exports = { createCadPhase5Package8InternalRunner };
