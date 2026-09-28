// Server-owned binding only. No environment, filesystem, provider or request inputs.
const { reviewExecutableCommandCardBinding, METHODS, CLEANUP_EFFECTS, RUN_FENCE_KEY } =
  require('./cadLiveOpeningExecutableRuntimeWiring');
const BOUNDED_SESSION_REF = 'rrb-ref:cad-upload-internal-mark-test-session-v1';
const DISABLED = Object.freeze({ enabled: false });

// The reviewed deployment keeps this null. A later source-reviewed live gate must
// supply the exact binding and independently qualified durable service capability.
const PRODUCTION_EXECUTION_BINDING = null;

function createCadProductionExecutionBinding(input = PRODUCTION_EXECUTION_BINDING) {
  try {
    if (!input || input.enabled !== true) return DISABLED;
    const binding = reviewExecutableCommandCardBinding(input);
    const card = binding.commandCard;
    const service = input.durableService;
    if (!binding.bindingAccepted || input.boundedSessionRef !== BOUNDED_SESSION_REF
      || input.sessionId !== card.sessionId
      || input.durableEvidenceSha256 !== card.durableEvidenceSha256
      || !service || METHODS.some(name => typeof service[name] !== 'function')) return DISABLED;
    const clock = input.now || Date.now;
    if (typeof clock !== 'function') return DISABLED;
    // Capture primitives and bound capabilities once; later mutation cannot rebind.
    const exact = Object.freeze({ commandCardSha256: input.commandCardSha256,
      deploymentReference: input.currentDeploymentReference,
      durableEvidenceSha256: input.durableEvidenceSha256,
      sessionId: input.sessionId, startUtc: card.openingWindow.startUtc,
      expiresUtc: card.openingWindow.expiresUtc, cohortRef: card.cohortRef,
      origin: card.productionOrigin, route: card.productionRoute, runFenceKey: RUN_FENCE_KEY });
    const calls = Object.fromEntries(METHODS.map(name => [name, service[name].bind(service)]));
    let stopped = false;
    let lastNow = -Infinity;
    const spent = new Set();
    function checkClock() {
      const stamp = clock();
      if (!Number.isFinite(stamp) || stamp < lastNow || stamp < Date.parse(exact.startUtc)
        || stamp >= Date.parse(exact.expiresUtc)) throw Error('EXECUTION_WINDOW_CLOSED');
      lastNow = stamp;
      return stamp;
    }
    const adapter = Object.freeze(Object.fromEntries(METHODS.map(operation => [operation, async context => {
      const cleanup = CLEANUP_EFFECTS.includes(operation);
      try {
        if (Object.entries(exact).some(([key, value]) => context[key] !== value)
          || context.maxSessions !== 1 || context.maxAttempts !== 1
          || context.retries !== 0 || context.secondRuns !== 0
          || context.bodyReadAuthorized !== false) throw Error('EXECUTION_BINDING_REJECTED');
        if (!cleanup && stopped) throw Error('EXECUTION_STOPPED');
        if (!cleanup && ['claimRun', 'claimAttempt', 'openFence', 'consumeAttempt'].includes(operation)) {
          if (spent.has(operation)) throw Error('EXECUTION_ALREADY_SPENT');
          spent.add(operation); // Unknown outcomes spend the local attempt too.
        }
        const checkedAtMs = cleanup ? null : checkClock();
        const receipt = await calls[operation](Object.freeze({ ...context,
          ...exact, boundedSessionRef: BOUNDED_SESSION_REF, checkedAtMs, cleanup }));
        if (!cleanup) checkClock(); // Includes the final await before body authorization.
        if (!receipt || receipt.ok !== true) throw Error('EXECUTION_RECEIPT_REJECTED');
        if (operation === 'verifySession' && receipt.boundedSessionRef !== BOUNDED_SESSION_REF) {
          throw Error('EXECUTION_SESSION_REF_REJECTED');
        }
        // Never synthesize durability, deployment, expiry or smoke evidence.
        return receipt;
      } catch {
        stopped = true;
        throw Error('PRODUCTION_EXECUTION_STOPPED_NO_RETRY');
      }
    }])));
    return Object.freeze({ enabled: true, commandCardBytes: input.commandCardBytes,
      commandCardSha256: input.commandCardSha256,
      currentDeploymentReference: input.currentDeploymentReference, adapter, now: clock });
  } catch {
    return DISABLED;
  }
}
module.exports = { BOUNDED_SESSION_REF, createCadProductionExecutionBinding };
