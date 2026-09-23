// Offline review composition only. No provider, router, issuer or runtime selector.
const { performance } = require('node:perf_hooks');
const { createCadProductionSessionVerifierBinding } = require('../../server/cadProductionSessionVerifierBinding');
const fail = () => { throw new Error('AUTH_UNAVAILABLE'); };
const time = value => Number.isSafeInteger(value) && value >= 0;
const MAX_BUDGET_MS = 800;

function createProductionVerifierCandidate({
  reviewEnabled = false, request, readAuthenticatedSession, readAuthorization,
  now = Date.now, budgetMs = MAX_BUDGET_MS,
} = {}) {
  const enabled = reviewEnabled === true && Number.isInteger(budgetMs)
    && budgetMs > 0 && budgetMs <= MAX_BUDGET_MS && typeof now === 'function'
    && typeof readAuthenticatedSession === 'function' && typeof readAuthorization === 'function';
  // The existing binding snapshots only headers, once per candidate/request.
  // Dependencies are read-only and must honor the propagated signal. Arbitrary
  // dependency side effects cannot be undone by this source-only composition.
  const guardRead = read => async (input, options) => {
    options.check();
    const result = await read(input, Object.freeze({ signal: options.signal, deadlineAt: options.deadlineAt }));
    options.check();
    return result;
  };
  const binding = createCadProductionSessionVerifierBinding({
    reviewEnabled: enabled, request, now,
    readAuthenticatedSession: guardRead(readAuthenticatedSession),
    readAuthorization: guardRead(readAuthorization),
  });
  async function run(method, input, { signal } = {}) {
    if (!binding.reviewConfigured) return null;
    let timer, abortListener;
    const controller = new AbortController();
    try {
      const startedAt = now();
      const monotonicStart = performance.now();
      const deadlineAt = startedAt + budgetMs;
      if (!time(startedAt) || !time(deadlineAt)) fail();
      let lastNow = startedAt;
      const check = () => {
        const current = now();
        if (controller.signal.aborted || signal?.aborted || !time(current)
          || current < lastNow || current >= deadlineAt
          || performance.now() - monotonicStart >= budgetMs) fail();
        lastNow = current;
      };
      const stopped = new Promise((_, reject) => {
        abortListener = () => { controller.abort(); reject(new Error('AUTH_UNAVAILABLE')); };
        signal?.addEventListener('abort', abortListener, { once: true });
        timer = setTimeout(abortListener, budgetMs);
      });
      const operation = Promise.resolve().then(() => {
        check();
        return binding[method](input, { signal: controller.signal, deadlineAt, check });
      });
      const result = await Promise.race([operation, stopped]);
      check();
      return result;
    } catch { fail(); }
    finally {
      clearTimeout(timer);
      if (abortListener) signal?.removeEventListener('abort', abortListener);
      controller.abort(); // Retained dependency signals never outlive this operation.
    }
  }
  return Object.freeze({ sourceOnly: true, configured: false,
    reviewConfigured: binding.reviewConfigured, productionVerifierAccepted: false,
    uploadSessionIssuanceEnabled: false, bodyAdmissionAuthorized: false,
    resolveAuthorization: (context, options) => run('resolveAuthorization', context, options),
    refreshAuthorization: (exactBinding, options) => run('refreshAuthorization', exactBinding, options),
  });
}
module.exports = { createProductionVerifierCandidate, MAX_BUDGET_MS };
